import PropTypes from 'prop-types'

/**
 * StatusFilter Component
 * Filter buttons for attendance status
 */
function StatusFilter({ currentFilter, onFilterChange }) {
  const filters = [
    { value: 'all', label: 'All', count: null },
    { value: 'present', label: 'Present', icon: '🟢' },
    { value: 'late', label: 'Late', icon: '🟡' },
    { value: 'absent', label: 'Absent', icon: '🔴' },
  ]

  return (
    <div className="status-filter" role="group" aria-label="Filter by status">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          className={`status-filter-btn ${currentFilter === filter.value ? 'active' : ''}`}
          aria-pressed={currentFilter === filter.value}
        >
          {filter.icon && <span aria-hidden="true">{filter.icon}</span>}
          {filter.label}
        </button>
      ))}
    </div>
  )
}

StatusFilter.propTypes = {
  currentFilter: PropTypes.oneOf(['all', 'present', 'late', 'absent']),
  onFilterChange: PropTypes.func.isRequired,
}

StatusFilter.defaultProps = {
  currentFilter: 'all',
}

export default StatusFilter
