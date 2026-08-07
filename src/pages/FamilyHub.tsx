/**
 * FamilyHub — Feature hub for the Family section.
 *
 * Design: Matches dashboard widget aesthetic with rich data previews,
 * dark navy geospatial card, gradient hero, staggered reveal animations,
 * and consistent typography/color tokens from the design system.
 *
 * Layout:
 *   - Hero: Family Trees (full-width, gradient, avatar preview)
 *   - Row: Migration Map (dark navy) + Relationship Pathfinder
 *   - Row: Smart Suggestions + Duplicate Detection
 */

import { useEffect, useState } from 'react'
import { ArrowLeft, GitBranch, Route, Lightbulb, Merge, ChevronRight, Users, Lock, MapPin, Gem, ArrowRight } from 'lucide-react'
import { useResponsive } from '@/hooks/useResponsive'
import type { Person } from '@/types'
import { resolveBackendUrl } from '@/config/api'

interface FamilyHubProps {
  onClose: () => void
  onOpenTrees: () => void
  onOpenMigration: () => void
  onOpenPathfinder: () => void
  onOpenSuggestions: () => void
  onOpenDuplicates: () => void
  treeId?: string
  isTreeLoaded: boolean
  treeName?: string
  persons?: Person[]
  memberCount?: number
  generationCount?: number
}

