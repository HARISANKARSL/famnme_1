/**
 * PasskeyManager — Settings → Account → Passkeys
 *
 * Lists registered passkeys, lets the user add a new one (with a friendly
 * device-name prompt), and remove existing ones. Shows a "not supported"
 * note on browsers without WebAuthn.
 */
import { useEffect, useState, useCallback } from 'react'
import { Loader2, Plus, Trash2, KeyRound, Check } from 'lucide-react'
import {
  isPasskeySupported, listPasskeys, registerPasskey, deletePasskey,
  type PasskeySummary,
} from '@/services/passkeyService'

export function PasskeyManager() {
  const supported = isPasskeySupported()
  const [items, setItems] = useState<PasskeySummary[]>([])
  const [loading, setLoading] = useState(false)
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [justAdded, setJustAdded] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!supported) return
    setLoading(true)
    try { setItems(await listPasskeys()) }
    finally { setLoading(false) }
  }, [supported])

  useEffect(() => { refresh() }, [refresh])

  const onAdd = async () => {
    setMessage(null); setWorking(true)
    try {
      const defaultName =
        /Mac/.test(navigator.userAgent) ? 'Mac' :
        /iPhone|iPad/.test(navigator.userAgent) ? 'iPhone / iPad' :
        /Android/.test(navigator.userAgent) ? 'Android' :
        /Windows/.test(navigator.userAgent) ? 'Windows device' :
        'This device'
      const name = window.prompt('Name this passkey (e.g. "iPhone", "Work laptop"):', defaultName) || defaultName
      const { credentialId } = await registerPasskey(name)
      setJustAdded(credentialId)
      setMessage('Passkey added. You can sign in with it next time.')
      await refresh()
      setTimeout(() => setJustAdded(null), 5000)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not add passkey'
      setMessage(/cancel/i.test(msg) ? null : msg)
    } finally { setWorking(false) }
  }

  const onRemove = async (id: string) => {
    if (!window.confirm('Remove this passkey? You\'ll still be able to sign in with your password.')) return
    setWorking(true)
    try {
      await deletePasskey(id)
      await refresh()
    } finally { setWorking(false) }
  }

  if (!supported) {
    return (
      <p className="text-[12px] text-stone-500">
        This browser doesn\'t support passkeys. Try a modern Chrome, Edge, Safari, or Firefox.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {items.length === 0 && !loading && (
        <p className="text-[12px] text-stone-500">
          No passkeys yet. Add one to sign in without typing your password.
        </p>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-[12px] text-stone-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
        </div>
      )}

      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map(p => (
            <li
              key={p.credentialId}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ring-1 transition-colors ${
                justAdded === p.credentialId
                  ? 'ring-emerald-300 bg-emerald-50 dark:bg-emerald-950/20'
                  : 'ring-stone-200 dark:ring-[#333] bg-white dark:bg-[#1E1E1E]'
              }`}
            >
              <KeyRound className="w-4 h-4 text-[#2F3E8F] dark:text-[#7B8FD4] shrink-0" strokeWidth={2.25} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{p.deviceName || 'Unnamed device'}</p>
                <p className="text-[11px] text-stone-500">
                  Added {(() => {
                    try {
                      const d = new Date(p.createdAt);
                      if (isNaN(d.getTime())) return p.createdAt;
                      const dd = String(d.getDate()).padStart(2, '0');
                      const mm = String(d.getMonth() + 1).padStart(2, '0');
                      const yy = String(d.getFullYear()).slice(-2);
                      return `${dd}-${mm}-${yy}`;
                    } catch {
                      return p.createdAt;
                    }
                  })()}{p.lastUsedAt ? ` · last used ${(() => {
                    try {
                      const d = new Date(p.lastUsedAt);
                      if (isNaN(d.getTime())) return p.lastUsedAt;
                      const dd = String(d.getDate()).padStart(2, '0');
                      const mm = String(d.getMonth() + 1).padStart(2, '0');
                      const yy = String(d.getFullYear()).slice(-2);
                      return `${dd}-${mm}-${yy}`;
                    } catch {
                      return p.lastUsedAt;
                    }
                  })()}` : ''}
                </p>
              </div>
              {justAdded === p.credentialId && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
              <button
                onClick={() => onRemove(p.credentialId)}
                disabled={working}
                className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 disabled:opacity-50"
                title="Remove this passkey"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={onAdd}
        disabled={working}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#2F3E8F] hover:bg-[#283576] text-white text-[12px] font-medium disabled:opacity-50"
      >
        {working ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
        Add a passkey
      </button>

      {message && (
        <p className="text-[12px] text-stone-600 dark:text-stone-300">{message}</p>
      )}
    </div>
  )
}
