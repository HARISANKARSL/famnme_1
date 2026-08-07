/**
 * EmailVerificationBanner — A3
 *
 * Shown on the dashboard when the signed-in user's email hasn't been
 * verified yet. Offers a one-click "Send verification email" action
 * that hits `POST /auth/send-verification`.
 */
import { useState } from 'react'
import { MailCheck, X } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/use-toast'
import { getAuthToken } from '@/lib/auth'
import { resolveBackendUrl } from '@/config/api'

const API_BASE = resolveBackendUrl('/api')
const DISMISS_KEY = 'emailVerifyBanner.dismissedUntil'

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    return !!raw && new Date(raw).getTime() > Date.now()
  } catch { return false }
}
function dismiss24h() {
  try {
    const until = new Date(); until.setHours(until.getHours() + 24)
    localStorage.setItem(DISMISS_KEY, until.toISOString())
  } catch { /* noop */ }
}

export function EmailVerificationBanner() {
  const user = useAuthStore(s => s.user)
  const { toast } = useToast()
  const [sending, setSending] = useState(false)
  const [hidden, setHidden] = useState<boolean>(() => isDismissed())

  if (!user || user.emailVerified || hidden) return null

  const handleSend = async () => {
    setSending(true)
    try {
      const res = await fetch(`${API_BASE}/auth/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
      })
      const data = await res.json().catch(() => ({} as { error?: string; alreadyVerified?: boolean }))
      if (res.ok) {
        toast({
          title: data.alreadyVerified ? 'Already verified' : 'Verification email sent',
          description: data.alreadyVerified ? 'Your email is already confirmed.' : `Check ${user.email} for the confirmation link.`,
        })
      } else {
        toast({ title: 'Could not send', description: String(data?.error || 'Please try again later.'), variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Network error', description: 'Please try again in a moment.', variant: 'destructive' })
    } finally { setSending(false) }
  }

  const handleDismiss = () => { dismiss24h(); setHidden(true) }

  return (
    <div
      role="region"
      aria-label="Email verification reminder"
      className="rounded-xl border border-[#C2A46D]/40 bg-[#C2A46D]/[0.10] dark:bg-[#C2A46D]/[0.14] px-4 py-3 flex items-start gap-3"
    >
      <MailCheck className="w-4 h-4 text-[#8B6C2E] dark:text-[#D9BE8A] mt-0.5 shrink-0" strokeWidth={1.9} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#3D2E1F] dark:text-[#F3F2F1]">Confirm your email</p>
        <p className="text-[12px] text-[#5B5449] dark:text-[#B8B8B8] mt-0.5">
          We'll send a link to <span className="font-medium">{user.email}</span>. Confirming protects your trees if you lose access.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          className="inline-flex items-center rounded-lg bg-[#2F3E8F] text-white text-[12.5px] font-semibold px-3 py-1.5 hover:brightness-110 disabled:opacity-60"
        >
          {sending ? 'Sending…' : 'Send email'}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss for a day"
          className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[#5B5449] dark:text-[#888] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
