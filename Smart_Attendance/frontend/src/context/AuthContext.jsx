import React, { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '../services/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('smart_attendance_token'))
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('smart_attendance_user')
    try {
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(true)

  // Listen for 401 unauthorized events to clean up session
  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null)
      setUser(null)
      localStorage.removeItem('smart_attendance_token')
      localStorage.removeItem('smart_attendance_user')
    }

    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [])

  // Verify session on initial application load
  useEffect(() => {
    async function verifySession() {
      if (!token) {
        setLoading(false)
        return
      }
      try {
        const profile = await authApi.getMe()
        setUser(profile)
        localStorage.setItem('smart_attendance_user', JSON.stringify(profile))
      } catch (err) {
        console.warn('Session verification failed, clearing auth:', err)
        setToken(null)
        setUser(null)
        localStorage.removeItem('smart_attendance_token')
        localStorage.removeItem('smart_attendance_user')
      } finally {
        setLoading(false)
      }
    }
    verifySession()
  }, [token])

  const login = async (username, password) => {
    const data = await authApi.login({ username, password })
    setToken(data.access_token)
    setUser({
      user_id: data.user_id,
      username: data.username,
      role: data.role,
      name: data.name,
      identifier: data.identifier,
      department: data.department,
      class_name: data.class_name,
    })
    localStorage.setItem('smart_attendance_token', data.access_token)
    localStorage.setItem('smart_attendance_user', JSON.stringify(data))
    return data
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('smart_attendance_token')
    localStorage.removeItem('smart_attendance_user')
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        role: user?.role,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
