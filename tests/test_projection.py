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

    def test_employment_income_stops_and_retirement_event_is_added(self):
        result = project(sample_payload())
        retirement_row = next(row for row in result["monthly"] if row["month"] == "2030-05")
        sources = {line["source"]: line["amount"] for line in retirement_row["lines"]}

        self.assertNotIn("근로소득", sources)
        self.assertEqual(sources["퇴직 이벤트"], 100_000_000)

    def test_national_pension_timing_factor(self):
        self.assertEqual(default_national_pension_age(1970), 65)
        self.assertEqual(national_pension_factor(65, 60), Decimal("0.70"))
        self.assertEqual(national_pension_factor(65, 70), Decimal("1.360"))

<<<<<<< HEAD
=======
    def test_irp_contributions_stop_at_retirement_month(self):
        payload = sample_payload()
        payload["target_monthly_income"] = 0
        payload["financial_assets"] = []
        payload["irp"] = {
            "current_balance": 0,
            "monthly_contribution": 100,
            "annual_return_rate": 0,
        }

        result = project(payload)
        before_retirement = next(row for row in result["monthly"] if row["month"] == "2030-04")
        retirement_row = next(row for row in result["monthly"] if row["month"] == "2030-05")
        after_retirement = next(row for row in result["monthly"] if row["month"] == "2030-06")

        self.assertEqual(before_retirement["remaining_financial_assets"], 5200)
        self.assertEqual(retirement_row["remaining_financial_assets"], 100_005_200)
        self.assertEqual(after_retirement["remaining_financial_assets"], 100_005_200)

>>>>>>> cursor/retirement-income-planning-docs-21f6
    def test_recommendation_reports_shortfall_when_target_is_too_high(self):
        payload = sample_payload()
        payload["target_monthly_income"] = 20_000_000
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
