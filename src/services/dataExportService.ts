/**
 * dataExportService — client-side personal data export (Phase 3 GDPR work).
 *
 * Uses existing Neo4j data endpoints to build a JSON archive of everything
 * the current user can see (all trees they own + persons/unions/relationships
 * for each). No backend changes — the archive is assembled in the browser and
 * streamed out as a download.
 */

import { getUserTrees, fetchTreeWindow } from '@/services/neo4jDataService'
import type { TreeMetadata } from '@/types'

export interface ExportArchive {
  exportedAt: string
  format: 'fc-family-archive/v1'
  user: { userId: string; email?: string; fullName?: string }
  trees: Array<{
    metadata: TreeMetadata
    persons: unknown[]
    unions: unknown[]
    relationships: unknown[]
  }>
}

export async function buildExportArchive(user: { id: string; email?: string; fullName?: string }): Promise<ExportArchive> {
  const trees = await getUserTrees(user.id)
  const enriched: ExportArchive['trees'] = []
  for (const t of trees) {
    try {
      // `fetchTreeWindow` returns all persons in the tree when no focusPersonId is given
      const data = await fetchTreeWindow(t.treeId)
      enriched.push({
        metadata: t,
        persons: data.persons || [],
        unions: data.unions || [],
        relationships: data.relationships || [],
      })
    } catch {
      enriched.push({ metadata: t, persons: [], unions: [], relationships: [] })
    }
  }
  return {
    exportedAt: new Date().toISOString(),
    format: 'fc-family-archive/v1',
    user: { userId: user.id, email: user.email, fullName: user.fullName },
    trees: enriched,
  }
}

/** Download the archive as a JSON file with a timestamped name. */
export function downloadArchive(archive: ExportArchive, baseName = 'familyaconnect-export'): void {
  const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const stamp = new Date().toISOString().slice(0, 10)
  const a = document.createElement('a')
  a.href = url
  a.download = `${baseName}-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 500)
}
