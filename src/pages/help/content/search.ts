/**
 * Client-side full-text search over help articles, powered by Fuse.js.
 * Index is built once at module load. For ~30-200 articles this is instant
 * and returns in well under 50ms on a warm cache.
 */
import Fuse from 'fuse.js'
import type { HelpArticle } from './types'
import { HELP_ARTICLES } from './index'

const fuse = new Fuse<HelpArticle>(HELP_ARTICLES, {
  keys: [
    { name: 'title',       weight: 0.5 },
    { name: 'description', weight: 0.25 },
    { name: 'tags',        weight: 0.15 },
    { name: 'body',        weight: 0.1 },
  ],
  includeScore: true,
  threshold: 0.35,
  ignoreLocation: true,
  minMatchCharLength: 2,
})

export interface SearchHit {
  article: HelpArticle
  snippet: string
}

function makeSnippet(article: HelpArticle, query: string): string {
  const q = query.trim().toLowerCase()
  if (!q) return article.description
  const body = article.body.replace(/[#*`_>[\]()]/g, ' ').replace(/\s+/g, ' ')
  const idx = body.toLowerCase().indexOf(q)
  if (idx < 0) return article.description || body.slice(0, 140) + '…'
  const start = Math.max(0, idx - 40)
  const end = Math.min(body.length, idx + q.length + 80)
  return (start > 0 ? '…' : '') + body.slice(start, end).trim() + (end < body.length ? '…' : '')
}

export function searchHelp(query: string, limit = 8): SearchHit[] {
  const q = query.trim()
  if (q.length < 2) return []
  return fuse.search(q, { limit }).map(r => ({
    article: r.item,
    snippet: makeSnippet(r.item, q),
  }))
}
