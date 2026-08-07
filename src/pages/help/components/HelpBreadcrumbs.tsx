import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

interface Crumb {
  label: string
  to?: string
}

export function HelpBreadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1
        return (
          <div key={i} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
            {c.to && !last ? (
              <Link to={c.to} className="hover:text-[#2F3E8F] dark:hover:text-white truncate">
                {c.label}
              </Link>
            ) : (
              <span className={`truncate ${last ? 'text-gray-900 dark:text-white font-medium' : ''}`}>
                {c.label}
              </span>
            )}
          </div>
        )
      })}
    </nav>
  )
}
