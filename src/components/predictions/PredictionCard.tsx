/**
 * PredictionCard — Compact card for a saved prediction in the list view.
 */

import { MoonStar, Zap, Calendar, Trash2 } from 'lucide-react'

interface AstrologyPrediction {
  personalHook: string
  personalSnapshot: { zodiacSign: string; birthStar: string }
  todayEnergy: { energyLevel: string }
}

interface PredictionCardProps {
  predictionId: string
  personName: string
  predictionDate: string
  zodiacSign: string
  birthStar: string
  energyLevel: string
  personalHook: string
  onClick: () => void
  onDelete: (e: React.MouseEvent) => void
}

function energyColor(level: string): string {
  const l = level.toLowerCase()
  if (['high', 'strong', 'vibrant'].some(k => l.includes(k))) {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
  }
  if (['low', 'depleted', 'drained'].some(k => l.includes(k))) {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  }
  return 'bg-[#2F3E8F]/[0.08] text-[#2F3E8F] dark:bg-[#7B8FD4]/[0.15] dark:text-[#7B8FD4]'
}

export function PredictionCard({
  personName,
  predictionDate,
  zodiacSign,
  birthStar,
  energyLevel,
  personalHook,
  onClick,
  onDelete,
}: PredictionCardProps) {
  const formattedDate = (() => {
    try {
      const d = new Date(predictionDate);
      if (isNaN(d.getTime())) return predictionDate;
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = String(d.getFullYear()).slice(-2);
      return `${dd}-${mm}-${yy}`;
    } catch {
      return predictionDate;
    }
  })();

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-xl border border-[#E2DBCE]/60 dark:border-[#333] bg-white dark:bg-[#1E1E1E] hover:shadow-md hover:border-[#C2A46D]/30 dark:hover:border-[#4B2C5E]/40 transition-all duration-200 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/30"
    >
      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-[#2F3E8F] to-[#4B2C5E] flex items-center justify-center">
              <MoonStar className="w-5 h-5 text-[#C2A46D]" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-[#3D2E1F] dark:text-[#F3F2F1] truncate">
                {personName}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-[#8B7355] dark:text-[#A19F9D]">
                <Calendar className="w-3 h-3" />
                {formattedDate}
              </div>
            </div>
          </div>
          {/* Delete */}
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
            aria-label="Delete prediction"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {zodiacSign && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#4B2C5E]/[0.08] text-[#4B2C5E] dark:bg-[#D4B8E8]/[0.15] dark:text-[#D4B8E8]">
              {zodiacSign}
            </span>
          )}
          {birthStar && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#C2A46D]/[0.10] text-[#8B7355] dark:bg-[#C2A46D]/[0.15] dark:text-[#C2A46D]">
              {birthStar}
            </span>
          )}
          {energyLevel && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${energyColor(energyLevel)}`}>
              <Zap className="w-3 h-3" />
              {energyLevel}
            </span>
          )}
        </div>

        {/* Personal hook preview */}
        <p className="text-[12px] text-[#3D2E1F]/60 dark:text-[#D4D0CC]/60 leading-relaxed line-clamp-2 italic">
          &ldquo;{personalHook}&rdquo;
        </p>
      </div>
    </button>
  )
}

/**
 * Parse prediction data JSON and extract display fields.
 */
export function parsePredictionData(predictionData: string): AstrologyPrediction | null {
  try {
    return JSON.parse(predictionData) as AstrologyPrediction
  } catch {
    return null
  }
}
