/**
 * Loads every help article bundled under `./articles/**\/*.md` at build time.
 * Frontmatter is parsed by a tiny inline parser (gray-matter would pull in
 * Node's Buffer at runtime, which doesn't exist in the browser). Heading IDs
 * match the slugs emitted by rehype-slug at render time so TOC links work.
 */
import type { HelpArticle, HelpHeading } from './types'
import { HELP_CATEGORIES, CATEGORY_BY_SLUG } from './categories'

interface Frontmatter {
  title?: string
  description?: string
  updated?: string
  order?: number
  tags?: string[]
}

/** Parse `--- ... ---` block into a plain object. Supports strings, numbers,
 *  and inline/bulleted arrays — sufficient for our article frontmatter. */
function parseFrontmatter(raw: string): { data: Frontmatter; content: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw)
  if (!m) return { data: {}, content: raw }
  const yaml = m[1]
  const content = m[2]
  const data: Record<string, unknown> = {}
  const lines = yaml.split(/\r?\n/)
  let currentKey: string | null = null
  let currentArr: string[] | null = null
  for (const line of lines) {
    const bullet = /^\s*-\s+(.+?)\s*$/.exec(line)
    if (bullet && currentArr) {
      currentArr.push(stripQuotes(bullet[1]))
      continue
    }
    const kv = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line)
    if (!kv) continue
    currentKey = kv[1]
    const rest = kv[2].trim()
    if (rest === '') {
      // multi-line array follows
      currentArr = []
      data[currentKey] = currentArr
    } else if (rest.startsWith('[') && rest.endsWith(']')) {
      data[currentKey] = rest.slice(1, -1).split(',').map(s => stripQuotes(s.trim())).filter(Boolean)
      currentArr = null
    } else if (/^-?\d+(\.\d+)?$/.test(rest)) {
      data[currentKey] = Number(rest)
      currentArr = null
    } else {
      data[currentKey] = stripQuotes(rest)
      currentArr = null
    }
  }
  return { data: data as Frontmatter, content }
}

function stripQuotes(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1)
  }
  return s
}

// Vite's import.meta.glob eagerly inlines every .md as a string at build time.
const rawFiles = import.meta.glob<string>('./articles/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

/** slugify: matches GitHub-style slugs emitted by rehype-slug. */
function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
}

/** Pull out h2/h3 headings from markdown source (skips fenced code blocks). */
function extractHeadings(md: string): HelpHeading[] {
  const headings: HelpHeading[] = []
  const lines = md.split(/\r?\n/)
  let inFence = false
  for (const line of lines) {
    if (/^\s*```/.test(line)) { inFence = !inFence; continue }
    if (inFence) continue
    const m = /^(#{2,3})\s+(.+?)\s*$/.exec(line)
    if (m) {
      headings.push({
        level: m[1].length as 2 | 3,
        text: m[2].replace(/[`*_]/g, '').trim(),
        id: slugifyHeading(m[2]),
      })
    }
  }
  return headings
}

function countWords(md: string): number {
  return md.replace(/```[\s\S]*?```/g, '').replace(/[#>*_`]/g, '').split(/\s+/).filter(Boolean).length
}

function loadArticles(): HelpArticle[] {
  const out: HelpArticle[] = []
  for (const [path, raw] of Object.entries(rawFiles)) {
    // path example: ./articles/getting-started/welcome-to-familyaconnect.md
    const parts = path.split('/')
    const filename = parts[parts.length - 1]
    const categorySlug = parts[parts.length - 2]
    const slug = filename.replace(/\.md$/, '')

    if (!CATEGORY_BY_SLUG[categorySlug]) {
      console.warn(`[help] article ${slug} is in unknown category "${categorySlug}" — skipped`)
      continue
    }

    const parsed = parseFrontmatter(raw)
    const fm = parsed.data

    out.push({
      slug,
      categorySlug,
      title: fm.title ?? slug,
      description: fm.description ?? '',
      updated: fm.updated ?? '',
      order: fm.order ?? 100,
      tags: fm.tags ?? [],
      body: parsed.content,
      wordCount: countWords(parsed.content),
      headings: extractHeadings(parsed.content),
    })
  }
  // Stable sort: by category order, then article order, then title.
  out.sort((a, b) => {
    const ca = CATEGORY_BY_SLUG[a.categorySlug].order
    const cb = CATEGORY_BY_SLUG[b.categorySlug].order
    if (ca !== cb) return ca - cb
    if (a.order !== b.order) return a.order - b.order
    return a.title.localeCompare(b.title)
  })
  return out
}

export const HELP_ARTICLES: HelpArticle[] = loadArticles()

export const ARTICLES_BY_CATEGORY: Record<string, HelpArticle[]> = Object.fromEntries(
  HELP_CATEGORIES.map(c => [c.slug, HELP_ARTICLES.filter(a => a.categorySlug === c.slug)])
)

export function findArticle(categorySlug: string, slug: string): HelpArticle | undefined {
  return HELP_ARTICLES.find(a => a.categorySlug === categorySlug && a.slug === slug)
}

/** Short list of "Popular articles" shown on the hub. Hand-curated for v1. */
export const POPULAR_SLUGS: string[] = [
  'creating-your-first-tree',
  'adding-spouses-and-partners',
  'inviting-family-members',
  'managing-passkeys',
  'understanding-roles',
  'deleting-a-person-ghost-nodes',
]

export function getPopularArticles(): HelpArticle[] {
  return POPULAR_SLUGS
    .map(s => HELP_ARTICLES.find(a => a.slug === s))
    .filter((a): a is HelpArticle => !!a)
}

export function getRelatedArticles(article: HelpArticle, limit = 4): HelpArticle[] {
  return (ARTICLES_BY_CATEGORY[article.categorySlug] ?? [])
    .filter(a => a.slug !== article.slug)
    .slice(0, limit)
}

export { HELP_CATEGORIES, CATEGORY_BY_SLUG }
