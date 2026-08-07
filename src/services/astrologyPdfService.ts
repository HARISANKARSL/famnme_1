/**
 * Jathakam PDF Export — Traditional Vedic birth chart document.
 *
 * Structured like a printed jathakam:
 *   1. Cover (Mangalacharanam) — ornate title, personal details, birth Panchang
 *   2. Janma Vivaran — birth summary + key identifiers
 *   3. Kundali — D1 Rashi chart and D9 Navamsa chart (drawn from planet data)
 *   4. Graha Sthiti — planetary positions table
 *   5. Vimshottari Dasha — current mahadasha + antardasha with full period table
 *   6. Dosha & Yoga Vichar — computed doshas and active yogas with remedies
 *   7. Life Analysis — personality, career, marriage, finance, health
 *   8. Daily Insights — today's energy, action guide, affirmation
 *
 * All charts are drawn as vector shapes (not embedded SVG), so they render
 * crisply at any zoom and don't depend on the original VedAstro chartSvg.
 *
 * Palette: saffron / gold / maroon — traditional jathakam colour scheme.
 */

import jsPDF from 'jspdf'

// ── Types ──

interface PlanetInfo {
  planet: string; sign: string; nakshatra: string; nakshatraPada: number
  degree: number; house: number; isRetrograde: boolean; isExalted: boolean
  isDebilitated: boolean; navamshaSign: string; signLord: string
}

interface AstrologyPrediction {
  personalHook: string
  personalSnapshot: {
    birthStar: string; zodiacSign: string; luckyNumber: string
    luckyColor: string; luckyDay: string; dominantTrait: string
  }
  todayEnergy: { energyLevel: string; moodTrend: string; outcomeBias: string; explanation: string }
  careerWork: { progressDirection: string; focus: string; avoid: string; microTiming: string }
  moneyFinance: { moneyFlow: string; riskLevel: string; spendingAdvice: string; investmentAdvice: string }
  socialRelationships: { interactionTone: string; advice: string }
  healthEnergy: { physicalEnergy: string; mentalState: string; suggestion: string }
  personalActionGuide: { whatWorks: string; whatToAvoid: string; powerMove: string }
  luckyElements: { color: string; colorAdvice: string; number: string; numberAdvice: string }
  tomorrowPreview: { overallTrend: string; opportunity: string; caution: string }
  emotionalClosing: string
  affirmation: string
  vedicData?: {
    planets: PlanetInfo[]
    ascendantSign: string; moonSign: string; sunSign: string
    birthNakshatra: string; birthNakshatraPada: number
    chartSvg: string | null; chartStyle: string
    horoscopePredictions: string[]
    dashas: Array<{ level: string; planet: string; startDate: string; endDate: string; isCurrent: boolean }>
  }
  horoscopeProfile?: {
    personality: { lagnaTraits: unknown; moonTraits: unknown; combinedSummary: string }
    strengths: string[]
    challenges: string[]
    career: { suitableFields: string[]; workStyle: string; careerAdvice: string }
    marriage: { romanticNature: string; partnerTraits: string[]; manglikStatus: string; marriageOutlook: string }
    finance: { moneyNature: string; wealthPotential: string; financialAdvice: string }
    health: { constitution: string; vulnerabilities: string; healthAdvice: string }
    doshas: Array<{ name: string; present: boolean; severity: string; description: string; remedy: string }>
    keyYogas: Array<{ name: string; effect: string }>
    lifeThemes: string[]
    currentPhase: string
  }
}

interface UserDetails {
  fullName: string
  dateOfBirth: string
  timeOfBirth?: string
  placeOfBirth?: string
  gender?: string
}

// ── Traditional Jathakam Palette ──

type RGB = [number, number, number]

const SAFFRON: RGB = [204, 85, 0]       // Primary title saffron
const SAFFRON_DEEP: RGB = [165, 42, 42]  // Deep saffron/maroon accent
const MAROON: RGB = [128, 30, 45]        // Dosha / emphasis
const GOLD: RGB = [184, 134, 11]         // Borders, ornaments
const GOLD_LIGHT: RGB = [230, 200, 130]  // Accent fills
const CREAM: RGB = [252, 246, 228]       // Background
const CREAM_DEEP: RGB = [246, 237, 210]  // Box backgrounds
const INK: RGB = [53, 32, 17]            // Body text
const INK_MUTED: RGB = [122, 96, 68]     // Labels, muted
const FOREST: RGB = [45, 100, 55]        // Exalted / positive indicator
const EMBER: RGB = [170, 70, 30]         // Retrograde / warning
const CRIMSON: RGB = [155, 30, 45]       // Debilitated / alert
const WHITE: RGB = [255, 255, 255]
const BLACK: RGB = [0, 0, 0]

// ── Sign helpers ──

const SIGN_ORDER = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const

const SIGN_ABBR: Record<string, string> = {
  Aries: 'Ari', Taurus: 'Tau', Gemini: 'Gem', Cancer: 'Can',
  Leo: 'Leo', Virgo: 'Vir', Libra: 'Lib', Scorpio: 'Sco',
  Sagittarius: 'Sag', Capricorn: 'Cap', Aquarius: 'Aqu', Pisces: 'Pis',
}

const PLANET_ABBR: Record<string, string> = {
  Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me',
  Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
}

// Fixed (row, col) of each sign in South Indian 4x4 layout
const SOUTH_INDIAN_POS: Record<string, [number, number]> = {
  Pisces: [0, 0], Aries: [0, 1], Taurus: [0, 2], Gemini: [0, 3],
  Aquarius: [1, 0],                               Cancer: [1, 3],
  Capricorn: [2, 0],                              Leo: [2, 3],
  Sagittarius: [3, 0], Scorpio: [3, 1], Libra: [3, 2], Virgo: [3, 3],
}

function signNumber(sign: string): number {
  const i = SIGN_ORDER.indexOf(sign as typeof SIGN_ORDER[number])
  return i >= 0 ? i + 1 : 0
}

function formatPlanet(p: PlanetInfo): string {
  const a = PLANET_ABBR[p.planet] || p.planet.slice(0, 2)
  return p.isRetrograde ? `${a}(R)` : a
}

// ── Trait parser (kept for horoscopeProfile sections) ──

function parseTraitsStr(text: unknown): string {
  if (!text) return ''
  if (Array.isArray(text)) return text.map(t => String(t).trim()).filter(Boolean).join(', ')
  const str = String(text)
  const spaced = str.replace(/([a-z])([A-Z])/g, '$1, $2')
  return spaced
}

