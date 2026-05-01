# Teacher Dashboard - Integration Guide

## Overview

This document provides instructions for connecting the minimalist Teacher Dashboard to your FastAPI backend.

## File Structure

```
frontend/src/
├── components/
│   ├── SummaryCards.jsx       # Top summary statistics cards
│   ├── LiveFeed.jsx           # Real-time scan activity feed
│   ├── AttendanceTable.jsx    # Student table with search/filter/actions
│   └── StatusFilter.jsx       # Status filter buttons (optional standalone)
├── pages/
│   ├── TeacherDashboard.jsx          # Original dashboard (existing)
│   └── TeacherDashboardMinimal.jsx   # New minimal dashboard
├── services/
│   └── mockApi.js           # Mock API functions (replace with real calls)
├── styles/
│   └── TeacherDashboard.css # Minimalist CSS theme
└── App.jsx                  # Updated with new route
```

## Backend Endpoints Required

### 1. Get Today's Summary
```
GET /api/teacher/today/summary
Response:
{
  "total": 50,
  "present": 35,
  "late": 5,
  "absent": 10,
  "percentage": 80,
  "date": "2024-01-15"
}
```

### 2. Get All Students
```
GET /api/teacher/students
Response:
{
  "students": [
    {
      "id": 1,
      "student_id": "STU001",
      "name": "Alice Johnson",
      "program": "Computer Science",
      "email": "alice@uni.edu"
    }
  ]
}
```

### 3. Get Today's Attendance Records
```
GET /api/teacher/attendance/today
Response:
{
  "attendance": [
    {
      "id": 1,
      "student_id": "STU001",
      "status": "present",
      "scan_time": "2024-01-15T09:30:00Z",
      "note": ""
    }
  ]
}
```

### 4. Mark Attendance Manually
```
POST /api/teacher/attendance/mark
Body:
{
  "student_id": "STU001",
  "status": "present",
  "note": "Doctor's appointment"
}
Response:
{
  "success": true,
  "message": "Attendance updated"
}
```

### 5. Export Attendance to CSV
```
GET /api/teacher/attendance/export?date=2024-01-15
Returns: CSV file download
```

### 6. WebSocket for Live Updates (Optional)
```
WS /api/ws/attendance-live
Messages sent to client:
{
  "student_name": "Alice Johnson",
  "student_id": "STU001",
  "status": "present",
  "time": "2024-01-15T09:30:00Z"
}
```

## Integration Steps

### Step 1: Update API Base URL

Create or update `.env` file in frontend directory:

```env
VITE_API_URL=http://localhost:8000/api
```

### Step 2: Replace Mock Functions

In `src/services/mockApi.js`, replace each mock function:

**Before (Mock):**
```javascript
export async function fetchTodaySummary() {
  await new Promise(resolve => setTimeout(resolve, 300))
  return { total: 8, present: 4, late: 2, absent: 2, percentage: 75 }
}
```

**After (Real API):**
```javascript
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export async function fetchTodaySummary() {
  const response = await axios.get(`${API_BASE_URL}/teacher/today/summary`)
  return response.data
}
```

### Step 3: Implement Real API Calls

Update all functions in `mockApi.js`:

```javascript
// src/services/mockApi.js

import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export async function fetchTodaySummary() {
  const response = await axios.get(`${API_BASE_URL}/teacher/today/summary`)
  return response.data
}

export async function fetchStudents() {
  const response = await axios.get(`${API_BASE_URL}/teacher/students`)
  return response.data.students || []
}

export async function fetchTodayAttendance() {
  const response = await axios.get(`${API_BASE_URL}/teacher/attendance/today`)
  return response.data.attendance || []
}

export async function markAttendance(studentId, status, note = '') {
  const response = await axios.post(`${API_BASE_URL}/teacher/attendance/mark`, {
    student_id: studentId,
    status: status,
    note: note
  })
  return response.data
}

export async function exportAttendanceCSV(filteredData = null) {
  // Option 1: If backend generates CSV
  const params = filteredData ? { student_ids: filteredData.map(s => s.student_id).join(',') } : {}
  const response = await axios.get(`${API_BASE_URL}/teacher/attendance/export`, {
    params,
    responseType: 'blob'
  })
  
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.download = `attendance-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
  
  return { success: true }
}

