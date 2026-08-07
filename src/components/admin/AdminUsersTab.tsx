import { useEffect, useState, useCallback } from 'react'
import { API_BASE_URL } from '@/config/api'
import { SectionTitle } from '@/components/admin/adminHelpers'
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  LogIn, History, X, Clock, TreePine, ShieldAlert,
} from 'lucide-react'

// --- Types -------------------------------------------------------------------

interface TreeInfo {
  treeId: string
  treeName: string
  memberCount: number
}

interface UserRow {
  userId: string
  email: string
  fullName: string | null
  source: string
  treeCount: number
  createdAt: string
  trees: TreeInfo[]
  lastLogin: string | null
}

interface SessionRow {
  sessionId: string
  loginAt: string
  lastActiveAt: string
  logoutAt: string | null
  loginMethod: string
}

interface EditRow {
  changelogId: string
  entityType: string
  entityId: string
  entityName: string | null
  treeId: string
  action: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  timestamp: string
  reason: string | null
  dataSource: string
}

// --- Helpers -----------------------------------------------------------------

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}-${mm}-${yy}`;
  } catch {
    return iso;
  }
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    const timeStr = d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${dd}-${mm}-${yy} ${timeStr}`;
  } catch {
    return iso;
  }
}

function sessionDuration(loginAt: string, lastActiveAt: string): string {
  const ms = new Date(lastActiveAt).getTime() - new Date(loginAt).getTime()
  if (ms < 60_000) return '< 1 min'
  const mins = Math.floor(ms / 60_000)
  if (mins < 60) return `${mins} min`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  return `${hrs}h ${rem}m`
}

function actionBadge(action: string): string {
  switch (action.toUpperCase()) {
    case 'CREATE': return 'bg-green-900/50 text-green-300'
    case 'UPDATE': return 'bg-blue-900/50 text-blue-300'
    case 'DELETE': return 'bg-red-900/50 text-red-300'
    default: return 'bg-gray-700/50 text-gray-300'
  }
}

// --- Component ---------------------------------------------------------------

interface Props {
  adminToken: string | null
}

