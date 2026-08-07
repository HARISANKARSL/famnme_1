/**
 * TreesPage — Phase 2 / C13
 *
 * Dedicated route at `/trees` for tree management. Grid of trees with search,
 * sort, and per-tree actions (open, set default, export via Settings).
 *
 * Backend coverage: `getUserTrees` is authoritative. Collaborator avatars and
 * 30-day activity sparkline require endpoints that don't exist yet — those
 * slots render placeholders so the layout is complete and ready to wire later.
 */
import { useEffect, useMemo, useState, lazy, Suspense } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Search, Plus, TreePine, Check, Loader2, SortAsc, SortDesc,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/use-toast'
import { getUserTrees, setDefaultTree } from '@/services/neo4jDataService'
import type { TreeMetadata } from '@/types'

const CreateTreeWizard = lazy(() => import('@/components/modals/CreateTreeWizard').then(m => ({ default: m.CreateTreeWizard })))

type SortKey = 'recent' | 'alpha' | 'size'

function parseNeo4jDateTime(val: any): Date | null {
  if (!val) return null;
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'object') {
    if ('year' in val && 'month' in val && 'day' in val) {
      const year = val.year ?? 0;
      const month = (val.month ?? 1) - 1; // 0-indexed in JS
      const day = val.day ?? 1;
      const hour = val.hour ?? 0;
      const minute = val.minute ?? 0;
      const second = val.second ?? 0;
      const date = new Date(year, month, day, hour, minute, second);
      return isNaN(date.getTime()) ? null : date;
    }
  }
  return null;
}

