/**
 * AdminAuditLogPanel — F1
 *
 * Surfaces the most recent ~10 audit-log entries on the Admin Overview tab.
 * Pulls `/api/admin/audit-logs?limit=10` and renders a dense table consistent
 * with the rest of the admin chrome.
 */
import { useEffect, useState, useCallback } from 'react'
import { API_BASE_URL } from '@/config/api'
import { SectionTitle } from '@/components/admin/adminHelpers'
import { Loader2, RefreshCw, Shield } from 'lucide-react'

interface AuditEntry {
  id: number | string
  action: string
  actor_email?: string | null
  actor_id?: string | null
  target?: string | null
  metadata?: unknown
  created_at: string
}

interface AdminAuditLogPanelProps {
  adminToken: string | null
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('en-IN', { hour12: false })
  } catch { return iso }
}

export function AdminAuditLogPanel({ adminToken }: AdminAuditLogPanelProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!adminToken) return
    setLoading(true); setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/admin/audit-logs?limit=10`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { entries?: AuditEntry[]; logs?: AuditEntry[] }
      setEntries(data.entries || data.logs || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log')
    } finally {
      setLoading(false)
    }
  }, [adminToken])

  useEffect(() => { load() }, [load])

  return (
    <div className="bg-[#3D2E1F] rounded-xl p-5 border border-[#5A4333]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-400" strokeWidth={2.25} />
          <SectionTitle>Recent admin activity</SectionTitle>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-1.5 rounded hover:bg-[#5A4333] transition-colors text-[#B8A090] hover:text-white"
          title="Refresh"
        >
          {loading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>

      {error && (
        <p className="text-red-300 text-sm py-3">{error}</p>
      )}

      {!error && entries.length === 0 && !loading && (
        <p className="text-[#8B7355] text-sm py-6 text-center">No audit entries yet.</p>
      )}

      {entries.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[#8B7355] text-left border-b border-[#5A4333]">
                <th className="px-2 py-2 font-medium">Time</th>
                <th className="px-2 py-2 font-medium">Actor</th>
                <th className="px-2 py-2 font-medium">Action</th>
                <th className="px-2 py-2 font-medium">Target</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id} className="border-b border-[#5A4333]/50 hover:bg-[#4A3828]/30">
                  <td className="px-2 py-2 text-[#B8A090] font-mono">{fmtTime(e.created_at)}</td>
                  <td className="px-2 py-2 text-[#B8A090] truncate max-w-[180px]">
                    {e.actor_email || (e.actor_id ? <span className="font-mono text-[10px]">{e.actor_id.slice(0, 8)}</span> : '—')}
                  </td>
                  <td className="px-2 py-2">
                    <span className="inline-block px-2 py-0.5 rounded bg-[#5A4333] text-[#FFD583] font-mono text-[10px]">
                      {e.action}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-[#B8A090] truncate max-w-[200px]">
                    {e.target ? <span className="font-mono text-[10px]">{e.target}</span> : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
