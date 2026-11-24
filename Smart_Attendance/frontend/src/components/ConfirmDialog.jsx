import React from 'react'
import { AlertCircle } from 'lucide-react'

/**
 * ConfirmDialog — reusable modal dialog.
 *
 * Props:
 *   title          : string
 *   message        : string | ReactNode  — subtitle below title
 *   children       : ReactNode          — extra form fields rendered inside the dialog
 *   confirmLabel   : string             — confirm button text (default "Confirm")
 *   cancelLabel    : string             — cancel button text (default "Cancel")
 *   confirmDisabled: bool               — disable confirm button while submitting
 *   isDanger       : bool               — red confirm button
 *   onConfirm      : () => void
 *   onCancel       : () => void
 *
 * Usage: render it only when you want it visible (no isOpen prop needed —
 * just conditionally render the component).
 */
export default function ConfirmDialog({
  title = 'Confirm Action',
  message = '',
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmDisabled = false,
  isDanger = false,
  onConfirm,
  onCancel,
}) {
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        // Click outside closes dialog
        if (e.target === e.currentTarget) onCancel && onCancel()
      }}
    >
      <div className="modal-content" style={{ maxWidth: '480px', width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
          <div
            style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '50%',
              background: isDanger ? 'var(--status-absent-bg)' : 'var(--primary-50)',
              color: isDanger ? 'var(--status-absent)' : 'var(--primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertCircle size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h3>
            {message && (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {message}
              </p>
            )}
          </div>
        </div>

        {/* Extra form fields passed as children */}
        {children && <div style={{ marginBottom: '1.25rem' }}>{children}</div>}

        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
