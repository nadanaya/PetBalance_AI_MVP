from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import pandas as pd


@dataclass(frozen=True)
class FeedingSelection:
    product_id: str
    daily_amount_g: float
    active: bool = True


REQUIRED_PRODUCT_COLUMNS = {
    "product_id",
    "product_name",
    "category",
    "serving_basis_g",
    "nutrient",
    "amount_mg",
    "label_complete",
}


def validate_products(products: pd.DataFrame) -> None:
    missing = REQUIRED_PRODUCT_COLUMNS - set(products.columns)
    if missing:
        raise ValueError(f"제품 데이터 필수 열 누락: {sorted(missing)}")
    if (products["serving_basis_g"] <= 0).any():
        raise ValueError("serving_basis_g는 0보다 커야 합니다.")
    if (products["amount_mg"] < 0).any():
        raise ValueError("영양소 함량은 음수가 될 수 없습니다.")


def calculate_intake(
    products: pd.DataFrame,
    selections: Iterable[FeedingSelection],
) -> pd.DataFrame:
    validate_products(products)
    selected_rows: list[pd.DataFrame] = []

    for selection in selections:
        if not selection.active:
            continue
        if selection.daily_amount_g < 0:
            raise ValueError("하루 급여량은 음수가 될 수 없습니다.")
        rows = products[products["product_id"] == selection.product_id].copy()
        if rows.empty:
            raise ValueError(f"알 수 없는 제품: {selection.product_id}")
        rows["daily_amount_g"] = float(selection.daily_amount_g)
        rows["daily_nutrient_mg"] = (
            rows["amount_mg"] * rows["daily_amount_g"] / rows["serving_basis_g"]
        )
        selected_rows.append(rows)

    if not selected_rows:
        return pd.DataFrame(
            columns=[
                "nutrient",
                "product_id",
                "product_name",
                "daily_nutrient_mg",
                "label_complete",
            ]
        )
    return pd.concat(selected_rows, ignore_index=True)


def summarize_intake(intake: pd.DataFrame, standards: pd.DataFrame) -> pd.DataFrame:
    if intake.empty:
        result = standards.copy()
        result["total_mg"] = 0.0
        result["product_count"] = 0
        result["data_complete"] = False
    else:
        totals = (
            intake.groupby("nutrient", as_index=False)
            .agg(
                total_mg=("daily_nutrient_mg", "sum"),
                product_count=("product_id", "nunique"),
                data_complete=("label_complete", "all"),
            )
        )
        result = standards.merge(totals, on="nutrient", how="left")
        result[["total_mg", "product_count"]] = result[
            ["total_mg", "product_count"]
        ].fillna(0)
        result["data_complete"] = result["data_complete"].fillna(False).astype(bool)

    def classify(row: pd.Series) -> str:
        if not row["data_complete"]:
            return "정보 부족"
        if row["total_mg"] > row["demo_max_mg"]:
            return "기준 초과 가능"
        if row["product_count"] >= 2 and row["total_mg"] >= row["demo_min_mg"] * 0.8:
            return "중복 가능"
        if row["total_mg"] < row["demo_min_mg"]:
            return "참고 범위 미만"
        return "정보 충분"

    result["status"] = result.apply(classify, axis=1)
    result["range_ratio"] = (
        result["total_mg"] / result["demo_max_mg"].replace(0, pd.NA)
    ).fillna(0)
    return result


def product_contributions(intake: pd.DataFrame, nutrient: str) -> pd.DataFrame:
    rows = intake[intake["nutrient"] == nutrient].copy()
    if rows.empty:
        return pd.DataFrame(columns=["product_name", "daily_nutrient_mg", "share_pct"])
    grouped = (
        rows.groupby("product_name", as_index=False)["daily_nutrient_mg"].sum()
        .sort_values("daily_nutrient_mg", ascending=False)
    )
    total = grouped["daily_nutrient_mg"].sum()
    grouped["share_pct"] = grouped["daily_nutrient_mg"] / total * 100 if total else 0
    return grouped
