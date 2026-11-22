import React, { useEffect } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'

export default function Toast({ message, type = 'info', onClose, duration = 4000 }) {
  useEffect(() => {
    if (duration > 0 && onClose) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  if (!message) return null

  let icon = <Info size={18} />
  let borderColor = 'var(--primary-500)'
  let bg = 'var(--bg-elevated)'

  if (type === 'success') {
    icon = <CheckCircle2 size={18} style={{ color: 'var(--status-present)' }} />
    borderColor = 'var(--status-present)'
  } else if (type === 'error') {
    icon = <XCircle size={18} style={{ color: 'var(--status-absent)' }} />
    borderColor = 'var(--status-absent)'
  } else if (type === 'warning') {
    icon = <AlertTriangle size={18} style={{ color: 'var(--status-late)' }} />
    borderColor = 'var(--status-late)'
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.875rem 1.125rem',
        background: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: '0.625rem',
        boxShadow: 'var(--shadow-xl)',
        maxWidth: '420px',
        animation: 'slideUp 200ms ease-out',
      }}
    >
      <div>{icon}</div>
      <div style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
        {message}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            color: 'var(--text-muted)',
            padding: '0.25rem',
            borderRadius: '0.25rem',
            display: 'flex',
          }}
        >
          <X size={16} />
        </button>
      )}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
