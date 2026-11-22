import React from 'react'
import { Loader2 } from 'lucide-react'

export default function Loading({ message = 'Loading details...', fullScreen = false }) {
  const content = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        gap: '0.75rem',
        color: 'var(--text-secondary)',
      }}
    >
      <Loader2
        size={32}
        className="animate-spin"
        style={{
          color: 'var(--primary-600)',
          animation: 'spin 1s linear infinite',
        }}
      />
      <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{message}</span>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )

  if (fullScreen) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-base)',
        }}
      >
        {content}
      </div>
    )
  }

  return content
}
