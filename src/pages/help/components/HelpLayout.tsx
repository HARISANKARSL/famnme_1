import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { useAuthStore } from '@/store/authStore'
import { HelpSidebar } from './HelpSidebar'
import { HelpSearchBox } from './HelpSearchBox'

interface Props {
  /** When true, wraps in AppShell for authenticated users; otherwise shows a slim public header. */
  children: ReactNode
  /** Whether to render the left sidebar (hide on the hub). */
  showSidebar?: boolean
  activeCategory?: string
  activeArticle?: string
  /** Whether to render the compact search box in the header. */
  showHeaderSearch?: boolean
}

/**
 * HelpLayout is route-level: HelpHomePage, HelpCategoryPage, HelpArticlePage
 * all wrap their content here. Chooses AppShell (authenticated) vs a slim
 * public header (anonymous) based on useAuthStore.
 */
export function HelpLayout({
  children,
  showSidebar = true,
  activeCategory,
  activeArticle,
  showHeaderSearch = true,
}: Props) {
  const user = useAuthStore(s => s.user)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const inner = (
    <div className="min-h-full bg-[#F6F2EA] dark:bg-zinc-950">
      {/* Slim top bar (only for anonymous users — authenticated users get AppShell's sidebar). */}
      {!user && <PublicHeader showSearch={showHeaderSearch} />}

      <div className={`max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 ${showSidebar ? '' : ''}`}>
        <div
          className={`grid grid-cols-1 gap-6 md:gap-8 ${
            showSidebar ? 'md:grid-cols-[240px_minmax(0,1fr)]' : ''
          }`}
        >
          {showSidebar && (
            <>
              {/* Mobile sidebar toggle */}
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="md:hidden flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 font-medium py-2"
                aria-label="Open help navigation"
              >
                <Menu className="w-4 h-4" /> Browse categories
              </button>

              {/* Desktop sidebar */}
              <aside className="hidden md:block sticky top-6 self-start max-h-[calc(100vh-3rem)] overflow-y-auto">
                <HelpSidebar activeCategory={activeCategory} activeArticle={activeArticle} />
              </aside>

              {/* Mobile sidebar drawer */}
              {mobileSidebarOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                  <div
                    className="absolute inset-0 bg-black/40"
                    onClick={() => setMobileSidebarOpen(false)}
                  />
                  <div className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-white dark:bg-zinc-900 p-4 overflow-y-auto shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-semibold text-gray-900 dark:text-white">Help</span>
                      <button
                        type="button"
                        onClick={() => setMobileSidebarOpen(false)}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800"
                        aria-label="Close"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <HelpSidebar activeCategory={activeCategory} activeArticle={activeArticle} />
                  </div>
                </div>
              )}
            </>
          )}
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [activeCategory, activeArticle])

  if (user) {
    return <AppShell>{inner}</AppShell>
  }
  return inner
}

function PublicHeader({ showSearch }: { showSearch: boolean }) {
  return (
    <header className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center gap-4">
        <Link to="/" className="font-semibold text-[#2F3E8F] dark:text-white text-lg">
          FamNme
        </Link>
        <Link to="/help" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
          Help Center
        </Link>
        {showSearch && (
          <div className="flex-1 max-w-md ml-auto hidden md:block">
            <HelpSearchBox variant="compact" />
          </div>
        )}
        <Link
          to="/login"
          className="ml-auto md:ml-0 text-sm font-medium text-[#2F3E8F] dark:text-white hover:underline"
        >
          Sign in
        </Link>
      </div>
    </header>
  )
}
