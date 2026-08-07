/**
 * AdminFunnelPanel — 5.10
 *
 * Admin tab showing the activation funnel and step-by-step conversion +
 * drop-off rates from `/api/admin/funnel?days=N`. Range selector mirrors
 * the rest of the Admin Overview chrome.
 */
import { useEffect, useState, useCallback } from 'react'
import { API_BASE_URL } from '@/config/api'
import { SectionTitle } from '@/components/admin/adminHelpers'
import { Loader2, RefreshCw, TrendingDown } from 'lucide-react'

interface FunnelStep {
  id: string
  label: string
  count: number
  conversionFromPrev: number
  conversionFromTop: number
  dropOffPct?: number
}
interface FunnelResponse {
  days: number
  since: string
  steps: FunnelStep[]
  totals: Record<string, number>
}

interface Props { adminToken: string | null }

export function AdminFunnelPanel({ adminToken }: Props) {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<FunnelResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!adminToken) return
    setLoading(true); setError(null)
    try {
      const r = await fetch(`${API_BASE_URL}/admin/funnel?days=${days}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setData(await r.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load funnel')
    } finally { setLoading(false) }
  }, [adminToken, days])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      {/* Range selector */}
      <div className="flex items-center gap-2 justify-end">
        <span className="text-[#B8A090] text-sm">Time range:</span>
        {[7, 30, 90, 365].map(d => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              days === d
                ? 'bg-[#2F3E8F] text-white'
                : 'bg-[#3D2E1F] text-[#B8A090] hover:text-white border border-[#5A4333]'
            }`}
          >
            {d === 365 ? '12 mo' : `${d}d`}
          </button>
        ))}
        <button
          onClick={load}
          disabled={loading}
          className="ml-1 p-1.5 rounded hover:bg-[#5A4333] text-[#B8A090] hover:text-white"
          title="Refresh"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>

      <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333]">
        <SectionTitle>Activation funnel — last {days} day{days === 1 ? '' : 's'}</SectionTitle>

        {error && <p className="text-red-300 text-sm py-3">{error}</p>}

        {!error && data && data.steps.length > 0 && (
          <div className="mt-3 space-y-2">
            {data.steps.map((step, i) => {
              const widthPct = data.steps[0].count > 0
                ? Math.max(8, (step.count / data.steps[0].count) * 100)
                : 8
              return (
                <div key={step.id}>
                  {i > 0 && (
                    <div className="flex items-center gap-1.5 ml-4 my-1 text-[10.5px] text-amber-300/80">
                      <TrendingDown className="w-3 h-3" />
                      {step.dropOffPct ?? 0}% drop-off from {data.steps[i - 1].label.toLowerCase()}
                    </div>
                  )}
                  <div
                    className="rounded-md bg-gradient-to-r from-[#2F3E8F] to-[#4B2C5E] text-white px-3 py-2 flex items-center justify-between"
                    style={{ width: `${widthPct}%` }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-mono text-white/60 shrink-0">{i + 1}</span>
                      <span className="text-[12.5px] font-semibold truncate">{step.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] shrink-0 ml-3">
                      <span className="font-mono">{step.count.toLocaleString()}</span>
                      {i > 0 && (
                        <span className="text-white/70">{step.conversionFromTop}% from top</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!error && data && data.totals.signedUp === 0 && (
          <p className="text-[#8B7355] text-sm py-6 text-center mt-3">
            No signups in this window.
          </p>
        )}
      </div>
    </div>
  )
}
