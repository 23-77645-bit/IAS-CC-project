"""
Attendance Management System - Backend API
FastAPI application for processing QR code scans and recording attendance.
"""

import os
import time
import uuid
import logging
import hmac
import hashlib
from datetime import datetime, timedelta
from typing import Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, Request, status, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Enum, Text, BIGINT, JSON, text, ForeignKey, UniqueConstraint, Numeric
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
import pymysql
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend
import base64
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Prometheus metrics
REQUEST_COUNT = Counter(
    'api_requests_total',
    'Total API requests',
    ['method', 'endpoint', 'status']
)
REQUEST_LATENCY = Histogram(
    'api_request_latency_seconds',
    'API request latency',
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0)
)
SCAN_SUCCESS = Counter('scans_success_total', 'Successful scans')
SCAN_FAILURE = Counter('scans_failure_total', 'Failed scans', ['reason'])
DB_CONNECTIONS = Gauge('db_connections_active', 'Active DB connections')

# Database configuration
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = int(os.getenv('DB_PORT', 3306))
DB_NAME = os.getenv('DB_NAME', 'attendance')
DB_USER = os.getenv('DB_USER', 'att_app')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'secure_password')

# Security configuration
SECRET_KEY = os.getenv('SECRET_KEY', 'academic-demo-key-change-in-production')
LATE_THRESHOLD_MINUTES = int(os.getenv('LATE_THRESHOLD_MINUTES', '15'))

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# SQLAlchemy setup
engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=10, max_overflow=20)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# Database Models - matching schema.sql exactly
class Teacher(Base):
    __tablename__ = 'teachers'
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255))
    active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Student(Base):
    __tablename__ = 'students'
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(50), nullable=False, index=True)
    qr_token = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), index=True)
    program = Column(String(100))
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Attendance(Base):
    __tablename__ = 'attendance'
    
    id = Column(BIGINT, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey('sessions.id'), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False, index=True)
    scan_time = Column(DateTime, default=datetime.utcnow, index=True)
    status = Column(Enum('present', 'late', 'absent', 'duplicate', 'invalid', 'manual'), nullable=False, index=True)
    ip_address = Column(String(45))
    device_id = Column(String(64))
    latitude = Column(Numeric(10, 8))
    longitude = Column(Numeric(11, 8))
    notes = Column(Text)
    marked_by = Column(Integer, ForeignKey('teachers.id'))


class Course(Base):
    __tablename__ = 'courses'
    
    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey('teachers.id'), nullable=False, index=True)
    course_code = Column(String(50), nullable=False, index=True)
    course_name = Column(String(255), nullable=False)
    section = Column(String(50))
    semester = Column(String(50))
    active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CourseEnrollment(Base):
    __tablename__ = 'course_enrollments'
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey('courses.id'), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False, index=True)
    enrolled_at = Column(DateTime, default=datetime.utcnow)
    status = Column(Enum('enrolled', 'dropped', 'completed'), default='enrolled')
    __table_args__ = (UniqueConstraint('course_id', 'student_id', name='unique_enrollment'),)


class Session(Base):
    __tablename__ = 'sessions'
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey('courses.id'), nullable=False, index=True)
    session_code = Column(String(64), unique=True, nullable=False, index=True)
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, index=True)
    status = Column(Enum('scheduled', 'active', 'closed', 'cancelled'), default='scheduled', index=True)
    late_threshold_minutes = Column(Integer, default=15)
    scan_window_minutes = Column(Integer, default=20)
    geo_fence_enabled = Column(Boolean, default=False)
    geo_fence_lat = Column(Numeric(10, 8))
    geo_fence_lng = Column(Numeric(11, 8))
    geo_fence_radius_meters = Column(Integer, default=100)
    created_at = Column(DateTime, default=datetime.utcnow)
    closed_at = Column(DateTime)


class ScanRequest(Base):
    __tablename__ = 'scan_requests'
    
    id = Column(BIGINT, primary_key=True, index=True)
    request_id = Column(String(64), unique=True, nullable=False, index=True)
    student_id = Column(Integer, nullable=False)
    processed_at = Column(DateTime, default=datetime.utcnow, index=True)
    response_status = Column(String(32))


