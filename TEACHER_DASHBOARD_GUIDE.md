# Teacher Dashboard Access Guide

## 🎯 Where to Find the Teacher Dashboard

The Teacher Dashboard is now available at: **`http://localhost:3000/teacher`**

### Navigation
Once the application is running, you'll see a blue navigation bar at the top with two options:
- **📷 Scanner** - The original QR code scanner interface (default page)
- **👨‍🏫 Teacher Dashboard** - The new teacher management interface

Click on **"👨‍🏫 Teacher Dashboard"** to access the full teacher features.

---

## 🚀 Quick Start

### 1. Access the Application
```bash
# Frontend is available at:
http://localhost:3000

# Direct link to Teacher Dashboard:
http://localhost:3000/teacher
```

### 2. Select a Course
- Use the dropdown at the top to select your course
- Courses are created in the database (see sample data below)

### 3. Import Students
- Go to the **Students** tab
- Upload a CSV or Excel file with columns: `student_id`, `name`, `email`
- Preview the data before confirming
- Click "Confirm Upload" to save students

### 4. Send QR Codes
- Still in the **Students** tab
- Click "📧 Send QR Codes to X Students"
- Students will receive an email with their unique QR code PDF

### 5. Start Attendance Session
- Go to the **Dashboard** tab
- Click "🚀 Start Attendance Session"
- Students scan their QR codes
- Watch live attendance updates in real-time

### 6. End Session & Export
- Click "End Session" when class is over
- Click "Export CSV" to download attendance report

---

## 📊 Dashboard Features

### Dashboard Tab
- **Live Statistics**: Total, Present, Late, Absent counts
- **Session Control**: Start/End attendance sessions
- **Live Attendance Feed**: Real-time scan updates with color-coded status:
  - 🟢 Present (scanned within 5 minutes)
  - 🟡 Late (scanned after 15 minutes)
  - 🔴 Absent (not scanned)
- **Quick Actions**: Navigate to Students or Sessions tabs

### Students Tab
- **Import Students**: Upload CSV/Excel files with validation preview
- **Send QR Emails**: Distribute personalized QR codes via email
- **Student List**: View all enrolled students with status

### Sessions Tab
- **Session History**: View all past and active sessions
- **Download Reports**: Export attendance as CSV for closed sessions

---

## 📁 Sample CSV Format

Create a file named `students.csv`:

```csv
student_id,name,email
STU001,John Doe,john.doe@university.edu
STU002,Jane Smith,jane.smith@university.edu
STU003,Bob Johnson,bob.johnson@university.edu
```

Or Excel format (.xlsx) with the same columns.

---

## 🔗 API Endpoints Used

The dashboard communicates with these backend endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/teacher/courses` | GET | List all courses |
| `/api/teacher/courses/{id}/students` | GET | Get enrolled students |
| `/api/teacher/courses/{id}/sessions` | GET | Get course sessions |
| `/api/teacher/upload-students/preview` | POST | Preview student upload |
| `/api/teacher/upload-students` | POST | Confirm student upload |
| `/api/teacher/courses/{id}/send-qr-emails` | POST | Send QR emails |
| `/api/teacher/sessions` | POST | Create new session |
| `/api/teacher/sessions/{id}/attendance` | GET | Get live attendance |
| `/api/teacher/sessions/{id}/end` | POST | End session |
| `/api/teacher/sessions/{id}/export` | GET | Export attendance CSV |

---

## 🎨 Color Coding

| Status | Color | Icon | Meaning |
|--------|-------|------|---------|
| Present | Green | 🟢 | Scanned within first 5 minutes |
| Late | Yellow | 🟡 | Scanned after 15 minutes |
| Absent | Red | 🔴 | Not scanned by end of session |
| Pending | Gray | ⚪ | Email not opened yet |

---

## 🔒 Security Features

- **Unique Tokens**: Each student gets a cryptographic UUID (not raw data)
- **Time-Window Locking**: Scans disabled 20 minutes after class starts
- **Duplicate Detection**: Alerts if same QR scanned twice simultaneously
- **Manual Override**: Teacher can manually mark students present
- **Audit Log**: All actions tracked for dispute resolution

---

## 🐛 Troubleshooting

### Dashboard not loading?
1. Check if backend is running: `http://localhost:8000/health`
2. Verify database connection
3. Check browser console for errors

### Can't upload students?
1. Ensure CSV has headers: `student_id`, `name`, `email`
2. Check for duplicate student IDs
3. Validate email formats

### QR emails not sending?
1. Configure SMTP settings in backend environment variables
2. Check email logs in the database
3. Verify student emails are valid

---

## 📞 Need Help?

Check the main README.md for:
- Full system architecture
- Database schema details
- Deployment instructions
- Monitoring setup with Grafana/Prometheus
