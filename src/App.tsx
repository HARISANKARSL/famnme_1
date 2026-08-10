import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { Component, Suspense, lazy, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { registerServiceWorker } from '@/utils/registerSW'

// Register service worker for PWA / offline support (production only)
registerServiceWorker();

// Lazy-load route pages for smaller initial bundle
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const SsoCallbackPage = lazy(() => import('@/pages/SsoCallbackPage').then(m => ({ default: m.SsoCallbackPage })));
const AdminLoginPage = lazy(() => import('@/pages/AdminLoginPage').then(m => ({ default: m.AdminLoginPage })));
const AdminPage = lazy(() => import('@/pages/AdminPage').then(m => ({ default: m.AdminPage })));
const ClaimLandingPage = lazy(() => import('@/pages/ClaimLandingPage').then(m => ({ default: m.ClaimLandingPage })));
const PublicLandingPage = lazy(() => import('@/pages/PublicLandingPage').then(m => ({ default: m.PublicLandingPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const TreesPage = lazy(() => import('@/pages/TreesPage').then(m => ({ default: m.TreesPage })));
const VerifyEmailPage = lazy(() => import('@/pages/VerifyEmailPage').then(m => ({ default: m.VerifyEmailPage })));
const InsightsPage = lazy(() => import('@/pages/InsightsPage').then(m => ({ default: m.InsightsPage })));
const HeritageHubPage = lazy(() => import('@/pages/HeritageHubPage').then(m => ({ default: m.HeritageHubPage })));
const MigrationMapPage = lazy(() => import('@/pages/MigrationMapPage').then(m => ({ default: m.MigrationMapPage })));
const SacredPlacesPage = lazy(() => import('@/pages/heritage/SacredPlacesPage').then(m => ({ default: m.SacredPlacesPage })));
const FestivalsPage = lazy(() => import('@/pages/heritage/FestivalsPage').then(m => ({ default: m.FestivalsPage })));
const RootsLineagePage = lazy(() => import('@/pages/heritage/RootsLineagePage').then(m => ({ default: m.RootsLineagePage })));
const AllPeoplePage = lazy(() => import('@/pages/AllPeoplePage').then(m => ({ default: m.AllPeoplePage })));
const TodayOnYourTreePage = lazy(() => import('@/pages/TodayOnYourTreePage').then(m => ({ default: m.TodayOnYourTreePage })));
const HelpHomePage = lazy(() => import('@/pages/help/HelpHomePage').then(m => ({ default: m.HelpHomePage })));
const HelpCategoryPage = lazy(() => import('@/pages/help/HelpCategoryPage').then(m => ({ default: m.HelpCategoryPage })));
const HelpArticlePage = lazy(() => import('@/pages/help/HelpArticlePage').then(m => ({ default: m.HelpArticlePage })));

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Toaster } from '@/components/ui/toaster'
import { useAdminStore } from '@/store/adminStore'
import { useAuthStore } from '@/store/authStore'
import { PlatformChatAssistant } from '@/components/chat/PlatformChatAssistant'
import { KeyboardShortcutsPanel } from '@/components/ui/KeyboardShortcutsPanel'
import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner'
import { LanguagePreferenceGuard } from '@/components/auth/LanguagePreferenceGuard'

// Minimal loading fallback for lazy-loaded routes
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#F6F2EA]">
    <div className="w-8 h-8 border-3 border-[#2F3E8F] border-t-transparent rounded-full animate-spin" />
  </div>
);

// ============================================================================
// AdminProtectedRoute — C6: prevent unauthenticated access to admin dashboard
// ============================================================================
function AdminProtectedRoute({ children }: { children: ReactNode }) {
  const adminToken = useAdminStore((s) => s.adminToken)
  // Also check sessionStorage directly so a page refresh doesn't log out the admin
  const hasStoredToken = Boolean(sessionStorage.getItem('admin_token'))
  if (!adminToken && !hasStoredToken) return <Navigate to="/admin" replace />
  return <>{children}</>
}

// ============================================================================
// ErrorBoundary — M12: catch render errors instead of blank white screen
// Auto-retries once for dynamic import failures (Vite HMR/dep cache issues)
// ============================================================================
interface ErrorBoundaryState { hasError: boolean; retried: boolean }
class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, retried: false }
  }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('Render error caught by ErrorBoundary:', error, info)

    // Log screen_error analytics event
    trackEvent("screen_error", { screen: window.location.pathname });

    // Auto-reload ONLY for stale chunk / dynamic import failures
    const msg = error.message || '';
    const isStaleChunkError =
      msg.includes('dynamically imported module') ||
      msg.includes('Outdated Optimize Dep');

    if (isStaleChunkError && !this.state.retried) {
      console.warn('Stale chunk detected, hard-reloading...')
      this.setState({ retried: true })
      // Clear module cache and force a fresh load
      if ('caches' in window) {
        caches.keys().then(names => names.forEach(n => caches.delete(n)));
      }
      setTimeout(() => window.location.reload(), 300)
      return
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-sky-50">
          <div className="text-center space-y-3 p-8">
            <h2 className="text-xl font-semibold text-gray-800">Something went wrong</h2>
            <p className="text-sm text-gray-500">Please refresh the page to try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm hover:bg-sky-700"
            >
              Refresh
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}


// Legacy /FC-familytree path redirects to beta.famnme.com (handled by server-side redirect)
const runtimeBasename = window.location.pathname.startsWith('/FC-familytree')
  ? '/FC-familytree'
  : '/';

/**
 * Show the AI chat assistant globally for any authenticated user.
 */
function AuthenticatedChat() {
  const user = useAuthStore(s => s.user)
  if (!user) return null
  return <PlatformChatAssistant />
}

/**
 * PersonProfileRedirect — C11: bookmarkable /person/:id route. Forwards to
 * the dashboard's existing hash-based profile overlay so the URL is shareable.
 */
function PersonProfileRedirect() {
  const { personId } = useParams<{ personId: string }>()
  if (!personId) return <Navigate to="/dashboard" replace />
  return <Navigate to={`/dashboard#person/${personId}`} replace />
}

/**
 * A1 — Root route. Authenticated users go to /dashboard; anonymous users see
 * the public marketing landing. While the session is still resolving we render
 * nothing (prevents a landing-page flash for returning users).
 */
function RootRoute() {
  const user = useAuthStore(s => s.user)
  const loading = useAuthStore(s => s.loading)
  const checkSession = useAuthStore(s => s.checkSession)
  // KeycloakProvider handles the initial session check

  if (loading) return <PageLoader />
  if (user) return <Navigate to="/dashboard" replace />
  return <PublicLandingPage />
}

/**
 * Session inactivity timer — 4.14:
 * - Default 2h idle timeout (up from 30min) for trusted devices
 * - Warn at T-5min with gentle "Tap to stay" copy
 * - "Remember for 30 days" at login disables auto-logout on this device
 *   (checks localStorage key 'trustedDevice' set by LoginPage)
 */
const IDLE_TIMEOUT_MIN = 120      // 2 hours
const IDLE_WARN_MIN = 115      // warn 5 min before

function SessionTimeoutGuard() {
  const user = useAuthStore(s => s.user)
  const signOut = useAuthStore(s => s.signOut)
  const lastActivity = useRef(Date.now())
  const warningRef = useRef<HTMLDivElement | null>(null)

  const resetTimer = useCallback(() => {
    lastActivity.current = Date.now()
    // Clear any warning toast when the user returns
    if (warningRef.current) {
      warningRef.current.remove()
      warningRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!user) return

    // Trusted device opts out of idle logout entirely (4.14) — 30 day expiry ttt
    const trusted = localStorage.getItem('trustedDevice') === '1'
    const expiry = Number(localStorage.getItem('trustedDeviceExpiry') || '0')
    if (trusted && expiry && Date.now() < expiry) return
    if (trusted && expiry && Date.now() >= expiry) {
      // Expired — clean up and fall through to normal timeout
      localStorage.removeItem('trustedDevice')
      localStorage.removeItem('trustedDeviceExpiry')
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))

    const interval = setInterval(() => {
      const idleMin = (Date.now() - lastActivity.current) / 60000
      if (idleMin >= IDLE_WARN_MIN && !warningRef.current) {
        const toast = document.createElement('div')
        toast.innerHTML = `
          <span>We'll sign you out soon to keep your account safe.</span>
          <button style="margin-left:12px;background:#fff;color:#2F3E8F;border:none;padding:6px 12px;border-radius:6px;font-weight:600;font-size:13px;cursor:pointer;">Stay signed in</button>
        `
        toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9999;background:#2F3E8F;color:#fff;padding:12px 16px;border-radius:10px;font-size:14px;font-weight:500;box-shadow:0 8px 24px rgba(47,62,143,0.25);display:flex;align-items:center;gap:8px;'
        toast.querySelector('button')?.addEventListener('click', () => {
          resetTimer()
        })
        document.body.appendChild(toast)
        warningRef.current = toast
      }
      if (idleMin >= IDLE_TIMEOUT_MIN) {
        signOut()
        window.location.href = `${runtimeBasename === '/' ? '' : runtimeBasename}/login`
      }
    }, 30000)

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      clearInterval(interval)
      if (warningRef.current) { warningRef.current.remove(); warningRef.current = null }
    }
  }, [user, signOut, resetTimer])

  return null
}