class AuditLog(Base):
    __tablename__ = 'audit_log'
    
    id = Column(BIGINT, primary_key=True, index=True)
    action = Column(String(64), nullable=False)
    entity_type = Column(String(32))
    entity_id = Column(BIGINT)
    old_value = Column(JSON)
    new_value = Column(JSON)
    performed_by = Column(Integer, ForeignKey('teachers.id'))
    performed_at = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String(45))


class Config(Base):
    __tablename__ = 'config'
    
    id = Column(Integer, primary_key=True, index=True)
    config_key = Column(String(64), unique=True, nullable=False)
    config_value = Column(Text)
    description = Column(String(255))


# Pydantic models for API
class ScanRequestModel(BaseModel):
    qr_payload: str = Field(..., min_length=1, description="QR code payload")
    device_id: str = Field(default="unknown", description="Source device identifier")
    request_id: Optional[str] = None
    session_id: Optional[str] = None


class StudentInfo(BaseModel):
    id: int
    name: str
    program: Optional[str] = None


class ScanResponseModel(BaseModel):
    success: bool
    student: Optional[StudentInfo] = None
    status: str
    reason_code: str
    timestamp: str


class HealthResponse(BaseModel):
    status: str
    database: str
    timestamp: str


# Pydantic models for CRUD operations
class CourseCreate(BaseModel):
    name: str
    code: str
    semester: Optional[str] = None
    description: Optional[str] = None

class CourseOut(BaseModel):
    id: int
    name: str
    code: str
    teacher_id: int
    semester: Optional[str] = None
    description: Optional[str] = None
    
    class Config:
        from_attributes = True

class StudentCreate(BaseModel):
    student_id: str
    name: str
    email: str
    program: Optional[str] = None

class StudentOut(BaseModel):
    id: int
    student_id: str
    name: str
    email: str
    program: Optional[str] = None
    qr_token: str
    active: bool = True
    
    class Config:
        from_attributes = True

class SessionCreate(BaseModel):
    course_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    geo_lat: Optional[float] = None
    geo_lng: Optional[float] = None
    geo_radius_meters: Optional[int] = None

class SessionOut(BaseModel):
    id: int
    course_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    status: str
    geo_lat: Optional[float] = None
    geo_lng: Optional[float] = None
    geo_radius_meters: Optional[int] = None
    
    class Config:
        from_attributes = True


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        DB_CONNECTIONS.inc()
        yield db
    finally:
        db.close()
        DB_CONNECTIONS.dec()


# Mock authentication for teacher (in production, use JWT tokens)
async def get_current_teacher(request: Request):
    """
    Mock authentication - in production, validate JWT token from Authorization header.
    For demo purposes, we accept a teacher_id from header or use default.
    """
    teacher_id = request.headers.get("X-Teacher-ID", "1")
    # In production, validate token and fetch teacher from database
    return {"id": int(teacher_id), "name": f"Teacher {teacher_id}"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Attendance Management System API")
    # Verify database connection
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        logger.info("Database connection verified")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
    yield
    # Shutdown
    logger.info("Shutting down Attendance Management System API")


app = FastAPI(
    title="Attendance Management System",
    description="API for processing QR code scans and recording attendance",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
# For academic/demo purposes, allow all origins
# In production, restrict to specific domains
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:8000').split(',')

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
)


# Middleware for metrics
@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    
    duration = time.time() - start_time
    REQUEST_LATENCY.observe(duration)
    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    ).inc()
    
    return response


# Helper functions
def decode_qr_payload(qr_payload: str) -> dict:
    """
    Decode and validate QR code payload.
    Supports both plain text and signed payloads.
    """
    try:
        # Try to parse as JSON
        data = json.loads(qr_payload)
        return data
    except json.JSONDecodeError:
        # Plain text QR code (assumed to be student QR ID)
        return {"qr_id": qr_payload}


