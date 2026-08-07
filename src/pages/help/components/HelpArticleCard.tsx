import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { HelpArticle } from '../content/types'

interface Props {
  article: HelpArticle
  variant?: 'row' | 'compact'
}

export function HelpArticleCard({ article, variant = 'row' }: Props) {
  const href = `/help/${article.categorySlug}/${article.slug}`
  if (variant === 'compact') {
    return (
      <Link
        to={href}
        className="group block p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-[#C2A46D] hover:shadow-sm transition-all"
      >
        <h4 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-1">
          {article.title}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
          {article.description}
        </p>
      </Link>
    )
  }
  return (
    <Link
      to={href}
      className="group flex items-start justify-between gap-4 px-5 py-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-[#C2A46D] hover:shadow-sm transition-all"
    >
      <div className="min-w-0">
        <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-[#2F3E8F] dark:group-hover:text-white transition-colors">
          {article.title}
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
          {article.description}
        </p>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#2F3E8F] dark:group-hover:text-white shrink-0 mt-1 transition-colors" />
    </Link>
  )
}
