/**
 * HubPageTemplate — C10
 *
 * Shared chassis for "list" hubs (All-People, Memories, Temples, Migration,
 * Heritage). Provides a consistent header, filter chip row, sort/filter/view
 * toolbar, content slot, optional empty state, and an optional bulk action
 * bar that floats at the bottom when items are selected.
 *
 * Hubs slot their own content (grid / list / map) into `children`. The view
 * mode and filter state live in the parent so each hub stays in control of
 * its query, but the chrome is unified.
 */
import { type ReactNode, useState } from 'react'
import { ArrowLeft, ChevronDown, LayoutGrid, List, Map as MapIcon, X } from 'lucide-react'
import { Link } from 'react-router-dom'

export type HubViewMode = 'grid' | 'list' | 'map'

export interface HubFilterChip {
  id: string
  label: string
  active: boolean
  count?: number
  onToggle: () => void
}

export interface HubSortOption {
  id: string
  label: string
}

export interface HubBulkAction {
  id: string
  label: string
  icon?: ReactNode
  onClick: () => void
  variant?: 'default' | 'danger'
}

export interface HubPageTemplateProps {
  /** Page title (e.g. "All People") */
  title: string
  /** Subtitle / item count (e.g. "42 members across 4 generations") */
  subtitle?: string
  /** Hero icon (lucide component or emoji) */
  icon?: ReactNode
  /** Back link (defaults to /dashboard). Pass null to hide. */
  backTo?: string | null

  /** Filter chips row — empty array hides the row */
  filterChips?: HubFilterChip[]

  /** Sort options — empty/undefined hides the sort dropdown */
  sortOptions?: HubSortOption[]
  activeSortId?: string
  onSortChange?: (id: string) => void

  /** Available view modes (default ['grid']) */
  views?: HubViewMode[]
  activeView?: HubViewMode
  onViewChange?: (view: HubViewMode) => void

  /** Search input — pass undefined to hide */
  searchValue?: string
  searchPlaceholder?: string
  onSearchChange?: (value: string) => void

  /** Right-aligned header slot (e.g. add button) */
  headerActions?: ReactNode

  /** Bulk-select count + actions — bar appears when count > 0 */
  selectedCount?: number
  onClearSelection?: () => void
  bulkActions?: HubBulkAction[]

  /** Empty state — shown when content children are empty AND emptyState is set */
  isEmpty?: boolean
  emptyState?: ReactNode

  children: ReactNode
}

const VIEW_ICONS: Record<HubViewMode, ReactNode> = {
  grid: <LayoutGrid className="w-4 h-4" />,
  list: <List className="w-4 h-4" />,
  map: <MapIcon className="w-4 h-4" />,
}

