# Attendance Management System - Project Plan

## Overview
This document outlines the implementation plan for a containerized attendance management system with QR code scanning capabilities.

## Architecture Components
- **Frontend Container**: UI + QR scanner (React/Vue with camera access)
- **Backend Container**: Java/Python API for attendance processing
- **Database Container**: MySQL for persistent storage
- **CI/CD**: Jenkins pipeline for automated builds and deployments
- **Monitoring**: Prometheus + Grafana for observability

---

## Phase 1: Foundation & Requirements (Week 1)

### Business Rules
- [ ] Define scan frequency rules (one scan per session?)
- [ ] Set late arrival threshold
- [ ] Define duplicate scan handling
- [ ] Establish failure behavior for DB/API outages

### Data Model
```sql
-- students table
CREATE TABLE students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    qr_id VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    program VARCHAR(100),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- attendance table
CREATE TABLE attendance (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('present', 'late', 'duplicate', 'invalid') NOT NULL,
    source_device VARCHAR(64),
    FOREIGN KEY (student_id) REFERENCES students(id),
    INDEX idx_student_date (student_id, DATE(timestamp)),
    INDEX idx_qr_id (student_id)
);
```

### API Contracts
```
POST /scan
Request: { "qr_payload": "string", "device_id": "string" }
Response: { 
    "success": boolean,
    "student": { "id": int, "name": string },
    "status": "present|late|duplicate|invalid",
    "reason_code": "string",
    "timestamp": "ISO8601"
}
```

### Non-Functional Targets
- API response time: < 500ms (p95)
- Uptime target: 99.5%
- Scan throughput: 20 scans/minute/device
- Concurrent devices: 10+

---

## Phase 2: Core Runtime Services (Weeks 2-4)

### Frontend Implementation
- [ ] Camera integration with QR reader library
- [ ] Real-time feedback states:
  - Scanning animation
  - Success confirmation
  - Duplicate warning
  - Invalid QR error
  - Server error with retry option
- [ ] Offline queue for network failures
- [ ] Local storage for pending submissions

### Backend Implementation
- [ ] QR payload decoder
- [ ] Signature validation (if signed QR codes)
- [ ] Student lookup service
- [ ] Attendance rule engine
- [ ] Idempotency check (prevent duplicates within time window)
- [ ] Transaction logging

### Database Setup
- [ ] Schema migration scripts
- [ ] Index optimization
- [ ] Seed data generator
- [ ] Backup strategy

---

## Phase 3: Containerization (Week 4)

### Dockerfiles
- [ ] Frontend Dockerfile (nginx serving static assets)
- [ ] Backend Dockerfile (JRE/Python runtime)
- [ ] Multi-stage builds for optimization

### Docker Compose
```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports: ["80:80"]
    depends_on: [backend]
    environment:
      - BACKEND_URL=http://backend:8080
  
  backend:
    build: ./backend
    ports: ["8080:8080"]
    depends_on: [database]
    environment:
      - DB_HOST=database
      - DB_PORT=3306
      - DB_NAME=attendance
      - DB_USER=att_user
      - DB_PASSWORD=${DB_PASSWORD}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
  
  database:
    image: mysql:8.0
    volumes:
      - db_data:/var/lib/mysql
      - ./database/init:/docker-entrypoint-initdb.d
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=attendance
      - MYSQL_USER=att_user
      - MYSQL_PASSWORD=${DB_PASSWORD}
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  db_data:
```

---

## Phase 4: CI/CD Pipeline (Weeks 5-6)

### Jenkins Pipeline Stages
```groovy
pipeline {
    agent any
    
    stages {
        stage('Checkout') {
            steps { git branch: 'main', url: 'https://github.com/org/attendance-system.git' }
        }
        
        stage('Build') {
            parallel {
                stage('Build Frontend') { steps { sh 'cd frontend && npm ci && npm run build' } }
                stage('Build Backend') { steps { sh 'cd backend && ./mvnw clean package' } }
            }
        }
        
        stage('Unit Tests') {
            parallel {
                stage('Frontend Tests') { steps { sh 'cd frontend && npm test' } }
                stage('Backend Tests') { steps { sh 'cd backend && ./mvnw test' } }
            }
        }
        
        stage('Docker Build') {
            steps {
                script {
                    def version = "main-${BUILD_NUMBER}-${GIT_COMMIT.take(7)}"
                    sh "docker build -t attendance-frontend:${version} ./frontend"
                    sh "docker build -t attendance-backend:${version} ./backend"
                }
            }
        }
        
        stage('Security Scan') {
            steps {
                sh 'trivy image attendance-frontend:${version}'
                sh 'trivy image attendance-backend:${version}'
            }
        }
        
        stage('Push to Registry') {
            steps {
                sh 'docker push registry.example.com/attendance-frontend:${version}'
                sh 'docker push registry.example.com/attendance-backend:${version}'
            }
        }
        
        stage('Deploy') {
            when { branch 'main' }
            steps {
                sh 'docker-compose pull'
                sh 'docker-compose up -d'
            }
        }
    }
    
    post {
        failure {
            mail to: 'team@example.com', subject: "Build Failed: ${BUILD_NUMBER}"
        }
        success {
            echo "Deployment successful: ${version}"
        }
    }
}
```

