/**
 * CelebrateCultureHub — Landing page for the "Your Identity" section.
 *
 * Two hero feature blocks:
 * 1. Cosmic Predictions   (what guides you)  → predictions page
 * 2. Ancestral Identity   (who you are)      → ancestry/lineage insights
 *
 * Sacred Institutions was merged into Heritage → Sacred Places.
 */

import { useState, useEffect } from 'react'
import { MoonStar, TreePine, ArrowRight, ChevronRight, Fingerprint } from 'lucide-react'
import { useResponsive } from '@/hooks/useResponsive'
import { fetchPredictionCount } from '@/services/predictionApiService'

interface CelebrateCultureHubProps {
  onClose?: () => void
  onOpenPredictions: () => void
  onOpenAncestralIdentity: () => void
  treeId?: string
}

export function CelebrateCultureHub({
  onOpenPredictions,
  onOpenAncestralIdentity,
  treeId,
}: CelebrateCultureHubProps) {
  const { isMobile } = useResponsive()
  const [predictionCount, setPredictionCount] = useState(0)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    fetchPredictionCount().then(setPredictionCount).catch(() => {/* silent */})
  }, [])

  useEffect(() => {
    if (!treeId) return
    /* Faith label is read in the Heritage Sacred Places page now. */
  }, [treeId])

  useEffect(() => {
    const raf = requestAnimationFrame(() => setRevealed(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="absolute inset-0 z-40 bg-[#F2EFE9] dark:bg-[#000] flex flex-col">
      {/* Header */}
      <div className="shrink-0 h-14 flex items-center gap-3 px-4 md:px-6 border-b border-[#E2DBCE]/60 dark:border-[#2A2A2A] bg-white/80 dark:bg-[#1A1A1A]/80 backdrop-blur-sm">
        <Fingerprint className="w-5 h-5 text-[#C2A46D]" strokeWidth={1.8} />
        <h1 className="text-[16px] font-bold text-[#3D2E1F] dark:text-[#F3F2F1]">
          Your Identity
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-5 md:py-8 space-y-4">

          {/* Subheader */}
          <p
            className={`text-center text-[13px] md:text-[14px] text-[#6B5842] dark:text-[#A8A19A] pb-1 transition-all duration-300 ${
              revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            Understand Yourself Through Three Dimensions
          </p>

          {/* ═══ 1. Cosmic Predictions — "What guides you" ═══ */}
          <button
            onClick={onOpenPredictions}
            className={`group w-full text-left rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#4B2C5E]/40 ${
              revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
            }`}
            style={{ transitionDelay: '80ms' }}
          >
            <div className="relative bg-[#1a1a2e] ring-1 ring-[#2a2a4e] rounded-2xl overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-[#4B2C5E] via-[#C2A46D] to-[#2F3E8F]" />

              <div className="absolute top-6 right-8 w-1 h-1 rounded-full bg-white/20" />
              <div className="absolute top-10 right-16 w-1.5 h-1.5 rounded-full bg-[#C2A46D]/30 animate-pulse" />
              <div className="absolute top-14 right-10 w-1 h-1 rounded-full bg-white/15" />
              <div className="absolute bottom-8 right-24 w-1 h-1 rounded-full bg-[#C2A46D]/20" />

              <div className={`relative p-5 md:p-7 ${isMobile ? '' : 'flex items-start gap-6'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4B2C5E] to-[#2F3E8F] flex items-center justify-center shadow-lg">
                      <MoonStar className="w-6 h-6 text-[#C2A46D]" strokeWidth={1.8} />
                    </div>
                    <div>
                      <h2 className="text-[18px] md:text-[20px] font-bold text-white/90">
                        Cosmic Predictions
                      </h2>
                      <p className="text-[11px] text-white/50">
                        Astrology &middot; Birth Chart &middot; Insights
                      </p>
                    </div>
                  </div>

                  <p className="text-[13px] text-white/60 leading-relaxed max-w-lg">
                    Get personalized guidance based on your cosmic profile
                  </p>

                  <div className="flex items-center gap-3 mt-4">
                    {predictionCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#2F3E8F]/30 text-[#7B8FD4]">
                        {predictionCount} saved prediction{predictionCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#C2A46D]/10 text-[#C2A46D] group-hover:bg-[#C2A46D]/20 transition-colors">
                      Get My Prediction
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </button>

          {/* ═══ 2. Ancestral Identity — "Who you are" ═══ */}
          <button
            onClick={onOpenAncestralIdentity}
            className={`group w-full text-left rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#C2A46D]/40 ${
              revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
            }`}
            style={{ transitionDelay: '160ms' }}
          >
            <div className="relative bg-gradient-to-br from-[#3D2E1F] via-[#5C4A2E] to-[#C2A46D] p-5 md:p-7">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#2A5F4B]/[0.18] rounded-full -translate-y-16 translate-x-12 group-hover:translate-x-8 transition-transform duration-500" />
              <div className="absolute bottom-0 left-1/3 w-28 h-28 bg-[#C2A46D]/[0.12] rounded-full translate-y-14 group-hover:translate-y-10 transition-transform duration-500" />

              <div className="relative flex items-start gap-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C2A46D] to-[#8B7355] flex items-center justify-center shadow-lg">
                      <TreePine className="w-6 h-6 text-white" strokeWidth={1.8} />
                    </div>
                    <div>
                      <h2 className="text-[18px] md:text-[20px] font-bold text-white">
                        Ancestral Identity
                      </h2>
                      <p className="text-[11px] text-white/70">
                        Surname &middot; Lineage &middot; Cultural Roots
                      </p>
                    </div>
                  </div>

                  <p className="text-[13px] text-white/80 leading-relaxed max-w-lg">
                    Explore your family origins, heritage, and identity through your lineage
                  </p>
                </div>

                <ChevronRight className="w-5 h-5 text-white/50 group-hover:text-white/80 group-hover:translate-x-1 transition-all mt-2 shrink-0" />
              </div>
            </div>
          </button>

        </div>
      </div>
    </div>
  )
}