export function HubPageTemplate({
  title,
  subtitle,
  icon,
  backTo = '/dashboard',
  filterChips,
  sortOptions,
  activeSortId,
  onSortChange,
  views = ['grid'],
  activeView = 'grid',
  onViewChange,
  searchValue,
  searchPlaceholder = 'Search…',
  onSearchChange,
  headerActions,
  selectedCount = 0,
  onClearSelection,
  bulkActions,
  isEmpty,
  emptyState,
  children,
}: HubPageTemplateProps) {
  const [sortOpen, setSortOpen] = useState(false)
  const activeSortLabel = sortOptions?.find(s => s.id === activeSortId)?.label

  return (
    <div className="min-h-screen bg-[#F6F2EA] dark:bg-[#0a0a0a] text-[#3D2E1F] dark:text-[#F3F2F1]">
      <main id="main-content" className="max-w-6xl px-4 pt-6 pb-24 mx-auto md:px-8">
        {/* Back link */}
        {backTo !== null && (
          <Link
            to={backTo}
            className="inline-flex items-center gap-1.5 text-[13px] text-[#8B7355] dark:text-[#888] hover:text-[#2F3E8F] dark:hover:text-[#8CA0FF] mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        )}

        {/* Hero */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {icon && <span className="text-[22px] leading-none shrink-0" aria-hidden>{icon}</span>}
              <h1 className="font-display text-[26px] md:text-[30px] font-semibold leading-tight truncate">{title}</h1>
            </div>
            {subtitle && (
              <p className="text-[13px] text-[#8B7355] dark:text-[#888]">{subtitle}</p>
            )}
          </div>
          {headerActions && <div className="shrink-0">{headerActions}</div>}
        </div>

        {/* Search (above filter row when present) */}
        {onSearchChange && (
          <div className="mb-3">
            <input
              type="text"
              value={searchValue ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-10 px-3 rounded-lg bg-white dark:bg-[#1E1E1E] ring-1 ring-stone-200 dark:ring-[#333] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]"
            />
          </div>
        )}

        {/* Filter chips */}
        {filterChips && filterChips.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {filterChips.map(chip => (
              <button
                key={chip.id}
                onClick={chip.onToggle}
                className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[12px] font-medium transition-colors ${
                  chip.active
                    ? 'bg-[#2F3E8F] text-white'
                    : 'bg-white dark:bg-[#1E1E1E] ring-1 ring-stone-200 dark:ring-[#333] text-[#3D2E1F] dark:text-[#F5F1E8] hover:bg-[#F2EFE9] dark:hover:bg-[#262626]'
                }`}
              >
                {chip.label}
                {chip.count !== undefined && (
                  <span className={chip.active ? 'text-white/80' : 'text-stone-400'}>· {chip.count}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Sort + View toolbar */}
        {(sortOptions?.length || views.length > 1) && (
          <div className="flex items-center gap-2 mb-4">
            {sortOptions && sortOptions.length > 0 && onSortChange && (
              <div className="relative">
                <button
                  onClick={() => setSortOpen(v => !v)}
                  className="inline-flex items-center gap-1 h-8 px-3 rounded-md bg-white dark:bg-[#1E1E1E] ring-1 ring-stone-200 dark:ring-[#333] text-[12px] font-medium hover:bg-[#F2EFE9] dark:hover:bg-[#262626]"
                >
                  Sort: {activeSortLabel || 'Default'}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {sortOpen && (
                  <div
                    className="absolute z-10 mt-1 left-0 min-w-[160px] bg-white dark:bg-[#1E1E1E] ring-1 ring-stone-200 dark:ring-[#333] rounded-md shadow-lg py-1"
                    onMouseLeave={() => setSortOpen(false)}
                  >
                    {sortOptions.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => { onSortChange(opt.id); setSortOpen(false) }}
                        className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-[#F2EFE9] dark:hover:bg-[#262626] ${
                          opt.id === activeSortId ? 'font-semibold text-[#2F3E8F]' : ''
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {views.length > 1 && onViewChange && (
              <div className="ml-auto flex items-center gap-0.5 rounded-md bg-white dark:bg-[#1E1E1E] ring-1 ring-stone-200 dark:ring-[#333] p-0.5">
                {views.map(v => (
                  <button
                    key={v}
                    onClick={() => onViewChange(v)}
                    className={`h-7 w-7 inline-flex items-center justify-center rounded ${
                      activeView === v
                        ? 'bg-[#2F3E8F] text-white'
                        : 'text-stone-500 hover:bg-[#F2EFE9] dark:hover:bg-[#262626]'
                    }`}
                    title={`${v.charAt(0).toUpperCase() + v.slice(1)} view`}
                    aria-pressed={activeView === v}
                  >
                    {VIEW_ICONS[v]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content (or empty state) */}
        <div>
          {isEmpty && emptyState ? emptyState : children}
        </div>
      </main>

      {/* Bulk action bar */}
      {selectedCount > 0 && bulkActions && bulkActions.length > 0 && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-4 z-50 flex items-center gap-2 rounded-full bg-[#3D2E1F] dark:bg-[#1E1E1E] text-white px-4 py-2 shadow-2xl ring-1 ring-black/10">
          <span className="text-[12px] font-medium">{selectedCount} selected</span>
          <span className="w-px h-5 bg-white/20" aria-hidden />
          {bulkActions.map(action => (
            <button
              key={action.id}
              onClick={action.onClick}
              className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[12px] font-medium ${
                action.variant === 'danger'
                  ? 'bg-red-500/90 hover:bg-red-500 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
          {onClearSelection && (
            <button
              onClick={onClearSelection}
              className="p-1 ml-1 rounded-full hover:bg-white/10"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
