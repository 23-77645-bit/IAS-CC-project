"""
Attendance Management System - Backend API
FastAPI application for processing QR code scans and recording attendance.
"""

import os
import time
import uuid
import logging
from datetime import datetime, timedelta
from typing import Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Enum, Text, BIGINT, JSON
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

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# SQLAlchemy setup
engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=10, max_overflow=20)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# Database Models
class Student(Base):
    __tablename__ = 'students'
    
    id = Column(Integer, primary_key=True, index=True)
    qr_id = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    program = Column(String(100))
    active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Attendance(Base):
    __tablename__ = 'attendance'
    
    id = Column(BIGINT, primary_key=True, index=True)
    student_id = Column(Integer, nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    status = Column(Enum('present', 'late', 'duplicate', 'invalid'), nullable=False, index=True)
    source_device = Column(String(64))
    session_id = Column(String(64), index=True)
    notes = Column(Text)


class ScanRequest(Base):
    __tablename__ = 'scan_requests'
    
    id = Column(BIGINT, primary_key=True, index=True)
    request_id = Column(String(64), unique=True, nullable=False, index=True)
    student_id = Column(Integer, nullable=False)
    processed_at = Column(DateTime, default=datetime.utcnow, index=True)
    response_status = Column(String(32))


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


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        DB_CONNECTIONS.inc()
        yield db
    finally:
        db.close()
        DB_CONNECTIONS.dec()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Attendance Management System API")
    # Verify database connection
    try:
        db = SessionLocal()
        db.execute("SELECT 1")
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    """
    if 'signature' not in data:
        return True  # No signature required
    
    # Implement signature validation logic here
    # This is a placeholder for actual cryptographic verification
    try:
        signature = data.get('signature')
        payload = data.get('payload')
        
        # Add your signature verification logic here
        # For example, verify with public key
        
        return True
    except Exception as e:
        logger.error(f"Signature validation failed: {e}")
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
        db.execute("SELECT 1")
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
    student = db.query(Student).filter(Student.qr_id == qr_id).first()
    
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
    if not student.active:
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
        Attendance.timestamp > datetime.utcnow() - duplicate_window,
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
    
    # Record attendance as present
    # TODO: Add late threshold logic based on session start time
    attendance_record = Attendance(
        student_id=student.id,
        status='present',
        source_device=request_data.device_id,
        session_id=request_data.session_id
    )
    db.add(attendance_record)
    
    scan_record = ScanRequest(
        request_id=request_id,
        student_id=student.id,
        response_status='present'
    )
    db.add(scan_record)
    db.commit()
    
    SCAN_SUCCESS.inc()
    logger.info(f"Attendance recorded for student {student.id}: {student.name}")
    
    return ScanResponseModel(
        success=True,
        student=StudentInfo(id=student.id, name=student.name, program=student.program),
        status="present",
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
        Attendance.timestamp > cutoff_date
    ).order_by(Attendance.timestamp.desc()).all()
    
    return {
        "student": StudentInfo(id=student.id, name=student.name, program=student.program),
        "attendance": [
            {
                "id": r.id,
                "timestamp": r.timestamp.isoformat() + "Z",
                "status": r.status,
                "source_device": r.source_device
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
        func.DATE(Attendance.timestamp) == target_date
    ).first()
    
    return {
        "date": target_date.isoformat(),
        "total_scans": summary.total or 0,
        "present": int(summary.present or 0),
        "late": int(summary.late or 0),
        "duplicate": int(summary.duplicate or 0),
        "invalid": int(summary.invalid or 0)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
