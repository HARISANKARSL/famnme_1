import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Eye, EyeOff, ShieldCheck, CheckCircle2, Lock } from 'lucide-react'
import { API_BASE_URL } from '@/config/api'
import { PasswordStrengthMeter } from '@/components/ui/PasswordStrengthMeter'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()

  const token = searchParams.get('token') || ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword.length < 8) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 8 characters.',
        variant: 'destructive',
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure both passwords match.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password')
      }

      // A6: full-page success state (not a toast that disappears)
      setSuccess(true)
    } catch (error: unknown) {
      toast({
        title: 'Reset failed',
        description: error instanceof Error ? error.message : 'Could not reset your password. The link may have expired.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Invalid / missing token ──────────────────────────────────────────────
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F9FAFB] to-[#F4F6F9] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <img src="/Fam N Me_Logo_SVG.svg" alt="Fam N Me" className="h-10 w-auto mx-auto" />
          </div>
          <div
            className="bg-white rounded-2xl p-8 text-center"
            style={{ boxShadow: '0 20px 60px rgba(47, 62, 143, 0.10), 0 4px 16px rgba(0,0,0,0.06)', border: '1px solid #DBEAFE' }}
          >
            <div
              className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-4"
              style={{ background: 'linear-gradient(135deg, #FEE2E2, #FEF2F2)', border: '2px solid #DC2626' }}
            >
              <Lock className="w-7 h-7" style={{ color: '#DC2626' }} />
            </div>
            <h2 className="font-display text-[22px] font-bold mb-2" style={{ color: '#1E293B' }}>
              Link expired or invalid
            </h2>
            <p className="text-[13px] mb-5" style={{ color: '#64748B' }}>
              This password reset link can't be used anymore. Request a new one and we'll email it to you.
            </p>
            <Button
              onClick={() => navigate('/login')}
              className="bg-[#2F3E8F] hover:bg-[#25327A] w-full"
            >
              Back to Sign In
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Success state (A6) — full-page confirmation ─────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F9FAFB] to-[#F4F6F9] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <img src="/Fam N Me_Logo_SVG.svg" alt="Fam N Me" className="h-10 w-auto mx-auto" />
          </div>
          <div
            className="bg-white rounded-2xl p-8 text-center animate-fade-in"
            style={{ boxShadow: '0 20px 60px rgba(47, 62, 143, 0.10), 0 4px 16px rgba(0,0,0,0.06)', border: '1px solid #DBEAFE' }}
          >
            <div
              className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-5"
              style={{ background: 'linear-gradient(135deg, #D1FAE5, #ECFDF5)', border: '2px solid #10B981' }}
            >
              <CheckCircle2 className="w-9 h-9" style={{ color: '#059669' }} strokeWidth={2.5} />
            </div>
            <h2 className="font-display text-[24px] font-bold mb-2" style={{ color: '#065F46' }}>
              Password reset complete
            </h2>
            <p className="text-[14px] mb-6" style={{ color: '#64748B' }}>
              Your password is updated. You can now sign in with your new password.
            </p>
            <Button
              onClick={() => navigate('/login', { replace: true })}
              className="w-full h-11 text-[15px] font-semibold"
              style={{
                background: 'linear-gradient(180deg, #2F3E8F 0%, #25327A 100%)',
                boxShadow: '0 4px 16px rgba(47, 62, 143, 0.40), 0 2px 4px rgba(0, 0, 0, 0.10)',
              }}
            >
              Sign in with new password
            </Button>
            <p className="mt-4 inline-flex items-center gap-1 text-[11px]" style={{ color: '#94A3B8' }}>
              <ShieldCheck className="w-3 h-3" />
              For your safety, all other sessions have been signed out.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Form state ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9FAFB] to-[#F4F6F9] flex items-center justify-center p-4">
      <main id="main-content" className="w-full max-w-md">
        <div className="text-center mb-6">
          <img src="/Fam N Me_Logo_SVG.svg" alt="Fam N Me" className="h-10 w-auto mx-auto" />
        </div>

        <div
          className="bg-white rounded-2xl p-8"
          style={{ boxShadow: '0 20px 60px rgba(47, 62, 143, 0.10), 0 4px 16px rgba(0,0,0,0.06)', border: '1px solid #DBEAFE' }}
        >
          <div className="text-center mb-6">
            <h1 className="font-display text-[24px] font-bold" style={{ color: '#1E293B' }}>
              Set a new password
            </h1>
            <p className="text-[13px] mt-1.5" style={{ color: '#64748B' }}>
              Choose something strong you'll remember.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="pr-10 h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrengthMeter password={newPassword} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                minLength={8}
                autoComplete="new-password"
                className="h-11"
              />
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="text-[11px]" style={{ color: '#DC2626' }}>
                  Passwords don't match yet.
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full h-11 text-[15px] font-semibold"
              disabled={submitting}
              style={{
                background: 'linear-gradient(180deg, #2F3E8F 0%, #25327A 100%)',
                boxShadow: '0 4px 16px rgba(47, 62, 143, 0.40), 0 2px 4px rgba(0, 0, 0, 0.10)',
              }}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Reset password
            </Button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full text-[13px] font-medium text-center transition-colors"
              style={{ color: '#6B7280' }}
            >
              ← Back to Sign In
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
