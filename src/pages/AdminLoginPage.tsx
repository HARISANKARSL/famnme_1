import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminStore } from '@/store/adminStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { admin, adminLogin, checkAdminSession } = useAdminStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    checkAdminSession()
  }, [checkAdminSession])

  useEffect(() => {
    if (admin) {
      navigate('/admin/dashboard', { replace: true })
    }
  }, [admin, navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await adminLogin(email, password)
      navigate('/admin/dashboard', { replace: true })
    } catch (error: unknown) {
      toast({
        title: 'Login failed',
        description: error instanceof Error ? error.message : 'Invalid admin credentials.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2C1E14] to-[#3D2E1F] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#2F3E8F] rounded-2xl mb-4">
            <ShieldCheck className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Admin Portal</h1>
          <p className="text-[#B8A090] mt-1">FamNme Administration</p>
        </div>

        {/* Card */}
        <div className="bg-[#3D2E1F] rounded-2xl shadow-2xl p-8 border border-[#5A4333]">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#E2DBCE]">Admin Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@familyaconnect.com"
                required
                autoComplete="email"
                className="bg-[#4A3828] border-[#5A4333] text-white placeholder-[#B8A090] focus:border-[#2F3E8F]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#E2DBCE]">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="bg-[#4A3828] border-[#5A4333] text-white placeholder-[#B8A090] focus:border-[#2F3E8F] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B8A090] hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-[#2F3E8F] hover:bg-[#25327A] text-white mt-2"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Sign In to Admin Portal
            </Button>
          </form>
        </div>

        <p className="text-center text-[#8B7355] text-sm mt-6">
          Restricted access — authorized personnel only
        </p>
      </div>
    </div>
  )
}
