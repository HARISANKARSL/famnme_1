/**
 * BirthChartDisplay — Renders the Vedic birth chart from planetary data.
 *
 * Builds the chart client-side (SVG) from planet positions and ascendant,
 * so it works for saved predictions where the original VedAstro SVG was stripped
 * to keep DB payloads small.
 *
 * Supports South Indian (signs fixed in grid) and North Indian (houses fixed
 * in diamond) styles. Styled to match the indigo/gold/ivory palette.
 */

import { useState } from 'react'

interface PlanetData {
  planet: string
  sign: string
  signLord: string
  nakshatra: string
  nakshatraPada: number
  degree: number
  house: number
  isRetrograde: boolean
  isExalted: boolean
  isDebilitated: boolean
  navamshaSign: string
}

interface BirthChartDisplayProps {
  planets: PlanetData[]
  ascendantSign: string
  chartStyle: string
  onStyleChange?: (style: 'south_indian' | 'north_indian') => void
}

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

function signNumber(sign: string): number {
  const idx = SIGN_ORDER.indexOf(sign as typeof SIGN_ORDER[number])
  return idx >= 0 ? idx + 1 : 0
}

// Fixed (row, col) position for each sign in the 4x4 South Indian grid
const SOUTH_INDIAN_POSITIONS: Record<string, [number, number]> = {
  Pisces: [0, 0], Aries: [0, 1], Taurus: [0, 2], Gemini: [0, 3],
  Aquarius: [1, 0],                               Cancer: [1, 3],
  Capricorn: [2, 0],                              Leo: [2, 3],
  Sagittarius: [3, 0], Scorpio: [3, 1], Libra: [3, 2], Virgo: [3, 3],
}

// Planets grouped by sign for South Indian rendering
function planetsBySign(planets: PlanetData[]): Record<string, PlanetData[]> {
  const map: Record<string, PlanetData[]> = {}
  for (const p of planets) {
    if (!map[p.sign]) map[p.sign] = []
    map[p.sign].push(p)
  }
  return map
}

// Planets grouped by house for North Indian rendering
function planetsByHouse(planets: PlanetData[]): Record<number, PlanetData[]> {
  const map: Record<number, PlanetData[]> = {}
  for (const p of planets) {
    if (!map[p.house]) map[p.house] = []
    map[p.house].push(p)
  }
  return map
}

function formatPlanetLabel(p: PlanetData): string {
  const base = PLANET_ABBR[p.planet] || p.planet.slice(0, 2)
  const flags: string[] = []
  if (p.isRetrograde) flags.push('℞')
  return flags.length ? `${base}${flags.join('')}` : base
}

// ── South Indian Chart ────────────────────────────────────────────────────

