/**
 * AstrologyWidget — Dashboard card for cosmic insights.
 *
 * Shows the latest prediction summary (if any) with quick stats,
 * or a CTA to generate the first prediction.
 * Navigates to the full Predictions page (Celebrate Culture > Predictions).
 */

import { useState, useEffect } from 'react'
import { MoonStar, ChevronRight, Gem, Star } from 'lucide-react'
import { fetchPredictions, type SavedPrediction } from '@/services/predictionApiService'

function parseTraitsCompact(text: unknown): string {
  if (!text) return ''
  if (Array.isArray(text)) return text.slice(0, 3).join(', ')
  const str = String(text)
  return str.replace(/([a-z])([A-Z])/g, '$1, $2')
}

export function AstrologyWidget() {
  const [latest, setLatest] = useState<SavedPrediction | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetchPredictions({ limit: 1 })
      .then(preds => { if (preds.length > 0) setLatest(preds[0]) })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  // Parse the latest prediction data for display
  let parsedData: Record<string, unknown> | null = null
  if (latest?.predictionData) {
    try { parsedData = JSON.parse(latest.predictionData) as Record<string, unknown> } catch { /* skip */ }
  }
  const snap = parsedData?.personalSnapshot as { zodiacSign?: string; birthStar?: string; dominantTrait?: string } | undefined
  const energy = parsedData?.todayEnergy as { energyLevel?: string } | undefined
  const hook = parsedData?.personalHook as string | undefined
  const hp = parsedData?.horoscopeProfile as { personality?: { combinedSummary?: string }; keyYogas?: Array<{ name: string }> } | undefined

  const navigateToNew = () => {
    window.location.hash = 'culture/predictions/new'
  }

  const navigateToList = () => {
    window.location.hash = 'culture/predictions'
  }

  return (
    <div className="rounded-2xl overflow-hidden ring-1 ring-[#4B2C5E]/[0.10] dark:ring-[#4B2C5E]/[0.20]">
      {/* Gradient header stripe */}
      <div className="h-1 bg-gradient-to-r from-[#4B2C5E] via-[#C2A46D] to-[#2F3E8F]" />

      <div className="bg-gradient-to-br from-[#4B2C5E]/[0.06] to-[#C2A46D]/[0.08] dark:from-[#4B2C5E]/[0.12] dark:to-[#C2A46D]/[0.10] p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4B2C5E] to-[#2F3E8F] flex items-center justify-center shadow-sm">
            <MoonStar className="w-[18px] h-[18px] text-[#C2A46D]" strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-bold text-[#4B2C5E] dark:text-[#D4B8E8] leading-tight">
              Cosmic Insights
            </h3>
            <p className="text-[11px] text-[#8B7355] dark:text-[#A19F9D] leading-tight mt-0.5">
              Vedic Astrology + AI Predictions
            </p>
          </div>
        </div>

        {/* Latest prediction summary OR intro text */}
        {loaded && latest && parsedData ? (
          <div className="space-y-2.5 mb-3">
            {/* Person + quick stats */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-[#3D2E1F] dark:text-[#F3F2F1]">{latest.personName}</p>
                <p className="text-[10px] text-[#8B7355] dark:text-[#A19F9D]">
                  {snap?.zodiacSign || latest.zodiacSign} · {snap?.birthStar || latest.birthStar}
                </p>
              </div>
              {energy?.energyLevel && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  energy.energyLevel.toLowerCase().includes('high')
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : energy.energyLevel.toLowerCase().includes('low')
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-[#2F3E8F]/[0.08] text-[#2F3E8F] dark:bg-[#7B8FD4]/[0.15] dark:text-[#7B8FD4]'
                }`}>
                  {energy.energyLevel}
                </span>
              )}
            </div>

            {/* Personal hook preview */}
            {hook && (
              <p className="text-[11px] text-[#3D2E1F]/70 dark:text-[#D4D0CC]/70 leading-relaxed italic line-clamp-2">
                &ldquo;{hook}&rdquo;
              </p>
            )}

            {/* Horoscope highlights */}
            {hp && (
              <div className="flex flex-wrap gap-1.5">
                {snap?.dominantTrait && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-[#4B2C5E]/[0.08] text-[#4B2C5E] dark:bg-[#D4B8E8]/[0.15] dark:text-[#D4B8E8]">
                    {parseTraitsCompact(snap.dominantTrait)}
                  </span>
                )}
                {hp.keyYogas?.slice(0, 2).map(y => (
                  <span key={y.name} className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-medium bg-[#C2A46D]/[0.12] text-[#5C4A2E] dark:bg-[#C2A46D]/[0.15] dark:text-[#C2A46D]">
                    <Gem className="w-2.5 h-2.5" />{y.name}
                  </span>
                ))}
              </div>
            )}

            <p className="text-[9px] text-[#8B7355]/60 dark:text-[#A19F9D]/60">
              Last prediction: {(() => {
                try {
                  const d = new Date(latest.predictionDate);
                  if (isNaN(d.getTime())) return latest.predictionDate;
                  const dd = String(d.getDate()).padStart(2, '0');
                  const mm = String(d.getMonth() + 1).padStart(2, '0');
                  const yy = String(d.getFullYear()).slice(-2);
                  return `${dd}-${mm}-${yy}`;
                } catch {
                  return latest.predictionDate;
                }
              })()}
            </p>
          </div>
        ) : (
          <p className="text-[13px] text-[#3D2E1F]/70 dark:text-[#D4D0CC]/70 leading-relaxed mb-3">
            Discover your daily energy, career insights, and personalized guidance based on your Vedic birth chart.
          </p>
        )}

        {/* CTA */}
        {/* Primary CTA: always opens new prediction form */}
        <button
          onClick={navigateToNew}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-4
                     bg-gradient-to-r from-[#4B2C5E] to-[#2F3E8F] hover:from-[#5C3670] hover:to-[#3A4DA0]
                     text-white text-[13px] font-semibold shadow-sm hover:shadow-md
                     transition-all duration-200 ease-out active:scale-[0.98]"
        >
          <MoonStar className="w-4 h-4" strokeWidth={2} />
          Get My Prediction
          <ChevronRight className="w-3.5 h-3.5 opacity-60" />
        </button>

        {/* Secondary: view saved predictions (only if they have some) */}
        {latest && (
          <button
            onClick={navigateToList}
            className="w-full flex items-center justify-center gap-1.5 mt-2 py-2 text-[11px]
                       font-medium text-[#4B2C5E] dark:text-[#D4B8E8]
                       hover:underline transition-colors"
          >
            <Star className="w-3 h-3" />
            View saved predictions
          </button>
        )}
      </div>
    </div>
  )
}
