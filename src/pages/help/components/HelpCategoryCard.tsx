import { Link } from 'react-router-dom'
import { Rocket, TreePine, Users, BookHeart, Share2, Compass, ShieldCheck, type LucideIcon } from 'lucide-react'
import type { HelpCategory, CategoryIconName } from '../content/types'

const ICONS: Record<CategoryIconName, LucideIcon> = {
  Rocket,
  TreePine,
  Users,
  BookHeart,
  Share2,
  Compass,
  ShieldCheck,
}

interface Props {
  category: HelpCategory
  articleCount: number
}

export function HelpCategoryCard({ category, articleCount }: Props) {
  const Icon = ICONS[category.iconName]
  return (
    <Link
      to={`/help/${category.slug}`}
      className="group relative block p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 hover:border-[#C2A46D] dark:hover:border-[#C2A46D] hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-[#F6F2EA] dark:bg-zinc-800 flex items-center justify-center shrink-0 group-hover:bg-[#C2A46D]/20 transition-colors">
          <Icon className="w-5 h-5 text-[#2F3E8F] dark:text-[#C2A46D]" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white text-base">
            {category.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
            {category.description}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            {articleCount} {articleCount === 1 ? 'article' : 'articles'}
          </p>
        </div>
      </div>
    </Link>
  )
}
