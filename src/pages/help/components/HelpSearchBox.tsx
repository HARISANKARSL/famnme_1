import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, CornerDownLeft } from 'lucide-react'
import { searchHelp, type SearchHit } from '../content/search'
import { CATEGORY_BY_SLUG } from '../content/categories'

type Variant = 'hero' | 'compact'

interface Props {
  variant?: Variant
  autoFocus?: boolean
  placeholder?: string
}

export function HelpSearchBox({ variant = 'hero', autoFocus, placeholder }: Props) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    setHits(searchHelp(q))
    setActive(0)
  }, [q])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function selectHit(hit: SearchHit) {
    setOpen(false)
    setQ('')
    navigate(`/help/${hit.article.categorySlug}/${hit.article.slug}`)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(a => Math.min(hits.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(a => Math.max(0, a - 1))
    } else if (e.key === 'Enter') {
      if (hits[active]) selectHit(hits[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const isHero = variant === 'hero'
  const showDropdown = open && q.trim().length >= 2

  return (
    <div ref={rootRef} className="relative w-full">
      <div
        className={`flex items-center gap-2 bg-white dark:bg-zinc-900 border transition-shadow ${
          isHero
            ? 'rounded-2xl border-gray-200 dark:border-zinc-700 shadow-sm hover:shadow-md px-4 h-14'
            : 'rounded-xl border-gray-200 dark:border-zinc-700 px-3 h-10'
        }`}
      >
        <Search className={isHero ? 'w-5 h-5 text-gray-400' : 'w-4 h-4 text-gray-400'} />
        <input
          ref={inputRef}
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder ?? 'Search help articles…'}
          className={`flex-1 bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 ${
            isHero ? 'text-base' : 'text-sm'
          }`}
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-controls="help-search-list"
        />
        {!isHero && (
          <kbd className="hidden md:inline-flex items-center gap-0.5 text-[10px] font-mono text-gray-400 border border-gray-200 dark:border-zinc-700 rounded px-1.5 py-0.5">
            Ctrl K
          </kbd>
        )}
      </div>

      {showDropdown && (
        <div
          id="help-search-list"
          role="listbox"
          className="absolute left-0 right-0 mt-2 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-700 shadow-lg overflow-hidden z-50 max-h-[70vh] overflow-y-auto"
        >
          {hits.length === 0 ? (
            <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
              No results for &ldquo;{q}&rdquo;. Try a different word or browse the categories.
            </div>
          ) : (
            hits.map((hit, i) => {
              const cat = CATEGORY_BY_SLUG[hit.article.categorySlug]
              return (
                <button
                  key={hit.article.slug}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => selectHit(hit)}
                  className={`w-full text-left p-3 border-b last:border-b-0 border-gray-100 dark:border-zinc-800 transition-colors ${
                    i === active ? 'bg-[#F6F2EA] dark:bg-zinc-800' : 'hover:bg-gray-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {hit.article.title}
                    </div>
                    <span className="text-[10px] uppercase tracking-wide text-[#C2A46D] font-semibold shrink-0">
                      {cat?.title}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {hit.snippet}
                  </div>
                  {i === active && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1.5">
                      <CornerDownLeft className="w-3 h-3" /> Enter
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
