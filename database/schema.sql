-- Attendance Management System Database Schema
-- MySQL 8.0+

-- Create database
CREATE DATABASE IF NOT EXISTS attendance 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

USE attendance;

-- Students table
CREATE TABLE students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    qr_id VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    program VARCHAR(100),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_qr_id (qr_id),
    INDEX idx_active (active)
) ENGINE=InnoDB;

-- Attendance records table
CREATE TABLE attendance (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('present', 'late', 'duplicate', 'invalid') NOT NULL,
    source_device VARCHAR(64),
    session_id VARCHAR(64),
    notes TEXT,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT,
    INDEX idx_student_date (student_id, DATE(timestamp)),
    INDEX idx_timestamp (timestamp),
    INDEX idx_status (status),
    INDEX idx_session (session_id)
) ENGINE=InnoDB;

-- Idempotency tracking table (prevent duplicate submissions)
CREATE TABLE scan_requests (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    request_id VARCHAR(64) UNIQUE NOT NULL,
    student_id INT NOT NULL,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_status VARCHAR(32),
    INDEX idx_request_id (request_id),
    INDEX idx_processed (processed_at)
) ENGINE=InnoDB;

-- Audit log table
CREATE TABLE audit_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(32),
    entity_id BIGINT,
    old_value JSON,
    new_value JSON,
    performed_by VARCHAR(64),
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    INDEX idx_action (action),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_performed_at (performed_at)
) ENGINE=InnoDB;

-- System configuration table
CREATE TABLE config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(64) UNIQUE NOT NULL,
    config_value TEXT,
    description VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Insert default configuration
INSERT INTO config (config_key, config_value, description) VALUES
    ('late_threshold_minutes', '15', 'Minutes after session start to consider late'),
    ('duplicate_window_minutes', '5', 'Minutes before duplicate scan is blocked'),
    ('session_timeout_minutes', '120', 'Session timeout in minutes'),
    ('max_retries', '3', 'Maximum retry attempts for failed scans');

-- Seed sample student data
INSERT INTO students (qr_id, name, program, active) VALUES
    ('QR001-STU-2024', 'Alice Johnson', 'Computer Science', TRUE),
    ('QR002-STU-2024', 'Bob Smith', 'Engineering', TRUE),
    ('QR003-STU-2024', 'Carol Williams', 'Mathematics', TRUE),
    ('QR004-STU-2024', 'David Brown', 'Physics', TRUE),
    ('QR005-STU-2024', 'Eve Davis', 'Chemistry', TRUE);

-- Create view for daily attendance summary
CREATE VIEW daily_attendance_summary AS
SELECT 
    DATE(a.timestamp) as attendance_date,
    COUNT(DISTINCT a.student_id) as total_students,
    SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
    SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count,
    SUM(CASE WHEN a.status = 'duplicate' THEN 1 ELSE 0 END) as duplicate_count,
    SUM(CASE WHEN a.status = 'invalid' THEN 1 ELSE 0 END) as invalid_count
FROM attendance a
GROUP BY DATE(a.timestamp)
ORDER BY attendance_date DESC;

-- Create stored procedure for recording attendance with idempotency
DELIMITER //
CREATE PROCEDURE record_attendance(
    IN p_qr_id VARCHAR(64),
    IN p_request_id VARCHAR(64),
    IN p_source_device VARCHAR(64),
    IN p_session_id VARCHAR(64),
    OUT o_status VARCHAR(32),
    OUT o_student_id INT,
    OUT o_student_name VARCHAR(255)
)
BEGIN
    DECLARE v_student_id INT;
    DECLARE v_student_name VARCHAR(255);
    DECLARE v_is_active BOOLEAN;
    DECLARE v_duplicate_count INT;
    DECLARE v_duplicate_window INT;
    
    -- Get duplicate window from config
    SELECT CAST(config_value AS UNSIGNED) INTO v_duplicate_window 
    FROM config WHERE config_key = 'duplicate_window_minutes';
    
    -- Check if request already processed (idempotency)
    IF EXISTS (SELECT 1 FROM scan_requests WHERE request_id = p_request_id) THEN
        SELECT sr.response_status, sr.student_id INTO o_status, o_student_id
        FROM scan_requests sr WHERE sr.request_id = p_request_id;
        
        SELECT name INTO o_student_name FROM students WHERE id = o_student_id;
        LEAVE;
    END IF;
    
    -- Lookup student by QR ID
    SELECT id, name, active INTO v_student_id, v_student_name, v_is_active
    FROM students WHERE qr_id = p_qr_id;
    
    IF v_student_id IS NULL THEN
        SET o_status = 'invalid';
        SET o_student_id = NULL;
        SET o_student_name = NULL;
        
        INSERT INTO scan_requests (request_id, student_id, response_status)
        VALUES (p_request_id, 0, o_status);
        LEAVE;
    END IF;
    
    IF NOT v_is_active THEN
        SET o_status = 'invalid';
        SET o_student_id = v_student_id;
        SET o_student_name = v_student_name;
        
        INSERT INTO scan_requests (request_id, student_id, response_status)
        VALUES (p_request_id, v_student_id, o_status);
        LEAVE;
    END IF;
    
    -- Check for duplicate within time window
    SELECT COUNT(*) INTO v_duplicate_count
    FROM attendance
    WHERE student_id = v_student_id
    AND timestamp > DATE_SUB(NOW(), INTERVAL v_duplicate_window MINUTE)
    AND status IN ('present', 'late');
    
    IF v_duplicate_count > 0 THEN
        SET o_status = 'duplicate';
        SET o_student_id = v_student_id;
        SET o_student_name = v_student_name;
        
        INSERT INTO attendance (student_id, status, source_device, session_id)
        VALUES (v_student_id, o_status, p_source_device, p_session_id);
        
        INSERT INTO scan_requests (request_id, student_id, response_status)
        VALUES (p_request_id, v_student_id, o_status);
        LEAVE;
    END IF;
    
    -- Record attendance as present
    SET o_status = 'present';
    SET o_student_id = v_student_id;
    SET o_student_name = v_student_name;
    
    INSERT INTO attendance (student_id, status, source_device, session_id)
    VALUES (v_student_id, o_status, p_source_device, p_session_id);
    
    INSERT INTO scan_requests (request_id, student_id, response_status)
    VALUES (p_request_id, v_student_id, o_status);
END//
DELIMITER ;

-- Grant permissions (adjust user/role as needed)
-- CREATE USER 'att_app'@'%' IDENTIFIED BY 'secure_password';
-- GRANT SELECT, INSERT, UPDATE ON attendance.students TO 'att_app'@'%';
-- GRANT SELECT, INSERT ON attendance.attendance TO 'att_app'@'%';
-- GRANT SELECT, INSERT ON attendance.scan_requests TO 'att_app'@'%';
-- GRANT SELECT, INSERT ON attendance.audit_log TO 'att_app'@'%';
-- GRANT SELECT ON attendance.config TO 'att_app'@'%';
-- GRANT SELECT ON attendance.daily_attendance_summary TO 'att_app'@'%';
-- GRANT EXECUTE ON PROCEDURE attendance.record_attendance TO 'att_app'@'%';
