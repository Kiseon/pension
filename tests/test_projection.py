import unittest
from decimal import Decimal

from pension_service.projection import Month, default_national_pension_age, national_pension_factor, project


def sample_payload():
    return {
        "start_month": "2026-01",
        "household": {
            "user_birth_date": "1970-05-20",
            "spouse_birth_date": "1972-03-10",
        },
        "employment": {
            "currently_employed": True,
            "monthly_net_income": 5_000_000,
            "income_growth_rate": 0,
            "retirement_age": 60,
            "retirement_allowance": 80_000_000,
            "voluntary_retirement_bonus": 20_000_000,
            "retirement_payout_start_age": 60,
            "retirement_payout_end_age": 70,
        },
        "real_estate": [
            {
                "name": "임대주택",
                "monthly_income": 1_200_000,
                "monthly_expense": 200_000,
                "income_growth_rate": 0,
                "expense_growth_rate": 0,
            }
        ],
        "pensions": [
            {
                "name": "국민연금",
                "type": "national_pension",
                "target_monthly_amount": 1_500_000,
                "start_age": 65,
                "annual_increase_rate": 0,
            }
        ],
        "financial_assets": [
            {
                "name": "주식",
                "balance": 120_000_000,
                "annual_return_rate": 0.04,
                "monthly_income": 100_000,
            }
        ],
        "irp": {
            "current_balance": 50_000_000,
            "monthly_contribution": 500_000,
            "annual_return_rate": 0.03,
            "payout_start_age": 60,
            "payout_end_age": 80,
        },
        "expenses": {
            "monthly_living_expense": 0,
            "stock_allocation_rate": 0.5,
        },
        "assumptions": {"inflation_rate": 0.02},
    }


