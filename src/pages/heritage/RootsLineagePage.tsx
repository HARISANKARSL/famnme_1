/**
 * RootsLineagePage — /heritage/roots
 *
 * Heritage sidebar entry point for lineage content. Resolves the user's active
 * tree + persons and renders the existing AncestralIdentityPage chrome so
 * bookmarks + new heritage navigation both land on the same surface.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { getUserTrees, fetchTreeWindow } from '@/services/neo4jDataService'
import { AppShell } from '@/components/layout/AppShell'
import { AncestralIdentityPage } from '@/pages/ancestral/AncestralIdentityPage'
import type { Person } from '@/types'

const ACTIVE_TREE_KEY = 'familytree-active-tree'
function getStoredTreeId(): string | null {
  try { return localStorage.getItem(ACTIVE_TREE_KEY) } catch { return null }
}

export function RootsLineagePage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const [treeId, setTreeId] = useState<string | undefined>(undefined)
  const [persons, setPersons] = useState<Person[] | undefined>(undefined)
  const [loading, setLoading] = useState(true)
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
          setLoading(false)
          return
        }
        const stored = getStoredTreeId()
        const tree = trees.find(t => t.treeId === stored) || trees[0]
        const data = await fetchTreeWindow(tree.treeId)
        if (cancelled) return
        setTreeId(tree.treeId)
        setPersons(data.persons as Person[])
      } catch {
        if (!cancelled) setError('Could not load your tree right now.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user?.id])

  return (
    <AppShell activeView="home">
      {error ? (
        <div className="max-w-3xl mx-auto w-full px-4 py-12 text-center">
          <p className="text-[14px] text-[#8B7355]">{error}</p>
        </div>
      ) : loading || !treeId || !persons ? (
        <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-5 md:py-8 space-y-4">
          <div className="h-40 rounded-2xl bg-gradient-to-br from-[#3D2E1F]/10 via-[#5C4A2E]/10 to-[#C2A46D]/10 animate-pulse" />
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-white/60 dark:bg-[#1F1C18]/60 border border-[#E2DBCE] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <AncestralIdentityPage
          onBack={() => navigate('/heritage')}
          treeId={treeId}
          persons={persons}
        />
      )}
    </AppShell>
  )
}
