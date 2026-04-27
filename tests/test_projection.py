import unittest
from decimal import Decimal

from pension_service.projection import Month, default_national_pension_age, national_pension_factor, project


def sample_payload():
    return {
        "start_month": "2026-01",
        "target_monthly_income": 4_000_000,
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
        payload["target_monthly_income"] = 0

        result = project(payload)

        self.assertEqual(result["market"], "KR")
        self.assertEqual(result["currency"], "KRW")
        self.assertEqual(result["projection_start"], "2026-01")
        self.assertEqual(result["projection_end"], "2070-12")
        self.assertEqual(result["monthly"][0]["user_age"], 55)

    def test_projection_runs_to_age_100_even_when_cash_is_negative(self):
        payload = sample_payload()
        payload["target_monthly_income"] = 0
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
        self.assertEqual(sources["퇴직연금/IRP 월수령"], 840_336)

    def test_health_and_national_pension_expenses_after_retirement(self):
        payload = sample_payload()
        payload["target_monthly_income"] = 0
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
        payload["target_monthly_income"] = 0
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

    def test_surplus_after_retirement_splits_by_stock_allocation_rate(self):
        payload = sample_payload()
        payload["target_monthly_income"] = 0
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

    def test_real_estate_income_grows_annually_not_monthly(self):
        payload = sample_payload()
        payload["target_monthly_income"] = 0
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
        payload["target_monthly_income"] = 0
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
        payload["target_monthly_income"] = 0
        payload["employment"]["retirement_allowance"] = 0
        payload["employment"]["voluntary_retirement_bonus"] = 0
        payload["financial_assets"] = []
        payload["irp"] = {
            "current_balance": 0,
            "monthly_contribution": 100,
            "annual_return_rate": 0,
            "payout_start_age": 60,
            "payout_end_age": 80,
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
        payload["target_monthly_income"] = 0
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
        payload["target_monthly_income"] = 0
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

    def test_recommendation_reports_shortfall_when_target_is_too_high(self):
        payload = sample_payload()
        payload["target_monthly_income"] = 20_000_000
        payload["expenses"]["monthly_living_expense"] = 25_000_000
        payload["financial_assets"][0]["balance"] = 1_000_000
        payload["irp"]["current_balance"] = 0
        payload["irp"]["monthly_contribution"] = 0

        result = project(payload)

        self.assertGreater(result["recommendation"]["additional_savings_needed_at_retirement"], 0)
        self.assertIsNotNone(result["recommendation"]["depletion_month"])

    def test_month_ordering_helper(self):
        self.assertEqual(Month.parse("2026-01").months_until(Month.parse("2027-01")), 12)


if __name__ == "__main__":
    unittest.main()