export function FamilyHub({
  onClose,
  onOpenTrees,
  onOpenMigration,
  onOpenPathfinder,
  onOpenSuggestions,
  onOpenDuplicates,
  isTreeLoaded,
  treeName,
  persons,
  memberCount,
  generationCount,
}: FamilyHubProps) {
  const { isMobile } = useResponsive()
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setRevealed(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // Extract preview data from persons
  const previewAvatars = (persons || [])
    .filter(p => p.profilePhotoUrl)
    .slice(0, 5)
  const totalMembers = memberCount || persons?.length || 0
  const placesCount = persons
    ? new Set(persons.filter(p => p.birthPlace).map(p => p.birthPlace!.toLowerCase().trim())).size
    : 0

  const disabled = !isTreeLoaded

  return (
    <div className="absolute inset-0 z-40 bg-[#F2EFE9] dark:bg-[#000] flex flex-col">
      {/* Header */}
      <div className="shrink-0 h-14 flex items-center gap-3 px-4 md:px-6 border-b border-[#E2DBCE]/60 dark:border-[#2A2A2A] bg-white/80 dark:bg-[#1A1A1A]/80 backdrop-blur-sm">
        <button
          onClick={onClose}
          className="p-1.5 -ml-1.5 rounded-lg hover:bg-[#2F3E8F]/[0.06] dark:hover:bg-white/[0.06] transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-[#3D2E1F] dark:text-[#D4D0CC]" />
        </button>
        <Users className="w-5 h-5 text-[#C2A46D]" strokeWidth={1.8} />
        <h1 className="text-[16px] font-bold text-[#3D2E1F] dark:text-[#F3F2F1]">
          Family
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-5 md:py-8 space-y-4">

          {/* ═══ HERO: Family Trees ═══ */}
          <button
            onClick={onOpenTrees}
            className={`group w-full text-left rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#C2A46D]/40 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
              }`}
            style={{ transitionDelay: '0ms' }}
          >
            <div className="relative bg-gradient-to-r from-[#2F3E8F] to-[#4B2C5E] p-5 md:p-7">
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/[0.04] rounded-full -translate-y-16 translate-x-16 group-hover:translate-x-12 transition-transform duration-500" />
              <div className="absolute bottom-0 left-1/3 w-28 h-28 bg-white/[0.03] rounded-full translate-y-14 group-hover:translate-y-10 transition-transform duration-500" />

              <div className="relative flex items-start gap-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.12] flex items-center justify-center">
                      <GitBranch className="w-5 h-5 text-white" strokeWidth={1.8} />
                    </div>
                    <div>
                      <h2 className="text-[18px] md:text-[20px] font-bold text-white">
                        Family Trees
                      </h2>
                      <p className="text-[11px] text-white/60">
                        Vertical &middot; Horizontal &middot; Fan
                      </p>

                    </div>
                  </div>

                  {isTreeLoaded && totalMembers > 0 && (
                    <div className="flex items-center gap-4 mt-4">
                      {/* Avatar row */}
                      {previewAvatars.length > 0 && (
                        <div className="flex -space-x-2">
                          {previewAvatars.map(p => (
                            <img
                              key={p.personId}
                              src={resolveBackendUrl(p.profilePhotoUrl!)}
                              alt=""
                              className="w-8 h-8 rounded-full border-2 border-[#2F3E8F] object-cover"
                            />
                          ))}
                          {totalMembers > previewAvatars.length && (
                            <div className="w-8 h-8 rounded-full border-2 border-[#2F3E8F] bg-white/[0.15] flex items-center justify-center text-[10px] font-bold text-white">
                              +{totalMembers - previewAvatars.length}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Stats chips */}
                      <div className="flex items-center gap-2 text-[11px] text-white/70">
                        <span className="px-2 py-0.5 rounded-full bg-white/[0.1]">
                          {totalMembers} members
                        </span>
                        {generationCount && generationCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-white/[0.1]">
                            {generationCount} generations
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {treeName && (
                    <p className="text-[12px] text-white/50 mt-3">
                      {treeName}
                    </p>
                  )}
                </div>

                <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white/70 group-hover:translate-x-1 transition-all mt-2 shrink-0" />
              </div>
            </div>
          </button>

          {/* ═══ ROW 2: Relationship Pathfinder (Migration Map hidden) ═══ */}
          <div className="grid grid-cols-1 gap-4">

            {/* Geographic Journey (Migration Map) hidden per user request */}
            {/* 
            <button
              onClick={disabled ? undefined : onOpenMigration}
              disabled={disabled}
              className={`group w-full text-left rounded-2xl overflow-hidden transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#C2A46D]/40 ${
                disabled ? 'opacity-40 cursor-not-allowed' : 'hover:shadow-lg active:scale-[0.99]'
              } ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
              style={{ transitionDelay: '60ms', opacity: disabled ? undefined : '' }}
            >
              <div className="relative bg-[#1a1a2e] ring-1 ring-[#2a2a4e] rounded-2xl p-5 min-h-[160px] flex flex-col">
                <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(194,164,109,0.4)" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#mapGrid)" />
                </svg>

                <div className="absolute top-8 right-8 w-2 h-2 rounded-full bg-[#C2A46D] opacity-40 animate-pulse" />
                <div className="absolute top-14 right-14 w-1.5 h-1.5 rounded-full bg-[#C2A46D] opacity-30" />
                <div className="absolute bottom-10 right-6 w-1.5 h-1.5 rounded-full bg-[#C2A46D] opacity-25" />

                <div className="relative flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-[#C2A46D]" strokeWidth={1.8} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#C2A46D]">Migration Map</span>
                  </div>

                  <h3 className="text-[15px] font-bold text-white/90 mb-1">
                    Geographic Journey
                  </h3>
                  <p className="text-[11px] text-white/50 leading-relaxed flex-1">
                    Trace your family&apos;s movement across places and generations
                  </p>

                  <div className="flex items-center justify-between mt-4">
                    {isTreeLoaded && placesCount > 0 && (
                      <span className="text-[11px] text-[#C2A46D]/80">
                        {placesCount} location{placesCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    {disabled && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-white/30">
                        <Lock className="w-3 h-3" /> Load tree
                      </span>
                    )}
                    <ArrowRight className="w-4 h-4 text-[#C2A46D]/50 group-hover:text-[#C2A46D] group-hover:translate-x-0.5 transition-all ml-auto" />
                  </div>
                </div>
              </div>
            </button>
            */}

            {/* Relationship Pathfinder — warm cream card */}
            <button
              onClick={disabled ? undefined : onOpenPathfinder}
              disabled={disabled}
              className={`group w-full text-left rounded-2xl overflow-hidden transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/30 ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:shadow-lg active:scale-[0.99]'
                } ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
              style={{ transitionDelay: '120ms', opacity: disabled ? undefined : '' }}
            >
              <div className="relative bg-white dark:bg-[#242424] shadow-sm ring-1 ring-stone-100 dark:ring-[#333] rounded-2xl p-5 min-h-[160px] flex flex-col">

                <div className="absolute top-6 right-6 flex items-center gap-1 opacity-[0.08]">
                  <div className="w-5 h-5 rounded-full border-2 border-[#2F3E8F]" />
                  <div className="w-8 h-0.5 bg-[#2F3E8F]" />
                  <div className="w-5 h-5 rounded-full border-2 border-[#2F3E8F]" />
                </div>

                <div className="relative flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <Route className="w-4 h-4 text-[#2F3E8F] dark:text-[#5A6BFF]" strokeWidth={1.8} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#2F3E8F] dark:text-[#5A6BFF]">Pathfinder</span>
                  </div>

                  <h3 className="text-[15px] font-bold text-stone-800 dark:text-[#F5F1E8] mb-1">
                    Relationship Finder
                  </h3>
                  <p className="text-[11px] text-[#8B7355] dark:text-[#999] leading-relaxed flex-1">
                    Discover how any two members are connected with kinship terms
                  </p>

                  <div className="flex items-center justify-between mt-4">
                    {disabled && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#8B7355]/50 dark:text-[#999]/50">
                        <Lock className="w-3 h-3" /> Load tree
                      </span>
                    )}
                    <ArrowRight className="w-4 h-4 text-[#8B7355]/40 dark:text-[#999]/40 group-hover:text-[#2F3E8F] group-hover:translate-x-0.5 transition-all ml-auto" />
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* ═══ ROW 3: Duplicate Detection (Smart Suggestions hidden) ═══ */}
          <div className="grid grid-cols-2 gap-4">

            {/* Smart Suggestions hidden per user request */}

            <button
              onClick={disabled ? undefined : onOpenSuggestions}
              disabled={disabled}
              className={`group w-full text-left rounded-2xl overflow-hidden transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#C2A46D]/30 ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:shadow-lg active:scale-[0.99]'
                } ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
              style={{ transitionDelay: '180ms', opacity: disabled ? undefined : '' }}
            >
              <div className="relative bg-white dark:bg-[#242424] shadow-sm ring-1 ring-stone-100 dark:ring-[#333] rounded-2xl p-5 min-h-[140px] flex flex-col">
                <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gradient-to-br from-[#C2A46D]/[0.08] to-[#2F3E8F]/[0.08] flex items-center justify-center">
                  <Gem className="w-3.5 h-3.5 text-[#C2A46D]" />
                </div>

                <div className="relative flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-[#C2A46D]" strokeWidth={1.8} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#C2A46D]">Suggestions</span>
                  </div>

                  <h3 className="text-[15px] font-bold text-stone-800 dark:text-[#F5F1E8] mb-1">
                    Smart Suggestions
                  </h3>
                  <p className="text-[11px] text-[#8B7355] dark:text-[#999] leading-relaxed flex-1">
                    AI-powered tips to improve your tree&apos;s completeness
                  </p>

                  <div className="flex items-center justify-between mt-3">
                    {disabled && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#8B7355]/50 dark:text-[#999]/50">
                        <Lock className="w-3 h-3" /> Load tree
                      </span>
                    )}
                    <ArrowRight className="w-4 h-4 text-[#8B7355]/40 dark:text-[#999]/40 group-hover:text-[#C2A46D] group-hover:translate-x-0.5 transition-all ml-auto" />
                  </div>
                </div>
              </div>
            </button>


            {/* Duplicate Detection */}
            <button
              onClick={disabled ? undefined : onOpenDuplicates}
              disabled={disabled}
              className={`group w-full text-left rounded-2xl overflow-hidden transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#4B2C5E]/30 ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:shadow-lg active:scale-[0.99]'
                } ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
              style={{ transitionDelay: '240ms', opacity: disabled ? undefined : '' }}
            >
              <div className="relative bg-white dark:bg-[#242424] shadow-sm ring-1 ring-stone-100 dark:ring-[#333] rounded-2xl p-5 min-h-[140px] flex flex-col">
                <div className="relative flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <Merge className="w-4 h-4 text-[#4B2C5E] dark:text-[#D4B8E8]" strokeWidth={1.8} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#4B2C5E] dark:text-[#D4B8E8]">Detection</span>
                  </div>

                  <h3 className="text-[15px] font-bold text-stone-800 dark:text-[#F5F1E8] mb-1">
                    Duplicate Detection
                  </h3>
                  <p className="text-[11px] text-[#8B7355] dark:text-[#999] leading-relaxed flex-1">
                    Find &amp; merge duplicate entries with multi-signal analysis
                  </p>

                  <div className="flex items-center justify-between mt-3">
                    {disabled && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#8B7355]/50 dark:text-[#999]/50">
                        <Lock className="w-3 h-3" /> Load tree
                      </span>
                    )}
                    <ArrowRight className="w-4 h-4 text-[#8B7355]/40 dark:text-[#999]/40 group-hover:text-[#4B2C5E] group-hover:translate-x-0.5 transition-all ml-auto" />
                  </div>
                </div>
              </div>
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
