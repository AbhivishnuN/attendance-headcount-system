// Centralized API client - all requests go to FastAPI backend via Vite proxy
// Token from localStorage is attached to every request automatically

const BASE_URL = ''

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('smart_attendance_token')
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers })

  if (response.status === 401) {
    localStorage.removeItem('smart_attendance_token')
    localStorage.removeItem('smart_attendance_user')
    window.dispatchEvent(new Event('auth:unauthorized'))
    throw new Error('Session expired. Please log in again.')
  }

  if (!response.ok) {
    let detail = `Server error (${response.status})`
    try {
      const err = await response.json()
      detail = err.detail || err.message || JSON.stringify(err)
    } catch {
      detail = await response.text()
    }
    const e = new Error(detail)
    e.status = response.status
    throw e
  }

  const ct = response.headers.get('content-type') || ''
  if (ct.includes('text/csv') || ct.includes('text/plain')) return response.text()
  return response.json()
}

// ─── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  login: (creds) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(creds) }),
  getMe: () => apiRequest('/auth/me'),
}

// ─── Student (read-only, own data) ─────────────────────────────────────────
export const studentApi = {
  getProfile:    () => apiRequest('/student/profile'),
  getSummary:    () => apiRequest('/student/summary'),
  getAttendance: () => apiRequest('/student/attendance'),
  getIssues:     () => apiRequest('/student/issues'),
  submitIssue:   (data) => apiRequest('/student/issues', { method: 'POST', body: JSON.stringify(data) }),
}

// ─── Teacher ────────────────────────────────────────────────────────────────
export const teacherApi = {
  // Session management
  getClasses:            () => apiRequest('/teacher/classes'),
  getSubjects:           () => apiRequest('/teacher/subjects'),
  startSession:          (data) => apiRequest('/sessions/start', { method: 'POST', body: JSON.stringify(data) }),
  endSession:            (id) => apiRequest(`/sessions/${id}/end`, { method: 'POST' }),
  getActiveSession:      () => apiRequest('/sessions/active'),
  getSessionAttendance:  (id) => apiRequest(`/sessions/${id}/attendance`),
  getAllSessions:         () => apiRequest('/sessions/all'),

  // Scan (same endpoint STM32 will call)
  processScan: (data) => apiRequest('/scan', { method: 'POST', body: JSON.stringify(data) }),

  // Manual correction (requires reason)
  correctAttendance: (data) => apiRequest('/attendance/correct', { method: 'POST', body: JSON.stringify(data) }),

  // Headcount
  getHeadcountSettings:    () => apiRequest('/headcount/settings'),
  updateHeadcountSettings: (data) => apiRequest('/headcount/settings', { method: 'PUT', body: JSON.stringify(data) }),
  runHeadcount:            (sessionId) => apiRequest(`/headcount/run${sessionId ? `?session_id=${sessionId}` : ''}`, { method: 'POST' }),
  getHeadcountHistory:     () => apiRequest('/headcount/history'),

  // Verification
  getVerificationLogs: () => apiRequest('/verification/logs'),
  reviewVerification:  (data) => apiRequest('/verification/review', { method: 'POST', body: JSON.stringify(data) }),

  // Reports
  getReportCopy:  (sessionId) => apiRequest(`/reports/copy?session_id=${sessionId}`),
  exportCsv:      (sessionId) => apiRequest(`/reports/csv?session_id=${sessionId}`),

  // Teacher profile
  getProfile: () => apiRequest('/teacher/profile'),

  // Student issues (for teacher review)
  getAllIssues:   () => apiRequest('/teacher/issues'),
  resolveIssue:  (data) => apiRequest('/teacher/issues/resolve', { method: 'POST', body: JSON.stringify(data) }),

  // Camera API
  getCameraStatus: () => apiRequest('/camera/status'),
  captureCamera: (data) => apiRequest('/camera/capture', { method: 'POST', body: JSON.stringify(data) }),
}
