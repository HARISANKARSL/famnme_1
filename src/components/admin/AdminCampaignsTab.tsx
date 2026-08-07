import { useEffect, useState, useCallback } from 'react'
import { Loader2, Send, MousePointerClick, LogIn, UserPlus, ChevronDown, ChevronUp } from 'lucide-react'
import { API_BASE_URL } from '@/config/api'
import { StatCard, SectionTitle, adminAuthHeaders } from './adminHelpers'

interface Campaign {
  campaign_id: number
  campaign_key: string
  subject: string
  email_type: string
  sent_count: number
  created_at: string
  total_clicks: string
  unique_clickers: string
  logins_after: string
  signups_after: string
}

interface ClickRow {
  email: string
  link_name: string
  clicked_at: string
  user_agent: string
  ip_address: string
}

export function AdminCampaignsTab({ adminToken }: { adminToken: string }) {
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<string | null>(null)
  const [expandedCampaign, setExpandedCampaign] = useState<number | null>(null)
  const [clicks, setClicks] = useState<ClickRow[]>([])
  const [clicksLoading, setClicksLoading] = useState(false)

  const h = adminAuthHeaders(adminToken)

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/admin/stats/campaigns`, { headers: h })
      if (res.ok) {
        const data = await res.json() as { campaigns: Campaign[] }
        setCampaigns(data.campaigns || [])
      }
    } catch (err) { console.error('Campaigns fetch error:', err) }
    finally { setLoading(false) }
  }, [adminToken]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchCampaigns() }, [fetchCampaigns])

  const handleSendCampaign = useCallback(async (testEmail?: string) => {
    setSending(true)
    setSendResult(null)
    try {
      const url = testEmail
        ? `${API_BASE_URL}/admin/broadcast/feature-campaign?test=${encodeURIComponent(testEmail)}`
        : `${API_BASE_URL}/admin/broadcast/feature-campaign`
      const res = await fetch(url, { method: 'POST', headers: h })
      if (res.ok) {
        const data = await res.json() as { emailsSent: number; totalUsers: number; emailsFailed: number }
        setSendResult(`Sent ${data.emailsSent}/${data.totalUsers} emails (${data.emailsFailed} failed)`)
        fetchCampaigns()
      } else {
        setSendResult('Failed to send campaign')
      }
    } catch {
      setSendResult('Network error')
    } finally {
      setSending(false)
    }
  }, [adminToken, fetchCampaigns]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchClicks = useCallback(async (campaignId: number) => {
    if (expandedCampaign === campaignId) {
      setExpandedCampaign(null)
      return
    }
    setExpandedCampaign(campaignId)
    setClicksLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/admin/stats/campaigns/${campaignId}/clicks`, { headers: h })
      if (res.ok) {
        const data = await res.json() as { clicks: ClickRow[] }
        setClicks(data.clicks || [])
      }
    } catch (err) { console.error('Clicks fetch error:', err) }
    finally { setClicksLoading(false) }
  }, [expandedCampaign, adminToken]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && campaigns.length === 0) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#2F3E8F]" /></div>
  }

  const latestCampaign = campaigns[0]

  return (
    <div className="space-y-10">
      <SectionTitle>Email Campaigns</SectionTitle>

      {/* Summary stats from latest campaign */}
      {latestCampaign && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Emails Sent" value={latestCampaign.sent_count} icon={<Send className="w-5 h-5" />} />
          <StatCard label="Unique Clicks" value={parseInt(latestCampaign.unique_clickers) || 0} icon={<MousePointerClick className="w-5 h-5" />} />
          <StatCard label="Logins After" value={parseInt(latestCampaign.logins_after) || 0} icon={<LogIn className="w-5 h-5" />} />
          <StatCard label="Signups After" value={parseInt(latestCampaign.signups_after) || 0} icon={<UserPlus className="w-5 h-5" />} />
        </div>
      )}

      {/* Send buttons */}
      <div className="bg-white dark:bg-[#1E1E1E] rounded-xl p-6 shadow-sm ring-1 ring-stone-100 dark:ring-[#333]">
        <h3 className="text-[15px] font-bold text-[#3D2E1F] dark:text-[#F3F2F1] mb-4">Send Feature Campaign</h3>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleSendCampaign('abhilash.pillai@sblcorp.com')}
            disabled={sending}
            className="px-4 py-2 rounded-lg bg-[#2F3E8F]/10 text-[#2F3E8F] text-[13px] font-semibold hover:bg-[#2F3E8F]/20 disabled:opacity-50 transition-colors"
          >
            {sending ? 'Sending...' : 'Send Test Email'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm('Send campaign email to ALL users? This cannot be undone.')) {
                handleSendCampaign()
              }
            }}
            disabled={sending}
            className="px-4 py-2 rounded-lg bg-[#2F3E8F] text-white text-[13px] font-semibold hover:bg-[#3A4DA0] disabled:opacity-50 transition-colors"
          >
            {sending ? 'Sending...' : 'Send to All Users'}
          </button>
        </div>
        {sendResult && (
          <p className="mt-3 text-[13px] text-[#8B7355]">{sendResult}</p>
        )}
      </div>

      {/* Campaign list */}
      <div className="bg-white dark:bg-[#1E1E1E] rounded-xl shadow-sm ring-1 ring-stone-100 dark:ring-[#333] overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 dark:border-[#333]">
          <h3 className="text-[15px] font-bold text-[#3D2E1F] dark:text-[#F3F2F1]">All Campaigns</h3>
        </div>
        {campaigns.length === 0 ? (
          <div className="px-6 py-10 text-center text-[13px] text-[#8B7355]">No campaigns sent yet</div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-[#333]">
            {campaigns.map(c => {
              const clickRate = c.sent_count > 0
                ? ((parseInt(c.unique_clickers) || 0) / c.sent_count * 100).toFixed(1)
                : '0.0'
              const isExpanded = expandedCampaign === c.campaign_id

              return (
                <div key={c.campaign_id}>
                  <button
                    type="button"
                    onClick={() => fetchClicks(c.campaign_id)}
                    className="w-full text-left px-6 py-4 hover:bg-stone-50 dark:hover:bg-[#252525] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-[#3D2E1F] dark:text-[#F3F2F1] truncate">
                          {c.campaign_key}
                        </p>
                        <p className="text-[12px] text-[#8B7355] mt-0.5">
                          {(() => {
                            try {
                              const d = new Date(c.created_at);
                              if (isNaN(d.getTime())) return c.created_at;
                              const dd = String(d.getDate()).padStart(2, '0');
                              const mm = String(d.getMonth() + 1).padStart(2, '0');
                              const yy = String(d.getFullYear()).slice(-2);
                              const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                              return `${dd}-${mm}-${yy} ${timeStr}`;
                            } catch {
                              return c.created_at;
                            }
                          })()}
                          {' '}&middot;{' '}{c.email_type}
                        </p>
                      </div>
                      <div className="flex items-center gap-6 text-[12px] text-[#8B7355] shrink-0">
                        <span>Sent: <strong className="text-[#3D2E1F] dark:text-[#F3F2F1]">{c.sent_count}</strong></span>
                        <span>Clicks: <strong className="text-[#3D2E1F] dark:text-[#F3F2F1]">{c.total_clicks}</strong></span>
                        <span>Rate: <strong className="text-[#2F3E8F]">{clickRate}%</strong></span>
                        <span>Logins: <strong className="text-emerald-600">{c.logins_after}</strong></span>
                        <span>Signups: <strong className="text-[#4B2C5E]">{c.signups_after}</strong></span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </button>

                  {/* Expanded click details */}
                  {isExpanded && (
                    <div className="px-6 pb-4 bg-stone-50/50 dark:bg-[#1A1A1A]">
                      {clicksLoading ? (
                        <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#2F3E8F]" /></div>
                      ) : clicks.length === 0 ? (
                        <p className="py-4 text-[13px] text-[#8B7355] text-center">No clicks recorded yet</p>
                      ) : (
                        <table className="w-full text-[12px]">
                          <thead>
                            <tr className="text-left text-[#8B7355]">
                              <th className="py-2 pr-4 font-medium">Email</th>
                              <th className="py-2 pr-4 font-medium">Link</th>
                              <th className="py-2 font-medium">Clicked At</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100 dark:divide-[#333]">
                            {clicks.map((ck, i) => (
                              <tr key={i}>
                                <td className="py-2 pr-4 text-[#3D2E1F] dark:text-[#D4D0CC]">{ck.email}</td>
                                <td className="py-2 pr-4">
                                  <span className="inline-block px-2 py-0.5 rounded-full bg-[#2F3E8F]/10 text-[#2F3E8F] text-[11px] font-medium">
                                    {ck.link_name}
                                  </span>
                                </td>
                                <td className="py-2 text-[#8B7355]">
                                  {(() => {
                                    try {
                                      const d = new Date(ck.clicked_at);
                                      if (isNaN(d.getTime())) return ck.clicked_at;
                                      const dd = String(d.getDate()).padStart(2, '0');
                                      const mm = String(d.getMonth() + 1).padStart(2, '0');
                                      const yy = String(d.getFullYear()).slice(-2);
                                      const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                                      return `${dd}-${mm}-${yy} ${timeStr}`;
                                    } catch {
                                      return ck.clicked_at;
                                    }
                                  })()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
