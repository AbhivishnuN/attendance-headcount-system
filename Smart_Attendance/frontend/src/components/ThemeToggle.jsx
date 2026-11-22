import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className={`btn-theme-toggle ${className}`}
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
      aria-label="Toggle Theme"
      style={{
        padding: '0.5rem',
        borderRadius: '0.5rem',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-hover)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-default)',
        transition: 'all var(--transition-fast)',
      }}
    >
      {theme === 'dark' ? (
        <Sun size={18} style={{ color: '#fbbf24' }} />
      ) : (
        <Moon size={18} style={{ color: '#6366f1' }} />
      )}
    </button>
  )
}
