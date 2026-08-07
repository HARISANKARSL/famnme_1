/**
 * Spotlight Highlight — Draws attention to a UI element by overlaying
 * a semi-transparent backdrop with a transparent cutout.
 *
 * Auto-dismisses after 3 seconds or on click.
 */

let activeOverlay: HTMLDivElement | null = null

export function spotlightHighlight(selector: string, duration = 3000): void {
  // Clean up any existing spotlight
  dismissSpotlight()

  const el = document.querySelector(selector) as HTMLElement | null
  if (!el) return

  const rect = el.getBoundingClientRect()
  const padding = 6

  // Create overlay
  const overlay = document.createElement('div')
  overlay.id = 'fc-spotlight-overlay'
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 9998;
    pointer-events: auto;
    cursor: pointer;
    transition: opacity 300ms ease-out;
  `

  // Use box-shadow trick for the cutout
  const x = rect.left - padding
  const y = rect.top - padding
  const w = rect.width + padding * 2
  const h = rect.height + padding * 2
  const r = 8 // border radius

  overlay.style.background = 'transparent'
  overlay.style.boxShadow = `
    0 0 0 9999px rgba(0, 0, 0, 0.45),
    inset 0 0 0 0 rgba(0, 0, 0, 0)
  `
  // Use clip-path to create the cutout
  overlay.style.clipPath = `polygon(
    0% 0%, 100% 0%, 100% 100%, 0% 100%,
    0% ${y}px,
    ${x}px ${y}px,
    ${x}px ${y + h}px,
    ${x + w}px ${y + h}px,
    ${x + w}px ${y}px,
    0% ${y}px
  )`
  overlay.style.background = 'rgba(0, 0, 0, 0.45)'

  // Pulsing ring around the element
  const ring = document.createElement('div')
  ring.style.cssText = `
    position: fixed;
    left: ${x - 2}px;
    top: ${y - 2}px;
    width: ${w + 4}px;
    height: ${h + 4}px;
    border: 2px solid #2F3E8F;
    border-radius: ${r}px;
    z-index: 9999;
    pointer-events: none;
    animation: fc-spotlight-pulse 1.5s ease-in-out infinite;
  `

  // Add pulse animation
  const style = document.createElement('style')
  style.textContent = `
    @keyframes fc-spotlight-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(47, 62, 143, 0.4); }
      50% { box-shadow: 0 0 0 8px rgba(47, 62, 143, 0); }
    }
  `

  document.body.appendChild(style)
  document.body.appendChild(overlay)
  document.body.appendChild(ring)
  activeOverlay = overlay

  // Dismiss on click
  overlay.addEventListener('click', dismissSpotlight)

  // Auto-dismiss after duration
  setTimeout(dismissSpotlight, duration)

  // Scroll element into view
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })

  // Store references for cleanup
  overlay.dataset.styleId = style.id = `fc-spotlight-style-${Date.now()}`
  overlay.dataset.ringId = ring.id = `fc-spotlight-ring-${Date.now()}`
}

function dismissSpotlight(): void {
  if (!activeOverlay) return

  const styleEl = document.getElementById(activeOverlay.dataset.styleId ?? '')
  const ringEl = document.getElementById(activeOverlay.dataset.ringId ?? '')

  // Fade out
  activeOverlay.style.opacity = '0'
  if (ringEl) ringEl.style.opacity = '0'

  setTimeout(() => {
    activeOverlay?.remove()
    styleEl?.remove()
    ringEl?.remove()
    activeOverlay = null
  }, 300)
}
