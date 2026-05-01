// Dashboard JavaScript - Vanilla JS, no frameworks

document.addEventListener('DOMContentLoaded', function() {
    // Sample data - replace with actual API calls
    const dashboardData = {
        totalUsers: 1234,
        activeSessions: 56,
        revenue: 12345,
        growth: 12.5,
        activityData: [65, 59, 80, 81, 56, 55, 40],
        recentActivity: [
            'New user registered - 2 min ago',
            'Payment received - $500 - 15 min ago',
            'Report generated - 1 hour ago',
            'System update completed - 3 hours ago',
            'New feature deployed - 1 day ago'
        ]
    };

    // Update stats
    document.getElementById('total-users').textContent = dashboardData.totalUsers.toLocaleString();
    document.getElementById('active-sessions').textContent = dashboardData.activeSessions;
    document.getElementById('revenue').textContent = '$' + dashboardData.revenue.toLocaleString();
    document.getElementById('growth').textContent = '+' + dashboardData.growth + '%';

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

    // Navigation click handlers
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
});
