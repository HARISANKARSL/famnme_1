/**
 * shareCardGenerator — Generates branded shareable images
 *
 * Creates a canvas-based image with heritage gradient background,
 * content text, and FamilyAConnect branding. Uses navigator.share()
 * on mobile or copies to clipboard on desktop.
 */

interface ShareCardOptions {
  title: string
  subtitle?: string
  highlight?: string
  familyName?: string
  gradient?: [string, string]
}

const DEFAULT_GRADIENT: [string, string] = ['#2F3E8F', '#4B2C5E']

function createShareImage(options: ShareCardOptions): HTMLCanvasElement {
  const { title, subtitle, highlight, familyName, gradient = DEFAULT_GRADIENT } = options
  const canvas = document.createElement('canvas')
  const W = 600
  const H = 400
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Gradient background
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, gradient[0])
  bg.addColorStop(1, gradient[1])
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.roundRect(0, 0, W, H, 16)
  ctx.fill()

  // Gold accent line
  ctx.fillStyle = '#C2A46D'
  ctx.fillRect(40, 60, 50, 3)

  // Family name label
  if (familyName) {
    ctx.font = '600 13px Inter, system-ui, sans-serif'
    ctx.fillStyle = '#C2A46D'
    ctx.textBaseline = 'top'
    ctx.fillText(familyName.toUpperCase(), 40, 75)
  }

  // Title
  ctx.font = 'bold 28px Inter, system-ui, sans-serif'
  ctx.fillStyle = '#FFFFFF'
  ctx.textBaseline = 'top'
  wrapText(ctx, title, 40, familyName ? 100 : 80, W - 80, 34)

  // Highlight (big stat or name)
  if (highlight) {
    ctx.font = 'bold 42px Inter, system-ui, sans-serif'
    ctx.fillStyle = '#C2A46D'
    ctx.fillText(highlight, 40, 200)
  }

  // Subtitle
  if (subtitle) {
    ctx.font = '15px Inter, system-ui, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.fillText(subtitle, 40, highlight ? 260 : 200)
  }

  // Branding watermark
  ctx.font = '12px Inter, system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.textBaseline = 'bottom'
  ctx.fillText('Discovered on FamilyAConnect', 40, H - 30)

  return canvas
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
  const words = text.split(' ')
  let line = ''
  let cy = y

  for (const word of words) {
    const testLine = line + (line ? ' ' : '') + word
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, x, cy)
      line = word
      cy += lineHeight
    } else {
      line = testLine
    }
  }
  ctx.fillText(line, x, cy)
}

export async function shareCard(options: ShareCardOptions): Promise<void> {
  const canvas = createShareImage(options)

  // Try native share first (mobile)
  if (navigator.share && navigator.canShare) {
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Failed to create image')), 'image/png')
      })
      const file = new File([blob], 'family-discovery.png', { type: 'image/png' })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: options.title,
          text: options.subtitle || 'Discovered on FamilyAConnect',
          files: [file],
        })
        return
      }
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return // user cancelled
    }
  }

  // Fallback: copy image to clipboard
  try {
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Failed to create image')), 'image/png')
    })
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ])
  } catch {
    // Final fallback: download as file
    const link = document.createElement('a')
    link.download = 'family-discovery.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }
}
