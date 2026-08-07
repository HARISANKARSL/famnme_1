/**
 * ChatRichContent — Renders navigation cards and feature help step cards
 * within assistant messages.
 *
 * When autoNavigate is true, navigation happens immediately when the component
 * mounts (used when the AI confirms navigation after user says "yes").
 */

import { useEffect, useRef } from 'react'
import { ArrowRight, MapPin, ListChecks, ExternalLink } from 'lucide-react'

interface ChatRichContentProps {
  metadata: Record<string, unknown>
  onNavigate?: (route: string, highlight?: string) => void
  /** If true, auto-navigate on mount (when AI confirms navigation after user approval) */
  autoNavigate?: boolean
}

export function ChatRichContent({ metadata, onNavigate, autoNavigate }: ChatRichContentProps) {
  const navAction = metadata.navigationAction as { route: string; highlight?: string | null } | undefined
  const featureHelp = metadata.featureHelp as {
    title: string
    steps: string[]
    route: string
    tutorialSelector?: string | null
  } | undefined

  const hasAutoNavigated = useRef(false)

  // Auto-navigate on mount if this is a confirmed navigation response
  useEffect(() => {
    if (autoNavigate && navAction && onNavigate && !hasAutoNavigated.current) {
      hasAutoNavigated.current = true
      // Small delay so user can see the confirmation message first
      const timer = setTimeout(() => {
        onNavigate(navAction.route, navAction.highlight ?? undefined)
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [autoNavigate, navAction, onNavigate])

  return (
    <div className="mt-2 space-y-2 max-w-full">
      {/* Feature help step card */}
      {featureHelp && featureHelp.steps.length > 0 && (
        <div className="rounded-xl border border-[#DDD6C8] dark:border-gray-700
                        bg-white dark:bg-[#242424] p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <ListChecks className="w-3.5 h-3.5 text-[#2F3E8F] dark:text-[#5A6BFF]" />
            <span className="text-[11px] font-semibold text-[#2F3E8F] dark:text-[#5A6BFF] uppercase tracking-wider">
              Steps
            </span>
          </div>
          <ol className="space-y-1.5">
            {featureHelp.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-gray-700 dark:text-gray-300">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[#2F3E8F]/10 dark:bg-[#5A6BFF]/20
                               text-[#2F3E8F] dark:text-[#5A6BFF] text-[10px] font-bold
                               flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Navigation card — clickable button to navigate */}
      {navAction && onNavigate && (
        <button
          onClick={() => onNavigate(navAction.route, navAction.highlight ?? undefined)}
          className="flex items-center gap-2 w-full rounded-xl border border-[#2F3E8F]/20 dark:border-[#5A6BFF]/30
                     bg-[#2F3E8F]/5 dark:bg-[#5A6BFF]/10 px-3 py-2.5
                     hover:bg-[#2F3E8F]/10 dark:hover:bg-[#5A6BFF]/20
                     transition-colors group"
        >
          <MapPin className="w-4 h-4 text-[#2F3E8F] dark:text-[#5A6BFF] flex-shrink-0" />
          <span className="text-[12px] font-medium text-[#2F3E8F] dark:text-[#5A6BFF] flex-1 text-left">
            {autoNavigate ? 'Navigating to' : 'Take me to'} {featureHelp?.title ?? formatRouteName(navAction.route)}
          </span>
          {autoNavigate ? (
            <ExternalLink className="w-3.5 h-3.5 text-[#2F3E8F] dark:text-[#5A6BFF] animate-pulse" />
          ) : (
            <ArrowRight className="w-3.5 h-3.5 text-[#2F3E8F] dark:text-[#5A6BFF]
                                   group-hover:translate-x-0.5 transition-transform" />
          )}
        </button>
      )}
    </div>
  )
}

function formatRouteName(route: string): string {
  return route
    .replace('culture/predictions', 'Cosmic Predictions')
    .replace('culture/institutions', 'Sacred Institutions')
    .replace('culture/ancestral', 'Ancestral Identity')
    .replace('culture', 'Your Identity')
    .replace('family/migration', 'Migration Map')
    .replace('family/pathfinder', 'Relationship Path')
    .replace('family/suggestions', 'Suggestions')
    .replace('family/duplicates', 'Duplicate Detection')
    .replace('dailyshare', 'Daily Share')
    .replace('treeoverview', 'Tree Overview')
    .replace('memories', 'Memories')
    .replace('temples', 'Sacred Places')
    .replace('tree', 'Family Tree')
    .replace('home', 'Dashboard')
}
