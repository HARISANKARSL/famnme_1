/**
 * InsightsPage — Phase 2 / C1
 *
 * Hub for the dashboard widgets that were trimmed from the right rail
 * (astrology, migration, festivals, sacred places, roots map, memory
 * insights, relationship challenges). Loads the user's most recent tree
 * via getUserTrees + fetchTreeWindow.
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Gem } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { useAuthStore } from '@/store/authStore'
import { useContributorStore } from '@/store/contributorStore'
import { getUserTrees, fetchTreeWindow } from '@/services/neo4jDataService'
import type { Person, TreeMetadata } from '@/types'
import type { Relationship } from '@/services/elkLayoutService'
import {
  AstrologyWidget,
  MigrationInsightWidget,
  FestivalsWidget,
  SacredPlacesWidget,
  RootsMapMini,
  MemoryInsightsWidget,
  RelationshipChallengeCard,
} from '@/components/dashboard/genz'

const ACTIVE_TREE_KEY = 'familytree-active-tree'

function getStoredTreeId(): string | null {
  try { return localStorage.getItem(ACTIVE_TREE_KEY) } catch { return null }
}

export function InsightsPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const myRole = useContributorStore(s => s.myRole)
  const isNonOwner = myRole !== null && myRole !== 'owner'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [persons, setPersons] = useState<Person[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [treeName, setTreeName] = useState<string>('Family')
  const [treeId, setTreeId] = useState<string>('')

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true); setError(null)
        const trees: TreeMetadata[] = await getUserTrees(user.id)
        if (cancelled) return
        if (trees.length === 0) {
          setError('You have no trees yet — add a person to start.')
          setLoading(false)
          return
        }
        const stored = getStoredTreeId()
        const tree = trees.find(t => t.treeId === stored) || trees[0]
        setTreeName(tree.treeName)
        setTreeId(tree.treeId)
        const data = await fetchTreeWindow(tree.treeId)
        if (cancelled) return
        setPersons(data.persons || [])
        setRelationships(data.relationships || [])
      } catch {
        if (!cancelled) setError('Could not load your tree right now. Please try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user?.id])

  const familyName = (() => {
    const home = persons.find(p => p.isHomePerson)
    if (home?.lastName) return home.lastName
    const match = treeName.match(/^(\w+)\s+(?:family|tree)/i)
    if (match) return match[1]
    return treeName
  })()

  return (
    <AppShell activeView="home">
      <div className="min-h-full bg-[#F6F2EA] dark:bg-[#0a0a0a] text-[#3D2E1F] dark:text-[#F3F2F1]">
      <main id="main-content" className="max-w-5xl mx-auto px-4 md:px-8 pt-6 pb-16">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-[13px] text-[#8B7355] dark:text-[#888] hover:text-[#2F3E8F] dark:hover:text-[#8CA0FF] mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Gem className="w-5 h-5 text-[#C2A46D]" strokeWidth={2.25} />
              <h1 className="font-display text-[28px] md:text-[32px] font-semibold leading-tight">
                Insights & heritage
              </h1>
            </div>
            <p className="text-[14px] text-[#8B7355] dark:text-[#888]">
              The deeper layer of your {familyName} family story — astrology, migration patterns, festivals, sacred places.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white dark:bg-[#1E1E1E] ring-1 ring-stone-200 dark:ring-[#333] text-[13px] font-medium text-[#3D2E1F] dark:text-[#F5F1E8] hover:bg-[#F2EFE9] dark:hover:bg-[#262626] transition-colors shrink-0"
          >
            Back to dashboard
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-[#2F3E8F] animate-spin" />
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-white dark:bg-[#1E1E1E] ring-1 ring-stone-100 dark:ring-[#333] px-6 py-10 text-center">
            <p className="text-[14px] text-[#8B7355] dark:text-[#A19F9D]">{error}</p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 mt-4 h-9 px-3 rounded-lg bg-[#2F3E8F] hover:bg-[#283576] text-white text-[13px] font-medium"
            >
              Go to dashboard
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* AI Insights — owner-only */}
            {!isNonOwner && (
              <MemoryInsightsWidget treeId={treeId} />
            )}

            {/* Astrology / Cosmic */}
            <AstrologyWidget />

            {/* Migration */}
            <MigrationInsightWidget
              persons={persons}
              relationships={relationships}
            />

            {/* Festivals */}
            <FestivalsWidget persons={persons} />

            {/* Sacred Places — owner-only (tree-wide heritage) */}
            {!isNonOwner && (
              <SacredPlacesWidget
                kulaDevataName={null}
                templeMemoryCount={0}
              />
            )}

            {/* Relationship Challenge */}
            <RelationshipChallengeCard
              persons={persons}
              treeId={treeId}
              familyName={familyName}
            />

            {/* Roots Map (full width) */}
            <div className="md:col-span-2">
              <RootsMapMini
                persons={persons}
                familyName={familyName}
              />
            </div>
          </div>
        )}
      </main>
      </div>
    </AppShell>
  )
}
