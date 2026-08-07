import { create } from 'zustand'
import { API_BASE_URL } from '@/config/api'

interface AdminUser {
  email: string
}

interface AdminState {
  admin: AdminUser | null
  adminToken: string | null
  loading: boolean
  adminLogin: (email: string, password: string) => Promise<void>
  adminLogout: () => void
  checkAdminSession: () => Promise<void>
}

const ADMIN_TOKEN_KEY = 'admin_token'

// Single BroadcastChannel instance to prevent self-broadcast issues (M14)
const adminBroadcastChannel = typeof window !== 'undefined' ? new BroadcastChannel('admin_logout') : null

export const useAdminStore = create<AdminState>((set) => ({
  admin: null,
  adminToken: null,
  loading: false,

  adminLogin: async (email: string, password: string) => {
    set({ loading: true })
    try {
      const res = await fetch(`${API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Admin login failed')
      sessionStorage.setItem(ADMIN_TOKEN_KEY, data.token)
      set({ admin: data.admin, adminToken: data.token, loading: false })
    } catch (err) {
      set({ loading: false })
      throw err
    }
  },

  adminLogout: () => {
    console.log("[adminStore] Initiating adminLogout flow...");
    sessionStorage.removeItem(ADMIN_TOKEN_KEY)
    console.log("[adminStore] Admin token removed from sessionStorage.");
    set({ admin: null, adminToken: null })
    console.log("[adminStore] Admin state cleared in store.");
    // M14: Broadcast logout to other tabs
    if (adminBroadcastChannel) {
      try {
        console.log("[adminStore] Broadcasting admin_logout event to other tabs...");
        adminBroadcastChannel.postMessage('logout')
      } catch (e) {
        console.warn("[adminStore] Failed to broadcast admin_logout event:", e);
      }
    }
  },

  checkAdminSession: async () => {
    const token = sessionStorage.getItem(ADMIN_TOKEN_KEY)
    if (!token) {
      set({ admin: null, adminToken: null })
      return
    }
    try {
      const res = await fetch(`${API_BASE_URL}/admin/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('invalid')
      const data = await res.json()
      set({ admin: { email: data.email }, adminToken: token })
    } catch {
      sessionStorage.removeItem(ADMIN_TOKEN_KEY)
      set({ admin: null, adminToken: null })
    }
  },
}))

// M14: Cross-tab admin logout sync
if (adminBroadcastChannel) {
  adminBroadcastChannel.addEventListener('message', (e) => {
    if (e.data === 'logout') {
      console.log("[adminStore] Received 'logout' message via BroadcastChannel (admin_logout). Syncing admin logout state...");
      sessionStorage.removeItem(ADMIN_TOKEN_KEY)
      useAdminStore.setState({ admin: null, adminToken: null })
      console.log("[adminStore] Admin logout state synchronized locally in this tab.");
    }
  })
}
