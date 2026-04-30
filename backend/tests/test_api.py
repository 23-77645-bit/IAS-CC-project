"""
Unit tests for the Attendance Management System backend API.
"""

import pytest
import json
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient


# Mock database and imports before importing main
@pytest.fixture
def client():
    """Create test client with mocked database."""
    with patch('main.SessionLocal') as mock_session:
        # Setup mock database session
        mock_db = MagicMock()
        mock_session.return_value = mock_db
        
        # Import after mocking
        from main import app
        
        with TestClient(app) as test_client:
            yield test_client


class TestQRPayloadDecoding:
    """Tests for QR payload decoding functionality."""
    
    def test_decode_plain_text_qr(self):
        """Test decoding plain text QR code."""
        from main import decode_qr_payload
        
        result = decode_qr_payload("QR001-STU-2024")
        assert result == {"qr_id": "QR001-STU-2024"}
    
    def test_decode_json_qr(self):
        """Test decoding JSON QR code payload."""
        from main import decode_qr_payload
        
        qr_data = {
            "qr_id": "QR001-STU-2024",
            "student_name": "Alice Johnson"
        }
        result = decode_qr_payload(json.dumps(qr_data))
        assert result == qr_data
    
    def test_decode_invalid_json(self):
        """Test handling of invalid JSON."""
        from main import decode_qr_payload
        
        # Should fall back to treating as plain text
        result = decode_qr_payload("{invalid json}")
        assert result == {"qr_id": "{invalid json}"}


