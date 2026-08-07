import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Loader2 } from 'lucide-react'

export function LoginPage() {
  const { user, loading, signIn } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = new URLSearchParams(location.search).get('returnTo') || '/dashboard'
  const mode = new URLSearchParams(location.search).get('mode') || undefined

  useEffect(() => {
    if (!loading && user) {
      navigate(returnTo, { replace: true })
    } else if (!loading && !user) {
      // Replace the current history state to prevent redirect loops when navigating back
      navigate('/', { replace: true })
      // Trigger Keycloak login immediately if we land on /login
      signIn(mode, location.search)
    }
  }, [user, loading, navigate, returnTo, signIn, mode, location.search])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F2EA]">
      <div className="text-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#2F3E8F] mx-auto" />
        <p className="text-sm font-medium text-[#4A3D2E]">Redirecting to secure login...</p>
      </div>
    </div>
  )
}

export default LoginPage
