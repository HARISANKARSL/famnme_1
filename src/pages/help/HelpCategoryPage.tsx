import { useEffect } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { HelpLayout } from './components/HelpLayout'
import { HelpBreadcrumbs } from './components/HelpBreadcrumbs'
import { HelpArticleCard } from './components/HelpArticleCard'
import { HelpSearchBox } from './components/HelpSearchBox'
import { HelpContactCTA } from './components/HelpContactCTA'
import { CATEGORY_BY_SLUG, ARTICLES_BY_CATEGORY } from './content'

export function HelpCategoryPage() {
  const { categorySlug = '' } = useParams<{ categorySlug: string }>()
  const category = CATEGORY_BY_SLUG[categorySlug]

  useEffect(() => {
    if (category) document.title = `${category.title} — Help`
  }, [category])

  if (!category) {
    return <Navigate to="/help" replace />
  }

  const articles = ARTICLES_BY_CATEGORY[category.slug] ?? []

  return (
    <HelpLayout activeCategory={category.slug}>
      <div className="space-y-6">
        <HelpBreadcrumbs crumbs={[{ label: 'Help', to: '/help' }, { label: category.title }]} />

        <header>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            {category.title}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {category.description}
          </p>
        </header>

        <div className="max-w-md">
          <HelpSearchBox variant="compact" placeholder={`Search in ${category.title.toLowerCase()}…`} />
        </div>

        <div className="space-y-3">
          {articles.map(a => (
            <HelpArticleCard key={a.slug} article={a} />
          ))}
        </div>

        <HelpContactCTA />
      </div>
    </HelpLayout>
  )
}