class TestSignatureValidation:
    """Tests for QR signature validation."""
    
    def test_validate_no_signature(self):
        """Test that payloads without signature pass validation."""
        from main import validate_qr_signature
        
        data = {"qr_id": "QR001-STU-2024"}
        assert validate_qr_signature(data) is True
    
    def test_validate_with_signature(self):
        """Test signature validation with invalid signature."""
        from main import validate_qr_signature
        
        data = {
            "qr_id": "QR001-STU-2024",
            "signature": "fake_signature"
        }
        # Should return False for invalid signature
        assert validate_qr_signature(data) is False
    
    def test_validate_with_valid_signature(self):
        """Test signature validation with valid HMAC signature."""
        from main import validate_qr_signature
        import hmac
        import hashlib
        import json
        import os
        
        qr_id = "QR001-STU-2024"
        payload_data = {"qr_id": qr_id}
        payload_str = json.dumps(payload_data, sort_keys=True)
        
        # Generate valid signature using same SECRET_KEY as in main.py
        secret_key = os.getenv('SECRET_KEY', 'academic-demo-secret-key-change-in-production')
        valid_signature = hmac.new(
            secret_key.encode('utf-8'),
            payload_str.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        data = {
            "qr_id": qr_id,
            "signature": valid_signature
        }
        # Should return True for valid signature
        assert validate_qr_signature(data) is True


class TestHealthEndpoint:
    """Tests for health check endpoint."""
    
    def test_health_check_success(self, client):
        """Test successful health check."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "database" in data
        assert "timestamp" in data


class TestScanEndpoint:
    """Tests for the scan endpoint."""
    
    def test_scan_valid_student(self, client):
        """Test scanning a valid student QR code."""
        # Mock student lookup
        mock_student = Mock()
        mock_student.id = 1
        mock_student.name = "Alice Johnson"
        mock_student.program = "Computer Science"
        mock_student.active = True
        
        # Setup mock query results
        client.app.dependency_overrides = {}
        
        with patch('main.SessionLocal') as mock_session:
            mock_db = MagicMock()
            mock_session.return_value = mock_db
            
            # Mock query chain properly for all calls
            mock_query = MagicMock()
            mock_filter = MagicMock()
            
            # Setup the side_effect to handle multiple query().filter().first() calls
            # Call 1: idempotency check (None)
            # Call 2: student lookup (mock_student)
            # Call 3: duplicate check (None)
            # Call 4: config lookup (None - use default)
            mock_filter.first.side_effect = [None, mock_student, None, None]
            mock_query.filter.return_value = mock_filter
            mock_db.query.return_value = mock_query
            
            response = client.post(
                "/scan",
                json={
                    "qr_payload": "QR001-STU-2024",
                    "device_id": "scanner-01"
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["status"] == "present"
            assert data["student"]["name"] == "Alice Johnson"
    
    def test_scan_student_not_found(self, client):
        """Test scanning invalid QR code (student not found)."""
        with patch('main.SessionLocal') as mock_session:
            mock_db = MagicMock()
            mock_session.return_value = mock_db
            
            # No existing request, no student found
            mock_db.query().filter().first.side_effect = [None, None]
            
            response = client.post(
                "/scan",
                json={
                    "qr_payload": "INVALID-QR-ID",
                    "device_id": "scanner-01"
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is False
            assert data["status"] == "invalid"
            assert data["reason_code"] == "STUDENT_NOT_FOUND"
    
    def test_scan_inactive_student(self, client):
        """Test scanning QR code of inactive student."""
        mock_student = Mock()
        mock_student.id = 1
        mock_student.name = "Bob Smith"
        mock_student.active = False
        
        with patch('main.SessionLocal') as mock_session:
            mock_db = MagicMock()
            mock_session.return_value = mock_db
            
            # No existing request, student found but inactive
            mock_db.query().filter().first.side_effect = [None, mock_student]
            
            response = client.post(
                "/scan",
                json={
                    "qr_payload": "QR002-STU-2024",
                    "device_id": "scanner-01"
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is False
            assert data["status"] == "invalid"
            assert data["reason_code"] == "STUDENT_INACTIVE"
    
    def test_scan_duplicate_within_window(self, client):
        """Test duplicate scan within time window."""
        mock_student = Mock()
        mock_student.id = 1
        mock_student.name = "Carol Williams"
        mock_student.active = True
        
        mock_recent_attendance = Mock()
        mock_recent_attendance.id = 100
        mock_recent_attendance.status = "present"
        
        with patch('main.SessionLocal') as mock_session:
            mock_db = MagicMock()
            mock_session.return_value = mock_db
            
            # No existing request, student found, recent attendance exists
            mock_db.query().filter().first.side_effect = [
                None,  # No existing scan request
                mock_student,  # Student found
                mock_recent_attendance,  # Recent attendance (duplicate)
            ]
            
            # Mock config value
            mock_config = Mock()
            mock_config.config_value = "5"
            mock_db.query().filter().first.return_value = mock_config
            
            response = client.post(
                "/scan",
                json={
                    "qr_payload": "QR003-STU-2024",
                    "device_id": "scanner-01"
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is False
            assert data["status"] == "duplicate"
            assert data["reason_code"] == "DUPLICATE_WITHIN_WINDOW"
    
    def test_scan_idempotency(self, client):
        """Test idempotent request handling."""
        mock_existing_request = Mock()
        mock_existing_request.student_id = 1
        mock_existing_request.response_status = "present"
        
        mock_student = Mock()
        mock_student.id = 1
        mock_student.name = "David Brown"
        mock_student.program = "Physics"
        
        with patch('main.SessionLocal') as mock_session:
            mock_db = MagicMock()
            mock_session.return_value = mock_db
            
            # Existing request found (idempotency)
            mock_db.query().filter().first.side_effect = [
                mock_existing_request,  # Existing scan request
                mock_student,  # Student lookup for response
            ]
            
            response = client.post(
                "/scan",
                json={
                    "qr_payload": "QR004-STU-2024",
                    "device_id": "scanner-01",
                    "request_id": "same-request-id-123"
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["status"] == "present"
            assert data["reason_code"] == "CACHED_RESPONSE"


class TestAttendanceSummaryEndpoint:
    """Tests for attendance summary endpoint."""
    
    def test_get_summary_today(self, client):
        """Test getting today's attendance summary."""
        with patch('main.SessionLocal') as mock_session:
            mock_db = MagicMock()
            mock_session.return_value = mock_db
            
            # Mock summary query result
            mock_summary = Mock()
            mock_summary.total = 50
            mock_summary.present = 45
            mock_summary.late = 3
            mock_summary.duplicate = 1
            mock_summary.invalid = 1
            mock_db.query().filter().first.return_value = mock_summary
            
            response = client.get("/attendance/summary")
            
            assert response.status_code == 200
            data = response.json()
            assert "date" in data
            assert data["total_scans"] == 50
            assert data["present"] == 45
    
    def test_get_summary_specific_date(self, client):
        """Test getting summary for a specific date."""
        with patch('main.SessionLocal') as mock_session:
            mock_db = MagicMock()
            mock_session.return_value = mock_db
            
            # Mock empty summary
            mock_summary = Mock()
            mock_summary.total = 0
            mock_summary.present = 0
            mock_summary.late = 0
            mock_summary.duplicate = 0
            mock_summary.invalid = 0
            mock_db.query().filter().first.return_value = mock_summary
            
            response = client.get("/attendance/summary?date=2024-01-15")
            
            assert response.status_code == 200
            data = response.json()
            assert data["date"] == "2024-01-15"
            assert data["total_scans"] == 0
    
    def test_get_summary_invalid_date(self, client):
        """Test error handling for invalid date format."""
        response = client.get("/attendance/summary?date=invalid-date")
        assert response.status_code == 400


class TestStudentAttendanceEndpoint:
    """Tests for student attendance history endpoint."""
    
    def test_get_student_attendance(self, client):
        """Test getting attendance history for a student."""
        mock_student = Mock()
        mock_student.id = 1
        mock_student.name = "Eve Davis"
        mock_student.program = "Chemistry"
        
        mock_attendance = Mock()
        mock_attendance.id = 1
        mock_attendance.timestamp = datetime.utcnow()
        mock_attendance.status = "present"
        mock_attendance.source_device = "scanner-01"
        
        with patch('main.SessionLocal') as mock_session:
            mock_db = MagicMock()
            mock_session.return_value = mock_db
            
            mock_db.query().filter().first.return_value = mock_student
            mock_db.query().filter().order_by().all.return_value = [mock_attendance]
            
            response = client.get("/students/1/attendance?days=7")
            
            assert response.status_code == 200
            data = response.json()
            assert "student" in data
            assert "attendance" in data
            assert data["student"]["name"] == "Eve Davis"
    
    def test_get_student_not_found(self, client):
        """Test error when student not found."""
        with patch('main.SessionLocal') as mock_session:
            mock_db = MagicMock()
            mock_session.return_value = mock_db
            mock_db.query().filter().first.return_value = None
            
            response = client.get("/students/999/attendance")
            
            assert response.status_code == 404


class TestMetricsEndpoint:
    """Tests for Prometheus metrics endpoint."""
    
    def test_metrics_endpoint(self, client):
        """Test metrics endpoint returns Prometheus format."""
        response = client.get("/metrics")
        assert response.status_code == 200
        assert "text/plain" in response.headers["content-type"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
