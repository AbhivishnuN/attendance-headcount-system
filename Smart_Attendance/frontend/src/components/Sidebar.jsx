import React from 'react'
import {
  LayoutDashboard,
  PlayCircle,
  Users,
  Edit3,
  Camera,
  ShieldAlert,
  FileText,
  User,
  Settings,
  Radio,
  BookOpen,
  HelpCircle,
} from 'lucide-react'

export default function Sidebar({
  role = 'teacher',
  activeTab = 'dashboard',
  onSelectTab,
}) {
  const teacherItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'start_session', label: 'Start Attendance', icon: PlayCircle },
    { id: 'attendance_table', label: 'Student Attendance', icon: Users },
    { id: 'manual_attendance', label: 'Manual Attendance', icon: Edit3 },
    { id: 'headcount', label: 'Headcount', icon: Camera },
    { id: 'verification', label: 'Verification History', icon: ShieldAlert },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  const studentItems = [
    { id: 'overview', label: 'My Overview', icon: LayoutDashboard },
    { id: 'attendance', label: 'Attendance History', icon: BookOpen },
    { id: 'issues', label: 'Report Issue / Requests', icon: HelpCircle },
    { id: 'profile', label: 'Student Profile', icon: User },
  ]

  const items = role === 'teacher' ? teacherItems : studentItems

  return (
    <aside
      style={{
        width: '260px',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-default)',
        height: '100vh',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <div
          style={{
            width: '2.25rem',
            height: '2.25rem',
            borderRadius: '0.5rem',
            background: 'linear-gradient(135deg, var(--primary-600), #06b6d4)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Radio size={20} />
        </div>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            Smart Attendance
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>
            AI &bull; IOT &bull; PROXY VERIFY
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav style={{ flex: 1, padding: '1rem 0.75rem', overflowY: 'auto' }}>
        <div
          style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
            padding: '0 0.75rem 0.5rem',
          }}
        >
          {role === 'teacher' ? 'Faculty Portal' : 'Student Portal'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {items.map(item => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab && onSelectTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.625rem 0.875rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--primary-600)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--primary-50)' : 'transparent',
                  textAlign: 'left',
                  transition: 'all var(--transition-fast)',
                  border: 'none',
                  width: '100%',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--bg-hover)'
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }
                }}
              >
                <Icon size={18} style={{ color: isActive ? 'var(--primary-600)' : 'inherit' }} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Footer Info */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid var(--border-default)',
          background: 'var(--bg-hover)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
        }}
      >
        <div>System Version: <strong>v1.0.0</strong></div>
        <div>Hardware: <strong>STM32 Ready</strong></div>
      </div>
    </aside>
  )
}