export function TreesPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const { toast } = useToast()

  const [trees, setTrees] = useState<TreeMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<SortKey>('recent')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')
  const [defaultId, setDefaultId] = useState<string | null>(() => localStorage.getItem('defaultTreeId'))
  const [settingDefault, setSettingDefault] = useState<string | null>(null)
  const [showCreateTreeWizard, setShowCreateTreeWizard] = useState(false)

  useEffect(() => {
    if (!user) return
    getUserTrees(user.id)
      .then(loadedTrees => {
        setTrees(loadedTrees)
        const defaultTree = loadedTrees?.find((t: any) => t.isDefault === true)
        if (defaultTree) {
          setDefaultId(defaultTree.treeId)
          try { localStorage.setItem('defaultTreeId', defaultTree.treeId) } catch { /* noop */ }
        }
      })
      .catch(() => setTrees([]))
      .finally(() => setLoading(false))
  }, [user])

  const sortedTrees = useMemo(() => {
    const filter = q.trim().toLowerCase()
    const filtered = filter
      ? trees.filter(t => t.treeName.toLowerCase().includes(filter) || (t.description || '').toLowerCase().includes(filter))
      : trees
    const getKey = (t: TreeMetadata): number | string => {
      if (sort === 'alpha') return t.treeName.toLowerCase()
      if (sort === 'size')  return t.personCount ?? 0
      const date = parseNeo4jDateTime(t.updatedAt) || parseNeo4jDateTime(t.createdAt);
      return date ? date.getTime() : 0;
    }
    const sorted = [...filtered].sort((a, b) => {
      const av = getKey(a), bv = getKey(b)
      if (av < bv) return dir === 'asc' ? -1 : 1
      if (av > bv) return dir === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [trees, q, sort, dir])

  const handleSetDefault = async (treeId: string) => {
    setSettingDefault(treeId)
    try {
      await setDefaultTree(treeId)
      setDefaultId(treeId)
      try { localStorage.setItem('defaultTreeId', treeId) } catch { /* noop */ }
      toast({ title: 'Default tree updated', description: 'This tree will open next time.' })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to set default tree',
        variant: 'destructive'
      })
    } finally {
      setSettingDefault(null)
    }
  }

  const openTree = (treeId: string) => {
    try { localStorage.setItem('lastUsedTreeId', treeId) } catch { /* noop */ }
    navigate(`/dashboard?treeId=${treeId}#tree`)
  }

  const relTime = (iso?: any): string => {
    if (!iso) return '—'
    const date = parseNeo4jDateTime(iso);
    if (!date) {
      return typeof iso === 'string' ? iso : '—';
    }
    const ms = Date.now() - date.getTime()
    const mins = Math.floor(ms / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d ago`
    try {
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const yy = String(date.getFullYear()).slice(-2);
      return `${dd}-${mm}-${yy}`;
    } catch {
      return typeof iso === 'string' ? iso : '—';
    }
  }

  return (
    <div className="h-screen overflow-y-auto bg-[#F6F2EA] dark:bg-[#0a0a0a] text-[#3D2E1F] dark:text-[#F3F2F1]">
      <main id="main-content" className="max-w-6xl mx-auto px-4 md:px-8 pt-6 pb-16">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-[13px] text-[#8B7355] dark:text-[#888] hover:text-[#2F3E8F] dark:hover:text-[#8CA0FF] mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </button>

        <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="font-display text-[28px] md:text-[32px] font-semibold">Your trees</h1>
            <p className="text-[14px] text-[#8B7355] dark:text-[#888] mt-0.5">
              {loading ? 'Loading…' : `${trees.length} tree${trees.length === 1 ? '' : 's'}`}
            </p>
          </div>
          <button
            onClick={() => setShowCreateTreeWizard(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#2F3E8F] text-white text-[13px] font-semibold px-4 py-2 hover:brightness-110"
          >
            <Plus className="w-4 h-4" />
            New tree
          </button>
        </div>

        {/* Filter + Sort bar */}
        <div className="flex items-center gap-2 flex-wrap mb-5">
          <label className="relative flex-1 min-w-[220px] max-w-md">
            <span className="sr-only">Search trees</span>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7355] dark:text-[#888]" />
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search trees by name or description"
              className="w-full rounded-xl border border-[#E2DBCE]/80 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] pl-9 pr-3 py-2 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F3E8F]/40"
            />
          </label>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            className="rounded-xl border border-[#E2DBCE]/80 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-[13px] px-2.5 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F3E8F]/40"
            aria-label="Sort by"
          >
            <option value="recent">Recently updated</option>
            <option value="alpha">Name (A–Z)</option>
            <option value="size">Member count</option>
          </select>
          <button
            type="button"
            onClick={() => setDir(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="inline-flex items-center gap-1 rounded-xl border border-[#E2DBCE]/80 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-[13px] px-2.5 py-2 hover:border-[#2F3E8F]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F3E8F]/40"
            aria-label={dir === 'asc' ? 'Ascending' : 'Descending'}
          >
            {dir === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
            {dir === 'asc' ? 'Asc' : 'Desc'}
          </button>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-[#B8A090]" /></div>
        ) : trees.length === 0 ? (
          <div className="text-center py-20 px-4 rounded-3xl border border-dashed border-[#E2DBCE]/80 dark:border-[#2a2a2a] bg-white/50 dark:bg-[#1a1a1a]/50">
            <div className="w-16 h-16 rounded-2xl bg-[#2F3E8F]/10 flex items-center justify-center mx-auto mb-5">
              <TreePine className="w-8 h-8 text-[#2F3E8F]" />
            </div>
            <h2 className="font-display text-[22px] font-semibold mb-2">Start your family journey</h2>
            <p className="text-[15px] text-[#8B7355] dark:text-[#888] max-w-md mx-auto mb-8">
              You haven't created any family trees yet. Create your first tree to begin preserving your family's legacy, memories, and connections.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setShowCreateTreeWizard(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2F3E8F] text-white font-semibold px-6 py-3 hover:brightness-110 transition-all"
              >
                <Plus className="w-5 h-5" />
                Create New Tree
              </button>
            </div>
          </div>
        ) : sortedTrees.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-[#E2DBCE]/80 dark:border-[#2a2a2a]">
            <TreePine className="w-10 h-10 text-[#B8A090] mx-auto mb-3" />
            <p className="text-[15px] font-medium">No trees match that search.</p>
            <p className="text-[13px] text-[#8B7355] dark:text-[#888] mt-1">Try a different term or clear the filter.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="list">
            {sortedTrees.map(t => {
              const isDefault = defaultId === t.treeId
              return (
                <li key={t.treeId}>
                  <article className="rounded-2xl bg-white dark:bg-[#141414] border border-[#E2DBCE]/60 dark:border-[#2a2a2a] p-4 h-full flex flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="font-display text-[17px] font-semibold truncate">{t.treeName}</h2>
                        <p className="text-[12px] text-[#8B7355] dark:text-[#888] mt-0.5 capitalize">
                          {t.userRole || 'owner'} · {t.personCount ?? 0} member{(t.personCount ?? 0) === 1 ? '' : 's'}
                        </p>
                      </div>
                      {isDefault && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#2F3E8F]/10 dark:bg-[#2F3E8F]/20 text-[#2F3E8F] dark:text-[#8CA0FF] text-[11px] font-semibold px-2 py-0.5">
                          <Check className="w-3 h-3" /> Default
                        </span>
                      )}
                    </div>

                    {t.description && (
                      <p className="text-[13px] text-[#5B5449] dark:text-[#B8B8B8] mt-2 line-clamp-2">{t.description}</p>
                    )}

                    <p className="text-[11px] text-[#8B7355]/70 dark:text-[#777] mt-2">
                      Updated {relTime(t.updatedAt)}
                    </p>

                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#E2DBCE]/60 dark:border-[#2a2a2a]">
                      <button
                        onClick={() => openTree(t.treeId)}
                        className="inline-flex items-center rounded-lg bg-[#2F3E8F] text-white text-[12px] font-semibold px-3 py-1.5 hover:brightness-110"
                      >
                        Open
                      </button>
                      {!isDefault && (
                        <button
                          onClick={() => handleSetDefault(t.treeId)}
                          disabled={!!settingDefault}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2DBCE]/80 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-[12px] font-medium text-[#3D2E1F] dark:text-[#F3F2F1] px-3 py-1.5 hover:border-[#2F3E8F]/50 disabled:opacity-50"
                        >
                          {settingDefault === t.treeId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Set default'}
                        </button>
                      )}
                      <Link
                        to="/settings?tab=trees"
                        className="ml-auto text-[12px] text-[#8B7355] dark:text-[#888] hover:text-[#2F3E8F] dark:hover:text-[#8CA0FF]"
                      >
                        Settings
                      </Link>
                    </div>
                  </article>
                </li>
              )
            })}
          </ul>
        )}
      </main>

      {showCreateTreeWizard && user && (
        <Suspense fallback={null}>
          <CreateTreeWizard
            open={showCreateTreeWizard}
            onClose={async (treeId) => {
              setShowCreateTreeWizard(false)
              if (treeId) {
                const refreshed = await getUserTrees(user.id, true)
                setTrees(refreshed)
              }
            }}
            onComplete={async (treeId) => {
              setShowCreateTreeWizard(false)
              const refreshed = await getUserTrees(user.id, true)
              setTrees(refreshed)
            }}
            userId={user.id}
          />
        </Suspense>
      )}
    </div>
  )
}
