import { Link, useLocation } from 'react-router-dom'
import { HELP_CATEGORIES, ARTICLES_BY_CATEGORY } from '../content'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

interface Props {
  activeCategory?: string
  activeArticle?: string
}

export function HelpSidebar({ activeCategory, activeArticle }: Props) {
  const location = useLocation()
  const initiallyOpen = new Set([activeCategory].filter(Boolean) as string[])
  const [open, setOpen] = useState<Set<string>>(initiallyOpen)

  function toggle(slug: string) {
    setOpen(prev => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  return (
    <nav className="text-sm" aria-label="Help categories">
      <Link
        to="/help"
        className={`block px-3 py-2 rounded-lg font-semibold transition-colors ${
          location.pathname === '/help'
            ? 'bg-[#F6F2EA] text-[#2F3E8F] dark:bg-zinc-800 dark:text-white'
            : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-zinc-800/50'
        }`}
      >
        Help home
      </Link>

      <div className="mt-3 space-y-0.5">
        {HELP_CATEGORIES.map(cat => {
          const isOpen = open.has(cat.slug)
          const isActive = activeCategory === cat.slug
          const articles = ARTICLES_BY_CATEGORY[cat.slug] ?? []
          return (
            <div key={cat.slug}>
              <div className="flex items-stretch">
                <Link
                  to={`/help/${cat.slug}`}
                  className={`flex-1 px-3 py-2 rounded-l-lg truncate transition-colors ${
                    isActive
                      ? 'text-[#2F3E8F] dark:text-white font-medium'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  {cat.title}
                </Link>
                <button
                  type="button"
                  onClick={() => toggle(cat.slug)}
                  aria-expanded={isOpen}
                  aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${cat.title}`}
                  className="px-2 rounded-r-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-zinc-800/50"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                </button>
              </div>
              {isOpen && articles.length > 0 && (
                <ul className="ml-3 border-l border-gray-200 dark:border-zinc-700 pl-2 my-1 space-y-0.5">
                  {articles.map(a => {
                    const isCurrent = activeCategory === cat.slug && activeArticle === a.slug
                    return (
                      <li key={a.slug}>
                        <Link
                          to={`/help/${cat.slug}/${a.slug}`}
                          aria-current={isCurrent ? 'page' : undefined}
                          className={`block px-3 py-1.5 rounded-md text-[13px] truncate transition-colors ${
                            isCurrent
                              ? 'bg-[#F6F2EA] text-[#2F3E8F] dark:bg-zinc-800 dark:text-white font-medium'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-zinc-800/50 dark:hover:text-white'
                          }`}
                        >
                          {a.title}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </nav>
  )
}
