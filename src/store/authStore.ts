import { create } from 'zustand'
import { getAuthToken, setAuthToken, clearAuthToken, getCachedUser, setCachedUser, isTokenExpired } from '@/lib/auth'
import { API_BASE_URL } from '@/config/api'
import { userApi } from '@/api/endpoints'
import { trackEvent, trackUserRetention, setAnalyticsUserId } from '@/services/firebase/analytics.service'

export interface AppUser {
  id: string
  email: string
  fullName: string
  avatarUrl?: string | null
  emailVerified?: boolean
}

export interface TwoFactorResponse {
  requires2FA: true
  tempToken: string
  maskedEmail: string
}

interface AuthState {
  user: AppUser | null
  token: string | null
  loading: boolean
  setUser: (user: AppUser | null) => void
  signIn: (mode?: string, searchParams?: string) => Promise<TwoFactorResponse | null>
  verify2FA: (tempToken: string, code: string) => Promise<void>
  resend2FACode: (tempToken: string) => Promise<{ maskedEmail: string }>
  signUp: (email: string, password: string, fullName: string, captchaToken?: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  checkSession: () => Promise<void>
}

// Pre-hydrate from localStorage so the first render frame has user data
const _initToken = getAuthToken()
const _initCached = _initToken && !isTokenExpired(_initToken) ? getCachedUser() : null
const _initUser = _initCached as unknown as AppUser | null
// If we have a cached user + valid token, start with loading=false (no spinner)
const _initLoading = !(_initUser && _initToken)

// Single BroadcastChannel instance to prevent self-broadcast issues (M14)
const authBroadcastChannel = typeof window !== 'undefined' ? new BroadcastChannel('auth_logout') : null

function getAppUrl(): string {
  const host = (window.location.hostname || '').toLowerCase();

  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0'
  ) {
    return 'http://localhost:3000';
  }

  if (host.indexOf('test') !== -1) {
    return 'https://dev-app-test.familyaconnect.com/';
  }

  if (host.indexOf('dev') !== -1) {
    return 'https://dev-app.familyaconnect.com/';
  }

  if (
    host.indexOf('famnme.com') !== -1 ||
    host.indexOf('auth-internal.famnme.com') !== -1
  ) {
    return 'https://famnme.com/';
  }

  return 'https://dev-app.familyaconnect.com/';
}

export const useAuthStore = create<AuthState>((set) => ({
  user: _initUser,
  token: _initUser ? _initToken : null,
  loading: _initLoading,
  setUser: (user) => set({ user, loading: false }),

  signIn: async (mode?: string, searchParams?: string) => {
    // Redirect to Keycloak login/registration page
    const keycloak = await import('@/services/keycloak').then(m => m.default);
    let baseUrl = getAppUrl();
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    const redirectUri = baseUrl + '/login' + (searchParams || '');
    
    if (mode === 'register') {
      sessionStorage.setItem('auth_mode', 'register');
      trackEvent('sign_up_started', { method: 'keycloak' });
      await keycloak.register({ redirectUri });
    } else {
      sessionStorage.setItem('auth_mode', 'login');
      await keycloak.login({ redirectUri });
    }
    return null;
  },

  signOut: async () => {
    console.log("[authStore] Initiating signOut flow...");
    set({ loading: true }); // Prevent route redirects by entering loading state
    
    // Track logout event
    trackEvent('logout', { user_type: 'regular' });
    setAnalyticsUserId(null);

    const { logout } = await import('@/services/keycloak').then(m => ({ logout: () => m.default.logout() }));
    clearAuthToken();
    console.log("[authStore] Auth token cleared.");
    localStorage.removeItem('webview_mode');
    console.log("[authStore] webview_mode removed from localStorage.");
    sessionStorage.removeItem('preferredLanguages');
    console.log("[authStore] preferredLanguages removed from sessionStorage.");

    // Broadcast logout to other tabs
    if (authBroadcastChannel) {
      try {
        console.log("[authStore] Broadcasting auth_logout event to other tabs...");
        authBroadcastChannel.postMessage('logout');
      } catch (e) {
        console.warn("[authStore] Failed to broadcast auth_logout event:", e);
      }
    }

    console.log("[authStore] Calling Keycloak logout redirect...");
    logout();
  },

  resetPassword: async (email: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to send reset email')
  },

  checkSession: async () => {
    const token = getAuthToken()
    if (!token || isTokenExpired(token)) {
      clearAuthToken()
      set({ user: null, token: null, loading: false })
      return
    }

    try {
      // Decode token to get user info locally - avoid unwanted API calls
      const payload = JSON.parse(atob(token.split('.')[1]))
      
      const userData: AppUser = {
        id: payload.sub,
        email: payload.email || payload.preferred_username,
        fullName: payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim() || 'User',
        emailVerified: payload.email_verified,
        avatarUrl: payload.picture || null
      }

      setCachedUser(userData as unknown as Record<string, unknown>)
      set({ user: userData, token, loading: false })

      // Track retention metrics for the authenticated user
      trackUserRetention(userData.id);

      // Background-fetch preferences to set in sessionStorage (e.g. after silent login or token refresh)
      const cached = sessionStorage.getItem('preferredLanguages')
      if (!cached && userData.id) {
        fetch(`${API_BASE_URL}${userApi.exploreRootsUser}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        .then(res => {
          if (res.ok) return res.json();
          if (res.status === 404) {
            return fetch(`${API_BASE_URL}${userApi.exploreRootsUserFallback}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }).then(r => r.ok ? r.json() : null);
          }
          return null;
        })
        .then(resBody => {
          if (resBody) {
            const rawLangs = resBody?.data?.feedLanguagePreference ?? resBody?.feedLanguagePreference;
            if (Array.isArray(rawLangs) && rawLangs.length > 0) {
              const langsWithEnglish = rawLangs.includes('english') ? rawLangs : ['english', ...rawLangs];
              sessionStorage.setItem('preferredLanguages', JSON.stringify(langsWithEnglish));
              // Dispatch event to let the guard know that languages are cached
              window.dispatchEvent(new Event('tree-created'));
            }
          }
        })
        .catch(err => console.warn('Failed to auto-fetch language preferences on session check:', err));
      }
    } catch (err) {
      console.error('Error decoding token:', err)
      // On error, try to use cached user if available
      const cached = getCachedUser()
      if (cached) {
        set({ user: cached as unknown as AppUser, token, loading: false })
      } else {
        set({ user: null, token: null, loading: false })
      }
    }
  },
}))

// M14: Cross-tab logout sync — receive logout broadcast from other tabs
if (authBroadcastChannel) {
  authBroadcastChannel.addEventListener('message', (e) => {
    if (e.data === 'logout') {
      console.log("[authStore] Received 'logout' message via BroadcastChannel (auth_logout). Syncing logout state...");
      clearAuthToken()
      sessionStorage.removeItem('preferredLanguages')
      useAuthStore.setState({ user: null, token: null })
      console.log("[authStore] Logout state synchronized locally in this tab.");
    }
  })
}