class ProjectionTests(unittest.TestCase):
    def test_projection_runs_to_age_100_when_assets_do_not_deplete_early(self):
        payload = sample_payload()
        result = project(payload)

        self.assertEqual(result["market"], "KR")
        self.assertEqual(result["currency"], "KRW")
        self.assertEqual(result["projection_start"], "2026-01")
        self.assertEqual(result["projection_end"], "2070-12")
        self.assertEqual(result["monthly"][0]["user_age"], 55)

    def test_projection_runs_to_age_100_even_when_cash_is_negative(self):
        payload = sample_payload()
        payload["financial_assets"][0]["balance"] = 0
        payload["irp"]["current_balance"] = 0
        payload["irp"]["monthly_contribution"] = 0
        payload["expenses"]["monthly_living_expense"] = 10_000_000

        result = project(payload)

        self.assertEqual(result["projection_end"], "2070-12")
        self.assertLess(result["monthly"][-1]["cash_balance"], 0)

    def test_employment_income_stops_and_retirement_payout_starts(self):
        result = project(sample_payload())
        retirement_row = next(row for row in result["monthly"] if row["month"] == "2030-06")
        sources = {line["source"]: line["amount"] for line in retirement_row["lines"]}

        self.assertNotIn("근로소득", sources)
        severance_monthly = 840_336
        self.assertGreaterEqual(sources["퇴직연금/IRP 월수령"], severance_monthly)

    def test_health_and_national_pension_expenses_after_retirement(self):
        payload = sample_payload()
        payload["employment"]["retirement_age"] = 58
        result = project(payload)
        row = next(row for row in result["monthly"] if row["month"] == "2029-06")
        sources = {line["source"]: line["amount"] for line in row["lines"]}

        self.assertIn("건강보험료", sources)
        self.assertLess(sources["건강보험료"], 0)
        self.assertIn("국민연금 납입", sources)
        self.assertLess(sources["국민연금 납입"], 0)

    def test_housing_pension_pricing_uses_younger_of_couple(self):
        payload = sample_payload()
        payload["employment"]["retirement_age"] = 58
        payload["household"]["spouse_birth_date"] = "1975-05-20"
        payload["pensions"] = [
            {
                "name": "주택연금",
                "type": "housing_pension",
                "target_monthly_amount": 0,
                "start_age": 70,
                "home_value": 900_000_000,
                "annual_increase_rate": 0,
            }
        ]

        with_spouse = project(payload)
        row_joint = next(row for row in with_spouse["monthly"] if row["month"] == "2040-05")
        housing_joint = next(line["amount"] for line in row_joint["lines"] if line["source"] == "주택연금")

        payload["household"] = {"user_birth_date": payload["household"]["user_birth_date"]}
        solo = project(payload)
        row_solo = next(row for row in solo["monthly"] if row["month"] == "2040-05")
        housing_solo = next(line["amount"] for line in row_solo["lines"] if line["source"] == "주택연금")

        self.assertLess(housing_joint, housing_solo)

    def test_retirement_payout_and_irp_combined_income_line(self):
        result = project(sample_payload())
        row = next(row for row in result["monthly"] if row["month"] == "2030-06")
        sources = {line["source"]: line["amount"] for line in row["lines"]}

        self.assertIn("퇴직연금/IRP 월수령", sources)
        self.assertNotIn("퇴직금/위로금 월수령", sources)
        self.assertNotIn("본인 IRP 월수령", sources)
        self.assertNotIn("배우자 IRP 월수령", sources)

    def test_irp_balance_near_zero_after_payout_window(self):
        """12-year equal amortization depletes ~50M pool (no return)."""

        payout_months = 12 * 12
        payload = {
            "start_month": "2026-01",
            "household": {"user_birth_date": "1965-06-01"},
            "employment": {
                "currently_employed": False,
                "monthly_net_income": 0,
                "income_growth_rate": 0,
                "retirement_age": 60,
                "retirement_allowance": 0,
                "voluntary_retirement_bonus": 0,
            },
            "real_estate": [],
            "pensions": [],
            "financial_assets": [],
            "irp": {
                "current_balance": 50_000_000,
                "monthly_contribution": 0,
                "annual_return_rate": 0,
                "payout_start_year": 2026,
                "payout_end_year": 2026 + 11,
            },
            "expenses": {"monthly_living_expense": 0, "stock_allocation_rate": 1},
            "assumptions": {"inflation_rate": 0},
        }
        result = project(payload)
        last_payout_month = Month(2026 + 11, 12).as_text()
        row = next(r for r in result["monthly"] if r["month"] == last_payout_month)
        self.assertLessEqual(row["retirement_balance"], 500_000)

    def test_national_pension_escalates_with_inflation_until_start(self):
        payload = sample_payload()
        payload["employment"]["retirement_age"] = 58
        payload["pensions"][0]["start_age"] = 65
        payload["assumptions"]["inflation_rate"] = 0.10
        result = project(payload)
        row = next(r for r in result["monthly"] if r["month"] == "2035-05")
        np_amount = next(line["amount"] for line in row["lines"] if line["source"] == "국민연금")
        self.assertGreater(np_amount, 1_500_000)

    def test_retirement_balance_drops_by_full_withdrawal_before_interest(self):
        """Withdrawal reduces balance by the payout amount; return accrues after flows."""

        payload = {
            "start_month": "2026-07",
            "household": {"user_birth_date": "1965-06-15"},
            "employment": {
                "currently_employed": False,
                "monthly_net_income": 0,
                "income_growth_rate": 0,
                "retirement_age": 61,
                "retirement_allowance": 0,
                "voluntary_retirement_bonus": 0,
            },
            "real_estate": [],
            "pensions": [],
            "financial_assets": [],
            "irp": {
                "current_balance": 600_000,
                "monthly_contribution": 0,
                "annual_return_rate": 0,
                "payout_start_year": 2026,
                "payout_end_year": 2026,
            },
            "expenses": {"monthly_living_expense": 0, "stock_allocation_rate": 0.5},
            "assumptions": {"inflation_rate": 0},
        }
        result = project(payload)
        row = result["monthly"][0]
        payout = next(line["amount"] for line in row["lines"] if line["source"] == "퇴직연금/IRP 월수령")
        self.assertEqual(payout, 100_000)
        self.assertEqual(row["retirement_balance"], 600_000 - 100_000)

    def test_surplus_after_retirement_splits_by_stock_allocation_rate(self):
        payload = sample_payload()
        payload["employment"]["retirement_age"] = 58
        payload["employment"]["retirement_allowance"] = 0
        payload["employment"]["voluntary_retirement_bonus"] = 0
        payload["real_estate"] = []
        payload["financial_assets"] = [
            {"name": "주식", "balance": 0, "annual_return_rate": 0, "monthly_income": 0}
        ]
        payload["irp"] = {
            "current_balance": 0,
            "monthly_contribution": 0,
            "annual_return_rate": 0,
            "payout_start_age": 80,
            "payout_end_age": 85,
        }
        payload["pensions"] = [
            {
                "name": "국민연금",
                "type": "national_pension",
                "target_monthly_amount": 5_000_000,
                "start_age": 58,
                "annual_increase_rate": 0,
            }
        ]
        payload["expenses"]["monthly_living_expense"] = 0
        payload["expenses"]["stock_allocation_rate"] = 0.25

        result = project(payload)
        row = next(r for r in result["monthly"] if r["month"] == "2029-01")
        self.assertGreater(row["stock_balance"], 0)
        self.assertGreater(row["cash_balance"], row["stock_balance"])

    def test_real_estate_expense_is_netish_times_marginal_rate(self):
        """비용 = (월수입 − 월수입×0.415) × 한계 소득세율."""

        payload = sample_payload()
        payload["real_estate"] = [
            {
                "name": "상가",
                "monthly_income": 1_000_000,
                "income_growth_rate": 0,
            }
        ]
        result = project(payload)
        row = result["monthly"][0]
        expense = abs(next(line["amount"] for line in row["lines"] if "비용" in line["source"]))
        netish = 1_000_000 * (1 - 0.415)
        employment = 5_000_000
        taxable = employment + netish
        self.assertLess(taxable, 14_000_000)
        expected = round(netish * 0.06)
        self.assertEqual(expense, expected)

    def test_no_annual_composite_tax_line(self):
        payload = sample_payload()
        result = project(payload)
        for row in result["monthly"]:
            for line in row["lines"]:
                self.assertNotIn("종합소득세", line["source"])

    def test_real_estate_income_grows_annually_not_monthly(self):
        payload = sample_payload()
        payload["real_estate"][0]["income_growth_rate"] = 0.12
        result = project(payload)

        jan = next(row for row in result["monthly"] if row["month"] == "2026-01")
        dec = next(row for row in result["monthly"] if row["month"] == "2026-12")
        next_jan = next(row for row in result["monthly"] if row["month"] == "2027-01")

        def rent(row):
            return next(line["amount"] for line in row["lines"] if line["source"] == "임대주택 수입")

        self.assertEqual(rent(jan), rent(dec))
        self.assertEqual(rent(next_jan), 1_344_000)

    def test_employment_income_grows_annually_not_monthly(self):
        payload = sample_payload()
        payload["employment"]["income_growth_rate"] = 0.12
        result = project(payload)

        jan = next(row for row in result["monthly"] if row["month"] == "2026-01")
        dec = next(row for row in result["monthly"] if row["month"] == "2026-12")
        next_jan = next(row for row in result["monthly"] if row["month"] == "2027-01")

        def salary(row):
            return next(line["amount"] for line in row["lines"] if line["source"] == "근로소득")

        self.assertEqual(salary(jan), salary(dec))
        self.assertEqual(salary(next_jan), 5_600_000)

    def test_national_pension_timing_factor(self):
        self.assertEqual(default_national_pension_age(1970), 65)
        self.assertEqual(national_pension_factor(65, 60), Decimal("0.70"))
        self.assertEqual(national_pension_factor(65, 70), Decimal("1.360"))

    def test_irp_contributions_stop_at_retirement_month(self):
        payload = sample_payload()
        payload["employment"]["retirement_allowance"] = 0
        payload["employment"]["voluntary_retirement_bonus"] = 0
        payload["financial_assets"] = []
        payload["irp"] = {
            "current_balance": 0,
            "monthly_contribution": 100,
            "annual_return_rate": 0,
            "payout_start_year": 2100,
            "payout_end_year": 2100,
        }

        result = project(payload)
        before_retirement = next(row for row in result["monthly"] if row["month"] == "2030-04")
        retirement_row = next(row for row in result["monthly"] if row["month"] == "2030-05")
        after_retirement = next(row for row in result["monthly"] if row["month"] == "2030-06")

        self.assertEqual(before_retirement["retirement_balance"], 5200)
        self.assertEqual(retirement_row["retirement_balance"], 5200)
        self.assertEqual(after_retirement["retirement_balance"], 5200)

    def test_pension_payout_starts_after_retirement_even_if_start_age_is_earlier(self):
        payload = sample_payload()
        payload["pensions"][0]["start_age"] = 55
        result = project(payload)

        before_retirement = next(row for row in result["monthly"] if row["month"] == "2030-03")
        after_retirement = next(row for row in result["monthly"] if row["month"] == "2030-06")

        before_sources = {line["source"] for line in before_retirement["lines"]}
        after_sources = {line["source"] for line in after_retirement["lines"]}

        self.assertNotIn("국민연금", before_sources)
        self.assertIn("국민연금", after_sources)

    def test_health_insurance_counts_pension_income_at_30_percent(self):
        payload = sample_payload()
        payload["employment"]["retirement_age"] = 58
        payload["real_estate"] = []
        payload["financial_assets"] = []
        payload["irp"]["current_balance"] = 0
        payload["irp"]["monthly_contribution"] = 0
        payload["pensions"][0]["target_monthly_amount"] = 1_000_000
        payload["pensions"][0]["start_age"] = 58

        result = project(payload)
        row = next(row for row in result["monthly"] if row["month"] == "2029-01")
        health = abs(next(line["amount"] for line in row["lines"] if line["source"] == "건강보험료"))

        expected = round(20_160 * 1.1314)
        self.assertEqual(health, expected)

    def test_positive_monthly_cashflow_splits_cash_and_stock_while_employed(self):
        payload = {
            "start_month": "2026-01",
            "household": {"user_birth_date": "1975-01-01"},
            "employment": {
                "currently_employed": True,
                "monthly_net_income": 2_000_000,
                "income_growth_rate": 0,
                "retirement_age": 65,
                "retirement_allowance": 0,
                "voluntary_retirement_bonus": 0,
            },
            "real_estate": [],
            "pensions": [],
            "financial_assets": [{"name": "주식", "balance": 0, "annual_return_rate": 0, "monthly_income": 0}],
            "irp": {
                "current_balance": 0,
                "monthly_contribution": 0,
                "annual_return_rate": 0,
                "payout_start_year": 2100,
                "payout_end_year": 2100,
            },
            "expenses": {"monthly_living_expense": 0, "stock_allocation_rate": 0.5},
            "assumptions": {"inflation_rate": 0},
        }
        result = project(payload)
        row = result["monthly"][0]
        nominal = row["nominal_total"]
        self.assertGreater(nominal, 0)
        self.assertEqual(row["cash_balance"], nominal // 2)
        self.assertEqual(row["stock_balance"], nominal - row["cash_balance"])

    def test_recommendation_notes_stress_when_cash_negative_after_retirement(self):
        payload = sample_payload()
        payload["employment"]["retirement_age"] = 58
        payload["expenses"]["monthly_living_expense"] = 25_000_000
        payload["financial_assets"][0]["balance"] = 1_000_000
        payload["irp"]["current_balance"] = 0
        payload["irp"]["monthly_contribution"] = 0

        result = project(payload)

        self.assertGreaterEqual(result["recommendation"]["additional_savings_needed_at_retirement"], 0)
        self.assertIsNotNone(result["recommendation"]["depletion_month"])

    def test_month_ordering_helper(self):
        self.assertEqual(Month.parse("2026-01").months_until(Month.parse("2027-01")), 12)


if __name__ == "__main__":
    unittest.main()