function SouthIndianChart({ planets, ascendantSign }: { planets: PlanetData[]; ascendantSign: string }) {
  const size = 320
  const cell = size / 4
  const bySign = planetsBySign(planets)

  const cells: Array<{ row: number; col: number; sign: string }> = []
  for (const [sign, pos] of Object.entries(SOUTH_INDIAN_POSITIONS)) {
    cells.push({ sign, row: pos[0], col: pos[1] })
  }

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Outer frame */}
      <rect x="0" y="0" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#C2A46D]" />

      {/* Center 2x2 block (empty, for aesthetic) */}
      <rect
        x={cell} y={cell} width={cell * 2} height={cell * 2}
        fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#C2A46D]"
      />

      {/* Inner grid lines — only the outer ring cells */}
      {/* Vertical lines (top and bottom rows) */}
      {[1, 2, 3].map(i => (
        <g key={`v-${i}`}>
          <line x1={i * cell} y1="0" x2={i * cell} y2={cell} stroke="currentColor" strokeWidth="1" className="text-[#C2A46D]/50" />
          <line x1={i * cell} y1={3 * cell} x2={i * cell} y2={size} stroke="currentColor" strokeWidth="1" className="text-[#C2A46D]/50" />
        </g>
      ))}
      {/* Horizontal lines (left and right cols) */}
      {[1, 2, 3].map(i => (
        <g key={`h-${i}`}>
          <line x1="0" y1={i * cell} x2={cell} y2={i * cell} stroke="currentColor" strokeWidth="1" className="text-[#C2A46D]/50" />
          <line x1={3 * cell} y1={i * cell} x2={size} y2={i * cell} stroke="currentColor" strokeWidth="1" className="text-[#C2A46D]/50" />
        </g>
      ))}

      {/* Cell contents */}
      {cells.map(({ sign, row, col }) => {
        const x = col * cell
        const y = row * cell
        const planetsInCell = bySign[sign] || []
        const isAscendant = sign === ascendantSign
        const signNum = signNumber(sign)

        return (
          <g key={sign}>
            {/* Ascendant highlight */}
            {isAscendant && (
              <rect
                x={x + 2} y={y + 2} width={cell - 4} height={cell - 4}
                fill="currentColor" fillOpacity="0.08" className="text-[#2F3E8F]"
                rx="2"
              />
            )}

            {/* Sign label (top-left of cell) */}
            <text
              x={x + 6} y={y + 14}
              fontSize="10" fontWeight="600"
              fill="currentColor"
              className="text-[#8B7355] dark:fill-[#C2A46D]"
            >
              {signNum}. {SIGN_ABBR[sign]}
            </text>

            {/* Ascendant marker */}
            {isAscendant && (
              <text
                x={x + cell - 6} y={y + 14}
                fontSize="9" fontWeight="700" textAnchor="end"
                fill="currentColor"
                className="text-[#2F3E8F]"
              >
                Asc
              </text>
            )}

            {/* Planets in cell */}
            {planetsInCell.map((p, i) => {
              const cols = planetsInCell.length > 4 ? 3 : 2
              const rows = Math.ceil(planetsInCell.length / cols)
              const cellW = (cell - 10) / cols
              const cellH = Math.min(16, (cell - 22) / Math.max(rows, 1))
              const pCol = i % cols
              const pRow = Math.floor(i / cols)
              const px = x + 5 + pCol * cellW + cellW / 2
              const py = y + 22 + pRow * cellH + cellH / 2 + 3

              let colorClass = 'fill-[#3D2E1F] dark:fill-[#F3F2F1]'
              if (p.isExalted) colorClass = 'fill-emerald-600 dark:fill-emerald-400'
              else if (p.isDebilitated) colorClass = 'fill-red-500 dark:fill-red-400'
              else if (p.isRetrograde) colorClass = 'fill-amber-600 dark:fill-amber-400'

              return (
                <text
                  key={p.planet}
                  x={px} y={py}
                  fontSize="11" fontWeight="600" textAnchor="middle"
                  className={colorClass}
                >
                  {formatPlanetLabel(p)}
                </text>
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}

// ── North Indian Chart ────────────────────────────────────────────────────

function NorthIndianChart({ planets, ascendantSign }: { planets: PlanetData[]; ascendantSign: string }) {
  const size = 320
  const s = size // outer square side
  const m = s / 2 // midpoint coord
  const q = s / 4 // quarter

  const byHouse = planetsByHouse(planets)
  const ascNum = signNumber(ascendantSign)

  // Sign number for each house: H1 = asc, H2 = asc+1, ... (counter-clockwise in chart, but zodiac forward)
  const houseSign = (house: number): number => {
    if (ascNum === 0) return 0
    return ((ascNum - 1 + (house - 1)) % 12) + 1
  }

  // House label positions (centroid of each region)
  const housePositions: Record<number, { x: number; y: number }> = {
    1:  { x: m,         y: q },             // top kite center
    2:  { x: q,         y: q / 2 + 10 },    // top-left upper triangle
    3:  { x: q / 2 + 10, y: q },            // top-left lower triangle
    4:  { x: q,         y: m },             // left kite center
    5:  { x: q / 2 + 10, y: m + q },        // bottom-left upper triangle
    6:  { x: q,         y: m + q + q / 2 - 10 }, // bottom-left lower triangle
    7:  { x: m,         y: m + q },         // bottom kite center
    8:  { x: m + q,     y: m + q + q / 2 - 10 }, // bottom-right lower triangle
    9:  { x: s - q / 2 - 10, y: m + q },    // bottom-right upper triangle
    10: { x: m + q,     y: m },             // right kite center
    11: { x: s - q / 2 - 10, y: q },        // top-right lower triangle
    12: { x: m + q,     y: q / 2 + 10 },    // top-right upper triangle
  }

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Outer square */}
      <rect x="0" y="0" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#C2A46D]" />

      {/* Outer diagonals */}
      <line x1="0" y1="0" x2={s} y2={s} stroke="currentColor" strokeWidth="1" className="text-[#C2A46D]/60" />
      <line x1={s} y1="0" x2="0" y2={s} stroke="currentColor" strokeWidth="1" className="text-[#C2A46D]/60" />

      {/* Inner diamond (midpoints of outer sides) */}
      <polygon
        points={`${m},0 ${s},${m} ${m},${s} 0,${m}`}
        fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#C2A46D]"
      />

      {/* Ascendant highlight — House 1 kite */}
      <polygon
        points={`${m},0 ${m + q},${q} ${m},${m} ${m - q},${q}`}
        fill="currentColor" fillOpacity="0.08" className="text-[#2F3E8F]"
      />

      {/* House labels + planets */}
      {Object.entries(housePositions).map(([houseStr, pos]) => {
        const house = parseInt(houseStr, 10)
        const signNum = houseSign(house)
        const planetsInHouse = byHouse[house] || []

        return (
          <g key={house}>
            {/* Sign number (small, top of region) */}
            <text
              x={pos.x} y={pos.y - 12}
              fontSize="9" fontWeight="600" textAnchor="middle"
              fill="currentColor"
              className="text-[#8B7355] dark:fill-[#C2A46D]"
            >
              {signNum || ''}
            </text>

            {/* Ascendant marker */}
            {house === 1 && (
              <text
                x={pos.x} y={pos.y - 24}
                fontSize="9" fontWeight="700" textAnchor="middle"
                fill="currentColor"
                className="text-[#2F3E8F]"
              >
                Asc
              </text>
            )}

            {/* Planets */}
            {planetsInHouse.map((p, i) => {
              const cols = Math.min(3, planetsInHouse.length)
              const rows = Math.ceil(planetsInHouse.length / cols)
              const pCol = i % cols
              const pRow = Math.floor(i / cols)
              const spacingX = 20
              const spacingY = 12
              const startX = pos.x - ((cols - 1) * spacingX) / 2
              const startY = pos.y - ((rows - 1) * spacingY) / 2

              let colorClass = 'fill-[#3D2E1F] dark:fill-[#F3F2F1]'
              if (p.isExalted) colorClass = 'fill-emerald-600 dark:fill-emerald-400'
              else if (p.isDebilitated) colorClass = 'fill-red-500 dark:fill-red-400'
              else if (p.isRetrograde) colorClass = 'fill-amber-600 dark:fill-amber-400'

              return (
                <text
                  key={p.planet}
                  x={startX + pCol * spacingX}
                  y={startY + pRow * spacingY + 4}
                  fontSize="10" fontWeight="600" textAnchor="middle"
                  className={colorClass}
                >
                  {formatPlanetLabel(p)}
                </text>
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}

// ── Main Component ────────────────────────────────────────────────────────

export function BirthChartDisplay({ planets, ascendantSign, chartStyle, onStyleChange }: BirthChartDisplayProps) {
  const [activeStyle, setActiveStyle] = useState<'south_indian' | 'north_indian'>(
    chartStyle === 'north_indian' ? 'north_indian' : 'south_indian'
  )

  const handleStyleToggle = (style: 'south_indian' | 'north_indian') => {
    setActiveStyle(style)
    onStyleChange?.(style)
  }

  const hasData = planets && planets.length > 0

  return (
    <div className="rounded-xl border border-[#E2DBCE]/60 dark:border-[#333] overflow-hidden">
      {/* Header with style toggle */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#2F3E8F]/[0.05] to-[#4B2C5E]/[0.05] dark:from-[#2F3E8F]/[0.1] dark:to-[#4B2C5E]/[0.1]">
        <h3 className="text-[14px] font-semibold text-[#3D2E1F] dark:text-[#F3F2F1] font-['Playfair_Display',Georgia,serif]">
          Birth Chart (Kundali)
        </h3>
        <div className="flex rounded-lg overflow-hidden border border-[#DDD6C8] dark:border-[#444]">
          <button
            type="button"
            onClick={() => handleStyleToggle('south_indian')}
            className={`px-3 py-1 text-[11px] font-medium transition-colors ${
              activeStyle === 'south_indian'
                ? 'bg-[#2F3E8F] text-white dark:bg-[#5A6BFF]'
                : 'bg-white dark:bg-[#1E1E1E] text-[#8B7355] dark:text-gray-400 hover:bg-[#F6F2EA] dark:hover:bg-[#2A2A2A]'
            }`}
          >
            South Indian
          </button>
          <button
            type="button"
            onClick={() => handleStyleToggle('north_indian')}
            className={`px-3 py-1 text-[11px] font-medium transition-colors ${
              activeStyle === 'north_indian'
                ? 'bg-[#2F3E8F] text-white dark:bg-[#5A6BFF]'
                : 'bg-white dark:bg-[#1E1E1E] text-[#8B7355] dark:text-gray-400 hover:bg-[#F6F2EA] dark:hover:bg-[#2A2A2A]'
            }`}
          >
            North Indian
          </button>
        </div>
      </div>

      {/* Chart area */}
      <div className="p-4 flex items-center justify-center bg-white dark:bg-[#1A1A1A]">
        <div className="w-full max-w-[340px] aspect-square">
          {hasData ? (
            activeStyle === 'south_indian'
              ? <SouthIndianChart planets={planets} ascendantSign={ascendantSign} />
              : <NorthIndianChart planets={planets} ascendantSign={ascendantSign} />
          ) : (
            <div className="w-full h-full rounded-lg bg-[#F6F2EA] dark:bg-[#242424] flex items-center justify-center">
              <p className="text-[12px] text-[#8B7355] dark:text-gray-500 text-center px-4">
                Birth chart requires time and place of birth for accurate calculation
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      {hasData && (
        <div className="px-4 py-2.5 border-t border-[#E2DBCE]/60 dark:border-[#333] bg-[#F6F2EA]/30 dark:bg-[#1E1E1E]/50">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#8B7355] dark:text-[#A19F9D]">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Exalted
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" /> Debilitated
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Retrograde (℞)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#2F3E8F]" /> Ascendant (Asc)
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
