/**
 * AllPeoplePage — C10 hub-template wrapper around `AllPeoplePanel`.
 *
 * Bookmarkable `/people` route adopting the unified `HubPageTemplate` chrome.
 * The existing panel does its own filter/sort/pagination, so this wrapper
 * keeps the chrome thin (back link · hero · subtitle) and lets the panel
 * own its dense table.
 */
import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { getUserTrees } from '@/services/neo4jDataService'
import { HubPageTemplate } from '@/components/hubs/HubPageTemplate'
import AllPeoplePanel from '@/components/panels/AllPeoplePanel'
import { AppShell } from '@/components/layout/AppShell'

const ACTIVE_TREE_KEY = 'familytree-active-tree'
function getStoredTreeId(): string | null {
  try { return localStorage.getItem(ACTIVE_TREE_KEY) } catch { return null }
}

export function AllPeoplePage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const [treeId, setTreeId] = useState<string>('')
  const [treeName, setTreeName] = useState<string>('Family')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    ;(async () => {
      try {
        const trees = await getUserTrees(user.id)
        if (cancelled) return
        if (trees.length === 0) {
          setError('You have no trees yet. Add a person to start.')
          return
        }
        const stored = getStoredTreeId()
        const tree = trees.find(t => t.treeId === stored) || trees[0]
        setTreeId(tree.treeId)
        setTreeName(tree.treeName || 'Family')
      } catch {
        if (!cancelled) setError('Could not load your tree right now.')
      }
    })()
    return () => { cancelled = true }
  }, [user?.id])

  return (
    <AppShell activeView="home" showAllPeople>
      <HubPageTemplate
        title="All people"
        subtitle={`Everyone in your ${treeName.replace(/ family$/i, '').replace(/ tree$/i, '')} tree.`}
        icon={<Users className="w-6 h-6 text-[#2F3E8F]" strokeWidth={2.25} />}
        backTo="/dashboard"
      >
      {error ? (
        <div className="rounded-2xl bg-white dark:bg-[#1E1E1E] ring-1 ring-stone-100 dark:ring-[#333] px-6 py-10 text-center">
          <p className="text-[14px] text-[#8B7355] dark:text-[#A19F9D]">{error}</p>
        </div>
      ) : treeId ? (
        <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#1E1E1E] ring-1 ring-stone-100 dark:ring-[#333]">
          <AllPeoplePanel
            treeId={treeId}
            treeName={treeName}
            onClose={() => navigate('/dashboard')}
            onPersonClick={(personId: string) => navigate(`/person/${personId}`)}
          />
        </div>
      ) : (
        <div className="flex items-center justify-center py-20">
          <span className="text-[#8B7355]">Loading…</span>
        </div>
      )}
      </HubPageTemplate>
    </AppShell>
  )
}
