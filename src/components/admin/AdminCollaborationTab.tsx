import { useEffect, useState, useCallback } from 'react'
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Loader2 } from 'lucide-react'
import { API_BASE_URL } from '@/config/api'
import { StatCard, SectionTitle, SubSectionTitle, EmptyMsg, adminAuthHeaders } from './adminHelpers'

interface CollabOverview {
  totalInvitations: number; pendingInvitations: number; acceptedInvitations: number
  expiredInvitations: number; acceptanceRate: number; sharedTrees: number; totalCollaborators: number
}
interface InvRow { day: string; sent: number; accepted: number }
interface NotifRow { type: string; total: number; readCount: number; readPct: number }
interface FeedbackRow { feedbackId: string; userEmail: string; userName: string; category: string; message: string; createdAt: string }

export function AdminCollaborationTab({ adminToken }: { adminToken: string }) {
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<CollabOverview | null>(null)
  const [invOverTime, setInvOverTime] = useState<InvRow[]>([])
  const [notifRates, setNotifRates] = useState<NotifRow[]>([])
  const [feedback, setFeedback] = useState<FeedbackRow[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const h = adminAuthHeaders(adminToken)
    try {
      const [ovRes, iotRes, nrRes, fbRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/stats/collaboration-overview`, { headers: h }),
        fetch(`${API_BASE_URL}/admin/stats/invitations-over-time?days=30`, { headers: h }),
        fetch(`${API_BASE_URL}/admin/stats/notification-read-rates`, { headers: h }),
        fetch(`${API_BASE_URL}/admin/stats/feedback-list?limit=50`, { headers: h }),
      ])
      if (ovRes.ok) setOverview(await ovRes.json())
      if (iotRes.ok) setInvOverTime(await iotRes.json())
      if (nrRes.ok) setNotifRates(await nrRes.json())
      if (fbRes.ok) setFeedback(await fbRes.json())
    } catch (err) { console.error('Collaboration fetch error:', err) }
    finally { setLoading(false) }
  }, [adminToken])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading && !overview) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#2F3E8F]" /></div>
  }

  return (
    <div className="space-y-10">
      {/* Collaboration Section */}
      <div>
        <SubSectionTitle>Collaboration</SubSectionTitle>
        {overview && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Invitations" value={overview.totalInvitations} sub={`${overview.pendingInvitations} pending`} />
            <StatCard label="Acceptance Rate" value={`${overview.acceptanceRate}%`} sub={`${overview.acceptedInvitations} accepted`} />
            <StatCard label="Shared Trees" value={overview.sharedTrees} />
            <StatCard label="Active Collaborators" value={overview.totalCollaborators} />
          </div>
        )}

        {/* Invitations over time */}
        <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333]">
          <SectionTitle>Invitations Sent vs Accepted (30 days)</SectionTitle>
          {invOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={invOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                <Line type="monotone" dataKey="sent" stroke="#2F3E8F" strokeWidth={2} dot={false} name="Sent" />
                <Line type="monotone" dataKey="accepted" stroke="#10b981" strokeWidth={2} dot={false} name="Accepted" />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyMsg />}
        </div>
      </div>

      {/* Notification Read Rates */}
      <div>
        <SubSectionTitle>Notification Read Rates (30 days)</SubSectionTitle>
        <div className="bg-[#3D2E1F] rounded-xl border border-[#5A4333] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#B8A090] text-xs border-b border-[#5A4333]">
                  <th className="px-4 py-3 text-left font-medium">Notification Type</th>
                  <th className="px-4 py-3 text-left font-medium">Total</th>
                  <th className="px-4 py-3 text-left font-medium">Read</th>
                  <th className="px-4 py-3 text-left font-medium">Read %</th>
                </tr>
              </thead>
              <tbody>
                {notifRates.map((n, i) => (
                  <tr key={n.type || i} className="border-b border-[#5A4333]/50 hover:bg-[#4A3828]/30">
                    <td className="px-4 py-3 text-gray-200">{n.type}</td>
                    <td className="px-4 py-3 text-[#E2DBCE]">{n.total}</td>
                    <td className="px-4 py-3 text-green-400">{n.readCount}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        n.readPct >= 70 ? 'bg-green-900/50 text-green-300' :
                        n.readPct >= 40 ? 'bg-yellow-900/50 text-yellow-300' :
                        'bg-red-900/40 text-red-300'
                      }`}>
                        {n.readPct}%
                      </span>
                    </td>
                  </tr>
                ))}
                {notifRates.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-[#8B7355]">No notifications in the last 30 days</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* User Feedback */}
      <div>
        <SubSectionTitle>User Feedback</SubSectionTitle>
        <div className="bg-[#3D2E1F] rounded-xl border border-[#5A4333] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#5A4333]">
            <SectionTitle>Recent Feedback ({feedback.length})</SectionTitle>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#B8A090] text-xs border-b border-[#5A4333]">
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">User</th>
                  <th className="px-4 py-3 text-left font-medium">Category</th>
                  <th className="px-4 py-3 text-left font-medium">Message</th>
                </tr>
              </thead>
              <tbody>
                {feedback.map((f, i) => (
                  <tr key={f.feedbackId || i} className="border-b border-[#5A4333]/50 hover:bg-[#4A3828]/30">
                    <td className="px-4 py-3 text-[#B8A090] text-xs whitespace-nowrap">
                      {f.createdAt ? (() => {
                        try {
                          const d = new Date(f.createdAt);
                          if (isNaN(d.getTime())) return f.createdAt;
                          const dd = String(d.getDate()).padStart(2, '0');
                          const mm = String(d.getMonth() + 1).padStart(2, '0');
                          const yy = String(d.getFullYear()).slice(-2);
                          return `${dd}-${mm}-${yy}`;
                        } catch {
                          return f.createdAt;
                        }
                      })() : ''}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-200 text-xs">{f.userName || 'Unknown'}</p>
                      <p className="text-[#8B7355] text-xs">{f.userEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        f.category === 'bug' ? 'bg-red-900/50 text-red-300' :
                        f.category === 'suggestion' ? 'bg-blue-900/50 text-blue-300' :
                        'bg-[#4A3828] text-[#E2DBCE]'
                      }`}>
                        {f.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#E2DBCE] text-xs max-w-md truncate">{f.message}</td>
                  </tr>
                ))}
                {feedback.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-[#8B7355]">No feedback submitted yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
