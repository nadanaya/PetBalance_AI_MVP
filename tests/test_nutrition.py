import unittest

import pandas as pd

from backend.nutrition import (
    FeedingSelection,
    calculate_intake,
    product_contributions,
    summarize_intake,
)


class NutritionTests(unittest.TestCase):
    def setUp(self):
        self.products = pd.DataFrame(
            [
                {
                    "product_id": "a",
                    "product_name": "A",
                    "category": "주식",
                    "serving_basis_g": 100,
                    "nutrient": "칼슘",
                    "amount_mg": 1000,
                    "label_complete": True,
                },
                {
                    "product_id": "b",
                    "product_name": "B",
                    "category": "영양제",
                    "serving_basis_g": 2,
                    "nutrient": "칼슘",
                    "amount_mg": 500,
                    "label_complete": True,
                },
            ]
        )
        self.standards = pd.DataFrame(
            [{"nutrient": "칼슘", "demo_min_mg": 900, "demo_max_mg": 1500}]
        )

    def test_daily_amount_conversion_and_sum(self):
        intake = calculate_intake(
            self.products,
            [FeedingSelection("a", 100), FeedingSelection("b", 2)],
        )
        self.assertEqual(intake["daily_nutrient_mg"].sum(), 1500)

    def test_over_maximum_is_flagged(self):
        intake = calculate_intake(
            self.products,
            [FeedingSelection("a", 120), FeedingSelection("b", 2)],
        )
        result = summarize_intake(intake, self.standards)
        self.assertEqual(result.iloc[0]["status"], "기준 초과 가능")

    def test_incomplete_label_is_information_gap(self):
        products = self.products.copy()
        products.loc[products["product_id"] == "b", "label_complete"] = False
        intake = calculate_intake(
            products, [FeedingSelection("a", 100), FeedingSelection("b", 2)]
        )
        result = summarize_intake(intake, self.standards)
        self.assertEqual(result.iloc[0]["status"], "정보 부족")

    def test_inactive_product_is_excluded(self):
        intake = calculate_intake(
            self.products,
            [FeedingSelection("a", 100), FeedingSelection("b", 2, active=False)],
        )
        self.assertEqual(intake["daily_nutrient_mg"].sum(), 1000)

    def test_contribution_sums_to_100(self):
        intake = calculate_intake(
            self.products,
            [FeedingSelection("a", 100), FeedingSelection("b", 2)],
        )
        contribution = product_contributions(intake, "칼슘")
        self.assertAlmostEqual(contribution["share_pct"].sum(), 100)

    def test_negative_feeding_is_rejected(self):
        with self.assertRaises(ValueError):
            calculate_intake(self.products, [FeedingSelection("a", -1)])


if __name__ == "__main__":
    unittest.main()