def validate_qr_signature(data: dict) -> bool:
    """
    Validate QR code signature if present.
    Returns True if no signature required or signature is valid.
    Uses HMAC-SHA256 for academic demonstration purposes.
    """
    if 'signature' not in data:
        # For academic purposes, accept unsigned QR codes but log it
        logger.info("QR code without signature - accepting for demo")
        return True
    
    try:
        signature = data.get('signature')
        # Remove signature from payload for hashing
        payload_data = {k: v for k, v in data.items() if k != 'signature'}
        payload_str = json.dumps(payload_data, sort_keys=True)
        
        # Generate expected signature using HMAC-SHA256
        expected_signature = hmac.new(
            SECRET_KEY.encode('utf-8'),
            payload_str.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        # Constant-time comparison to prevent timing attacks
        is_valid = hmac.compare_digest(signature, expected_signature)
        
        if not is_valid:
            logger.warning(f"Invalid signature detected. Expected: {expected_signature[:16]}..., Got: {signature[:16]}...")
            SCAN_FAILURE.labels(reason="invalid_signature").inc()
        
        return is_valid
        
    except Exception as e:
        logger.error(f"Signature validation error: {e}")
        SCAN_FAILURE.labels(reason="signature_error").inc()
        return False


def get_config_value(db: Session, key: str, default: str = None) -> str:
    """Get configuration value from database."""
    config = db.query(Config).filter(Config.config_key == key).first()
    return config.config_value if config else default


# API Endpoints
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for monitoring and load balancers."""
    db_status = "healthy"
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    return HealthResponse(
        status="healthy" if db_status == "healthy" else "degraded",
        database=db_status,
        timestamp=datetime.utcnow().isoformat() + "Z"
    )


@app.get("/metrics")
async def metrics_endpoint():
    """Prometheus metrics endpoint."""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/scan", response_model=ScanResponseModel)
async def scan_qr(
    request_data: ScanRequestModel,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Process a QR code scan and record attendance.
    
    This endpoint:
    1. Decodes and validates the QR payload
    2. Checks for idempotency (prevents duplicate processing)
    3. Looks up the student
    4. Applies attendance rules (late threshold, duplicate window)
    5. Records the attendance transaction
    """
    logger.info(f"Processing scan request: {request_data.request_id or 'no-id'}")
    
    # Generate request ID if not provided (for idempotency)
    request_id = request_data.request_id or str(uuid.uuid4())
    
    # Decode QR payload
    try:
        qr_data = decode_qr_payload(request_data.qr_payload)
    except Exception as e:
        SCAN_FAILURE.labels(reason="invalid_format").inc()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid QR code format"
        )
    
    # Validate signature if present
    if not validate_qr_signature(qr_data):
        SCAN_FAILURE.labels(reason="invalid_signature").inc()
        return ScanResponseModel(
            success=False,
            student=None,
            status="invalid",
            reason_code="INVALID_SIGNATURE",
            timestamp=datetime.utcnow().isoformat() + "Z"
        )
    
    # Extract QR ID
    qr_id = qr_data.get('qr_id') or request_data.qr_payload
    
    # Check idempotency - has this request been processed before?
    existing_request = db.query(ScanRequest).filter(
        ScanRequest.request_id == request_id
    ).first()
    
    if existing_request:
        # Return cached response
        student = db.query(Student).filter(Student.id == existing_request.student_id).first()
        SCAN_SUCCESS.inc() if existing_request.response_status in ['present', 'late'] else SCAN_FAILURE.labels(reason="duplicate_request").inc()
        
        return ScanResponseModel(
            success=existing_request.response_status in ['present', 'late'],
            student=StudentInfo(id=student.id, name=student.name, program=student.program) if student else None,
            status=existing_request.response_status,
            reason_code="CACHED_RESPONSE",
            timestamp=datetime.utcnow().isoformat() + "Z"
        )
    
    # Lookup student by QR ID
    student = db.query(Student).filter(Student.qr_token == qr_id).first()
    
    if not student:
        # Invalid QR - student not found
        scan_record = ScanRequest(
            request_id=request_id,
            student_id=0,
            response_status='invalid'
        )
        db.add(scan_record)
        db.commit()
        
        SCAN_FAILURE.labels(reason="student_not_found").inc()
        return ScanResponseModel(
            success=False,
            student=None,
            status="invalid",
            reason_code="STUDENT_NOT_FOUND",
            timestamp=datetime.utcnow().isoformat() + "Z"
        )
    
    # Check if student is active
    if not student.is_active:
        scan_record = ScanRequest(
            request_id=request_id,
            student_id=student.id,
            response_status='invalid'
        )
        db.add(scan_record)
        db.commit()
        
        SCAN_FAILURE.labels(reason="student_inactive").inc()
        return ScanResponseModel(
            success=False,
            student=StudentInfo(id=student.id, name=student.name, program=student.program),
            status="invalid",
            reason_code="STUDENT_INACTIVE",
            timestamp=datetime.utcnow().isoformat() + "Z"
        )
    
    # Check for duplicate within time window
    duplicate_window_minutes = int(get_config_value(db, 'duplicate_window_minutes', '5'))
    duplicate_window = timedelta(minutes=duplicate_window_minutes)
    
    recent_attendance = db.query(Attendance).filter(
        Attendance.student_id == student.id,
        Attendance.scan_time > datetime.utcnow() - duplicate_window,
        Attendance.status.in_(['present', 'late'])
    ).first()
    
    if recent_attendance:
        # Duplicate scan within window
        attendance_record = Attendance(
            student_id=student.id,
            status='duplicate',
            source_device=request_data.device_id,
            session_id=request_data.session_id,
            notes=f"Duplicate scan within {duplicate_window_minutes} minutes"
        )
        db.add(attendance_record)
        
        scan_record = ScanRequest(
            request_id=request_id,
            student_id=student.id,
            response_status='duplicate'
        )
        db.add(scan_record)
        db.commit()
        
        SCAN_FAILURE.labels(reason="duplicate_scan").inc()
        return ScanResponseModel(
            success=False,
            student=StudentInfo(id=student.id, name=student.name, program=student.program),
            status="duplicate",
            reason_code="DUPLICATE_WITHIN_WINDOW",
            timestamp=datetime.utcnow().isoformat() + "Z"
        )
    
    # Determine attendance status (present or late)
    # Late threshold is configurable via environment variable
    current_time = datetime.utcnow()
    
    # Check if session has a scheduled start time in the future/past
    # For academic demo, we'll use a simple heuristic:
    # If scan is more than LATE_THRESHOLD_MINUTES after the hour, mark as late
    # In production, this would compare against actual session start times
    minutes_past_hour = current_time.minute + (current_time.second / 60.0)
    
    if minutes_past_hour > LATE_THRESHOLD_MINUTES:
        status = 'late'
        notes = f"Scanned {int(minutes_past_hour)} minutes past the hour (threshold: {LATE_THRESHOLD_MINUTES} min)"
        logger.info(f"Student {student.id} marked as LATE")
    else:
        status = 'present'
        notes = None
        logger.info(f"Student {student.id} marked as PRESENT")
    
    attendance_record = Attendance(
        student_id=student.id,
        status=status,
        source_device=request_data.device_id,
        session_id=request_data.session_id,
        notes=notes
    )
    db.add(attendance_record)
    
    scan_record = ScanRequest(
        request_id=request_id,
        student_id=student.id,
        response_status=status
    )
    db.add(scan_record)
    db.commit()
    
    SCAN_SUCCESS.inc()
    logger.info(f"Attendance recorded for student {student.id}: {student.name} (status: {status})")
    
    return ScanResponseModel(
        success=True,
        student=StudentInfo(id=student.id, name=student.name, program=student.program),
        status=status,
        reason_code="SUCCESS",
        timestamp=datetime.utcnow().isoformat() + "Z"
    )


