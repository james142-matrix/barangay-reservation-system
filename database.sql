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
  role          VARCHAR(50)   NOT NULL DEFAULT 'resident',
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
  created_at    TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: reservations
-- ============================================================
CREATE TABLE IF NOT EXISTS reservations (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  username          VARCHAR(100)   NOT NULL,
  facility_id       INT            NOT NULL,
  event_date        DATE           NOT NULL,
  start_time        VARCHAR(10)    NOT NULL,
  end_time          VARCHAR(10)    NOT NULL,
  event_type        VARCHAR(100)   DEFAULT NULL,
  expected_guests   INT            DEFAULT 0,
  event_description TEXT           DEFAULT NULL,
  contact_person    VARCHAR(255)   DEFAULT NULL,
  contact_phone     VARCHAR(20)    DEFAULT NULL,
  status            VARCHAR(50)    NOT NULL DEFAULT 'pending',
  total_cost        DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  payment_status    VARCHAR(50)    NOT NULL DEFAULT 'pending',
  payment_method    VARCHAR(50)    DEFAULT NULL,
  payment_date      TIMESTAMP      NULL DEFAULT NULL,
  approved_at       TIMESTAMP      NULL DEFAULT NULL,
  approved_by       VARCHAR(100)   DEFAULT NULL,
  rejection_reason  TEXT           DEFAULT NULL,
  rejected_at       TIMESTAMP      NULL DEFAULT NULL,
  rejected_by       VARCHAR(100)   DEFAULT NULL,
  created_at        TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE
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
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: verification_codes (for email signup/forgot password)
-- ============================================================
CREATE TABLE IF NOT EXISTS verification_codes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(255)  NOT NULL,
  code        VARCHAR(10)   NOT NULL,
  expires_at  TIMESTAMP     NOT NULL,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================
-- DEFAULT DATA: Admin account
-- Password: admin123 (stored as plaintext for demo;
--           the system will upgrade to PBKDF2 hash on first login)
-- ============================================================
INSERT IGNORE INTO users (id, username, password, email, fullname, phone, address, role, archived)
VALUES
  (1, 'admin',    'admin123',   'admin@barangay.ph',    'System Administrator', '09000000000', 'Barangay Molugan, Iloilo', 'admin',          0),
  (2, 'staff1',   'staff123',   'staff1@barangay.ph',   'Maria Santos',         '09223456789', 'Molugan, Iloilo',          'barangay_staff', 0),
  (3, 'staff2',   'staff123',   'staff2@barangay.ph',   'Pedro Reyes',          '09323456789', 'Molugan, Iloilo',          'barangay_staff', 0),
  (4, 'resident1','resident123','resident1@barangay.ph','Juan Dela Cruz',        '09123456789', 'Molugan, Iloilo',          'resident',       0);

-- ============================================================
-- DEFAULT DATA: 6 Facilities
-- ============================================================
INSERT IGNORE INTO facilities (id, name, description, capacity, price, icon, status)
VALUES
  (1, 'Community Hall',          'Large multi-purpose venue for events and gatherings',       200, 2000.00, '🏛️', 'available'),
  (2, 'Sports Complex',          'Basketball court, badminton courts, and training facilities',150, 1500.00, '🏀', 'available'),
  (3, 'Cultural Center',         'Dedicated space for cultural events and workshops',          100, 1000.00, '🎭', 'available'),
  (4, 'Library & Learning Center','Quiet study area with meeting rooms',                       50,   500.00, '📚', 'available'),
  (5, 'Medical Room',            'First aid and emergency medical services room',               20,   800.00, '🏥', 'available'),
  (6, 'Garden Event Space',      'Outdoor venue with covered pavilion',                        300, 2500.00, '🌳', 'available');

-- ============================================================
-- Done! Your database is ready.
-- ============================================================
