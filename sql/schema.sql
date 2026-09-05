PRAGMA foreign_keys = ON;
CREATE TABLE pets (pet_id INTEGER PRIMARY KEY, name TEXT NOT NULL, species TEXT NOT NULL CHECK (species IN ('dog','cat')), birth_date TEXT, weight_kg REAL NOT NULL CHECK (weight_kg > 0), life_stage TEXT NOT NULL);
CREATE TABLE products (product_id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL CHECK (category IN ('주식','간식','영양제')), serving_basis_g REAL NOT NULL CHECK (serving_basis_g > 0), monthly_price_krw INTEGER CHECK (monthly_price_krw >= 0), source TEXT NOT NULL);
CREATE TABLE product_nutrients (product_id TEXT NOT NULL REFERENCES products(product_id), nutrient TEXT NOT NULL, amount_mg REAL NOT NULL CHECK (amount_mg >= 0), label_complete INTEGER NOT NULL CHECK (label_complete IN (0,1)), PRIMARY KEY (product_id,nutrient));
CREATE TABLE feeding_plans (pet_id INTEGER NOT NULL REFERENCES pets(pet_id), product_id TEXT NOT NULL REFERENCES products(product_id), daily_amount_g REAL NOT NULL CHECK (daily_amount_g >= 0), active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)), PRIMARY KEY (pet_id,product_id));
CREATE TABLE nutrient_standards (species TEXT NOT NULL, life_stage TEXT NOT NULL, nutrient TEXT NOT NULL, demo_min_mg REAL NOT NULL CHECK (demo_min_mg >= 0), demo_max_mg REAL NOT NULL CHECK (demo_max_mg >= demo_min_mg), source TEXT NOT NULL, verified INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0,1)), PRIMARY KEY (species,life_stage,nutrient));
CREATE INDEX idx_product_nutrients_nutrient ON product_nutrients(nutrient);
CREATE INDEX idx_feeding_plans_pet_active ON feeding_plans(pet_id,active);