@app.get("/students/{student_id}/attendance")
async def get_student_attendance(
    student_id: int,
    days: int = 7,
    db: Session = Depends(get_db)
):
    """Get attendance history for a specific student."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    records = db.query(Attendance).filter(
        Attendance.student_id == student_id,
        Attendance.scan_time > cutoff_date
    ).order_by(Attendance.scan_time.desc()).all()
    
    return {
        "student": StudentInfo(id=student.id, name=student.name, program=student.program),
        "attendance": [
            {
                "id": r.id,
                "timestamp": r.scan_time.isoformat() + "Z",
                "status": r.status,
                "source_device": r.device_id or ""
            }
            for r in records
        ]
    }


@app.get("/attendance/summary")
async def get_attendance_summary(
    date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get attendance summary for a specific date or today."""
    if date:
        try:
            target_date = datetime.fromisoformat(date).date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        target_date = datetime.utcnow().date()
    
    # Query summary for the date
    from sqlalchemy import func
    summary = db.query(
        func.COUNT(Attendance.id).label('total'),
        func.SUM(func.IF(Attendance.status == 'present', 1, 0)).label('present'),
        func.SUM(func.IF(Attendance.status == 'late', 1, 0)).label('late'),
        func.SUM(func.IF(Attendance.status == 'duplicate', 1, 0)).label('duplicate'),
        func.SUM(func.IF(Attendance.status == 'invalid', 1, 0)).label('invalid')
    ).filter(
        func.DATE(Attendance.scan_time) == target_date
    ).first()
    
    return {
        "date": target_date.isoformat(),
        "total_scans": summary.total or 0,
        "present": int(summary.present or 0),
        "late": int(summary.late or 0),
        "duplicate": int(summary.duplicate or 0),
        "invalid": int(summary.invalid or 0)
    }


