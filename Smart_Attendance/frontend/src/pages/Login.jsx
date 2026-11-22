import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  Radio,
  Camera,
  Users,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
  ArrowRight,
  School,
  Lock,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from '../components/ThemeToggle'

export default function Login() {
  const [activeRole, setActiveRole] = useState('teacher') // 'teacher' | 'student'
  const [username, setUsername] = useState('tch-001')
  const [password, setPassword] = useState('Teacher@123')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleRoleToggle = role => {
    setActiveRole(role)
    setErrorMsg('')
    if (role === 'teacher') {
      setUsername('tch-001')
      setPassword('Teacher@123')
    } else {
      setUsername('21cs001')
      setPassword('Student@123')
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setErrorMsg('')

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both your identifier and password.')
      return
    }

    setLoading(true)
    try {
      const data = await login(username.trim(), password)
      if (data.role === 'teacher' || data.role === 'admin') {
        navigate('/teacher', { replace: true })
      } else {
        navigate('/student', { replace: true })
      }
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please verify your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: 'var(--bg-base)',
      }}
    >
      {/* LEFT SPLIT PANEL: High-Tech Branding & Architecture Highlights */}
      <div
        style={{
          flex: '1.1',
          background: 'linear-gradient(145deg, #090d16 0%, #111b2e 100%)',
          color: '#ffffff',
          padding: '3.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        }}
        className="login-left-panel"
      >
        {/* Ambient glow accents */}
        <div
          style={{
            position: 'absolute',
            top: '-15%',
            left: '-15%',
            width: '450px',
            height: '450px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(37,99,235,0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-10%',
            right: '-10%',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(6,182,212,0.2) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Top Branding */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.625rem',
              padding: '0.375rem 0.875rem',
              borderRadius: '9999px',
              background: 'rgba(37, 99, 235, 0.2)',
              border: '1px solid rgba(96, 165, 250, 0.3)',
              color: '#93c5fd',
              fontSize: '0.8rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
              marginBottom: '1.75rem',
            }}
          >
            <Sparkles size={14} />
            <span>AI + IoT ATTENDANCE PLATFORM</span>
          </div>

          <h1
            style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              marginBottom: '1rem',
              background: 'linear-gradient(to right, #ffffff, #cbd5e1)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Smart Attendance Management System
          </h1>

          <p
            style={{
              fontSize: '1rem',
              color: '#94a3b8',
              lineHeight: 1.6,
              maxWidth: '520px',
            }}
          >
            AI-based classroom headcount and anti-proxy attendance verification powered by
            synchronized hardware scanning and computer vision.
          </p>
        </div>

        {/* Center Feature Highlights */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '1rem',
            position: 'relative',
            zIndex: 1,
            margin: '2.5rem 0',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem 1.25rem',
              borderRadius: '0.75rem',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '0.5rem',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Radio size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.925rem' }}>
                Hardware RFID & Barcode Swiping
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Fast STM32 serial integration with immediate duplicate rejection.
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem 1.25rem',
              borderRadius: '0.75rem',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '0.5rem',
                background: 'rgba(6, 182, 212, 0.15)',
                color: '#22d3ee',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Camera size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.925rem' }}>
                Automated Headcount Verification
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                APScheduler background timer compares camera heads against total swipes.
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem 1.25rem',
              borderRadius: '0.75rem',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '0.5rem',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.925rem' }}>
                Audit Protected & Anti-Proxy Guard
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Objective discrepancy detection with teacher review and non-destructive logs.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Status Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8rem',
            color: '#64748b',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 10px #10b981',
            }}
          />
          <span>FastAPI Backend Live & Database Connected</span>
        </div>
      </div>

      {/* RIGHT SPLIT PANEL: Interactive Login Card */}
      <div
        style={{
          flex: '1',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2.5rem',
          position: 'relative',
        }}
      >
        {/* Top Right Controls */}
        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
          <ThemeToggle />
        </div>

        <div
          style={{
            width: '100%',
            maxWidth: '440px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: '1rem',
            padding: '2.25rem',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Sign In to Your Account
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.375rem' }}>
              Select your role and enter your academic credentials
            </p>
          </div>

          {/* Student / Teacher Role Toggle */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-hover)',
              borderRadius: '0.625rem',
              padding: '0.25rem',
              marginBottom: '1.5rem',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={() => handleRoleToggle('teacher')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.625rem',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: activeRole === 'teacher' ? 'var(--primary-600)' : 'var(--text-secondary)',
                background: activeRole === 'teacher' ? 'var(--bg-card)' : 'transparent',
                boxShadow: activeRole === 'teacher' ? 'var(--shadow-sm)' : 'none',
                transition: 'all var(--transition-fast)',
              }}
            >
              <School size={16} />
              <span>Teacher / Faculty</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleToggle('student')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.625rem',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: activeRole === 'student' ? 'var(--primary-600)' : 'var(--text-secondary)',
                background: activeRole === 'student' ? 'var(--bg-card)' : 'transparent',
                boxShadow: activeRole === 'student' ? 'var(--shadow-sm)' : 'none',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Users size={16} />
              <span>Student</span>
            </button>
          </div>

          {/* Quick Demo Autofill Pills */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.5rem 0.75rem',
              background: 'var(--bg-hover)',
              borderRadius: '0.5rem',
              fontSize: '0.775rem',
              color: 'var(--text-secondary)',
              marginBottom: '1.25rem',
              border: '1px dashed var(--border-default)',
            }}
          >
            <span>Demo Quick Fill:</span>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              <button
                type="button"
                onClick={() => handleRoleToggle('teacher')}
                style={{
                  background: activeRole === 'teacher' ? 'var(--primary-100)' : 'var(--bg-card)',
                  color: activeRole === 'teacher' ? 'var(--primary-600)' : 'var(--text-primary)',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.725rem',
                  fontWeight: 600,
                  border: '1px solid var(--border-default)',
                }}
              >
                Teacher (tch-001)
              </button>
              <button
                type="button"
                onClick={() => handleRoleToggle('student')}
                style={{
                  background: activeRole === 'student' ? 'var(--primary-100)' : 'var(--bg-card)',
                  color: activeRole === 'student' ? 'var(--primary-600)' : 'var(--text-primary)',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.725rem',
                  fontWeight: 600,
                  border: '1px solid var(--border-default)',
                }}
              >
                Student (21cs001)
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                background: 'var(--status-absent-bg)',
                border: '1px solid var(--status-absent-border)',
                color: 'var(--status-absent)',
                fontSize: '0.825rem',
                marginBottom: '1.25rem',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">
                {activeRole === 'teacher' ? 'Teacher Employee ID' : 'Student Roll Number'}
              </label>
              <input
                type="text"
                className="form-input"
                placeholder={activeRole === 'teacher' ? 'e.g. tch-001' : 'e.g. 21cs001'}
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    display: 'flex',
                  }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '0.925rem',
                marginTop: '0.75rem',
              }}
            >
              {loading ? (
                <span>Authenticating with Backend...</span>
              ) : (
                <>
                  <span>Sign In as {activeRole === 'teacher' ? 'Faculty' : 'Student'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div
            style={{
              marginTop: '1.5rem',
              textAlign: 'center',
              fontSize: '0.775rem',
              color: 'var(--text-muted)',
            }}
          >
            Connected to <strong>FastAPI Backend</strong> &bull; SQLite Production Database
          </div>
        </div>
      </div>
    </div>
  )
}
