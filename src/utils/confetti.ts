/**
 * Lightweight canvas-confetti burst — no external deps.
 * Respects prefers-reduced-motion (no-op).
 *
 * Usage:
 *   import { burstConfetti } from '@/utils/confetti'
 *   burstConfetti()                        // full-screen burst from bottom-center
 *   burstConfetti({ origin: { x: 0.5, y: 0.8 }, particles: 60 })
 */

interface ConfettiOptions {
  /** Normalised 0..1 origin (0,0 = top-left). Default { x: 0.5, y: 0.7 }. */
  origin?: { x: number; y: number }
  /** Number of particles (default 90). */
  particles?: number
  /** Hex colors — cycled through particles. Defaults to brand palette. */
  colors?: string[]
  /** Total burst duration in ms (default 1600). */
  duration?: number
  /** Spread cone angle in degrees (default 90). */
  spread?: number
  /** Initial velocity (default 45). */
  startVelocity?: number
  /** Particle gravity (default 0.45). */
  gravity?: number
  /** z-index for the overlay canvas (default 9999). */
  zIndex?: number
}

const DEFAULT_COLORS = ['#C2A46D', '#2F3E8F', '#4B2C5E', '#E8B64C', '#8B5E3C']

export function burstConfetti(opts: ConfettiOptions = {}): void {
  if (typeof window === 'undefined') return
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reduceMotion) return

  const {
    origin = { x: 0.5, y: 0.7 },
    particles = 90,
    colors = DEFAULT_COLORS,
    duration = 1600,
    spread = 90,
    startVelocity = 45,
    gravity = 0.45,
    zIndex = 9999,
  } = opts

  const canvas = document.createElement('canvas')
  canvas.style.cssText = `position:fixed;inset:0;pointer-events:none;z-index:${zIndex};`
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    canvas.remove()
    return
  }

  const cx = canvas.width * origin.x
  const cy = canvas.height * origin.y
  const spreadRad = (spread * Math.PI) / 180
  const baseAngle = -Math.PI / 2 // upward

  interface Particle {
    x: number
    y: number
    vx: number
    vy: number
    rotation: number
    rotationSpeed: number
    color: string
    w: number
    h: number
    life: number
  }

  const parts: Particle[] = []
  for (let i = 0; i < particles; i++) {
    const angle = baseAngle + (Math.random() - 0.5) * spreadRad
    const velocity = startVelocity * (0.55 + Math.random() * 0.55)
    parts.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      color: colors[i % colors.length],
      w: 6 + Math.random() * 6,
      h: 3 + Math.random() * 4,
      life: 1,
    })
  }

  const start = performance.now()
  const render = (t: number) => {
    const elapsed = t - start
    const progress = elapsed / duration
    if (progress >= 1) {
      canvas.remove()
      return
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (const p of parts) {
      p.vy += gravity
      p.x += p.vx
      p.y += p.vy
      p.vx *= 0.99
      p.rotation += p.rotationSpeed
      p.life = 1 - progress

      ctx.save()
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.4))
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)
      ctx.fillStyle = p.color
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      ctx.restore()
    }
    requestAnimationFrame(render)
  }
  requestAnimationFrame(render)
}
