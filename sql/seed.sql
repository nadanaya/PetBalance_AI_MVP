INSERT INTO pets VALUES (1,'몽이','dog','2021-05-01',8.0,'adult');
INSERT INTO products VALUES ('food_a','밸런스 성견 사료','주식',100,42000,'demo'),('supp_cal','튼튼 칼슘 영양제','영양제',2,18000,'demo');
INSERT INTO product_nutrients VALUES ('food_a','칼슘',1050,1),('food_a','인',820,1),('supp_cal','칼슘',420,1),('supp_cal','인',160,1);
INSERT INTO feeding_plans VALUES (1,'food_a',120,1),(1,'supp_cal',2,1);
INSERT INTO nutrient_standards VALUES ('dog','adult','칼슘',1000,1900,'교육용 데모 기준',0),('dog','adult','인',750,1500,'교육용 데모 기준',0);
