import { useEffect, useState, useCallback } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Loader2 } from 'lucide-react'
import { API_BASE_URL } from '@/config/api'
import { StatCard, SectionTitle, SubSectionTitle, EmptyMsg, PIE_COLORS, pieLabel, adminAuthHeaders } from './adminHelpers'

interface MemoryOverview { total: number; photos: number; videos: number; audio: number; text: number; published: number; drafts: number }
interface TimeRow { day: string; count: number }
interface CategoryRow { category: string; count: number }
interface SentimentRow { sentiment: string; count: number }
interface TreeMemRow { treeId: string; treeName: string; memoryCount: number }
interface InterviewStats { totalInterviews: number; withAnswers: number }
interface AiStats { total: number; withStory: number; treesWithAi: number }

export function AdminContentTab({ adminToken }: { adminToken: string }) {
  const [loading, setLoading] = useState(true)
  const [memOverview, setMemOverview] = useState<MemoryOverview | null>(null)
  const [memOverTime, setMemOverTime] = useState<TimeRow[]>([])
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [sentiment, setSentiment] = useState<SentimentRow[]>([])
  const [topTrees, setTopTrees] = useState<TreeMemRow[]>([])
  const [interviews, setInterviews] = useState<InterviewStats | null>(null)
  const [aiStats, setAiStats] = useState<AiStats | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const h = adminAuthHeaders(adminToken)
    try {
      const [moRes, motRes, catRes, senRes, ttRes, intRes, aiRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/stats/memory-overview`, { headers: h }),
        fetch(`${API_BASE_URL}/admin/stats/memories-over-time?days=30`, { headers: h }),
        fetch(`${API_BASE_URL}/admin/stats/memory-categories?limit=15`, { headers: h }),
        fetch(`${API_BASE_URL}/admin/stats/memory-sentiment`, { headers: h }),
        fetch(`${API_BASE_URL}/admin/stats/top-trees-memories?limit=10`, { headers: h }),
        fetch(`${API_BASE_URL}/admin/stats/interview-stats`, { headers: h }),
        fetch(`${API_BASE_URL}/admin/stats/ai-content-stats`, { headers: h }),
      ])
      if (moRes.ok) setMemOverview(await moRes.json())
      if (motRes.ok) setMemOverTime(await motRes.json())
      if (catRes.ok) setCategories(await catRes.json())
      if (senRes.ok) setSentiment(await senRes.json())
      if (ttRes.ok) setTopTrees(await ttRes.json())
      if (intRes.ok) setInterviews(await intRes.json())
      if (aiRes.ok) setAiStats(await aiRes.json())
    } catch (err) { console.error('Content fetch error:', err) }
    finally { setLoading(false) }
  }, [adminToken])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading && !memOverview) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#2F3E8F]" /></div>
  }

  return (
    <div className="space-y-10">
      {/* Memories Section */}
      <div>
        <SubSectionTitle>Memories</SubSectionTitle>
        {memOverview && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-6">
            <StatCard label="Total Memories" value={memOverview.total} />
            <StatCard label="Photos" value={memOverview.photos} />
            <StatCard label="Videos" value={memOverview.videos} />
            <StatCard label="Audio" value={memOverview.audio} />
            <StatCard label="Text" value={memOverview.text} />
            <StatCard label="Published" value={memOverview.published} />
            <StatCard label="Drafts" value={memOverview.drafts} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Memory type pie */}
          <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333]">
            <SectionTitle>Memory Type Distribution</SectionTitle>
            {memOverview && memOverview.total > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Photo', value: memOverview.photos },
                      { name: 'Video', value: memOverview.videos },
                      { name: 'Audio', value: memOverview.audio },
                      { name: 'Text', value: memOverview.text },
                    ]}
                    dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                    label={pieLabel(({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`)}>
                    {[0, 1, 2, 3].map(i => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                  <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyMsg />}
          </div>

          {/* Sentiment pie */}
          <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333]">
            <SectionTitle>Memory Sentiment (NLP)</SectionTitle>
            {sentiment.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={sentiment} dataKey="count" nameKey="sentiment" cx="50%" cy="50%" outerRadius={90}
                    label={pieLabel(({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`)}>
                    {sentiment.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                  <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyMsg msg="No NLP-processed memories yet" />}
          </div>
        </div>

        {/* Memories over time */}
        <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333] mb-6">
          <SectionTitle>Memories Created (30 days)</SectionTitle>
          {memOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={memOverTime}>
                <defs>
                  <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2F3E8F" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2F3E8F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                <Area type="monotone" dataKey="count" stroke="#2F3E8F" fill="url(#memGrad)" strokeWidth={2} name="Memories" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyMsg />}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Categories */}
          <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333]">
            <SectionTitle>Top Memory Categories</SectionTitle>
            {categories.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(200, categories.length * 28)}>
                <BarChart data={categories} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis type="category" dataKey="category" tick={{ fill: '#9ca3af', fontSize: 11 }} width={100} />
                  <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} name="Memories" />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyMsg />}
          </div>

          {/* Top trees by memories */}
          <div className="bg-[#3D2E1F] rounded-xl border border-[#5A4333] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#5A4333]"><SectionTitle>Top Trees by Memory Count</SectionTitle></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#B8A090] text-xs border-b border-[#5A4333]">
                    <th className="px-4 py-3 text-left font-medium">#</th>
                    <th className="px-4 py-3 text-left font-medium">Tree</th>
                    <th className="px-4 py-3 text-left font-medium">Memories</th>
                  </tr>
                </thead>
                <tbody>
                  {topTrees.map((t, i) => (
                    <tr key={t.treeId || i} className="border-b border-[#5A4333]/50 hover:bg-[#4A3828]/30">
                      <td className="px-4 py-3 text-[#8B7355]">{i + 1}</td>
                      <td className="px-4 py-3 text-gray-200">{t.treeName}</td>
                      <td className="px-4 py-3">
                        <span className="bg-[#5A3D2A]/50 text-[#E8B08A] px-2 py-0.5 rounded text-xs font-medium">{t.memoryCount}</span>
                      </td>
                    </tr>
                  ))}
                  {topTrees.length === 0 && (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-[#8B7355]">No memories yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Interviews & AI Section */}
      <div>
        <SubSectionTitle>Interviews &amp; AI Content</SubSectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Total Interviews" value={interviews?.totalInterviews ?? 0} />
          <StatCard label="With Answers" value={interviews?.withAnswers ?? 0} />
          <StatCard label="AI Life Stories" value={aiStats?.withStory ?? 0} />
          <StatCard label="AI Total Persons" value={aiStats?.total ?? 0} />
          <StatCard label="Trees with AI" value={aiStats?.treesWithAi ?? 0} />
        </div>
      </div>
    </div>
  )
}
