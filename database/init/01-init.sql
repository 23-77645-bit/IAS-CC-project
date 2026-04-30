-- Docker initialization script
-- This file is automatically executed when the MySQL container starts for the first time

-- Run the main schema
SOURCE /docker-entrypoint-initdb.d/schema.sql;

-- Create application user with limited permissions
CREATE USER IF NOT EXISTS 'att_app'@'%' IDENTIFIED BY '${DB_PASSWORD}';
GRANT SELECT, INSERT, UPDATE ON attendance.students TO 'att_app'@'%';
GRANT SELECT, INSERT ON attendance.attendance TO 'att_app'@'%';
GRANT SELECT, INSERT ON attendance.scan_requests TO 'att_app'@'%';
GRANT SELECT, INSERT ON attendance.audit_log TO 'att_app'@'%';
GRANT SELECT ON attendance.config TO 'att_app'@'%';
GRANT SELECT ON attendance.daily_attendance_summary TO 'att_app'@'%';
GRANT EXECUTE ON PROCEDURE attendance.record_attendance TO 'att_app'@'%';
FLUSH PRIVILEGES;
