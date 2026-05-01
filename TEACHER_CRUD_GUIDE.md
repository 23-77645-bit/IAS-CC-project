# Teacher CRUD Operations Guide

## Overview

The Attendance Management System now includes a **separate Teacher CRUD Portal** for managing courses and students, distinct from the student QR scanning interface.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │   Scanner    │  │ Teacher Dashboard│  │  Teacher CRUD │ │
│  │    Page      │  │    (Monitoring)  │  │  (Management) │ │
│  │              │  │                  │  │               │ │
│  │ - QR Scan    │  │ - Summary Cards  │  │ - Create      │ │
│  │ - Camera     │  │ - Live Feed      │  │ - Read        │ │
│  │ - History    │  │ - Attendance     │  │ - Update      │ │
│  │              │  │   Table          │  │ - Delete      │ │
│  └──────────────┘  └──────────────────┘  └───────────────┘ │
│         │                  │                    │           │
└─────────┼──────────────────┼────────────────────┼───────────┘
          │                  │                    │
          ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                 Backend (FastAPI + SQLAlchemy)                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  POST /scan              GET /teacher/dashboard/summary     │
│  GET /health             GET /teacher/students              │
│                          POST /teacher/students             │
│                          PUT /teacher/students/:id          │
│                          DELETE /teacher/students/:id       │
│                          GET /teacher/courses               │
│                          POST /teacher/courses              │
│                          PUT /teacher/courses/:id           │
│                          DELETE /teacher/courses/:id        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                      MySQL Database                          │
├─────────────────────────────────────────────────────────────┤
│  - students                                                  │
│  - teachers                                                  │
│  - courses                                                   │
│  - sessions                                                  │
│  - attendance                                                │
│  - course_enrollments                                        │
└─────────────────────────────────────────────────────────────┘
```

## Navigation

The application now has **three main pages**:

1. **📷 Scanner** (`/`) - Student QR code scanning interface
2. **✨ Teacher Dashboard** (`/teacher`) - Monitor today's attendance
3. **⚙️ Manage (CRUD)** (`/teacher/crud`) - Create, Read, Update, Delete operations

## Features

### Teacher CRUD Portal (`/teacher/crud`)

#### Courses Tab
- **Create Course**: Add new courses with name, code, and semester
- **View Courses**: List all courses with details
- **Edit Course**: Update existing course information
- **Delete Course**: Remove courses (cascades to sessions and enrollments)

#### Students Tab
- **Add Student**: Register new students with ID, name, email, and program
- **View Students**: Browse all registered students
- **Edit Student**: Modify student details
- **Delete Student**: Remove students (cascades to enrollments)

### Key Design Principles

1. **Separation of Concerns**: 
   - QR scanning is kept separate from administrative tasks
   - Teachers can focus on scanning OR management without confusion

2. **User Experience**:
   - Clean tabbed interface for CRUD operations
   - Visual feedback for success/error states
   - Confirmation dialogs for destructive actions

3. **Data Integrity**:
   - Cascading deletes maintain database consistency
   - Duplicate prevention for student IDs
   - Audit logging for all operations

## API Endpoints

### Student Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/teacher/students` | List all students |
| POST | `/api/teacher/students` | Create new student |
| PUT | `/api/teacher/students/:id` | Update student |
| DELETE | `/api/teacher/students/:id` | Delete student |

### Course Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/teacher/courses` | List all courses |
| POST | `/api/teacher/courses` | Create new course |
| PUT | `/api/teacher/courses/:id` | Update course |
| DELETE | `/api/teacher/courses/:id` | Delete course |

## Usage Example

### Adding a New Student

1. Navigate to **⚙️ Manage (CRUD)** from the top navigation
2. Click on the **👥 Students** tab
3. Click **+ Add Student** button
4. Fill in the form:
   - Student ID (required): e.g., `STU001`
   - Full Name (required): e.g., `John Doe`
   - Email (required): e.g., `john@example.com`
   - Program (optional): e.g., `Computer Science`
5. Click **Add Student**
6. A success notification will appear
7. The student will appear in the list with Edit/Delete options

### Creating a New Course

1. Navigate to **⚙️ Manage (CRUD)**
2. Click on the **📚 Courses** tab
3. Click **+ Add Course** button
4. Fill in the form:
   - Course Name (required): e.g., `Introduction to Programming`
   - Course Code (required): e.g., `CS101`
   - Semester (optional): e.g., `Fall 2024`
5. Click **Create Course**
6. The course will be added to the list

## Security Notes

- All CRUD operations require teacher authentication (via `X-Teacher-ID` header in demo mode)
- In production, replace mock authentication with JWT tokens
- Audit logs track all create, update, and delete operations
- Cascade deletes prevent orphaned records

## Testing

### Manual Testing Checklist

- [ ] Navigate to `/teacher/crud`
- [ ] Switch between Courses and Students tabs
- [ ] Create a new course
- [ ] Edit the course details
- [ ] Delete the course (with confirmation)
- [ ] Create a new student
- [ ] Edit student information
- [ ] Delete the student (with confirmation)
- [ ] Verify data persists after page refresh
- [ ] Test error handling (duplicate student ID, etc.)

### Automated Testing

Backend tests can be run with:
```bash
cd backend
pytest tests/ -v
```

Frontend build verification:
```bash
cd frontend
npm run build
```

## Troubleshooting

### Common Issues

1. **"Failed to load data" error**
   - Ensure backend is running at `http://localhost:8000`
   - Check database connection
   - Verify CORS settings allow frontend origin

2. **"Student ID already exists" error**
   - Each student ID must be unique
   - Use a different ID or edit the existing student

3. **Course deletion fails**
   - Ensure no active sessions reference the course
   - Check foreign key constraints in database

## Future Enhancements

- [ ] Bulk import/export for students (CSV)
- [ ] Course enrollment management UI
- [ ] Session creation and management
- [ ] Advanced search and filtering
- [ ] Pagination for large datasets
- [ ] Real-time validation feedback
- [ ] Role-based access control (RBAC)

---

**Note**: This CRUD portal is designed for teacher use only. Students should only have access to generate their QR codes, not to this management interface.