---

## Phase 5: Monitoring & Observability (Week 6)

### Prometheus Metrics
```python
# Backend metrics endpoint
from prometheus_client import Counter, Histogram, generate_latest

REQUEST_COUNT = Counter('api_requests_total', 'Total API requests', ['method', 'endpoint', 'status'])
REQUEST_LATENCY = Histogram('api_request_latency_seconds', 'API request latency')
SCAN_SUCCESS = Counter('scans_success_total', 'Successful scans')
SCAN_FAILURE = Counter('scans_failure_total', 'Failed scans', ['reason'])
DB_CONNECTIONS = Gauge('db_connections_active', 'Active DB connections')
```

### Grafana Dashboards
- [ ] API Health Dashboard
  - Request rate
  - Latency percentiles (p50, p95, p99)
  - Error rate
- [ ] Scan Outcomes Dashboard
  - Success/failure ratio
  - Status breakdown
  - Hourly trends
- [ ] Database Dashboard
  - Connection pool usage
  - Query performance
  - Storage growth

### Alerting Rules
```yaml
groups:
  - name: attendance_alerts
    rules:
      - alert: APIDown
        expr: up{job="backend"} == 0
        for: 1m
        annotations:
          summary: "Backend API is down"
      
      - alert: HighErrorRate
        expr: rate(scans_failure_total[5m]) > 0.1
        for: 2m
        annotations:
          summary: "High scan failure rate detected"
      
      - alert: DBUnavailable
        expr: mysql_up == 0
        for: 1m
        annotations:
          summary: "Database is unavailable"
```

---

## Phase 6: Security & Hardening (Week 7)

### Security Checklist
- [ ] Secrets management (environment variables / vault)
- [ ] QR payload signature validation
- [ ] Container security context (non-root user)
- [ ] Network policies (restrict inter-container traffic)
- [ ] TLS termination at ingress
- [ ] Audit logging for all attendance writes
- [ ] Rate limiting on /scan endpoint
- [ ] Input validation and sanitization

---

## Phase 7: Testing & Validation (Weeks 7-8)

### Test Categories
- [ ] **Unit Tests**
  - QR parser edge cases
  - Attendance rule engine
  - Idempotency logic
  
- [ ] **Integration Tests**
  - End-to-end scan flow
  - Database transactions
  - Error recovery scenarios
  
- [ ] **Load Tests**
  - Burst scanning (50 concurrent requests)
  - Sustained load (20 scans/min for 1 hour)
  - Database connection stress
  
- [ ] **UAT Scenarios**
  - Valid student QR scan
  - Invalid/malformed QR
  - Duplicate scan within threshold
  - Offline mode and recovery
  - Expired/inactive student

---

## Phase 8: Go-Live & Rollout (Week 9)

### Pre-Launch Checklist
- [ ] Staging environment sign-off
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Backup/restore tested
- [ ] Runbook documented
- [ ] On-call rotation established

### Deployment Steps
1. Deploy to production via Jenkins pipeline
2. Verify health checks pass
3. Run smoke tests
4. Enable monitoring alerts
5. Announce go-live

### Hypercare Period (Weeks 9-10)
- Daily dashboard reviews
- Rapid bug-fix deployment ready
- User feedback collection
- Performance monitoring

---

## Phase 9: Post-Launch Backlog

### Future Enhancements
- [ ] Admin panel for attendance correction
- [ ] CSV/PDF export functionality
- [ ] Role-based access control (faculty/admin)
- [ ] Class scheduling integration
- [ ] Offline-first scanner with sync
- [ ] Analytics reports (trends, absentee alerts)
- [ ] Mobile app for students
- [ ] Email/SMS notifications

---

## Deliverables

| Item | Status | Location |
|------|--------|----------|
| Frontend scanner UI container | ☐ | `/frontend` |
| Backend API + attendance logic | ☐ | `/backend` |
| MySQL schema + migrations | ☐ | `/database` |
| docker-compose.yml | ☐ | `/` |
| Jenkins pipeline | ☐ | `/jenkins` |
| Prometheus + Grafana config | ☐ | `/monitoring` |
| Security baseline docs | ☐ | `/docs/security.md` |
| Test suite | ☐ | `*/tests/` |
| Operations runbook | ☐ | `/docs/runbook.md` |

---

## Quick Start

```bash
# Clone and setup
git clone <repo-url>
cd attendance-system

# Set environment variables
export DB_PASSWORD=secure_password
export MYSQL_ROOT_PASSWORD=root_secure_password

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Run tests
./run-tests.sh
```
