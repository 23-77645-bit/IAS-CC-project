import PropTypes from 'prop-types'

/**
 * SummaryCards Component
 * Displays today's attendance statistics in card format
 */
function SummaryCards({ summary, loading, error }) {
  if (loading) {
    return (
      <div className="summary-cards-loading">
        <div className="card skeleton">Loading summary...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="summary-cards-error">
        <p>⚠️ Failed to load summary</p>
      </div>
    )
  }

  const cards = [
    { 
      label: 'Total Students', 
      value: summary.total, 
      color: 'gray',
      icon: '👥'
    },
    { 
      label: 'Present', 
      value: summary.present, 
      color: 'green',
      icon: '🟢'
    },
    { 
      label: 'Late', 
      value: summary.late, 
      color: 'yellow',
      icon: '🟡'
    },
    { 
      label: 'Absent', 
      value: summary.absent, 
      color: 'red',
      icon: '🔴'
    },
  ]

  return (
    <section className="summary-cards" aria-label="Attendance Summary">
      <div className="summary-grid">
        {cards.map((card) => (
          <div 
            key={card.label} 
            className={`summary-card summary-card-${card.color}`}
            role="region"
            aria-label={`${card.label}: ${card.value}`}
          >
            <div className="summary-card-icon">{card.icon}</div>
            <div className="summary-card-value">{card.value}</div>
            <div className="summary-card-label">{card.label}</div>
          </div>
        ))}
        
        {/* Attendance Percentage Card */}
        <div className="summary-card summary-card-blue">
          <div className="summary-card-icon">📊</div>
          <div className="summary-card-value">{summary.percentage}%</div>
          <div className="summary-card-label">Attendance Rate</div>
        </div>
      </div>
    </section>
  )
}

SummaryCards.propTypes = {
  summary: PropTypes.shape({
    total: PropTypes.number.isRequired,
    present: PropTypes.number.isRequired,
    late: PropTypes.number.isRequired,
    absent: PropTypes.number.isRequired,
    percentage: PropTypes.number.isRequired,
  }),
  loading: PropTypes.bool,
  error: PropTypes.string,
}

SummaryCards.defaultProps = {
  summary: { total: 0, present: 0, late: 0, absent: 0, percentage: 0 },
  loading: false,
  error: null,
}

export default SummaryCards
