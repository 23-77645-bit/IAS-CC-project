"""
Attendance Management System - Backend API
FastAPI application with secure student onboarding, QR code generation, 
real-time classroom monitoring, and analytics.
"""

import os
import io
import time
import uuid
import logging
import json
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

# File handling
import pandas as pd
from fastapi import FastAPI, HTTPException, Depends, Request, status, Response, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Enum as SQLEnum, Text, BIGINT, text, DECIMAL
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
import qrcode
from PIL import Image
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import aiosmtplib
from passlib.context import CryptContext

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Prometheus metrics
REQUEST_COUNT = Counter('api_requests_total', 'Total API requests', ['method', 'endpoint', 'status'])
REQUEST_LATENCY = Histogram('api_request_latency_seconds', 'API request latency', buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0))
SCAN_SUCCESS = Counter('scans_success_total', 'Successful scans')
SCAN_FAILURE = Counter('scans_failure_total', 'Failed scans', ['reason'])
DB_CONNECTIONS = Gauge('db_connections_active', 'Active DB connections')

# Database configuration
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = int(os.getenv('DB_PORT', 3306))
DB_NAME = os.getenv('DB_NAME', 'attendance')
DB_USER = os.getenv('DB_USER', 'att_app')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'secure_password')
SECRET_KEY = os.getenv('SECRET_KEY', 'academic-demo-key-change-in-production')
LATE_THRESHOLD_MINUTES = int(os.getenv('LATE_THRESHOLD_MINUTES', '15'))
PASSWORD_CONTEXT = CryptContext(schemes=["bcrypt"], deprecated="auto")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# SQLAlchemy setup
engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=10, max_overflow=20)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class Teacher(Base):
    __tablename__ = 'teachers'
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255))
    active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Course(Base):
    __tablename__ = 'courses'
    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, nullable=False, index=True)
    course_code = Column(String(50), nullable=False, index=True)
    course_name = Column(String(255), nullable=False)
    section = Column(String(50))
    semester = Column(String(50))
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
    email_sent = Column(Boolean, default=False)
    email_sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class CourseEnrollment(Base):
    __tablename__ = 'course_enrollments'
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, nullable=False, index=True)
    student_id = Column(Integer, nullable=False, index=True)
    enrolled_at = Column(DateTime, default=datetime.utcnow)
    status = Column(SQLEnum('enrolled', 'dropped', 'completed'), default='enrolled')

class SessionModel(Base):
    __tablename__ = 'sessions'
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, nullable=False, index=True)
    session_code = Column(String(64), unique=True, nullable=False, index=True)
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=True)
    status = Column(SQLEnum('scheduled', 'active', 'closed', 'cancelled'), default='scheduled', index=True)
    late_threshold_minutes = Column(Integer, default=15)
    scan_window_minutes = Column(Integer, default=20)
    geo_fence_enabled = Column(Boolean, default=False)
    geo_fence_lat = Column(DECIMAL(10, 8), nullable=True)
    geo_fence_lng = Column(DECIMAL(11, 8), nullable=True)
    geo_fence_radius_meters = Column(Integer, default=100)
    created_at = Column(DateTime, default=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)

class Attendance(Base):
    __tablename__ = 'attendance'
    id = Column(BIGINT, primary_key=True, index=True)
    session_id = Column(Integer, nullable=False, index=True)
    student_id = Column(Integer, nullable=False, index=True)
    scan_time = Column(DateTime, default=datetime.utcnow, index=True)
    status = Column(SQLEnum('present', 'late', 'absent', 'duplicate', 'invalid', 'manual'), nullable=False, index=True)
    ip_address = Column(String(45))
    device_id = Column(String(64))
    user_agent = Column(String(255))
    latitude = Column(DECIMAL(10, 8), nullable=True)
    longitude = Column(DECIMAL(11, 8), nullable=True)
    notes = Column(Text)
    marked_by = Column(Integer, nullable=True)