# ==================== TEACHER DASHBOARD ENDPOINTS ====================

@app.get("/teacher/dashboard/summary", tags=["Dashboard"])
async def get_teacher_dashboard_summary(
    date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_teacher)
):
    """Get attendance summary for teacher's courses on a specific date."""
    if date:
        try:
            target_date = datetime.fromisoformat(date).date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        target_date = datetime.utcnow().date()
    
    from sqlalchemy import func
    
    # Get all sessions for teacher's courses on this date
    session_ids = db.query(Session.id).join(Course).filter(
        Course.teacher_id == current_user["id"],
        func.DATE(Session.start_time) == target_date
    ).all()
    session_ids = [s[0] for s in session_ids]
    
    # Count enrolled students in teacher's courses
    total_students = db.query(func.COUNT(func.DISTINCT(CourseEnrollment.student_id))).join(
        Course, CourseEnrollment.course_id == Course.id
    ).filter(
        Course.teacher_id == current_user["id"],
        CourseEnrollment.status == 'enrolled'
    ).scalar() or 0
    
    if not session_ids:
        return {
            "date": target_date.isoformat(),
            "total_students": total_students,
            "present": 0,
            "late": 0,
            "absent": total_students,
            "percentage": 0
        }
    
    # Count attendance by status
    summary = db.query(
        func.SUM(func.IF(Attendance.status == 'present', 1, 0)).label('present'),
        func.SUM(func.IF(Attendance.status == 'late', 1, 0)).label('late'),
        func.SUM(func.IF(Attendance.status == 'absent', 1, 0)).label('absent'),
        func.SUM(func.IF(Attendance.status == 'manual', 1, 0)).label('manual'),
    ).filter(
        Attendance.session_id.in_(session_ids)
    ).first()
    
    present = int(summary.present or 0)
    late = int(summary.late or 0)
    marked = present + late
    absent = total_students - marked
    
    return {
        "date": target_date.isoformat(),
        "total_students": total_students,
        "present": present,
        "late": late,
        "absent": absent,
        "percentage": round(((present + late) / total_students * 100) if total_students > 0 else 0)
    }


@app.get("/teacher/students", tags=["Students"])
async def get_students(
    course_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_teacher)
):
    """Get students enrolled in teacher's courses with optional filtering."""
    query = db.query(Student).join(CourseEnrollment).join(Course).filter(
        Course.teacher_id == current_user["id"],
        CourseEnrollment.status == 'enrolled',
        Student.is_active == True
    )
    
    if course_id:
        query = query.filter(CourseEnrollment.course_id == course_id)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Student.name.like(search_term)) | 
            (Student.student_id.like(search_term)) |
            (Student.email.like(search_term))
        )
    
    students = query.all()
    return [{
        "id": s.id,
        "student_id": s.student_id,
        "name": s.name,
        "email": s.email,
        "program": s.program,
        "qr_token": s.qr_token,
        "active": s.is_active
    } for s in students]


@app.get("/teacher/attendance/today", tags=["Attendance"])
async def get_today_attendance(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_teacher)
):
    """Get today's attendance records for teacher's courses."""
    today = datetime.utcnow().date()
    
    # Get today's sessions
    sessions = db.query(Session).join(Course).filter(
        Course.teacher_id == current_user["id"],
        func.DATE(Session.start_time) == today
    ).all()
    
    session_ids = [s.id for s in sessions]
    
    if not session_ids:
        return []
    
    # Get attendance records
    records = db.query(Attendance, Student).join(
        Student, Attendance.student_id == Student.id
    ).filter(
        Attendance.session_id.in_(session_ids)
    ).all()
    
    return [{
        "id": r.Attendance.id,
        "student_id": r.Student.student_id,
        "student_name": r.Student.name,
        "status": r.Attendance.status,
        "scan_time": r.Attendance.scan_time.isoformat() if r.Attendance.scan_time else None,
        "note": r.Attendance.notes or ""
    } for r in records]