// ── Logo cache ──

let cachedLogoBase64: string | null = null
async function loadLogo(): Promise<string | null> {
  if (cachedLogoBase64) return cachedLogoBase64
  try {
    const response = await fetch('/logo.png')
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => { cachedLogoBase64 = reader.result as string; resolve(cachedLogoBase64) }
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch { return null }
}

// ─── PDF Builder ────────────────────────────────────────────────────────────

export async function exportAstrologyPDF(
  prediction: AstrologyPrediction,
  userDetails: UserDetails,
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pw = doc.internal.pageSize.getWidth()   // 210
  const ph = doc.internal.pageSize.getHeight()  // 297
  const mg = 16                                  // outer margin
  const cw = pw - mg * 2
  let y = 0

  const vd = prediction.vedicData
  const hp = prediction.horoscopeProfile
  const p = prediction
  const logoBase64 = await loadLogo()

  // ── Primitives ────────────────────────────────────────────────────────────

  function setFill(c: RGB) { doc.setFillColor(c[0], c[1], c[2]) }
  function setDraw(c: RGB) { doc.setDrawColor(c[0], c[1], c[2]) }
  function setText(c: RGB) { doc.setTextColor(c[0], c[1], c[2]) }

  /** Ornamental double border + corner diamonds on current page. */
  function decoratePage(): void {
    setDraw(GOLD)
    doc.setLineWidth(0.8)
    doc.rect(6, 6, pw - 12, ph - 12)
    doc.setLineWidth(0.3)
    doc.rect(8, 8, pw - 16, ph - 16)

    // Corner diamond ornaments
    const corners: Array<[number, number]> = [
      [8, 8], [pw - 8, 8], [8, ph - 8], [pw - 8, ph - 8],
    ]
    for (const [cx, cy] of corners) {
      setFill(GOLD)
      const s = 2.2
      doc.triangle(cx, cy - s, cx + s, cy, cx, cy + s, 'F')
      doc.triangle(cx, cy - s, cx - s, cy, cx, cy + s, 'F')
    }

    // Top + bottom central motifs
    drawOrnament(pw / 2, 10)
    drawOrnament(pw / 2, ph - 10)
  }

  /** Small decorative diamond cluster used as header/footer ornament. */
  function drawOrnament(cx: number, cy: number) {
    setFill(GOLD)
    const s = 1.6
    const gap = 4
    for (const dx of [-gap, 0, gap]) {
      doc.triangle(cx + dx, cy - s, cx + dx + s, cy, cx + dx, cy + s, 'F')
      doc.triangle(cx + dx, cy - s, cx + dx - s, cy, cx + dx, cy + s, 'F')
    }
  }

  /** Gold divider line with central diamond motif. */
  function divider(yy: number, widthPct = 1.0) {
    const w = cw * widthPct
    const x = (pw - w) / 2
    setDraw(GOLD)
    doc.setLineWidth(0.35)
    doc.line(x, yy, x + w - 8, yy)
    doc.line(x + 8, yy, x + w, yy)
    setFill(GOLD)
    const s = 1.4
    doc.triangle(pw / 2, yy - s, pw / 2 + s, yy, pw / 2, yy + s, 'F')
    doc.triangle(pw / 2, yy - s, pw / 2 - s, yy, pw / 2, yy + s, 'F')
  }

  function checkBreak(needed: number) {
    // Content must stop above the footer strip (footer at ph-15; ornament at ph-10).
    if (y + needed > ph - 25) {
      doc.addPage()
      decoratePage()
      y = 18
    }
  }

  function sectionHeader(title: string, subtitle?: string) {
    checkBreak(22)
    y += 4
    // Saffron-filled pill header
    setFill(SAFFRON)
    doc.rect(mg, y, cw, 8, 'F')
    setFill(GOLD)
    doc.rect(mg, y + 8, cw, 0.8, 'F')
    doc.setFontSize(11)
    setText(WHITE)
    doc.setFont('helvetica', 'bold')
    doc.text(title, pw / 2, y + 5.4, { align: 'center' })
    y += 9
    if (subtitle) {
      doc.setFontSize(8)
      setText(INK_MUTED)
      doc.setFont('helvetica', 'italic')
      doc.text(subtitle, pw / 2, y + 3, { align: 'center' })
      y += 5
    }
    y += 3
  }

  function label(text: string) {
    checkBreak(7)
    doc.setFontSize(7.5)
    setText(MAROON)
    doc.setFont('helvetica', 'bold')
    doc.text(text.toUpperCase(), mg + 2, y)
    y += 4
  }

  function body(text: string, indent = 2) {
    if (!text) return
    doc.setFontSize(9.5)
    setText(INK)
    doc.setFont('helvetica', 'normal')
    const lines: string[] = doc.splitTextToSize(text, cw - indent - 2)
    checkBreak(lines.length * 4.2 + 2)
    doc.text(lines, mg + indent, y)
    y += lines.length * 4.2 + 3
  }

  function badge(lbl: string, val: string) {
    checkBreak(6)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    setText(SAFFRON_DEEP)
    doc.text(`${lbl}:`, mg + 2, y)
    setText(INK)
    doc.text(val, mg + 2 + doc.getTextWidth(`${lbl}: `), y)
    y += 4.5
  }

  function boxedQuote(text: string, variant: 'gold' | 'maroon' = 'gold') {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    const lines: string[] = doc.splitTextToSize(text, cw - 18)
    const h = lines.length * 4.8 + 12
    checkBreak(h + 3)
    setFill(CREAM_DEEP)
    doc.roundedRect(mg, y, cw, h, 2, 2, 'F')
    setDraw(variant === 'gold' ? GOLD : MAROON)
    doc.setLineWidth(0.5)
    doc.roundedRect(mg, y, cw, h, 2, 2, 'S')
    setFill(variant === 'gold' ? GOLD : MAROON)
    doc.rect(mg, y + 2, 1.4, h - 4, 'F')
    setText(INK)
    doc.text(lines, mg + 8, y + 8)
    y += h + 4
  }

  // ── South Indian Chart drawer ────────────────────────────────────────────

  /**
   * Draws a South Indian style chart at (x, y) of `size` mm.
   * `chartPlanets` is an array of { planet, sign } — for D1 pass vd.planets
   * with their actual sign; for D9 pass vd.planets but remap to navamshaSign.
   */
  function drawSouthIndianChart(
    chartX: number, chartY: number, size: number,
    chartPlanets: Array<{ planet: string; sign: string; isRetrograde?: boolean }>,
    ascendantSign: string,
    title: string,
  ): void {
    const cell = size / 4

    // Title
    doc.setFontSize(9)
    setText(SAFFRON_DEEP)
    doc.setFont('helvetica', 'bold')
    doc.text(title, chartX + size / 2, chartY - 2, { align: 'center' })

    // Outer frame
    setFill(CREAM)
    doc.rect(chartX, chartY, size, size, 'F')
    setDraw(GOLD)
    doc.setLineWidth(0.6)
    doc.rect(chartX, chartY, size, size)

    // Inner 2x2 hole
    doc.rect(chartX + cell, chartY + cell, cell * 2, cell * 2)

    // Grid lines for outer cells
    doc.setLineWidth(0.25)
    setDraw(GOLD)
    for (let i = 1; i <= 3; i++) {
      // Top + bottom row verticals
      doc.line(chartX + i * cell, chartY, chartX + i * cell, chartY + cell)
      doc.line(chartX + i * cell, chartY + 3 * cell, chartX + i * cell, chartY + size)
      // Left + right col horizontals
      doc.line(chartX, chartY + i * cell, chartX + cell, chartY + i * cell)
      doc.line(chartX + 3 * cell, chartY + i * cell, chartX + size, chartY + i * cell)
    }

    // Group planets by sign
    const bySign: Record<string, typeof chartPlanets> = {}
    for (const cp of chartPlanets) {
      if (!cp.sign) continue
      if (!bySign[cp.sign]) bySign[cp.sign] = []
      bySign[cp.sign].push(cp)
    }

    // Render each sign cell
    for (const [sign, pos] of Object.entries(SOUTH_INDIAN_POS)) {
      const [row, col] = pos
      const cx = chartX + col * cell
      const cy = chartY + row * cell
      const isAsc = sign === ascendantSign

      if (isAsc) {
        // Highlight ascendant cell
        setFill([255, 228, 196])
        doc.rect(cx + 0.4, cy + 0.4, cell - 0.8, cell - 0.8, 'F')
      }

      // Sign number + abbr in top-left
      doc.setFontSize(6.5)
      setText(INK_MUTED)
      doc.setFont('helvetica', 'bold')
      const sn = signNumber(sign)
      doc.text(`${sn}. ${SIGN_ABBR[sign] || sign.slice(0, 3)}`, cx + 1.6, cy + 3.2)

      // Asc marker
      if (isAsc) {
        doc.setFontSize(6)
        setText(MAROON)
        doc.text('Asc', cx + cell - 1.6, cy + 3.2, { align: 'right' })
      }

      // Planets in cell
      const occupants = bySign[sign] || []
      if (occupants.length === 0) continue
      doc.setFontSize(occupants.length > 3 ? 6 : 7)
      doc.setFont('helvetica', 'bold')
      const cols = occupants.length > 4 ? 3 : 2
      const lineH = occupants.length > 3 ? 2.8 : 3.2
      for (let i = 0; i < occupants.length; i++) {
        const r = Math.floor(i / cols)
        const c = i % cols
        const tx = cx + 1.8 + c * ((cell - 3) / cols)
        const ty = cy + 6 + r * lineH
        setText(occupants[i].isRetrograde ? EMBER : INK)
        const label = (PLANET_ABBR[occupants[i].planet] || occupants[i].planet.slice(0, 2))
          + (occupants[i].isRetrograde ? '℞' : '')
        doc.text(label, tx, ty)
      }
    }
  }

  function addFooter(pageNum: number, total: number) {
    doc.setFontSize(7)
    setText(INK_MUTED)
    doc.setFont('helvetica', 'italic')
    doc.text('Jathakam prepared by FamilyAConnect', pw / 2, ph - 15, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.text(`${pageNum} / ${total}`, pw - mg, ph - 15, { align: 'right' })
    doc.text('familyaconnect.com', mg, ph - 15)
  }

  // ════════════════════════════════════════════════════════════════════════
  // PAGE 1 — COVER / MANGALACHARANAM
  // ════════════════════════════════════════════════════════════════════════

  decoratePage()

  // Top saffron band with gold underline
  setFill(SAFFRON)
  doc.rect(mg, 22, cw, 16, 'F')
  setFill(GOLD)
  doc.rect(mg, 38, cw, 0.8, 'F')

  // Invocation
  doc.setFontSize(10)
  setText(WHITE)
  doc.setFont('helvetica', 'italic')
  doc.text('Om Ganeshaya Namaha', pw / 2, 30, { align: 'center' })
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.text('Salutations to Ganesha, remover of obstacles', pw / 2, 35, { align: 'center' })

  // Title
  y = 56
  doc.setFontSize(28)
  setText(SAFFRON_DEEP)
  doc.setFont('helvetica', 'bold')
  doc.text('JATHAKAM', pw / 2, y, { align: 'center' })
  y += 6
  doc.setFontSize(11)
  setText(INK_MUTED)
  doc.setFont('helvetica', 'italic')
  doc.text('Vedic Birth Chart & Astrological Analysis', pw / 2, y, { align: 'center' })
  y += 3
  divider(y + 2, 0.7)
  y += 14

  // "Prepared for" panel
  setFill(CREAM_DEEP)
  doc.roundedRect(mg + 10, y, cw - 20, 42, 2, 2, 'F')
  setDraw(GOLD)
  doc.setLineWidth(0.4)
  doc.roundedRect(mg + 10, y, cw - 20, 42, 2, 2, 'S')

  doc.setFontSize(8)
  setText(INK_MUTED)
  doc.setFont('helvetica', 'bold')
  doc.text('PREPARED FOR', pw / 2, y + 7, { align: 'center' })

  doc.setFontSize(20)
  setText(MAROON)
  doc.setFont('helvetica', 'bold')
  doc.text(userDetails.fullName, pw / 2, y + 18, { align: 'center' })

  // Birth details in two columns
  doc.setFontSize(9)
  setText(INK)
  doc.setFont('helvetica', 'normal')
  const birthRows = [
    { label: 'Date of Birth', value: formatDate(userDetails.dateOfBirth) },
    { label: 'Time of Birth', value: userDetails.timeOfBirth || 'Not provided' },
    { label: 'Place of Birth', value: userDetails.placeOfBirth || 'Not provided' },
    { label: 'Gender', value: capitalise(userDetails.gender || '—') },
  ]
  const brY = y + 27
  for (let i = 0; i < birthRows.length; i++) {
    const col = i % 2
    const row = Math.floor(i / 2)
    const cx = mg + 18 + col * ((cw - 20) / 2)
    const cy = brY + row * 6
    setText(INK_MUTED)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.text(birthRows[i].label.toUpperCase() + ':', cx, cy)
    setText(INK)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(birthRows[i].value, cx + 28, cy)
  }

  y += 52

  // Key indicators trio (Lagna / Rashi / Nakshatra) if available
  if (vd) {
    const cardW = (cw - 10) / 3
    const cards = [
      { label: 'LAGNA (Ascendant)', value: vd.ascendantSign },
      { label: 'RASHI (Moon Sign)', value: vd.moonSign },
      { label: 'JANMA NAKSHATRA', value: `${vd.birthNakshatra} — Pada ${vd.birthNakshatraPada}` },
    ]
    for (let i = 0; i < 3; i++) {
      const cx = mg + i * (cardW + 5)
      setFill(WHITE)
      doc.roundedRect(cx, y, cardW, 22, 2, 2, 'F')
      setDraw(SAFFRON)
      doc.setLineWidth(0.5)
      doc.roundedRect(cx, y, cardW, 22, 2, 2, 'S')
      setFill(SAFFRON)
      doc.rect(cx, y, cardW, 0.6, 'F')

      doc.setFontSize(6.8)
      setText(SAFFRON_DEEP)
      doc.setFont('helvetica', 'bold')
      doc.text(cards[i].label, cx + cardW / 2, y + 7, { align: 'center' })

      doc.setFontSize(cards[i].value.length > 14 ? 9 : 12)
      setText(MAROON)
      doc.setFont('helvetica', 'bold')
      doc.text(cards[i].value, cx + cardW / 2, y + 15, { align: 'center' })
    }
    y += 28
  }

  // "Prepared on" line + logo, comfortably above the footer (ph - 15)
  // Footer needs ~6mm clearance → stop content by ph - 22.
  y = ph - 50
  divider(y, 0.5)
  y += 10
  if (logoBase64) {
    try { doc.addImage(logoBase64, 'PNG', pw / 2 - 7, y, 14, 14) } catch { /* skip */ }
    y += 17
  }
  doc.setFontSize(8.5)
  setText(INK_MUTED)
  doc.setFont('helvetica', 'italic')
  const preparedOn = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  doc.text(`Prepared on ${preparedOn}`, pw / 2, y, { align: 'center' })

  // ════════════════════════════════════════════════════════════════════════
  // PAGE 2 — JANMA VIVARAN + PERSONAL INDICATORS
  // ════════════════════════════════════════════════════════════════════════

  doc.addPage()
  decoratePage()
  y = 18

  sectionHeader('Janma Vivaran', 'Birth Summary & Personal Indicators')

  // Personal hook as opening quote
  boxedQuote(p.personalHook, 'gold')

  // Grid of key attributes (6 items)
  const snapItems = [
    ['Zodiac (Rashi)', p.personalSnapshot.zodiacSign],
    ['Birth Star', p.personalSnapshot.birthStar],
    ['Lucky Number', p.personalSnapshot.luckyNumber],
    ['Lucky Colour', p.personalSnapshot.luckyColor],
    ['Lucky Day', p.personalSnapshot.luckyDay],
    ['Today\'s Trait', p.personalSnapshot.dominantTrait],
  ]
  checkBreak(36)
  const gridTop = y
  const itemH = 13
  const colsG = 3
  for (let i = 0; i < snapItems.length; i++) {
    const c = i % colsG
    const r = Math.floor(i / colsG)
    const bx = mg + c * (cw / colsG)
    const by = gridTop + r * itemH
    const bw = cw / colsG - 2

    setFill(CREAM_DEEP)
    doc.rect(bx, by, bw, itemH - 1, 'F')
    setDraw(GOLD_LIGHT)
    doc.setLineWidth(0.25)
    doc.rect(bx, by, bw, itemH - 1)

    doc.setFontSize(6.5)
    setText(INK_MUTED)
    doc.setFont('helvetica', 'bold')
    doc.text(snapItems[i][0].toUpperCase(), bx + 2, by + 4)

    doc.setFontSize(10)
    setText(MAROON)
    doc.setFont('helvetica', 'bold')
    doc.text(snapItems[i][1], bx + 2, by + 10)
  }
  y = gridTop + Math.ceil(snapItems.length / colsG) * itemH + 4

  // Panchang-style birth summary
  if (vd) {
    sectionHeader('Key Chart Positions', 'Principal Grahas at the moment of birth')

    const moon = vd.planets.find(pl => pl.planet === 'Moon')
    const sun = vd.planets.find(pl => pl.planet === 'Sun')

    const chartSummary: Array<[string, string]> = [
      ['Lagna (Ascendant Sign)', vd.ascendantSign],
      ['Chandra Rashi (Moon)', moon ? `${vd.moonSign} at ${moon.degree.toFixed(2)}°` : vd.moonSign],
      ['Surya Rashi (Sun)', sun ? `${vd.sunSign} at ${sun.degree.toFixed(2)}°` : vd.sunSign],
      ['Janma Nakshatra', `${vd.birthNakshatra} — Pada ${vd.birthNakshatraPada}`],
      ['Nakshatra Lord', moon ? (moon.signLord || '—') : '—'],
    ]
    for (const [lbl, val] of chartSummary) {
      checkBreak(6)
      doc.setFontSize(9)
      setText(SAFFRON_DEEP)
      doc.setFont('helvetica', 'bold')
      doc.text(lbl, mg + 4, y)
      setText(INK)
      doc.setFont('helvetica', 'normal')
      doc.text(':', mg + 72, y)
      doc.text(val, mg + 76, y)
      y += 5
    }
    y += 2
  }

  // ════════════════════════════════════════════════════════════════════════
  // PAGE 3 — KUNDALI (D1 RASHI + D9 NAVAMSA)
  // ════════════════════════════════════════════════════════════════════════

  if (vd && vd.planets.length > 0) {
    doc.addPage()
    decoratePage()
    y = 18

    sectionHeader('Kundali', 'Rashi Chakra (D1) and Navamsa Chakra (D9)')

    const chartSize = 78
    const chartY = y + 5
    const gap = 8
    const totalW = chartSize * 2 + gap
    const d1X = (pw - totalW) / 2
    const d9X = d1X + chartSize + gap

    // D1 — actual signs
    drawSouthIndianChart(
      d1X, chartY, chartSize,
      vd.planets.map(pl => ({ planet: pl.planet, sign: pl.sign, isRetrograde: pl.isRetrograde })),
      vd.ascendantSign,
      'Rashi Chakra (D1)',
    )

    // D9 — navamsha signs
    // Navamsa ascendant isn't in data; omit highlight (fallback ''), which won't match any sign.
    drawSouthIndianChart(
      d9X, chartY, chartSize,
      vd.planets.map(pl => ({ planet: pl.planet, sign: pl.navamshaSign || '', isRetrograde: pl.isRetrograde })),
      '', // no ascendant highlight for Navamsa (would need separate calc)
      'Navamsa Chakra (D9)',
    )

    y = chartY + chartSize + 10

    // Legend
    doc.setFontSize(7.5)
    setText(INK_MUTED)
    doc.setFont('helvetica', 'italic')
    doc.text(
      'Su=Sun  Mo=Moon  Ma=Mars  Me=Mercury  Ju=Jupiter  Ve=Venus  Sa=Saturn  Ra=Rahu  Ke=Ketu  ℞=Retrograde',
      pw / 2, y, { align: 'center' },
    )
    y += 5
    doc.text(
      'Ascendant (Lagna) cell is shaded. Numbers 1-12 are zodiac sign indices.',
      pw / 2, y, { align: 'center' },
    )
    y += 6

    // Ascendant summary box
    const asc = vd.ascendantSign
    const ascLord = vd.planets[0]?.signLord || '—'
    setFill(CREAM_DEEP)
    doc.roundedRect(mg + 10, y, cw - 20, 16, 2, 2, 'F')
    setDraw(SAFFRON)
    doc.setLineWidth(0.4)
    doc.roundedRect(mg + 10, y, cw - 20, 16, 2, 2, 'S')
    doc.setFontSize(9)
    setText(SAFFRON_DEEP)
    doc.setFont('helvetica', 'bold')
    doc.text(`Lagna: ${asc}`, pw / 2, y + 6, { align: 'center' })
    doc.setFontSize(8)
    setText(INK)
    doc.setFont('helvetica', 'normal')
    doc.text(`Ascendant Lord: ${ascLord}   |   Moon Sign: ${vd.moonSign}   |   Birth Nakshatra: ${vd.birthNakshatra}`, pw / 2, y + 12, { align: 'center' })
    y += 20
  }

  // ════════════════════════════════════════════════════════════════════════
  // PAGE 4 — GRAHA STHITI (Planetary Positions)
  // ════════════════════════════════════════════════════════════════════════

  if (vd && vd.planets.length > 0) {
    doc.addPage()
    decoratePage()
    y = 18

    sectionHeader('Graha Sthiti', 'Planetary Positions at Birth')

    // Table with bordered cells
    const tableTop = y
    const headers = ['Graha', 'Rashi', 'Degree', 'Nakshatra', 'Pada', 'Bhava', 'Navamsa', 'Status']
    const colWidths = [18, 22, 15, 28, 10, 10, 22, 26]
    let x0 = mg
    // Header background
    setFill(SAFFRON)
    doc.rect(x0, y, cw, 7, 'F')
    doc.setFontSize(8)
    setText(WHITE)
    doc.setFont('helvetica', 'bold')
    let cx = x0
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], cx + colWidths[i] / 2, y + 5, { align: 'center' })
      cx += colWidths[i]
    }
    y += 7

    // Rows
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    for (let ri = 0; ri < vd.planets.length; ri++) {
      checkBreak(7)
      const pl = vd.planets[ri]
      // Alternating bg
      if (ri % 2 === 0) {
        setFill(CREAM_DEEP)
        doc.rect(x0, y, cw, 6.5, 'F')
      }
      setDraw(GOLD_LIGHT)
      doc.setLineWidth(0.15)
      doc.line(x0, y + 6.5, x0 + cw, y + 6.5)

      cx = x0
      // Graha
      setText(MAROON)
      doc.setFont('helvetica', 'bold')
      doc.text(pl.planet, cx + colWidths[0] / 2, y + 4.5, { align: 'center' })
      cx += colWidths[0]
      // Rashi
      setText(INK)
      doc.setFont('helvetica', 'normal')
      doc.text(pl.sign, cx + colWidths[1] / 2, y + 4.5, { align: 'center' })
      cx += colWidths[1]
      // Degree
      doc.text(pl.degree.toFixed(2), cx + colWidths[2] / 2, y + 4.5, { align: 'center' })
      cx += colWidths[2]
      // Nakshatra
      doc.text(pl.nakshatra, cx + colWidths[3] / 2, y + 4.5, { align: 'center' })
      cx += colWidths[3]
      // Pada
      doc.text(String(pl.nakshatraPada), cx + colWidths[4] / 2, y + 4.5, { align: 'center' })
      cx += colWidths[4]
      // Bhava
      doc.text(String(pl.house), cx + colWidths[5] / 2, y + 4.5, { align: 'center' })
      cx += colWidths[5]
      // Navamsa
      doc.text(pl.navamshaSign || '—', cx + colWidths[6] / 2, y + 4.5, { align: 'center' })
      cx += colWidths[6]
      // Status
      const status: string[] = []
      let statusColor: RGB = INK_MUTED
      if (pl.isExalted) { status.push('Ucha (Exalted)'); statusColor = FOREST }
      else if (pl.isDebilitated) { status.push('Neecha (Debilitated)'); statusColor = CRIMSON }
      if (pl.isRetrograde) { status.push('Vakri (R)'); if (statusColor === INK_MUTED) statusColor = EMBER }
      setText(statusColor)
      doc.setFont('helvetica', status.length ? 'bold' : 'normal')
      doc.text(status.join(', ') || '—', cx + colWidths[7] / 2, y + 4.5, { align: 'center' })
      y += 6.5
    }

    // Table outer border
    setDraw(SAFFRON)
    doc.setLineWidth(0.5)
    doc.rect(x0, tableTop, cw, y - tableTop)

    y += 4
    doc.setFontSize(7.5)
    setText(INK_MUTED)
    doc.setFont('helvetica', 'italic')
    doc.text(
      'Ucha = Exalted (planet most powerful)   ·   Neecha = Debilitated   ·   Vakri = Retrograde motion',
      mg + 2, y,
    )
    y += 6
  }

  // ════════════════════════════════════════════════════════════════════════
  // PAGE 5 — VIMSHOTTARI DASHA
  // ════════════════════════════════════════════════════════════════════════

  if (vd?.dashas && vd.dashas.length > 0) {
    doc.addPage()
    decoratePage()
    y = 18

    sectionHeader('Vimshottari Mahadasha', 'The 120-year planetary cycle')

    // Current period summary
    const current = vd.dashas.find(d => d.isCurrent) || vd.dashas[0]
    if (current) {
      setFill(CREAM_DEEP)
      doc.roundedRect(mg, y, cw, 22, 2, 2, 'F')
      setDraw(MAROON)
      doc.setLineWidth(0.5)
      doc.roundedRect(mg, y, cw, 22, 2, 2, 'S')
      setFill(MAROON)
      doc.rect(mg, y, 1.6, 22, 'F')

      doc.setFontSize(7.5)
      setText(MAROON)
      doc.setFont('helvetica', 'bold')
      doc.text('CURRENT PERIOD', mg + 6, y + 5.5)

      doc.setFontSize(13)
      setText(SAFFRON_DEEP)
      doc.setFont('helvetica', 'bold')
      doc.text(`${current.planet} ${current.level}`, mg + 6, y + 12)

      doc.setFontSize(9)
      setText(INK)
      doc.setFont('helvetica', 'normal')
      doc.text(`From ${formatDate(current.startDate)}  to  ${formatDate(current.endDate)}`, mg + 6, y + 18)

      // If both mahadasha + antardasha
      const maha = vd.dashas.find(d => d.level.toLowerCase().includes('mahadasha'))
      const antar = vd.dashas.find(d => d.level.toLowerCase().includes('antardasha'))
      if (maha && antar) {
        doc.setFontSize(8)
        setText(INK_MUTED)
        doc.text(
          `${maha.planet} Mahadasha  ·  ${antar.planet} Antardasha`,
          pw - mg - 4, y + 12, { align: 'right' },
        )
      }
      y += 26
    }

    // All Vimshottari Mahadasha periods — standard 120-year cycle starting from birth dasha
    const mahadasha = vd.dashas.find(d => d.level.toLowerCase().includes('mahadasha'))
    if (mahadasha) {
      const fullCycle = buildFullMahadashaCycle(mahadasha)

      sectionHeader('120-Year Mahadasha Cycle')

      const dashaHeaders = ['Lord', 'Years', 'From', 'To', 'Status']
      const dCols = [25, 18, 34, 34, 30]
      const dTableX = mg + (cw - dCols.reduce((a, b) => a + b, 0)) / 2
      const dTableW = dCols.reduce((a, b) => a + b, 0)

      // Header
      setFill(SAFFRON)
      doc.rect(dTableX, y, dTableW, 6.5, 'F')
      doc.setFontSize(8)
      setText(WHITE)
      doc.setFont('helvetica', 'bold')
      let dx = dTableX
      for (let i = 0; i < dashaHeaders.length; i++) {
        doc.text(dashaHeaders[i], dx + dCols[i] / 2, y + 4.5, { align: 'center' })
        dx += dCols[i]
      }
      y += 6.5

      // Rows
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      for (let i = 0; i < fullCycle.length; i++) {
        checkBreak(6.5)
        const row = fullCycle[i]
        const isCurrent = row.current
        if (isCurrent) {
          setFill(GOLD_LIGHT)
          doc.rect(dTableX, y, dTableW, 6, 'F')
        } else if (i % 2 === 0) {
          setFill(CREAM_DEEP)
          doc.rect(dTableX, y, dTableW, 6, 'F')
        }

        dx = dTableX
        setText(isCurrent ? MAROON : INK)
        doc.setFont('helvetica', isCurrent ? 'bold' : 'normal')
        doc.text(row.planet, dx + dCols[0] / 2, y + 4, { align: 'center' })
        dx += dCols[0]
        doc.text(String(row.years), dx + dCols[1] / 2, y + 4, { align: 'center' })
        dx += dCols[1]
        doc.text(formatDate(row.from), dx + dCols[2] / 2, y + 4, { align: 'center' })
        dx += dCols[2]
        doc.text(formatDate(row.to), dx + dCols[3] / 2, y + 4, { align: 'center' })
        dx += dCols[3]
        doc.text(isCurrent ? '◆ Current ◆' : (row.past ? 'Completed' : 'Upcoming'), dx + dCols[4] / 2, y + 4, { align: 'center' })
        y += 6
      }

      setDraw(SAFFRON)
      doc.setLineWidth(0.5)
      const cycleTableTop = y - fullCycle.length * 6 - 6.5
      doc.rect(dTableX, cycleTableTop, dTableW, y - cycleTableTop)
      y += 5
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // PAGE 6 — DOSHA & YOGA VICHAR
  // ════════════════════════════════════════════════════════════════════════

  if (hp && (hp.doshas.length > 0 || hp.keyYogas.length > 0)) {
    doc.addPage()
    decoratePage()
    y = 18

    // Doshas
    if (hp.doshas.length > 0) {
      sectionHeader('Dosha Vichar', 'Planetary afflictions and their remedies')

      for (const d of hp.doshas) {
        checkBreak(26)

        const boxColor: RGB = d.present ? MAROON : FOREST
        const boxFill: RGB = d.present ? [250, 240, 235] : [240, 250, 240]

        const descLines: string[] = doc.splitTextToSize(d.description || '', cw - 14)
        const hasRemedy = d.present && !!d.remedy
        const remedyLines: string[] = hasRemedy ? doc.splitTextToSize(`Upaya (Remedy): ${d.remedy}`, cw - 14) : []
        const boxH = 8 + descLines.length * 4.2 + (hasRemedy ? (remedyLines.length * 4.2 + 3) : 0) + 4
        checkBreak(boxH + 4)

        setFill(boxFill)
        doc.roundedRect(mg, y, cw, boxH, 2, 2, 'F')
        setDraw(boxColor)
        doc.setLineWidth(0.4)
        doc.roundedRect(mg, y, cw, boxH, 2, 2, 'S')
        setFill(boxColor)
        doc.rect(mg, y, 1.6, boxH, 'F')

        // Dosha name + status
        doc.setFontSize(10)
        setText(boxColor)
        doc.setFont('helvetica', 'bold')
        doc.text(d.name, mg + 6, y + 6)
        const status = d.present ? `Present (${d.severity})` : 'Not Present'
        doc.setFontSize(8.5)
        doc.text(status, pw - mg - 4, y + 6, { align: 'right' })

        // Description
        doc.setFontSize(9)
        setText(INK)
        doc.setFont('helvetica', 'normal')
        doc.text(descLines, mg + 6, y + 12)

        // Remedy
        if (hasRemedy) {
          const ry = y + 12 + descLines.length * 4.2 + 2
          setDraw(GOLD)
          doc.setLineWidth(0.25)
          doc.line(mg + 6, ry, pw - mg - 6, ry)
          setText(SAFFRON_DEEP)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(9)
          doc.text(remedyLines, mg + 6, ry + 4)
        }

        y += boxH + 3
      }
    }

    // Yogas
    if (hp.keyYogas.length > 0) {
      sectionHeader('Yoga Vichar', 'Auspicious planetary combinations')

      for (const yoga of hp.keyYogas) {
        checkBreak(14)
        const effectLines: string[] = doc.splitTextToSize(yoga.effect || '', cw - 14)
        const boxH = 7 + effectLines.length * 4.2 + 3
        checkBreak(boxH + 2)

        setFill([252, 248, 230])
        doc.roundedRect(mg, y, cw, boxH, 2, 2, 'F')
        setDraw(GOLD)
        doc.setLineWidth(0.35)
        doc.roundedRect(mg, y, cw, boxH, 2, 2, 'S')
        setFill(GOLD)
        doc.rect(mg, y, 1.6, boxH, 'F')

        doc.setFontSize(10)
        setText(SAFFRON_DEEP)
        doc.setFont('helvetica', 'bold')
        doc.text(yoga.name, mg + 6, y + 6)

        doc.setFontSize(9)
        setText(INK)
        doc.setFont('helvetica', 'normal')
        doc.text(effectLines, mg + 6, y + 11)

        y += boxH + 3
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // LIFE ANALYSIS
  // ════════════════════════════════════════════════════════════════════════

  if (hp) {
    doc.addPage()
    decoratePage()
    y = 18

    sectionHeader('Jeevan Vishleshan', 'Life Analysis — Personality, Career, Relationships')

    // Personality
    label('Lagna (Outer Self)')
    body(parseTraitsStr(hp.personality.lagnaTraits))
    label('Moon Sign (Inner Self)')
    body(parseTraitsStr(hp.personality.moonTraits))
    label('Combined Personality')
    body(hp.personality.combinedSummary)

    if (hp.strengths.length > 0 || hp.challenges.length > 0) {
      sectionHeader('Gunas & Avasthas', 'Strengths and Growth Areas')
      if (hp.strengths.length > 0) {
        label('Strengths')
        body('• ' + hp.strengths.join('\n• '))
      }
      if (hp.challenges.length > 0) {
        label('Growth Areas')
        body('• ' + hp.challenges.join('\n• '))
      }
    }

    sectionHeader('Karma & Vritti', 'Career & Vocation')
    label('Suitable Fields')
    body(hp.career.suitableFields.join(',   '))
    body(hp.career.workStyle)
    label('Vocational Guidance')
    body(hp.career.careerAdvice)

    sectionHeader('Vivaha Vichar', 'Marriage & Relationships')
    body(hp.marriage.romanticNature)
    label('Ideal Partner Qualities')
    body(hp.marriage.partnerTraits.join(',   '))
    label('Manglik Status')
    body(hp.marriage.manglikStatus)
    body(hp.marriage.marriageOutlook)

    sectionHeader('Artha Chakra', 'Financial Outlook')
    body(hp.finance.moneyNature)
    body(hp.finance.wealthPotential)
    label('Arthic Upadesh (Financial Advice)')
    body(hp.finance.financialAdvice)

    sectionHeader('Swasthya Vichar', 'Health & Constitution')
    body(hp.health.constitution)
    body(hp.health.vulnerabilities)
    label('Wellness Upaya')
    body(hp.health.healthAdvice)

    if (hp.lifeThemes.length > 0 || hp.currentPhase) {
      sectionHeader('Jeevan Uddeshya', 'Life Themes & Current Phase')
      if (hp.lifeThemes.length > 0) {
        label('Major Life Themes')
        body(hp.lifeThemes.join(',   '))
      }
      if (hp.currentPhase) {
        label('Current Dasha Phase')
        body(hp.currentPhase)
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // DAILY INSIGHTS
  // ════════════════════════════════════════════════════════════════════════

  doc.addPage()
  decoratePage()
  y = 18

  sectionHeader("Dainik Phal", "Today's Insights")

  sectionHeader("Today's Energy")
  badge('Energy', p.todayEnergy.energyLevel)
  badge('Mood', p.todayEnergy.moodTrend)
  badge('Outcome', p.todayEnergy.outcomeBias)
  y += 1
  body(p.todayEnergy.explanation)

  sectionHeader('Career & Work')
  badge('Direction', p.careerWork.progressDirection)
  label('Focus On')
  body(p.careerWork.focus)
  label('What to Avoid')
  body(p.careerWork.avoid)
  label('Best Timing')
  body(p.careerWork.microTiming)

  sectionHeader('Money & Finance')
  badge('Flow', p.moneyFinance.moneyFlow)
  badge('Risk', p.moneyFinance.riskLevel)
  body(p.moneyFinance.spendingAdvice)
  body(p.moneyFinance.investmentAdvice)

  sectionHeader('Relationships & Social')
  badge('Tone', p.socialRelationships.interactionTone)
  body(p.socialRelationships.advice)

  sectionHeader('Health & Energy')
  badge('Physical', p.healthEnergy.physicalEnergy)
  badge('Mental', p.healthEnergy.mentalState)
  body(p.healthEnergy.suggestion)

  sectionHeader('Personal Action Guide')
  label('What Will Work')
  body(p.personalActionGuide.whatWorks)
  label('What to Avoid')
  body(p.personalActionGuide.whatToAvoid)

  // Power Move
  checkBreak(20)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  const pmLines: string[] = doc.splitTextToSize(p.personalActionGuide.powerMove, cw - 14)
  const pmH = pmLines.length * 4.4 + 12
  setFill([252, 248, 230])
  doc.roundedRect(mg, y, cw, pmH, 2, 2, 'F')
  setDraw(SAFFRON)
  doc.setLineWidth(0.5)
  doc.roundedRect(mg, y, cw, pmH, 2, 2, 'S')
  setFill(SAFFRON)
  doc.rect(mg, y, 1.6, pmH, 'F')
  doc.setFontSize(7.5)
  setText(SAFFRON_DEEP)
  doc.setFont('helvetica', 'bold')
  doc.text('POWER MOVE', mg + 6, y + 5)
  doc.setFontSize(9.5)
  setText(INK)
  doc.setFont('helvetica', 'normal')
  doc.text(pmLines, mg + 6, y + 11)
  y += pmH + 4

  sectionHeader('Lucky Elements')
  label(`Colour: ${p.luckyElements.color}`)
  body(p.luckyElements.colorAdvice)
  label(`Number: ${p.luckyElements.number}`)
  body(p.luckyElements.numberAdvice)

  sectionHeader('Shwetapakshi Drishti', 'Tomorrow Preview')
  body(p.tomorrowPreview.overallTrend)
  label('Opportunity')
  body(p.tomorrowPreview.opportunity)
  label('Caution')
  body(p.tomorrowPreview.caution)

  // Emotional closing + affirmation
  checkBreak(38)
  y += 2
  doc.setFontSize(10)
  doc.setFont('helvetica', 'italic')
  const closingLines: string[] = doc.splitTextToSize(p.emotionalClosing, cw - 22)
  const affLines: string[] = doc.splitTextToSize(`"${p.affirmation}"`, cw - 22)
  const closingH = closingLines.length * 4.8 + affLines.length * 4.6 + 24
  setFill([252, 248, 230])
  doc.roundedRect(mg, y, cw, closingH, 3, 3, 'F')
  setDraw(GOLD)
  doc.setLineWidth(0.6)
  doc.roundedRect(mg, y, cw, closingH, 3, 3, 'S')

  // Decorative diamond at top of quote
  setFill(GOLD)
  const qy = y + 6
  doc.triangle(pw / 2, qy - 1.6, pw / 2 + 1.6, qy, pw / 2, qy + 1.6, 'F')
  doc.triangle(pw / 2, qy - 1.6, pw / 2 - 1.6, qy, pw / 2, qy + 1.6, 'F')

  setText(INK)
  doc.text(closingLines, mg + 11, y + 12)

  const divY = y + 12 + closingLines.length * 4.8 + 3
  setDraw(GOLD)
  doc.setLineWidth(0.25)
  doc.line(mg + 11, divY, pw - mg - 11, divY)

  doc.setFontSize(7.5)
  setText(MAROON)
  doc.setFont('helvetica', 'bold')
  doc.text("TODAY'S AFFIRMATION", pw / 2, divY + 5, { align: 'center' })

  doc.setFontSize(10)
  setText(INK)
  doc.setFont('helvetica', 'italic')
  doc.text(affLines, pw / 2, divY + 11, { align: 'center' })
  y += closingH + 4

  // ── Footers (and decorate page 1 was already done; re-decorate only if missing) ──
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    addFooter(i, totalPages)
  }

  // Save
  const safeName = userDetails.fullName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
  const dateSlug = new Date().toISOString().slice(0, 10)
  doc.save(`jathakam-${safeName}-${dateSlug}.pdf`)
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}-${mm}-${yy}`;
  } catch {
    return iso;
  }
}

function capitalise(s: string): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Build the complete 120-year Vimshottari cycle given the current Mahadasha.
 * We reconstruct the full cycle because the backend only stores the current period,
 * but the past/future periods can be deterministically derived from a known starting
 * point on the dasha wheel.
 */
const DASHA_ORDER_LIST = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'] as const
const DASHA_YEARS_MAP: Record<string, number> = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7,
  Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
}
const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000

interface CycleEntry {
  planet: string
  years: number
  from: string
  to: string
  current: boolean
  past: boolean
}

function buildFullMahadashaCycle(currentMahadasha: { planet: string; startDate: string; endDate: string }): CycleEntry[] {
  const idx = DASHA_ORDER_LIST.indexOf(currentMahadasha.planet as typeof DASHA_ORDER_LIST[number])
  if (idx < 0) return [{
    planet: currentMahadasha.planet,
    years: DASHA_YEARS_MAP[currentMahadasha.planet] || 0,
    from: currentMahadasha.startDate,
    to: currentMahadasha.endDate,
    current: true, past: false,
  }]

  const currentStart = new Date(currentMahadasha.startDate).getTime()
  const currentEnd = new Date(currentMahadasha.endDate).getTime()
  const today = Date.now()

  // Walk backward from current to find each past period's start
  const pasts: CycleEntry[] = []
  let walkStart = currentStart
  let walkIdx = idx
  for (let i = 0; i < 8; i++) {
    walkIdx = (walkIdx - 1 + DASHA_ORDER_LIST.length) % DASHA_ORDER_LIST.length
    const planet = DASHA_ORDER_LIST[walkIdx]
    const years = DASHA_YEARS_MAP[planet]
    const prevEnd = walkStart
    const prevStart = walkStart - years * YEAR_MS
    pasts.unshift({
      planet, years,
      from: new Date(prevStart).toISOString().slice(0, 10),
      to: new Date(prevEnd).toISOString().slice(0, 10),
      current: false,
      past: prevEnd < today,
    })
    walkStart = prevStart
  }

  // Walk forward for future periods
  const futures: CycleEntry[] = []
  let walkEnd = currentEnd
  walkIdx = idx
  for (let i = 0; i < 8; i++) {
    walkIdx = (walkIdx + 1) % DASHA_ORDER_LIST.length
    const planet = DASHA_ORDER_LIST[walkIdx]
    const years = DASHA_YEARS_MAP[planet]
    const nextStart = walkEnd
    const nextEnd = walkEnd + years * YEAR_MS
    futures.push({
      planet, years,
      from: new Date(nextStart).toISOString().slice(0, 10),
      to: new Date(nextEnd).toISOString().slice(0, 10),
      current: false,
      past: false,
    })
    walkEnd = nextEnd
  }

  return [
    ...pasts,
    {
      planet: currentMahadasha.planet,
      years: DASHA_YEARS_MAP[currentMahadasha.planet] || 0,
      from: currentMahadasha.startDate,
      to: currentMahadasha.endDate,
      current: true,
      past: false,
    },
    ...futures,
  ]
}

/**
 * Generate the PDF as a File object (for Web Share API / email attachment).
 */
export async function generateAstrologyPDFFile(
  prediction: AstrologyPrediction,
  userDetails: UserDetails,
): Promise<File> {
  const { jsPDF: JsPDF } = await import('jspdf')
  const origSave = JsPDF.prototype.save
  let capturedBlob: Blob | null = null
  JsPDF.prototype.save = function () { capturedBlob = this.output('blob'); return this }
  try { await exportAstrologyPDF(prediction, userDetails) }
  finally { JsPDF.prototype.save = origSave }

  const safeName = userDetails.fullName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
  const dateSlug = new Date().toISOString().slice(0, 10)
  return new File([capturedBlob!], `jathakam-${safeName}-${dateSlug}.pdf`, { type: 'application/pdf' })
}
