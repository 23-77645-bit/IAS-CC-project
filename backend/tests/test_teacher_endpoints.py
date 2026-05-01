"""
Integration tests for Teacher Dashboard endpoints
"""
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime

def test_teacher_dashboard_summary(client):
    """Test GET /teacher/dashboard/summary endpoint"""
    with patch('main.SessionLocal') as mock_session:
        mock_db = MagicMock()
        mock_session.return_value = mock_db
        
        # Mock session query
        mock_db.query().join().filter().all.return_value = [(1,), (2,)]
        
        # Mock total students count
        mock_db.query().join().filter().scalar.return_value = 30
        
        # Mock attendance summary
        mock_summary = MagicMock(present=20, late=5, absent=0, manual=0)
        mock_db.query().filter().first.return_value = mock_summary
        
        response = client.get("/teacher/dashboard/summary", headers={"X-Teacher-ID": "1"})
        assert response.status_code == 200
        data = response.json()
        assert "total_students" in data
        assert "percentage" in data


def test_get_students(client):
    """Test GET /teacher/students endpoint"""
    with patch('main.SessionLocal') as mock_session:
        mock_db = MagicMock()
        mock_session.return_value = mock_db
        
        mock_student = MagicMock()
        mock_student.id = 1
        mock_student.student_id = "STU001"
        mock_student.name = "Test Student"
        mock_student.email = "test@uni.edu"
        mock_student.program = "CS"
        mock_student.qr_token = "abc123"
        mock_student.is_active = True
        
        mock_db.query().join().join().filter().all.return_value = [mock_student]
        
        response = client.get("/teacher/students", headers={"X-Teacher-ID": "1"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0


def test_mark_attendance_manual_new(client):
    """Test POST /teacher/attendance/mark - new record"""
    with patch('main.SessionLocal') as mock_session:
        mock_db = MagicMock()
        mock_session.return_value = mock_db
        
        # Mock session exists
        mock_session_obj = MagicMock(id=1)
        mock_db.query().join().filter().first.return_value = mock_session_obj
        
        # Mock no existing attendance
        mock_db.query().filter().first.return_value = None
        
        response = client.post(
            "/teacher/attendance/mark",
            headers={"X-Teacher-ID": "1"},
            json={"student_id": 1, "session_id": 1, "status": "present", "note": "Test"}
        )
        assert response.status_code == 200
        assert response.json()["success"] == True


def test_mark_attendance_manual_update(client):
    """Test POST /teacher/attendance/mark - update existing"""
    with patch('main.SessionLocal') as mock_session:
        mock_db = MagicMock()
        mock_session.return_value = mock_db
        
        # Mock session exists
        mock_session_obj = MagicMock(id=1)
        mock_db.query().join().filter().first.return_value = mock_session_obj
        
        # Mock existing attendance
        mock_existing = MagicMock(id=100, status="absent")
        mock_db.query().filter().first.return_value = mock_existing
        
        response = client.post(
            "/teacher/attendance/mark",
            headers={"X-Teacher-ID": "1"},
            json={"student_id": 1, "session_id": 1, "status": "present", "note": "Updated"}
        )
        assert response.status_code == 200
        assert response.json()["success"] == True


def test_mark_attendance_missing_fields(client):
    """Test POST /teacher/attendance/mark - missing fields"""
    response = client.post(
        "/teacher/attendance/mark",
        headers={"X-Teacher-ID": "1"},
        json={"student_id": 1}
    )
    assert response.status_code == 400


def test_mark_attendance_invalid_status(client):
    """Test POST /teacher/attendance/mark - invalid status"""
    with patch('main.SessionLocal') as mock_session:
        mock_db = MagicMock()
        mock_session.return_value = mock_db
        
        response = client.post(
            "/teacher/attendance/mark",
            headers={"X-Teacher-ID": "1"},
            json={"student_id": 1, "session_id": 1, "status": "invalid_status"}
        )
        assert response.status_code == 400


def test_get_courses(client):
    """Test GET /teacher/courses endpoint"""
    with patch('main.SessionLocal') as mock_session:
        mock_db = MagicMock()
        mock_session.return_value = mock_db
        
        mock_course = MagicMock()
        mock_course.id = 1
        mock_course.course_code = "CS101"
        mock_course.course_name = "Intro to CS"
        mock_course.teacher_id = 1
        mock_course.semester = "Fall 2024"
        
        mock_db.query().filter().all.return_value = [mock_course]
        
        response = client.get("/teacher/courses", headers={"X-Teacher-ID": "1"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
