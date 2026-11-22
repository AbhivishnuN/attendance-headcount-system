import React from 'react'

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'var(--primary-600)',
  bg = 'var(--primary-50)',
}) {
  return (
    <div className="stat-card">
      <div style={{ flex: 1 }}>
        <div className="stat-label">{title}</div>
        <div className="stat-value">{value}</div>
        {subtitle && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {subtitle}
          </div>
        )}
      </div>
      {Icon && (
        <div
          className="stat-icon"
          style={{ background: bg, color: color }}
        >
          <Icon size={22} />
        </div>
      )}
    </div>
  )
}
