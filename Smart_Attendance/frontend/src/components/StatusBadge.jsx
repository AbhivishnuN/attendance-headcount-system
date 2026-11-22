import React from 'react'
import { CheckCircle2, XCircle, Clock, ShieldCheck, AlertTriangle, AlertCircle } from 'lucide-react'

export default function StatusBadge({ status, type = 'attendance' }) {
  const normStatus = (status || '').toUpperCase()

  let icon = <CheckCircle2 size={13} />
  let label = normStatus
  let className = 'present'

  switch (normStatus) {
    case 'PRESENT':
      icon = <CheckCircle2 size={13} />
      label = 'Present'
      className = 'present'
      break
    case 'ABSENT':
      icon = <XCircle size={13} />
      label = 'Absent'
      className = 'absent'
      break
    case 'LATE':
      icon = <Clock size={13} />
      label = 'Late'
      className = 'late'
      break
    case 'VERIFIED':
      icon = <ShieldCheck size={13} />
      label = 'Verified'
      className = 'verified'
      break
    case 'FLAGGED':
      icon = <AlertTriangle size={13} />
      label = 'Flagged'
      className = 'flagged'
      break
    case 'PENDING':
      icon = <AlertCircle size={13} />
      label = 'Pending'
      className = 'late'
      break
    default:
      icon = <CheckCircle2 size={13} />
      label = normStatus
      className = 'present'
  }

  return (
    <span className={`status-badge ${className}`}>
      {icon}
      <span>{label}</span>
    </span>
  )
}
