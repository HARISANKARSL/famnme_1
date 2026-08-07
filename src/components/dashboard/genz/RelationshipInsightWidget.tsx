/**
 * MemoryInsightsWidget — AI-curated insights from uploaded family memories.
 *
 * Fetches 3 insights from the backend (Gemini-generated from memory metadata).
 * Rotates through them with a carousel-style display.
 * Falls back to a prompt encouraging memory uploads if none exist.
 */

import { useState, useEffect, useCallback } from 'react'
import { Gem, ChevronLeft, ChevronRight, BookOpen, Image } from 'lucide-react'
import { resolveBackendUrl } from '@/config/api'

interface MemoryInsightsWidgetProps {
  treeId: string
  onOpenMemories?: () => void
}

interface InsightResult {
  insights: string[]
  source: 'ai' | 'cache' | 'empty' | 'error'
}

async function fetchInsights(treeId: string): Promise<InsightResult> {
  try {
    const token = localStorage.getItem('auth_token')
    const res = await fetch(`${resolveBackendUrl('/api')}/tree/${treeId}/memory-insights`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) return { insights: [], source: 'error' }
    const data = await res.json()
    return {
      insights: Array.isArray(data.insights) ? data.insights : [],
      source: data.source || 'error',
    }
  } catch {
    return { insights: [], source: 'error' }
  }
}

export function MemoryInsightsWidget({ treeId, onOpenMemories }: MemoryInsightsWidgetProps) {
  const [insights, setInsights] = useState<string[]>([])
  const [source, setSource] = useState<'ai' | 'cache' | 'empty' | 'error'>('error')
  const [currentIdx, setCurrentIdx] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!treeId) return
    setLoading(true)
    fetchInsights(treeId)
      .then(result => {
        setInsights(result.insights)
        setSource(result.source)
      })
      .finally(() => setLoading(false))
  }, [treeId])

  const next = useCallback(() => {
    setCurrentIdx(prev => (prev + 1) % insights.length)
  }, [insights.length])

  const prev = useCallback(() => {
    setCurrentIdx(prev => (prev - 1 + insights.length) % insights.length)
  }, [insights.length])

  // Auto-rotate every 8 seconds
  useEffect(() => {
    if (insights.length <= 1) return
    const timer = setInterval(next, 8000)
    return () => clearInterval(timer)
  }, [insights.length, next])

  // Loading skeleton
  if (loading) {
    return (
      <div className="rounded-2xl bg-white dark:bg-[#242424] p-4 shadow-sm ring-1 ring-stone-100 dark:ring-[#333] animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 rounded bg-stone-200 dark:bg-[#333]" />
          <div className="h-3 w-24 rounded bg-stone-200 dark:bg-[#333]" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-stone-100 dark:bg-[#2a2a2a]" />
          <div className="h-3 w-3/4 rounded bg-stone-100 dark:bg-[#2a2a2a]" />
        </div>
      </div>
    )
  }

  // Empty state — API error or no memories
  if (insights.length === 0) {
    // Don't show anything if the API just isn't available yet (error/unavailable)
    if (source === 'error' || source === 'ai') return null

    // Only show the "add memories" prompt when source is 'empty' (API confirmed no memories)
    return (
      <div className="rounded-2xl bg-white dark:bg-[#242424] p-4 shadow-sm ring-1 ring-stone-100 dark:ring-[#333]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#C2A46D]/10 flex items-center justify-center shrink-0">
            <Image className="w-5 h-5 text-[#C2A46D]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-[#3D2E1F] dark:text-[#e0e0e0]">
              Upload memories to unlock AI insights about your family story
            </p>
            {onOpenMemories && (
              <button
                onClick={onOpenMemories}
                className="text-[12px] font-semibold text-[#C2A46D] hover:text-[#B0935E] mt-1 transition-colors"
              >
                Add your first memory
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#4B2C5E]/[0.05] to-[#2F3E8F]/[0.05] dark:from-[#4B2C5E]/[0.15] dark:to-[#2F3E8F]/[0.15] p-4 shadow-sm ring-1 ring-[#4B2C5E]/10 dark:ring-[#4B2C5E]/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gem className="w-4 h-4 text-[#4B2C5E]" />
          <span className="text-[11px] font-semibold text-[#4B2C5E] dark:text-[#9B7BB0] uppercase tracking-wide">Memory Insights</span>
        </div>
        {onOpenMemories && (
          <button
            onClick={onOpenMemories}
            className="flex items-center gap-1 text-[11px] font-medium text-[#4B2C5E] dark:text-[#9B7BB0] hover:text-[#3D2349] transition-colors"
          >
            <BookOpen className="w-3 h-3" />
            View all
          </button>
        )}
      </div>

      {/* Insight carousel */}
      <div className="relative min-h-[48px] flex items-center">
        {insights.length > 1 && (
          <button
            onClick={prev}
            className="absolute -left-1 z-10 p-1 rounded-full bg-white/80 dark:bg-[#2a2a2a]/80 shadow-sm hover:bg-white dark:hover:bg-[#333] transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-[#4B2C5E]" />
          </button>
        )}

        <div className="flex-1 px-5">
          <p className="text-[14px] text-[#3D2E1F] dark:text-[#e0e0e0] leading-relaxed text-center transition-all duration-300">
            {insights[currentIdx]}
          </p>
        </div>

        {insights.length > 1 && (
          <button
            onClick={next}
            className="absolute -right-1 z-10 p-1 rounded-full bg-white/80 dark:bg-[#2a2a2a]/80 shadow-sm hover:bg-white dark:hover:bg-[#333] transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5 text-[#4B2C5E]" />
          </button>
        )}
      </div>

      {/* Dots indicator */}
      {insights.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {insights.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIdx(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === currentIdx
                  ? 'bg-[#4B2C5E] w-4'
                  : 'bg-[#4B2C5E]/20 dark:bg-[#9B7BB0]/20'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
