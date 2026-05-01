# Attendance Management System

A production-ready, containerized QR code-based attendance management system with real-time scanning, automated processing, comprehensive monitoring, and CI/CD automation.

## 🚀 Features

- **QR Code Scanning**: Real-time camera-based QR code scanning via responsive web interface
- **Attendance Processing**: Automatic validation, duplicate detection, late/early status calculation
- **Idempotency**: Prevents duplicate processing of the same scan request with Redis-backed locking
- **Offline Support**: Intelligent retry queue for temporary network issues
- **Monitoring**: Prometheus metrics + Grafana dashboards with custom attendance KPIs
- **CI/CD Automation**: Jenkins pipeline with GitHub webhook integration for auto-deployment
- **Security**: Container hardening, secrets management, SQL injection prevention, input validation
- **High Performance**: Optimized database queries, connection pooling, async operations

## 📁 Project Structure

```
IAS-CC-project/
├── frontend/          # React 18 + Vite + TypeScript
├── backend/           # FastAPI + SQLAlchemy + Pydantic
├── database/          # MySQL schema and migrations
├── monitoring/        # Prometheus + Grafana configurations
├── jenkins/           # CI/CD pipeline and webhook setup
├── docs/              # Comprehensive documentation
└── docker-compose.yml # Orchestration for all services
```

## 🛠️ Tech Stack

| Component | Technology | Details |
|-----------|------------|---------|
| Frontend | React 18, Vite, TypeScript | ZXing QR Library, Tailwind CSS |
| Backend | Python 3.11, FastAPI | SQLAlchemy ORM, Pydantic validation |
| Database | MySQL 8.0 | Optimized indexes, stored procedures removed |
| Monitoring | Prometheus, Grafana | Custom metrics, alerting rules |
| CI/CD | Jenkins | GitHub webhooks, automated testing |
| Containerization | Docker, Docker Compose | Multi-stage builds, security hardening |

## 🏃 Quick Start

### Option 1: Local Development (Recommended)

**Prerequisites:**
- Docker Desktop (or Docker Engine + Docker Compose plugin v2+)
- Git

**Steps:**
```bash
# Clone repository
git clone <your-repo-url>
cd IAS-CC-project

# Set secure passwords (required for first run)
export DB_PASSWORD='YourSecurePassword123!'
export MYSQL_ROOT_PASSWORD='YourRootPassword456!'

# Build and start all services
docker compose up --build -d

# View logs (optional)
docker compose logs -f
```

**Access Points:**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)
- **MySQL**: localhost:3306

### Option 2: GitHub Codespaces

This project is fully configured for GitHub Codespaces with Docker-in-Docker support:

1. Click the green "Code" button on GitHub
2. Select "Create codespace on main"
3. Wait for container build (~3-5 minutes)
4. Run `docker compose up --build -d` in the terminal
5. Access services via port forwarding (automatic popup)

> **Note**: If you encounter recovery mode, run "Dev Containers: Rebuild Container" from Command Palette (Ctrl+Shift+P).

See [GitHub Codespaces Setup Guide](docs/GITHUB_CODESPACES_SETUP.md) for troubleshooting.

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Database
DB_PASSWORD=your_secure_password
MYSQL_ROOT_PASSWORD=your_root_password

# Backend
SECRET_KEY=your-secret-key-min-32-chars-long
DEBUG=false

# Ngrok (for Jenkins webhooks)
NGROK_AUTH_TOKEN=your_ngrok_token
NGROK_DOMAIN=your-subdomain.ngrok.io
```

### Ngrok Setup for Jenkins Webhooks

To enable GitHub webhook automation with Jenkins:

1. Get free token at https://ngrok.com
2. Add `NGROK_AUTH_TOKEN` to your `.env` file
3. Start ngrok service: `docker compose up ngrok -d`
4. Copy the forwarded URL from ngrok dashboard
5. Configure GitHub webhook with: `http://<ngrok-url>/github-webhook/`

## 📖 Documentation

- [Project Plan & Requirements](docs/PROJECT_PLAN.md)
- [Operations Runbook & Troubleshooting](docs/RUNBOOK.md)
- [GitHub Codespaces Setup](docs/GITHUB_CODESPACES_SETUP.md)
- [Jenkins CI/CD Pipeline](jenkins/README.md)
- [API Documentation](http://localhost:8000/docs)

## 🧪 Testing

```bash
# Backend tests
cd backend
pip install -r requirements.txt
pytest tests/ -v --cov=app

# Integration tests
docker compose up -d
pytest tests/integration/ -v
```

## 🏗️ CI/CD Pipeline

The Jenkins pipeline provides:
- Automated builds on every push
- Unit and integration testing
- Security scanning
- Deployment to staging/production
- Rollback capabilities

**Webhook Automation:**
- GitHub pushes trigger Jenkins builds automatically
- Requires Ngrok tunnel for local Jenkins instances
- See `jenkins/README.md` for setup instructions

## 🔒 Security Features

- ✅ Non-root container execution
- ✅ Secrets management via environment variables
- ✅ SQL injection prevention (ORM-based queries)
- ✅ Input validation with Pydantic
- ✅ CORS policy enforcement
- ✅ Audit logging for all operations
- ✅ Container filesystem hardening (read-only where possible)
- ✅ Strong password policies enforced

## 📊 Monitoring & Observability

**Prometheus Metrics:**
- Request latency and throughput
- Database connection pool status
- Error rates by endpoint
- Custom attendance metrics

**Grafana Dashboards:**
- System health overview
- Attendance trends and analytics
- Alert notifications
- Resource utilization

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support & Troubleshooting

**Common Issues:**
- **Docker not found**: Rebuild container or install Docker Desktop
- **Database connection failed**: Check passwords in `.env` file
- **Port conflicts**: Change ports in `docker-compose.yml`
- **Webhooks not triggering**: Verify Ngrok tunnel is active

For detailed troubleshooting, see [docs/RUNBOOK.md](docs/RUNBOOK.md).

## 📄 License

This project is created for educational purposes as part of IAS-CC course requirements.

---

**Status**: ✅ Production Ready | **Last Updated**: 2024 | **Grade Target**: A+