export function AdminUsersTab({ adminToken }: Props) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const PAGE_SIZE = 50

  // Modal state
  const [sessionsModal, setSessionsModal] = useState<{ user: UserRow; sessions: SessionRow[] } | null>(null)
  const [editsModal, setEditsModal] = useState<{ user: UserRow; edits: EditRow[] } | null>(null)
  const [modalLoading, setModalLoading] = useState(false)

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  }), [adminToken])

  // Fetch users page
  const fetchUsers = useCallback(async (p: number) => {
    if (!adminToken) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users?page=${p}&limit=${PAGE_SIZE}`, { headers: headers() })
      if (res.ok) {
        const d = await res.json()
        setUsers(d.users || [])
        setTotal(d.total || 0)
        setTotalPages(d.totalPages || 1)
        setPage(d.page || p)
      }
    } finally {
      setLoading(false)
    }
  }, [adminToken, headers])

  useEffect(() => { fetchUsers(1) }, [fetchUsers])

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages || p === page) return
    fetchUsers(p)
  }

  // Generate visible page numbers (show up to 7 pages around current)
  const pageNumbers = (): number[] => {
    const pages: number[] = []
    let start = Math.max(1, page - 3)
    let end = Math.min(totalPages, page + 3)
    if (end - start < 6) {
      if (start === 1) end = Math.min(totalPages, start + 6)
      else start = Math.max(1, end - 6)
    }
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }

  // Open login sessions modal
  const openSessions = async (user: UserRow) => {
    setModalLoading(true)
    setSessionsModal({ user, sessions: [] })
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${user.userId}/sessions`, { headers: headers() })
      if (res.ok) {
        const sessions = await res.json()
        setSessionsModal({ user, sessions })
      }
    } finally {
      setModalLoading(false)
    }
  }

  // Open edit history modal
  const openEdits = async (user: UserRow) => {
    setModalLoading(true)
    setEditsModal({ user, edits: [] })
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${user.userId}/edits?limit=50`, { headers: headers() })
      if (res.ok) {
        const edits = await res.json()
        setEditsModal({ user, edits })
      }
    } finally {
      setModalLoading(false)
    }
  }

  const startIdx = (page - 1) * PAGE_SIZE + 1
  const endIdx = Math.min(page * PAGE_SIZE, total)

  return (
    <>
      {/* User table */}
      <div className="bg-[#3D2E1F] rounded-xl border border-[#5A4333] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#5A4333] flex items-center justify-between">
          <SectionTitle>All Users ({total})</SectionTitle>
          <span className="text-xs text-[#8B7355]">
            Showing {startIdx}–{endIdx} of {total}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#C2A46D] border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#B8A090] text-xs border-b border-[#5A4333]">
                  <th className="px-3 py-3 text-left font-medium w-8">#</th>
                  <th className="px-3 py-3 text-left font-medium">Email</th>
                  <th className="px-3 py-3 text-left font-medium">Name</th>
                  <th className="px-3 py-3 text-left font-medium">Auth</th>
                  <th className="px-3 py-3 text-left font-medium">Trees & Members</th>
                  <th className="px-3 py-3 text-left font-medium">Registered</th>
                  <th className="px-3 py-3 text-left font-medium">Last Login</th>
                  <th className="px-3 py-3 text-center font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, idx) => (
                  <tr key={u.userId} className="border-b border-[#5A4333]/50 hover:bg-[#4A3828]/30 transition-colors">
                    <td className="px-3 py-3 text-[#8B7355] text-xs">{startIdx + idx}</td>
                    <td className="px-3 py-3 text-gray-200 text-xs">{u.email}</td>
                    <td className="px-3 py-3 text-[#E2DBCE]">{u.fullName || '—'}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        u.source === 'keycloak'
                          ? 'bg-purple-900/50 text-purple-300'
                          : 'bg-blue-900/50 text-blue-300'
                      }`}>
                        {u.source === 'keycloak' ? 'Keycloak' : 'Local'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {u.treeCount === 0 ? (
                        <span className="text-[#8B7355] text-xs">No trees</span>
                      ) : (
                        <div className="space-y-1">
                          {u.trees.map(t => (
                            <div key={t.treeId} className="flex items-center gap-1.5 text-xs">
                              <TreePine size={12} className="text-[#C2A46D] shrink-0" />
                              <span className="text-[#E2DBCE] truncate max-w-[140px]" title={t.treeName}>
                                {t.treeName}
                              </span>
                              <span className="text-[#8B7355]">({t.memberCount})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-[#B8A090] text-xs">
                      {fmtDate(u.createdAt)}
                    </td>
                    <td className="px-3 py-3 text-[#B8A090] text-xs">
                      {fmtDateTime(u.lastLogin)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openSessions(u)}
                          className="p-1.5 rounded hover:bg-[#5A4333] transition-colors group"
                          title="Login history"
                        >
                          <LogIn size={15} className="text-[#8B7355] group-hover:text-[#C2A46D]" />
                        </button>
                        <button
                          onClick={() => openEdits(u)}
                          className="p-1.5 rounded hover:bg-[#5A4333] transition-colors group"
                          title="Edit history"
                        >
                          <History size={15} className="text-[#8B7355] group-hover:text-[#C2A46D]" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`Impersonate ${u.email}? You'll be signed in as them with a 15-minute session. All actions are logged.`)) return;
                            try {
                              const res = await fetch(`${API_BASE_URL}/admin/impersonate/${u.userId}`, {
                                method: 'POST',
                                headers: headers(),
                              });
                              if (!res.ok) throw new Error(`HTTP ${res.status}`);
                              const data = await res.json();
                              if (!data.token) throw new Error('No token returned');
                              // Stash the impersonated user JWT and bounce to dashboard.
                              const { setAuthToken } = await import('@/lib/auth');
                              setAuthToken(data.token);
                              window.location.href = '/dashboard';
                            } catch (err) {
                              alert('Impersonation failed: ' + (err instanceof Error ? err.message : String(err)));
                            }
                          }}
                          className="p-1.5 rounded hover:bg-amber-500/20 transition-colors group"
                          title="Impersonate this user (admin only)"
                        >
                          <ShieldAlert size={15} className="text-[#8B7355] group-hover:text-amber-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-[#8B7355]">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-[#5A4333] flex items-center justify-center gap-1">
            <button
              onClick={() => goToPage(1)}
              disabled={page === 1}
              className="p-1.5 rounded hover:bg-[#5A4333] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="First page"
            >
              <ChevronsLeft size={16} className="text-[#B8A090]" />
            </button>
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page === 1}
              className="p-1.5 rounded hover:bg-[#5A4333] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous page"
            >
              <ChevronLeft size={16} className="text-[#B8A090]" />
            </button>

            {pageNumbers().map(p => (
              <button
                key={p}
                onClick={() => goToPage(p)}
                className={`min-w-[32px] h-8 rounded text-xs font-medium transition-colors ${
                  p === page
                    ? 'bg-[#2F3E8F] text-white'
                    : 'text-[#B8A090] hover:bg-[#5A4333]'
                }`}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => goToPage(page + 1)}
              disabled={page === totalPages}
              className="p-1.5 rounded hover:bg-[#5A4333] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next page"
            >
              <ChevronRight size={16} className="text-[#B8A090]" />
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={page === totalPages}
              className="p-1.5 rounded hover:bg-[#5A4333] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Last page"
            >
              <ChevronsRight size={16} className="text-[#B8A090]" />
            </button>
          </div>
        )}
      </div>

      {/* ---- Login Sessions Modal ---- */}
      {sessionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSessionsModal(null)}>
          <div className="bg-[#2A1F14] rounded-xl border border-[#5A4333] w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-[#5A4333] flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-[#E2DBCE] font-semibold flex items-center gap-2">
                  <LogIn size={16} className="text-[#C2A46D]" />
                  Login History
                </h3>
                <p className="text-xs text-[#8B7355] mt-0.5">{sessionsModal.user.email}</p>
              </div>
              <button onClick={() => setSessionsModal(null)} className="p-1 rounded hover:bg-[#5A4333]">
                <X size={18} className="text-[#8B7355]" />
              </button>
            </div>
            <div className="overflow-auto flex-1 p-4">
              {modalLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#C2A46D] border-t-transparent" />
                </div>
              ) : sessionsModal.sessions.length === 0 ? (
                <p className="text-[#8B7355] text-sm text-center py-8">No login sessions found</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[#B8A090] text-xs border-b border-[#5A4333]">
                      <th className="px-3 py-2 text-left font-medium">#</th>
                      <th className="px-3 py-2 text-left font-medium">Login Time</th>
                      <th className="px-3 py-2 text-left font-medium">Method</th>
                      <th className="px-3 py-2 text-left font-medium">Duration</th>
                      <th className="px-3 py-2 text-left font-medium">Last Active</th>
                      <th className="px-3 py-2 text-left font-medium">Logout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionsModal.sessions.map((s, i) => (
                      <tr key={s.sessionId} className="border-b border-[#5A4333]/50 hover:bg-[#4A3828]/20">
                        <td className="px-3 py-2 text-[#8B7355] text-xs">{i + 1}</td>
                        <td className="px-3 py-2 text-[#E2DBCE] text-xs">{fmtDateTime(s.loginAt)}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            s.loginMethod === 'keycloak'
                              ? 'bg-purple-900/50 text-purple-300'
                              : 'bg-blue-900/50 text-blue-300'
                          }`}>
                            {s.loginMethod}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[#B8A090] text-xs flex items-center gap-1">
                          <Clock size={12} className="text-[#8B7355]" />
                          {sessionDuration(s.loginAt, s.lastActiveAt)}
                        </td>
                        <td className="px-3 py-2 text-[#B8A090] text-xs">{fmtDateTime(s.lastActiveAt)}</td>
                        <td className="px-3 py-2 text-xs">
                          {s.logoutAt ? (
                            <span className="text-[#B8A090]">{fmtDateTime(s.logoutAt)}</span>
                          ) : (
                            <span className="text-green-400/80 text-xs">Active</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-5 py-3 border-t border-[#5A4333] text-xs text-[#8B7355] shrink-0">
              Total sessions: {sessionsModal.sessions.length}
            </div>
          </div>
        </div>
      )}

      {/* ---- Edit History Modal ---- */}
      {editsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEditsModal(null)}>
          <div className="bg-[#2A1F14] rounded-xl border border-[#5A4333] w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-[#5A4333] flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-[#E2DBCE] font-semibold flex items-center gap-2">
                  <History size={16} className="text-[#C2A46D]" />
                  Edit History (Last 50)
                </h3>
                <p className="text-xs text-[#8B7355] mt-0.5">{editsModal.user.email}</p>
              </div>
              <button onClick={() => setEditsModal(null)} className="p-1 rounded hover:bg-[#5A4333]">
                <X size={18} className="text-[#8B7355]" />
              </button>
            </div>
            <div className="overflow-auto flex-1 p-4">
              {modalLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#C2A46D] border-t-transparent" />
                </div>
              ) : editsModal.edits.length === 0 ? (
                <p className="text-[#8B7355] text-sm text-center py-8">No edits found</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[#B8A090] text-xs border-b border-[#5A4333]">
                      <th className="px-3 py-2 text-left font-medium">#</th>
                      <th className="px-3 py-2 text-left font-medium">Action</th>
                      <th className="px-3 py-2 text-left font-medium">Entity</th>
                      <th className="px-3 py-2 text-left font-medium">Name</th>
                      <th className="px-3 py-2 text-left font-medium">Timestamp</th>
                      <th className="px-3 py-2 text-left font-medium">Changes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editsModal.edits.map((e, i) => {
                      // Summarize changes for UPDATE actions
                      let changeSummary = ''
                      if (e.action.toUpperCase() === 'UPDATE' && e.before && e.after) {
                        const changed: string[] = []
                        for (const key of Object.keys(e.after)) {
                          if (JSON.stringify(e.before[key]) !== JSON.stringify(e.after[key])) {
                            changed.push(key)
                          }
                        }
                        changeSummary = changed.length > 0 ? changed.join(', ') : '—'
                      } else if (e.action.toUpperCase() === 'CREATE') {
                        changeSummary = 'New record'
                      } else if (e.action.toUpperCase() === 'DELETE') {
                        changeSummary = 'Removed'
                      }

                      return (
                        <tr key={e.changelogId} className="border-b border-[#5A4333]/50 hover:bg-[#4A3828]/20">
                          <td className="px-3 py-2 text-[#8B7355] text-xs">{i + 1}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionBadge(e.action)}`}>
                              {e.action}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-[#B8A090] text-xs">{e.entityType}</td>
                          <td className="px-3 py-2 text-[#E2DBCE] text-xs">{e.entityName || '—'}</td>
                          <td className="px-3 py-2 text-[#B8A090] text-xs">{fmtDateTime(e.timestamp)}</td>
                          <td className="px-3 py-2 text-[#8B7355] text-xs max-w-[200px] truncate" title={changeSummary}>
                            {changeSummary || '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-5 py-3 border-t border-[#5A4333] text-xs text-[#8B7355] shrink-0">
              Showing {editsModal.edits.length} most recent edits
            </div>
          </div>
        </div>
      )}
    </>
  )
}