class EmailLog(Base):
    __tablename__ = 'email_logs'
    id = Column(BIGINT, primary_key=True, index=True)
    recipient_email = Column(String(255), nullable=False, index=True)
    subject = Column(String(255))
    status = Column(SQLEnum('pending', 'sent', 'failed', 'bounced'), default='pending', index=True)
    error_message = Column(Text)
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

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
class StudentUploadResult(BaseModel):
    total_rows: int
    valid_count: int
    invalid_count: int
    duplicate_count: int
    valid_students: List[Dict[str, Any]]
    invalid_rows: List[Dict[str, Any]]

class EmailSendRequest(BaseModel):
    course_id: int
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    from_email: Optional[str] = None

class ScanRequestModel(BaseModel):
    qr_payload: str = Field(..., min_length=1, description="QR code payload")
    device_id: str = Field(default="unknown", description="Source device identifier")
    request_id: Optional[str] = None
    session_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class StudentInfo(BaseModel):
    id: int
    student_id: str
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

class SessionCreate(BaseModel):
    course_id: int
    late_threshold_minutes: Optional[int] = 15
    scan_window_minutes: Optional[int] = 20
    geo_fence_enabled: Optional[bool] = False
    geo_fence_lat: Optional[float] = None
    geo_fence_lng: Optional[float] = None
    geo_fence_radius_meters: Optional[int] = 100

class AttendanceRecord(BaseModel):
    student_id: int
    student_name: str
    status: str
    scan_time: Optional[str] = None

class SessionDashboard(BaseModel):
    session_id: int
    session_code: str
    course_id: int
    status: str
    start_time: str
    total_students: int
    present_count: int
    late_count: int
    absent_count: int
    attendance_records: List[AttendanceRecord]

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
    logger.info("Starting Attendance Management System API")
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        logger.info("Database connection verified")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
    yield
    logger.info("Shutting down Attendance Management System API")

app = FastAPI(
    title="Attendance Management System",
    description="API for secure student onboarding, QR code generation, real-time monitoring, and analytics",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:8000').split(',')
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
)

@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    REQUEST_LATENCY.observe(duration)
    REQUEST_COUNT.labels(method=request.method, endpoint=request.url.path, status=response.status_code).inc()
    return response

# Helper functions
def validate_email(email: str) -> bool:
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def generate_qr_token() -> str:
    return str(uuid.uuid4())

def generate_student_pdf(student_name: str, student_id: str, qr_token: str, base_url: str = "https://your-app.com") -> bytes:
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    p.setFont("Helvetica-Bold", 24)
    p.drawCentredString(width/2, height - 100, "Student ID Card")
    p.setFont("Helvetica", 16)
    p.drawCentredString(width/2, height - 150, f"Name: {student_name}")
    p.drawCentredString(width/2, height - 180, f"Student ID: {student_id}")
    qr_data = f"{base_url}/scan?token={qr_token}"
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(qr_data)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    qr_bytes = io.BytesIO()
    qr_img.save(qr_bytes, format='PNG')
    qr_bytes.seek(0)
    p.drawImage(qr_bytes, width/2 - 100, height - 400, width=200, height=200)
    p.setFont("Helvetica", 12)
    p.drawCentredString(width/2, height - 450, "Present this QR code at the start of class")
    p.setFont("Helvetica-Oblique", 10)
    p.drawCentredString(width/2, height - 470, "Security Warning: Do not share this image")
    p.save()
    buffer.seek(0)
    return buffer.getvalue()

async def send_email_with_attachment(smtp_host: str, smtp_port: int, smtp_user: str, smtp_password: str, from_email: str, to_email: str, subject: str, html_content: str, pdf_attachment: bytes, attachment_filename: str) -> bool:
    msg = MIMEMultipart()
    msg['From'] = from_email
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(html_content, 'html'))
    part = MIMEBase('application', 'octet-stream')
    part.set_payload(pdf_attachment)
    encoders.encode_base64(part)
    part.add_header('Content-Disposition', f'attachment; filename="{attachment_filename}"')
    msg.attach(part)
    try:
        await aiosmtplib.send(msg, hostname=smtp_host, port=smtp_port, username=smtp_user, password=smtp_password, start_tls=True)
        return True
    except Exception as e:
        logger.error(f"Email send failed: {e}")
        return False

def get_config_value(db: Session, key: str, default: str = None) -> str:
    config = db.query(Config).filter(Config.config_key == key).first()
    return config.config_value if config else default