@app.post("/teacher/attendance/mark", tags=["Attendance"])
async def mark_attendance_manual(
    request_data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_teacher)
):
    """Manually mark or override attendance for a student."""
    student_id = request_data.get("student_id")
    status = request_data.get("status")
    session_id = request_data.get("session_id")
    note = request_data.get("note", "")
    
    if not all([student_id, status, session_id]):
        raise HTTPException(status_code=400, detail="Missing required fields: student_id, session_id, status")
    
    if status not in ['present', 'late', 'absent', 'manual']:
        raise HTTPException(status_code=400, detail="Invalid status. Must be: present, late, absent, or manual")
    
    # Verify session belongs to teacher
    session = db.query(Session).join(Course).filter(
        Session.id == session_id,
        Course.teacher_id == current_user["id"]
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check if attendance already exists
    existing = db.query(Attendance).filter(
        Attendance.session_id == session_id,
        Attendance.student_id == student_id
    ).first()
    
    if existing:
        existing.status = status
        existing.notes = note
        existing.marked_by = current_user["id"]
        record_id = existing.id
    else:
        new_record = Attendance(
            session_id=session_id,
            student_id=student_id,
            status=status,
            notes=note,
            marked_by=current_user["id"],
            scan_time=datetime.utcnow()
        )
        db.add(new_record)
        db.commit()
        db.refresh(new_record)
        record_id = new_record.id
    
    # Log audit
    audit = AuditLog(
        action="MANUAL_ATTENDANCE",
        entity_type="attendance",
        entity_id=record_id,
        performed_by=current_user["id"],
        new_value={"student_id": student_id, "status": status, "note": note}
    )
    db.add(audit)
    db.commit()
    
    return {"success": True, "message": "Attendance marked successfully"}


@app.get("/teacher/attendance/export", tags=["Attendance"])
async def export_attendance_csv(
    date: Optional[str] = None,
    course_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_teacher)
):
    """Export attendance data as CSV."""
    import csv
    import io
    
    if date:
        try:
            target_date = datetime.fromisoformat(date).date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")
    else:
        target_date = datetime.utcnow().date()
    
    # Build query
    query = db.query(
        Student.student_id,
        Student.name,
        Student.program,
        Student.email,
        Attendance.status,
        Attendance.scan_time,
        Attendance.notes,
        Course.course_code,
        Session.session_code
    ).join(
        CourseEnrollment, Student.id == CourseEnrollment.student_id
    ).join(
        Course, CourseEnrollment.course_id == Course.id
    ).join(
        Session, Session.course_id == Course.id
    ).join(
        Attendance, (Attendance.session_id == Session.id) & (Attendance.student_id == Student.id)
    ).filter(
        Course.teacher_id == current_user["id"],
        func.DATE(Session.start_time) == target_date
    )
    
    if course_id:
        query = query.filter(Course.id == course_id)
    
    records = query.all()
    
    # Generate CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Course', 'Session', 'Student ID', 'Name', 'Program', 'Email', 'Status', 'Timestamp', 'Notes'])
    
    for r in records:
        writer.writerow([
            r.course_code, r.session_code, r.student_id, r.name, r.program, r.email,
            r.status, r.scan_time.isoformat() if r.scan_time else '', r.notes or ''
        ])
    
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=attendance-{target_date}.csv"}
    )


# ==================== CRUD OPERATIONS ====================

# --- Course CRUD ---
@app.post("/teacher/courses", tags=["Courses"])
async def create_course(course: CourseCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_teacher)):
    """Create a new course"""
    db_course = Course(
        course_code=course.code,
        course_name=course.name,
        teacher_id=current_user["id"],
        semester=course.semester,
    )
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    
    audit_log = AuditLog(
        action="CREATE_COURSE",
        entity_type="course",
        entity_id=db_course.id,
        performed_by=current_user["id"],
        new_value={"code": course.code, "name": course.name}
    )
    db.add(audit_log)
    db.commit()
    
    return {"message": "Course created successfully", "course": db_course}

