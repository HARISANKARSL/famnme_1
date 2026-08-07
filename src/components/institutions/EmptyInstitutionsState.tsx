/**
 * EmptyInstitutionsState — shown on the Institutions Home page when the user
 * has not linked any institution yet. Replaces the old dashed "Add your first"
 * card with a more inviting onboarding tile that explains the value.
 */

import { Landmark, Search, Heart, Users } from 'lucide-react'
import { getSacredPlaceNoun } from './tagConfig'

interface EmptyInstitutionsStateProps {
  onStart: () => void
  faithLabel?: string | null
}

export function EmptyInstitutionsState({ onStart, faithLabel }: EmptyInstitutionsStateProps) {
  const singular = getSacredPlaceNoun(faithLabel, 'singular')
  const isMultiOrUnknown = !faithLabel
    || faithLabel === 'Unknown'
    || faithLabel.includes(',')

  // First-person copy for single-faith; inclusive list for multi/unknown.
  const copy = isMultiOrUnknown
    ? 'Add a temple, church, or mosque where you or your family have worshipped. Track memories, tag family members, and preserve the traditions that connect generations.'
    : `Add a ${singular} where you or your family have worshipped. Track memories, tag family members, and preserve the traditions that connect generations.`

  const ctaLabel = isMultiOrUnknown
    ? 'Find your first institution'
    : `Find your first ${singular}`

  return (
    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#4B2C5E] via-[#3A3580] to-[#2F3E8F] p-6 md:p-10 text-white shadow-lg">
      {/* Decorative motifs */}
      <div className="absolute top-0 right-0 w-56 h-56 bg-[#C2A46D]/[0.10] rounded-full -translate-y-24 translate-x-24" />
      <div className="absolute bottom-0 left-8 w-32 h-32 bg-white/[0.04] rounded-full translate-y-12" />

      <div className="relative flex flex-col items-start gap-5 max-w-2xl">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C2A46D] to-[#8B7355] flex items-center justify-center shadow-lg">
          <Landmark className="w-7 h-7 text-white" strokeWidth={1.8} />
        </div>

        <div>
          <h2 className="text-[22px] md:text-[26px] font-bold leading-tight mb-2">
            Start your sacred places
          </h2>
          <p className="text-[14px] text-white/75 leading-relaxed">{copy}</p>
        </div>

        {/* Benefit pills */}
        <div className="flex flex-wrap gap-2 mt-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.10] text-[12px] text-white/85">
            <Heart className="w-3.5 h-3.5" strokeWidth={2} /> Preserve memories
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.10] text-[12px] text-white/85">
            <Users className="w-3.5 h-3.5" strokeWidth={2} /> Tag family
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.10] text-[12px] text-white/85">
            <Search className="w-3.5 h-3.5" strokeWidth={2} /> Find nearby
          </span>
        </div>

        <button
          onClick={onStart}
          className="mt-2 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#C2A46D] hover:bg-[#B0925F] text-white text-[14px] font-semibold shadow-lg transition-colors min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <Search className="w-4 h-4" strokeWidth={2.2} />
          {ctaLabel}
        </button>
      </div>
    </div>
  )
}
