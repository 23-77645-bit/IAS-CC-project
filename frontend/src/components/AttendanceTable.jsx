import { useState } from 'react'
import PropTypes from 'prop-types'

/**
 * AttendanceTable Component
 * Main table showing student attendance with search, filter, and actions
 */
function AttendanceTable({ 
  students, 
  attendanceRecords, 
  loading, 
  error,
  onMarkAttendance,
  onExportCSV 
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [editingId, setEditingId] = useState(null)
  const [noteInput, setNoteInput] = useState('')

  // Combine student data with attendance records
  const combinedData = students.map(student => {
    const record = attendanceRecords.find(r => r.student_id === student.student_id)
    return {
      ...student,
      status: record?.status || 'absent',
      scan_time: record?.scan_time,
      note: record?.note || '',
    }
  })

  // Filter data based on search and status
  const filteredData = combinedData.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || student.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const handleMarkStatus = (studentId, status) => {
    onMarkAttendance(studentId, status, noteInput)
    setEditingId(null)
    setNoteInput('')
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return '—'
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'present': return 'badge-present'
      case 'late': return 'badge-late'
      case 'absent': return 'badge-absent'
      default: return 'badge-pending'
    }
  }

  if (loading) {
    return (
      <section className="attendance-table-section">
        <div className="table-loading">Loading attendance data...</div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="attendance-table-section">
        <div className="table-error">⚠️ {error}</div>
      </section>
    )
  }

  return (
    <section className="attendance-table-section" aria-label="Student Attendance">
      {/* Header with Search and Export */}
      <div className="table-header">
        <div className="search-container">
          <input
            type="text"
            placeholder="🔍 Search by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            aria-label="Search students"
          />
        </div>
        
        <div className="table-actions">
          <button 
            onClick={() => onExportCSV(filteredData)}
            className="btn-export"
            disabled={filteredData.length === 0}
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Status Filter */}
      <div className="status-filter" role="group" aria-label="Filter by status">
        {['all', 'present', 'late', 'absent'].map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`status-filter-btn ${statusFilter === filter ? 'active' : ''}`}
            aria-pressed={statusFilter === filter}
          >
            {filter === 'all' && 'All'}
            {filter === 'present' && '🟢 Present'}
            {filter === 'late' && '🟡 Late'}
            {filter === 'absent' && '🔴 Absent'}
          </button>
        ))}
      </div>

      {/* Results count */}
      <div className="table-results-count">
        Showing {filteredData.length} of {students.length} students
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="attendance-table" role="grid">
          <thead>
            <tr>
              <th scope="col">Student ID</th>
              <th scope="col">Name</th>
              <th scope="col">Program</th>
              <th scope="col">Status</th>
              <th scope="col">Last Scan</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="6" className="table-empty">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'No students match your filters' 
                    : 'No students found'}
                </td>
              </tr>
            ) : (
              filteredData.map((student) => (
                <tr key={student.id} className={editingId === student.id ? 'editing' : ''}>
                  <td>{student.student_id}</td>
                  <td className="name-cell">{student.name}</td>
                  <td>{student.program}</td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(student.status)}`}>
                      {student.status}
                    </span>
                  </td>
                  <td>{formatTime(student.scan_time)}</td>
                  <td className="actions-cell">
                    {editingId === student.id ? (
                      <div className="edit-actions">
                        <select
                          value={student.status}
                          onChange={(e) => handleMarkStatus(student.id, e.target.value)}
                          className="status-select"
                          autoFocus
                        >
                          <option value="present">Present</option>
                          <option value="late">Late</option>
                          <option value="absent">Absent</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Add note..."
                          value={noteInput}
                          onChange={(e) => setNoteInput(e.target.value)}
                          className="note-input"
                          onKeyDown={(e) => e.key === 'Enter' && handleMarkStatus(student.id, student.status)}
                        />
                        <button 
                          onClick={() => { setEditingId(null); setNoteInput('') }}
                          className="btn-cancel"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="view-actions">
                        <button
                          onClick={() => setEditingId(student.id)}
                          className="btn-edit"
                          aria-label={`Edit attendance for ${student.name}`}
                        >
                          ✏️ Mark
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

AttendanceTable.propTypes = {
  students: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      student_id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      program: PropTypes.string.isRequired,
      email: PropTypes.string,
    })
  ).isRequired,
  attendanceRecords: PropTypes.arrayOf(
    PropTypes.shape({
      student_id: PropTypes.string.isRequired,
      status: PropTypes.oneOf(['present', 'late', 'absent']).isRequired,
      scan_time: PropTypes.string,
      note: PropTypes.string,
    })
  ),
  loading: PropTypes.bool,
  error: PropTypes.string,
  onMarkAttendance: PropTypes.func.isRequired,
  onExportCSV: PropTypes.func.isRequired,
}

AttendanceTable.defaultProps = {
  attendanceRecords: [],
  loading: false,
  error: null,
}

export default AttendanceTable
