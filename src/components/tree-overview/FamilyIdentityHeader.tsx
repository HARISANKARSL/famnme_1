import { useState, useMemo, useEffect } from 'react'
import { Edit2, MapPin, GitBranch, Users, Gem } from 'lucide-react'
import type { TreeStatistics } from '@/services/neo4jDataService'
import { resolveBackendUrl } from '@/config/api'
import { treeApiCalls } from '@/api/apicalls'
import { useTheme } from '@/contexts/ThemeContext'
import { Textarea } from '@/components/ui/textarea'
import { validateDescriptionField, VALIDATION_LIMITS } from '@/utils/validation'

interface Props {
  treeId: string
  treeName: string
  description: string | null | undefined
  persons: Array<{
    personId: string
    firstName: string
    lastName: string
    gender: string
    profilePhotoUrl?: string | null
    isHomePerson?: boolean
    birthDate?: string | null
    deathDate?: string | null
    isLiving?: boolean
    gotra?: string
    nativePlace?: string
  }>
  statistics: TreeStatistics | null
  completenessPercent: number | null
  onPersonClick?: (personId: string) => void
  onDescriptionUpdated?: (newDescription: string) => void
}

export function FamilyIdentityHeader({
  treeId,
  treeName,
  description: initialDescription,
  persons,
  statistics,
  completenessPercent,
  onPersonClick,
  onDescriptionUpdated,
}: Props) {
  const [description, setDescription] = useState(initialDescription ?? '')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const descVal = validateDescriptionField(description)

  useEffect(() => {
    setDescription(initialDescription ?? '')
  }, [initialDescription])

  const cleanPersons = useMemo(() => {
    return persons.filter(p => {
      const isProxy = (p as any).isProxy || (p.personId && p.personId.includes('_proxy_'));
      return !isProxy;
    });
  }, [persons])

  const homePerson = useMemo(() => cleanPersons.find(p => p.isHomePerson) ?? null, [cleanPersons])

  const familyInfo = useMemo(() => {
    // Origin: most common nativePlace
    const placeCounts = new Map<string, number>()
    const gotraCounts = new Map<string, number>()
    let earliestAncestor: { name: string; year: number; personId: string } | null = null

    for (const p of cleanPersons) {
      if (p.nativePlace) {
        placeCounts.set(p.nativePlace, (placeCounts.get(p.nativePlace) || 0) + 1)
      }
      if ((p as { gotra?: string }).gotra) {
        const g = (p as { gotra?: string }).gotra!
        gotraCounts.set(g, (gotraCounts.get(g) || 0) + 1)
      }
      if (p.birthDate && (p.deathDate || p.isLiving === false)) {
        const year = new Date(p.birthDate).getFullYear()
        if (year > 1700 && (!earliestAncestor || year < earliestAncestor.year)) {
          earliestAncestor = { name: `${p.firstName} ${p.lastName || ''}`.trim(), year, personId: p.personId }
        }
      }
    }

    // Also check living persons for earliest
    for (const p of cleanPersons) {
      if (p.birthDate) {
        const year = new Date(p.birthDate).getFullYear()
        if (year > 1700 && (!earliestAncestor || year < earliestAncestor.year)) {
          earliestAncestor = { name: `${p.firstName} ${p.lastName || ''}`.trim(), year, personId: p.personId }
        }
      }
    }

    const topPlace = [...placeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    const topGotra = [...gotraCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

    return { topPlace, topGotra, earliestAncestor }
  }, [cleanPersons])

  const validPersonsCount = useMemo(() => {
    return cleanPersons.filter(p => p.firstName && p.firstName.trim() !== '').length
  }, [cleanPersons])

  const generations = statistics?.generationCount ?? (validPersonsCount > 0 ? Math.max(1, Math.ceil(Math.log2(validPersonsCount + 1))) : 0)

  const handleSave = async () => {
    if (!descVal.isValid) return
    setIsSaving(true)
    try {
      await treeApiCalls.editTreeDescription(treeId, treeName, description)
      if (onDescriptionUpdated) {
        onDescriptionUpdated(description)
      }
    } catch (err) {
      console.error('Failed to save description:', err)
    } finally {
      setIsSaving(false)
      setIsEditing(false)
    }
  }

  // Score ring (small)
  const ringSize = 44
  const strokeWidth = 4
  const radius = (ringSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = completenessPercent ?? 0
  const ringColor = pct > 70 ? '#6B8E5A' : pct > 40 ? '#2F3E8F' : '#2F3E8F'

  const homePhotoUrl = homePerson?.profilePhotoUrl ? resolveBackendUrl(homePerson.profilePhotoUrl) : null

  // Derive family surname from tree name or most common last name
  const familyName = treeName

  return (
    <div
      className="rounded-2xl p-6 md:p-8 relative overflow-hidden"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, #1C1C22 0%, #151518 40%, #0E0E10 100%)'
          : 'linear-gradient(135deg, #E8EDFF 0%, #F0E2D0 40%, #E8D5BE 100%)',
        border: isDark ? '1px solid #2a2a30' : '1px solid #E0D2C2',
        boxShadow: isDark
          ? '0 8px 32px rgba(0, 0, 0, 0.4)'
          : '0 8px 32px rgba(139, 111, 78, 0.12)',
      }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-[0.06]" style={{ background: isDark ? '#7B8FD4' : '#2F3E8F' }} />
      <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full opacity-[0.04]" style={{ background: isDark ? '#C2A46D' : '#8B7355' }} />

      <div className="relative flex flex-col md:flex-row items-start gap-5">
        {/* Home person photo */}
        <button
          onClick={() => homePerson && onPersonClick?.(homePerson.personId)}
          className="shrink-0 group"
          disabled={!homePerson}
        >
          <div
            className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden"
            style={{
              border: isDark ? '3px solid #7B8FD4' : '3px solid #2F3E8F',
              boxShadow: isDark
                ? '0 4px 16px rgba(123, 143, 212, 0.2)'
                : '0 4px 16px rgba(47, 62, 143, 0.2)',
            }}
          >
            {homePhotoUrl ? (
              <img src={homePhotoUrl} alt={familyName} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold" style={{ background: isDark ? '#232328' : '#F4F6FA', color: isDark ? '#7B8FD4' : '#2F3E8F' }}>
                {treeName[0]}
              </div>
            )}
          </div>
        </button>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold" style={{ color: isDark ? '#F3F2F1' : '#3D2E1F' }}>
                {familyName}
              </h1>
              <p className="text-sm md:text-base mt-1" style={{ color: isDark ? '#B8A090' : '#6B5A4A' }}>
                Spanning {generations}+ generation{generations !== 1 ? 's' : ''}
                {familyInfo.topPlace ? ` across ${familyInfo.topPlace} & beyond` : ''}
              </p>
            </div>

            {/* Mini completeness ring */}
            {completenessPercent != null && (
              <div className="shrink-0 flex flex-col items-center">
                <svg width={ringSize} height={ringSize} className="-rotate-90">
                  <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke={isDark ? '#2a2a30' : '#E0D2C2'} strokeWidth={strokeWidth} />
                  <circle
                    cx={ringSize / 2} cy={ringSize / 2} r={radius}
                    fill="none" stroke={ringColor} strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - pct / 100)}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                  />
                </svg>
                <span className="text-[10px] font-semibold mt-0.5" style={{ color: ringColor }}>{pct}%</span>
              </div>
            )}
          </div>

          {/* Meta chips */}
          <div className="flex flex-wrap gap-2 mt-3">
            {familyInfo.topPlace && (
              <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full" style={{ background: isDark ? 'rgba(194,120,74,0.2)' : 'rgba(194,120,74,0.1)', color: isDark ? '#C2A46D' : '#A0764E' }}>
                <MapPin size={12} /> {familyInfo.topPlace}
              </span>
            )}
            {familyInfo.topGotra && (
              <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full" style={{ background: isDark ? 'rgba(123,140,94,0.2)' : 'rgba(123,140,94,0.1)', color: isDark ? '#82A370' : '#6B8E5A' }}>
                <Gem size={12} /> Gotra: {familyInfo.topGotra}
              </span>
            )}
            {generations > 0 && (
              <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full" style={{ background: isDark ? 'rgba(139,115,85,0.2)' : 'rgba(139,115,85,0.1)', color: isDark ? '#A08E75' : '#8B7355' }}>
                <GitBranch size={12} /> {generations} generations
              </span>
            )}
            {validPersonsCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full" style={{ background: isDark ? 'rgba(139,115,85,0.2)' : 'rgba(139,115,85,0.1)', color: isDark ? '#A08E75' : '#8B7355' }}>
                <Users size={12} /> {validPersonsCount} members
              </span>
            )}
          </div>

          {/* Oldest ancestor callout */}
          {familyInfo.earliestAncestor && (
            <button
              onClick={() => onPersonClick?.(familyInfo.earliestAncestor!.personId)}
              className="mt-3 text-xs transition-colors hover:text-[#7B8FD4]"
              style={{ color: isDark ? '#B8A090' : '#8B7355' }}
            >
              Earliest recorded ancestor: <strong style={{ color: isDark ? '#F3F2F1' : '#3D2E1F' }}>{familyInfo.earliestAncestor.name}</strong> (b. {familyInfo.earliestAncestor.year})
            </button>
          )}

          {/* Inline editable description */}
          <div className="mt-3">
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-sm"
                  rows={2}
                  placeholder="Describe your family's story..."
                  autoFocus
                  error={description.length > 0 ? descVal.error : undefined}
                  showCharCount
                  charLimit={VALIDATION_LIMITS.description}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setDescription(initialDescription ?? ''); setIsEditing(false) }}
                    className="px-3 py-1.5 text-xs font-medium rounded-full"
                    style={{ color: '#8B7355' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !descVal.isValid}
                    className="px-3 py-1.5 text-xs font-semibold text-white rounded-full disabled:opacity-50"
                    style={{ background: 'linear-gradient(180deg, #2F3E8F, #25327A)' }}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="text-left group w-full"
              >
                <p className="text-sm leading-relaxed" style={{ color: isDark ? '#B8A090' : '#6B5A4A' }}>
                  {(() => {
                    const isLong = description.length > 250
                    const text = (isLong && isCollapsed) ? `${description.slice(0, 250)}...` : description
                    return (
                      <>
                        {text || (
                          <span className="italic" style={{ color: isDark ? '#666666' : '#C4B5A5' }}>
                            Add a description for your family's story...
                          </span>
                        )}
                        {isLong && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation()
                              setIsCollapsed(!isCollapsed)
                            }}
                            className="ml-1.5 font-semibold hover:underline inline-block cursor-pointer"
                            style={{ color: isDark ? '#7B8FD4' : '#2F3E8F' }}
                          >
                            {isCollapsed ? 'Show more' : 'Show less'}
                          </span>
                        )}
                      </>
                    )
                  })()}
                  <Edit2
                    size={11}
                    className="inline ml-1.5 opacity-0 group-hover:opacity-60 transition-opacity"
                    style={{ color: isDark ? '#7B8FD4' : '#2F3E8F' }}
                  />
                </p>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
