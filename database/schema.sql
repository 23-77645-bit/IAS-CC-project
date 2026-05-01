-- Attendance Management System Database Schema
-- MySQL 8.0+
-- Production-ready with proper security and performance optimizations

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
