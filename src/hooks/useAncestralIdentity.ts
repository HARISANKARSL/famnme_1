import { useCallback, useEffect, useState } from 'react'
import {
  fetchAncestralIdentity,
  regenerateAncestralIdentity,
  type AncestralIdentityData,
} from '@/services/ancestralIdentityApiService'

export function useAncestralIdentity(treeId: string | undefined, personId: string | undefined) {
  const [data, setData] = useState<AncestralIdentityData | null>(null)
  const [loading, setLoading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!treeId || !personId) return
    setLoading(true)
    setError(null)
    try {
      const result = await fetchAncestralIdentity(treeId, personId)
      setData(result)
    } catch {
      setError('Unable to load your ancestral identity right now.')
    } finally {
      setLoading(false)
    }
  }, [treeId, personId])

  useEffect(() => {
    load()
  }, [load])

  const regenerate = useCallback(
    async (section: 'narrative' | 'patterns' | 'all' = 'narrative') => {
      if (!treeId || !personId) return
      setRegenerating(true)
      setError(null)
      try {
        const result = await regenerateAncestralIdentity(treeId, personId, section)
        setData(result)
      } catch {
        setError('Unable to refresh right now. Please try again.')
      } finally {
        setRegenerating(false)
      }
    },
    [treeId, personId],
  )

  return { data, loading, regenerating, error, regenerate }
}
