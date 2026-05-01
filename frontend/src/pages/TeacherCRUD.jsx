import { useState, useEffect } from 'react'
import { 
  fetchCourses, 
  createCourse, 
  updateCourse, 
  deleteCourse,
  fetchStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  uploadStudents
} from '../services/api'

/**
 * TeacherCRUD Component
 * Provides Create, Read, Update, Delete operations for teachers
 * Separate from student QR scanning interface
 */
function TeacherCRUD() {
  const [activeTab, setActiveTab] = useState('courses') // 'courses' or 'students'
  
  // Course state
  const [courses, setCourses] = useState([])
  const [courseForm, setCourseForm] = useState({ name: '', code: '', semester: '' })
  const [editingCourse, setEditingCourse] = useState(null)
  const [showCourseForm, setShowCourseForm] = useState(false)
  
  // Student state
  const [students, setStudents] = useState([])
  const [studentForm, setStudentForm] = useState({ student_id: '', name: '', email: '', program: '' })
  const [editingStudent, setEditingStudent] = useState(null)
  const [showStudentForm, setShowStudentForm] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [uploadFile, setUploadFile] = useState(null)
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  // Load data based on active tab
  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (activeTab === 'courses') {
        const data = await fetchCourses()
        setCourses(data)
      } else {
        const data = await fetchStudents()
        setStudents(data)
      }
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('Failed to load data. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  const showSuccess = (message) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  // Course CRUD Operations
  const handleCreateCourse = async (e) => {
    e.preventDefault()
    try {
      await createCourse(courseForm)
      showSuccess('✓ Course created successfully')
      setCourseForm({ name: '', code: '', semester: '' })
      setShowCourseForm(false)
      loadData()
    } catch (err) {
      setError('Failed to create course: ' + err.message)
    }
  }

  const handleUpdateCourse = async (e) => {
    e.preventDefault()
    try {
      await updateCourse(editingCourse.id, courseForm)
      showSuccess('✓ Course updated successfully')
      setEditingCourse(null)
      setCourseForm({ name: '', code: '', semester: '' })
      setShowCourseForm(false)
      loadData()
    } catch (err) {
      setError('Failed to update course: ' + err.message)
    }
  }

  const handleDeleteCourse = async (courseId) => {
    if (!confirm('Are you sure you want to delete this course? This will also delete all associated sessions and enrollments.')) {
      return
    }
    try {
      await deleteCourse(courseId)
      showSuccess('✓ Course deleted successfully')
      loadData()
    } catch (err) {
      setError('Failed to delete course: ' + err.message)
    }
  }

  const startEditCourse = (course) => {
    setCourseForm({ 
      name: course.course_name, 
      code: course.course_code, 
      semester: course.semester || '' 
    })
    setEditingCourse(course)
    setShowCourseForm(true)
  }

  // Student CRUD Operations
  const handleCreateStudent = async (e) => {
    e.preventDefault()
    try {
      await createStudent(studentForm)
      showSuccess('✓ Student added successfully')
      setStudentForm({ student_id: '', name: '', email: '', program: '' })
      setShowStudentForm(false)
      loadData()
    } catch (err) {
      setError('Failed to add student: ' + err.message)
    }
  }

  const handleUpdateStudent = async (e) => {
    e.preventDefault()
    try {
      await updateStudent(editingStudent.id, studentForm)
      showSuccess('✓ Student updated successfully')
      setEditingStudent(null)
      setStudentForm({ student_id: '', name: '', email: '', program: '' })
      setShowStudentForm(false)
      loadData()
    } catch (err) {
      setError('Failed to update student: ' + err.message)
    }
  }

  const handleDeleteStudent = async (studentId) => {
    if (!confirm('Are you sure you want to delete this student? This will remove all their enrollment records.')) {
      return
    }
    try {
      await deleteStudent(studentId)
      showSuccess('✓ Student deleted successfully')
      loadData()
    } catch (err) {
      setError('Failed to delete student: ' + err.message)
    }
  }

  const startEditStudent = (student) => {
    setStudentForm({ 
      student_id: student.student_id, 
      name: student.name, 
      email: student.email, 
      program: student.program || '' 
    })
    setEditingStudent(student)
    setShowStudentForm(true)
  }

  const handleFileUpload = async () => {
    if (!uploadFile) {
      setError('Please select a file to upload')
      return
    }
    
    try {
      setLoading(true)
      const result = await uploadStudents(uploadFile)
      showSuccess(`✓ ${result.count || 'Students'} uploaded successfully`)
      setUploadFile(null)
      setShowUploadForm(false)
      loadData()
    } catch (err) {
      setError('Failed to upload students: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const cancelForm = () => {
    setEditingCourse(null)
    setEditingStudent(null)
    setCourseForm({ name: '', code: '', semester: '' })
    setStudentForm({ student_id: '', name: '', email: '', program: '' })
    setUploadFile(null)
    setShowCourseForm(false)
    setShowStudentForm(false)
    setShowUploadForm(false)
  }

  return (
    <div className="teacher-crud">
      {/* Header */}
      <header className="crud-header">
        <h1>👨‍🏫 Teacher Management Portal</h1>
        <p>Manage courses and students - Separate from student QR scanning</p>
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

      {/* Tab Navigation */}
      <div className="crud-tabs">
        <button 
          className={`tab-btn ${activeTab === 'courses' ? 'active' : ''}`}
          onClick={() => setActiveTab('courses')}
        >
          📚 Courses
        </button>
        <button 
          className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => setActiveTab('students')}
        >
          👥 Students
        </button>
      </div>

      {/* Main Content */}
      <main className="crud-main">
        {loading && <div className="loading">Loading...</div>}

        {/* Courses Tab */}
        {activeTab === 'courses' && (
          <section className="crud-section">
            <div className="section-header">
              <h2>Course Management</h2>
              <button 
                className="btn-primary"
                onClick={() => {
                  setEditingCourse(null)
                  setCourseForm({ name: '', code: '', semester: '' })
                  setShowCourseForm(!showCourseForm)
                }}
              >
                {showCourseForm ? '✕ Cancel' : '+ Add Course'}
              </button>
            </div>

            {/* Course Form */}
            {showCourseForm && (
              <form onSubmit={editingCourse ? handleUpdateCourse : handleCreateCourse} className="crud-form">
                <h3>{editingCourse ? 'Edit Course' : 'Add New Course'}</h3>
                <div className="form-group">
                  <label htmlFor="course-name">Course Name *</label>
                  <input
                    id="course-name"
                    type="text"
                    required
                    value={courseForm.name}
                    onChange={(e) => setCourseForm({...courseForm, name: e.target.value})}
                    placeholder="e.g., Introduction to Computer Science"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="course-code">Course Code *</label>
                  <input
                    id="course-code"
                    type="text"
                    required
                    value={courseForm.code}
                    onChange={(e) => setCourseForm({...courseForm, code: e.target.value})}
                    placeholder="e.g., CS101"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="course-semester">Semester</label>
                  <input
                    id="course-semester"
                    type="text"
                    value={courseForm.semester}
                    onChange={(e) => setCourseForm({...courseForm, semester: e.target.value})}
                    placeholder="e.g., Fall 2024"
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary">
                    {editingCourse ? 'Update Course' : 'Create Course'}
                  </button>
                  <button type="button" onClick={cancelForm} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Courses List */}
            <div className="crud-list">
              {courses.length === 0 ? (
                <p className="empty-message">No courses found. Add your first course!</p>
              ) : (
                <table className="crud-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Semester</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((course) => (
                      <tr key={course.id}>
                        <td><strong>{course.course_code}</strong></td>
                        <td>{course.course_name}</td>
                        <td>{course.semester || '—'}</td>
                        <td className="actions">
                          <button 
                            className="btn-edit-small"
                            onClick={() => startEditCourse(course)}
                          >
                            ✏️ Edit
                          </button>
                          <button 
                            className="btn-delete-small"
                            onClick={() => handleDeleteCourse(course.id)}
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <section className="crud-section">
            <div className="section-header">
              <h2>Student Management</h2>
              <div className="action-buttons">
                <button 
                  className="btn-primary"
                  onClick={() => {
                    setEditingStudent(null)
                    setStudentForm({ student_id: '', name: '', email: '', program: '' })
                    setShowStudentForm(!showStudentForm)
                    setShowUploadForm(false)
                  }}
                >
                  {showStudentForm ? '✕ Cancel' : '+ Add Student'}
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => {
                    setUploadFile(null)
                    setShowUploadForm(!showUploadForm)
                    setShowStudentForm(false)
                  }}
                >
                  {showUploadForm ? '✕ Cancel' : '📁 Upload File'}
                </button>
              </div>
            </div>

            {/* Manual Student Form */}
            {showStudentForm && (
              <form onSubmit={editingStudent ? handleUpdateStudent : handleCreateStudent} className="crud-form">
                <h3>{editingStudent ? 'Edit Student' : 'Add New Student Manually'}</h3>
                <div className="form-group">
                  <label htmlFor="student-id">Student ID *</label>
                  <input
                    id="student-id"
                    type="text"
                    required
                    value={studentForm.student_id}
                    onChange={(e) => setStudentForm({...studentForm, student_id: e.target.value})}
                    placeholder="e.g., STU001"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="student-name">Full Name *</label>
                  <input
                    id="student-name"
                    type="text"
                    required
                    value={studentForm.name}
                    onChange={(e) => setStudentForm({...studentForm, name: e.target.value})}
                    placeholder="e.g., John Doe"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="student-email">Email *</label>
                  <input
                    id="student-email"
                    type="email"
                    required
                    value={studentForm.email}
                    onChange={(e) => setStudentForm({...studentForm, email: e.target.value})}
                    placeholder="e.g., john@example.com"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="student-program">Program</label>
                  <input
                    id="student-program"
                    type="text"
                    value={studentForm.program}
                    onChange={(e) => setStudentForm({...studentForm, program: e.target.value})}
                    placeholder="e.g., Computer Science"
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary">
                    {editingStudent ? 'Update Student' : 'Add Student'}
                  </button>
                  <button type="button" onClick={cancelForm} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* File Upload Form */}
            {showUploadForm && (
              <div className="crud-form">
                <h3>📁 Upload Students from File</h3>
                <p className="upload-instructions">
                  Upload a CSV or Excel file containing student data. 
                  Required columns: <strong>student_id</strong>, <strong>name</strong>, <strong>email</strong>
                  Optional: <strong>program</strong>
                </p>
                <div className="form-group">
                  <label htmlFor="file-upload">Select File *</label>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                  />
                  {uploadFile && (
                    <p className="file-info">Selected: <strong>{uploadFile.name}</strong></p>
                  )}
                </div>
                <div className="form-actions">
                  <button 
                    type="button" 
                    onClick={handleFileUpload}
                    className="btn-primary"
                    disabled={!uploadFile || loading}
                  >
                    {loading ? '⏳ Uploading...' : '📤 Upload Students'}
                  </button>
                  <button type="button" onClick={cancelForm} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Students List */}
            <div className="crud-list">
              {students.length === 0 ? (
                <p className="empty-message">No students found. Add your first student!</p>
              ) : (
                <table className="crud-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Program</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id}>
                        <td><strong>{student.student_id}</strong></td>
                        <td>{student.name}</td>
                        <td>{student.email || '—'}</td>
                        <td>{student.program || '—'}</td>
                        <td className="actions">
                          <button 
                            className="btn-edit-small"
                            onClick={() => startEditStudent(student)}
                          >
                            ✏️ Edit
                          </button>
                          <button 
                            className="btn-delete-small"
                            onClick={() => handleDeleteStudent(student.id)}
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Footer Note */}
      <footer className="crud-footer">
        <p>📝 Teacher CRUD Portal | For student QR scanning, use the Scanner page</p>
      </footer>

      <style jsx>{`
        .teacher-crud {
          min-height: 100vh;
          background: #f5f7fa;
        }
        
        .crud-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 2rem;
          text-align: center;
        }
        
        .crud-header h1 {
          margin: 0 0 0.5rem 0;
          font-size: 2rem;
        }
        
        .crud-header p {
          margin: 0;
          opacity: 0.9;
        }
        
        .notification {
          padding: 1rem 2rem;
          position: relative;
          animation: slideDown 0.3s ease;
        }
        
        .notification-success {
          background: #d4edda;
          color: #155724;
          border-left: 4px solid #28a745;
        }
        
        .notification-error {
          background: #f8d7da;
          color: #721c24;
          border-left: 4px solid #dc3545;
        }
        
        .notification-close {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          opacity: 0.7;
        }
        
        .crud-tabs {
          display: flex;
          justify-content: center;
          gap: 1rem;
          padding: 1.5rem;
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .tab-btn {
          padding: 0.75rem 2rem;
          border: 2px solid #e0e0e0;
          background: white;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .tab-btn:hover {
          border-color: #667eea;
          color: #667eea;
        }
        
        .tab-btn.active {
          background: #667eea;
          color: white;
          border-color: #667eea;
        }
        
        .crud-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }
        
        .loading {
          text-align: center;
          padding: 3rem;
          font-size: 1.2rem;
          color: #666;
        }
        
        .crud-section {
          background: white;
          border-radius: 1rem;
          padding: 2rem;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        
        .section-header h2 {
          margin: 0;
          color: #333;
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }
        
        .btn-primary {
          background: #667eea;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .btn-primary:hover {
          background: #5568d3;
        }
        
        .btn-secondary {
          background: #e0e0e0;
          color: #333;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .btn-secondary:hover {
          background: #d0d0d0;
        }
        
        .crud-form {
          background: #f8f9fa;
          padding: 2rem;
          border-radius: 0.5rem;
          margin-bottom: 2rem;
          border: 2px solid #e0e0e0;
        }
        
        .crud-form h3 {
          margin: 0 0 1.5rem 0;
          color: #333;
        }
        
        .form-group {
          margin-bottom: 1.5rem;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: #555;
        }
        
        .form-group input {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e0e0e0;
          border-radius: 0.5rem;
          font-size: 1rem;
          transition: border-color 0.2s;
        }
        
        .form-group input:focus {
          outline: none;
          border-color: #667eea;
        }
        
        .form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .upload-instructions {
          background: #e8f4fd;
          padding: 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1.5rem;
          color: #0c5460;
          font-size: 0.9rem;
        }

        .file-info {
          margin-top: 0.5rem;
          color: #28a745;
          font-size: 0.9rem;
        }
        
        .crud-list {
          margin-top: 2rem;
        }
        
        .empty-message {
          text-align: center;
          padding: 3rem;
          color: #666;
          font-style: italic;
        }
        
        .crud-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .crud-table th,
        .crud-table td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .crud-table th {
          background: #f8f9fa;
          font-weight: 600;
          color: #555;
        }
        
        .crud-table tr:hover {
          background: #f8f9fa;
        }
        
        .actions {
          display: flex;
          gap: 0.5rem;
        }
        
        .btn-edit-small,
        .btn-delete-small {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.25rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        
        .btn-edit-small {
          background: #ffc107;
          color: #333;
        }
        
        .btn-delete-small {
          background: #dc3545;
          color: white;
        }
        
        .btn-edit-small:hover,
        .btn-delete-small:hover {
          opacity: 0.8;
        }
        
        .crud-footer {
          text-align: center;
          padding: 2rem;
          color: #666;
          font-size: 0.875rem;
        }
        
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @media (max-width: 768px) {
          .section-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }
          
          .crud-table {
            font-size: 0.875rem;
          }
          
          .crud-table th,
          .crud-table td {
            padding: 0.75rem 0.5rem;
          }
          
          .actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  )
}

export default TeacherCRUD
