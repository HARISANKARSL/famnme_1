/**
 * VerifyEmailPage — A3
 *
 * Full-page email verification screen. Consumes the ?token= query param,
 * calls `GET /auth/verify-email`, and shows a success or error state with
 * a CTA back to the dashboard / login.
 */
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { resolveBackendUrl } from '@/config/api'

const API_BASE = resolveBackendUrl('/api')

async function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${API_BASE}${path}`, init)
}

type Status = 'loading' | 'success' | 'invalid' | 'expired' | 'error'

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    if (!token) { setStatus('invalid'); return }
    (async () => {
      try {
        const res = await apiFetch(`/auth/verify-email?token=${encodeURIComponent(token)}`)
        if (res.ok) {
          setStatus('success')
          setMessage('Your email is verified. Welcome aboard.')
          return
        }
        const body = await res.json().catch(() => ({} as { error?: string }))
        const err = String(body?.error || '')
        if (err.toLowerCase().includes('expired'))       setStatus('expired')
        else if (err.toLowerCase().includes('invalid'))  setStatus('invalid')
        else                                             setStatus('error')
        setMessage(err || 'Verification failed.')
      } catch {
        setStatus('error')
        setMessage('Network error. Please try again in a moment.')
      }
    })()
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F2EA] dark:bg-[#0a0a0a] px-4">
      <main id="main-content" className="max-w-md w-full rounded-2xl bg-white dark:bg-[#141414] border border-[#E2DBCE]/60 dark:border-[#2a2a2a] p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-8 h-8 text-[#2F3E8F] animate-spin mx-auto mb-4" />
            <h1 className="font-display text-[22px] font-semibold mb-1">Verifying your email…</h1>
            <p className="text-[13px] text-[#8B7355] dark:text-[#888]">Hang tight, this takes a second.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-14 h-14 rounded-full bg-[#6B8E5A]/15 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-[#52744A]" strokeWidth={1.8} />
            </div>
            <h1 className="font-display text-[22px] font-semibold mb-1">{message}</h1>
            <p className="text-[13px] text-[#8B7355] dark:text-[#888] mb-5">Your account is fully set up.</p>
            <Link to="/dashboard" className="inline-flex items-center rounded-lg bg-[#2F3E8F] text-white text-[14px] font-semibold px-5 py-2.5 hover:brightness-110">
              Go to dashboard
            </Link>
          </>
        )}
        {(status === 'invalid' || status === 'expired' || status === 'error') && (
          <>
            <div className="w-14 h-14 rounded-full bg-[#C29A94]/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-[#8E5A55]" strokeWidth={1.8} />
            </div>
            <h1 className="font-display text-[22px] font-semibold mb-1">
              {status === 'expired' ? 'This link has expired' : status === 'invalid' ? 'This link isn\'t valid' : 'Verification failed'}
            </h1>
            <p className="text-[13px] text-[#8B7355] dark:text-[#888] mb-5">
              {status === 'expired'
                ? 'Sign in and we\'ll send you a fresh link.'
                : status === 'invalid'
                  ? 'The link may have been used or tampered with.'
                  : (message || 'Something went wrong. Try again.')}
            </p>
            <Link to="/login" className="inline-flex items-center rounded-lg bg-[#2F3E8F] text-white text-[14px] font-semibold px-5 py-2.5 hover:brightness-110">
              Sign in
            </Link>
          </>
        )}
      </main>
    </div>
  )
}
