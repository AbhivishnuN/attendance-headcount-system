import React, { useState, useEffect } from 'react'
import {
  User,
  BookOpen,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  HelpCircle,
  Send,
  RefreshCw,
  Award,
  Layers,
  FileSpreadsheet,
  IdCard,
  GraduationCap,
  Building,
} from 'lucide-react'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import DataTable from '../components/DataTable'
import SearchFilterBar from '../components/SearchFilterBar'
import Toast from '../components/Toast'
import Loading from '../components/Loading'
import EmptyState from '../components/EmptyState'
import { studentApi } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function StudentDashboard() {
  const { user } = useAuth()
  // 'overview' | 'attendance' | 'issues' | 'profile'
  const [activeTab, setActiveTab] = useState('overview')

  // Data loaded from real backend API — NO defaults, NO fake data
  const [profile, setProfile] = useState(null)
  const [summary, setSummary] = useState(null)
  const [records, setRecords] = useState([])
  const [issues, setIssues] = useState([])

  // UI states
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [toast, setToast] = useState(null)

  // Search & Filter for Attendance History
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('time_desc')

  // Issue submission form
  const [issueType, setIssueType] = useState('Marked Absent while Present')
  const [issueDesc, setIssueDesc] = useState('')
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [submittingIssue, setSubmittingIssue] = useState(false)

  // Fetch all data from backend
  const fetchStudentData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const [profData, sumData, attData, issData] = await Promise.all([
        studentApi.getProfile(),
        studentApi.getSummary(),
        studentApi.getAttendance(),
        studentApi.getIssues(),
      ])
      setProfile(profData)
      setSummary(sumData)
      setRecords(attData.records || [])
      setIssues(issData || [])
      if (isManualRefresh) {
        setToast({ message: 'Records refreshed from server.', type: 'success' })
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to load data from backend.', type: 'error' })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStudentData()
  }, [])

  const handleIssueSubmit = async (e) => {
    e.preventDefault()
    if (!issueDesc.trim()) {
      setToast({ message: 'Please describe your issue before submitting.', type: 'warning' })
      return
    }
    setSubmittingIssue(true)
    try {
      await studentApi.submitIssue({
        session_id: selectedSessionId ? parseInt(selectedSessionId, 10) : null,
        issue_type: issueType,
        description: issueDesc.trim(),
      })
      setToast({ message: 'Issue submitted to faculty successfully.', type: 'success' })
      setIssueDesc('')
      setSelectedSessionId('')
      const updatedIssues = await studentApi.getIssues()
      setIssues(updatedIssues)
    } catch (err) {
      setToast({ message: err.message || 'Failed to submit issue.', type: 'error' })
    } finally {
      setSubmittingIssue(false)
    }
  }

  // Filtered & sorted attendance records
  const filteredRecords = records
    .filter((r) => {
      const q = searchQuery.toLowerCase()
      const matchSearch =
        (r.subject_name || '').toLowerCase().includes(q) ||
        (r.subject_code || '').toLowerCase().includes(q) ||
        (r.teacher_name || '').toLowerCase().includes(q)
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter
      return matchSearch && matchStatus
    })
    .sort((a, b) => {
      if (sortBy === 'time_desc') return new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
      if (sortBy === 'time_asc') return new Date(a.timestamp || 0) - new Date(b.timestamp || 0)
      if (sortBy === 'name_asc') return (a.subject_name || '').localeCompare(b.subject_name || '')
      return 0
    })

  const attendanceColumns = [
    {
      header: 'Date & Time',
      key: 'timestamp',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600 }}>
            {row.timestamp ? new Date(row.timestamp).toLocaleDateString() : 'N/A'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {row.timestamp
              ? new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '-'}
          </div>
        </div>
      ),
    },
    {
      header: 'Subject',
      key: 'subject_name',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.subject_name || '-'}</div>
          <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--primary-600)' }}>
            {row.subject_code || ''}
          </div>
        </div>
      ),
    },
    {
      header: 'Instructor',
      key: 'teacher_name',
      render: (row) => <span style={{ color: 'var(--text-secondary)' }}>{row.teacher_name || '-'}</span>,
    },
    {
      header: 'Method',
      key: 'scan_method',
      render: (row) => (
        <span
          style={{
            fontSize: '0.75rem',
            padding: '0.2rem 0.5rem',
            borderRadius: '0.375rem',
            background: 'var(--bg-hover)',
            border: '1px solid var(--border-default)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {row.scan_method === 'RFID_CARD' ? 'RFID Card' : 'Manual Override'}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'AI Verification',
      key: 'verification_status',
      render: (row) => <StatusBadge status={row.verification_status} type="verification" />,
    },
  ]

  if (loading) {
    return <Loading fullScreen message="Loading your attendance records from the server..." />
  }

  const overallPct = summary?.overall_percentage ?? 0
  const isLow = overallPct < 75

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <Sidebar role="student" activeTab={activeTab} onSelectTab={(id) => setActiveTab(id)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header title="Student Academic Portal" />

        <main style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>

          {/* ─── Top Profile Banner (always visible) ─── */}
          <div
            className="card"
            style={{
              padding: '1.75rem',
              marginBottom: '2rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.5rem',
              background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-hover) 100%)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div
                style={{
                  width: '3.75rem',
                  height: '3.75rem',
                  borderRadius: '1rem',
                  background: 'linear-gradient(135deg, var(--primary-600), #06b6d4)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-md)',
                  flexShrink: 0,
                }}
              >
                <User size={30} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {profile?.name || user?.name || '—'}
                  </h2>
                  {profile?.class_name && (
                    <span
                      style={{
                        fontSize: '0.725rem',
                        fontWeight: 600,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        background: 'var(--primary-50)',
                        color: 'var(--primary-600)',
                        border: '1px solid var(--primary-100)',
                      }}
                    >
                      {profile.class_name}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    fontSize: '0.825rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {profile?.roll_no && (
                    <span>
                      Roll No: <strong>{profile.roll_no}</strong>
                    </span>
                  )}
                  {profile?.student_id && (
                    <>
                      <span>•</span>
                      <span>
                        Card UID: <strong style={{ fontFamily: 'var(--font-mono)' }}>{profile.student_id}</strong>
                      </span>
                    </>
                  )}
                  {profile?.department && (
                    <>
                      <span>•</span>
                      <span>
                        {profile.department} · Semester {profile.semester}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => fetchStudentData(true)}
              disabled={refreshing}
              className="btn btn-secondary"
              style={{ fontSize: '0.825rem' }}
            >
              <RefreshCw size={15} />
              <span>{refreshing ? 'Syncing...' : 'Sync Records'}</span>
            </button>
          </div>

          {/* ─── Stat Cards (always visible on overview) ─── */}
          {activeTab === 'overview' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.25rem',
                marginBottom: '2rem',
              }}
            >
              <StatCard
                title="Overall Attendance"
                value={`${overallPct}%`}
                subtitle={
                  isLow ? (
                    <span style={{ color: 'var(--status-absent)', fontWeight: 600 }}>⚠️ Below 75% threshold</span>
                  ) : (
                    <span style={{ color: 'var(--status-present)', fontWeight: 600 }}>✓ Good Standing</span>
                  )
                }
                icon={Award}
                color={isLow ? 'var(--status-absent)' : 'var(--status-present)'}
                bg={isLow ? 'var(--status-absent-bg)' : 'var(--status-present-bg)'}
              />
              <StatCard
                title="Total Sessions"
                value={summary?.total_classes ?? 0}
                subtitle="Scheduled for your class"
                icon={Layers}
                color="var(--primary-600)"
                bg="var(--primary-50)"
              />
              <StatCard
                title="Present"
                value={summary?.present_classes ?? 0}
                subtitle="Classes attended"
                icon={CheckCircle2}
                color="var(--status-present)"
                bg="var(--status-present-bg)"
              />
              <StatCard
                title="Absent"
                value={summary?.absent_classes ?? 0}
                subtitle="Classes missed"
                icon={XCircle}
                color="var(--status-absent)"
                bg="var(--status-absent-bg)"
              />
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              TAB: OVERVIEW — Subject-wise breakdown
          ═══════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div style={{ marginBottom: '2.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1rem',
                }}
              >
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Subject-Wise Attendance
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Minimum 75% required</span>
              </div>

              {summary?.subject_wise && summary.subject_wise.length > 0 ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
                    gap: '1.25rem',
                  }}
                >
                  {summary.subject_wise.map((sub) => {
                    const subLow = sub.percentage < 75
                    return (
                      <div key={sub.subject_code} className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span
                              style={{
                                fontSize: '0.725rem',
                                fontFamily: 'var(--font-mono)',
                                color: 'var(--primary-600)',
                                fontWeight: 700,
                              }}
                            >
                              {sub.subject_code}
                            </span>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '0.25rem' }}>
                              {sub.subject_name}
                            </h4>
                          </div>
                          <span
                            style={{
                              fontSize: '1.15rem',
                              fontWeight: 800,
                              color: subLow ? 'var(--status-absent)' : 'var(--status-present)',
                            }}
                          >
                            {sub.percentage}%
                          </span>
                        </div>
                        <div
                          style={{
                            width: '100%',
                            height: '8px',
                            background: 'var(--bg-hover)',
                            borderRadius: '9999px',
                            overflow: 'hidden',
                            margin: '1rem 0 0.5rem',
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(100, sub.percentage)}%`,
                              height: '100%',
                              background: subLow ? 'var(--status-absent)' : 'var(--status-present)',
                              borderRadius: '9999px',
                              transition: 'width 400ms ease',
                            }}
                          />
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.775rem',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <span>
                            Attended: <strong>{sub.present_sessions}</strong> / {sub.total_sessions}
                          </span>
                          <span style={{ color: subLow ? 'var(--status-absent)' : 'var(--status-present)' }}>
                            {subLow ? '⚠️ Shortage' : '✓ OK'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={BookOpen}
                  title="No Subject Data Yet"
                  description="No attendance sessions have been conducted for your class yet."
                />
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              TAB: ATTENDANCE — Full history table
          ═══════════════════════════════════════════════════ */}
          {activeTab === 'attendance' && (
            <div style={{ marginBottom: '2.5rem' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Detailed Attendance History
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Every RFID swipe and session logged for your account
                </p>
              </div>

              <SearchFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                sortBy={sortBy}
                onSortChange={setSortBy}
                placeholder="Search by subject, code, or instructor..."
              />

              <DataTable
                columns={attendanceColumns}
                data={filteredRecords}
                emptyMessage="No records match your search. Try clearing the filters."
                rowKey="record_id"
              />
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              TAB: ISSUES — Submit & track dispute requests
          ═══════════════════════════════════════════════════ */}
          {activeTab === 'issues' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem',
              }}
            >
              {/* Submit New Issue */}
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div
                    style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '0.5rem',
                      background: 'var(--primary-50)',
                      color: 'var(--primary-600)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <HelpCircle size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Report Attendance Issue</h3>
                    <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                      Dispute an absence or report an RFID failure
                    </p>
                  </div>
                </div>

                <form onSubmit={handleIssueSubmit}>
                  <div className="form-group">
                    <label className="form-label">Issue Category</label>
                    <select
                      className="form-input"
                      value={issueType}
                      onChange={(e) => setIssueType(e.target.value)}
                    >
                      <option value="Marked Absent while Present">Marked Absent while Present</option>
                      <option value="Card Read Failure / RFID Error">Card Read Failure / RFID Error</option>
                      <option value="On Duty (OD) / College Event">On Duty (OD) / College Event</option>
                      <option value="Medical Leave / Approved Absence">Medical Leave / Approved Absence</option>
                      <option value="Other Discrepancy">Other Discrepancy</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Related Session (Optional)</label>
                    <select
                      className="form-input"
                      value={selectedSessionId}
                      onChange={(e) => setSelectedSessionId(e.target.value)}
                    >
                      <option value="">General Issue / Any Session</option>
                      {records.slice(0, 15).map((r) => (
                        <option key={r.record_id} value={r.session_id}>
                          {r.subject_name} — {r.timestamp ? new Date(r.timestamp).toLocaleDateString() : 'Recent'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Detailed Explanation *</label>
                    <textarea
                      className="form-input"
                      rows={4}
                      placeholder="Describe the issue clearly (e.g., 'I was present in Room 101 but the RFID scanner did not register my card')..."
                      value={issueDesc}
                      onChange={(e) => setIssueDesc(e.target.value)}
                      required
                      style={{ resize: 'vertical' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingIssue}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.75rem' }}
                  >
                    {submittingIssue ? (
                      <span>Submitting...</span>
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Submit Issue to Faculty</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Issue Status List */}
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div
                    style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '0.5rem',
                      background: 'var(--bg-hover)',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Clock size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                      My Requests ({issues.length})
                    </h3>
                    <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                      Track status and faculty feedback
                    </p>
                  </div>
                </div>

                {issues.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    {issues.map((iss) => (
                      <div
                        key={iss.id}
                        style={{
                          padding: '1rem',
                          borderRadius: '0.5rem',
                          background: 'var(--bg-hover)',
                          border: '1px solid var(--border-default)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '0.375rem',
                          }}
                        >
                          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{iss.issue_type}</span>
                          <StatusBadge status={iss.status} />
                        </div>
                        <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                          {iss.description}
                        </p>
                        {iss.teacher_remarks && (
                          <div
                            style={{
                              marginTop: '0.625rem',
                              padding: '0.5rem 0.75rem',
                              borderRadius: '0.375rem',
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border-strong)',
                              fontSize: '0.775rem',
                            }}
                          >
                            <strong>Faculty Remarks:</strong> {iss.teacher_remarks}
                          </div>
                        )}
                        <div
                          style={{
                            marginTop: '0.5rem',
                            fontSize: '0.725rem',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span>
                            Submitted: {iss.created_at ? new Date(iss.created_at).toLocaleDateString() : 'N/A'}
                          </span>
                          {iss.resolved_at && (
                            <span>Resolved: {new Date(iss.resolved_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={CheckCircle2}
                    title="No Issues Reported"
                    description="You have not submitted any attendance dispute requests yet."
                  />
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              TAB: PROFILE — Full student profile details
          ═══════════════════════════════════════════════════ */}
          {activeTab === 'profile' && (
            <div style={{ maxWidth: '640px' }}>
              <div className="card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem' }}>
                  <div
                    style={{
                      width: '5rem',
                      height: '5rem',
                      borderRadius: '1.25rem',
                      background: 'linear-gradient(135deg, var(--primary-600), #06b6d4)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'var(--shadow-md)',
                    }}
                  >
                    <GraduationCap size={36} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{profile?.name || '—'}</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      Student Profile
                    </p>
                  </div>
                </div>

                {profile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[
                      { label: 'Full Name', value: profile.name, icon: User },
                      { label: 'Roll Number', value: profile.roll_no, icon: FileSpreadsheet },
                      { label: 'RFID Card UID', value: profile.student_id, mono: true, icon: IdCard },
                      { label: 'Department', value: profile.department, icon: Building },
                      { label: 'Semester', value: profile.semester ? `Semester ${profile.semester}` : null, icon: BookOpen },
                      { label: 'Section / Class', value: profile.class_name, icon: GraduationCap },
                    ].map(({ label, value, mono, icon: Icon }) => (
                      <div
                        key={label}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          padding: '0.875rem 1rem',
                          borderRadius: '0.5rem',
                          background: 'var(--bg-hover)',
                          border: '1px solid var(--border-default)',
                        }}
                      >
                        <div
                          style={{
                            width: '2rem',
                            height: '2rem',
                            borderRadius: '0.375rem',
                            background: 'var(--primary-50)',
                            color: 'var(--primary-600)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {label}
                          </div>
                          <div
                            style={{
                              fontSize: '0.95rem',
                              fontWeight: 600,
                              fontFamily: mono ? 'var(--font-mono)' : undefined,
                              color: value ? 'var(--text-primary)' : 'var(--text-muted)',
                            }}
                          >
                            {value || 'Not on record'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={User} title="Profile Not Found" description="Could not load profile from server." />
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
