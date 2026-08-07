import { useEffect } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import { HelpLayout } from './components/HelpLayout'
import { HelpBreadcrumbs } from './components/HelpBreadcrumbs'
import { HelpTOC } from './components/HelpTOC'
import { HelpFeedback } from './components/HelpFeedback'
import { HelpContactCTA } from './components/HelpContactCTA'
import { HelpArticleCard } from './components/HelpArticleCard'
import { findArticle, getRelatedArticles, CATEGORY_BY_SLUG } from './content'

function formatUpdated(iso: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}-${mm}-${yy}`;
  } catch {
    return iso;
  }
}

export function HelpArticlePage() {
  const { categorySlug = '', articleSlug = '' } = useParams<{ categorySlug: string; articleSlug: string }>()
  const article = findArticle(categorySlug, articleSlug)
  const category = CATEGORY_BY_SLUG[categorySlug]

  useEffect(() => {
    if (article) document.title = `${article.title} — Help`
  }, [article])

  if (!article || !category) {
    return <Navigate to="/help" replace />
  }

  const related = getRelatedArticles(article)
  const showToc = article.wordCount >= 400 && article.headings.filter(h => h.level === 2).length >= 3

  return (
    <HelpLayout activeCategory={categorySlug} activeArticle={articleSlug}>
      <div className="flex gap-10">
        <article className="flex-1 min-w-0 space-y-6">
          <HelpBreadcrumbs
            crumbs={[
              { label: 'Help', to: '/help' },
              { label: category.title, to: `/help/${category.slug}` },
              { label: article.title },
            ]}
          />

          <header>
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
              {article.title}
            </h1>
            {article.description && (
              <p className="mt-3 text-base md:text-lg text-gray-600 dark:text-gray-400">
                {article.description}
              </p>
            )}
            {article.updated && (
              <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                Last updated {formatUpdated(article.updated)}
              </p>
            )}
          </header>

          <div className="help-article prose-help">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
              {article.body}
            </ReactMarkdown>
          </div>

          <HelpFeedback articleSlug={article.slug} categorySlug={article.categorySlug} />
          <HelpContactCTA articleTitle={article.title} />

          {related.length > 0 && (
            <section aria-labelledby="related-heading" className="pt-6">
              <h2 id="related-heading" className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Related articles
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {related.map(a => (
                  <HelpArticleCard key={a.slug} article={a} variant="compact" />
                ))}
              </div>
            </section>
          )}
        </article>

        {showToc && <HelpTOC headings={article.headings} />}
      </div>
    </HelpLayout>
  )
}
