-- =============================================================
-- ACEP Training Database Schema
-- AI Construction Engineering Platform
-- =============================================================

CREATE DATABASE IF NOT EXISTS acep_training;
USE acep_training;

-- -----------------------------------------------------------
-- 1. PROJECTS
-- -----------------------------------------------------------
CREATE TABLE projects (
  project_id       VARCHAR(20)   PRIMARY KEY,
  city             VARCHAR(50)   NOT NULL,
  region           VARCHAR(50)   NOT NULL,
  project_type     VARCHAR(50)   NOT NULL,
  land_area_m2     DECIMAL(10,2) DEFAULT NULL,
  building_area_m2 DECIMAL(10,2) NOT NULL,
  floors           INT           NOT NULL DEFAULT 1,
  units            INT           DEFAULT NULL,
  finishing_level  VARCHAR(20)   DEFAULT 'Standard',
  construction_method VARCHAR(30) DEFAULT 'Traditional',
  structural_system   VARCHAR(30) DEFAULT NULL,
  concrete_m3      DECIMAL(12,2) DEFAULT NULL,
  steel_ton        DECIMAL(10,2) DEFAULT NULL,
  blocks_m2        DECIMAL(12,2) DEFAULT NULL,
  tiles_m2         DECIMAL(12,2) DEFAULT NULL,
  paint_m2         DECIMAL(12,2) DEFAULT NULL,
  electrical_points INT           DEFAULT NULL,
  plumbing_points   INT           DEFAULT NULL,
  estimated_cost_sar DECIMAL(16,2) DEFAULT NULL,
  duration_months  DECIMAL(5,1)  DEFAULT NULL,
  year             INT           DEFAULT NULL,
  created_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_city (city),
  INDEX idx_type (project_type),
  INDEX idx_year (year)
);

-- -----------------------------------------------------------
-- 2. BOQ ITEMS
-- -----------------------------------------------------------
CREATE TABLE boq_items (
  boq_id          BIGINT        AUTO_INCREMENT PRIMARY KEY,
  project_id      VARCHAR(20)   NOT NULL,
  item_code       VARCHAR(20)   NOT NULL,
  description_ar  TEXT          NOT NULL,
  description_en  TEXT          DEFAULT NULL,
  category        VARCHAR(30)   NOT NULL,
  level           VARCHAR(15)   DEFAULT 'Core',
  unit            VARCHAR(10)   NOT NULL,
  quantity        DECIMAL(14,2) NOT NULL,
  unit_price_sar  DECIMAL(10,2) NOT NULL,
  total_price_sar DECIMAL(16,2) GENERATED ALWAYS AS (quantity * unit_price_sar) STORED,
  confidence      TINYINT       DEFAULT 85,
  waste_factor    DECIMAL(4,2)  DEFAULT 0.05,
  FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
  INDEX idx_project (project_id),
  INDEX idx_category (category),
  INDEX idx_code (item_code)
);

-- -----------------------------------------------------------
-- 3. MATERIAL PRICES (Saudi Market)
-- -----------------------------------------------------------
CREATE TABLE material_prices (
  price_id       BIGINT        AUTO_INCREMENT PRIMARY KEY,
  material_name  VARCHAR(100)  NOT NULL,
  category       VARCHAR(30)   NOT NULL,
  unit           VARCHAR(10)   NOT NULL,
  city           VARCHAR(50)   NOT NULL,
  supplier_name  VARCHAR(200)  DEFAULT NULL,
  min_price_sar  DECIMAL(10,2) DEFAULT NULL,
  avg_price_sar  DECIMAL(10,2) NOT NULL,
  max_price_sar  DECIMAL(10,2) DEFAULT NULL,
  price_date     DATE          NOT NULL,
  quality_grade  VARCHAR(10)   DEFAULT 'Standard',
  INDEX idx_material (material_name),
  INDEX idx_city (city),
  INDEX idx_date (price_date)
);

-- -----------------------------------------------------------
-- 4. SUPPLIERS
-- -----------------------------------------------------------
CREATE TABLE suppliers (
  supplier_id       INT           AUTO_INCREMENT PRIMARY KEY,
  supplier_name     VARCHAR(200)  NOT NULL,
  city              VARCHAR(50)   NOT NULL,
  speciality        VARCHAR(100)  NOT NULL,
  rating            DECIMAL(2,1)  DEFAULT 3.0,
  delivery_speed_days INT         DEFAULT 7,
  contract_years    INT           DEFAULT 0,
  compliance_percent TINYINT      DEFAULT 90,
  total_deals       INT           DEFAULT 0,
  INDEX idx_city (city),
  INDEX idx_speciality (speciality)
);

-- -----------------------------------------------------------
-- 5. RISKS
-- -----------------------------------------------------------
CREATE TABLE risks (
  risk_id          BIGINT        AUTO_INCREMENT PRIMARY KEY,
  project_id       VARCHAR(20)   NOT NULL,
  risk_category    VARCHAR(30)   NOT NULL,
  description      TEXT          NOT NULL,
  probability      TINYINT       NOT NULL CHECK (probability BETWEEN 1 AND 5),
  impact           TINYINT       NOT NULL CHECK (impact BETWEEN 1 AND 5),
  risk_level       VARCHAR(15)   GENERATED ALWAYS AS (
    CASE
      WHEN probability * impact >= 20 THEN 'Critical'
      WHEN probability * impact >= 12 THEN 'High'
      WHEN probability * impact >= 6  THEN 'Medium'
      ELSE 'Low'
    END
  ) STORED,
  mitigation       TEXT          DEFAULT NULL,
  detected_by_ai   BOOLEAN       DEFAULT FALSE,
  FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
  INDEX idx_project (project_id),
  INDEX idx_category (risk_category),
  INDEX idx_level (risk_level)
);

