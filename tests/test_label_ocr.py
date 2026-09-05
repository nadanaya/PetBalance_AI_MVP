import unittest

import pandas as pd

from backend.label_ocr import (
    PRODUCT_ROW_COLUMNS,
    convert_to_mg,
    draft_to_rows,
    match_nutrient,
    normalize_number,
    parse_label_text,
)
from backend.nutrition import (
    REQUIRED_PRODUCT_COLUMNS,
    FeedingSelection,
    calculate_intake,
    summarize_intake,
)


class NumberAndUnitTests(unittest.TestCase):
    def test_thousands_separator(self):
        self.assertEqual(normalize_number("1,050"), 1050.0)
        self.assertEqual(normalize_number("1,234.5"), 1234.5)

    def test_rejects_garbage(self):
        self.assertIsNone(normalize_number("12x"))
        self.assertIsNone(normalize_number(""))

    def test_mg_passthrough(self):
        self.assertEqual(convert_to_mg(420, "mg", "칼슘"), 420)

    def test_gram_to_mg(self):
        self.assertEqual(convert_to_mg(1.5, "g", "칼슘"), 1500)

    def test_microgram_to_mg(self):
        self.assertAlmostEqual(convert_to_mg(18, "µg", "비타민D"), 0.018)
        self.assertAlmostEqual(convert_to_mg(18, "mcg", "비타민D"), 0.018)

    def test_iu_only_for_vitamin_d(self):
        self.assertAlmostEqual(convert_to_mg(400, "IU", "비타민D"), 0.01)
        self.assertIsNone(convert_to_mg(400, "IU", "칼슘"))

    def test_unknown_unit_is_none(self):
        self.assertIsNone(convert_to_mg(10, "스푼", "칼슘"))


class NutrientMatchTests(unittest.TestCase):
    def test_korean_and_english_synonyms(self):
        self.assertEqual(match_nutrient("칼슘(Ca)"), "칼슘")
        self.assertEqual(match_nutrient("Calcium"), "칼슘")
        self.assertEqual(match_nutrient("철분"), "철")
        self.assertEqual(match_nutrient("Vitamin D3"), "비타민D")

    def test_phosphorus_not_matched_inside_word(self):
        self.assertIsNone(match_nutrient("라인메모"))
        self.assertEqual(match_nutrient("인 "), "인")


class ParseLabelTextTests(unittest.TestCase):
    def test_multiple_nutrients_one_line(self):
        draft = parse_label_text("칼슘 1,050mg, 인 820mg, 비타민D 18µg")
        by_name = {n.nutrient: n.amount_mg for n in draft.nutrients}
        self.assertEqual(by_name["칼슘"], 1050)
        self.assertEqual(by_name["인"], 820)
        self.assertAlmostEqual(by_name["비타민D"], 0.018)

    def test_serving_basis_per_100g(self):
        draft = parse_label_text("영양성분 100g 당\n칼슘 1050mg")
        self.assertEqual(draft.serving_basis_g, 100.0)

    def test_serving_basis_per_tablet(self):
        draft = parse_label_text("1일 2정(2g) 기준\n칼슘 420mg")
        self.assertEqual(draft.serving_basis_g, 2.0)

    def test_category_and_name_guess(self):
        draft = parse_label_text("튼튼 칼슘 영양제\n1일 2g 기준\n칼슘 420mg")
        self.assertEqual(draft.category, "영양제")
        self.assertEqual(draft.product_name, "튼튼 칼슘 영양제")

    def test_unparsed_lines_captured(self):
        draft = parse_label_text("칼슘 1050mg\n조단백질 min 25%\n수분 10% 이하")
        self.assertTrue(any("조단백질" in ln for ln in draft.unparsed_lines))

    def test_default_serving_basis_when_absent(self):
        draft = parse_label_text("칼슘 1050mg")
        self.assertEqual(draft.serving_basis_g, 100.0)


class DraftToRowsTests(unittest.TestCase):
    def _draft(self):
        return parse_label_text(
            "밸런스 성견 사료\n100g 당\n칼슘 1050mg\n인 820mg"
        )

    def test_columns_match_product_schema(self):
        draft = self._draft()
        draft.label_complete = True
        rows = draft_to_rows(draft, product_id="user_x")
        self.assertEqual(list(rows.columns), PRODUCT_ROW_COLUMNS)
        self.assertTrue(REQUIRED_PRODUCT_COLUMNS.issubset(set(rows.columns)))
        self.assertEqual(set(rows["product_id"]), {"user_x"})

    def test_requires_name(self):
        draft = self._draft()
        draft.product_name = "  "
        with self.assertRaises(ValueError):
            draft_to_rows(draft)

    def test_requires_nutrients(self):
        draft = self._draft()
        draft.nutrients = []
        with self.assertRaises(ValueError):
            draft_to_rows(draft)

    def test_rows_flow_through_calculation(self):
        draft = self._draft()
        draft.label_complete = True
        rows = draft_to_rows(draft, product_id="user_x")
        standards = pd.DataFrame(
            [{"nutrient": "칼슘", "demo_min_mg": 1000, "demo_max_mg": 1900}]
        )
        intake = calculate_intake(rows, [FeedingSelection("user_x", 100)])
        summary = summarize_intake(intake, standards)
        self.assertAlmostEqual(
            float(summary.loc[summary["nutrient"] == "칼슘", "total_mg"].iloc[0]),
            1050.0,
        )


if __name__ == "__main__":
    unittest.main()
