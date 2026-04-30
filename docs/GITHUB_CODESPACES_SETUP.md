# GitHub Codespaces Setup Guide

## Running on GitHub Workspace (Codespaces)

This project is fully configured to run on GitHub Codespaces with minimal setup.

### Quick Start

1. **Open in Codespaces**:
   - Navigate to your repository on GitHub
   - Click the green "Code" button
   - Select "Create codespace on main" (or your branch)
   - Wait for the container to build (~2-3 minutes first time)

2. **Access Services**:
   Once the codespace is ready, you'll see port forwarding notifications:
   
   | Service | Port | Access |
   |---------|------|--------|
   | Frontend UI | 3000 | Click "Open in Browser" |
   | Backend API | 8000 | Click "Open in Browser" |
   | Prometheus | 9090 | Click "Open in Browser" |
   | Grafana | 3001 | Click "Open in Browser" |

3. **Start the Application**:
   ```bash
   # The devcontainer automatically runs docker-compose
   # If not started, run:
   docker-compose up -d
   ```

4. **Verify Services**:
   ```bash
   # Check all containers are running
   docker-compose ps
   
   # View logs
   docker-compose logs -f
   ```

### Features Available in Codespaces

- ✅ Docker-in-Docker support
- ✅ Python 3.11 with dependencies pre-installed
- ✅ Node.js 18 for frontend development
- ✅ VS Code extensions pre-configured
- ✅ Port auto-forwarding for all services
- ✅ Integrated terminal

### Testing the Application

1. **Test Backend API**:
   ```bash
   curl http://localhost:8000/health
   curl http://localhost:8000/metrics
   ```

2. **Run Tests**:
   ```bash
   # Backend tests
   cd backend && pytest
   
   # Frontend tests (if configured)
   cd frontend && npm test
   ```

3. **Access Grafana Dashboard**:
   - Open port 3001 in browser
   - Login: `admin` / `admin`
   - Navigate to Dashboards → Attendance System

### Troubleshooting

**Ports not forwarding?**
```bash
# Manually forward ports
gh codespace ports forward 8000:8000 3000:3000 9090:9090 3001:3001
```

**Container build fails?**
```bash
# Rebuild the devcontainer
# Command Palette → Dev Containers: Rebuild Container
```

**Database connection issues?**
```bash
# Check database status
docker-compose ps db

# View database logs
docker-compose logs db

# Reset database volume (WARNING: deletes data)
docker-compose down -v && docker-compose up -d
```

### Local Development Alternative

If you prefer not to use Codespaces:

```bash
# Clone repository
git clone <your-repo-url>
cd attendance-system

# Ensure Docker Desktop is running
docker --version

# Start all services
docker-compose up -d

# Access services at localhost:<port>
```

### CI/CD with Jenkins

The Jenkins pipeline requires a separate Jenkins instance. For Codespaces testing:

1. Export the Jenkinsfile configuration
2. Set up Jenkins on a separate server/VM
3. Configure GitHub webhook to trigger builds

### Resource Limits

GitHub Codespaces provides:
- **Free tier**: 60 hours/month (2-core machine)
- **Pro tier**: 120 hours/month (4-core machine available)

Monitor usage: https://github.com/settings/billing

### Next Steps

1. Test QR scanning functionality
2. Import sample student data
3. Configure Jenkins pipeline for production deployment
4. Set up monitoring alerts in Grafana

---

For detailed documentation, see:
- [README.md](../README.md) - Project overview
- [RUNBOOK.md](../docs/RUNBOOK.md) - Operations guide
- [PROJECT_PLAN.md](../docs/PROJECT_PLAN.md) - Implementation timeline
