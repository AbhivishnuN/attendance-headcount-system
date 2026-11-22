import React, { useState } from 'react'
import { AlertCircle } from 'lucide-react'

export default function ConfirmDialog({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false,
  requireReason = false,
  reasonPlaceholder = 'Please enter justification reason...',
  onConfirm,
  onCancel,
}) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) {
      setError('A reason is mandatory for this action.')
      return
    }
    setError('')
    onConfirm(reason)
    setReason('')
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
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
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {title}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              {message}
            </p>
          </div>
        </div>

        {requireReason && (
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ marginBottom: '0.375rem', display: 'block' }}>
              Reason <span style={{ color: 'var(--status-absent)' }}>*</span>
            </label>
            <textarea
              className="form-input"
              rows={3}
              placeholder={reasonPlaceholder}
              value={reason}
              onChange={e => {
                setReason(e.target.value)
                if (error) setError('')
              }}
              style={{ resize: 'vertical' }}
            />
            {error && (
              <span style={{ fontSize: '0.775rem', color: 'var(--status-absent)', marginTop: '0.25rem', display: 'block' }}>
                {error}
              </span>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
