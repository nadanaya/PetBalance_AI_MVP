PRAGMA foreign_key_check;
SELECT COUNT(*)=1 AS ok FROM pets WHERE pet_id=1;
SELECT COUNT(*)=2 AS ok FROM products;
SELECT COUNT(*)=2 AS ok FROM feeding_plans WHERE pet_id=1 AND active=1;
SELECT COUNT(*)=0 AS ok FROM product_nutrients WHERE amount_mg<0;
SELECT COUNT(*)=0 AS ok FROM nutrient_standards WHERE demo_max_mg<demo_min_mg;
