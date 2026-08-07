import { useState, useEffect } from 'react'
import {
  fetchTreeStatistics,
  fetchSuggestions,
  fetchFamilyNarrative,
  fetchTreeActivityFeed,
  type TreeStatistics,
  type SuggestionsResult,
  type ChangeLogEntry,
} from '@/services/neo4jDataService'

export interface TreeOverviewData {
  statistics: TreeStatistics | null
  suggestions: SuggestionsResult | null
  narrative: { narrative: string; paragraphs: string[] } | null
  activity: { entries: ChangeLogEntry[]; total: number } | null
  isLoading: boolean
}

export function useTreeOverviewData(treeId: string): TreeOverviewData {
  const [statistics, setStatistics] = useState<TreeStatistics | null>(null)
  const [suggestions, setSuggestions] = useState<SuggestionsResult | null>(null)
  const [narrative, setNarrative] = useState<{ narrative: string; paragraphs: string[] } | null>(null)
  const [activity, setActivity] = useState<{ entries: ChangeLogEntry[]; total: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadAll() {
      setIsLoading(true)

      const results = await Promise.allSettled([
        fetchTreeStatistics(treeId),
        fetchSuggestions(treeId),
        fetchFamilyNarrative(treeId),
        fetchTreeActivityFeed(treeId, 10),
      ])

      if (cancelled) return

      if (results[0].status === 'fulfilled') setStatistics(results[0].value)
      if (results[1].status === 'fulfilled') setSuggestions(results[1].value)
      if (results[2].status === 'fulfilled') setNarrative(results[2].value)
      if (results[3].status === 'fulfilled') setActivity(results[3].value)

      setIsLoading(false)
    }

    loadAll()
    return () => { cancelled = true }
  }, [treeId])

  return { statistics, suggestions, narrative, activity, isLoading }
}
