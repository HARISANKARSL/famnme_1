import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { burstConfetti } from '@/utils/confetti'
import { Camera, Mail, Trees, Share2, X } from 'lucide-react'

interface TreeCreationCelebrationProps {
  /** Name of the tree owner / home person — used in copy. */
  homePersonName: string
  /** Name of the tree (optional). */
  treeName?: string
  /** How many members are in the tree (including home person). */
  memberCount: number
  /** Called when user chooses "add a photo". */
  onAddMemory: () => void
  /** Called when user chooses "invite someone". */
  onInvite: () => void
  /** Called when user chooses "explore my tree" (or skip / share-then-continue). */
  onExplore: () => void
  /** Called when user hits the Skip × button. */
  onSkip?: () => void
  /** Tree URL for sharing. */
  shareUrl?: string
}

/**
 * A12 — Cinematic post-creation celebration.
 * Full-viewport overlay. 15s timeline:
 *   0.0s  dark fade-in
 *   0.2s  tree SVG draws itself
 *   1.0s  confetti burst
 *   1.5s  member count spring-eases 0 → N
 *   2.5s  Playfair heading fades in
 *   3.0s  NBA cards rise
 *   4.0s  share band
 * Respects prefers-reduced-motion (instant, no confetti).
 */
export function TreeCreationCelebration({
  homePersonName,
  treeName,
  memberCount,
  onAddMemory,
  onInvite,
  onExplore,
  onSkip,
  shareUrl,
}: TreeCreationCelebrationProps) {
  const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4>(0)
  const [animatedCount, setAnimatedCount] = useState(0)
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (reduceMotion) {
      setPhase(4)
      setAnimatedCount(memberCount)
      return
    }
    const timers: ReturnType<typeof setTimeout>[] = []
    timers.push(setTimeout(() => setPhase(1), 200))   // tree draw
    timers.push(setTimeout(() => {
      setPhase(2)
      burstConfetti({ origin: { x: 0.5, y: 0.45 }, particles: 120 })
    }, 1000))
    timers.push(setTimeout(() => setPhase(3), 2500))   // heading
    timers.push(setTimeout(() => setPhase(4), 3000))   // NBA cards
    return () => timers.forEach(clearTimeout)
  }, [memberCount, reduceMotion])

  // Spring-ease the member count from 0 → memberCount starting at phase ≥ 2
  useEffect(() => {
    if (phase < 2) return
    if (reduceMotion) {
      setAnimatedCount(memberCount)
      return
    }
    const duration = 900
    const start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
      setAnimatedCount(Math.round(memberCount * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, memberCount, reduceMotion])

  const handleShare = async () => {
    const url = shareUrl || window.location.origin
    const text = `I just started our family tree on FamNme${treeName ? ` — "${treeName}"` : ''}. Come join!`
    if (navigator.share) {
      try { await navigator.share({ title: 'Join my family tree', text, url }) } catch { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`)
        // Visual feedback via a simple transient element
        const el = document.createElement('div')
        el.textContent = 'Link copied to clipboard ✓'
        el.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:10000;background:#065F46;color:#fff;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:500;box-shadow:0 8px 24px rgba(0,0,0,0.2);'
        document.body.appendChild(el)
        setTimeout(() => el.remove(), 2200)
      } catch { /* ignore */ }
    }
  }

  const body = (
    <div
      role="dialog"
      aria-labelledby="celebration-heading"
      className="fixed inset-0 z-[9998] flex items-center justify-center overflow-y-auto bg-gradient-to-b from-[#F6F2EA] to-[#EFE6D6] dark:from-[#242424] dark:to-[#121212] transition-colors duration-300"
    >
      {/* Skip button */}
      {/* {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          aria-label="Skip celebration"
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition-colors border border-[#EEE8DC]/20 dark:border-slate-800"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
        >
          <X className="w-5 h-5 text-[#8B7355] dark:text-slate-400" />
        </button>
      )} */}

      <div className="w-full max-w-[560px] px-6 py-10 text-center">
        {/* 1 — Tree SVG draws itself */}
        <div
          className="mx-auto mb-6"
          style={{
            width: 120,
            height: 120,
            opacity: phase >= 1 ? 1 : 0,
            transform: phase >= 1 ? 'scale(1)' : 'scale(0.85)',
            transition: 'opacity 600ms ease-out, transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <svg viewBox="0 0 120 120" fill="none" stroke="#C2A46D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            {/* trunk */}
            <path
              d="M60 105 L60 65"
              strokeDasharray="100"
              strokeDashoffset={phase >= 1 ? 0 : 100}
              style={{ transition: 'stroke-dashoffset 700ms ease-out' }}
            />
            {/* branches */}
            <path
              d="M60 65 L35 40 M60 65 L85 40 M60 55 L50 30 M60 55 L72 28"
              strokeDasharray="200"
              strokeDashoffset={phase >= 1 ? 0 : 200}
              style={{ transition: 'stroke-dashoffset 900ms ease-out 200ms' }}
            />
            {/* canopy circles */}
            <g
              style={{
                opacity: phase >= 2 ? 1 : 0,
                transition: 'opacity 500ms ease-out',
              }}
              fill="#C2A46D"
              stroke="none"
            >
              <circle cx="35" cy="40" r="10" />
              <circle cx="85" cy="40" r="10" />
              <circle cx="50" cy="30" r="8" />
              <circle cx="72" cy="28" r="8" />
              <circle cx="60" cy="22" r="9" />
            </g>
          </svg>
        </div>

        {/* 2 — Member count */}
        <div
          style={{
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 500ms ease-out, transform 500ms ease-out',
          }}
        >
          <div
            className="font-display font-bold leading-none tabular-nums text-[#2F3E8F] dark:text-[#7B8FD4]"
            style={{ fontSize: '72px' }}
          >
            {animatedCount}
          </div>
          <div
            className="text-[13px] font-medium uppercase tracking-wider mt-1 text-[#8B7355] dark:text-slate-400"
            style={{ letterSpacing: '0.1em' }}
          >
            {memberCount === 1 ? 'member' : 'members'}
          </div>
        </div>

        {/* 3 — Heading */}
        <div
          style={{
            opacity: phase >= 3 ? 1 : 0,
            transform: phase >= 3 ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 600ms ease-out, transform 600ms ease-out',
          }}
          className="mt-6"
        >
          <h1 id="celebration-heading" className="font-display font-bold text-[#1E293B] dark:text-[#F3F2F1]" style={{ fontSize: '32px', lineHeight: 1.15 }}>
            Your family tree has grown.
          </h1>
          <p className="mt-2 text-[15px] text-[#64748B] dark:text-[#9B9790]">
            Welcome, {homePersonName}. Here's what's next.
          </p>
        </div>

        {/* 4 — NBA cards */}
        <div
          className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3"
          style={{
            opacity: phase >= 4 ? 1 : 0,
            transform: phase >= 4 ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 600ms ease-out, transform 600ms ease-out',
          }}
        >
          <NBACard
            icon={<Camera className="w-5 h-5" />}
            title="Add Your First Memory"
            subtitle="Capture and preserve special moments with your family"
            onClick={onAddMemory}
            accent="#C2A46D"
          />
          <NBACard
            icon={<Trees className="w-5 h-5" />}
            title="Explore your tree"
            subtitle="See the full picture"
            onClick={onExplore}
            accent="#4B2C5E"
          />
        </div>

        {/* Primary CTA */}
        {/* <div
          className="mt-6"
          style={{
            opacity: phase >= 4 ? 1 : 0,
            transition: 'opacity 700ms ease-out 500ms',
          }}
        >
          <button
            type="button"
            onClick={onExplore}
            className="px-8 py-3 text-white font-semibold text-[15px] rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-b from-[#2F3E8F] to-[#25327A] dark:from-[#3a4db2] dark:to-[#2F3E8F] shadow-[0_8px_24px_rgba(47,62,143,0.30),_0_2px_4px_rgba(0,0,0,0.10)]"
          >
            Go to my tree →
          </button>
        </div> */}
      </div>
    </div>
  )

  return createPortal(body, document.body)
}

function NBACard({
  icon,
  title,
  subtitle,
  onClick,
  accent,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  onClick: () => void
  accent: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left p-4 rounded-xl transition-all hover:-translate-y-0.5 active:translate-y-0 bg-white dark:bg-[#1E1E1E] border border-[#EEE8DC] dark:border-[#2a2a2a] shadow-sm hover:shadow-md"
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 8px 24px ${accent}22` }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '' }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
        style={{ background: `${accent}14`, color: accent }}
      >
        {icon}
      </div>
      <div className="font-semibold text-[14px] text-[#1E293B] dark:text-[#F3F2F1]">
        {title}
      </div>
      <div className="text-[12px] mt-0.5 text-[#64748B] dark:text-[#9B9790]">
        {subtitle}
      </div>
    </button>
  )
}
