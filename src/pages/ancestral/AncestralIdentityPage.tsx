/**
 * AncestralIdentityPage — "Who you are" dimension of Your Identity hub.
 *
 * Aggregates family tree data and displays surname meaning, lineage insights,
 * migration, cultural context, and family patterns.
 */

import { useMemo } from 'react'
import { ArrowLeft, TreePine, AlertCircle } from 'lucide-react'
import { useAncestralIdentity } from '@/hooks/useAncestralIdentity'
import { IdentityHeroCard } from '@/components/ancestral/IdentityHeroCard'
import { SurnameSection } from '@/components/ancestral/SurnameSection'
import { LineageSection } from '@/components/ancestral/LineageSection'
import { MigrationMapSection } from '@/components/ancestral/MigrationMapSection'
import { CulturalContextSection } from '@/components/ancestral/CulturalContextSection'
import { FamilyPatternsSection } from '@/components/ancestral/FamilyPatternsSection'
import { ConnectionsTeaserCard } from '@/components/ancestral/ConnectionsTeaserCard'
import type { Person } from '@/types'

interface AncestralIdentityPageProps {
  onBack: () => void
  treeId?: string
  persons?: Person[]
}

export function AncestralIdentityPage({ onBack, treeId, persons }: AncestralIdentityPageProps) {
  // Find the home person (primary user) to anchor the ancestral identity.
  const personId = useMemo(() => {
    if (!persons || persons.length === 0) return undefined
    const home = persons.find(p => p.isHomePerson)
    return (home || persons[0])?.personId
  }, [persons])

  const { data, loading, regenerating, error, regenerate } = useAncestralIdentity(treeId, personId)

  const isMissingContext = !treeId || !personId

  return (
    <div className="absolute inset-0 z-40 bg-[#F6F2EA] dark:bg-[#141210] flex flex-col">
      {/* Header */}
      <div className="shrink-0 h-14 flex items-center gap-3 px-4 md:px-6 border-b border-[#E2DBCE]/60 dark:border-[#2A2A2A] bg-white/80 dark:bg-[#1A1A1A]/80 backdrop-blur-sm">
        <button
          onClick={onBack}
          className="p-1.5 -ml-1.5 rounded-lg hover:bg-[#8B5E3C]/[0.08] transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-[#3D2E1F] dark:text-[#D4D0CC]" />
        </button>
        <TreePine className="w-5 h-5 text-[#8B5E3C]" strokeWidth={1.8} />
        <h1 className="text-[16px] font-bold text-[#3D2E1F] dark:text-[#F3F2F1]">
          Roots &amp; Lineage
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-5 md:py-8 space-y-4">

          {isMissingContext ? (
            <div className="rounded-2xl bg-white dark:bg-[#1F1C18] border border-[#E2DBCE] dark:border-[#3A342C] p-6 text-center">
              <AlertCircle className="w-6 h-6 text-[#C2A46D] mx-auto mb-2" />
              <p className="text-[14px] text-[#5C4A2E] dark:text-[#C9BDA8]">
                Open a family tree to explore your ancestral identity.
              </p>
            </div>
          ) : (
            <>
              <IdentityHeroCard
                narrative={data?.summary.narrative ?? ''}
                heritageTags={data?.summary.heritageTags ?? []}
                isSparse={data?.summary.isSparse ?? false}
                loading={loading}
                regenerating={regenerating}
                onRegenerate={() => regenerate('narrative')}
              />

              {error && (
                <div className="rounded-xl border border-[#C2A46D]/40 bg-[#C2A46D]/[0.10] px-4 py-3 text-[13px] text-[#8B6914]">
                  {error}
                </div>
              )}

              {data && (
                <>
                  <SurnameSection surname={data.surname} />
                  <LineageSection lineage={data.lineage} />
                  <MigrationMapSection migration={data.migration} />
                  <CulturalContextSection culture={data.culture} />
                  <FamilyPatternsSection patterns={data.patterns} />
                  <ConnectionsTeaserCard />
                </>
              )}

              {loading && !data && (
                <div className="space-y-3">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="h-24 rounded-2xl bg-white/60 dark:bg-[#1F1C18]/60 border border-[#E2DBCE] animate-pulse"
                    />
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  )
}
