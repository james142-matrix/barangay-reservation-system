-- ============================================================
-- Barangay Molugan Facility Reservation System
-- Complete Database Setup SQL
-- ============================================================
-- How to use:
--   1. Open phpMyAdmin → select the "barangay" database
--   2. Click the "SQL" tab
--   3. Paste this entire file and click "Go"
--   OR
--   Run in terminal: mysql -u root -p barangay < database.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS barangay
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE barangay;

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(100)  NOT NULL UNIQUE,
  password      VARCHAR(500)  NOT NULL,
  email         VARCHAR(255)  NOT NULL,
  fullname      VARCHAR(255)  NOT NULL,
  phone         VARCHAR(20)   DEFAULT NULL,
  address       TEXT          DEFAULT NULL,
  role          VARCHAR(50)   NOT NULL DEFAULT 'barangay_staff',
  force_password_change TINYINT(1) NOT NULL DEFAULT 0,
  approval_status VARCHAR(20) NOT NULL DEFAULT 'approved',
  approved_by   VARCHAR(100)  DEFAULT NULL,
  approved_at   DATETIME      NULL DEFAULT NULL,
  archived      TINYINT(1)    NOT NULL DEFAULT 0,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: facilities
-- ============================================================
CREATE TABLE IF NOT EXISTS facilities (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(255)   NOT NULL,
  description   TEXT,
  capacity      INT            NOT NULL DEFAULT 0,
  price         DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  icon          VARCHAR(20)    CHARACTER SET utf8mb4 DEFAULT NULL,
  status        VARCHAR(50)    DEFAULT 'available',
  opening_time  TIME           NULL DEFAULT NULL,
  closing_time  TIME           NULL DEFAULT NULL,
  allows_overnight TINYINT(1)  NOT NULL DEFAULT 0,
  allows_all_day TINYINT(1)    NOT NULL DEFAULT 0,
  allows_multi_day TINYINT(1)  NOT NULL DEFAULT 0,
  max_duration_hours INT       NULL DEFAULT NULL,
  event_types   TEXT           DEFAULT NULL,
  event_types_archived TEXT    DEFAULT NULL,
  add_ons       TEXT           DEFAULT NULL,
  archived      TINYINT(1)     NOT NULL DEFAULT 0,
  created_at    TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: reservations
-- ============================================================
CREATE TABLE IF NOT EXISTS reservations (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  username          VARCHAR(255)   NOT NULL,
  client_email      VARCHAR(255)   DEFAULT NULL,
  facility_id       INT            NOT NULL,
  event_date        DATE           NOT NULL,
  event_end_date    DATE           NULL,
  start_time        TIME           NOT NULL,
  end_time          TIME           NOT NULL,
  event_type        VARCHAR(100)   DEFAULT NULL,
  expected_guests   INT            DEFAULT 0,
  event_description TEXT           DEFAULT NULL,
  contact_person    VARCHAR(255)   DEFAULT NULL,
  contact_phone     VARCHAR(50)    DEFAULT NULL,
  chairs_count      INT            DEFAULT 0,
  electronics_count INT            DEFAULT 0,
  medical_room_details VARCHAR(255) DEFAULT NULL,
  add_ons_snapshot  TEXT           DEFAULT NULL,
  add_on_total      DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  payment_option    VARCHAR(30)    NOT NULL DEFAULT 'full',
  down_payment_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  amount_paid       DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  total_cost        DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  status            VARCHAR(50)    NOT NULL DEFAULT 'pending',
  approved_by       VARCHAR(255)   DEFAULT NULL,
  approved_at       DATETIME       NULL DEFAULT NULL,
  payment_status    VARCHAR(50)    DEFAULT 'pending',
  payment_method    VARCHAR(50)    DEFAULT NULL,
  payment_date      DATETIME       NULL DEFAULT NULL,
  rejection_reason  TEXT           DEFAULT NULL,
  rejected_by       VARCHAR(255)   DEFAULT NULL,
  rejected_at       DATETIME       NULL DEFAULT NULL,
  archived          TINYINT(1)     NOT NULL DEFAULT 0,
  created_at        TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  KEY idx_reservations_facility_status_archived (facility_id, status, archived),
  KEY idx_reservations_username_archived (username, archived),
  FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: billing_transactions
-- One row per payment transaction (ledger/audit trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS billing_transactions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  reservation_id  INT            NOT NULL,
  username        VARCHAR(255)   NOT NULL,
  facility_id     INT            NULL,
  amount          DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  payment_status  VARCHAR(20)    NOT NULL,
  payment_method  VARCHAR(50)    DEFAULT NULL,
  payment_date    DATETIME       NOT NULL,
  recorded_by     VARCHAR(255)   DEFAULT NULL,
  notes           TEXT           DEFAULT NULL,
  created_at      TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_res_payment (reservation_id, payment_status, payment_date),
  KEY idx_bt_username (username),
  KEY idx_bt_payment_date (payment_date),
  CONSTRAINT fk_bt_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
  CONSTRAINT fk_bt_facility FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  username        VARCHAR(100)  NOT NULL,
  title           VARCHAR(255)  NOT NULL,
  message         TEXT          NOT NULL,
  type            VARCHAR(50)   DEFAULT 'info',
  is_read         TINYINT(1)    NOT NULL DEFAULT 0,
  reservation_id  INT           DEFAULT NULL,
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notifications_username_created (username, created_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: schema_migrations
-- Tracks one-time SQL migration files applied on existing DBs
-- ============================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  filename      VARCHAR(255) NOT NULL UNIQUE,
  applied_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: auth_login_throttle
-- Rate-limit buckets for login attempts (user and IP scopes)
-- ============================================================
CREATE TABLE IF NOT EXISTS auth_login_throttle (
  scope           VARCHAR(220) PRIMARY KEY,
  failed_count    INT          NOT NULL DEFAULT 0,
  first_failed_at DATETIME     NULL DEFAULT NULL,
  last_failed_at  DATETIME     NULL DEFAULT NULL,
  lock_until      DATETIME     NULL DEFAULT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: password_reset_codes
-- Stores hashed OTP reset codes sent by email (10-minute expiry)
-- ============================================================
CREATE TABLE IF NOT EXISTS password_reset_codes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(255) NOT NULL,
  code_hash   VARCHAR(255) NOT NULL,
  expires_at  DATETIME     NOT NULL,
  used_at     DATETIME     NULL DEFAULT NULL,
  request_ip  VARCHAR(45)  DEFAULT NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  KEY idx_prc_email (email),
  KEY idx_prc_expires (expires_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================
-- DEFAULT DATA: Admin account
-- Default demo credentials are kept for local testing.
-- ============================================================
INSERT IGNORE INTO users (id, username, password, email, fullname, phone, address, role, force_password_change, archived)
VALUES
  (1, 'admin',    'pbkdf2$120000$fyxvFvdIVF3A5d7CYrRtOQ==$8LrLWHAUYon1P0SKkqnHuEQklWn5AT/Iwb5qxR3f9HM=',   'admin@barangay.ph',    'System Administrator', '09000000000', 'Barangay Molugan, Iloilo', 'admin',          0, 0),
  (2, 'staff1',   'pbkdf2$120000$kvW4sAUrA0zROSIvPKgtOw==$LCACqxEJcqfJjULdHp1qsrkszWVB0NldUqmLWH0t6Yc=',   'staff1@barangay.ph',   'Maria Santos',         '09223456789', 'Molugan, Iloilo',          'barangay_staff', 0, 0),
  (3, 'staff2',   'pbkdf2$120000$IZJ9NUIgicTixROG9QgW+w==$HsmRsqAk/y6qQoE3NGi6dZs19k59jS/aaY0J6QYxIpw=',   'staff2@barangay.ph',   'Pedro Reyes',          '09323456789', 'Molugan, Iloilo',          'barangay_staff', 0, 0);

-- ============================================================
-- DEFAULT DATA: 6 Facilities
-- ============================================================
INSERT IGNORE INTO facilities (id, name, description, capacity, price, icon, status, opening_time, closing_time, allows_overnight, allows_all_day, allows_multi_day, max_duration_hours, event_types, add_ons)
VALUES
  (1, 'Community Hall',          'Large multi-purpose venue for events and gatherings',       200, 2000.00, '🏛️', 'available', '08:00:00', '22:00:00', 0, 0, 1, 8, '["Birthday Party","Wedding","Conference","Community Event","Other"]', '[{"id":"chairs","name":"Extra Chairs","price":10,"unit":"chair","enabled":true},{"id":"sound","name":"Sound System","price":500,"unit":"set","enabled":true}]'),
  (2, 'Sports Complex',          'Basketball court, badminton courts, and training facilities',150, 1500.00, '🏀', 'available', '06:00:00', '22:00:00', 0, 0, 1, 6, '["Basketball","Volleyball","Badminton","Training","Other"]', '[{"id":"lights","name":"Floodlights","price":300,"unit":"hour","enabled":true},{"id":"scoreboard","name":"Scoreboard Setup","price":200,"unit":"event","enabled":true}]'),
  (3, 'Cultural Center',         'Dedicated space for cultural events and workshops',          100, 1000.00, '🎭', 'available', '08:00:00', '21:00:00', 0, 0, 1, 8, '["Cultural Show","Workshop","Training","Community Event","Other"]', '[{"id":"projector","name":"Projector","price":350,"unit":"set","enabled":true},{"id":"mic","name":"Microphone Set","price":250,"unit":"set","enabled":true}]'),
  (4, 'Library & Learning Center','Quiet study area with meeting rooms',                       50,   500.00, '📚', 'available', '08:00:00', '20:00:00', 0, 0, 1, 4, '["Study Session","Reading Program","Workshop","Seminar","Other"]', '[{"id":"whiteboard","name":"Whiteboard Kit","price":150,"unit":"set","enabled":true}]'),
  (5, 'Medical Room',            'First aid and emergency medical services room',               20,   800.00, '🏥', 'available', '00:00:00', '23:59:00', 1, 1, 1, 24, '["Consultation","Checkup","Vaccination","First Aid","Other"]', '[]'),
  (6, 'Garden Event Space',      'Outdoor venue with covered pavilion',                        300, 2500.00, '🌳', 'available', '06:00:00', '23:00:00', 1, 0, 1, 12, '["Wedding","Birthday Party","Reception","Community Event","Other"]', '[{"id":"tent","name":"Tent Package","price":1200,"unit":"set","enabled":true},{"id":"lights","name":"String Lights","price":400,"unit":"set","enabled":true}]');

-- ============================================================
-- Done! Your database is ready.
-- ============================================================
