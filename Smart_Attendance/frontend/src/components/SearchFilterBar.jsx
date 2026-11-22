import React from 'react'
import { Search, Filter, ArrowUpDown } from 'lucide-react'

export default function SearchFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortChange,
  statusOptions = [
    { label: 'All Statuses', value: 'ALL' },
    { label: 'Present', value: 'PRESENT' },
    { label: 'Absent', value: 'ABSENT' },
    { label: 'Late', value: 'LATE' },
  ],
  placeholder = 'Search by student name, roll number, or card ID...',
  extraActions,
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '1rem',
      }}
    >
      {/* Search Input */}
      <div style={{ position: 'relative', flex: '1 1 240px' }}>
        <Search
          size={16}
          style={{
            position: 'absolute',
            left: '0.875rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
          }}
        />
        <input
          type="text"
          className="form-input"
          placeholder={placeholder}
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          style={{ paddingLeft: '2.375rem' }}
        />
      </div>

      {/* Status Filter */}
      {onStatusFilterChange && (
        <div style={{ position: 'relative', minWidth: '150px' }}>
          <select
            className="form-input"
            value={statusFilter}
            onChange={e => onStatusFilterChange(e.target.value)}
            style={{ cursor: 'pointer' }}
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Sort By */}
      {onSortChange && (
        <div style={{ position: 'relative', minWidth: '150px' }}>
          <select
            className="form-input"
            value={sortBy}
            onChange={e => onSortChange(e.target.value)}
            style={{ cursor: 'pointer' }}
          >
            <option value="time_desc">Latest First</option>
            <option value="time_asc">Oldest First</option>
            <option value="roll_asc">Roll No (Asc)</option>
            <option value="name_asc">Name (A-Z)</option>
          </select>
        </div>
      )}

      {/* Extra Action Buttons (e.g. Export, Refresh) */}
      {extraActions && <div style={{ display: 'flex', gap: '0.5rem' }}>{extraActions}</div>}
    </div>
  )
}
