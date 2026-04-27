"""Retirement income projection engine for the Korea-focused MVP.

The engine intentionally uses only the Python standard library so the first
version can run in a clean environment and remain easy to verify.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal, ROUND_HALF_UP, getcontext
from typing import Any

getcontext().prec = 28

KRW = Decimal("1")
NHIS_INCOME_RATE = Decimal("0.0719")
LONG_TERM_CARE_RATE_ON_NHIS = Decimal("0.1314")
NHIS_MIN_MONTHLY = Decimal("20160")
NHIS_MAX_MONTHLY = Decimal("4591740")
NATIONAL_PENSION_RATE = Decimal("0.095")
NATIONAL_PENSION_MIN_BASE = Decimal("410000")
NATIONAL_PENSION_MAX_BASE = Decimal("6590000")
STOCK_ALLOCATION_RATE = Decimal("0.5")
# 임대(상가 등) 간이경비율 — 세법 개정 시 assumptions / real_estate item에서 덮어쓸 수 있음
DEFAULT_REAL_ESTATE_EXPENSE_RATIO = Decimal("0.415")
# 연금소득 분리과세 세율(연금계좌 등, MVP 단순화)
IRP_SEPARATE_TAX_RATE = Decimal("0.03")
# 합산과세 시 연금소득 과세표준 포함 비율(이연·연금 수령 일반례 단순화)
IRP_AMALGAMATION_TAXABLE_FRACTION = Decimal("0.70")
# 종합소득세 과세표준 누진(2026 귀속 근사치, 단위: 원) — 법령 개정 시 rule_versions와 함께 갱신
_COMPOSITE_TAX_BRACKETS: list[tuple[Decimal | None, Decimal, Decimal]] = [
    (Decimal("14000000"), Decimal("0.06"), Decimal("0")),
    (Decimal("50000000"), Decimal("0.15"), Decimal("1260000")),
    (Decimal("88000000"), Decimal("0.24"), Decimal("5760000")),
    (Decimal("150000000"), Decimal("0.35"), Decimal("15440000")),
    (Decimal("300000000"), Decimal("0.38"), Decimal("19940000")),
    (Decimal("500000000"), Decimal("0.40"), Decimal("25940000")),
    (Decimal("1000000000"), Decimal("0.42"), Decimal("35940000")),
    (None, Decimal("0.45"), Decimal("65940000")),
]


@dataclass(frozen=True)
class Month:
    year: int
    month: int

    @classmethod
    def parse(cls, value: str) -> "Month":
        year_text, month_text = value.split("-", 1)
        year = int(year_text)
        month = int(month_text)
        if month < 1 or month > 12:
            raise ValueError(f"Invalid month: {value}")
        return cls(year, month)

    @classmethod
    def from_date(cls, value: date) -> "Month":
        return cls(value.year, value.month)

    def add(self, months: int) -> "Month":
        zero_based = self.year * 12 + self.month - 1 + months
        return Month(zero_based // 12, zero_based % 12 + 1)

    def months_until(self, other: "Month") -> int:
        return (other.year - self.year) * 12 + (other.month - self.month)

    def as_text(self) -> str:
        return f"{self.year:04d}-{self.month:02d}"


@dataclass(frozen=True)
class Person:
    birth_date: date

    @classmethod
    def parse(cls, value: str) -> "Person":
        return cls(date.fromisoformat(value))

    def age_on_month(self, month: Month) -> int:
        years = month.year - self.birth_date.year
        if (month.month, 1) < (self.birth_date.month, self.birth_date.day):
            years -= 1
        return years

    def month_turning_age(self, age: int) -> Month:
        return Month(self.birth_date.year + age, self.birth_date.month)


def money(value: Any, default: Decimal = Decimal("0")) -> Decimal:
    if value is None:
        return default
    if isinstance(value, Decimal):
        return value
    if isinstance(value, (int, float)):
        return Decimal(str(value))
    text = str(value).strip().replace(",", "")
    if not text:
        return default
    return Decimal(text)


def rate(value: Any, default: Decimal = Decimal("0")) -> Decimal:
    raw = money(value, default)
    if abs(raw) > Decimal("1"):
        return raw / Decimal("100")
    return raw


def round_krw(value: Decimal) -> int:
    return int(value.quantize(KRW, rounding=ROUND_HALF_UP))


def monthly_growth(annual_rate: Decimal) -> Decimal:
    # Deterministic linear monthly compounding keeps the MVP transparent.
    return annual_rate / Decimal("12")


def grown_amount(base: Decimal, annual_rate: Decimal, months: int) -> Decimal:
    if base == 0:
        return Decimal("0")
    monthly = monthly_growth(annual_rate)
    return base * ((Decimal("1") + monthly) ** months)


def annual_step_amount(base: Decimal, annual_rate: Decimal, start: Month, month: Month) -> Decimal:
    if base == 0:
        return Decimal("0")
    years = max(month.year - start.year, 0)
    return base * ((Decimal("1") + annual_rate) ** years)


def national_pension_factor(normal_start_age: int, chosen_start_age: int) -> Decimal:
    """Apply Korean public pension timing adjustment.

    The MVP stores this as a transparent versioned rule. Earlier start is
    reduced by 6% per year, later start increases by 7.2% per year, both capped
    at five years.
    """

    diff = chosen_start_age - normal_start_age
    if diff < 0:
        years = min(abs(diff), 5)
        return Decimal("1") - Decimal("0.06") * Decimal(years)
    years = min(diff, 5)
    return Decimal("1") + Decimal("0.072") * Decimal(years)


def default_national_pension_age(birth_year: int) -> int:
    if 1953 <= birth_year <= 1956:
        return 61
    if 1957 <= birth_year <= 1960:
        return 62
    if 1961 <= birth_year <= 1964:
        return 63
    if 1965 <= birth_year <= 1968:
        return 64
    return 65


def projection_horizon(user: Person) -> Month:
    return Month(user.birth_date.year + 100, 12)


def iter_months(start: Month, end: Month) -> list[Month]:
    total = start.months_until(end)
    if total < 0:
        raise ValueError("Projection end month must be after start month")
    return [start.add(i) for i in range(total + 1)]


def _line(lines: list[dict[str, Any]], source: str, amount: Decimal, category: str) -> None:
    rounded = round_krw(amount)
    if rounded:
        lines.append({"source": source, "category": category, "amount": rounded})


def _source_name(item: dict[str, Any], fallback: str) -> str:
    return str(item.get("name") or item.get("type") or fallback)


def _compute_monthly_rows(
    payload: dict[str, Any],
    lump_at_retirement: Decimal,
) -> list[dict[str, Any]]:
    """Run month-by-month balances. `lump_at_retirement` is added to cash at retirement month (extra savings)."""

    user = Person.parse(payload["household"]["user_birth_date"])
    spouse_birth = payload.get("household", {}).get("spouse_birth_date")
    spouse = Person.parse(spouse_birth) if spouse_birth else None
    start = Month.parse(payload.get("start_month") or date.today().strftime("%Y-%m"))
    end = projection_horizon(user)
    months = iter_months(start, end)

    assumptions = payload.get("assumptions", {})
    inflation = rate(assumptions.get("inflation_rate", "0.02"))
    retirement_age = int(payload.get("employment", {}).get("retirement_age", 65))
    retirement_month = user.month_turning_age(retirement_age)

    cash_balance = _initial_cash_balance(payload)
    stock_balance = _initial_stock_balance(payload)
    irp = payload.get("irp", {})
    severance_balance = Decimal("0")
    irp_user_balance = money(irp.get("current_balance"))
    irp_spouse_balance = money(irp.get("spouse_current_balance"))
    retirement_return = _retirement_return(payload)
    monthly_rows: list[dict[str, Any]] = []
    annual_assessable_income: dict[int, Decimal] = {}
    # 상가 단독명의 가정: 본인 근로·임대·국민연금·본인 IRP만 종합소득세 과세소득에 포함
    tax_aggregate: dict[int, dict[str, Decimal]] = {}
    composite_tax_paid_ytd: dict[int, Decimal] = {}

    first_projection_month = months[0]
    first_year_january = Month(first_projection_month.year, 1)

    for month in months:
        lines: list[dict[str, Any]] = []
        stock_balance = _grow_balance(stock_balance, _stock_return(payload))
        severance_balance = _grow_balance(severance_balance, retirement_return)
        irp_user_balance = _grow_balance(irp_user_balance, retirement_return)
        irp_spouse_balance = _grow_balance(irp_spouse_balance, retirement_return)
        if month == retirement_month:
            severance_balance += _retirement_lump_sum(payload)
            cash_balance += lump_at_retirement

        employment_income = _employment_income(payload, user, month, retirement_month, first_projection_month)
        _line(lines, "근로소득", employment_income, "employment")

        retirement_payout = min(
            _retirement_payout_income(payload, user, month, retirement_month),
            max(severance_balance, Decimal("0")),
        )
        severance_balance -= retirement_payout

        irp_payout = _irp_payout_amortized(irp_user_balance, month, "payout", retirement_month, payload)
        irp_user_balance -= irp_payout

        spouse_irp_payout = _irp_payout_amortized(irp_spouse_balance, month, "spouse_payout", retirement_month, payload)
        irp_spouse_balance -= spouse_irp_payout

        retirement_irp_income = retirement_payout + irp_payout + spouse_irp_payout
        _line(lines, "퇴직연금/IRP 월수령", retirement_irp_income, "retirement_irp_payout")

        rental_net_for_tax = Decimal("0")
        for item in payload.get("real_estate", []):
            income, expense = _real_estate_cashflow(item, month, first_projection_month)
            _line(lines, f"{_source_name(item, '부동산')} 수입", income, "real_estate_income")
            _line(lines, f"{_source_name(item, '부동산')} 비용", -expense, "real_estate_expense")
            rental_net_for_tax += _real_estate_net_for_composite_tax(item, month, first_projection_month)

        pension_lines = _pension_cashflows(
            payload, user, spouse, month, first_projection_month, retirement_month, inflation
        )
        for source, amount in pension_lines:
            _line(lines, source, amount, "pension")

        user_national_pension = _user_national_pension_monthly(
            payload, user, spouse, month, first_projection_month, retirement_month, inflation
        )
        ykey = month.year
        bucket = tax_aggregate.setdefault(
            ykey, {"employment": Decimal("0"), "rental": Decimal("0"), "pension": Decimal("0"), "irp": Decimal("0")}
        )
        bucket["employment"] += employment_income
        bucket["rental"] += rental_net_for_tax
        bucket["pension"] += user_national_pension
        bucket["irp"] += irp_payout + retirement_payout

        investment_income = _investment_income(payload, month, first_projection_month)
        _line(lines, "배당/이자 금융수입", investment_income, "financial_income")

        living_expense = _living_expense(payload, month, first_projection_month)
        _line(lines, "생활비", -living_expense, "living_expense")

        irp_contribution = _irp_contribution(payload, month, retirement_month)
        spouse_irp_contribution = _spouse_irp_contribution(payload, month, retirement_month)
        total_irp_contribution = irp_contribution + spouse_irp_contribution
        _line(lines, "IRP 납입", -total_irp_contribution, "irp_contribution")

        health_premium = _health_insurance_premium(annual_assessable_income.get(month.year - 1, Decimal("0"))) if retirement_month.months_until(month) >= 0 else Decimal("0")
        _line(lines, "건강보험료", -health_premium, "health_insurance")

        national_contribution = _national_pension_contribution(payload, user, month, retirement_month, lines)
        _line(lines, "국민연금 납입", -national_contribution, "national_pension_contribution")

        if month.month == 12:
            agg = tax_aggregate[ykey]
            _mode_used, annual_tax = _annual_composite_tax_with_irp(
                payload, agg["employment"], agg["rental"], agg["pension"], agg["irp"]
            )
            paid_before = composite_tax_paid_ytd.get(ykey, Decimal("0"))
            december_installment = annual_tax - paid_before
            composite_tax_paid_ytd[ykey] = annual_tax
            _line(lines, "종합소득세(연납)", -december_installment, "composite_income_tax")

        irp_user_balance += irp_contribution
        irp_spouse_balance += spouse_irp_contribution
        retirement_balance_for_display = severance_balance + irp_user_balance + irp_spouse_balance

        cashflow_total = Decimal(sum(line["amount"] for line in lines))
        if cashflow_total > 0:
            stock_share = _stock_allocation_fraction(payload)
            cash_part = cashflow_total * (Decimal("1") - stock_share)
            stock_part = cashflow_total * stock_share
            cash_balance += cash_part
            stock_balance += stock_part
        else:
            cash_balance += cashflow_total
        if cash_balance < 0 and stock_balance > 0:
            stock_drawdown = min(stock_balance, -cash_balance)
            stock_balance -= stock_drawdown
            cash_balance += stock_drawdown

        nominal_total = sum(line["amount"] for line in lines)
        assessable_income = (
            _health_assessable_income(lines)
            if retirement_month.add(1).months_until(month) >= 0
            else Decimal("0")
        )
        annual_assessable_income[month.year] = annual_assessable_income.get(month.year, Decimal("0")) + assessable_income
        months_from_value_base = first_year_january.months_until(month)
        real_total = Decimal(nominal_total) / ((Decimal("1") + monthly_growth(inflation)) ** max(months_from_value_base, 0))

        row = {
            "month": month.as_text(),
            "user_age": user.age_on_month(month),
            "spouse_age": spouse.age_on_month(month) if spouse else None,
            "nominal_total": int(nominal_total),
            "real_total": round_krw(real_total),
            "remaining_financial_assets": round_krw(cash_balance + stock_balance + retirement_balance_for_display),
            "cash_balance": round_krw(cash_balance),
            "stock_balance": round_krw(stock_balance),
            "retirement_balance": round_krw(retirement_balance_for_display),
            "lines": lines,
        }
        monthly_rows.append(row)

    return monthly_rows


def project(payload: dict[str, Any]) -> dict[str, Any]:
    user = Person.parse(payload["household"]["user_birth_date"])
    start = Month.parse(payload.get("start_month") or date.today().strftime("%Y-%m"))
    end = projection_horizon(user)
    monthly_rows = _compute_monthly_rows(payload, Decimal("0"))
    retirement_age = int(payload.get("employment", {}).get("retirement_age", 65))
    retirement_month = user.month_turning_age(retirement_age)
    warnings: list[str] = []

    recommendation = _build_recommendation(monthly_rows, payload, retirement_month)
    confidence = _confidence_score(payload)

    return {
        "currency": "KRW",
        "market": "KR",
        "projection_start": start.as_text(),
        "projection_end": monthly_rows[-1]["month"] if monthly_rows else end.as_text(),
        "confidence_score": confidence,
        "warnings": warnings,
        "recommendation": recommendation,
        "monthly": monthly_rows,
        "rule_versions": {
            "national_pension": "kr-nps-mvp-2026-04",
            "national_pension_contribution": "kr-nps-contribution-mvp-2026-04",
            "housing_pension": "kr-hf-table-estimate-mvp-2026-04",
            "health_insurance": "kr-nhis-income-mvp-2026-04",
            "tax": "kr-tax-user-monthly-cost-mvp-2026-04",
            "composite_income_tax": "kr-composite-simplified-mvp-2026-04",
        },
    }


def _employment_income(payload: dict[str, Any], user: Person, month: Month, retirement_month: Month, start: Month) -> Decimal:
    employment = payload.get("employment", {})
    if not employment.get("currently_employed", False):
        return Decimal("0")
    if retirement_month.months_until(month) >= 0:
        return Decimal("0")
    base = money(employment.get("monthly_net_income"))
    growth = rate(employment.get("income_growth_rate"))
    return annual_step_amount(base, growth, start, month)


def _retirement_payout_income(payload: dict[str, Any], user: Person, month: Month, retirement_month: Month) -> Decimal:
    employment = payload.get("employment", {})
    total = money(employment.get("retirement_allowance")) + money(employment.get("voluntary_retirement_bonus"))
    if total <= 0:
        return Decimal("0")
    if employment.get("retirement_payout_start_year") or employment.get("retirement_payout_end_year"):
        start_month = Month(int(employment.get("retirement_payout_start_year")), 1)
        end_month = Month(int(employment.get("retirement_payout_end_year")), 12)
    else:
        start_age = int(employment.get("retirement_payout_start_age", employment.get("retirement_age", 60)))
        end_age = int(employment.get("retirement_payout_end_age", start_age + 10))
        start_month = user.month_turning_age(start_age)
        end_month = user.month_turning_age(end_age).add(-1)
    start_month = _after_retirement_start(start_month, retirement_month)
    if start_month.months_until(month) < 0 or month.months_until(end_month) < 0:
        return Decimal("0")
    payout_months = max(start_month.months_until(end_month) + 1, 1)
    return total / Decimal(payout_months)


def _retirement_lump_sum(payload: dict[str, Any]) -> Decimal:
    employment = payload.get("employment", {})
    return money(employment.get("retirement_allowance")) + money(employment.get("voluntary_retirement_bonus"))


def _real_estate_cashflow(item: dict[str, Any], month: Month, start: Month) -> tuple[Decimal, Decimal]:
    years = max(month.year - start.year, 0)
    income = money(item.get("monthly_income")) * ((Decimal("1") + rate(item.get("income_growth_rate"))) ** years)
    ratio = money(item.get("expense_ratio"), DEFAULT_REAL_ESTATE_EXPENSE_RATIO)
    if ratio > Decimal("1"):
        ratio = ratio / Decimal("100")
    ratio = min(max(ratio, Decimal("0")), Decimal("1"))
    simple = income * ratio
    explicit = money(item.get("monthly_expense")) * ((Decimal("1") + rate(item.get("expense_growth_rate"))) ** years)
    return income, simple + explicit


def _pension_line_amount(
    item: dict[str, Any],
    payload: dict[str, Any],
    user: Person,
    spouse: Person | None,
    month: Month,
    start: Month,
    retirement_month: Month,
    inflation: Decimal,
) -> Decimal:
    owner_birth = item.get("owner_birth_date") or payload["household"]["user_birth_date"]
    owner = Person.parse(owner_birth)
    start_age = int(item.get("start_age", item.get("normal_start_age", 65)))
    start_month = owner.month_turning_age(start_age)
    start_month = _after_retirement_start(start_month, retirement_month)
    if start_month.months_until(month) < 0:
        return Decimal("0")
    pension_type = str(item.get("type", "")).lower()
    monthly_amount = money(item.get("target_monthly_amount"))
    if pension_type in {"housing", "housing_pension", "주택연금"} and monthly_amount <= 0:
        pricing_age = _housing_pension_pricing_age(item, owner, start_month, spouse)
        monthly_amount = _estimate_housing_pension(item, pricing_age)
    if pension_type in {"national", "국민연금", "national_pension"}:
        normal_age = int(item.get("normal_start_age") or default_national_pension_age(owner.birth_date.year))
        monthly_amount *= national_pension_factor(normal_age, start_age)
        months_to_start = max(start.months_until(start_month), 0)
        years_to_start = months_to_start // 12
        monthly_amount *= (Decimal("1") + inflation) ** years_to_start
    growth = rate(item.get("annual_increase_rate"))
    monthly_amount = grown_amount(monthly_amount, growth, max(start_month.months_until(month), 0))
    return monthly_amount


def _pension_cashflows(
    payload: dict[str, Any],
    user: Person,
    spouse: Person | None,
    month: Month,
    start: Month,
    retirement_month: Month,
    inflation: Decimal,
) -> list[tuple[str, Decimal]]:
    results: list[tuple[str, Decimal]] = []
    for item in payload.get("pensions", []):
        monthly_amount = _pension_line_amount(item, payload, user, spouse, month, start, retirement_month, inflation)
        if monthly_amount:
            results.append((_source_name(item, "연금"), monthly_amount))
    return results


def _user_national_pension_monthly(
    payload: dict[str, Any],
    user: Person,
    spouse: Person | None,
    month: Month,
    start: Month,
    retirement_month: Month,
    inflation: Decimal,
) -> Decimal:
    user_birth = payload["household"]["user_birth_date"]
    total = Decimal("0")
    for item in payload.get("pensions", []):
        owner_birth = item.get("owner_birth_date") or user_birth
        if owner_birth != user_birth:
            continue
        pension_type = str(item.get("type", "")).lower()
        if pension_type not in {"national", "국민연금", "national_pension"}:
            continue
        total += _pension_line_amount(item, payload, user, spouse, month, start, retirement_month, inflation)
    return total


def _composite_income_tax_on_standard(taxable: Decimal) -> Decimal:
    if taxable <= 0:
        return Decimal("0")
    for ceiling, rate, deduction in _COMPOSITE_TAX_BRACKETS:
        if ceiling is None or taxable <= ceiling:
            return max(taxable * rate - deduction, Decimal("0"))
    return Decimal("0")


def _real_estate_net_for_composite_tax(item: dict[str, Any], month: Month, start: Month) -> Decimal:
    """상가 등 단독명의: 총수입 − 간이경비(기본 41.5%) − 명시된 추가 경비."""

    years = max(month.year - start.year, 0)
    gross = money(item.get("monthly_income")) * ((Decimal("1") + rate(item.get("income_growth_rate"))) ** years)
    ratio = money(item.get("expense_ratio"), DEFAULT_REAL_ESTATE_EXPENSE_RATIO)
    if ratio > Decimal("1"):
        ratio = ratio / Decimal("100")
    ratio = min(max(ratio, Decimal("0")), Decimal("1"))
    simple_deduction = gross * ratio
    explicit = money(item.get("monthly_expense")) * ((Decimal("1") + rate(item.get("expense_growth_rate"))) ** years)
    return gross - simple_deduction - explicit


def _irp_tax_mode(payload: dict[str, Any]) -> str:
    mode = str(payload.get("assumptions", {}).get("irp_income_tax_mode", "auto")).lower()
    if mode in {"separate", "분리"}:
        return "separate"
    if mode in {"amalgamation", "합산"}:
        return "amalgamation"
    return "auto"


def _annual_composite_tax_with_irp(
    payload: dict[str, Any],
    employment_ytd: Decimal,
    rental_ytd: Decimal,
    pension_ytd: Decimal,
    irp_ytd: Decimal,
) -> tuple[str, Decimal]:
    """연간(1~12월 합) 종합소득세. IRP는 합산(과세표준 70%) vs 분리(3%) 중 유리한 쪽(auto)."""

    mode = _irp_tax_mode(payload)
    tax_sep = _composite_income_tax_on_standard(employment_ytd + rental_ytd + pension_ytd) + irp_ytd * IRP_SEPARATE_TAX_RATE
    tax_amalg = _composite_income_tax_on_standard(
        employment_ytd + rental_ytd + pension_ytd + irp_ytd * IRP_AMALGAMATION_TAXABLE_FRACTION
    )
    if mode == "separate":
        return "separate", tax_sep
    if mode == "amalgamation":
        return "amalgamation", tax_amalg
    if tax_sep <= tax_amalg:
        return "separate", tax_sep
    return "amalgamation", tax_amalg


def _investment_income(payload: dict[str, Any], month: Month, start: Month) -> Decimal:
    total = Decimal("0")
    for item in payload.get("financial_assets", []):
        income = money(item.get("monthly_income"))
        if not income:
            continue
        total += grown_amount(income, rate(item.get("income_growth_rate")), start.months_until(month))
    return total


def _living_expense(payload: dict[str, Any], month: Month, start: Month) -> Decimal:
    expenses = _expense_settings(payload)
    base = money(expenses.get("monthly_living_expense"))
    growth = rate(expenses.get("living_expense_growth_rate", payload.get("assumptions", {}).get("inflation_rate", 0)))
    return grown_amount(base, growth, start.months_until(month))


def _irp_contribution(payload: dict[str, Any], month: Month, retirement_month: Month) -> Decimal:
    if retirement_month.months_until(month) >= 0:
        return Decimal("0")
    return money(payload.get("irp", {}).get("monthly_contribution"))


def _spouse_irp_contribution(payload: dict[str, Any], month: Month, retirement_month: Month) -> Decimal:
    if retirement_month.months_until(month) >= 0:
        return Decimal("0")
    return money(payload.get("irp", {}).get("spouse_monthly_contribution"))


def _irp_payout_window(
    payload: dict[str, Any],
    prefix: str,
    retirement_month: Month,
) -> tuple[Month, Month] | None:
    """Return (start_month, end_month) inclusive for IRP drawdown, or None if not configured."""

    irp = payload.get("irp", {})
    start_year = int(irp.get(f"{prefix}_start_year") or 0)
    end_year = int(irp.get(f"{prefix}_end_year") or 0)
    household = payload.get("household", {})
    if start_year and end_year:
        start_month = Month(start_year, 1)
        end_month = Month(end_year, 12)
    else:
        if prefix == "payout":
            start_age = int(irp.get("payout_start_age") or 0)
            end_age = int(irp.get("payout_end_age") or 0)
            birth = household.get("user_birth_date")
        else:
            start_age = int(irp.get("spouse_payout_start_age") or 0)
            end_age = int(irp.get("spouse_payout_end_age") or 0)
            birth = household.get("spouse_birth_date") or household.get("user_birth_date")
        if not start_age or not end_age or not birth:
            return None
        owner = Person.parse(birth)
        start_month = owner.month_turning_age(start_age)
        end_month = owner.month_turning_age(end_age).add(-1)
    start_month = _after_retirement_start(start_month, retirement_month)
    return start_month, end_month


def _irp_payout_amortized(
    balance_after_growth: Decimal,
    month: Month,
    prefix: str,
    retirement_month: Month,
    payload: dict[str, Any],
) -> Decimal:
    """Equal monthly share of remaining balance so the pool trends to zero by end of window."""

    window = _irp_payout_window(payload, prefix, retirement_month)
    if window is None:
        return Decimal("0")
    start_month, end_month = window
    if start_month.months_until(month) < 0 or month.months_until(end_month) < 0:
        return Decimal("0")
    if balance_after_growth <= 0:
        return Decimal("0")
    remaining_inclusive = month.months_until(end_month) + 1
    if remaining_inclusive <= 0:
        return Decimal("0")
    return min(balance_after_growth / Decimal(remaining_inclusive), balance_after_growth)


def _health_insurance_premium(previous_year_income: Decimal) -> Decimal:
    if previous_year_income <= 0:
        return Decimal("0")
    monthly_income = previous_year_income / Decimal("12")
    health = max(monthly_income * Decimal("0.0719"), Decimal("20160"))
    return health * Decimal("1.1314")


def _health_assessable_income(lines: list[dict[str, Any]]) -> Decimal:
    total = Decimal("0")
    pension_categories = {"pension", "retirement_payout", "irp_payout", "retirement_irp_payout"}
    excluded_categories = {"recommended_withdrawal"}
    for line in lines:
        amount = Decimal(line["amount"])
        if amount <= 0 or line["category"] in excluded_categories:
            continue
        factor = Decimal("0.3") if line["category"] in pension_categories else Decimal("1")
        total += amount * factor
    return total


def _national_pension_contribution(
    payload: dict[str, Any],
    user: Person,
    month: Month,
    retirement_month: Month,
    lines: list[dict[str, Any]],
) -> Decimal:
    if retirement_month.months_until(month) < 0 or user.age_on_month(month) >= 60:
        return Decimal("0")
    positive_income = sum(
        Decimal(line["amount"])
        for line in lines
        if line["amount"] > 0 and line["category"] != "recommended_withdrawal"
    )
    if positive_income <= 0:
        return Decimal("0")
    base = min(max(positive_income, Decimal("410000")), Decimal("6590000"))
    return base * Decimal("0.095")


def _estimate_housing_pension(item: dict[str, Any], start_age: int) -> Decimal:
    home_value = money(item.get("home_value"))
    if home_value <= 0:
        return Decimal("0")
    # 2026 MVP approximation from HF public examples, lifetime fixed-payment type.
    age_rates = {
        60: Decimal("0.0018"),
        65: Decimal("0.0021"),
        70: Decimal("0.00244"),
        75: Decimal("0.0029"),
    }
    anchors = sorted(age_rates)
    if start_age <= anchors[0]:
        monthly_rate = age_rates[anchors[0]]
    elif start_age >= anchors[-1]:
        monthly_rate = age_rates[anchors[-1]]
    else:
        lower = max(age for age in anchors if age <= start_age)
        upper = min(age for age in anchors if age >= start_age)
        if lower == upper:
            monthly_rate = age_rates[lower]
        else:
            span = Decimal(upper - lower)
            weight = Decimal(start_age - lower) / span
            monthly_rate = age_rates[lower] + (age_rates[upper] - age_rates[lower]) * weight
    recognized_value = min(home_value, Decimal("1200000000"))
    return recognized_value * monthly_rate


def _housing_pension_pricing_age(item: dict[str, Any], owner: Person, start_month: Month, spouse: Person | None) -> int:
    """Joint housing pension uses the younger of the couple at benefit start (MVP rule)."""

    ages = [owner.age_on_month(start_month)]
    spouse_birth = item.get("spouse_birth_date")
    if spouse_birth:
        ages.append(Person.parse(spouse_birth).age_on_month(start_month))
    elif spouse is not None:
        ages.append(spouse.age_on_month(start_month))
    return max(min(ages), 55)


def _after_retirement_start(start_month: Month, retirement_month: Month) -> Month:
    first_available = retirement_month.add(1)
    return first_available if start_month.months_until(first_available) > 0 else start_month


def _initial_cash_balance(payload: dict[str, Any]) -> Decimal:
    return money(payload.get("cash_balance"))


def _initial_stock_balance(payload: dict[str, Any]) -> Decimal:
    total = Decimal("0")
    for item in payload.get("financial_assets", []):
        total += money(item.get("balance"))
    return total


def _grow_balance(balance: Decimal, annual_rate: Decimal) -> Decimal:
    if balance == 0:
        return Decimal("0")
    return balance * (Decimal("1") + monthly_growth(annual_rate))


def _stock_return(payload: dict[str, Any]) -> Decimal:
    assets = payload.get("financial_assets", [])
    total = sum((money(item.get("balance")) for item in assets), Decimal("0"))
    if total <= 0:
        return Decimal("0")
    weighted = sum(
        (money(item.get("balance")) * rate(item.get("annual_return_rate")) for item in assets),
        Decimal("0"),
    )
    return weighted / total


def _retirement_return(payload: dict[str, Any]) -> Decimal:
    return rate(payload.get("irp", {}).get("annual_return_rate"))


def _apply_financial_growth(
    balance: Decimal,
    payload: dict[str, Any],
    month: Month,
    retirement_month: Month,
) -> Decimal:
    assets = payload.get("financial_assets", [])
    weighted_return = Decimal("0")
    total_balance = Decimal("0")
    for item in assets:
        item_balance = money(item.get("balance"))
        total_balance += item_balance
        weighted_return += item_balance * rate(item.get("annual_return_rate"))
    irp = payload.get("irp", {})
    irp_balance = money(irp.get("current_balance"))
    irp_monthly = money(irp.get("monthly_contribution")) if retirement_month.months_until(month) < 0 else Decimal("0")
    total_balance += irp_balance
    weighted_return += irp_balance * rate(irp.get("annual_return_rate"))
    annual = weighted_return / total_balance if total_balance else Decimal("0")
    grown_balance = max(balance, Decimal("0")) * (Decimal("1") + monthly_growth(annual))
    living_expense = money(_expense_settings(payload).get("monthly_living_expense"))
    return grown_balance + irp_monthly - living_expense


def _expense_settings(payload: dict[str, Any]) -> dict[str, Any]:
    if payload.get("expenses"):
        return payload["expenses"]
    assumptions = payload.get("assumptions", {})
    return {
        "monthly_living_expense": assumptions.get("living_expense", 0),
        "stock_allocation_rate": assumptions.get("stock_allocation_rate", 0.5),
        "living_expense_growth_rate": assumptions.get("living_expense_growth_rate", assumptions.get("inflation_rate", 0)),
    }


def _stock_allocation_fraction(payload: dict[str, Any]) -> Decimal:
    raw = money(_expense_settings(payload).get("stock_allocation_rate"), STOCK_ALLOCATION_RATE)
    if raw > Decimal("1"):
        raw = raw / Decimal("100")
    return min(max(raw, Decimal("0")), Decimal("1"))


def _terminal_cash_plus_stock(rows: list[dict[str, Any]]) -> int:
    last = rows[-1]
    return int(last["cash_balance"]) + int(last["stock_balance"])


def _build_recommendation(
    rows: list[dict[str, Any]],
    payload: dict[str, Any],
    retirement_month: Month,
) -> dict[str, Any]:
    if not rows:
        return {
            "summary": "계산 결과가 없습니다.",
            "additional_savings_needed_at_retirement": 0,
            "depletion_month": None,
        }

    retirement_rows = [row for row in rows if Month.parse(row["month"]).months_until(retirement_month) <= 0]
    first_cash_stress = next((row for row in retirement_rows if row.get("cash_balance", 0) < 0), None)
    first_asset_depletion = next((row for row in retirement_rows if row["remaining_financial_assets"] <= 0), None)
    first_depletion = first_cash_stress or first_asset_depletion

    terminal = _terminal_cash_plus_stock(rows)
    additional = Decimal("0")
    if terminal < 0:
        low = Decimal("0")
        high = Decimal("1000000")
        test_rows = _compute_monthly_rows(payload, high)
        while _terminal_cash_plus_stock(test_rows) < 0 and high < Decimal("500000000000"):
            high *= Decimal("2")
            test_rows = _compute_monthly_rows(payload, high)
        if _terminal_cash_plus_stock(test_rows) >= 0:
            while high - low > Decimal("1000"):
                mid = (low + high) / Decimal("2")
                if _terminal_cash_plus_stock(_compute_monthly_rows(payload, mid)) >= 0:
                    high = mid
                else:
                    low = mid
            additional = high.quantize(Decimal("1000"), rounding=ROUND_HALF_UP)
        else:
            additional = Decimal("0")

    if first_cash_stress:
        summary = "은퇴 이후 특정 시점에서 현금 잔액이 마이너스로 전환됩니다. 지출·수입 가정을 검토해 보세요."
    elif first_asset_depletion:
        summary = "은퇴 이후 잔여 금융자산(현금+주식+퇴직연금)이 소진되는 달이 있습니다."
    elif additional > 0:
        summary = (
            "100세 시점에 현금+주식 잔액이 0 이상이 되도록 하려면 은퇴 시점에 추가로 저축할 금액이 필요합니다 "
            f"(추정 약 {round_krw(additional)}원)."
        )
    else:
        summary = "입력하신 가정 기준으로 월별 수지와 잔액 흐름을 확인할 수 있습니다."

    return {
        "summary": summary,
        "additional_savings_needed_at_retirement": round_krw(additional),
        "depletion_month": first_depletion["month"] if first_depletion else None,
    }


def _confidence_score(payload: dict[str, Any]) -> int:
    checks = [
        bool(payload.get("household", {}).get("user_birth_date")),
        bool(payload.get("employment")),
        bool(payload.get("pensions")),
        bool(payload.get("financial_assets") or payload.get("irp")),
        bool(payload.get("assumptions", {}).get("inflation_rate")),
    ]
    return round(sum(checks) / len(checks) * 100)
