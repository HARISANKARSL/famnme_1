import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Search, X, ArrowRight, User } from 'lucide-react'
import { usePanelStore } from '@/store/panelStore'
import {
  SPOTLIGHT_ACTIONS, SPOTLIGHT_CATEGORIES,
  matchAction, addRecentAction,
  type SpotlightAction, type SpotlightCategory,
} from '@/data/spotlightActions'
import type { Person } from '@/types'
import { resolveBackendUrl } from '@/config/api'

/** A person result in the spotlight */
interface PersonResult {
  type: 'person'
  person: Person
  displayName: string
}

/** A feature/action result in the spotlight */
interface ActionResult {
  type: 'action'
  action: SpotlightAction
}

type SpotlightResult = PersonResult | ActionResult

interface SpotlightSearchProps {
  open: boolean
  onClose: () => void
  selectedPersonId: string | null
  /** Called when an action needs to be executed */
  onAction: (action: SpotlightAction) => void
  /** Persons from the current tree (for people search) */
  persons?: Person[]
  /** Called when a person is selected from search */
  onPersonSelect?: (personId: string) => void
}

export function SpotlightSearch({
  open,
  onClose,
  selectedPersonId,
  onAction,
  persons,
  onPersonSelect,
}: SpotlightSearchProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const openPanel = usePanelStore(s => s.openPanel)

  // Search persons by name
  const matchedPersons = useMemo((): PersonResult[] => {
    if (!query || query.length < 2 || !persons) return []
    const q = query.toLowerCase().trim()
    return persons
      .filter(p => !p.isDeleted)
      .filter(p => {
        const name = `${p.firstName} ${p.lastName}`.toLowerCase()
        return name.includes(q)
      })
      .slice(0, 6)
      .map(p => ({
        type: 'person' as const,
        person: p,
        displayName: `${p.firstName} ${p.lastName}`.trim(),
      }))
  }, [query, persons])

  // Filter actions based on query and selection state
  const matchedActions = useMemo((): ActionResult[] => {
    const available = SPOTLIGHT_ACTIONS.filter(a => {
      if (a.requiresSelection && !selectedPersonId) return false
      return matchAction(a, query)
    })

    // Group by category and sort
    const grouped = new Map<SpotlightCategory, SpotlightAction[]>()
    for (const action of available) {
      const list = grouped.get(action.category) || []
      list.push(action)
      grouped.set(action.category, list)
    }

    // Flatten in category order
    const sorted: SpotlightAction[] = []
    const categories = Object.entries(SPOTLIGHT_CATEGORIES)
      .sort(([, a], [, b]) => a.order - b.order)

    for (const [cat] of categories) {
      const items = grouped.get(cat as SpotlightCategory)
      if (items) sorted.push(...items)
    }

    return sorted.map(a => ({ type: 'action' as const, action: a }))
  }, [query, selectedPersonId])

  // Combined results: persons first, then actions
  const allResults = useMemo((): SpotlightResult[] => {
    return [...matchedPersons, ...matchedActions]
  }, [matchedPersons, matchedActions])

  // Quick actions shown when query is empty (curated list)
  const QUICK_ACTION_IDS = [
    'discover-migration-map',
    'discover-timeline',
    'discover-descendancy',
    'discover-pathfinder',
    'discover-suggestions',
    'discover-duplicates',
  ]
  const quickActions = useMemo(
    (): SpotlightResult[] => QUICK_ACTION_IDS
      .map(id => SPOTLIGHT_ACTIONS.find(a => a.id === id))
      .filter((a): a is SpotlightAction => {
        if (!a) return false
        if (a.requiresSelection && !selectedPersonId) return false
        return true
      })
      .map(a => ({ type: 'action' as const, action: a })),
    [selectedPersonId]
  )

  // Reset on open/close
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Lock body scroll
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [open])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const items = query ? allResults : quickActions.length > 0 ? quickActions : allResults

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = items[activeIndex]
      if (item) executeResult(item)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }, [allResults, quickActions, activeIndex, query]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const executeResult = useCallback((result: SpotlightResult) => {
    onClose()

    if (result.type === 'person') {
      onPersonSelect?.(result.person.personId)
      return
    }

    const action = result.action
    addRecentAction(action.id)

    // Panel-based actions
    if (action.panelId) {
      openPanel(action.panelId, action.requiresSelection && selectedPersonId ? { personId: selectedPersonId } : {})
      return
    }

    // Custom actions
    onAction(action)
  }, [onClose, openPanel, selectedPersonId, onAction, onPersonSelect])

  if (!open) return null

  const displayResults = query ? allResults : quickActions.length > 0 ? quickActions : allResults
  const showQuickHeader = !query && quickActions.length > 0

  // Track category headers for action results
  let lastCategory: string | null = null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] md:pt-[12vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" />

      {/* Spotlight panel */}
      <div
        className="relative w-[94vw] max-w-[600px] bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-xl rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.2)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.5)] border border-[#E2E8F0]/80 dark:border-[#2a2a2a] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E2E8F0]/60 dark:border-[#2a2a2a]">
          <Search className="w-5 h-5 text-[#8B7355] dark:text-[#999] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search people, features, settings..."
            className="flex-1 bg-transparent text-[15px] text-[#3D2E1F] dark:text-[#f5f5f5] placeholder-[#8B7355]/60 dark:placeholder-[#999]/60 outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-[#8B7355] dark:text-[#999]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-[#8B7355] dark:text-[#666] bg-[#F4F6F9] dark:bg-[#2a2a2a] rounded border border-[#E2E8F0]/60 dark:border-[#333] font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-1">
          {displayResults.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-[#8B7355] dark:text-[#999]">
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <>
              {showQuickHeader && (
                <div className="px-4 pt-2 pb-1 text-[11px] font-semibold text-[#8B7355]/70 dark:text-[#666] uppercase tracking-wider">
                  Quick Actions
                </div>
              )}

              {/* People header (if there are person results) */}
              {query && matchedPersons.length > 0 && (
                <div className="px-4 pt-2 pb-1 text-[11px] font-semibold text-[#8B7355]/70 dark:text-[#666] uppercase tracking-wider">
                  People
                </div>
              )}

              {displayResults.map((result, index) => {
                const isActive = index === activeIndex

                if (result.type === 'person') {
                  const { person: p, displayName: name } = result
                  const photoUrl = p.profilePhotoUrl ? resolveBackendUrl(p.profilePhotoUrl) : null
                  return (
                    <div
                      key={`person-${p.personId}`}
                      data-index={index}
                      role="button"
                      tabIndex={0}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer transition-colors duration-75 ${
                        isActive
                          ? 'bg-[#2F3E8F]/8 dark:bg-[#5A6BFF]/10'
                          : 'hover:bg-[#2F3E8F]/5 dark:hover:bg-[#5A6BFF]/5'
                      }`}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        executeResult(result)
                      }}
                      onMouseEnter={() => setActiveIndex(index)}
                      onKeyDown={(e) => { if (e.key === 'Enter') executeResult(result) }}
                    >
                      {photoUrl ? (
                        <img src={photoUrl} alt={name} className="w-8 h-8 rounded-full object-cover shrink-0 pointer-events-none" />
                      ) : (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[#F4F6F9] dark:bg-[#2a2a2a] text-[#8B7355] dark:text-[#999] pointer-events-none">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 pointer-events-none">
                        <div className={`text-[13px] truncate ${
                          isActive ? 'text-[#2F3E8F] dark:text-[#8B9CFF] font-medium' : 'text-[#3D2E1F] dark:text-[#e0e0e0]'
                        }`}>
                          {name}
                        </div>
                        {p.birthDate && (
                          <div className="text-[10px] text-[#8B7355]/60 dark:text-[#666]">
                            b. {p.birthDate.slice(0, 4)}
                          </div>
                        )}
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-[#2F3E8F]/40 dark:text-[#8B9CFF]/40 shrink-0 pointer-events-none" />
                    </div>
                  )
                }

                // Action result
                const { action } = result

                // Category header (only in search mode)
                let categoryHeader: React.ReactNode = null
                if (query && action.category !== lastCategory) {
                  lastCategory = action.category
                  const cat = SPOTLIGHT_CATEGORIES[action.category]
                  categoryHeader = (
                    <div className="px-4 pt-3 pb-1 text-[11px] font-semibold text-[#8B7355]/70 dark:text-[#666] uppercase tracking-wider">
                      {cat.label}
                    </div>
                  )
                }

                const Icon = action.icon

                return (
                  <div key={action.id}>
                    {categoryHeader}
                    <button
                      data-index={index}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-75 ${
                        isActive
                          ? 'bg-[#2F3E8F]/8 dark:bg-[#5A6BFF]/10'
                          : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                      }`}
                      onClick={() => executeResult(result)}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-[#2F3E8F]/12 dark:bg-[#5A6BFF]/15 text-[#2F3E8F] dark:text-[#8B9CFF]'
                          : 'bg-[#F4F6F9] dark:bg-[#2a2a2a] text-[#8B7355] dark:text-[#999]'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-[13px] truncate ${
                          isActive ? 'text-[#2F3E8F] dark:text-[#8B9CFF] font-medium' : 'text-[#3D2E1F] dark:text-[#e0e0e0]'
                        }`}>
                          {action.label}
                        </div>
                        {action.shortcut && (
                          <kbd className="text-[10px] text-[#8B7355]/60 dark:text-[#666] font-mono">
                            {action.shortcut}
                          </kbd>
                        )}
                      </div>
                      {isActive && (
                        <ArrowRight className="w-3.5 h-3.5 text-[#2F3E8F] dark:text-[#8B9CFF] shrink-0" />
                      )}
                    </button>
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-[#E2E8F0]/40 dark:border-[#2a2a2a] flex items-center gap-3 text-[11px] text-[#8B7355]/60 dark:text-[#666]">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-[#F4F6F9] dark:bg-[#2a2a2a] rounded text-[10px] font-mono border border-[#E2E8F0]/60 dark:border-[#333]">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-[#F4F6F9] dark:bg-[#2a2a2a] rounded text-[10px] font-mono border border-[#E2E8F0]/60 dark:border-[#333]">↵</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-[#F4F6F9] dark:bg-[#2a2a2a] rounded text-[10px] font-mono border border-[#E2E8F0]/60 dark:border-[#333]">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>,
    document.body
  )
}
