import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

/**
 * LiveFeed Component
 * Shows real-time scan activity
 */
function LiveFeed({ activities, loading }) {
  const [localActivities, setLocalActivities] = useState(activities || [])

  useEffect(() => {
    if (activities) {
      setLocalActivities(activities.slice(0, 10))
    }
  }, [activities])

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present': return '🟢'
      case 'late': return '🟡'
      case 'absent': return '🔴'
      default: return '⚪'
    }
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (loading && localActivities.length === 0) {
    return (
      <section className="live-feed" aria-label="Live Activity Feed">
        <h2 className="live-feed-title">📡 Live Activity</h2>
        <div className="live-feed-loading">Loading activity...</div>
      </section>
    )
  }

  return (
    <section className="live-feed" aria-label="Live Activity Feed">
      <h2 className="live-feed-title">📡 Live Activity</h2>
      
      {localActivities.length === 0 ? (
        <div className="live-feed-empty">
          <p>No recent activity</p>
          <p className="live-feed-hint">Scans will appear here in real-time</p>
        </div>
      ) : (
        <ul className="live-feed-list" role="log" aria-live="polite">
          {localActivities.map((activity, index) => (
            <li 
              key={activity.id || index} 
              className={`live-feed-item status-${activity.status}`}
            >
              <span className="live-feed-icon" aria-hidden="true">
                {getStatusIcon(activity.status)}
              </span>
              <div className="live-feed-info">
                <span className="live-feed-name">{activity.student_name}</span>
                <span className="live-feed-id">{activity.student_id}</span>
              </div>
              <span className="live-feed-status">{activity.status}</span>
              <span className="live-feed-time">{formatTime(activity.time)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

LiveFeed.propTypes = {
  activities: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      student_name: PropTypes.string.isRequired,
      student_id: PropTypes.string.isRequired,
      status: PropTypes.oneOf(['present', 'late', 'absent']).isRequired,
      time: PropTypes.string.isRequired,
    })
  ),
  loading: PropTypes.bool,
}

LiveFeed.defaultProps = {
  activities: [],
  loading: false,
}

export default LiveFeed
