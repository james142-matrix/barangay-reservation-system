SET @db_name = DATABASE();

SET @idx_exists = (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = @db_name
    AND table_name = 'reservations'
    AND index_name = 'idx_reservations_facility_status_archived'
);
SET @sql = IF(
  @idx_exists = 0,
  'CREATE INDEX idx_reservations_facility_status_archived ON reservations (facility_id, status, archived)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = @db_name
    AND table_name = 'reservations'
    AND index_name = 'idx_reservations_username_archived'
);
SET @sql = IF(
  @idx_exists = 0,
  'CREATE INDEX idx_reservations_username_archived ON reservations (username, archived)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = @db_name
    AND table_name = 'notifications'
    AND index_name = 'idx_notifications_username_created'
);
SET @sql = IF(
  @idx_exists = 0,
  'CREATE INDEX idx_notifications_username_created ON notifications (username, created_at)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
