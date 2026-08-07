/**
 * MigrationMapPage — /migration
 *
 * Route-level wrapper that renders the MigrationMapPanel in full-page
 * mode directly inside AppShell. The panel brings its own chrome
 * ("Geographic Journey" title + back button), so there's no extra
 * HubPageTemplate banner above it.
 *
 * Performance: uses the locally cached active tree id so the map panel can
 * mount immediately (no network round-trip before render). Leaflet is
 * preloaded in parallel so its chunk arrives before the panel needs it.
 * The tree-list fetch happens once (via AppShell); this page no longer
 * duplicates it.
 */
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { getUserTrees } from '@/services/neo4jDataService'
import { MigrationMapPanel } from '@/components/panels/MigrationMapPanel'
import { AppShell } from '@/components/layout/AppShell'

const ACTIVE_TREE_KEY = 'familytree-active-tree'
function getStoredTreeId(): string | null {
  try { return localStorage.getItem(ACTIVE_TREE_KEY) } catch { return null }
}

// Warm up the Leaflet chunk the moment the route renders so it's cached
// before MigrationMapPanel's own import('leaflet') resolves.
function preloadLeaflet() {
  void import('leaflet')
}

export function MigrationMapPage() {
  const user = useAuthStore(s => s.user)
  // Initialise from localStorage so we can render the panel on the first
  // frame without any network round-trip. If no stored id exists, fall back
  // to resolving one via getUserTrees.
  const [treeId, setTreeId] = useState<string>(() => getStoredTreeId() ?? '')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { preloadLeaflet() }, [])

  useEffect(() => {
    // Only fetch the tree list if we don't have a cached id to work with.
    if (treeId || !user?.id) return
    let cancelled = false
    ;(async () => {
      try {
        const trees = await getUserTrees(user.id)
        if (cancelled) return
        if (trees.length === 0) {
          setError('You have no trees yet. Add a person to start.')
          return
        }
        setTreeId(trees[0].treeId)
      } catch {
        if (!cancelled) setError('Could not load your tree right now.')
      }
    })()
    return () => { cancelled = true }
  }, [user?.id, treeId])

  return (
    <AppShell activeView="home">
      {error && !treeId ? (
        <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-10 text-center">
          <p className="text-[14px] text-[#8B7355] dark:text-[#A19F9D]">{error}</p>
        </div>
      ) : treeId ? (
        <div className="relative w-full h-full min-h-screen">
          <MigrationMapPanel
            treeId={treeId}
            isOpen
            onClose={() => window.history.back()}
            variant="fullpage"
          />
        </div>
      ) : (
        <div className="flex items-center justify-center py-20">
          <span className="text-[#8B7355]">Loading…</span>
        </div>
      )}
    </AppShell>
  )
}
