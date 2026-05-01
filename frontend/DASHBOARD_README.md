# Minimalist Teacher Dashboard

A clean, fast, minimal dashboard for teachers to monitor and manage daily attendance.

## 🎨 Layout Mockup

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  👨‍🏫 Teacher Dashboard                                                       │
│  Monitor and manage today's attendance                                      │
│  Monday, January 15, 2024                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │   👥     │ │   🟢     │ │   🟡     │ │   🔴     │ │   📊     │        │
│  │    50    │ │    35    │ │     5    │ │    10    │ │   80%    │        │
│  │   Total  │ │ Present  │ │   Late   │ │  Absent  │ │   Rate   │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────────┐  │
│  │ 📡 Live Activity        │  │                                         │  │
│  │                         │  │  ┌─────────────────────────────────┐   │  │
│  │ 🟢 Alice Johnson  9:30  │  │  │ 🔍 Search by name or ID...      │   │  │
│  │ 🟢 Bob Smith      9:28  │  │  └─────────────────────────────────┘   │  │
│  │ 🟡 Carol Williams 9:15  │  │                                         │  │
│  │ 🟢 David Brown    9:25  │  │  [All] [🟢 Present] [🟡 Late] [🔴 Absent]│  │
│  │                         │  │                                         │  │
│  │                         │  │  Showing 8 of 50 students               │  │
│  │                         │  │                                         │  │
│  │                         │  │  ┌─────────────────────────────────┐   │  │
│  │                         │  │  │Student ID│Name │Status │Actions │   │  │
│  │                         │  │  ├──────────┼─────┼───────┼────────┤   │  │
│  │                         │  │  │STU001    │Alice│🟢Present│✏️Mark│   │  │
│  │                         │  │  │STU002    │Bob  │🟡Late   │✏️Mark│   │  │
│  │                         │  │  │STU003    │Carol│🔴Absent │✏️Mark│   │  │
│  │                         │  │  └─────────────────────────────────┘   │  │
│  │                         │  │                                         │  │
│  │                         │  │            📥 Export CSV                │  │
│  └─────────────────────────┘  └─────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## ✨ Features

### Summary Cards (Top Section)
- **Total Students**: Total enrolled count
- **Present**: Currently marked present
- **Late**: Marked as late
- **Absent**: Not yet scanned/absent
- **Attendance Rate**: Percentage calculation

### Live Activity Feed
- Real-time scan updates
- Shows student name, ID, status, and time
- Auto-scrolls with new activity
- Last 10 scans displayed

### Attendance Table
- **Search**: Filter by student name or ID
- **Status Filter**: All / Present / Late / Absent
- **Columns**: Student ID, Name, Program, Status, Last Scan Time, Actions
- **Manual Mark**: Click "✏️ Mark" to override status with optional note
- **Export CSV**: Download filtered or full attendance list

## 🚀 Quick Start

### Using Mock Data (Demo Mode)

```bash
cd frontend
npm run dev
```

Navigate to: `http://localhost:5173/teacher-minimal`

### Connecting to Backend

See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for detailed backend integration instructions.

## 📁 File Structure

```
src/
├── components/
│   ├── SummaryCards.jsx       # Statistics cards component
│   ├── LiveFeed.jsx           # Live activity feed component
│   └── AttendanceTable.jsx    # Main table component
├── pages/
│   └── TeacherDashboardMinimal.jsx  # Main dashboard page
├── services/
│   └── mockApi.js             # Mock API (replace with real calls)
├── styles/
│   └── TeacherDashboard.css   # Minimalist CSS theme
└── App.jsx                    # Router setup
```

## 🎯 Technical Details

### React Patterns Used
- Functional components with hooks
- `useState` for local state management
- `useEffect` for side effects and data fetching
- `useCallback` for memoized functions
- PropTypes for type checking

### CSS Features
- CSS Custom Properties (variables) for theming
- CSS Grid for card layout
- Flexbox for component layouts
- Responsive breakpoints for tablet/mobile
- Accessibility media queries

### Accessibility
- Semantic HTML elements
- ARIA labels and roles
- Keyboard navigation support
- Focus indicators
- High contrast mode support
- Reduced motion support

## 🎨 Design Tokens

The dashboard uses a minimalist color palette:

| Token | Value | Usage |
|-------|-------|-------|
| `--color-accent` | `#3b82f6` | Primary buttons, active states |
| `--color-success` | `#22c55e` | Present status |
| `--color-warning` | `#eab308` | Late status |
| `--color-danger` | `#ef4444` | Absent status, errors |
| `--color-bg` | `#f8fafc` | Page background |
| `--color-surface` | `#ffffff` | Card backgrounds |

## 🔄 State Management

```
TeacherDashboard (Main Component)
    │
    ├── summary state → SummaryCards
    ├── students state → AttendanceTable
    ├── attendanceRecords state → AttendanceTable
    ├── liveActivities state → LiveFeed
    │
    └── handlers:
        ├── handleMarkAttendance() → updates records + summary
        └── handleExportCSV() → triggers download
```

## 📝 TODO Markers

When integrating with your FastAPI backend, look for these TODO comments:

1. `src/services/mockApi.js` - Replace all mock functions
2. `src/pages/TeacherDashboardMinimal.jsx` - WebSocket implementation
3. `.env` - Set your actual API URL

## 🧪 Testing

The dashboard includes:
- Loading states (skeleton screens)
- Error states (with retry option)
- Empty states (helpful messages)
- Success notifications

## 📱 Responsive Breakpoints

- **Desktop**: > 1024px (full layout)
- **Tablet**: 768px - 1024px (stacked cards)
- **Mobile**: < 768px (single column)

## 🔧 Customization

### Change Accent Color

Edit `src/styles/TeacherDashboard.css`:

```css
:root {
  --color-accent: #your-color;
  --color-accent-hover: #your-darker-color;
}
```

### Modify Card Layout

Adjust the grid in CSS:

```css
.summary-grid {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}
```

## 📄 License

This project is part of your Attendance Management System school submission.
