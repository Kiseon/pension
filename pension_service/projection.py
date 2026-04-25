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


def project(payload: dict[str, Any]) -> dict[str, Any]:
    user = Person.parse(payload["household"]["user_birth_date"])
    spouse_birth = payload.get("household", {}).get("spouse_birth_date")
    spouse = Person.parse(spouse_birth) if spouse_birth else None
    start = Month.parse(payload.get("start_month") or date.today().strftime("%Y-%m"))
    end = projection_horizon(user)
    months = iter_months(start, end)

    assumptions = payload.get("assumptions", {})
    inflation = rate(assumptions.get("inflation_rate", "0.02"))
    target_monthly_income = money(payload.get("target_monthly_income"))
    retirement_age = int(payload.get("employment", {}).get("retirement_age", 65))
    retirement_month = user.month_turning_age(retirement_age)

    asset_balance = _initial_financial_balance(payload)
    monthly_rows: list[dict[str, Any]] = []
    warnings: list[str] = []

    first_projection_month = months[0]
    first_year_january = Month(first_projection_month.year, 1)

    for index, month in enumerate(months):
        lines: list[dict[str, Any]] = []
        employment_income = _employment_income(payload, user, month, retirement_month, first_projection_month)
        _line(lines, "근로소득", employment_income, "employment")

        exit_event = _retirement_event_income(payload, month, retirement_month)
        if exit_event:
            asset_balance += exit_event
            _line(lines, "퇴직 이벤트", exit_event, "employment_exit")

        for item in payload.get("real_estate", []):
            income, expense = _real_estate_cashflow(item, month, first_projection_month)
            _line(lines, f"{_source_name(item, '부동산')} 수입", income, "real_estate_income")
            _line(lines, f"{_source_name(item, '부동산')} 비용", -expense, "real_estate_expense")

        pension_lines = _pension_cashflows(payload, user, month, first_projection_month)
        for source, amount in pension_lines:
            _line(lines, source, amount, "pension")

        investment_income = _investment_income(payload, month, first_projection_month)
        _line(lines, "배당/이자 금융수입", investment_income, "financial_income")

<<<<<<< HEAD
        asset_balance = _apply_financial_growth(asset_balance, payload)
=======
        asset_balance = _apply_financial_growth(asset_balance, payload, month, retirement_month)
