import { useEffect, useState, useCallback } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Loader2 } from 'lucide-react'
import { API_BASE_URL } from '@/config/api'
import { StatCard, SectionTitle, SubSectionTitle, EmptyMsg, PIE_COLORS, pieLabel, fmtTooltip, adminAuthHeaders } from './adminHelpers'

interface SessionOverview { totalSessions: number; uniqueUsers: number; avgDurationMin: number; sessions24h: number; sessions7d: number }
interface HourRow { hour: string; sessions: number }
interface DurationRow { bucket: string; count: number }
interface CohortRow { cohortWeek: string; cohortSize: number; week1: number; week2: number; week3: number; week4: number }
interface MethodRow { method: string; count: number }

export function AdminSessionsTab({ adminToken }: { adminToken: string }) {
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<SessionOverview | null>(null)
  const [peakHours, setPeakHours] = useState<HourRow[]>([])
  const [durationDist, setDurationDist] = useState<DurationRow[]>([])
  const [cohorts, setCohorts] = useState<CohortRow[]>([])
  const [loginMethods, setLoginMethods] = useState<MethodRow[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const h = adminAuthHeaders(adminToken)
    try {
      const [ovRes, phRes, ddRes, rcRes, lmRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/stats/session-overview`, { headers: h }),
        fetch(`${API_BASE_URL}/admin/stats/peak-hours`, { headers: h }),
        fetch(`${API_BASE_URL}/admin/stats/session-duration-dist`, { headers: h }),
        fetch(`${API_BASE_URL}/admin/stats/retention-cohorts?weeks=8`, { headers: h }),
        fetch(`${API_BASE_URL}/admin/stats/login-method-breakdown`, { headers: h }),
      ])
      if (ovRes.ok) setOverview(await ovRes.json())
      if (phRes.ok) setPeakHours(await phRes.json())
      if (ddRes.ok) setDurationDist(await ddRes.json())
      if (rcRes.ok) setCohorts(await rcRes.json())
      if (lmRes.ok) setLoginMethods(await lmRes.json())
    } catch (err) { console.error('Sessions fetch error:', err) }
    finally { setLoading(false) }
  }, [adminToken])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading && !overview) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#2F3E8F]" /></div>
  }

  return (
    <div className="space-y-10">
      <SubSectionTitle>Session Analytics</SubSectionTitle>

      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Total Sessions" value={overview.totalSessions} />
          <StatCard label="Unique Users" value={overview.uniqueUsers} />
          <StatCard label="Avg Duration" value={`${overview.avgDurationMin} min`} />
          <StatCard label="Sessions (24h)" value={overview.sessions24h} />
          <StatCard label="Sessions (7d)" value={overview.sessions7d} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak hours */}
        <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333]">
          <SectionTitle>Peak Usage Hours (30 days)</SectionTitle>
          {peakHours.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={peakHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="hour" tick={{ fill: '#9ca3af', fontSize: 10 }} interval={2} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }}
                  formatter={fmtTooltip((v: number | string) => [`${v}`, 'Sessions'])}
                />
                <Bar dataKey="sessions" fill="#2F3E8F" radius={[4, 4, 0, 0]} name="Sessions" />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyMsg />}
        </div>

        {/* Session duration distribution */}
        <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333]">
          <SectionTitle>Session Duration Distribution (30 days)</SectionTitle>
          {durationDist.some(d => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={durationDist} dataKey="count" nameKey="bucket" cx="50%" cy="50%" outerRadius={90}
                  label={pieLabel(({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`)}>
                  {durationDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyMsg />}
        </div>
      </div>

      {/* Login method */}
      <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333] max-w-md">
        <SectionTitle>Login Methods (30 days)</SectionTitle>
        {loginMethods.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={loginMethods} dataKey="count" nameKey="method" cx="50%" cy="50%" outerRadius={75}
                label={pieLabel(({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`)}>
                {loginMethods.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
              <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        ) : <EmptyMsg />}
      </div>

      {/* Retention cohorts */}
      <div>
        <SubSectionTitle>Weekly Retention Cohorts</SubSectionTitle>
        <div className="bg-[#3D2E1F] rounded-xl border border-[#5A4333] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#5A4333]">
            <SectionTitle>Cohort Retention Matrix (last 8 weeks)</SectionTitle>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#B8A090] text-xs border-b border-[#5A4333]">
                  <th className="px-4 py-3 text-left font-medium">Cohort Week</th>
                  <th className="px-4 py-3 text-left font-medium">Users</th>
                  <th className="px-4 py-3 text-center font-medium">Week 1</th>
                  <th className="px-4 py-3 text-center font-medium">Week 2</th>
                  <th className="px-4 py-3 text-center font-medium">Week 3</th>
                  <th className="px-4 py-3 text-center font-medium">Week 4</th>
                </tr>
              </thead>
              <tbody>
                {cohorts.map((c, i) => {
                  const pct = (val: number) => c.cohortSize > 0 ? Math.round((val / c.cohortSize) * 100) : 0
                  const cellColor = (p: number) =>
                    p >= 50 ? 'bg-green-900/60 text-green-300' :
                    p >= 25 ? 'bg-yellow-900/50 text-yellow-300' :
                    p > 0  ? 'bg-red-900/40 text-red-300' :
                    'text-[#8B7355]'
                  return (
                    <tr key={c.cohortWeek || i} className="border-b border-[#5A4333]/50">
                      <td className="px-4 py-3 text-[#E2DBCE] text-xs">{c.cohortWeek}</td>
                      <td className="px-4 py-3 text-gray-200">{c.cohortSize}</td>
                      {[c.week1, c.week2, c.week3, c.week4].map((v, j) => (
                        <td key={j} className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${cellColor(pct(v))}`}>
                            {pct(v)}%
                          </span>
                        </td>
                      ))}
                    </tr>
                  )
                })}
                {cohorts.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-[#8B7355]">No session data yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