import { ThemeProvider } from '@/contexts/ThemeContext'
import { trackEvent, trackUserRetention } from './services/firebase/analytics.service';

function App() {
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    trackEvent("app_open");
    trackUserRetention(user?.id);

    const handleWindowError = (event: ErrorEvent) => {
      if (!event.error) return;
      trackEvent("app_crash", {
        screen: window.location.pathname,
        message: event.message || event.error.message || "Unknown error"
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackEvent("app_crash", {
        screen: window.location.pathname,
        reason: String(event.reason || "Unhandled Promise Rejection")
      });
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    if (user?.id) {
      trackUserRetention(user.id);
    }
  }, [user?.id]);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <TooltipProvider delayDuration={300} skipDelayDuration={100}>
          <BrowserRouter basename={runtimeBasename}>
            {/* Skip-to-content link (WCAG 2.1 AA — Bypass Blocks) */}
            {/* <a href="#main-content" className="skip-to-content">Skip to main content</a> */}
            {/* F2 — admin impersonation banner (only renders when token has impersonatedBy claim) */}
            <ImpersonationBanner />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/invite/:invitationId" element={<ClaimLandingPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/sso-callback" element={<SsoCallbackPage />} />
                <Route path="/admin" element={<AdminLoginPage />} />
                <Route
                  path="/admin/dashboard"
                  element={
                    <AdminProtectedRoute>
                      <AdminPage />
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/trees"
                  element={
                    <ProtectedRoute>
                      <TreesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/insights"
                  element={
                    <ProtectedRoute>
                      <InsightsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/heritage"
                  element={
                    <ProtectedRoute>
                      <HeritageHubPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/migration"
                  element={
                    <ProtectedRoute>
                      <MigrationMapPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/heritage/sacred"
                  element={
                    <ProtectedRoute>
                      <SacredPlacesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/heritage/festivals"
                  element={
                    <ProtectedRoute>
                      <FestivalsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/heritage/roots"
                  element={
                    <ProtectedRoute>
                      <RootsLineagePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/people"
                  element={
                    <ProtectedRoute>
                      <AllPeoplePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/today"
                  element={
                    <ProtectedRoute>
                      <TodayOnYourTreePage />
                    </ProtectedRoute>
                  }
                />
                {/* Help Center — public, works for both anonymous and authenticated users */}
                <Route path="/help" element={<HelpHomePage />} />
                <Route path="/help/:categorySlug" element={<HelpCategoryPage />} />
                <Route path="/help/:categorySlug/:articleSlug" element={<HelpArticlePage />} />
                <Route path="/" element={<RootRoute />} />
                {/* Path-based sub-routes redirect to hash-based views in DashboardPage */}
                <Route path="/dashboard/temples" element={<Navigate to="/dashboard#temples" replace />} />
                <Route path="/dashboard/memories" element={<Navigate to="/dashboard#memories" replace />} />
                <Route path="/dashboard/treeoverview" element={<Navigate to="/dashboard#treeoverview" replace />} />
                {/* C10 — bookmarkable hub routes; dashboard host renders the panel via hash. */}
                <Route path="/memories" element={<Navigate to="/dashboard#memories" replace />} />
                <Route path="/temples" element={<Navigate to="/dashboard#temples" replace />} />
                <Route path="/overview" element={<Navigate to="/dashboard#treeoverview" replace />} />
                {/* Bookmarkable person-profile route (C11) — forwards to dashboard hash view. */}
                <Route path="/person/:personId" element={<PersonProfileRedirect />} />
                {/* Catch-all route: show 404 page for unknown paths */}
                <Route path="*" element={
                  <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] dark:bg-[#0a0a0a] transition-colors duration-200">
                    <div className="text-center space-y-4 p-8 max-w-md">
                      <h2 className="text-3xl font-bold font-display text-[#3D2E1F] dark:text-[#F3F2F1]">404 — Page not found</h2>
                      <p className="text-sm text-[#8B7355] dark:text-[#A0A0A0] leading-relaxed">The page you're looking for doesn't exist or has been moved.</p>
                      <div className="pt-2">
                        <a href={`${runtimeBasename === '/' ? '/' : runtimeBasename + '/'}dashboard`}
                          className="px-5 py-2.5 bg-[#2F3E8F] hover:bg-[#2F3E8F]/90 dark:bg-[#8CA0FF] dark:hover:bg-[#8CA0FF]/90 text-white dark:text-[#0a0a0a] rounded-xl text-xs font-semibold shadow-sm transition-all inline-flex items-center justify-center">
                          Go to Dashboard
                        </a>
                      </div>
                    </div>
                  </div>
                } />
              </Routes>
            </Suspense>
            <Toaster />
            {/* <AuthenticatedChat /> */}
            <SessionTimeoutGuard />
            <KeyboardShortcutsPanel />
            <LanguagePreferenceGuard />
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
