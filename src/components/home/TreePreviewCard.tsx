/**
 * TreePreviewCard — Phase 2 / C1
 *
 * Big Tree Card: secondary dashboard hero. Shows a compact preview of the
 * user's tree (recently edited people as avatar bubbles) plus three chip
 * actions: Open tree · Add a person · Invite family.
 *
 * The mini-preview surfaces "what changed since you were last here" via the
 * `updatedAt` ordering — a cheap proxy for the spec's "last 6–8 people
 * viewed/edited" until a server-side recently-viewed list exists.
 */
import { useMemo } from 'react'
import { TreePine, Plus, UserPlus } from 'lucide-react'
import type { Person } from '@/types'
import { resolveBackendUrl } from '@/config/api'

interface TreePreviewCardProps {
  persons: Person[]
  generationDepth: number
  familyName: string
  onNavigateToTree: () => void
  onAddPerson?: () => void
  onInviteFamily?: () => void
  onOpenProfile?: (personId: string) => void
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function genderColor(gender?: string | null): string {
  if (gender === 'female') return 'bg-[#C97B6B] text-white'
  if (gender === 'male') return 'bg-[#5B6BA8] text-white'
  return 'bg-[#C2A46D] text-white'
}

export function TreePreviewCard({
  persons,
  generationDepth,
  familyName,
  onNavigateToTree,
  onAddPerson,
  onInviteFamily,
  onOpenProfile,
}: TreePreviewCardProps) {
  const memberCount = useMemo(() => persons.filter(p => !p.isDeleted && !(p as any).isProxy && !(p.personId && p.personId.includes('_proxy_'))).length, [persons])

  // Recently edited / focal people — home person first, then by updatedAt desc.
  const recent = useMemo(() => {
    const live = persons.filter(p => !p.isDeleted && !(p as any).isProxy && !(p.personId && p.personId.includes('_proxy_')))
    const sorted = [...live].sort((a, b) => {
      if (a.isHomePerson && !b.isHomePerson) return -1
      if (!a.isHomePerson && b.isHomePerson) return 1
      const aT = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
      const bT = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
      return bT - aT
    })
    return sorted.slice(0, 8)
  }, [persons])
  console.log("recent", recent)
  const cardTitle = useMemo(() => {
    const name = familyName.trim()
    if (/tree$/i.test(name)) {
      return name
    }
    return `${name} family tree`
  }, [familyName])

  return (
    <div className="rounded-2xl bg-white dark:bg-[#1E1E1E] shadow-sm ring-1 ring-stone-100 dark:ring-[#333] overflow-hidden">
      {/* Header strip */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#2F3E8F]/10 dark:bg-[#7B8FD4]/15 flex items-center justify-center shrink-0">
            <TreePine className="w-4 h-4 text-[#2F3E8F] dark:text-[#7B8FD4]" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold text-[#3D2E1F] dark:text-[#F5F1E8] truncate capitalize">
              {cardTitle}
            </h3>
            <p className="text-[11px] text-[#8B7355] dark:text-[#A19F9D] mt-0.5">
              {memberCount} {memberCount === 1 ? 'member' : 'members'} · {generationDepth} {generationDepth === 1 ? 'generation' : 'generations'}
            </p>
          </div>
        </div>
      </div>

      {/* Mini-preview avatars (recently edited / focal) */}
      <button
        onClick={onNavigateToTree}
        className="w-full px-4 py-3 bg-gradient-to-br from-[#F8F6F1] to-[#F2EFE9] dark:from-[#262626] dark:to-[#1E1E1E] hover:from-[#F2EFE9] hover:to-[#EAE5D7] dark:hover:from-[#2a2a2a] dark:hover:to-[#262626] transition-colors text-left group"
        aria-label="Open tree"
      >
        {recent.length === 0 ? (
          <p className="text-[12px] text-[#8B7355] py-2">No members yet — add your first person to start.</p>
        ) : (
          <div className="flex items-center gap-2 overflow-hidden">
            {recent.map((p, i) => {
              const photoUrl = p.photoThumbUrl ? resolveBackendUrl(p.photoThumbUrl) : null
              return (
                <button
                  key={p.personId}
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenProfile?.(p.personId)
                  }}
                  className="relative shrink-0 group/avatar"
                  style={{ marginLeft: i === 0 ? 0 : -8, zIndex: recent.length - i }}
                  aria-label={`Open ${p.firstName ?? 'person'}`}
                  title={[p.firstName, p.lastName].filter(Boolean).join(' ')}
                >
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-[#1E1E1E] group-hover/avatar:ring-[#C2A46D] transition-all"
                    />
                  ) : (
                    <div className={`w-10 h-10 rounded-full ring-2 ring-white dark:ring-[#1E1E1E] flex items-center justify-center text-[12px] font-semibold ${genderColor(p.gender)} group-hover/avatar:ring-[#C2A46D] transition-all`}>
                      {initials([p.firstName, p.lastName].filter(Boolean).join(' '))}
                    </div>
                  )}
                  {/* {p.isHomePerson && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#C2A46D] ring-2 ring-white dark:ring-[#1E1E1E]" aria-hidden />
                  )} */}
                </button>
              )
            })}
            {memberCount > recent.length && (
              <span
                className="ml-1 shrink-0 text-[11px] font-medium text-[#8B7355] dark:text-[#A19F9D]"
                style={{ marginLeft: 4 }}
              >
                +{memberCount - recent.length} more
              </span>
            )}
          </div>
        )}
        <p className="mt-2 text-[11px] text-[#8B7355] dark:text-[#A19F9D] group-hover:text-[#2F3E8F] dark:group-hover:text-[#7B8FD4] transition-colors">
          {recent.length > 0 ? 'Tap to open the full tree →' : 'Tap to start building →'}
        </p>
      </button>

      {/* Action chips */}
      <div className="px-4 py-3 flex flex-wrap gap-2 border-t border-stone-100 dark:border-[#2a2a2a]">
        <button
          onClick={onNavigateToTree}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#2F3E8F] hover:bg-[#283576] text-white text-[12px] font-medium transition-colors"
        >
          <TreePine className="w-3.5 h-3.5" strokeWidth={2.25} />
          Open tree
        </button>
        {/* {onAddPerson && (
          <button
            onClick={onAddPerson}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#F2EFE9] dark:bg-[#2a2a2a] hover:bg-[#EAE5D7] dark:hover:bg-[#333] text-[#3D2E1F] dark:text-[#F5F1E8] text-[12px] font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.25} />
            Add a person
          </button>
        )} */}

      </div>
    </div>
  )
}
