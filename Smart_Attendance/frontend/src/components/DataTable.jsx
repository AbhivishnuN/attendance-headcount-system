import React from 'react'
import Loading from './Loading'
import EmptyState from './EmptyState'

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No records available in this view.',
  rowKey = 'id',
  highlightRowId = null,
  onRowClick = null,
}) {
  if (loading) {
    return <Loading message="Loading table records..." />
  }

  if (!data || data.length === 0) {
    return <EmptyState description={emptyMessage} />
  }

  return (
    <div
      style={{
        width: '100%',
        overflowX: 'auto',
        borderRadius: '0.75rem',
        border: '1px solid var(--border-default)',
        background: 'var(--bg-card)',
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          textAlign: 'left',
          fontSize: '0.875rem',
        }}
      >
        <thead>
          <tr
            style={{
              background: 'var(--bg-hover)',
              borderBottom: '1px solid var(--border-default)',
            }}
          >
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                style={{
                  padding: '0.75rem 1rem',
                  fontWeight: 600,
                  fontSize: '0.775rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-secondary)',
                  textAlign: col.align || 'left',
                  width: col.width || 'auto',
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => {
            const key = row[rowKey] !== undefined ? row[rowKey] : rowIdx
            const isHighlighted = highlightRowId !== null && key === highlightRowId

            return (
              <tr
                key={key}
                onClick={() => onRowClick && onRowClick(row)}
                style={{
                  borderBottom:
                    rowIdx === data.length - 1
                      ? 'none'
                      : '1px solid var(--border-subtle)',
                  background: isHighlighted
                    ? 'var(--primary-50)'
                    : 'transparent',
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background var(--transition-fast)',
                }}
                onMouseEnter={e => {
                  if (!isHighlighted) e.currentTarget.style.background = 'var(--bg-hover)'
                }}
                onMouseLeave={e => {
                  if (!isHighlighted) e.currentTarget.style.background = 'transparent'
                }}
              >
                {columns.map((col, cIdx) => (
                  <td
                    key={col.key || cIdx}
                    style={{
                      padding: '0.875rem 1rem',
                      color: 'var(--text-primary)',
                      textAlign: col.align || 'left',
                      verticalAlign: 'middle',
                    }}
                  >
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
