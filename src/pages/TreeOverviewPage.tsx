import { useMemo } from 'react'
import { X, Users, BookOpen, UserPlus } from 'lucide-react'
import type { Person, Union } from '@/types'
import type { Relationship } from '@/services/elkLayoutService'
import { useTreeOverviewData } from '@/components/tree-overview/useTreeOverviewData'
import { FamilyIdentityHeader } from '@/components/tree-overview/FamilyIdentityHeader'
import { FamilyInsightsSection } from '@/components/tree-overview/FamilyInsightsSection'
import { FamilyStoryScore } from '@/components/tree-overview/FamilyStoryScore'
import { StoryFeedSection } from '@/components/tree-overview/StoryFeedSection'
import { GapsOpportunitiesSection } from '@/components/tree-overview/GapsOpportunitiesSection'
import { AncestorHighlightSection } from '@/components/tree-overview/AncestorHighlightSection'
import { TimelineSnapshotSection } from '@/components/tree-overview/TimelineSnapshotSection'
import { CulturalRootsSection } from '@/components/tree-overview/CulturalRootsSection'
import { SmartPromptsSection } from '@/components/tree-overview/SmartPromptsSection'
import { useTheme } from '@/contexts/ThemeContext'

interface TreeOverviewPageProps {
  treeId: string
  treeName: string
  description?: string | null
  persons: Person[]
  unions: Union[]
  relationships?: Relationship[]
  onClose: () => void
  onEditTreeName?: () => void
  onPersonClick?: (personId: string) => void
  onOpenAllPeople?: () => void
  onOpenMemories?: () => void
  onInviteCollaborator?: () => void
  onOpenTemples?: () => void
  onViewTimeline?: () => void
  onViewSuggestions?: () => void
  onDescriptionUpdated?: (newDescription: string) => void
}

export default function TreeOverviewPage({
  treeId,
  treeName,
  description,
  persons,
  unions,
  relationships = [],
  onClose,
  onEditTreeName,
  onPersonClick,
  onOpenAllPeople,
  onOpenMemories,
  onInviteCollaborator,
  onOpenTemples,
  onViewTimeline,
  onViewSuggestions,
  onDescriptionUpdated,
}: TreeOverviewPageProps) {
  const { statistics, suggestions, narrative, activity } = useTreeOverviewData(treeId)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  console.log(narrative, "narrative")

  const cleanPersons = useMemo(() => {
    return persons.filter(p => {
      const isProxy = (p as any).isProxy || (p.personId && p.personId.includes('_proxy_'));
      return !isProxy;
    });
  }, [persons])

  return (
    <div
      className="shell-overlay z-40 overflow-y-auto"
      style={{
        background: isDark
          ? 'linear-gradient(160deg, #121214 0%, #1c1c21 50%, #0d0d10 100%)'
          : 'linear-gradient(160deg, #E8EDFF 0%, #F5E6D3 50%, #EDD9C4 100%)',
      }}
    >
      {/* ── Sticky Header ── */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-4 md:px-6 py-3 backdrop-blur-md"
        style={{
          background: isDark ? 'rgba(26, 26, 28, 0.85)' : 'rgba(253, 246, 237, 0.85)',
          borderBottom: isDark ? '1px solid #2a2a30' : '1px solid #E2E8F0',
        }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold truncate" style={{ color: isDark ? '#F3F2F1' : '#3D2E1F' }}>
              Your Family Story
            </h1>
            {onEditTreeName && (
              <button
                onClick={onEditTreeName}
                className="p-1 rounded-lg transition-colors text-[#B8A090] hover:text-[#2F3E8F]"
                aria-label="Edit tree name"
              />
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-xl transition-colors"
          style={{ color: isDark ? '#B8A090' : '#8B7355' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? '#2a2a30' : '#F4F6FA' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>

      {/* ── Content ── */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-5 pb-20 md:pb-6 space-y-5">

        {/* ═══ HERO: Family Identity Header ═══ */}
        <FamilyIdentityHeader
          treeId={treeId}
          treeName={treeName}
          description={description}
          persons={cleanPersons as Parameters<typeof FamilyIdentityHeader>[0]['persons']}
          statistics={statistics}
          completenessPercent={suggestions?.completenessPercent ?? null}
          onPersonClick={onPersonClick}
          onDescriptionUpdated={onDescriptionUpdated}
        />

        {/* ═══ TWO-COLUMN LAYOUT (desktop) ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Family Insights */}
          <FamilyInsightsSection
            statistics={statistics}
            persons={cleanPersons}
            unions={unions}
            relationships={relationships}
          />

          {/* Story Feed */}
          <StoryFeedSection
            narrative={narrative}
            activity={activity}
            persons={cleanPersons}
            onPersonClick={onPersonClick}
          />

        </div>

        {/* Smart Prompts */}
        <SmartPromptsSection
          suggestions={suggestions}
          totalMembers={cleanPersons.filter(p => p.firstName && p.firstName.trim() !== '').length}
          onPersonClick={onPersonClick}
          onOpenMemories={onOpenMemories}
          onOpenAllPeople={onOpenAllPeople}
        />

        {/* ═══ BOTTOM ROW (3 columns on desktop) ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <TimelineSnapshotSection
            persons={cleanPersons}
            onViewFullTimeline={onViewTimeline}
          />

          {/* Quick Actions */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: isDark
                ? 'linear-gradient(180deg, #1A1A1E 0%, #121214 100%)'
                : 'linear-gradient(180deg, #FFFFFF 0%, #FDFBF8 100%)',
              boxShadow: isDark
                ? '0 4px 20px rgba(0, 0, 0, 0.4)'
                : '0 4px 20px rgba(139, 111, 78, 0.08)',
              border: isDark ? '1px solid #2a2a30' : '1px solid #EDE4DA',
            }}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: isDark ? '#C2A46D' : '#A0764E' }}>
              Quick Actions
            </h3>
            <div className="space-y-2">
              {onOpenAllPeople && (
                <button
                  onClick={onOpenAllPeople}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left hover:bg-[#F8F2EC] dark:hover:bg-[#232328]"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: isDark ? 'rgba(123, 143, 212, 0.15)' : 'rgba(194,120,74,0.1)' }}>
                    <Users size={14} style={{ color: isDark ? '#7B8FD4' : '#2F3E8F' }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: isDark ? '#F3F2F1' : '#3D2E1F' }}>View All People</p>
                    <p className="text-[11px]" style={{ color: isDark ? '#999999' : '#B8A090' }}>{cleanPersons.filter(p => p.firstName && p.firstName.trim() !== '').length} members</p>
                  </div>
                </button>
              )}
              {onOpenMemories && (
                <button
                  onClick={onOpenMemories}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left hover:bg-[#F8F2EC] dark:hover:bg-[#232328]"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: isDark ? 'rgba(194,164,109,0.15)' : 'rgba(160,118,78,0.1)' }}>
                    <BookOpen size={14} style={{ color: isDark ? '#C2A46D' : '#A0764E' }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: isDark ? '#F3F2F1' : '#3D2E1F' }}>Add Memories</p>
                    <p className="text-[11px]" style={{ color: isDark ? '#999999' : '#B8A090' }}>Photos, stories & documents</p>
                  </div>
                </button>
              )}
            </div>
          </div>

          <CulturalRootsSection
            persons={cleanPersons}
            unions={unions}
            onOpenTemples={onOpenTemples}
          />
        </div>
      </div>
    </div>
  )
}
