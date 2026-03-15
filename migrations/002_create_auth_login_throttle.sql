CREATE TABLE IF NOT EXISTS auth_login_throttle (
  scope VARCHAR(220) PRIMARY KEY,
  failed_count INT NOT NULL DEFAULT 0,
  first_failed_at DATETIME NULL DEFAULT NULL,
  last_failed_at DATETIME NULL DEFAULT NULL,
  lock_until DATETIME NULL DEFAULT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
