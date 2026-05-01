import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Status styles configuration
const statusStyles = {
  present: { bg: 'bg-green-100', text: 'text-green-800', icon: '🟢', label: 'Present' },
  late: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '🟡', label: 'Late' },
  absent: { bg: 'bg-red-100', text: 'text-red-800', icon: '🔴', label: 'Absent' },
  pending: { bg: 'bg-gray-100', text: 'text-gray-800', icon: '⚪', label: 'Pending' },
}

function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [students, setStudents] = useState([])
  const [sessions, setSessions] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [attendanceData, setAttendanceData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  
  // Upload state
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadPreview, setUploadPreview] = useState(null)
  const [uploading, setUploading] = useState(false)

  // Fetch courses on mount
  useEffect(() => {
    fetchCourses()
  }, [])

  // Fetch sessions when course selected
  useEffect(() => {
    if (selectedCourse) {
      fetchSessions(selectedCourse.id)
      fetchStudents(selectedCourse.id)
    }
  }, [selectedCourse])

  // Poll for live attendance updates when session is active
  useEffect(() => {
    let interval
    if (activeSession && activeSession.status === 'active') {
      interval = setInterval(() => {
        fetchAttendance(activeSession.id)
      }, 5000) // Poll every 5 seconds
    }
    return () => clearInterval(interval)
  }, [activeSession])

  const fetchCourses = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/teacher/courses`)
      setCourses(response.data.courses || [])
    } catch (err) {
      console.error('Failed to fetch courses:', err)
    }
  }

  const fetchSessions = async (courseId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/teacher/courses/${courseId}/sessions`)
      setSessions(response.data.sessions || [])
    } catch (err) {
      console.error('Failed to fetch sessions:', err)
    }
  }

  const fetchStudents = async (courseId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/teacher/courses/${courseId}/students`)
      setStudents(response.data.students || [])
    } catch (err) {
      console.error('Failed to fetch students:', err)
    }
  }

  const fetchAttendance = async (sessionId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/teacher/sessions/${sessionId}/attendance`)
      setAttendanceData(response.data.attendance || [])
    } catch (err) {
      console.error('Failed to fetch attendance:', err)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setUploadFile(file)
      previewUpload(file)
    }
  }

  const previewUpload = async (file) => {
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('course_id', selectedCourse.id)
      
      const response = await axios.post(`${API_BASE_URL}/teacher/upload-students/preview`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setUploadPreview(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to preview file')
    } finally {
      setUploading(false)
    }
  }

  const confirmUpload = async () => {
    if (!uploadPreview) return
    
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('course_id', selectedCourse.id)
      
      const response = await axios.post(`${API_BASE_URL}/teacher/upload-students`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setSuccessMessage(`Successfully uploaded ${response.data.uploaded} students!`)
      setUploadPreview(null)
      setUploadFile(null)
      fetchStudents(selectedCourse.id)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload students')
    } finally {
      setUploading(false)
    }
  }

  const sendQREmails = async () => {
    if (!selectedCourse) return
    
    setLoading(true)
    setError('')
    try {
      const response = await axios.post(`${API_BASE_URL}/teacher/courses/${selectedCourse.id}/send-qr-emails`)
      setSuccessMessage(`Emails sent to ${response.data.sent} students!`)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send emails')
    } finally {
      setLoading(false)
    }
  }

  const createSession = async () => {
    if (!selectedCourse) return
    
    setLoading(true)
    setError('')
    try {
      const response = await axios.post(`${API_BASE_URL}/teacher/sessions`, {
        course_id: selectedCourse.id,
        duration_minutes: 60,
        late_threshold_minutes: 15
      })
      setActiveSession(response.data.session)
      setSuccessMessage('Session started successfully!')
      fetchSessions(selectedCourse.id)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create session')
    } finally {
      setLoading(false)
    }
  }

  const endSession = async (sessionId) => {
    setLoading(true)
    setError('')
    try {
      await axios.post(`${API_BASE_URL}/teacher/sessions/${sessionId}/end`)
      setActiveSession(null)
      setSuccessMessage('Session ended successfully!')
      fetchSessions(selectedCourse.id)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to end session')
    } finally {
      setLoading(false)
    }
  }

  const exportAttendance = async (sessionId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/teacher/sessions/${sessionId}/export`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `attendance-${sessionId}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      setError('Failed to export attendance')
    }
  }

  const markManualAttendance = async (studentId, status) => {
    if (!activeSession) return
    
    try {
      await axios.post(`${API_BASE_URL}/teacher/sessions/${activeSession.id}/attendance/manual`, {
        student_id: studentId,
        status: status
      })
      fetchAttendance(activeSession.id)
      setSuccessMessage('Attendance updated!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError('Failed to update attendance')
    }
  }

  const getStats = useCallback(() => {
    const total = students.length
    const present = attendanceData.filter(a => a.status === 'present').length
    const late = attendanceData.filter(a => a.status === 'late').length
    const absent = total - present - late
    return { total, present, late, absent }
  }, [students, attendanceData])

  const stats = getStats()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">📚 Teacher Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage courses, students, and attendance</p>
        </div>
      </header>

      {/* Notifications */}
      {successMessage && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            ✓ {successMessage}
          </div>
        </div>
      )}
      {error && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            ✗ {error}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Course Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Course</label>
          <select
            value={selectedCourse?.id || ''}
            onChange={(e) => {
              const course = courses.find(c => c.id === parseInt(e.target.value))
              setSelectedCourse(course || null)
              setActiveSession(null)
              setAttendanceData([])
            }}
            className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose a course...</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>
                {course.code} - {course.name} ({course.section})
              </option>
            ))}
          </select>
        </div>

        {selectedCourse && (
          <>
            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
              {['dashboard', 'students', 'sessions'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 font-medium capitalize ${
                    activeTab === tab
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
                    <div className="text-gray-600">Total Students</div>
                  </div>
                  <div className="bg-green-50 p-6 rounded-lg shadow">
                    <div className="text-3xl font-bold text-green-600">{stats.present}</div>
                    <div className="text-green-800">Present</div>
                  </div>
                  <div className="bg-yellow-50 p-6 rounded-lg shadow">
                    <div className="text-3xl font-bold text-yellow-600">{stats.late}</div>
                    <div className="text-yellow-800">Late</div>
                  </div>
                  <div className="bg-red-50 p-6 rounded-lg shadow">
                    <div className="text-3xl font-bold text-red-600">{stats.absent}</div>
                    <div className="text-red-800">Absent</div>
                  </div>
                </div>

                {/* Active Session Controls */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-semibold mb-4">Session Control</h2>
                  {activeSession ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-green-600 font-semibold">● Session Active</div>
                          <div className="text-gray-600 text-sm">
                            Started: {new Date(activeSession.start_time).toLocaleString()}
                          </div>
                        </div>
                        <div className="space-x-2">
                          <button
                            onClick={() => endSession(activeSession.id)}
                            disabled={loading}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                          >
                            End Session
                          </button>
                          <button
                            onClick={() => exportAttendance(activeSession.id)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            Export CSV
                          </button>
                        </div>
                      </div>
                      
                      {/* Live Attendance List */}
                      <div className="mt-4">
                        <h3 className="font-medium mb-2">Live Attendance ({attendanceData.length}/{stats.total})</h3>
                        <div className="max-h-64 overflow-y-auto">
                          {attendanceData.map(record => (
                            <div key={record.id} className="flex items-center justify-between py-2 border-b">
                              <div className="flex items-center space-x-3">
                                <span>{statusStyles[record.status]?.icon}</span>
                                <span className="font-medium">{record.student_name}</span>
                              </div>
                              <div className="text-sm text-gray-600">
                                {new Date(record.scan_time).toLocaleTimeString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={createSession}
                      disabled={loading || students.length === 0}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      🚀 Start Attendance Session
                    </button>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => setActiveTab('students')}
                      className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
                    >
                      <div className="text-2xl mb-2">👥</div>
                      <div className="font-medium">Manage Students</div>
                      <div className="text-sm text-gray-600">{students.length} enrolled</div>
                    </button>
                    <button
                      onClick={() => setActiveTab('sessions')}
                      className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition"
                    >
                      <div className="text-2xl mb-2">📅</div>
                      <div className="font-medium">View Sessions</div>
                      <div className="text-sm text-gray-600">{sessions.length} sessions</div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Students Tab */}
            {activeTab === 'students' && (
              <div className="space-y-6">
                {/* Upload Section */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-semibold mb-4">Import Students</h2>
                  <div className="mb-4">
                    <input
                      type="file"
                      accept=".csv,.xlsx"
                      onChange={handleFileSelect}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  
                  {uploadPreview && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-medium mb-2">Preview:</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>✓ Valid: {uploadPreview.valid_count || 0}</div>
                        <div>✗ Invalid: {uploadPreview.invalid_count || 0}</div>
                      </div>
                      {uploadPreview.invalid_rows && uploadPreview.invalid_rows.length > 0 && (
                        <div className="mt-2 text-red-600 text-sm">
                          <strong>Errors:</strong>
                          <ul className="list-disc list-inside">
                            {uploadPreview.invalid_rows.slice(0, 5).map((row, i) => (
                              <li key={i}>{row.error} (Row {row.row})</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <button
                        onClick={confirmUpload}
                        disabled={uploading || uploadPreview.valid_count === 0}
                        className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {uploading ? 'Uploading...' : `Confirm Upload (${uploadPreview.valid_count} students)`}
                      </button>
                    </div>
                  )}
                </div>

                {/* Send QR Emails */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-semibold mb-4">Distribute QR Codes</h2>
                  <p className="text-gray-600 mb-4">
                    Send personalized QR codes to all enrolled students via email.
                  </p>
                  <button
                    onClick={sendQREmails}
                    disabled={loading || students.length === 0}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    📧 Send QR Codes to {students.length} Students
                  </button>
                </div>

                {/* Student List */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-semibold mb-4">Enrolled Students ({students.length})</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student ID</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {students.map(student => (
                          <tr key={student.id}>
                            <td className="px-4 py-3 whitespace-nowrap">{student.name}</td>
                            <td className="px-4 py-3 whitespace-nowrap">{student.student_id}</td>
                            <td className="px-4 py-3 whitespace-nowrap">{student.email}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                student.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {student.active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Sessions Tab */}
            {activeTab === 'sessions' && (
              <div className="space-y-4">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-semibold mb-4">Session History</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Time</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Time</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {sessions.map(session => (
                          <tr key={session.id}>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {new Date(session.start_time).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {new Date(session.start_time).toLocaleTimeString()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {session.end_time ? new Date(session.end_time).toLocaleTimeString() : '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                session.status === 'active' ? 'bg-green-100 text-green-800' :
                                session.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {session.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {session.status === 'closed' && (
                                <button
                                  onClick={() => exportAttendance(session.id)}
                                  className="text-blue-600 hover:text-blue-800 text-sm"
                                >
                                  Download CSV
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {!selectedCourse && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👨‍🏫</div>
            <h2 className="text-2xl font-semibold text-gray-700">Select a Course to Get Started</h2>
            <p className="text-gray-600 mt-2">Choose a course from the dropdown above to manage students and attendance</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default TeacherDashboard
