import { useEffect, useState, useCallback } from 'react'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Loader2 } from 'lucide-react'
import { API_BASE_URL } from '@/config/api'
import { StatCard, SectionTitle, SubSectionTitle, EmptyMsg, PIE_COLORS, pieLabel, adminAuthHeaders } from './adminHelpers'

interface EngagementOverview {
  totalPosts: number; totalLikes: number; totalComments: number; totalViews: number
  posts7d: number; likes7d: number; comments7d: number; views7d: number
  avgLikesPerPost: number; avgCommentsPerPost: number
}
interface TimeRow { day: string; posts: number; likes: number; comments: number }
interface PosterRow { authorId: string; name: string; email: string; postCount: number; totalLikes: number; totalComments: number }
interface TypeRow { type: string; count: number }

export function AdminEngagementTab({ adminToken }: { adminToken: string }) {
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<EngagementOverview | null>(null)
  const [overTime, setOverTime] = useState<TimeRow[]>([])
  const [topPosters, setTopPosters] = useState<PosterRow[]>([])
  const [postTypes, setPostTypes] = useState<TypeRow[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const h = adminAuthHeaders(adminToken)
    try {
      const [ovRes, otRes, tpRes, ptRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/stats/engagement-overview`, { headers: h }),
        fetch(`${API_BASE_URL}/admin/stats/engagement-over-time?days=30`, { headers: h }),
        fetch(`${API_BASE_URL}/admin/stats/top-posters?limit=10`, { headers: h }),
        fetch(`${API_BASE_URL}/admin/stats/post-type-breakdown`, { headers: h }),
      ])
      if (ovRes.ok) setOverview(await ovRes.json())
      if (otRes.ok) setOverTime(await otRes.json())
      if (tpRes.ok) setTopPosters(await tpRes.json())
      if (ptRes.ok) setPostTypes(await ptRes.json())
    } catch (err) { console.error('Engagement fetch error:', err) }
    finally { setLoading(false) }
  }, [adminToken])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading && !overview) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#2F3E8F]" /></div>
  }

  return (
    <div className="space-y-8">
      <SubSectionTitle>Social Feed Health</SubSectionTitle>

      {overview && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard label="Total Posts" value={overview.totalPosts} sub={`${overview.posts7d} this week`} />
            <StatCard label="Total Likes" value={overview.totalLikes} sub={`${overview.likes7d} this week`} />
            <StatCard label="Total Comments" value={overview.totalComments} sub={`${overview.comments7d} this week`} />
            <StatCard label="Avg Likes/Post" value={overview.avgLikesPerPost} />
            <StatCard label="Avg Comments/Post" value={overview.avgCommentsPerPost} />
          </div>

          {/* Engagement over time */}
          <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333]">
            <SectionTitle>Engagement Over Time (30 days)</SectionTitle>
            {overTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={overTime}>
                  <defs>
                    <linearGradient id="engPostsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2F3E8F" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#2F3E8F" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="engLikesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="engCommentsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                  <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                  <Area type="monotone" dataKey="posts" stroke="#2F3E8F" fill="url(#engPostsGrad)" strokeWidth={2} name="Posts" />
                  <Area type="monotone" dataKey="likes" stroke="#10b981" fill="url(#engLikesGrad)" strokeWidth={2} name="Likes" />
                  <Area type="monotone" dataKey="comments" stroke="#60a5fa" fill="url(#engCommentsGrad)" strokeWidth={2} name="Comments" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyMsg />}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Post type breakdown */}
            <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333]">
              <SectionTitle>Post Type Breakdown</SectionTitle>
              {postTypes.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={postTypes} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={85}
                      label={pieLabel(({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`)}>
                      {postTypes.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                    <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyMsg />}
            </div>

            {/* Top posters */}
            <div className="bg-[#3D2E1F] rounded-xl border border-[#5A4333] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#5A4333]"><SectionTitle>Top 10 Posters</SectionTitle></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[#B8A090] text-xs border-b border-[#5A4333]">
                      <th className="px-4 py-3 text-left font-medium">#</th>
                      <th className="px-4 py-3 text-left font-medium">User</th>
                      <th className="px-4 py-3 text-left font-medium">Posts</th>
                      <th className="px-4 py-3 text-left font-medium">Likes</th>
                      <th className="px-4 py-3 text-left font-medium">Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPosters.map((p, i) => (
                      <tr key={p.authorId || i} className="border-b border-[#5A4333]/50 hover:bg-[#4A3828]/30">
                        <td className="px-4 py-3 text-[#8B7355]">{i + 1}</td>
                        <td className="px-4 py-3">
                          <p className="text-gray-200">{p.name}</p>
                          <p className="text-[#8B7355] text-xs">{p.email}</p>
                        </td>
                        <td className="px-4 py-3 text-[#E2DBCE]">{p.postCount}</td>
                        <td className="px-4 py-3 text-green-400">{p.totalLikes}</td>
                        <td className="px-4 py-3 text-blue-400">{p.totalComments}</td>
                      </tr>
                    ))}
                    {topPosters.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-[#8B7355]">No posts yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