// For WebSocket live updates
export function subscribeToLiveUpdates(callback) {
  // TODO: Implement WebSocket connection
  // Example using native WebSocket:
  /*
  const ws = new WebSocket(`${API_BASE_URL.replace('http', 'ws')}/ws/attendance-live`)
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)
    callback(data)
  }
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error)
  }
  
  return () => ws.close()
  */
  
  // For now, return empty unsubscribe function
  return () => {}
}
```

### Step 4: FastAPI Backend Implementation

Add these endpoints to your FastAPI backend:

```python
# backend/main.py or similar

from fastapi import FastAPI, WebSocket, Response
from fastapi.responses import StreamingResponse
import csv
import io
from datetime import date

app = FastAPI()

@app.get("/api/teacher/today/summary")
async def get_today_summary():
    # TODO: Query your database for today's attendance stats
    return {
        "total": 50,
        "present": 35,
        "late": 5,
        "absent": 10,
        "percentage": 80,
        "date": str(date.today())
    }

@app.get("/api/teacher/students")
async def get_students():
    # TODO: Query students from database
    return {"students": []}

@app.get("/api/teacher/attendance/today")
async def get_today_attendance():
    # TODO: Query today's attendance records
    return {"attendance": []}

@app.post("/api/teacher/attendance/mark")
async def mark_attendance(student_id: str, status: str, note: str = ""):
    # TODO: Update attendance in database
    return {"success": True, "message": "Attendance updated"}

@app.get("/api/teacher/attendance/export")
async def export_attendance(date_str: str = None):
    # TODO: Generate CSV from database
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Student ID', 'Name', 'Program', 'Status', 'Time', 'Note'])
    # Add rows...
    
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=attendance-{date_str or date.today()}.csv"}
    )

@app.websocket("/api/ws/attendance-live")
async def websocket_attendance_live(websocket: WebSocket):
    await websocket.accept()
    # TODO: Implement WebSocket logic for real-time updates
    # Consider using a broadcast system when scans occur
```

## Testing Locally

1. Start your FastAPI backend:
   ```bash
   cd backend
   uvicorn main:app --reload
   ```

2. Start the frontend dev server:
   ```bash
   cd frontend
   npm run dev
   ```

3. Navigate to `http://localhost:5173/teacher-minimal`

## Features Checklist

- [x] Summary cards showing Total, Present, Late, Absent, Percentage
- [x] Live activity feed with real-time updates
- [x] Student attendance table with:
  - [x] Search by name or ID
  - [x] Filter by status (All/Present/Late/Absent)
  - [x] Manual mark action with note input
  - [x] Export to CSV button
- [x] Loading states
- [x] Error states
- [x] Empty states
- [x] Responsive design (laptop + tablet)
- [x] Accessibility features (keyboard navigation, ARIA labels)
- [x] Clean, minimalist UI

## Accessibility Features

- Keyboard navigation support (Tab, Enter, Escape)
- ARIA labels on interactive elements
- Focus indicators for keyboard users
- High contrast mode support via CSS media query
- Reduced motion support for users who prefer it
- Screen reader friendly with semantic HTML

## Customization

### Change Accent Color

Edit `src/styles/TeacherDashboard.css`:

```css
:root {
  --color-accent: #3b82f6;        /* Change this */
  --color-accent-hover: #2563eb;  /* And this */
}
```

### Adjust Layout

The dashboard uses CSS Grid and Flexbox. Modify these classes in the CSS file:
- `.summary-grid` - Controls card layout
- `.dashboard-top-grid` - Controls top section layout
- `.table-header` - Controls table header layout

## Troubleshooting

### CORS Issues

If you get CORS errors, add this to your FastAPI app:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Data Not Loading

1. Check browser console for errors
2. Verify API endpoints are correct
3. Ensure backend is running
4. Check network tab in browser DevTools

### Build Errors

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Next Steps

1. Connect to your actual MySQL database
2. Implement authentication/authorization
3. Add WebSocket for real-time updates
4. Consider adding more filters (by program, date range)
5. Add pagination for large student lists
6. Implement caching for better performance
