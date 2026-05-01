/**
 * Real API Service for Teacher Dashboard
 * Connects to FastAPI backend endpoints
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Fetch today's attendance summary from backend
 * GET /api/teacher/dashboard/summary
 */
export async function fetchTodaySummary() {
  const res = await fetch(`${API_BASE_URL}/teacher/dashboard/summary`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Failed to fetch summary' }));
    throw new Error(error.detail || 'Failed to fetch summary');
  }
  return res.json();
}

/**
 * Fetch all students with optional filtering
 * GET /api/teacher/students?course_id=&search=
 */
export async function fetchStudents(courseId = null, search = '') {
  const params = new URLSearchParams();
  if (courseId) params.append('course_id', courseId);
  if (search) params.append('search', search);
  
  const res = await fetch(`${API_BASE_URL}/teacher/students?${params}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Failed to fetch students' }));
    throw new Error(error.detail || 'Failed to fetch students');
  }
  return res.json();
}

/**
 * Fetch today's attendance records
 * GET /api/teacher/attendance/today
 */
export async function fetchTodayAttendance() {
  const res = await fetch(`${API_BASE_URL}/teacher/attendance/today`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Failed to fetch attendance' }));
    throw new Error(error.detail || 'Failed to fetch attendance');
  }
  return res.json();
}

/**
 * Mark attendance manually for a student
 * POST /api/teacher/attendance/mark
 * @param {number} studentId - Student ID
 * @param {number} sessionId - Session ID
 * @param {string} status - Status: 'present', 'late', 'absent', or 'manual'
 * @param {string} note - Optional reason/note
 */
export async function markAttendance(studentId, sessionId, status, note = '') {
  const res = await fetch(`${API_BASE_URL}/teacher/attendance/mark`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Teacher-ID': '1' // Mock auth header
    },
    body: JSON.stringify({ 
      student_id: studentId, 
      session_id: sessionId, 
      status, 
      note 
    })
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Failed to mark attendance' }));
    throw new Error(error.detail || 'Failed to mark attendance');
  }
  
  return res.json();
}

/**
 * Export attendance to CSV
 * GET /api/teacher/attendance/export?date=&course_id=
 */
export async function exportAttendanceCSV(date = null, courseId = null) {
  const params = new URLSearchParams();
  if (date) params.append('date', date);
  if (courseId) params.append('course_id', courseId);
  
  // Open in new window/tab to trigger download
  window.open(`${API_BASE_URL}/teacher/attendance/export?${params}`, '_blank');
  return { success: true };
}

/**
 * Subscribe to live attendance updates via WebSocket
 * TODO: Implement WebSocket connection when backend supports it
 * For now, uses polling as fallback
 */
export function subscribeToLiveUpdates(callback) {
  // Simple polling every 10 seconds as fallback
  const pollInterval = setInterval(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/teacher/attendance/today`);
      if (res.ok) {
        const data = await res.json();
        // Convert to activity format
        const activities = data.map(record => ({
          id: record.id,
          student_name: record.student_name,
          student_id: record.student_id,
          status: record.status,
          time: record.scan_time
        }));
        if (activities.length > 0) {
          callback(activities[0]); // Pass most recent
        }
      }
    } catch (err) {
      console.warn('Live update poll failed:', err);
    }
  }, 10000);
  
  return () => clearInterval(pollInterval);
}

/**
 * Fetch teacher's courses
 * GET /api/teacher/courses
 */
export async function fetchCourses() {
  const res = await fetch(`${API_BASE_URL}/teacher/courses`, {
    headers: { 'X-Teacher-ID': '1' }
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Failed to fetch courses' }));
    throw new Error(error.detail || 'Failed to fetch courses');
  }
  return res.json();
}

/**
 * Create a new course
 * POST /api/teacher/courses
 */
export async function createCourse(courseData) {
  const res = await fetch(`${API_BASE_URL}/teacher/courses`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Teacher-ID': '1'
    },
    body: JSON.stringify(courseData)
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Failed to create course' }));
    throw new Error(error.detail || 'Failed to create course');
  }
  
  return res.json();
}

/**
 * Update a course
 * PUT /api/teacher/courses/:id
 */
export async function updateCourse(courseId, courseData) {
  const res = await fetch(`${API_BASE_URL}/teacher/courses/${courseId}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'X-Teacher-ID': '1'
    },
    body: JSON.stringify(courseData)
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Failed to update course' }));
    throw new Error(error.detail || 'Failed to update course');
  }
  
  return res.json();
}

/**
 * Delete a course
 * DELETE /api/teacher/courses/:id
 */
export async function deleteCourse(courseId) {
  const res = await fetch(`${API_BASE_URL}/teacher/courses/${courseId}`, {
    method: 'DELETE',
    headers: { 'X-Teacher-ID': '1' }
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Failed to delete course' }));
    throw new Error(error.detail || 'Failed to delete course');
  }
  
  return res.json();
}

/**
 * Update a student
 * PUT /api/teacher/students/:id
 */
export async function updateStudent(studentId, studentData) {
  const res = await fetch(`${API_BASE_URL}/teacher/students/${studentId}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'X-Teacher-ID': '1'
    },
    body: JSON.stringify(studentData)
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Failed to update student' }));
    throw new Error(error.detail || 'Failed to update student');
  }
  
  return res.json();
}

/**
 * Delete a student
 * DELETE /api/teacher/students/:id
 */
export async function deleteStudent(studentId) {
  const res = await fetch(`${API_BASE_URL}/teacher/students/${studentId}`, {
    method: 'DELETE',
    headers: { 'X-Teacher-ID': '1' }
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Failed to delete student' }));
    throw new Error(error.detail || 'Failed to delete student');
  }
  
  return res.json();
}

/**
 * Create a new student
 * POST /api/teacher/students
 */
export async function createStudent(studentData) {
  const res = await fetch(`${API_BASE_URL}/teacher/students`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Teacher-ID': '1'
    },
    body: JSON.stringify(studentData)
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Failed to create student' }));
    throw new Error(error.detail || 'Failed to create student');
  }
  
  return res.json();
}