-- -----------------------------------------------------------
-- 6. LABOR RATES
-- -----------------------------------------------------------
CREATE TABLE labor_rates (
  rate_id          INT           AUTO_INCREMENT PRIMARY KEY,
  trade            VARCHAR(50)   NOT NULL,
  city             VARCHAR(50)   NOT NULL,
  daily_rate_sar   DECIMAL(8,2)  NOT NULL,
  monthly_rate_sar DECIMAL(10,2) GENERATED ALWAYS AS (daily_rate_sar * 26) STORED,
  productivity_factor DECIMAL(4,2) DEFAULT 1.0,
  year             INT           NOT NULL,
  INDEX idx_trade (trade),
  INDEX idx_city (city)
);

-- -----------------------------------------------------------
-- 7. EQUIPMENT RATES
-- -----------------------------------------------------------
CREATE TABLE equipment_rates (
  equip_id         INT           AUTO_INCREMENT PRIMARY KEY,
  equipment_name   VARCHAR(100)  NOT NULL,
  category         VARCHAR(30)   NOT NULL,
  city             VARCHAR(50)   NOT NULL,
  daily_rate_sar   DECIMAL(10,2) NOT NULL,
  weekly_rate_sar  DECIMAL(10,2) DEFAULT NULL,
  monthly_rate_sar DECIMAL(10,2) DEFAULT NULL,
  with_operator    BOOLEAN       DEFAULT FALSE,
  INDEX idx_category (category),
  INDEX idx_city (city)
);

-- -----------------------------------------------------------
-- 8. QUALITY DEFECTS
-- -----------------------------------------------------------
CREATE TABLE quality_defects (
  defect_id        BIGINT        AUTO_INCREMENT PRIMARY KEY,
  project_id       VARCHAR(20)   NOT NULL,
  defect_type      VARCHAR(50)   NOT NULL,
  severity         VARCHAR(10)   NOT NULL CHECK (severity IN ('Critical','High','Medium','Low')),
  location         VARCHAR(100)  DEFAULT NULL,
  element_type     VARCHAR(30)   DEFAULT NULL,
  detected_by      VARCHAR(20)   DEFAULT 'AI',
  confidence       TINYINT       DEFAULT 90,
  description      TEXT          DEFAULT NULL,
  status           VARCHAR(15)   DEFAULT 'Open' CHECK (status IN ('Open','InProgress','Resolved','Verified')),
  FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
  INDEX idx_type (defect_type),
  INDEX idx_severity (severity)
);

-- -----------------------------------------------------------
-- 9. SCHEDULE ACTIVITIES
-- -----------------------------------------------------------
CREATE TABLE schedule_activities (
  activity_id      BIGINT        AUTO_INCREMENT PRIMARY KEY,
  project_id       VARCHAR(20)   NOT NULL,
  activity_name    VARCHAR(200)  NOT NULL,
  duration_days    INT           NOT NULL,
  predecessors     VARCHAR(200)  DEFAULT NULL,
  early_start      INT           DEFAULT NULL,
  early_finish     INT           DEFAULT NULL,
  late_start       INT           DEFAULT NULL,
  late_finish      INT           DEFAULT NULL,
  total_float      INT           GENERATED ALWAYS AS (late_start - early_start) STORED,
  is_critical      BOOLEAN       GENERATED ALWAYS AS ((late_start - early_start) = 0) STORED,
  FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
  INDEX idx_project (project_id),
  INDEX idx_critical (is_critical)
);

-- -----------------------------------------------------------
-- 10. PROJECT UNDERSTANDING TRAINING
-- -----------------------------------------------------------
CREATE TABLE project_understanding (
  pu_id            BIGINT        AUTO_INCREMENT PRIMARY KEY,
  raw_description  TEXT          NOT NULL,
  project_type     VARCHAR(50)   NOT NULL,
  city             VARCHAR(50)   DEFAULT NULL,
  area_m2          DECIMAL(10,2) DEFAULT NULL,
  floors           INT           DEFAULT NULL,
  finishing_level  VARCHAR(20)   DEFAULT NULL,
  confidence       TINYINT       DEFAULT 0,
  source           VARCHAR(20)   DEFAULT 'manual',
  INDEX idx_type (project_type)
);

-- =============================================================
-- VIEWS
-- =============================================================

-- Project Summary View
CREATE VIEW v_project_summary AS
SELECT
  p.project_id, p.city, p.project_type, p.building_area_m2,
  p.floors, p.concrete_m3, p.steel_ton, p.estimated_cost_sar,
  p.duration_months,
  COUNT(DISTINCT b.boq_id) AS boq_items_count,
  SUM(b.total_price_sar) AS total_boq_cost,
  COUNT(DISTINCT r.risk_id) AS risk_count,
  MAX(r.risk_level) AS max_risk_level
FROM projects p
LEFT JOIN boq_items b ON p.project_id = b.project_id
LEFT JOIN risks r ON p.project_id = r.project_id
GROUP BY p.project_id;

-- Material Price Trends View
CREATE VIEW v_material_trends AS
SELECT
  material_name, city,
  YEAR(price_date) AS year,
  MONTH(price_date) AS month,
  AVG(avg_price_sar) AS avg_price,
  COUNT(*) AS records
FROM material_prices
GROUP BY material_name, city, YEAR(price_date), MONTH(price_date);

-- Saudi Market Summary View
CREATE VIEW v_saudi_market AS
SELECT
  city,
  COUNT(DISTINCT s.supplier_id) AS suppliers,
  AVG(s.rating) AS avg_rating,
  AVG(mp.avg_price_sar) AS avg_material_price
FROM suppliers s
JOIN material_prices mp ON s.city = mp.city
GROUP BY s.city;
