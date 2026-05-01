// Dashboard JavaScript - Vanilla JS, no frameworks

// Sample data storage
let students = [
    { id: 1, name: 'John Doe', email: 'john@example.com', course: 'Mathematics', status: 'active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', course: 'Physics', status: 'active' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', course: 'Chemistry', status: 'inactive' },
    { id: 4, name: 'Alice Brown', email: 'alice@example.com', course: 'Biology', status: 'pending' }
];

let courses = [
    { id: 1, name: 'Mathematics', instructor: 'Dr. Smith', students: 45, status: 'active' },
    { id: 2, name: 'Physics', instructor: 'Prof. Johnson', students: 38, status: 'active' },
    { id: 3, name: 'Chemistry', instructor: 'Dr. Williams', students: 32, status: 'active' },
    { id: 4, name: 'Biology', instructor: 'Prof. Davis', students: 28, status: 'inactive' },
    { id: 5, name: 'Computer Science', instructor: 'Dr. Miller', students: 52, status: 'active' }
];

let currentEditItem = null;
let currentSection = null;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard
    initOverview();
    renderStudentsTable();
    renderCoursesTable();
    updateStats();
    
    // Navigation click handlers
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            switchSection(section);
        });
    });
    
    // Add student button
    document.getElementById('add-student-btn').addEventListener('click', function() {
        openModal('student');
    });
    
    // Add course button
    document.getElementById('add-course-btn').addEventListener('click', function() {
        openModal('course');
    });
    
    // Modal close button
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    
    // Close modal when clicking outside
    document.getElementById('modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });
    
    // Form submit handler
    document.getElementById('modal-form').addEventListener('submit', handleFormSubmit);
});

function switchSection(sectionName) {
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-section') === sectionName) {
            link.classList.add('active');
        }
    });
    
    // Update sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active-section');
    });
    document.getElementById(sectionName + '-section').classList.add('active-section');
}

function initOverview() {
    // Sample data for overview
    const dashboardData = {
        activityData: [65, 59, 80, 81, 56, 55, 40],
        recentActivity: [
            'New student registered - John Doe - 2 min ago',
            'Course completed - Mathematics - 15 min ago',
            'Report generated - Weekly Summary - 1 hour ago',
            'System update completed - 3 hours ago',
            'New course added - Computer Science - 1 day ago'
        ]
    };

    // Initialize Chart
    const ctx = document.getElementById('activity-chart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Activity',
                data: dashboardData.activityData,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#f0f0f0'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });

    // Update activity list
    const activityList = document.getElementById('activity-list');
    activityList.innerHTML = '';
    dashboardData.recentActivity.forEach(activity => {
        const li = document.createElement('li');
        li.textContent = activity;
        activityList.appendChild(li);
    });
}

function updateStats() {
    document.getElementById('total-students').textContent = students.length;
    document.getElementById('total-courses').textContent = courses.length;
    document.getElementById('active-sessions').textContent = students.filter(s => s.status === 'active').length;
    
    const growth = ((students.length / 10) * 100).toFixed(1);
    document.getElementById('growth').textContent = '+' + growth + '%';
}

function renderStudentsTable() {
    const tbody = document.getElementById('students-table-body');
    tbody.innerHTML = '';
    
    students.forEach(student => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${student.id}</td>
            <td>${student.name}</td>
            <td>${student.email}</td>
            <td>${student.course}</td>
            <td><span class="status-badge status-${student.status}">${student.status}</span></td>
            <td>
                <button class="btn btn-edit" onclick="editStudent(${student.id})">Edit</button>
                <button class="btn btn-danger" onclick="deleteStudent(${student.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderCoursesTable() {
    const tbody = document.getElementById('courses-table-body');
    tbody.innerHTML = '';
    
    courses.forEach(course => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${course.id}</td>
            <td>${course.name}</td>
            <td>${course.instructor}</td>
            <td>${course.students}</td>
            <td><span class="status-badge status-${course.status}">${course.status}</span></td>
            <td>
                <button class="btn btn-edit" onclick="editCourse(${course.id})">Edit</button>
                <button class="btn btn-danger" onclick="deleteCourse(${course.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openModal(type, item = null) {
    currentSection = type;
    currentEditItem = item;
    const modal = document.getElementById('modal');
    const title = document.getElementById('modal-title');
    const fields = document.getElementById('modal-fields');
    
    modal.classList.add('show');
    
    if (type === 'student') {
        title.textContent = item ? 'Edit Student' : 'Add Student';
        fields.innerHTML = `
            <div class="form-group">
                <label>Name</label>
                <input type="text" name="name" value="${item ? item.name : ''}" required>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" name="email" value="${item ? item.email : ''}" required>
            </div>
            <div class="form-group">
                <label>Course</label>
                <select name="course" required>
                    ${courses.map(c => `<option value="${c.name}" ${item && item.course === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select name="status" required>
                    <option value="active" ${item && item.status === 'active' ? 'selected' : ''}>Active</option>
                    <option value="inactive" ${item && item.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                    <option value="pending" ${item && item.status === 'pending' ? 'selected' : ''}>Pending</option>
                </select>
            </div>
        `;
    } else if (type === 'course') {
        title.textContent = item ? 'Edit Course' : 'Add Course';
        fields.innerHTML = `
            <div class="form-group">
                <label>Course Name</label>
                <input type="text" name="name" value="${item ? item.name : ''}" required>
            </div>
            <div class="form-group">
                <label>Instructor</label>
                <input type="text" name="instructor" value="${item ? item.instructor : ''}" required>
            </div>
            <div class="form-group">
                <label>Students Count</label>
                <input type="number" name="students" value="${item ? item.students : 0}" required>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select name="status" required>
                    <option value="active" ${item && item.status === 'active' ? 'selected' : ''}>Active</option>
                    <option value="inactive" ${item && item.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                </select>
            </div>
        `;
    }
}

function closeModal() {
    document.getElementById('modal').classList.remove('show');
    document.getElementById('modal-form').reset();
    currentEditItem = null;
    currentSection = null;
}

function handleFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    if (currentSection === 'student') {
        if (currentEditItem) {
            // Edit existing student
            const index = students.findIndex(s => s.id === currentEditItem.id);
            students[index] = { ...currentEditItem, ...data };
        } else {
            // Add new student
            const newId = students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 1;
            students.push({ id: newId, ...data });
        }
        renderStudentsTable();
    } else if (currentSection === 'course') {
        if (currentEditItem) {
            // Edit existing course
            const index = courses.findIndex(c => c.id === currentEditItem.id);
            courses[index] = { ...currentEditItem, ...data, students: parseInt(data.students) };
        } else {
            // Add new course
            const newId = courses.length > 0 ? Math.max(...courses.map(c => c.id)) + 1 : 1;
            courses.push({ id: newId, ...data, students: parseInt(data.students) });
        }
        renderCoursesTable();
    }
    
    updateStats();
    closeModal();
}

// Global functions for inline onclick handlers
window.editStudent = function(id) {
    const student = students.find(s => s.id === id);
    openModal('student', student);
};

window.deleteStudent = function(id) {
    if (confirm('Are you sure you want to delete this student?')) {
        students = students.filter(s => s.id !== id);
        renderStudentsTable();
        updateStats();
    }
};

window.editCourse = function(id) {
    const course = courses.find(c => c.id === id);
    openModal('course', course);
};

window.deleteCourse = function(id) {
    if (confirm('Are you sure you want to delete this course?')) {
        courses = courses.filter(c => c.id !== id);
        renderCoursesTable();
        updateStats();
    }
};
