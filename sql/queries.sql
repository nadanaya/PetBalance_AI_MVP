SELECT pn.nutrient,
       SUM(pn.amount_mg * fp.daily_amount_g / p.serving_basis_g) AS daily_total_mg,
       COUNT(DISTINCT fp.product_id) AS contributing_products
FROM feeding_plans fp
JOIN products p ON p.product_id=fp.product_id
JOIN product_nutrients pn ON pn.product_id=p.product_id
WHERE fp.pet_id=1 AND fp.active=1
GROUP BY pn.nutrient ORDER BY pn.nutrient;
