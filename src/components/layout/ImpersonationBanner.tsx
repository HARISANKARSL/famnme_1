/**
 * ImpersonationBanner — F2 (admin viewing as user).
 *
 * Pinned to the top of every page when the current user JWT carries an
 * `impersonatedBy: 'admin'` claim. Shows the impersonated user's email and
 * an Exit button that clears the local token and bounces back to /admin.
 */
import { useEffect, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { getAuthToken, clearAuthToken } from '@/lib/auth'

interface ImpersonationClaims {
  email?: string
  userId?: string
  impersonatedBy?: string
  exp?: number
}

function decodeClaims(token: string | null): ImpersonationClaims | null {
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as ImpersonationClaims
    return payload
  } catch { return null }
}

export function ImpersonationBanner() {
  const [claims, setClaims] = useState<ImpersonationClaims | null>(null)

  useEffect(() => {
    setClaims(decodeClaims(getAuthToken()))
  }, [])

  if (!claims?.impersonatedBy) return null

  const exit = () => {
    clearAuthToken()
    window.location.href = '/admin'
  }

  return (
    <div
      role="alert"
      className="sticky top-0 z-[60] w-full bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-center gap-3 text-[13px] font-semibold shadow"
    >
      <ShieldAlert className="w-4 h-4 shrink-0" strokeWidth={2.5} />
      <span className="truncate">
        Admin mode — viewing as <strong>{claims.email || claims.userId}</strong>. All actions are logged.
      </span>
      <button
        onClick={exit}
        className="shrink-0 h-7 px-3 rounded-md bg-amber-950 text-amber-100 hover:bg-amber-900 text-[12px]"
      >
        Exit
      </button>
    </div>
  )
}
