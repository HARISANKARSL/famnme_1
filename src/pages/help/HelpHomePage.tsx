import { useEffect } from 'react'
import { HelpLayout } from './components/HelpLayout'
import { HelpSearchBox } from './components/HelpSearchBox'
import { HelpCategoryCard } from './components/HelpCategoryCard'
import { HelpArticleCard } from './components/HelpArticleCard'
import { HELP_CATEGORIES, ARTICLES_BY_CATEGORY, getPopularArticles } from './content'

export function HelpHomePage() {
  useEffect(() => { document.title = 'Help Center — FamNme' }, [])
  const popular = getPopularArticles()

  return (
    <HelpLayout showSidebar={false} showHeaderSearch={false}>
      {/* Hero */}
      <section className="text-center py-8 md:py-14">
        <h1 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
          How can we help?
        </h1>
        <p className="mt-3 text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
          Search or browse guides for every part of FamNme — building your tree, inviting family, keeping memories safe.
        </p>
        <div className="mt-7 max-w-xl mx-auto px-2">
          <HelpSearchBox variant="hero" autoFocus />
        </div>
      </section>

      {/* Category grid */}
      <section aria-labelledby="categories-heading" className="mt-4">
        <h2 id="categories-heading" className="sr-only">Browse by topic</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {HELP_CATEGORIES.map(cat => (
            <HelpCategoryCard
              key={cat.slug}
              category={cat}
              articleCount={(ARTICLES_BY_CATEGORY[cat.slug] ?? []).length}
            />
          ))}
        </div>
      </section>

      {/* Popular */}
      {popular.length > 0 && (
        <section aria-labelledby="popular-heading" className="mt-12 md:mt-16">
          <h2 id="popular-heading" className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Popular articles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {popular.map(a => (
              <HelpArticleCard key={a.slug} article={a} variant="compact" />
            ))}
          </div>
        </section>
      )}
    </HelpLayout>
  )
}
