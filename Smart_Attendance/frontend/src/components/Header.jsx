import React, { useState, useEffect } from 'react'
import { LogOut, User, Bell, Clock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from './ThemeToggle'

export default function Header({ title = 'Dashboard' }) {
  const { user, logout } = useAuth()
  const [timeStr, setTimeStr] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      )
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.875rem 1.5rem',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-default)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Title / Section */}
      <div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          {title}
        </h1>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Live Clock */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.375rem 0.75rem',
            background: 'var(--bg-hover)',
            borderRadius: '0.5rem',
            fontSize: '0.825rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-secondary)',
            fontWeight: 500,
          }}
        >
          <Clock size={14} style={{ color: 'var(--primary-600)' }} />
          <span>{timeStr}</span>
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Profile Pill */}
        {user && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              padding: '0.375rem 0.75rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
              borderRadius: '0.5rem',
            }}
          >
            <div
              style={{
                width: '1.875rem',
                height: '1.875rem',
                borderRadius: '50%',
                background: 'var(--primary-50)',
                color: 'var(--primary-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '0.8rem',
              }}
            >
              <User size={14} />
            </div>
            <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
              <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {user.name}
              </div>
              <div
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}
              >
                {user.role} &bull; {user.identifier}
              </div>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={logout}
          className="btn btn-secondary"
          style={{ padding: '0.5rem 0.75rem', fontSize: '0.825rem' }}
          title="Sign out of system"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  )
}
