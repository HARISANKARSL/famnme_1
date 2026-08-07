import { Gem, Users, BookOpen, MapPin, Briefcase, GitMerge } from 'lucide-react'
import type { AncestorCardData } from '@/services/feedEngineService'
import { resolveBackendUrl } from '@/config/api'

interface Props {
  card: AncestorCardData
  onOpenProfile: (personId: string) => void
  onAddMemory?: (personId: string) => void
  onViewBranch?: () => void
}

export function AncestorCard({ card, onOpenProfile, onAddMemory, onViewBranch }: Props) {
  const { person, generationLabel, lifespan, descendantCount } = card
  const photoUrl = person.profilePhotoUrl ? resolveBackendUrl(person.profilePhotoUrl) : null
  const name = `${person.firstName} ${person.lastName || ''}`.trim()
  const bioSnippet = person.biography
    ? person.biography.length > 100 ? person.biography.slice(0, 100) + '…' : person.biography
    : null

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100">
      {/* Label */}
      <div className="flex items-center gap-1.5 mb-3">
        <Gem className="w-3.5 h-3.5 text-[#2F3E8F]" />
        <span className="text-[11px] font-semibold text-[#2F3E8F] uppercase tracking-wider">Ancestor of the Day</span>
      </div>

      <button
        onClick={() => onOpenProfile(person.personId)}
        className="flex items-start gap-4 w-full text-left group"
      >
        {/* Avatar */}
        {photoUrl ? (
          <img src={photoUrl} alt={name} className="w-16 h-16 rounded-2xl object-cover shrink-0 shadow-sm group-hover:ring-2 ring-[#2F3E8F]/40 transition-all" />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-sky-100 flex items-center justify-center shrink-0 text-2xl font-bold text-[#2F3E8F]">
            {person.firstName?.[0]}
          </div>
        )}

        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold text-stone-800 leading-tight group-hover:text-[#2F3E8F] transition-colors">{name}</p>
          <p className="text-sm font-medium text-[#2F3E8F] mt-0.5">{generationLabel}</p>
          {card.contextNote && (
            <p className="text-xs italic text-[#2F3E8F]/70 mt-0.5">{card.contextNote}</p>
          )}
          {lifespan && <p className="text-xs text-stone-400 mt-0.5">{lifespan}</p>}

          <div className="flex flex-wrap gap-3 mt-2">
            {person.birthPlace && (
              <span className="flex items-center gap-1 text-xs text-stone-500">
                <MapPin className="w-3 h-3" />{person.birthPlace}
              </span>
            )}
            {person.occupation && (
              <span className="flex items-center gap-1 text-xs text-stone-500">
                <Briefcase className="w-3 h-3" />{person.occupation}
              </span>
            )}
          </div>

          {bioSnippet && (
            <p className="text-xs text-stone-400 mt-2 leading-relaxed italic">"{bioSnippet}"</p>
          )}
        </div>
      </button>

      {/* Footer */}
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-stone-100">
        {descendantCount > 0 && (
          <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-[#E8EDFF] text-[#2F3E8F] font-medium">
            <Users className="w-3 h-3" /> {descendantCount} descendant{descendantCount !== 1 ? 's' : ''}
          </span>
        )}
        {onViewBranch && (
          <button
            onClick={(e) => { e.stopPropagation(); onViewBranch() }}
            className="flex items-center gap-1 text-xs text-[#2F3E8F] hover:underline font-medium"
          >
            <GitMerge className="w-3 h-3" /> View branch
          </button>
        )}
        {onAddMemory && (
          <button
            onClick={(e) => { e.stopPropagation(); onAddMemory(person.personId) }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-[#2F3E8F] text-white font-medium hover:bg-[#3B4DA6] active:scale-95 transition-all ml-auto"
          >
            <BookOpen className="w-3 h-3" />
            Add memory
          </button>
        )}
      </div>
    </div>
  )
}
