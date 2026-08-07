import { useEffect, useState } from 'react'
import { MessageCircle, ListTree, Mic, ChevronRight, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/use-toast'

interface WelcomePathSelectionProps {
  /** User's first name (for greeting). */
  userName: string
  /** User picks conversational flow — one question at a time. */
  onConversational: () => void
  /** User picks structured wizard — classic form-based. */
  onStructured: () => void
  /** User picks story capture — voice / narrative. */
  onStoryCapture: () => void
  /** User dismisses / skips — optional. */
  onSkip?: () => void
}

/**
 * A8 — Post-signup, pre-wizard welcome + path selection.
 * Shows *before* any wizard so the user picks their pace:
 *   - Conversational: one question at a time (for elders / slow).
 *   - Structured: classic form (for power users).
 *   - Story Capture: voice-first narrative (for storytellers).
 */
export function WelcomePathSelection({
  userName,
  onConversational,
  onStructured,
  onStoryCapture,
  onSkip,
}: WelcomePathSelectionProps) {
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 80)
    return () => clearTimeout(t)
  }, [])

  const { signOut } = useAuthStore()
  const { toast } = useToast()

  const handleLogout = async () => {
    try {
      await signOut()
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to sign out. Please try again.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9997] overflow-y-auto"
      style={{ background: 'radial-gradient(ellipse at top, #F6F2EA 0%, #EFE6D6 100%)' }}
      role="dialog"
      aria-labelledby="welcome-heading"
    >
      {/* Logout button at top right */}
      <button
        type="button"
        onClick={handleLogout}
        className="absolute top-4 right-4 md:top-6 md:right-8 flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-300 shadow-sm"
        style={{
          color: '#64748B',
          background: 'rgba(255, 255, 255, 0.6)',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          backdropFilter: 'blur(8px)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#DC2626'
          e.currentTarget.style.background = 'rgba(254, 242, 242, 0.8)'
          e.currentTarget.style.borderColor = 'rgba(252, 165, 165, 0.5)'
          e.currentTarget.style.transform = 'translateY(-1px)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.08)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#64748B'
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)'
          e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.8)'
          e.currentTarget.style.transform = 'none'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        <span>Logout</span>
      </button>

      <div className="min-h-full flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[640px] text-center">
          {/* Greeting */}
          <div
            className="transition-all duration-500"
            style={{
              opacity: entered ? 1 : 0,
              transform: entered ? 'translateY(0)' : 'translateY(12px)',
            }}
          >
            <h1
              id="welcome-heading"
              className="font-display font-bold leading-tight"
              style={{ fontSize: 'clamp(28px, 5vw, 40px)', color: '#1E293B' }}
            >
              Hi {userName}. Welcome.
            </h1>
            <p className="mt-2 text-[15px]" style={{ color: '#64748B' }}>
              How would you like to start your family tree?
            </p>
          </div>

          {/* Path cards */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3">
            <PathCard
              delay={0}
              entered={entered}
              icon={<MessageCircle className="w-6 h-6" />}
              title="One question at a time"
              subtitle="We'll gently walk you through it. Best if you're new to this."
              cta="Start chatting"
              accent="#C2A46D"
              onClick={onConversational}
            />
            <PathCard
              delay={120}
              entered={entered}
              icon={<ListTree className="w-6 h-6" />}
              title="Fill a quick form"
              subtitle="Jump straight to the fields. Fastest for power users."
              cta="Open form"
              accent="#2F3E8F"
              featured
              onClick={onStructured}
            />
            <PathCard
              delay={240}
              entered={entered}
              icon={<Mic className="w-6 h-6" />}
              title="Tell your family's story"
              subtitle="Speak or type — we'll turn it into a tree."
              cta="Start telling"
              accent="#4B2C5E"
              onClick={onStoryCapture}
            />
          </div>

          {/* Reassurance */}
          <div
            className="mt-8 text-[12px] transition-opacity duration-700"
            style={{ color: '#8B7355', opacity: entered ? 1 : 0 }}
          >
            You can always switch paths. Nothing's saved until you're ready.
          </div>

          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="mt-4 text-[13px] font-medium transition-colors hover:underline"
              style={{ color: '#64748B' }}
            >
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function PathCard({
  icon,
  title,
  subtitle,
  cta,
  accent,
  featured,
  onClick,
  delay,
  entered,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  cta: string
  accent: string
  featured?: boolean
  onClick: () => void
  delay: number
  entered: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative p-5 rounded-2xl text-left transition-all hover:-translate-y-1 active:translate-y-0"
      style={{
        background: featured ? 'white' : 'rgba(255,255,255,0.75)',
        border: featured ? `2px solid ${accent}` : '1px solid #EEE8DC',
        boxShadow: featured ? `0 8px 24px ${accent}26` : '0 2px 10px rgba(0,0,0,0.04)',
        opacity: entered ? 1 : 0,
        transform: entered ? 'translateY(0)' : 'translateY(16px)',
        transitionDelay: `${delay}ms`,
        transitionDuration: '500ms',
        transitionProperty: 'opacity, transform, box-shadow, background',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 12px 32px ${accent}33` }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = featured
          ? `0 8px 24px ${accent}26`
          : '0 2px 10px rgba(0,0,0,0.04)'
      }}
    >
      {featured && (
        <span
          className="absolute -top-2.5 right-4 px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full tracking-wider"
          style={{ background: accent, color: 'white', letterSpacing: '0.08em' }}
        >
          Recommended
        </span>
      )}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
        style={{ background: `${accent}14`, color: accent }}
      >
        {icon}
      </div>
      <div className="font-display font-semibold text-[18px] mb-1" style={{ color: '#1E293B' }}>
        {title}
      </div>
      <div className="text-[13px] mb-4" style={{ color: '#64748B', lineHeight: 1.4 }}>
        {subtitle}
      </div>
      <div
        className="inline-flex items-center gap-1 font-semibold text-[13px] transition-transform group-hover:translate-x-0.5"
        style={{ color: accent }}
      >
        {cta} <ChevronRight className="w-4 h-4" />
      </div>
    </button>
  )
}
