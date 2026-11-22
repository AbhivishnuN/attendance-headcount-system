import React from 'react'
import { Inbox } from 'lucide-react'

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No Records Found',
  description = 'There is currently no data available to display.',
  action,
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        textAlign: 'center',
        background: 'var(--bg-card)',
        borderRadius: '0.75rem',
        border: '1px dashed var(--border-default)',
        color: 'var(--text-secondary)',
      }}
    >
      <div
        style={{
          width: '3.5rem',
          height: '3.5rem',
          borderRadius: '50%',
          background: 'var(--bg-hover)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem',
          color: 'var(--text-muted)',
        }}
      >
        <Icon size={24} />
      </div>
      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '360px', marginBottom: action ? '1.25rem' : 0 }}>
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  )
}
