/**
 * AppShell — shared sidebar + content shell for standalone hub pages.
 *
 * The Dashboard owns its own deeply-stateful sidebar instance. Standalone
 * hub routes (`/heritage`, `/insights`, `/migration`, `/people`) used to
 * render without the sidebar, which made them feel detached from the rest
 * of the app. This component wraps them in the same sidebar chrome with
 * navigation callbacks wired to the corresponding bookmarkable routes /
 * dashboard hash views, so the user keeps a consistent left-side nav.
 *
 * It deliberately avoids loading any tree data — it only needs the user's
 * primary tree name + photo for the sidebar header. Sub-pages render their
 * own content in the children slot.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { useAuthStore } from '@/store/authStore'
import { getUserTrees } from '@/services/neo4jDataService'
import { resolveBackendUrl } from '@/config/api'

interface AppShellProps {
  /** Which sidebar section is the active one for highlight purposes. */
  activeView?: 'home' | 'tree' | 'heritage'
  /** Sub-state flags forwarded to the Sidebar so its sub-items highlight correctly. */
  showMemories?: boolean
  showTemples?: boolean
  showFamily?: boolean
  showAllPeople?: boolean
  showOverview?: boolean
  children: ReactNode
  showHeritage?: boolean
}

const ACTIVE_TREE_KEY = 'familytree-active-tree'

function getStoredTreeId(): string | null {
  try { return localStorage.getItem(ACTIVE_TREE_KEY) } catch { return null }
}

export function AppShell({
  activeView = 'home',
  showMemories = false,
  showTemples = false,
  showFamily = false,
  showAllPeople = false,
  showHeritage = false,
  showOverview = false,
  children,
}: AppShellProps) {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const [treeName, setTreeName] = useState<string>('Family Tree')
  const [homePhotoUrl, setHomePhotoUrl] = useState<string | null>(null)
  const [isTreeLoaded, setIsTreeLoaded] = useState(false)

  // Use the user's avatar as the sidebar photo immediately — no network
  // fetch needed. Pages that load tree data (migration, heritage, dashboard)
  // would otherwise pay for a redundant fetchTreeWindow on every route
  // change just to pick a header photo.
  useEffect(() => {
    if (user?.avatarUrl) setHomePhotoUrl(resolveBackendUrl(user.avatarUrl))
  }, [user?.avatarUrl])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
      ; (async () => {
        try {
          const trees = await getUserTrees(user.id)
          if (cancelled || trees.length === 0) return
          const stored = getStoredTreeId()
          // const tree = trees.find(t => t.treeId === stored) || trees[0]
          const tree = trees[0]
          setTreeName(tree.treeName || 'Family Tree')
          setIsTreeLoaded(true)
        } catch { /* no trees yet — leave defaults */ }
      })()
    return () => { cancelled = true }
  }, [user?.id])

  return (
    <div className="flex h-screen overflow-hidden bg-[#F2EFE9] dark:bg-[#0a0a0a]">
      <Sidebar
        showHeritage={showHeritage}
        currentTreeName={treeName}
        homePersonPhotoUrl={homePhotoUrl}
        activeView={activeView}
        showMemories={showMemories}
        showTemples={showTemples}
        showFamily={showFamily}
        showAllPeople={showAllPeople}
        showOverview={showOverview}
        isTreeLoaded={isTreeLoaded}
        onGoHome={() => navigate('/dashboard')}
        onGoTree={() => navigate('/dashboard#tree')}
        onOpenAllPeople={() => navigate('/people')}
        onOpenOverview={() => navigate('/dashboard#treeoverview')}
        onOpenMemories={() => navigate('/dashboard#memories')}
        onOpenTemples={() => navigate('/dashboard#culture')}
        onOpenMigrationMap={() => navigate('/migration')}
        onOpenHeritage={() => navigate('/heritage')}
        onOpenFestivals={() => navigate('/heritage/festivals')}
        onOpenSacred={() => navigate('/heritage/sacred')}
        onOpenTimeline={() => navigate('/dashboard#timeline')}
        onOpenStatistics={() => navigate('/dashboard#statistics')}
        onOpenRelationshipPath={() => navigate('/dashboard#relationship-path')}
        onOpenSuggestions={() => navigate('/dashboard#suggestions')}
        onOpenDuplicateDetection={() => navigate('/dashboard#duplicate-detection')}
        onOpenInviteCollaborator={() => navigate('/dashboard')}
        onOpenSources={() => navigate('/dashboard#sources')}
        onOpenSettings={() => navigate('/settings?tab=account')}
        onOpenFeedback={() => navigate('/dashboard')}
        onOpenTreeManager={() => navigate('/dashboard#tree')}
        onOpenActivityFeed={() => navigate('/dashboard#activity')}
        onOpenBookmarks={() => navigate('/dashboard#bookmarks')}
        onOpenHelp={() => navigate('/help')}
        onOpenTodayOnTree={() => navigate('/today')}
      />

      <main id="main-content" className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