@app.get("/teacher/courses", response_model=List[CourseOut], tags=["Courses"])
async def get_courses(db: Session = Depends(get_db), current_user: dict = Depends(get_current_teacher)):
    """Get all courses for the logged-in teacher"""
    courses = db.query(Course).filter(Course.teacher_id == current_user["id"]).all()
    return courses

@app.put("/teacher/courses/{course_id}", tags=["Courses"])
async def update_course(course_id: int, course_update: CourseCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_teacher)):
    """Update a course"""
    db_course = db.query(Course).filter(Course.id == course_id, Course.teacher_id == current_user["id"]).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    for key, value in course_update.dict().items():
        setattr(db_course, key, value)
    
    db.commit()
    db.refresh(db_course)
    return {"message": "Course updated", "course": db_course}

@app.delete("/teacher/courses/{course_id}", tags=["Courses"])
async def delete_course(course_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_teacher)):
    """Delete a course"""
    db_course = db.query(Course).filter(Course.id == course_id, Course.teacher_id == current_user["id"]).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    db.query(Session).filter(Session.course_id == course_id).delete()
    db.query(CourseEnrollment).filter(CourseEnrollment.course_id == course_id).delete()
    
    db.delete(db_course)
    db.commit()
    return {"message": "Course deleted"}

# --- Student CRUD ---
@app.post("/teacher/students", tags=["Students"])
async def create_student(student: StudentCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_teacher)):
    """Manually add a single student"""
    existing = db.query(Student).filter(Student.student_id == student.student_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Student ID already exists")
    
    qr_token = str(uuid.uuid4())
    db_student = Student(
        student_id=student.student_id,
        name=student.name,
        email=student.email,
        qr_token=qr_token
    )
    db.add(db_student)
    
    if student.course_id:
        enrollment = CourseEnrollment(student_id=db_student.id, course_id=student.course_id)
        db.add(enrollment)
    
    db.commit()
    db.refresh(db_student)
    return {"message": "Student added", "student": db_student}

@app.put("/teacher/students/{student_id}", tags=["Students"])
async def update_student(student_id: int, student_update: StudentCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_teacher)):
    """Update student details"""
    db_student = db.query(Student).filter(Student.id == student_id).first()
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if student_update.student_id != db_student.student_id:
        existing = db.query(Student).filter(Student.student_id == student_update.student_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="New Student ID already exists")
    
    for key, value in student_update.dict(exclude_unset=True).items():
        if key != 'course_id':
            setattr(db_student, key, value)
    
    if student_update.course_id:
        exists = db.query(CourseEnrollment).filter(
            CourseEnrollment.student_id == db_student.id,
            CourseEnrollment.course_id == student_update.course_id
        ).first()
        if not exists:
            db.add(CourseEnrollment(student_id=db_student.id, course_id=student_update.course_id))
    
    db.commit()
    db.refresh(db_student)
    return {"message": "Student updated", "student": db_student}

@app.delete("/teacher/students/{student_id}", tags=["Students"])
async def delete_student(student_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_teacher)):
    """Delete a student"""
    db_student = db.query(Student).filter(Student.id == student_id).first()
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    db.query(CourseEnrollment).filter(CourseEnrollment.student_id == student_id).delete()
    db.delete(db_student)
    db.commit()
    return {"message": "Student deleted"}

# --- Session CRUD ---
@app.put("/teacher/sessions/{session_id}", tags=["Sessions"])
async def update_session(session_id: int, session_update: SessionCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_teacher)):
    """Update a session"""
    db_session = db.query(Session).join(Course).filter(
        Session.id == session_id,
        Course.teacher_id == current_user["id"]
    ).first()
    
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    for key, value in session_update.dict(exclude_unset=True).items():
        setattr(db_session, key, value)
    
    db.commit()
    db.refresh(db_session)
    return {"message": "Session updated", "session": db_session}

@app.delete("/teacher/sessions/{session_id}", tags=["Sessions"])
async def delete_session(session_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_teacher)):
    """Delete a session"""
    db_session = db.query(Session).join(Course).filter(
        Session.id == session_id,
        Course.teacher_id == current_user["id"]
    ).first()
    
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    db.delete(db_session)
    db.commit()
    return {"message": "Session deleted"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
