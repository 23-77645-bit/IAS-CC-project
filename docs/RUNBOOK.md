# Attendance Management System - Operations Runbook

## System Overview

The Attendance Management System is a containerized application for recording student attendance via QR code scanning.

### Architecture Components
- **Frontend**: React SPA with QR scanner (nginx)
- **Backend**: FastAPI Python service
- **Database**: MySQL 8.0
- **Monitoring**: Prometheus + Grafana

### Service Ports
| Service | Port | Protocol |
|---------|------|----------|
| Frontend | 80 | HTTP |
| Backend API | 8080 | HTTP |
| Database | 3306 | MySQL |
| Prometheus | 9090 | HTTP |
| Grafana | 3001 | HTTP |

---

## Quick Start Commands

### Start All Services
```bash
# Basic startup
docker-compose up -d

# With monitoring stack
docker-compose --profile monitoring up -d

# View logs
docker-compose logs -f
```

### Stop All Services
```bash
docker-compose down
```

### Restart Services
```bash
docker-compose restart backend
```

---

## Health Checks

### Manual Health Check
```bash
# Frontend
curl http://localhost/health

# Backend
curl http://localhost:8080/health

# Database
docker exec attendance-database mysqladmin ping -h localhost -u root -p
```

### Container Health Status
```bash
docker-compose ps
```

---

## Common Operations

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f database

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Database Operations

#### Connect to Database
```bash
docker exec -it attendance-database mysql -u att_app -p attendance
```

#### Backup Database
```bash
docker exec attendance-database mysqldump -u root -p attendance > backup-$(date +%Y%m%d).sql
```

#### Restore Database
```bash
docker exec -i attendance-database mysql -u root -p attendance < backup-20240101.sql
```

#### Reset Database (Development Only)
```bash
docker-compose down -v  # Removes volumes!
docker-compose up -d
```

### Application Operations

#### Scale Backend (if needed)
```bash
docker-compose up -d --scale backend=3
```

#### Update Application
```bash
git pull origin main
docker-compose pull
docker-compose up -d
```

#### Clear Application Cache
```bash
docker-compose restart backend
```

---

## Monitoring & Alerts

### Access Dashboards
- **Grafana**: http://localhost:3001 (admin/admin123)
- **Prometheus**: http://localhost:9090

### Key Metrics to Monitor
| Metric | Alert Threshold | Description |
|--------|-----------------|-------------|
| API Latency (p95) | > 500ms | Response time |
| Error Rate | > 5% | Failed requests |
| DB Connections | > 18 | Connection pool usage |
| Scan Failure Rate | > 10% | QR scan issues |

### Prometheus Queries
```promql
# Request rate per endpoint
rate(api_requests_total[5m])

# Error percentage
sum(rate(api_requests_total{status=~"5.."}[5m])) / sum(rate(api_requests_total[5m])) * 100

# Average latency
rate(api_request_latency_seconds_sum[5m]) / rate(api_request_latency_seconds_count[5m])
```

---

## Troubleshooting Guide

### Issue: Backend Not Starting

**Symptoms**: Container exits immediately, health check fails

**Diagnosis**:
```bash
docker-compose logs backend
docker inspect attendance-backend
```

**Solutions**:
1. Check database connectivity:
   ```bash
   docker exec attendance-backend curl -v database:3306
   ```
2. Verify environment variables:
   ```bash
   docker exec attendance-backend env | grep DB_
   ```
3. Check database is healthy first:
   ```bash
   docker-compose ps database
   ```

### Issue: High API Latency

**Symptoms**: Slow responses, timeouts

**Diagnosis**:
```bash
# Check Grafana dashboard
# Query Prometheus for slow endpoints
```

**Solutions**:
1. Check database query performance
2. Review connection pool settings
3. Scale backend if CPU/memory constrained

### Issue: Database Connection Errors

**Symptoms**: "Can't connect to MySQL server"

**Diagnosis**:
```bash
docker-compose logs database
docker exec attendance-database mysqladmin status -u root -p
```

**Solutions**:
1. Wait for database initialization (first start takes ~60s)
2. Check disk space: `df -h`
3. Verify credentials match in all services

### Issue: QR Scans Failing

**Symptoms**: All scans return invalid/error

**Diagnosis**:
```bash
# Check backend logs for specific errors
docker-compose logs backend | grep "Scan error"

# Test API directly
curl -X POST http://localhost:8080/scan \
  -H "Content-Type: application/json" \
  -d '{"qr_payload": "QR001-STU-2024", "device_id": "test"}'
```

**Solutions**:
1. Verify student data exists in database
2. Check network connectivity between frontend and backend
3. Review CORS settings if browser errors

### Issue: Camera Not Working

**Symptoms**: "Camera access denied" message

**Solutions**:
1. Ensure HTTPS in production (camera requires secure context)
2. Check browser permissions
3. Verify device has camera hardware

---

## Security Procedures

### Rotate Database Password
1. Update password in secrets manager
2. Update docker-compose.yml environment variables
3. Restart database and backend:
   ```bash
   docker-compose restart database backend
   ```

### Emergency Shutdown
```bash
# Graceful shutdown
docker-compose down

# Force stop (if needed)
docker-compose kill
```

### Audit Log Access
```bash
docker exec -it attendance-database mysql -u att_app -p attendance -e "SELECT * FROM audit_log ORDER BY performed_at DESC LIMIT 100;"
```

---

## Backup & Recovery

### Automated Backup Script
```bash
#!/bin/bash
BACKUP_DIR="/backups/attendance"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR
docker exec attendance-database mysqldump -u root -p${MYSQL_ROOT_PASSWORD} attendance > ${BACKUP_DIR}/attendance-${DATE}.sql

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
```

### Disaster Recovery
1. Restore from latest backup:
   ```bash
   docker exec -i attendance-database mysql -u root -p attendance < latest-backup.sql
   ```
2. Restart all services:
   ```bash
   docker-compose restart
   ```
3. Verify data integrity:
   ```bash
   docker exec attendance-database mysql -u att_app -p attendance -e "SELECT COUNT(*) FROM students; SELECT COUNT(*) FROM attendance;"
   ```

---

## Contact & Escalation

| Level | Contact | Response Time |
|-------|---------|---------------|
| L1 Support | support@example.com | 4 hours |
| L2 Engineering | engineering@example.com | 2 hours |
| L3 On-Call | +1-XXX-XXX-XXXX | 30 minutes |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-01 | Initial release |
