/**
 * PlanetaryTable — Displays the 9 Graha positions in a formatted table.
 *
 * Shows: Planet, Sign, Nakshatra, House, Degree, and special states (retrograde, exalted, debilitated).
 */

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

interface PlanetaryTableProps {
  planets: PlanetData[]
  ascendantSign: string
  moonSign: string
  birthNakshatra: string
}

// Planet symbols for visual appeal
const PLANET_SYMBOLS: Record<string, string> = {
  Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me',
  Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
}

export function PlanetaryTable({ planets, ascendantSign, moonSign, birthNakshatra }: PlanetaryTableProps) {
  if (!planets.length) return null

  return (
    <div className="rounded-xl border border-[#E2DBCE]/60 dark:border-[#333] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-[#2F3E8F]/[0.05] to-[#4B2C5E]/[0.05] dark:from-[#2F3E8F]/[0.1] dark:to-[#4B2C5E]/[0.1]">
        <h3 className="text-[14px] font-semibold text-[#3D2E1F] dark:text-[#F3F2F1] font-['Playfair_Display',Georgia,serif]">
          Planetary Positions
        </h3>
        <div className="flex flex-wrap gap-3 mt-1.5">
          <span className="text-[11px] text-[#8B7355] dark:text-gray-400">
            Lagna: <span className="font-semibold text-[#2F3E8F] dark:text-[#7B8FD4]">{ascendantSign}</span>
          </span>
          <span className="text-[11px] text-[#8B7355] dark:text-gray-400">
            Rashi: <span className="font-semibold text-[#2F3E8F] dark:text-[#7B8FD4]">{moonSign}</span>
          </span>
          <span className="text-[11px] text-[#8B7355] dark:text-gray-400">
            Nakshatra: <span className="font-semibold text-[#2F3E8F] dark:text-[#7B8FD4]">{birthNakshatra}</span>
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-[#F6F2EA]/50 dark:bg-[#242424]/50 border-b border-[#E2DBCE]/40 dark:border-[#333]">
              <th className="px-3 py-2 text-left font-semibold text-[#2F3E8F] dark:text-[#7B8FD4]">Graha</th>
              <th className="px-3 py-2 text-left font-semibold text-[#2F3E8F] dark:text-[#7B8FD4]">Sign</th>
              <th className="px-3 py-2 text-left font-semibold text-[#2F3E8F] dark:text-[#7B8FD4]">Nakshatra</th>
              <th className="px-3 py-2 text-center font-semibold text-[#2F3E8F] dark:text-[#7B8FD4]">House</th>
              <th className="px-3 py-2 text-right font-semibold text-[#2F3E8F] dark:text-[#7B8FD4]">Degree</th>
              <th className="px-3 py-2 text-center font-semibold text-[#2F3E8F] dark:text-[#7B8FD4]">Status</th>
            </tr>
          </thead>
          <tbody>
            {planets.map((p) => (
              <tr
                key={p.planet}
                className="border-b border-[#E2DBCE]/20 dark:border-[#333]/50 last:border-b-0 hover:bg-[#2F3E8F]/[0.03] dark:hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-3 py-2 font-medium text-[#3D2E1F] dark:text-[#F3F2F1]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#4B2C5E]/10 dark:bg-[#D4B8E8]/10 flex items-center justify-center text-[9px] font-bold text-[#4B2C5E] dark:text-[#D4B8E8]">
                      {PLANET_SYMBOLS[p.planet] || p.planet.slice(0, 2)}
                    </span>
                    {p.planet}
                  </span>
                </td>
                <td className="px-3 py-2 text-[#3D2E1F] dark:text-[#D4D0CC]">{p.sign}</td>
                <td className="px-3 py-2 text-[#3D2E1F] dark:text-[#D4D0CC]">
                  {p.nakshatra} <span className="text-[#8B7355] dark:text-gray-500">P{p.nakshatraPada}</span>
                </td>
                <td className="px-3 py-2 text-center text-[#3D2E1F] dark:text-[#D4D0CC]">{p.house}</td>
                <td className="px-3 py-2 text-right text-[#3D2E1F] dark:text-[#D4D0CC]">{p.degree.toFixed(1)}°</td>
                <td className="px-3 py-2 text-center">
                  <span className="flex items-center justify-center gap-1">
                    {p.isRetrograde && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" title="Retrograde">
                        R
                      </span>
                    )}
                    {p.isExalted && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" title="Exalted">
                        Ex
                      </span>
                    )}
                    {p.isDebilitated && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" title="Debilitated">
                        Db
                      </span>
                    )}
                    {!p.isRetrograde && !p.isExalted && !p.isDebilitated && (
                      <span className="text-[#8B7355] dark:text-gray-500">—</span>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
