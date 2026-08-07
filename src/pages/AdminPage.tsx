import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminStore } from '@/store/adminStore'
import { API_BASE_URL } from '@/config/api'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts'
import { Loader2, RefreshCw, LogOut, Users, BarChart2, Lightbulb, Newspaper, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import * as shareApi from '@/services/dailyShareApiService'
import type { SharePost } from '@/services/dailyShareApiService'
import { AdminShareComposer } from '@/components/dailyshare/AdminShareComposer'
import { AdminTemplesTab } from '@/components/admin/AdminTemplesTab'
import { AdminLoginImagesTab } from '@/components/admin/AdminLoginImagesTab'
import { AdminEngagementTab } from '@/components/admin/AdminEngagementTab'
import { AdminContentTab } from '@/components/admin/AdminContentTab'
import { AdminSessionsTab } from '@/components/admin/AdminSessionsTab'
import { AdminCollaborationTab } from '@/components/admin/AdminCollaborationTab'
import { AdminCampaignsTab } from '@/components/admin/AdminCampaignsTab'
import { AdminUsersTab } from '@/components/admin/AdminUsersTab'
import { AdminAuditLogPanel } from '@/components/admin/AdminAuditLogPanel'
import { AdminFunnelPanel } from '@/components/admin/AdminFunnelPanel'
import {
  StatCard as SharedStatCard,
  SectionTitle as SharedSectionTitle,
  SubSectionTitle as SharedSubSectionTitle,
  EmptyMsg as SharedEmptyMsg,
  PIE_COLORS as SHARED_PIE_COLORS,
  pieLabel as sharedPieLabel,
  fmtTooltip as sharedFmtTooltip,
} from '@/components/admin/adminHelpers'

// --- Types --------------------------------------------------------------------

interface Overview {
  totalUsers: number
  totalTrees: number
  totalPersons: number
  maleCount: number
  femaleCount: number
  keycloakUsers: number
  localUsers: number
  avgPersonsPerTree: number
}

interface TimeSeriesRow { day: string; newUsers?: number; newTrees?: number; activeUsers?: number }
interface NameValueRow { name: string; value: number }
interface CountRow { [key: string]: string | number; count: number }
interface AgeDistRow { group: string; count: number }
interface TopTreeRow { treeId: string; treeName: string; ownerEmail: string; memberCount: number }
interface GeoRow { place: string; count: number }
interface ActiveUserRow { email: string; totalHours: number }
interface ActivityRow { changeId: string; actorName: string; actorEmail: string; action: string; entityType: string; description: string; timestamp: string }
interface ProfileCompleteness { fields: { field: string; pct: number }[] }
interface ContributorRow { actorId: string; fullName: string; email: string; creates: number; updates: number; totalEdits: number }
interface MostEditedRow { entityId: string; personName: string; treeName: string; editCount: number }
interface PendingEditRow { editId: string; treeName: string; personName: string; proposedByEmail: string; action: string; proposedAt: string; status: string }
interface PendingEditsSummary { pending: number; approved: number; rejected: number }
interface AttachmentStats { total: number; totalSizeMB: number; byType: { type: string; count: number }[] }
interface TopTreeMediaRow { treeId: string; treeName: string; attachmentCount: number }

const TABS = ['Overview', 'Users', 'Trees', 'Activity', 'Insights', 'Engagement', 'Funnel', 'Content', 'Sessions', 'Collaboration', 'Campaigns', 'Daily Share', 'Temples', 'Login Images'] as const
type Tab = typeof TABS[number]
type TimeRange = '7' | '30' | '90' | '365'

// Shared helpers — re-aliased for backward compatibility within this file
const PIE_COLORS = SHARED_PIE_COLORS
const pieLabel = sharedPieLabel
const fmtTooltip = sharedFmtTooltip
const StatCard = SharedStatCard
const SectionTitle = SharedSectionTitle
const SubSectionTitle = SharedSubSectionTitle
const EmptyMsg = SharedEmptyMsg

// --- Main Component -----------------------------------------------------------

export function AdminPage() {
  const navigate = useNavigate()
  const { admin, adminToken, adminLogout, checkAdminSession } = useAdminStore()
  const [tab, setTab] = useState<Tab>('Overview')
  const [loading, setLoading] = useState(false)
  const [timeRange, setTimeRange] = useState<TimeRange>('30')

  // Data state
  const [overview, setOverview] = useState<Overview | null>(null)
  const [registrations, setRegistrations] = useState<TimeSeriesRow[]>([])
  const [treesOverTime, setTreesOverTime] = useState<TimeSeriesRow[]>([])
  const [dailyActive, setDailyActive] = useState<TimeSeriesRow[]>([])
  const [authMethods, setAuthMethods] = useState<NameValueRow[]>([])
  const [genderDist, setGenderDist] = useState<NameValueRow[]>([])
  const [ageDist, setAgeDist] = useState<AgeDistRow[]>([])
  const [treeSizes, setTreeSizes] = useState<NameValueRow[]>([])
  const [topTrees, setTopTrees] = useState<TopTreeRow[]>([])
  const [geographic, setGeographic] = useState<GeoRow[]>([])
  const [activeUsers, setActiveUsers] = useState<ActiveUserRow[]>([])
  const [activity, setActivity] = useState<ActivityRow[]>([])

  // Insights state
  const [profileCompleteness, setProfileCompleteness] = useState<ProfileCompleteness | null>(null)
  const [livingDeceased, setLivingDeceased] = useState<NameValueRow[]>([])
  const [occupation, setOccupation] = useState<CountRow[]>([])
  const [religion, setReligion] = useState<CountRow[]>([])
  const [nationality, setNationality] = useState<CountRow[]>([])
  const [language, setLanguage] = useState<CountRow[]>([])
  const [birthDecades, setBirthDecades] = useState<CountRow[]>([])
  const [unionTypes, setUnionTypes] = useState<CountRow[]>([])
  const [ceremonyTypes, setCeremonyTypes] = useState<CountRow[]>([])
  const [livingArrangement, setLivingArrangement] = useState<NameValueRow[]>([])
  const [marriageDecades, setMarriageDecades] = useState<CountRow[]>([])
  const [avgMarriageAge, setAvgMarriageAge] = useState<number | null>(null)
  const [attachmentStats, setAttachmentStats] = useState<AttachmentStats | null>(null)
  const [topTreesMedia, setTopTreesMedia] = useState<TopTreeMediaRow[]>([])
  const [contributors, setContributors] = useState<ContributorRow[]>([])
  const [mostEditedPersons, setMostEditedPersons] = useState<MostEditedRow[]>([])
  const [editActions, setEditActions] = useState<NameValueRow[]>([])
  const [pendingEditsSummary, setPendingEditsSummary] = useState<PendingEditsSummary | null>(null)
  const [pendingEdits, setPendingEdits] = useState<PendingEditRow[]>([])
  const [pendingEditsShowAll, setPendingEditsShowAll] = useState(false)

  // Platform health state
  const [platformHealth, setPlatformHealth] = useState<{ avgSessionMin7d: number; newPosts7d: number; newMemories7d: number; newCollabs7d: number } | null>(null)

  // Daily Share state
  const [adminPosts, setAdminPosts] = useState<SharePost[]>([])
  const [adminPostsLoading, setAdminPostsLoading] = useState(false)

  // Guard: redirect if no admin token
  useEffect(() => {
    checkAdminSession()
  }, [checkAdminSession])

  useEffect(() => {
    if (!admin && !adminToken) {
      navigate('/admin', { replace: true })
    }
  }, [admin, adminToken, navigate])

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  }), [adminToken])

  const fetchAll = useCallback(async (range?: TimeRange) => {
    if (!adminToken) return
    setLoading(true)
    const days = range || timeRange
    try {
      const headers = authHeaders()
      const [
        ovRes, regRes, treesRes, dauRes, authRes,
        genderRes, ageRes, sizesRes, topRes, geoRes,
        activeRes, actRes,
        pcRes, ldRes, occRes, relRes, natRes, langRes, bdRes,
        utRes, ctRes, laRes, mdRes, amaRes,
        attRes, ttmRes, contRes, mepRes, eaRes,
        pesRes, peRes,
        phRes,
      ] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/stats/overview`, { headers }),
        fetch(`${API_BASE_URL}/admin/stats/registrations?days=${days}`, { headers }),
        fetch(`${API_BASE_URL}/admin/stats/trees-over-time?days=${days}`, { headers }),
        fetch(`${API_BASE_URL}/admin/stats/daily-active?days=${days}`, { headers }),
        fetch(`${API_BASE_URL}/admin/stats/auth-methods`, { headers }),
        fetch(`${API_BASE_URL}/admin/stats/gender-distribution`, { headers }),
        fetch(`${API_BASE_URL}/admin/stats/age-distribution`, { headers }),
        fetch(`${API_BASE_URL}/admin/stats/tree-sizes`, { headers }),
        fetch(`${API_BASE_URL}/admin/stats/top-trees?limit=10`, { headers }),
        fetch(`${API_BASE_URL}/admin/stats/geographic?limit=15`, { headers }),
        fetch(`${API_BASE_URL}/admin/stats/active-users?days=${days}&limit=10`, { headers }),
        fetch(`${API_BASE_URL}/admin/activity/recent?limit=25`, { headers }),
        // Insights
        fetch(`${API_BASE_URL}/admin/stats/profile-completeness`, { headers }),
        fetch(`${API_BASE_URL}/admin/stats/living-deceased`, { headers }),
        fetch(`${API_BASE_URL}/admin/stats/occupation?limit=10`, { headers }),
        fetch(`${API_BASE_URL}/admin/stats/religion`, { headers }),
        fetch(`${API_BASE_URL}/admin/stats/nationality?limit=10`, { headers }),
        fetch(`${API_BASE_URL}/admin/stats/language?limit=8`, { headers }),
        fetch(`${API_BASE_URL}/admin/stats/birth-decades`, { headers }),
        fetch(`${API_BASE_URL}/admin/stats/union-types`, { headers }),
        fetch(`${API_BASE_URL}/admin/stats/ceremony-types`, { headers }),
        fetch(`${API_BASE_URL}/admin/stats/living-arrangement`, { headers }),
        fetch(`${API_BASE_URL}/admin/stats/marriage-decades`, { headers }),
        fetch(`${API_BASE_URL}/admin/stats/avg-marriage-age`, { headers }),
        fetch(`${API_BASE_URL}/admin/stats/attachments`, { headers }),
        fetch(`${API_BASE_URL}/admin/stats/top-trees-media?limit=10`, { headers }),
        fetch(`${API_BASE_URL}/admin/stats/contributions?limit=10`, { headers }),
        fetch(`${API_BASE_URL}/admin/stats/most-edited-persons?limit=10`, { headers }),
        fetch(`${API_BASE_URL}/admin/stats/edit-actions`, { headers }),
        fetch(`${API_BASE_URL}/admin/stats/pending-edits-summary`, { headers }),
        fetch(`${API_BASE_URL}/admin/pending-edits?limit=25`, { headers }),
        // Platform health
        fetch(`${API_BASE_URL}/admin/stats/platform-health`, { headers }),
      ])

      if (ovRes.ok) setOverview(await ovRes.json())
      if (regRes.ok) setRegistrations(await regRes.json())
      if (treesRes.ok) setTreesOverTime(await treesRes.json())
      if (dauRes.ok) setDailyActive(await dauRes.json())
      if (authRes.ok) {
        const d = await authRes.json()
        setAuthMethods([
          { name: 'Local', value: d.local },
          { name: 'Keycloak', value: d.keycloak },
        ])
      }
      if (genderRes.ok) {
        const d = await genderRes.json()
        setGenderDist([
          { name: 'Male', value: d.male },
          { name: 'Female', value: d.female },
          { name: 'Other', value: d.other },
          { name: 'Unknown', value: d.unknown },
        ])
      }
      if (ageRes.ok) setAgeDist(await ageRes.json())
      if (sizesRes.ok) {
        const d = await sizesRes.json()
        setTreeSizes([
          { name: 'Small (<10)', value: d.small },
          { name: 'Medium (10-50)', value: d.medium },
          { name: 'Large (>50)', value: d.large },
        ])
      }
      if (topRes.ok) setTopTrees(await topRes.json())
      if (geoRes.ok) setGeographic(await geoRes.json())
      if (activeRes.ok) setActiveUsers(await activeRes.json())
      // Users are now loaded by AdminUsersTab with its own pagination
      if (actRes.ok) setActivity(await actRes.json())
      // Insights
      if (pcRes.ok) setProfileCompleteness(await pcRes.json())
      if (ldRes.ok) {
        const d = await ldRes.json()
        setLivingDeceased([
          { name: 'Living',   value: d.living },
          { name: 'Deceased', value: d.deceased },
          { name: 'Unknown',  value: d.unknown },
        ])
      }
      if (occRes.ok) setOccupation(await occRes.json())
      if (relRes.ok) setReligion(await relRes.json())
      if (natRes.ok) setNationality(await natRes.json())
      if (langRes.ok) setLanguage(await langRes.json())
      if (bdRes.ok) setBirthDecades(await bdRes.json())
      if (utRes.ok) setUnionTypes(await utRes.json())
      if (ctRes.ok) setCeremonyTypes(await ctRes.json())
      if (laRes.ok) {
        const d = await laRes.json()
        setLivingArrangement(d.map((x: { arrangement: string; count: number }) => ({ name: x.arrangement, value: x.count })))
      }
      if (mdRes.ok) setMarriageDecades(await mdRes.json())
      if (amaRes.ok) {
        const d = await amaRes.json()
        setAvgMarriageAge(d.avgAgeAtMarriage)
      }
      if (attRes.ok) setAttachmentStats(await attRes.json())
      if (ttmRes.ok) setTopTreesMedia(await ttmRes.json())
      if (contRes.ok) setContributors(await contRes.json())
      if (mepRes.ok) setMostEditedPersons(await mepRes.json())
      if (eaRes.ok) {
        const d = await eaRes.json()
        setEditActions(d.map((x: { action: string; count: number }) => ({ name: x.action, value: x.count })))
      }
      if (pesRes.ok) setPendingEditsSummary(await pesRes.json())
      if (peRes.ok) setPendingEdits(await peRes.json())
      if (phRes.ok) setPlatformHealth(await phRes.json())
    } catch (err) {
      console.error('Admin fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [adminToken, authHeaders, timeRange])

  useEffect(() => {
    if (adminToken) fetchAll()
  }, [adminToken, fetchAll])

  const handleTimeRangeChange = (r: TimeRange) => {
    setTimeRange(r)
    fetchAll(r)
  }

  const handleLogout = () => {
    adminLogout()
    navigate('/admin', { replace: true })
  }

  const fetchAdminSharePosts = useCallback(async () => {
    if (!adminToken) return
    setAdminPostsLoading(true)
    try {
      const result = await shareApi.fetchAdminPosts(adminToken)
      setAdminPosts(result.posts)
    } catch {
      // silently fail
    } finally {
      setAdminPostsLoading(false)
    }
  }, [adminToken])

  useEffect(() => {
    if (tab === 'Daily Share' && adminToken) fetchAdminSharePosts()
  }, [tab, adminToken, fetchAdminSharePosts])

  const handleAdminDeletePost = async (postId: string) => {
    if (!adminToken) return
    try {
      await shareApi.deleteAdminPost(postId, adminToken)
      setAdminPosts(prev => prev.filter(p => p.postId !== postId))
    } catch {
      // silently fail
    }
  }

  if (!adminToken) return null

  return (
    <div className="min-h-screen bg-[#1A120B] text-white h-screen overflow-y-auto">
      {/* Header */}
      <header className="bg-[#2C1E14] border-b border-[#4A3828] px-4 md:px-6 py-3 md:py-4 flex items-center justify-between sticky top-0 z-10 safe-area-top">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#2F3E8F] rounded-lg flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">FamNme Admin</h1>
            <p className="text-xs text-[#B8A090]">{admin?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchAll()}
            disabled={loading}
            className="text-[#B8A090] hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-[#B8A090] hover:text-red-400"
          >
            <LogOut className="w-4 h-4 mr-1" />
            Logout
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-[#2C1E14] border-b border-[#4A3828] px-4 md:px-6">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                tab === t
                  ? 'border-[#2F3E8F] text-[#2F3E8F]'
                  : 'border-transparent text-[#B8A090] hover:text-white'
              }`}
            >
              {t === 'Insights' && <Lightbulb className="w-3.5 h-3.5" />}
              {t}
            </button>
          ))}
        </div>
      </div>

      <main className="p-6 space-y-8 max-w-7xl mx-auto">
        {loading && !overview && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-[#2F3E8F]" />
          </div>
        )}

        {/* -- TAB 1: Overview -- */}
        {tab === 'Overview' && overview && (
          <>
            {/* Time range selector */}
            <div className="flex items-center gap-2 justify-end">
              <span className="text-[#B8A090] text-sm">Time range:</span>
              {(['7', '30', '90', '365'] as TimeRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => handleTimeRangeChange(r)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    timeRange === r
                      ? 'bg-[#2F3E8F] text-white'
                      : 'bg-[#3D2E1F] text-[#B8A090] hover:text-white border border-[#5A4333]'
                  }`}
                >
                  {r === '365' ? '12 mo' : `${r}d`}
                </button>
              ))}
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard label="Total Users" value={overview.totalUsers} />
              <StatCard label="Family Trees" value={overview.totalTrees} />
              <StatCard label="Total Persons" value={overview.totalPersons} />
              <StatCard
                label="Avg Persons/Tree"
                value={typeof overview.avgPersonsPerTree === 'number'
                  ? overview.avgPersonsPerTree.toFixed(1)
                  : Number(overview.avgPersonsPerTree).toFixed(1)}
              />
              <StatCard label="Keycloak Users" value={overview.keycloakUsers} />
              <StatCard label="Local Users" value={overview.localUsers} />
            </div>

            {/* Charts row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333]">
                <SectionTitle>New Registrations ({timeRange === '365' ? '12 months' : `${timeRange} days`})</SectionTitle>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={registrations}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                    <Line type="monotone" dataKey="newUsers" stroke="#2F3E8F" strokeWidth={2} dot={false} name="New Users" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333]">
                <SectionTitle>New Trees Created ({timeRange === '365' ? '12 months' : `${timeRange} days`})</SectionTitle>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={treesOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                    <Line type="monotone" dataKey="newTrees" stroke="#10b981" strokeWidth={2} dot={false} name="New Trees" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Charts row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333] lg:col-span-2">
                <SectionTitle>Daily Active Users ({timeRange === '365' ? '12 months' : `${timeRange} days`})</SectionTitle>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={dailyActive}>
                    <defs>
                      <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2F3E8F" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#2F3E8F" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                    <Area type="monotone" dataKey="activeUsers" stroke="#2F3E8F" fill="url(#dauGrad)" strokeWidth={2} name="Active Users" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333]">
                <SectionTitle>Auth Methods</SectionTitle>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={authMethods} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={pieLabel(({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`)}>
                      {authMethods.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Platform Health (7d) */}
            {platformHealth && (
              <div>
                <SubSectionTitle>Platform Health (7 days)</SubSectionTitle>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Avg Session" value={`${platformHealth.avgSessionMin7d} min`} sub="avg duration this week" />
                  <StatCard label="New Posts" value={platformHealth.newPosts7d} sub="Daily Share posts" />
                  <StatCard label="New Memories" value={platformHealth.newMemories7d} sub="photos, videos, etc." />
                  <StatCard label="New Collaborators" value={platformHealth.newCollabs7d} sub="accepted invitations" />
                </div>
              </div>
            )}

            {/* F1 — Audit log surfaced on Overview for at-a-glance visibility */}
            <AdminAuditLogPanel adminToken={adminToken} />
          </>
        )}

        {/* 5.10 — Funnel deviation tab */}
        {tab === 'Funnel' && (
          <AdminFunnelPanel adminToken={adminToken} />
        )}

        {/* -- TAB 2: Users -- */}
        {tab === 'Users' && (
          <>
            {/* Active users by session hours */}
            <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333]">
              <SectionTitle>Top 10 Most Active Users (by session hours, 30 days)</SectionTitle>
              {activeUsers.length === 0 ? (
                <p className="text-[#8B7355] text-sm py-6 text-center">No session data yet. Sessions are tracked after users log in.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={activeUsers} layout="vertical" margin={{ left: 120 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} unit="h" />
                    <YAxis type="category" dataKey="email" tick={{ fill: '#9ca3af', fontSize: 11 }} width={120} />
                    <Tooltip
                      contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }}
                      formatter={fmtTooltip((v: number | string) => [`${Number(v).toFixed(1)}h`, 'Total Hours'])}
                    />
                    <Bar dataKey="totalHours" fill="#2F3E8F" radius={[0, 4, 4, 0]} name="Hours" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* User table with pagination, login & edit history modals */}
            <AdminUsersTab adminToken={adminToken} />
          </>
        )}

        {/* -- TAB 3: Trees -- */}
        {tab === 'Trees' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Gender Distribution */}
              <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333]">
                <SectionTitle>Gender Distribution</SectionTitle>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={genderDist}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {genderDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Age Distribution */}
              <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333]">
                <SectionTitle>Age Distribution</SectionTitle>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={ageDist}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="group" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Count" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Tree Size Distribution */}
              <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333]">
                <SectionTitle>Tree Size Distribution</SectionTitle>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={treeSizes} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={pieLabel(({ percent }: { percent: number }) => `${(percent * 100).toFixed(0)}%`)}>
                      {treeSizes.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                    <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Trees table */}
            <div className="bg-[#3D2E1F] rounded-xl border border-[#5A4333] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#5A4333]">
                <SectionTitle>Top Trees by Member Count</SectionTitle>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[#B8A090] text-xs border-b border-[#5A4333]">
                      <th className="px-4 py-3 text-left font-medium">#</th>
                      <th className="px-4 py-3 text-left font-medium">Tree Name</th>
                      <th className="px-4 py-3 text-left font-medium">Owner Email</th>
                      <th className="px-4 py-3 text-left font-medium">Members</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topTrees.map((t, i) => (
                      <tr key={t.treeId} className="border-b border-[#5A4333]/50 hover:bg-[#4A3828]/30">
                        <td className="px-4 py-3 text-[#8B7355]">{i + 1}</td>
                        <td className="px-4 py-3 text-gray-200">{t.treeName || 'Unnamed'}</td>
                        <td className="px-4 py-3 text-[#B8A090]">{t.ownerEmail || '�'}</td>
                        <td className="px-4 py-3">
                          <span className="bg-[#5A3D2A]/50 text-[#E8B08A] px-2 py-0.5 rounded text-xs font-medium">
                            {t.memberCount}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {topTrees.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-[#8B7355]">No trees found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Geographic Distribution */}
            {geographic.length > 0 && (
              <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333]">
                <SectionTitle>Top Geographic Locations (nativePlace)</SectionTitle>
                <ResponsiveContainer width="100%" height={Math.max(300, geographic.length * 28)}>
                  <BarChart data={geographic} layout="vertical" margin={{ left: 130 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <YAxis type="category" dataKey="place" tick={{ fill: '#9ca3af', fontSize: 11 }} width={130} />
                    <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                    <Bar dataKey="count" fill="#2F3E8F" radius={[0, 4, 4, 0]} name="Persons" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {/* -- TAB 4: Activity -- */}
        {tab === 'Activity' && (
          <>
            <div className="bg-[#3D2E1F] rounded-xl border border-[#5A4333] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#5A4333]">
                <SectionTitle>Global Recent Activity</SectionTitle>
              </div>
              <div className="divide-y divide-[#5A4333]/50">
                {activity.map((item, i) => (
                  <div key={item.changeId || i} className="px-5 py-4 hover:bg-[#4A3828]/20 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#5A3D2A]/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Users className="w-4 h-4 text-[#2F3E8F]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-gray-200 text-sm font-medium">{item.actorName || item.actorEmail || 'Unknown'}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            item.action === 'CREATE' ? 'bg-green-900/50 text-green-300' :
                            item.action === 'UPDATE' ? 'bg-blue-900/50 text-blue-300' :
                            item.action === 'DELETE' ? 'bg-red-900/50 text-red-300' :
                            'bg-[#4A3828] text-[#E2DBCE]'
                          }`}>
                            {item.action || 'ACTION'}
                          </span>
                          <span className="text-[#B8A090] text-sm">{item.entityType}</span>
                        </div>
                        {item.description && (
                          <p className="text-[#8B7355] text-xs mt-0.5 truncate">{item.description}</p>
                        )}
                      </div>
                      <span className="text-gray-600 text-xs flex-shrink-0">
                        {item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
                      </span>
                    </div>
                  </div>
                ))}
                {activity.length === 0 && (
                  <div className="px-5 py-12 text-center text-[#8B7355]">No activity logged yet</div>
                )}
              </div>
            </div>

            {/* Pending Edits Section */}
            <div className="space-y-4">
              <SubSectionTitle>Pending Edits</SubSectionTitle>
              {pendingEditsSummary && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard label="Pending" value={pendingEditsSummary.pending} sub="Awaiting review" />
                  <StatCard label="Approved (all time)" value={pendingEditsSummary.approved} />
                  <StatCard label="Rejected (all time)" value={pendingEditsSummary.rejected} />
                </div>
              )}
              <div className="bg-[#3D2E1F] rounded-xl border border-[#5A4333] overflow-hidden">
                <div className="px-5 py-4 border-b border-[#5A4333] flex items-center justify-between">
                  <SectionTitle>
                    {pendingEditsShowAll ? 'All Pending Edits' : 'Pending Edits (status: pending)'}
                  </SectionTitle>
                  <button
                    onClick={() => setPendingEditsShowAll(!pendingEditsShowAll)}
                    className="text-xs text-[#2F3E8F] hover:text-[#E8B08A] underline"
                  >
                    {pendingEditsShowAll ? 'Show pending only' : 'Show all'}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[#B8A090] text-xs border-b border-[#5A4333]">
                        <th className="px-4 py-3 text-left font-medium">Tree</th>
                        <th className="px-4 py-3 text-left font-medium">Person</th>
                        <th className="px-4 py-3 text-left font-medium">Proposed By</th>
                        <th className="px-4 py-3 text-left font-medium">Action</th>
                        <th className="px-4 py-3 text-left font-medium">Proposed At</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingEdits.map((pe, i) => (
                        <tr key={pe.editId || i} className="border-b border-[#5A4333]/50 hover:bg-[#4A3828]/30">
                          <td className="px-4 py-3 text-[#E2DBCE] text-xs">{pe.treeName || '�'}</td>
                          <td className="px-4 py-3 text-gray-200 text-xs">{pe.personName || '�'}</td>
                          <td className="px-4 py-3 text-[#B8A090] text-xs">{pe.proposedByEmail || '�'}</td>
                          <td className="px-4 py-3">
                            <span className="bg-[#5A3D2A]/50 text-[#E8B08A] px-2 py-0.5 rounded text-xs">{pe.action || '�'}</span>
                          </td>
                          <td className="px-4 py-3 text-[#B8A090] text-xs">
                            {pe.proposedAt ? (() => {
                              try {
                                const d = new Date(pe.proposedAt);
                                if (isNaN(d.getTime())) return pe.proposedAt;
                                const dd = String(d.getDate()).padStart(2, '0');
                                const mm = String(d.getMonth() + 1).padStart(2, '0');
                                const yy = String(d.getFullYear()).slice(-2);
                                return `${dd}-${mm}-${yy}`;
                              } catch {
                                return pe.proposedAt;
                              }
                            })() : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              pe.status === 'pending'  ? 'bg-yellow-900/50 text-yellow-300' :
                              pe.status === 'approved' ? 'bg-green-900/50 text-green-300' :
                              'bg-red-900/50 text-red-300'
                            }`}>
                              {pe.status || 'pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {pendingEdits.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-[#8B7355]">No pending edits</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
        {/* -- TAB 5: Insights -- */}
        {tab === 'Insights' && (
          <div className="space-y-10">

            {/* -- Section 1: Profile Completeness -- */}
            <div>
              <SubSectionTitle>Profile Completeness</SubSectionTitle>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Field Coverage */}
                <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333]">
                  <SectionTitle>Field Coverage</SectionTitle>
                  {profileCompleteness?.fields?.length ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={profileCompleteness.fields} layout="vertical" margin={{ left: 100 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} unit="%" domain={[0, 100]} />
                        <YAxis type="category" dataKey="field" tick={{ fill: '#9ca3af', fontSize: 11 }} width={100} />
                        <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }} formatter={fmtTooltip((v: number | string) => [`${v}%`, 'Coverage'])} />
                        <Bar dataKey="pct" fill="#2F3E8F" radius={[0, 4, 4, 0]} name="Coverage %" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyMsg />}
                </div>

                {/* Living vs Deceased */}
                <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333]">
                  <SectionTitle>Living vs Deceased</SectionTitle>
                  {livingDeceased.some(x => x.value > 0) ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={livingDeceased} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                          label={pieLabel(({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`)}>
                          {livingDeceased.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                        <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <EmptyMsg />}
                </div>
              </div>
            </div>

            {/* -- Section 2: People Demographics -- */}
            <div>
              <SubSectionTitle>People Demographics</SubSectionTitle>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Occupation */}
                <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333]">
                  <SectionTitle>Top Occupations</SectionTitle>
                  {occupation.length ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={occupation} layout="vertical" margin={{ left: 120 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                        <YAxis type="category" dataKey="occupation" tick={{ fill: '#9ca3af', fontSize: 11 }} width={120} />
                        <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                        <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} name="Persons" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyMsg />}
                </div>

                {/* Religion */}
                <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333]">
                  <SectionTitle>Religion Distribution</SectionTitle>
                  {religion.length ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={religion} layout="vertical" margin={{ left: 100 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                        <YAxis type="category" dataKey="religion" tick={{ fill: '#9ca3af', fontSize: 11 }} width={100} />
                        <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                        <Bar dataKey="count" fill="#2F3E8F" radius={[0, 4, 4, 0]} name="Persons" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyMsg />}
                </div>

                {/* Nationality */}
                <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333]">
                  <SectionTitle>Nationality Distribution</SectionTitle>
                  {nationality.length ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={nationality} layout="vertical" margin={{ left: 110 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                        <YAxis type="category" dataKey="nationality" tick={{ fill: '#9ca3af', fontSize: 11 }} width={110} />
                        <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Persons" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyMsg />}
                </div>

                {/* Language */}
                <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333]">
                  <SectionTitle>Native Language</SectionTitle>
                  {language.length ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={language} layout="vertical" margin={{ left: 110 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                        <YAxis type="category" dataKey="language" tick={{ fill: '#9ca3af', fontSize: 11 }} width={110} />
                        <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                        <Bar dataKey="count" fill="#ec4899" radius={[0, 4, 4, 0]} name="Persons" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyMsg />}
                </div>

                {/* Birth Decade Histogram */}
                <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333] lg:col-span-2">
                  <SectionTitle>Birth Decade Histogram</SectionTitle>
                  {birthDecades.length ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={birthDecades}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="decade" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                        <Bar dataKey="count" fill="#2F3E8F" radius={[4, 4, 0, 0]} name="Persons" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyMsg />}
                </div>
              </div>
            </div>

            {/* -- Section 3: Marriage & Family Structure -- */}
            <div>
              <SubSectionTitle>Marriage &amp; Family Structure</SubSectionTitle>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Union Types */}
                <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333]">
                  <SectionTitle>Union Types</SectionTitle>
                  {unionTypes.length ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={unionTypes} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={75}
                          label={pieLabel(({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`)}>
                          {unionTypes.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <EmptyMsg />}
                </div>

                {/* Ceremony Types */}
                <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333]">
                  <SectionTitle>Ceremony Types</SectionTitle>
                  {ceremonyTypes.length ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={ceremonyTypes}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="type" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {ceremonyTypes.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyMsg />}
                </div>

                {/* Living Arrangement */}
                <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333]">
                  <SectionTitle>Living Arrangement</SectionTitle>
                  {livingArrangement.some(x => x.value > 0) ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={livingArrangement} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}
                          label={pieLabel(({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`)}>
                          {livingArrangement.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <EmptyMsg />}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Marriage Decade */}
                <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333] lg:col-span-2">
                  <SectionTitle>Marriage Decade Trend</SectionTitle>
                  {marriageDecades.length ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={marriageDecades}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="decade" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                        <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Unions" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyMsg />}
                </div>

                {/* Avg Marriage Age */}
                <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333] flex flex-col justify-center items-center">
                  <p className="text-[#B8A090] text-sm mb-2">Avg Age at Marriage</p>
                  {avgMarriageAge != null ? (
                    <>
                      <p className="text-5xl font-bold text-white">{avgMarriageAge}</p>
                      <p className="text-[#8B7355] text-xs mt-2">years (persons with known birth + marriage dates)</p>
                    </>
                  ) : <EmptyMsg msg="No data with matching birth & marriage dates" />}
                </div>
              </div>
            </div>

            {/* -- Section 4: Contributions & Editing -- */}
            <div>
              <SubSectionTitle>Contributions &amp; Editing</SubSectionTitle>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Top Contributors */}
                <div className="bg-[#3D2E1F] rounded-xl border border-[#5A4333] overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#5A4333]"><SectionTitle>Top Contributors</SectionTitle></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[#B8A090] text-xs border-b border-[#5A4333]">
                          <th className="px-4 py-3 text-left font-medium">#</th>
                          <th className="px-4 py-3 text-left font-medium">User</th>
                          <th className="px-4 py-3 text-left font-medium">Creates</th>
                          <th className="px-4 py-3 text-left font-medium">Edits</th>
                          <th className="px-4 py-3 text-left font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contributors.map((c, i) => (
                          <tr key={c.actorId || i} className="border-b border-[#5A4333]/50 hover:bg-[#4A3828]/30">
                            <td className="px-4 py-3 text-[#8B7355]">{i + 1}</td>
                            <td className="px-4 py-3">
                              <p className="text-gray-200">{c.fullName || '�'}</p>
                              <p className="text-[#8B7355] text-xs">{c.email}</p>
                            </td>
                            <td className="px-4 py-3 text-green-400">{c.creates}</td>
                            <td className="px-4 py-3 text-blue-400">{c.updates}</td>
                            <td className="px-4 py-3">
                              <span className="bg-[#5A3D2A]/50 text-[#E8B08A] px-2 py-0.5 rounded text-xs">{c.totalEdits}</span>
                            </td>
                          </tr>
                        ))}
                        {contributors.length === 0 && (
                          <tr><td colSpan={5} className="px-4 py-8 text-center text-[#8B7355]">No changelog data yet</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Most Edited Persons */}
                <div className="bg-[#3D2E1F] rounded-xl border border-[#5A4333] overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#5A4333]"><SectionTitle>Most-Edited Persons</SectionTitle></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[#B8A090] text-xs border-b border-[#5A4333]">
                          <th className="px-4 py-3 text-left font-medium">#</th>
                          <th className="px-4 py-3 text-left font-medium">Person</th>
                          <th className="px-4 py-3 text-left font-medium">Tree</th>
                          <th className="px-4 py-3 text-left font-medium">Edits</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mostEditedPersons.map((p, i) => (
                          <tr key={p.entityId || i} className="border-b border-[#5A4333]/50 hover:bg-[#4A3828]/30">
                            <td className="px-4 py-3 text-[#8B7355]">{i + 1}</td>
                            <td className="px-4 py-3 text-gray-200">{p.personName}</td>
                            <td className="px-4 py-3 text-[#B8A090] text-xs">{p.treeName}</td>
                            <td className="px-4 py-3">
                              <span className="bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded text-xs">{p.editCount}</span>
                            </td>
                          </tr>
                        ))}
                        {mostEditedPersons.length === 0 && (
                          <tr><td colSpan={4} className="px-4 py-8 text-center text-[#8B7355]">No data yet</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Edit Action Breakdown */}
              <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333] max-w-sm">
                <SectionTitle>Edit Action Breakdown</SectionTitle>
                {editActions.some(x => x.value > 0) ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={editActions} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                        label={pieLabel(({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`)}>
                        {editActions.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                      <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <EmptyMsg />}
              </div>
            </div>

            {/* -- Section 5: Media & Attachments -- */}
            <div>
              <SubSectionTitle>Media &amp; Attachments</SubSectionTitle>
              {attachmentStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <StatCard label="Total Attachments" value={attachmentStats.total} />
                  <StatCard label="Storage Used" value={`${attachmentStats.totalSizeMB} MB`} />
                  {attachmentStats.byType?.map((bt) => (
                    <StatCard key={bt.type} label={bt.type} value={bt.count} />
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Attachment type pie */}
                <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333]">
                  <SectionTitle>Attachments by Type</SectionTitle>
                  {attachmentStats?.byType?.some(x => x.count > 0) ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={attachmentStats!.byType} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={80}
                          label={pieLabel(({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`)}>
                          {attachmentStats!.byType.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                        <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <EmptyMsg />}
                </div>

                {/* Top Trees by Media */}
                <div className="bg-[#3D2E1F] rounded-xl border border-[#5A4333] overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#5A4333]"><SectionTitle>Top Trees by Media</SectionTitle></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[#B8A090] text-xs border-b border-[#5A4333]">
                          <th className="px-4 py-3 text-left font-medium">#</th>
                          <th className="px-4 py-3 text-left font-medium">Tree</th>
                          <th className="px-4 py-3 text-left font-medium">Attachments</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topTreesMedia.map((t, i) => (
                          <tr key={t.treeId || i} className="border-b border-[#5A4333]/50 hover:bg-[#4A3828]/30">
                            <td className="px-4 py-3 text-[#8B7355]">{i + 1}</td>
                            <td className="px-4 py-3 text-gray-200">{t.treeName}</td>
                            <td className="px-4 py-3">
                              <span className="bg-[#5A3D2A]/50 text-[#E8B08A] px-2 py-0.5 rounded text-xs">{t.attachmentCount}</span>
                            </td>
                          </tr>
                        ))}
                        {topTreesMedia.length === 0 && (
                          <tr><td colSpan={3} className="px-4 py-8 text-center text-[#8B7355]">No attachments yet</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* -- TAB 6: Daily Share -- */}
        {tab === 'Daily Share' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Newspaper className="h-5 w-5 text-[#2F3E8F]" />
              <h2 className="text-lg font-bold text-white">Fam &amp; Me � Admin Posts</h2>
            </div>

            {/* Composer */}
            <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333]">
              <SubSectionTitle>New Post as "Fam &amp; Me"</SubSectionTitle>
              <div className="mt-3">
                <AdminShareComposer
                  adminToken={adminToken!}
                  onPostCreated={fetchAdminSharePosts}
                />
              </div>
            </div>

            {/* Posts list */}
            <div className="bg-[#3D2E1F] rounded-xl border border-[#5A4333] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#5A4333] flex items-center justify-between">
                <SectionTitle>Existing Posts ({adminPosts.length})</SectionTitle>
                <button onClick={fetchAdminSharePosts} className="text-[#8B7355] hover:text-white transition-colors">
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              {adminPostsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-[#2F3E8F]" />
                </div>
              ) : adminPosts.length === 0 ? (
                <p className="text-center text-[#8B7355] py-10 text-sm">No Fam &amp; Me posts yet</p>
              ) : (
                <div className="divide-y divide-[#5A4333]">
                  {adminPosts.map(post => (
                    <div key={post.postId} className="px-5 py-4 flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 leading-relaxed line-clamp-3">{post.content}</p>
                        {post.linkUrl && (
                          <a href={post.linkUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#2F3E8F] hover:underline mt-1 block truncate">{post.linkUrl}</a>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-[#8B7355]">
                          <span>{(() => {
                            try {
                              const d = new Date(post.createdAt);
                              if (isNaN(d.getTime())) return post.createdAt;
                              const dd = String(d.getDate()).padStart(2, '0');
                              const mm = String(d.getMonth() + 1).padStart(2, '0');
                              const yy = String(d.getFullYear()).slice(-2);
                              return `${dd}-${mm}-${yy}`;
                            } catch {
                              return post.createdAt;
                            }
                          })()}</span>
                          <span>? {post.likeCount}</span>
                          <span>?? {post.commentCount}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAdminDeletePost(post.postId)}
                        className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full text-red-400 hover:bg-red-400/10 transition-colors"
                        title="Delete post"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* -- TAB 6: Engagement -- */}
        {tab === 'Engagement' && adminToken && (
          <AdminEngagementTab adminToken={adminToken} />
        )}

        {/* -- TAB 7: Content -- */}
        {tab === 'Content' && adminToken && (
          <AdminContentTab adminToken={adminToken} />
        )}

        {/* -- TAB 8: Sessions -- */}
        {tab === 'Sessions' && adminToken && (
          <AdminSessionsTab adminToken={adminToken} />
        )}

        {/* -- TAB 9: Collaboration -- */}
        {tab === 'Collaboration' && adminToken && (
          <AdminCollaborationTab adminToken={adminToken} />
        )}

        {/* -- TAB: Campaigns -- */}
        {tab === 'Campaigns' && adminToken && (
          <AdminCampaignsTab adminToken={adminToken} />
        )}

        {/* -- TAB 10: Temples -- */}
        {tab === 'Temples' && (
          <AdminTemplesTab />
        )}

        {/* -- TAB 8: Login Images -- */}
        {tab === 'Login Images' && adminToken && (
          <AdminLoginImagesTab adminToken={adminToken} />
        )}

      </main>
    </div>
  )
}