>>>>>>> cursor/retirement-income-planning-docs-21f6
        non_withdrawal_total = Decimal(sum(line["amount"] for line in lines))
        target_gap = max(target_monthly_income - non_withdrawal_total, Decimal("0"))
        withdrawal = Decimal("0")
        if month.months_until(retirement_month) <= 0 and target_gap > 0:
            withdrawal = min(asset_balance, target_gap)
            asset_balance -= withdrawal
            _line(lines, "추천 금융자산 인출", withdrawal, "recommended_withdrawal")

        nominal_total = sum(line["amount"] for line in lines)
        months_from_value_base = first_year_january.months_until(month)
        real_total = Decimal(nominal_total) / ((Decimal("1") + monthly_growth(inflation)) ** max(months_from_value_base, 0))
        shortfall = max(target_monthly_income - Decimal(nominal_total), Decimal("0"))

        row = {
            "month": month.as_text(),
            "user_age": user.age_on_month(month),
            "spouse_age": spouse.age_on_month(month) if spouse else None,
            "nominal_total": int(nominal_total),
            "real_total": round_krw(real_total),
            "target_shortfall": round_krw(shortfall),
            "remaining_financial_assets": round_krw(asset_balance),
            "lines": lines,
        }
        monthly_rows.append(row)

        if asset_balance <= 0 and target_gap > withdrawal:
            warnings.append(
                f"{month.as_text()}부터 금융자산으로 목표 월수입 부족분을 모두 충당할 수 없습니다."
            )
            break

    recommendation = _build_recommendation(monthly_rows, payload, retirement_month, target_monthly_income)
    confidence = _confidence_score(payload)

    return {
        "currency": "KRW",
        "market": "KR",
        "projection_start": start.as_text(),
        "projection_end": monthly_rows[-1]["month"] if monthly_rows else end.as_text(),
        "target_monthly_income": round_krw(target_monthly_income),
        "confidence_score": confidence,
        "warnings": warnings,
        "recommendation": recommendation,
        "monthly": monthly_rows,
        "rule_versions": {
            "national_pension": "kr-nps-mvp-2026-04",
            "housing_pension": "kr-hf-user-or-table-mvp-2026-04",
            "tax": "kr-tax-user-monthly-cost-mvp-2026-04",
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
    return grown_amount(base, growth, start.months_until(month))


def _retirement_event_income(payload: dict[str, Any], month: Month, retirement_month: Month) -> Decimal:
    if month != retirement_month:
        return Decimal("0")
    employment = payload.get("employment", {})
    return money(employment.get("retirement_allowance")) + money(employment.get("voluntary_retirement_bonus"))


def _real_estate_cashflow(item: dict[str, Any], month: Month, start: Month) -> tuple[Decimal, Decimal]:
    months = start.months_until(month)
    income = grown_amount(money(item.get("monthly_income")), rate(item.get("income_growth_rate")), months)
    expense = grown_amount(money(item.get("monthly_expense")), rate(item.get("expense_growth_rate")), months)
    return income, expense


def _pension_cashflows(payload: dict[str, Any], user: Person, month: Month, start: Month) -> list[tuple[str, Decimal]]:
    results: list[tuple[str, Decimal]] = []
    for item in payload.get("pensions", []):
        owner_birth = item.get("owner_birth_date") or payload["household"]["user_birth_date"]
        owner = Person.parse(owner_birth)
        start_age = int(item.get("start_age", item.get("normal_start_age", 65)))
        start_month = owner.month_turning_age(start_age)
        if start_month.months_until(month) < 0:
            continue
        monthly_amount = money(item.get("target_monthly_amount"))
        pension_type = str(item.get("type", "")).lower()
        if pension_type in {"national", "국민연금", "national_pension"}:
            normal_age = int(item.get("normal_start_age") or default_national_pension_age(owner.birth_date.year))
            monthly_amount *= national_pension_factor(normal_age, start_age)
        growth = rate(item.get("annual_increase_rate"))
        monthly_amount = grown_amount(monthly_amount, growth, max(start_month.months_until(month), 0))
        results.append((_source_name(item, "연금"), monthly_amount))
    return results


def _investment_income(payload: dict[str, Any], month: Month, start: Month) -> Decimal:
    total = Decimal("0")
    for item in payload.get("financial_assets", []):
        income = money(item.get("monthly_income"))
        if not income:
            continue
        total += grown_amount(income, rate(item.get("income_growth_rate")), start.months_until(month))
    return total


def _initial_financial_balance(payload: dict[str, Any]) -> Decimal:
    total = Decimal("0")
    for item in payload.get("financial_assets", []):
        total += money(item.get("balance"))
    irp = payload.get("irp", {})
    total += money(irp.get("current_balance"))
    return total


<<<<<<< HEAD
def _apply_financial_growth(balance: Decimal, payload: dict[str, Any]) -> Decimal:
    if balance <= 0:
        return Decimal("0")
=======
def _apply_financial_growth(
    balance: Decimal,
    payload: dict[str, Any],
    month: Month,
    retirement_month: Month,
) -> Decimal:
>>>>>>> cursor/retirement-income-planning-docs-21f6
    assets = payload.get("financial_assets", [])
    weighted_return = Decimal("0")
    total_balance = Decimal("0")
    for item in assets:
        item_balance = money(item.get("balance"))
        total_balance += item_balance
        weighted_return += item_balance * rate(item.get("annual_return_rate"))
    irp = payload.get("irp", {})
    irp_balance = money(irp.get("current_balance"))
<<<<<<< HEAD
    irp_monthly = money(irp.get("monthly_contribution"))
    total_balance += irp_balance
    weighted_return += irp_balance * rate(irp.get("annual_return_rate"))
    annual = weighted_return / total_balance if total_balance else Decimal("0")
    return balance * (Decimal("1") + monthly_growth(annual)) + irp_monthly
=======
    irp_monthly = money(irp.get("monthly_contribution")) if retirement_month.months_until(month) < 0 else Decimal("0")
    total_balance += irp_balance
    weighted_return += irp_balance * rate(irp.get("annual_return_rate"))
    annual = weighted_return / total_balance if total_balance else Decimal("0")
    grown_balance = max(balance, Decimal("0")) * (Decimal("1") + monthly_growth(annual))
    return grown_balance + irp_monthly
>>>>>>> cursor/retirement-income-planning-docs-21f6


def _build_recommendation(
    rows: list[dict[str, Any]],
    payload: dict[str, Any],
    retirement_month: Month,
    target_monthly_income: Decimal,
) -> dict[str, Any]:
    if not rows or target_monthly_income <= 0:
        return {
            "summary": "목표 월수입이 입력되지 않아 추천 인출 전략을 계산하지 않았습니다.",
            "additional_savings_needed_at_retirement": 0,
            "monthly_additional_savings_until_retirement": 0,
            "depletion_month": None,
        }

    retirement_rows = [row for row in rows if Month.parse(row["month"]).months_until(retirement_month) <= 0]
    first_depletion = next((row for row in retirement_rows if row["remaining_financial_assets"] <= 0 and row["target_shortfall"] > 0), None)
    total_shortfall = sum(Decimal(row["target_shortfall"]) for row in retirement_rows)
    current_remaining = Decimal(rows[-1]["remaining_financial_assets"])
    additional_needed = max(total_shortfall - current_remaining, Decimal("0"))

    start = Month.parse(rows[0]["month"])
    months_until_retirement = max(start.months_until(retirement_month), 1)
    monthly_needed = additional_needed / Decimal(months_until_retirement)

    if additional_needed > 0:
        summary = "현재 입력 자산만으로는 목표 월수입을 전 기간 충족하기 어렵습니다."
    else:
        summary = "현재 입력 자산과 추천 인출 전략으로 목표 월수입 충족 가능성이 있습니다."

    return {
        "summary": summary,
        "additional_savings_needed_at_retirement": round_krw(additional_needed),
        "monthly_additional_savings_until_retirement": round_krw(monthly_needed),
        "depletion_month": first_depletion["month"] if first_depletion else None,
    }


def _confidence_score(payload: dict[str, Any]) -> int:
    checks = [
        bool(payload.get("household", {}).get("user_birth_date")),
        bool(payload.get("target_monthly_income")),
        bool(payload.get("employment")),
        bool(payload.get("pensions")),
        bool(payload.get("financial_assets") or payload.get("irp")),
        bool(payload.get("assumptions", {}).get("inflation_rate")),
    ]
    return round(sum(checks) / len(checks) * 100)
