import { useState, useEffect, useCallback } from 'react'
import SummaryCards from '../components/SummaryCards'
import LiveFeed from '../components/LiveFeed'
import AttendanceTable from '../components/AttendanceTable'
import { 
  fetchTodaySummary, 
  fetchStudents, 
  fetchTodayAttendance, 
  markAttendance, 
  exportAttendanceCSV,
  subscribeToLiveUpdates 
} from '../services/api'

/**
 * TeacherDashboard Component
 * Main dashboard page for teachers to monitor and manage attendance
 */
function TeacherDashboard() {
  // State
  const [summary, setSummary] = useState({ total: 0, present: 0, late: 0, absent: 0, percentage: 0 })
  const [students, setStudents] = useState([])
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [liveActivities, setLiveActivities] = useState([])
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  /**
   * Load initial data
   * TODO: Replace mock API calls with actual FastAPI endpoints
   */
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch all data in parallel
      const [summaryData, studentsData, attendanceData] = await Promise.all([
        fetchTodaySummary(),
        fetchStudents(),
        fetchTodayAttendance(),
      ])
      
      setSummary(summaryData)
      setStudents(studentsData)
      setAttendanceRecords(attendanceData)
      
      // Initialize live activities from attendance data
      const activities = attendanceData
        .filter(r => r.scan_time)
        .map(r => {
          const student = studentsData.find(s => s.student_id === r.student_id)
          return {
            id: r.id,
            student_name: student?.name || 'Unknown',
            student_id: r.student_id,
            status: r.status,
            time: r.scan_time,
          }
        })
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 10)
      
      setLiveActivities(activities)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setError('Failed to load attendance data. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadData()
  }, [loadData])

  // Subscribe to live updates
  useEffect(() => {
    // TODO: Replace with actual WebSocket connection
    const unsubscribe = subscribeToLiveUpdates((newActivity) => {
      setLiveActivities(prev => [newActivity, ...prev].slice(0, 10))
    })
    
    return () => unsubscribe()
  }, [])

  /**
   * Handle manual attendance marking
   * TODO: Connect to actual backend endpoint
   */
  const handleMarkAttendance = async (studentId, status, note = '') => {
    try {
      await markAttendance(studentId, status, note)
      
      // Update local state optimistically
      setAttendanceRecords(prev => {
        const existing = prev.find(r => r.student_id === studentId)
        if (existing) {
          return prev.map(r => 
            r.student_id === studentId 
              ? { ...r, status, note, scan_time: new Date().toISOString() }
              : r
          )
        } else {
          return [...prev, { student_id: studentId, status, note, scan_time: new Date().toISOString() }]
        }
      })
      
      // Update summary
      setSummary(prev => {
        const oldRecord = attendanceRecords.find(r => r.student_id === studentId)
        const oldStatus = oldRecord?.status
        const newSummary = { ...prev }
        
        if (oldStatus && oldStatus !== status) {
          newSummary[oldStatus] = Math.max(0, newSummary[oldStatus] - 1)
        }
        if (!oldStatus || oldStatus !== status) {
          newSummary[status] = newSummary[status] + 1
        }
        
        newSummary.percentage = Math.round(((newSummary.present + newSummary.late) / newSummary.total) * 100)
        return newSummary
      })
      
      setSuccessMessage(`✓ Marked as ${status}`)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Failed to mark attendance:', err)
      setError('Failed to update attendance. Please try again.')
      setTimeout(() => setError(null), 5000)
    }
  }

  /**
   * Handle CSV export
   * TODO: Connect to actual backend endpoint
   */
  const handleExportCSV = async (filteredData) => {
    try {
      await exportAttendanceCSV(filteredData)
      setSuccessMessage('✓ CSV exported successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Failed to export CSV:', err)
      setError('Failed to export CSV. Please try again.')
      setTimeout(() => setError(null), 5000)
    }
  }

  return (
    <div className="teacher-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1 className="dashboard-title">👨‍🏫 Teacher Dashboard</h1>
          <p className="dashboard-subtitle">Monitor and manage today's attendance</p>
          <div className="header-date">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
      </header>

      {/* Notifications */}
      {successMessage && (
        <div className="notification notification-success" role="alert">
          {successMessage}
        </div>
      )}
      
      {error && (
        <div className="notification notification-error" role="alert">
          ⚠️ {error}
          <button onClick={() => setError(null)} className="notification-close">×</button>
        </div>
      )}

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Top Section: Summary Cards + Live Feed */}
        <div className="dashboard-top-grid">
          <div className="summary-section">
            <SummaryCards 
              summary={summary} 
              loading={loading}
              error={error}
            />
          </div>
          
          <div className="live-feed-section">
            <LiveFeed 
              activities={liveActivities}
              loading={loading}
            />
          </div>
        </div>

        {/* Bottom Section: Attendance Table */}
        <div className="table-section">
          <AttendanceTable
            students={students}
            attendanceRecords={attendanceRecords}
            loading={loading}
            error={error}
            onMarkAttendance={handleMarkAttendance}
            onExportCSV={handleExportCSV}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="dashboard-footer">
        <p>Attendance Management System • Teacher Portal</p>
      </footer>
    </div>
  )
}

export default TeacherDashboard
