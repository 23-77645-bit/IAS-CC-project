-- Attendance Management System Database Schema
-- MySQL 8.0+
-- Production-ready with proper security and performance optimizations

-- Create database
CREATE DATABASE IF NOT EXISTS attendance 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

USE attendance;

-- Teachers/Users table
CREATE TABLE teachers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_active (active)
) ENGINE=InnoDB;

-- Courses table
CREATE TABLE courses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    teacher_id INT NOT NULL,
    course_code VARCHAR(50) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    section VARCHAR(50),
    semester VARCHAR(50),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    INDEX idx_teacher (teacher_id),
    INDEX idx_course_code (course_code),
    INDEX idx_active (active)
) ENGINE=InnoDB;

-- Students table (updated for secure token-based system)
CREATE TABLE students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id VARCHAR(50) NOT NULL,
    qr_token VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    program VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_student_id (student_id),
    INDEX idx_qr_token (qr_token),
    INDEX idx_email (email),
    INDEX idx_active (is_active)
) ENGINE=InnoDB;

-- Course enrollments table
CREATE TABLE course_enrollments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    student_id INT NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('enrolled', 'dropped', 'completed') DEFAULT 'enrolled',
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY unique_enrollment (course_id, student_id),
    INDEX idx_course (course_id),
    INDEX idx_student (student_id)
) ENGINE=InnoDB;

-- Sessions table (for class sessions)
CREATE TABLE sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    session_code VARCHAR(64) UNIQUE NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NULL,
    status ENUM('scheduled', 'active', 'closed', 'cancelled') DEFAULT 'scheduled',
    late_threshold_minutes INT DEFAULT 15,
    scan_window_minutes INT DEFAULT 20,
    geo_fence_enabled BOOLEAN DEFAULT FALSE,
    geo_fence_lat DECIMAL(10, 8),
    geo_fence_lng DECIMAL(11, 8),
    geo_fence_radius_meters INT DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_course (course_id),
    INDEX idx_status (status),
    INDEX idx_session_code (session_code),
    INDEX idx_start_time (start_time)
) ENGINE=InnoDB;

-- Attendance records table (updated)
CREATE TABLE attendance (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    student_id INT NOT NULL,
    scan_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('present', 'late', 'absent', 'duplicate', 'invalid', 'manual') NOT NULL,
    ip_address VARCHAR(45),
    device_id VARCHAR(64),
    user_agent VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    notes TEXT,
    marked_by INT,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (marked_by) REFERENCES teachers(id) ON DELETE SET NULL,
    INDEX idx_session_student (session_id, student_id),
    INDEX idx_scan_time (scan_time),
    INDEX idx_status (status),
    UNIQUE KEY unique_session_student (session_id, student_id)
) ENGINE=InnoDB;

-- Email logs table
CREATE TABLE email_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    status ENUM('pending', 'sent', 'failed', 'bounced') DEFAULT 'pending',
    error_message TEXT,
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_recipient (recipient_email),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
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
    performed_by INT,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    FOREIGN KEY (performed_by) REFERENCES teachers(id) ON DELETE SET NULL,
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
    ('max_retries', '3', 'Maximum retry attempts for failed scans'),
    ('smtp_host', 'smtp.gmail.com', 'Default SMTP host'),
    ('smtp_port', '587', 'Default SMTP port'),
    ('email_from_name', 'Attendance System', 'Default sender name');

-- Seed sample teacher data (password: admin123 - change in production!)
INSERT INTO teachers (email, name, password_hash, active) VALUES
    ('teacher@demo.edu', 'Demo Teacher', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzS3MebAJu', TRUE);

-- Seed sample course data
INSERT INTO courses (teacher_id, course_code, course_name, section, semester, active) VALUES
    (1, 'CS101', 'Introduction to Computer Science', 'Section A', 'Fall 2024', TRUE),
    (1, 'CS201', 'Data Structures', 'Section B', 'Fall 2024', TRUE);

-- Seed sample student data
INSERT INTO students (student_id, qr_token, name, email, program, is_active) VALUES
    ('STU001', UUID(), 'Alice Johnson', 'alice@student.edu', 'Computer Science', TRUE),
    ('STU002', UUID(), 'Bob Smith', 'bob@student.edu', 'Engineering', TRUE),
    ('STU003', UUID(), 'Carol Williams', 'carol@student.edu', 'Mathematics', TRUE),
    ('STU004', UUID(), 'David Brown', 'david@student.edu', 'Physics', TRUE),
    ('STU005', UUID(), 'Eve Davis', 'eve@student.edu', 'Chemistry', TRUE);

-- Seed sample enrollments
INSERT INTO course_enrollments (course_id, student_id, status) VALUES
    (1, 1, 'enrolled'), (1, 2, 'enrolled'), (1, 3, 'enrolled'), (1, 4, 'enrolled'), (1, 5, 'enrolled'),
    (2, 1, 'enrolled'), (2, 2, 'enrolled'), (2, 3, 'enrolled');

-- Create view for daily attendance summary
CREATE VIEW daily_attendance_summary AS
SELECT 
    DATE(a.scan_time) as attendance_date,
    COUNT(DISTINCT a.student_id) as total_students,
    SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
    SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count,
    SUM(CASE WHEN a.status = 'duplicate' THEN 1 ELSE 0 END) as duplicate_count,
    SUM(CASE WHEN a.status = 'invalid' THEN 1 ELSE 0 END) as invalid_count
FROM attendance a
GROUP BY DATE(a.scan_time)
ORDER BY attendance_date DESC;

-- Create view for session attendance summary
CREATE VIEW session_attendance_summary AS
SELECT 
    s.id as session_id,
    s.session_code,
    s.course_id,
    c.course_code,
    s.start_time,
    s.end_time,
    s.status,
    COUNT(DISTINCT a.student_id) as total_scanned,
    SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) as attended,
    SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count,
    SUM(CASE WHEN a.status = 'duplicate' THEN 1 ELSE 0 END) as duplicate_count
FROM sessions s
LEFT JOIN courses c ON c.id = s.course_id
LEFT JOIN attendance a ON a.session_id = s.id
GROUP BY s.id, s.session_code, s.course_id, c.course_code, s.start_time, s.end_time, s.status
ORDER BY s.start_time DESC;
