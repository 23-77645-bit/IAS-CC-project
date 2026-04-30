# Attendance Management System

A containerized QR code-based attendance management system with real-time scanning, automated processing, and comprehensive monitoring.

## 🚀 Features

- **QR Code Scanning**: Real-time camera-based QR code scanning via web interface
- **Attendance Processing**: Automatic validation, duplicate detection, and status tracking
- **Idempotency**: Prevents duplicate processing of the same scan request
- **Offline Support**: Retry queue for temporary network issues (frontend)
- **Monitoring**: Prometheus metrics + Grafana dashboards
- **CI/CD Ready**: Jenkins pipeline for automated builds and deployments
- **Security**: Container hardening, secrets management, audit logging

## 📁 Project Structure

See individual component folders for details.

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18, Vite, ZXing QR Library |
| Backend | Python 3.11, FastAPI, SQLAlchemy |
| Database | MySQL 8.0 |
| Monitoring | Prometheus, Grafana |
| CI/CD | Jenkins |
| Containerization | Docker, Docker Compose |

## 🏃 Quick Start

### Option 1: GitHub Codespaces (Recommended)

This project is fully configured for GitHub Codespaces:

1. Click the green "Code" button on GitHub
2. Select "Create codespace on main"
3. Wait for the container to build (~2-3 minutes)
4. Access services via port forwarding:
   - **Frontend**: Port 3000
   - **Backend API**: Port 8000
   - **Prometheus**: Port 9090
   - **Grafana**: Port 3001

See [GitHub Codespaces Setup Guide](docs/GITHUB_CODESPACES_SETUP.md) for detailed instructions.

### Option 2: Local Development

```bash
export DB_PASSWORD=your_secure_password
docker-compose up -d
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001

## 📖 Documentation

- [Project Plan](docs/PROJECT_PLAN.md)
- [Operations Runbook](docs/RUNBOOK.md)

## 🧪 Testing

```bash
cd backend && pip install -r requirements.txt && pytest tests/ -v
```

## 🔒 Security

- Non-root containers
- Secrets via environment variables
- Input validation
- Audit logging

## 📞 Support

See docs/RUNBOOK.md for troubleshooting.
