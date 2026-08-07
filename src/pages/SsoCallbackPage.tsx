import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { setAuthToken, getAuthToken, isTokenExpired, setCachedUser } from '@/lib/auth'
import { useAuthStore } from '@/store/authStore'
import { API_BASE_URL } from '@/config/api'
import { trackEvent } from '@/services/firebase/analytics.service'

export function SsoCallbackPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const calledRef = useRef(false)

  useEffect(() => {
    if (calledRef.current) return
    calledRef.current = true

    async function run() {
      const params = new URLSearchParams(window.location.search)
      const ssoToken = params.get('token')
      const googleCode = params.get('code')
      const googleState = params.get('state')

      // Remove params from URL immediately
      if (ssoToken || googleCode) {
        window.history.replaceState({}, '', window.location.pathname)
      }

      // If we already have a valid cached app token, skip the exchange entirely
      const existingToken = getAuthToken()
      if (existingToken && !isTokenExpired(existingToken)) {
        localStorage.setItem('webview_mode', '1')
        navigate('/dashboard', { replace: true })
        return
      }

      // ── Google OAuth code exchange ──────────────────────────────────────
      if (googleCode) {
        const redirectUri = `${window.location.origin}/sso-callback`
        try {
          const res = await fetch(`${API_BASE_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: googleCode, redirectUri }),
          })
          const data = await res.json()

          if (!res.ok) {
            trackEvent('login_failed', { reason: data.error || 'Google exchange failed' })
            navigate('/login', { replace: true })
            return
          }

          setAuthToken(data.token)
          setCachedUser(data.user)
          setUser(data.user)

          // Track analytics event: sign_up_completed or login
          if (data.isNewUser || data.user?.isNewUser || data.isNew || data.user?.isNew) {
            trackEvent('sign_up_completed', { method: 'google' })
          } else {
            trackEvent('login', { method: 'google' })
          }

          const returnTo = googleState ? decodeURIComponent(googleState) : '/dashboard'
          navigate(returnTo, { replace: true })
          return
        } catch (error) {
          trackEvent('login_failed', { reason: error instanceof Error ? error.message : 'Google exchange network error' })
          navigate('/login', { replace: true })
          return
        }
      }

      // ── Keycloak SSO token exchange ─────────────────────────────────────
      if (!ssoToken) {
        navigate('/login', { replace: true })
        return
      }

      try {
        const res = await fetch(`${API_BASE_URL}/auth/sso`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ssoToken }),
        })
        const data = await res.json()

        if (!res.ok) {
          trackEvent('login_failed', { reason: data.error || 'SSO exchange failed' })
          navigate('/login', { replace: true })
          return
        }

        setAuthToken(data.token)
        setCachedUser(data.user)
        setUser(data.user)
        localStorage.setItem('webview_mode', '1')

        // Track analytics event: sign_up_completed or login
        if (data.isNewUser || data.user?.isNewUser || data.isNew || data.user?.isNew) {
          trackEvent('sign_up_completed', { method: 'sso' })
        } else {
          trackEvent('login', { method: 'sso' })
        }

        navigate('/dashboard', { replace: true })
      } catch (error) {
        trackEvent('login_failed', { reason: error instanceof Error ? error.message : 'SSO exchange network error' })
        navigate('/login', { replace: true })
      }
    }

    run()
  }, [navigate, setUser])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
      <div className="text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#2F3E8F] mx-auto" />
        <p className="text-sm text-gray-500">Signing you in...</p>
      </div>
    </div>
  )
}
