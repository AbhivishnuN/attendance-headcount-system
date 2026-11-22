import React, { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Wifi,
  WifiOff,
  Scan,
  Edit3,
  Camera,
  ShieldAlert,
  FileText,
  User,
  Settings,
  GraduationCap,
  RefreshCw,
  Copy,
  Download,
  ChevronRight,
  Layers,
  Activity,
  Building,
  IdCard,
  PlayCircle,
  Users,
} from 'lucide-react'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import DataTable from '../components/DataTable'
import Toast from '../components/Toast'
import Loading from '../components/Loading'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import { teacherApi } from '../services/api'
import { useAuth } from '../context/AuthContext'

function fmtDate(iso) {
  if (!iso) return 'N/A'
  return new Date(iso).toLocaleDateString()
}
function fmtTime(iso) {
  if (!iso) return 'N/A'
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
function fmtDateTime(iso) {
  if (!iso) return 'N/A'
  return `${fmtDate(iso)} ${fmtTime(iso)}`
}

export default function TeacherDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [toast, setToast] = useState(null)
  const showToast = (message, type = 'success') => setToast({ message, type })

  // ─── Active Session (shared) ─────────────────────────────
  const [activeSession, setActiveSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)

  const fetchActiveSession = useCallback(async () => {
    try {
      const data = await teacherApi.getActiveSession()
      setActiveSession(data.active ? data.session : null)
    } catch (err) {
      console.error('fetchActiveSession error:', err)
    } finally {
      setSessionLoading(false)
    }
  }, [])

  useEffect(() => { fetchActiveSession() }, [fetchActiveSession])

  // ─── DASHBOARD ───────────────────────────────────────────
  const [dashStats, setDashStats] = useState(null)
  const [dashLoading, setDashLoading] = useState(false)

  useEffect(() => {
    if (activeTab !== 'dashboard') return
    setDashLoading(true)
    Promise.all([teacherApi.getAllSessions(), teacherApi.getActiveSession()])
      .then(([sessions, activeData]) => {
        const todaySessions = sessions.filter((s) =>
          s.start_time && new Date(s.start_time).toDateString() === new Date().toDateString()
        )
        setDashStats({
          totalSessions: sessions.length,
          todaySessions: todaySessions.length,
          activeSessions: activeData.active ? 1 : 0,
          session: activeData.active ? activeData.session : null,
        })
        setActiveSession(activeData.active ? activeData.session : null)
      })
      .catch((err) => showToast(err.message || 'Failed to load dashboard.', 'error'))
      .finally(() => setDashLoading(false))
  }, [activeTab])

  // ─── START SESSION ───────────────────────────────────────
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [sessionForm, setSessionForm] = useState({ class_id: '', subject_id: '', room_no: '' })
  const [startingSession, setStartingSession] = useState(false)
  const [endingSession, setEndingSession] = useState(false)

  useEffect(() => {
    if (activeTab !== 'start_session') return
    Promise.all([teacherApi.getClasses(), teacherApi.getSubjects()])
      .then(([cls, subs]) => {
        setClasses(cls)
        setSubjects(subs)
        if (cls.length > 0) setSessionForm((f) => ({ ...f, class_id: cls[0].id }))
        if (subs.length > 0) setSessionForm((f) => ({ ...f, subject_id: subs[0].id }))
      })
      .catch((err) => showToast(err.message || 'Failed to load classes/subjects.', 'error'))
  }, [activeTab])

  const handleStartSession = async () => {
    if (!sessionForm.class_id || !sessionForm.subject_id) {
      showToast('Select a class and subject.', 'warning')
      return
    }
    setStartingSession(true)
    try {
      const res = await teacherApi.startSession({
        class_id: parseInt(sessionForm.class_id),
        subject_id: parseInt(sessionForm.subject_id),
        room_no: sessionForm.room_no || 'Lab-IoT-1',
      })
      showToast(`Session #${res.session_id} started!`, 'success')
      await fetchActiveSession()
    } catch (err) {
      showToast(err.message || 'Failed to start session.', 'error')
    } finally {
      setStartingSession(false)
    }
  }

  const handleEndSession = async () => {
    if (!activeSession) return
    setEndingSession(true)
    try {
      await teacherApi.endSession(activeSession.id)
      showToast('Session ended successfully.', 'success')
      setActiveSession(null)
      await fetchActiveSession()
    } catch (err) {
      showToast(err.message || 'Failed to end session.', 'error')
    } finally {
      setEndingSession(false)
    }
  }

  // ─── ATTENDANCE TABLE ────────────────────────────────────
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [newRowId, setNewRowId] = useState(null)
  const [scanInput, setScanInput] = useState('')
  const [scanning, setScanning] = useState(false)

  const fetchAttendance = useCallback(async () => {
    if (!activeSession) return
    setAttendanceLoading(true)
    try {
      const data = await teacherApi.getSessionAttendance(activeSession.id)
      setAttendanceRecords(data.records || [])
    } catch (err) {
      showToast(err.message || 'Failed to load attendance.', 'error')
    } finally {
      setAttendanceLoading(false)
    }
  }, [activeSession])

  useEffect(() => {
    if (activeTab !== 'attendance_table') return
    fetchAttendance()
    const interval = setInterval(fetchAttendance, 5000)
    return () => clearInterval(interval)
  }, [activeTab, fetchAttendance])

  const handleSimulateScan = async () => {
    if (!scanInput.trim()) { showToast('Enter a Roll No or Card UID.', 'warning'); return }
    if (!activeSession) { showToast('No active session. Start one first.', 'error'); return }
    setScanning(true)
    try {
      const res = await teacherApi.processScan({ student_id: scanInput.trim(), session_id: activeSession.id })
      if (res.status === 'TEACHER_DETECTED') {
        showToast(res.message, 'warning')
      } else {
        showToast(`✓ ${res.record.name} marked PRESENT`, 'success')
        setNewRowId(res.record.record_id)
        setTimeout(() => setNewRowId(null), 3000)
      }
      setScanInput('')
      await fetchAttendance()
    } catch (err) {
      showToast(err.message || 'Scan failed.', 'error')
    } finally {
      setScanning(false)
    }
  }

  const attendanceColumns = [
    { header: 'Time', key: 'timestamp', render: (r) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.825rem' }}>{fmtTime(r.timestamp)}</span> },
    { header: 'Roll No', key: 'roll_no', render: (r) => <strong>{r.roll_no}</strong> },
    { header: 'Name', key: 'name' },
    { header: 'Card UID', key: 'card_id', render: (r) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.775rem', color: 'var(--text-muted)' }}>{r.card_id}</span> },
    { header: 'Status', key: 'status', render: (r) => <StatusBadge status={r.status} /> },
    { header: 'Verification', key: 'verification_status', render: (r) => <StatusBadge status={r.verification_status} type="verification" /> },
  ]

  // ─── MANUAL CORRECTION ───────────────────────────────────
  const [correctionRecords, setCorrectionRecords] = useState([])
  const [correctionLoading, setCorrectionLoading] = useState(false)
  const [correctionDialog, setCorrectionDialog] = useState(null)
  const [correctionReason, setCorrectionReason] = useState('')
  const [correctionStatus, setCorrectionStatus] = useState('PRESENT')
  const [submittingCorrection, setSubmittingCorrection] = useState(false)

  useEffect(() => {
    if (activeTab !== 'manual_attendance' || !activeSession) return
    setCorrectionLoading(true)
    teacherApi.getSessionAttendance(activeSession.id)
      .then((data) => setCorrectionRecords(data.records || []))
      .catch((err) => showToast(err.message || 'Failed to load records.', 'error'))
      .finally(() => setCorrectionLoading(false))
  }, [activeTab, activeSession])

  const handleCorrection = async () => {
    if (!correctionReason.trim()) { showToast('A reason is mandatory for corrections.', 'warning'); return }
    setSubmittingCorrection(true)
    try {
      await teacherApi.correctAttendance({
        record_id: correctionDialog.record_id,
        new_status: correctionStatus,
        reason: correctionReason.trim(),
      })
      showToast(`Correction applied for ${correctionDialog.name}.`, 'success')
      setCorrectionDialog(null)
      setCorrectionReason('')
      const data = await teacherApi.getSessionAttendance(activeSession.id)
      setCorrectionRecords(data.records || [])
    } catch (err) {
      showToast(err.message || 'Failed to apply correction.', 'error')
    } finally {
      setSubmittingCorrection(false)
    }
  }

  const correctionColumns = [
    { header: 'Roll No', key: 'roll_no', render: (r) => <strong>{r.roll_no}</strong> },
    { header: 'Name', key: 'name' },
    { header: 'Time', key: 'timestamp', render: (r) => fmtTime(r.timestamp) },
    { header: 'Status', key: 'status', render: (r) => <StatusBadge status={r.status} /> },
    {
      header: 'Action', key: 'actions',
      render: (r) => (
        <button className="btn btn-secondary" style={{ fontSize: '0.775rem', padding: '0.3rem 0.75rem' }}
          onClick={() => { setCorrectionDialog({ record_id: r.record_id, name: r.name }); setCorrectionStatus(r.status === 'PRESENT' ? 'ABSENT' : 'PRESENT'); setCorrectionReason('') }}>
          <Edit3 size={13} /> Correct
        </button>
      ),
    },
  ]

  // ─── HEADCOUNT ───────────────────────────────────────────
  const [hcSettings, setHcSettings] = useState(null)
  const [hcHistory, setHcHistory] = useState([])
  const [hcLoading, setHcLoading] = useState(false)
  const [runningHc, setRunningHc] = useState(false)
  const [hcResult, setHcResult] = useState(null)
  const [savingHcSettings, setSavingHcSettings] = useState(false)

  useEffect(() => {
    if (activeTab !== 'headcount') return
    setHcLoading(true)
    Promise.all([teacherApi.getHeadcountSettings(), teacherApi.getHeadcountHistory()])
      .then(([settings, history]) => { setHcSettings(settings); setHcHistory(history) })
      .catch((err) => showToast(err.message || 'Failed to load headcount data.', 'error'))
      .finally(() => setHcLoading(false))
  }, [activeTab])

  const handleRunHeadcount = async () => {
    if (!activeSession) { showToast('No active session for headcount.', 'error'); return }
    setRunningHc(true); setHcResult(null)
    try {
      const res = await teacherApi.runHeadcount(activeSession.id)
      setHcResult(res)
      showToast(`Headcount: ${res.headcount_detected} detected.`, 'success')
      const history = await teacherApi.getHeadcountHistory()
      setHcHistory(history)
    } catch (err) {
      showToast(err.message || 'Headcount failed.', 'error')
    } finally {
      setRunningHc(false)
    }
  }

  const handleSaveHcSettings = async () => {
    if (!hcSettings) return
    setSavingHcSettings(true)
    try {
      await teacherApi.updateHeadcountSettings({
        interval_minutes: hcSettings.interval_minutes,
        is_enabled: hcSettings.is_enabled,
        camera_source: hcSettings.camera_source,
        camera_type: hcSettings.camera_type,
        rtsp_username: hcSettings.rtsp_username,
        rtsp_password: hcSettings.rtsp_password_masked === '********' ? null : hcSettings.rtsp_password_masked,
      })
      showToast('Settings saved!', 'success')
    } catch (err) {
      showToast(err.message || 'Failed to save settings.', 'error')
    } finally {
      setSavingHcSettings(false)
    }
  }

  const hcHistoryColumns = [
    { header: 'Timestamp', key: 'timestamp', render: (r) => fmtDateTime(r.timestamp) },
    { header: 'Detected', key: 'detected_count', render: (r) => <strong>{r.detected_count}</strong> },
    { header: 'RFID Count', key: 'expected_count', render: (r) => r.expected_count },
    { header: 'Result', key: 'status', render: (r) => <StatusBadge status={r.status} /> },
  ]

  // ─── VERIFICATION ────────────────────────────────────────
  const [verificationLogs, setVerificationLogs] = useState([])
  const [verificationLoading, setVerificationLoading] = useState(false)
  const [reviewDialog, setReviewDialog] = useState(null)
  const [reviewStatus, setReviewStatus] = useState('RESOLVED_VALID')
  const [reviewNotes, setReviewNotes] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    if (activeTab !== 'verification') return
    setVerificationLoading(true)
    teacherApi.getVerificationLogs()
      .then((data) => setVerificationLogs(data))
      .catch((err) => showToast(err.message || 'Failed to load verification logs.', 'error'))
      .finally(() => setVerificationLoading(false))
  }, [activeTab])

  const handleReview = async () => {
    if (!reviewNotes.trim()) { showToast('Add review notes.', 'warning'); return }
    setSubmittingReview(true)
    try {
      await teacherApi.reviewVerification({ log_id: reviewDialog.id, review_status: reviewStatus, reviewer_notes: reviewNotes.trim() })
      showToast('Review submitted.', 'success')
      setReviewDialog(null); setReviewNotes('')
      const data = await teacherApi.getVerificationLogs()
      setVerificationLogs(data)
    } catch (err) {
      showToast(err.message || 'Failed to submit review.', 'error')
    } finally {
      setSubmittingReview(false)
    }
  }

  const verificationColumns = [
    { header: 'Date', key: 'created_at', render: (r) => fmtDate(r.created_at) },
    { header: 'Session', key: 'session_id', render: (r) => `#${r.session_id}` },
    { header: 'RFID', key: 'rfid_count', render: (r) => r.rfid_count ?? '—' },
    { header: 'Camera', key: 'camera_count', render: (r) => r.camera_count ?? '—' },
    { header: 'Gap', key: 'discrepancy_count', render: (r) => r.discrepancy_count ?? '—' },
    { header: 'Status', key: 'review_status', render: (r) => <StatusBadge status={r.review_status} /> },
    {
      header: 'Review', key: 'actions',
      render: (r) => r.review_status === 'PENDING' ? (
        <button className="btn btn-secondary" style={{ fontSize: '0.775rem', padding: '0.3rem 0.75rem' }}
          onClick={() => { setReviewDialog(r); setReviewStatus('RESOLVED_VALID'); setReviewNotes('') }}>
          Review
        </button>
      ) : <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>Done</span>,
    },
  ]

  // ─── REPORTS ─────────────────────────────────────────────
  const [allSessions, setAllSessions] = useState([])
  const [selectedReportSession, setSelectedReportSession] = useState('')
  const [reportText, setReportText] = useState('')
  const [loadingReport, setLoadingReport] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (activeTab !== 'reports') return
    teacherApi.getAllSessions()
      .then((data) => { setAllSessions(data); if (data.length > 0) setSelectedReportSession(data[0].id) })
      .catch((err) => showToast(err.message || 'Failed to load sessions.', 'error'))
  }, [activeTab])

  const handleCopyReport = async () => {
    if (!selectedReportSession) { showToast('Select a session.', 'warning'); return }
    setLoadingReport(true)
    try {
      const res = await teacherApi.getReportCopy(selectedReportSession)
      setReportText(res.report_text || '')
      await navigator.clipboard.writeText(res.report_text || '')
      setCopied(true); showToast('Copied to clipboard!', 'success')
      setTimeout(() => setCopied(false), 2500)
    } catch (err) {
      showToast(err.message || 'Failed to copy report.', 'error')
    } finally {
      setLoadingReport(false)
    }
  }

  const handleExportCSV = async () => {
    if (!selectedReportSession) { showToast('Select a session.', 'warning'); return }
    setExporting(true)
    try {
      const csvText = await teacherApi.exportCsv(selectedReportSession)
      const blob = new Blob([csvText], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_session_${selectedReportSession}.csv`
      a.click()
      URL.revokeObjectURL(url)
      showToast('CSV downloaded!', 'success')
    } catch (err) {
      showToast(err.message || 'Failed to export CSV.', 'error')
    } finally {
      setExporting(false)
    }
  }

  // ─── PROFILE ─────────────────────────────────────────────
  const [teacherProfile, setTeacherProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    if (activeTab !== 'profile') return
    setProfileLoading(true)
    teacherApi.getProfile()
      .then((data) => setTeacherProfile(data))
      .catch((err) => showToast(err.message || 'Failed to load profile.', 'error'))
      .finally(() => setProfileLoading(false))
  }, [activeTab])

  // ─── SETTINGS ────────────────────────────────────────────
  const [settingsData, setSettingsData] = useState(null)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    if (activeTab !== 'settings') return
    setSettingsLoading(true)
    teacherApi.getHeadcountSettings()
      .then((data) => setSettingsData({ ...data }))
      .catch((err) => showToast(err.message || 'Failed to load settings.', 'error'))
      .finally(() => setSettingsLoading(false))
  }, [activeTab])

  const handleSaveSettings = async () => {
    if (!settingsData) return
    setSavingSettings(true)
    try {
      await teacherApi.updateHeadcountSettings({
        interval_minutes: settingsData.interval_minutes,
        is_enabled: settingsData.is_enabled,
        camera_source: settingsData.camera_source,
        camera_type: settingsData.camera_type,
        rtsp_username: settingsData.rtsp_username,
        rtsp_password: settingsData.rtsp_password_masked === '********' ? null : settingsData.rtsp_password_masked,
      })
      showToast('Settings saved!', 'success')
    } catch (err) {
      showToast(err.message || 'Failed to save.', 'error')
    } finally {
      setSavingSettings(false)
    }
  }

  // ─── Shared: Active Session Banner ───────────────────────
  const SessionBanner = () => {
    if (sessionLoading) return null
    if (!activeSession) {
      return (
        <div style={{ padding: '0.875rem 1.25rem', borderRadius: '0.5rem', background: 'var(--status-absent-bg)', border: '1px solid var(--status-absent)', color: 'var(--status-absent)', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <WifiOff size={16} /> No active session. Go to "Start Attendance" to begin.
        </div>
      )
    }
    return (
      <div style={{ padding: '0.875rem 1.25rem', borderRadius: '0.5rem', background: 'var(--status-present-bg)', border: '1px solid var(--status-present)', color: 'var(--status-present)', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <Wifi size={16} />
        <span>🟢 ACTIVE: <strong>{activeSession.subject_name}</strong> — {activeSession.class_name} · Room {activeSession.room_no} · Started {fmtTime(activeSession.start_time)}</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>Session #{activeSession.id}</span>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <Sidebar role="teacher" activeTab={activeTab} onSelectTab={(id) => setActiveTab(id)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header title="Faculty Attendance Dashboard" />

        <main style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>

          {/* ════ DASHBOARD ════ */}
          {activeTab === 'dashboard' && (
            <div>
              <div className="card" style={{ padding: '1.75rem 2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-hover) 100%)' }}>
                <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: 'var(--primary-50)', color: 'var(--primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <GraduationCap size={36} />
                </div>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--status-present)', background: 'var(--status-present-bg)', padding: '0.2rem 0.6rem', borderRadius: '9999px', marginBottom: '0.5rem' }}>
                    <CheckCircle2 size={12} /> Faculty Authenticated
                  </div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>Welcome, {user?.name || 'Professor'}!</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                    Employee ID: <strong>{user?.identifier}</strong> · Department: <strong>{user?.department || 'CSE'}</strong>
                  </p>
                </div>
                <button className="btn btn-secondary" style={{ marginLeft: 'auto', fontSize: '0.825rem' }} onClick={() => setActiveTab('dashboard')}>
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>

              {dashLoading ? <Loading message="Loading dashboard..." /> : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                    <StatCard title="Total Sessions" value={dashStats?.totalSessions ?? 0} subtitle="All time" icon={Layers} color="var(--primary-600)" bg="var(--primary-50)" />
                    <StatCard title="Today's Sessions" value={dashStats?.todaySessions ?? 0} subtitle={new Date().toLocaleDateString()} icon={Clock} color="var(--status-late)" bg="var(--status-late-bg)" />
                    <StatCard title="Active Now" value={dashStats?.activeSessions ?? 0} subtitle={dashStats?.activeSessions > 0 ? 'Session running' : 'No active session'} icon={Activity} color={dashStats?.activeSessions > 0 ? 'var(--status-present)' : 'var(--text-muted)'} bg={dashStats?.activeSessions > 0 ? 'var(--status-present-bg)' : 'var(--bg-hover)'} />
                  </div>

                  {dashStats?.session && (
                    <div className="card" style={{ padding: '1.5rem', border: '1.5px solid var(--status-present)', background: 'var(--status-present-bg)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-present)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                        <Wifi size={16} /> ACTIVE SESSION RUNNING
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{dashStats.session.subject_name}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        {dashStats.session.class_name} · Room {dashStats.session.room_no} · Started {fmtTime(dashStats.session.start_time)}
                      </div>
                      <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setActiveTab('attendance_table')}>
                        <ChevronRight size={16} /> View Live Attendance
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ════ START SESSION ════ */}
          {activeTab === 'start_session' && (
            <div style={{ maxWidth: '640px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Start Attendance Session</h2>

              {activeSession ? (
                <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', border: '1.5px solid var(--status-present)', background: 'var(--status-present-bg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-present)', fontWeight: 700, marginBottom: '0.75rem' }}>
                    <Wifi size={16} /> Active Session Running
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{activeSession.subject_name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{activeSession.class_name} · {activeSession.room_no} · Started {fmtTime(activeSession.start_time)}</div>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                    <button className="btn btn-secondary" onClick={() => setActiveTab('attendance_table')}><Users size={15} /> View Attendance</button>
                    <button className="btn" style={{ background: 'var(--status-absent)', color: '#fff' }} disabled={endingSession} onClick={handleEndSession}>
                      <XCircle size={15} /> {endingSession ? 'Ending...' : 'End Session'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="card" style={{ padding: '1.75rem' }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>No active session. Fill the form and click Start.</p>
                  <div className="form-group">
                    <label className="form-label">Class *</label>
                    <select className="form-input" value={sessionForm.class_id} onChange={(e) => setSessionForm((f) => ({ ...f, class_id: e.target.value }))}>
                      {classes.length === 0 && <option value="">Loading classes...</option>}
                      {classes.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.department} Sem {c.semester} Sec {c.section}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Subject *</label>
                    <select className="form-input" value={sessionForm.subject_id} onChange={(e) => setSessionForm((f) => ({ ...f, subject_id: e.target.value }))}>
                      {subjects.length === 0 && <option value="">Loading subjects...</option>}
                      {subjects.map((s) => <option key={s.id} value={s.id}>[{s.code}] {s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Room / Lab (Optional)</label>
                    <input className="form-input" type="text" placeholder="e.g. Room 301, Lab-IoT-1" value={sessionForm.room_no} onChange={(e) => setSessionForm((f) => ({ ...f, room_no: e.target.value }))} />
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', padding: '0.875rem', fontSize: '1rem' }} disabled={startingSession || classes.length === 0} onClick={handleStartSession}>
                    <PlayCircle size={18} /> {startingSession ? 'Starting...' : 'Start Attendance Session'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ════ ATTENDANCE TABLE ════ */}
          {activeTab === 'attendance_table' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Live Attendance Table</h2>
                <button className="btn btn-secondary" style={{ fontSize: '0.825rem' }} onClick={fetchAttendance} disabled={attendanceLoading}>
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>

              <SessionBanner />

              {activeSession && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <StatCard title="Total Marked" value={attendanceRecords.length} icon={Users} color="var(--primary-600)" bg="var(--primary-50)" />
                    <StatCard title="Present" value={attendanceRecords.filter((r) => r.status === 'PRESENT').length} icon={CheckCircle2} color="var(--status-present)" bg="var(--status-present-bg)" />
                    <StatCard title="Absent" value={attendanceRecords.filter((r) => r.status === 'ABSENT').length} icon={XCircle} color="var(--status-absent)" bg="var(--status-absent-bg)" />
                  </div>

                  <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>Simulate RFID / STM32 Scan</label>
                      <input className="form-input" type="text" placeholder="Roll No or Card UID (e.g. 21cs001)" value={scanInput} onChange={(e) => setScanInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSimulateScan()} style={{ fontFamily: 'var(--font-mono)' }} />
                    </div>
                    <button className="btn btn-primary" disabled={scanning} onClick={handleSimulateScan} style={{ padding: '0.65rem 1.25rem' }}>
                      <Scan size={16} /> {scanning ? 'Scanning...' : 'Scan'}
                    </button>
                  </div>

                  {attendanceLoading ? <Loading message="Loading records..." /> : (
                    <DataTable columns={attendanceColumns} data={attendanceRecords} emptyMessage="No scans yet. Use the simulate box above." rowKey="record_id" />
                  )}
                </>
              )}
            </div>
          )}

          {/* ════ MANUAL CORRECTION ════ */}
          {activeTab === 'manual_attendance' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Manual Attendance Correction</h2>
              <SessionBanner />

              {activeSession && (
                <>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', padding: '0.75rem 1rem', borderRadius: '0.375rem', background: 'var(--bg-hover)', border: '1px solid var(--border-default)' }}>
                    ⚠️ Every correction is logged to an immutable audit trail. A detailed reason is <strong>mandatory</strong>.
                  </div>
                  {correctionLoading ? <Loading message="Loading records..." /> : correctionRecords.length === 0
                    ? <EmptyState icon={Users} title="No Records Yet" description="No attendance records found for the active session." />
                    : <DataTable columns={correctionColumns} data={correctionRecords} rowKey="record_id" />
                  }
                </>
              )}

              {correctionDialog && (
                <ConfirmDialog title={`Correct Attendance — ${correctionDialog.name}`} message="" onConfirm={handleCorrection} onCancel={() => setCorrectionDialog(null)} confirmLabel={submittingCorrection ? 'Applying...' : 'Apply Correction'} confirmDisabled={submittingCorrection}>
                  <div className="form-group" style={{ marginTop: '0.5rem' }}>
                    <label className="form-label">New Status</label>
                    <select className="form-input" value={correctionStatus} onChange={(e) => setCorrectionStatus(e.target.value)}>
                      <option value="PRESENT">PRESENT</option>
                      <option value="ABSENT">ABSENT</option>
                      <option value="LATE">LATE</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reason * (Mandatory)</label>
                    <textarea className="form-input" rows={3} placeholder="Explain why you are correcting this record..." value={correctionReason} onChange={(e) => setCorrectionReason(e.target.value)} style={{ resize: 'vertical' }} />
                  </div>
                </ConfirmDialog>
              )}
            </div>
          )}

          {/* ════ HEADCOUNT ════ */}
          {activeTab === 'headcount' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Classroom Headcount</h2>
              <SessionBanner />

              {hcLoading ? <Loading message="Loading headcount data..." /> : (
                <>
                  <div className="card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Manual Headcount</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>Records the student count vs RFID swipes. Live camera integration coming in Step 6.</p>
                    <button className="btn btn-primary" style={{ padding: '0.875rem 1.75rem', fontSize: '1rem' }} disabled={runningHc || !activeSession} onClick={handleRunHeadcount}>
                      <Camera size={18} /> {runningHc ? 'Running...' : 'START HEADCOUNT NOW'}
                    </button>
                    {hcResult && (
                      <div style={{ marginTop: '1.25rem', padding: '1rem 1.25rem', borderRadius: '0.5rem', background: 'var(--status-present-bg)', border: '1px solid var(--status-present)' }}>
                        <div style={{ fontWeight: 700, color: 'var(--status-present)', marginBottom: '0.5rem' }}>✓ Headcount Complete</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          Detected: <strong>{hcResult.headcount_detected}</strong> · RFID: <strong>{hcResult.rfid_swipes_count}</strong> · Result: <strong>{hcResult.status}</strong>
                        </div>
                      </div>
                    )}
                  </div>

                  {hcSettings && (
                    <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                      <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Auto Timer Settings</h3>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1, minWidth: '180px' }}>
                          <label className="form-label">Interval (minutes)</label>
                          <input className="form-input" type="number" min={1} max={120} value={hcSettings.interval_minutes} onChange={(e) => setHcSettings((s) => ({ ...s, interval_minutes: parseInt(e.target.value) || 1 }))} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.5rem' }}>
                          <input type="checkbox" id="hc-enabled" checked={hcSettings.is_enabled} onChange={(e) => setHcSettings((s) => ({ ...s, is_enabled: e.target.checked }))} />
                          <label htmlFor="hc-enabled" style={{ fontSize: '0.875rem', fontWeight: 600 }}>Enabled</label>
                        </div>
                        <button className="btn btn-secondary" disabled={savingHcSettings} onClick={handleSaveHcSettings}>
                          {savingHcSettings ? 'Saving...' : 'Save Timer'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Headcount History</h3>
                    {hcHistory.length === 0
                      ? <EmptyState icon={Camera} title="No Headcount Records" description="Run a headcount to create the first record." />
                      : <DataTable columns={hcHistoryColumns} data={hcHistory} rowKey="id" />
                    }
                  </div>
                </>
              )}
            </div>
          )}

          {/* ════ VERIFICATION ════ */}
          {activeTab === 'verification' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Verification History</h2>
              {verificationLoading ? <Loading message="Loading logs..." /> : verificationLogs.length === 0
                ? <EmptyState icon={ShieldAlert} title="No Verification Logs" description="Logs appear here after headcount detects discrepancies." />
                : <DataTable columns={verificationColumns} data={verificationLogs} rowKey="id" />
              }
              {reviewDialog && (
                <ConfirmDialog title="Review Verification Discrepancy" message={`Session #${reviewDialog.session_id} · RFID: ${reviewDialog.rfid_count} · Camera: ${reviewDialog.camera_count} · Gap: ${reviewDialog.discrepancy_count}`} onConfirm={handleReview} onCancel={() => setReviewDialog(null)} confirmLabel={submittingReview ? 'Submitting...' : 'Submit Review'} confirmDisabled={submittingReview}>
                  <div className="form-group" style={{ marginTop: '0.75rem' }}>
                    <label className="form-label">Resolution</label>
                    <select className="form-input" value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value)}>
                      <option value="RESOLVED_VALID">Resolved — Count is valid, no issue</option>
                      <option value="RESOLVED_PROXY_CONFIRMED">Resolved — Proxy attendance confirmed</option>
                      <option value="RESOLVED_HARDWARE_GLITCH">Resolved — Hardware / Camera glitch</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Review Notes *</label>
                    <textarea className="form-input" rows={3} placeholder="Describe your finding..." value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} style={{ resize: 'vertical' }} />
                  </div>
                </ConfirmDialog>
              )}
            </div>
          )}

          {/* ════ REPORTS ════ */}
          {activeTab === 'reports' && (
            <div style={{ maxWidth: '720px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Attendance Reports</h2>
              <div className="card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Select Session</label>
                  <select className="form-input" value={selectedReportSession} onChange={(e) => { setSelectedReportSession(e.target.value); setReportText('') }}>
                    {allSessions.length === 0 && <option value="">No sessions found</option>}
                    {allSessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        #{s.id} · {s.subject_name} — {s.class_name} · {s.start_time ? new Date(s.start_time).toLocaleDateString() : 'N/A'} [{s.status}]
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" disabled={loadingReport || !selectedReportSession} onClick={handleCopyReport}>
                    <Copy size={15} /> {copied ? '✓ Copied!' : loadingReport ? 'Loading...' : 'Copy Attendance'}
                  </button>
                  <button className="btn btn-secondary" disabled={exporting || !selectedReportSession} onClick={handleExportCSV}>
                    <Download size={15} /> {exporting ? 'Exporting...' : 'Export CSV'}
                  </button>
                </div>
              </div>
              {reportText && (
                <div className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>Report Preview</div>
                  <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', lineHeight: 1.6, background: 'var(--bg-hover)', padding: '1rem', borderRadius: '0.375rem', border: '1px solid var(--border-default)' }}>{reportText}</pre>
                </div>
              )}
            </div>
          )}

          {/* ════ PROFILE ════ */}
          {activeTab === 'profile' && (
            <div style={{ maxWidth: '640px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Faculty Profile</h2>
              {profileLoading ? <Loading message="Loading profile..." /> : (
                <div className="card" style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem' }}>
                    <div style={{ width: '5rem', height: '5rem', borderRadius: '1.25rem', background: 'linear-gradient(135deg, var(--primary-600), #06b6d4)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-md)' }}>
                      <GraduationCap size={36} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{teacherProfile?.name || user?.name || '—'}</h2>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Faculty / Instructor</p>
                    </div>
                  </div>
                  {teacherProfile ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {[
                        { label: 'Full Name', value: teacherProfile.name, icon: User },
                        { label: 'Employee ID', value: teacherProfile.employee_id, mono: true, icon: IdCard },
                        { label: 'Email', value: teacherProfile.email, icon: Activity },
                        { label: 'Department', value: teacherProfile.department, icon: Building },
                        { label: 'Designation', value: teacherProfile.designation, icon: GraduationCap },
                      ].map(({ label, value, mono, icon: Icon }) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1rem', borderRadius: '0.5rem', background: 'var(--bg-hover)', border: '1px solid var(--border-default)' }}>
                          <div style={{ width: '2rem', height: '2rem', borderRadius: '0.375rem', background: 'var(--primary-50)', color: 'var(--primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={16} />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 600, fontFamily: mono ? 'var(--font-mono)' : undefined, color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>{value || 'Not on record'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <EmptyState icon={User} title="Profile Not Found" description="Could not load profile from server." />}
                </div>
              )}
            </div>
          )}

          {/* ════ SETTINGS ════ */}
          {activeTab === 'settings' && (
            <div style={{ maxWidth: '640px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>System Settings</h2>
              {settingsLoading ? <Loading message="Loading settings..." /> : settingsData ? (
                <div className="card" style={{ padding: '1.75rem' }}>
                  <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>Headcount Timer & Camera</h3>
                  <div className="form-group">
                    <label className="form-label">Auto Headcount Interval (minutes)</label>
                    <input className="form-input" type="number" min={1} max={120} value={settingsData.interval_minutes} onChange={(e) => setSettingsData((s) => ({ ...s, interval_minutes: parseInt(e.target.value) || 1 }))} />
                  </div>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input type="checkbox" id="settings-enabled" checked={settingsData.is_enabled} onChange={(e) => setSettingsData((s) => ({ ...s, is_enabled: e.target.checked }))} />
                    <label htmlFor="settings-enabled" style={{ fontSize: '0.875rem', fontWeight: 600 }}>Enable automatic headcount timer</label>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Camera Source</label>
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      {['WEBCAM', 'RTSP_CCTV'].map((type) => (
                        <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                          <input type="radio" name="camera_type" value={type} checked={settingsData.camera_type === type} onChange={(e) => setSettingsData((s) => ({ ...s, camera_type: e.target.value }))} />
                          {type === 'WEBCAM' ? '💻 Laptop Webcam' : '📡 CCTV / RTSP'}
                        </label>
                      ))}
                    </div>
                    <input className="form-input" type="text" placeholder={settingsData.camera_type === 'WEBCAM' ? 'Camera index: 0, 1, 2...' : 'rtsp://user:pass@192.168.1.100:554/stream'} value={settingsData.camera_source} onChange={(e) => setSettingsData((s) => ({ ...s, camera_source: e.target.value }))} style={{ fontFamily: 'var(--font-mono)' }} />
                  </div>
                  {settingsData.camera_type === 'RTSP_CCTV' && (
                    <>
                      <div className="form-group">
                        <label className="form-label">RTSP Username</label>
                        <input className="form-input" type="text" value={settingsData.rtsp_username || ''} onChange={(e) => setSettingsData((s) => ({ ...s, rtsp_username: e.target.value }))} placeholder="admin" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">RTSP Password</label>
                        <input className="form-input" type="password" value={settingsData.rtsp_password_masked || ''} onChange={(e) => setSettingsData((s) => ({ ...s, rtsp_password_masked: e.target.value }))} placeholder="Password (masked)" />
                      </div>
                    </>
                  )}
                  <button className="btn btn-primary" style={{ width: '100%', padding: '0.875rem', marginTop: '0.5rem' }} disabled={savingSettings} onClick={handleSaveSettings}>
                    <Settings size={16} /> {savingSettings ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              ) : <EmptyState icon={Settings} title="Settings Not Found" description="Could not load settings from server." />}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
