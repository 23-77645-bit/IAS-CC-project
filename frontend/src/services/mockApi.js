/**
 * Mock API Service for Teacher Dashboard
 * 
 * TODO: Replace these mock functions with actual FastAPI endpoint calls
 * Backend endpoints should be:
 * - GET /api/teacher/today/summary - Get today's attendance summary
 * - GET /api/teacher/students - Get all students
 * - GET /api/teacher/attendance/today - Get today's attendance records
 * - POST /api/teacher/attendance/mark - Mark attendance manually
 * - GET /api/teacher/attendance/export - Export to CSV
 * - WS /api/ws/attendance-live - WebSocket for live updates
 */

const MOCK_STUDENTS = [
  { id: 1, student_id: 'STU001', name: 'Alice Johnson', program: 'Computer Science', email: 'alice@uni.edu' },
  { id: 2, student_id: 'STU002', name: 'Bob Smith', program: 'Mathematics', email: 'bob@uni.edu' },
  { id: 3, student_id: 'STU003', name: 'Carol Williams', program: 'Physics', email: 'carol@uni.edu' },
  { id: 4, student_id: 'STU004', name: 'David Brown', program: 'Chemistry', email: 'david@uni.edu' },
  { id: 5, student_id: 'STU005', name: 'Eva Martinez', program: 'Biology', email: 'eva@uni.edu' },
  { id: 6, student_id: 'STU006', name: 'Frank Lee', program: 'Computer Science', email: 'frank@uni.edu' },
  { id: 7, student_id: 'STU007', name: 'Grace Kim', program: 'Engineering', email: 'grace@uni.edu' },
  { id: 8, student_id: 'STU008', name: 'Henry Wilson', program: 'Mathematics', email: 'henry@uni.edu' },
]

const MOCK_ATTENDANCE = [
  { id: 1, student_id: 'STU001', status: 'present', scan_time: new Date(Date.now() - 1000 * 60 * 5).toISOString(), note: '' },
  { id: 2, student_id: 'STU002', status: 'present', scan_time: new Date(Date.now() - 1000 * 60 * 10).toISOString(), note: '' },
  { id: 3, student_id: 'STU003', status: 'late', scan_time: new Date(Date.now() - 1000 * 60 * 25).toISOString(), note: 'Traffic delay' },
  { id: 4, student_id: 'STU004', status: 'present', scan_time: new Date(Date.now() - 1000 * 60 * 3).toISOString(), note: '' },
  { id: 5, student_id: 'STU005', status: 'absent', scan_time: null, note: '' },
  { id: 6, student_id: 'STU006', status: 'present', scan_time: new Date(Date.now() - 1000 * 60 * 8).toISOString(), note: '' },
  { id: 7, student_id: 'STU007', status: 'late', scan_time: new Date(Date.now() - 1000 * 60 * 20).toISOString(), note: '' },
  { id: 8, student_id: 'STU008', status: 'absent', scan_time: null, note: '' },
]

const MOCK_LIVE_ACTIVITY = [
  { id: 1, student_name: 'Alice Johnson', student_id: 'STU001', status: 'present', time: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  { id: 2, student_name: 'Bob Smith', student_id: 'STU002', status: 'present', time: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
  { id: 3, student_name: 'Carol Williams', student_id: 'STU003', status: 'late', time: new Date(Date.now() - 1000 * 60 * 25).toISOString() },
]

// TODO: Replace with actual API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

/**
 * Fetch today's attendance summary
 * TODO: Replace with actual API call: GET /api/teacher/today/summary
 */
export async function fetchTodaySummary() {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300))
  
  const total = MOCK_STUDENTS.length
  const present = MOCK_ATTENDANCE.filter(a => a.status === 'present').length
  const late = MOCK_ATTENDANCE.filter(a => a.status === 'late').length
  const absent = MOCK_ATTENDANCE.filter(a => a.status === 'absent').length
  const percentage = Math.round(((present + late) / total) * 100)
  
  return {
    total,
    present,
    late,
    absent,
    percentage,
    date: new Date().toISOString().split('T')[0]
  }
}

/**
 * Fetch all students
 * TODO: Replace with actual API call: GET /api/teacher/students
 */
export async function fetchStudents() {
  await new Promise(resolve => setTimeout(resolve, 300))
  return MOCK_STUDENTS
}

/**
 * Fetch today's attendance records
 * TODO: Replace with actual API call: GET /api/teacher/attendance/today
 */
export async function fetchTodayAttendance() {
  await new Promise(resolve => setTimeout(resolve, 300))
  return MOCK_ATTENDANCE
}

/**
 * Mark attendance manually
 * TODO: Replace with actual API call: POST /api/teacher/attendance/mark
 * @param {number} studentId - Student ID
 * @param {string} status - Status: 'present', 'late', or 'absent'
 * @param {string} note - Optional reason/note
 */
export async function markAttendance(studentId, status, note = '') {
  await new Promise(resolve => setTimeout(resolve, 300))
  
  // In real implementation, send to backend
  console.log(`Marking student ${studentId} as ${status} with note: ${note}`)
  
  return { success: true, studentId, status, note }
}

/**
 * Export attendance to CSV
 * TODO: Replace with actual API call: GET /api/teacher/attendance/export
 */
export async function exportAttendanceCSV(filteredData = null) {
  await new Promise(resolve => setTimeout(resolve, 300))
  
  const dataToExport = filteredData || MOCK_ATTENDANCE
  
  // Generate CSV content
  const headers = ['Student ID', 'Name', 'Program', 'Status', 'Last Scan Time', 'Note']
  const rows = dataToExport.map(record => {
    const student = MOCK_STUDENTS.find(s => s.student_id === record.student_id)
    return [
      record.student_id,
      student?.name || '',
      student?.program || '',
      record.status,
      record.scan_time ? new Date(record.scan_time).toLocaleString() : 'N/A',
      record.note || ''
    ].map(field => `"${field}"`).join(',')
  })
  
  const csvContent = [headers.join(','), ...rows].join('\n')
  
  // Trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `attendance-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
  
  return { success: true }
}

/**
 * Subscribe to live attendance updates
 * TODO: Replace with actual WebSocket connection to /api/ws/attendance-live
 * For now, simulates live updates with setInterval
 */
export function subscribeToLiveUpdates(callback) {
  // Simulate occasional new scan
  const interval = setInterval(() => {
    if (Math.random() > 0.7) {
      const randomStudent = MOCK_STUDENTS[Math.floor(Math.random() * MOCK_STUDENTS.length)]
      callback({
        student_name: randomStudent.name,
        student_id: randomStudent.student_id,
        status: 'present',
        time: new Date().toISOString()
      })
    }
  }, 10000)
  
  return () => clearInterval(interval)
}
