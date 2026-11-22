import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import StudentDashboard from './dashboards/StudentDashboard'
import TeacherDashboard from './dashboards/TeacherDashboard'
import Loading from './components/Loading'

function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, loading } = useAuth()

  if (loading) {
    return <Loading fullScreen message="Verifying authentication session..." />
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If student tries to visit /teacher or vice-versa, redirect to their home
    return <Navigate to={user.role === 'student' ? '/student' : '/teacher'} replace />
  }

  return children
}

export default function App() {
  const { user, isAuthenticated, loading } = useAuth()

  if (loading) {
    return <Loading fullScreen message="Initializing Smart Attendance platform..." />
  }

  return (
    <Routes>
      {/* Login Screen */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to={user?.role === 'student' ? '/student' : '/teacher'} replace />
          ) : (
            <Login />
          )
        }
      />

      {/* Student Portal (Role Protected) */}
      <Route
        path="/student/*"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      {/* Teacher / Faculty Portal (Role Protected) */}
      <Route
        path="/teacher/*"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />

      {/* Root Redirection */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to={user?.role === 'student' ? '/student' : '/teacher'} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
