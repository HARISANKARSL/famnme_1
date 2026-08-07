/**
 * passkeyService — A4 (WebAuthn passkeys client).
 *
 * Wraps the @simplewebauthn/browser helpers + our `/api/passkeys/*` routes.
 * Settings UI calls `registerPasskey()`; LoginPage calls
 * `loginWithPasskey()`. Both gracefully degrade if WebAuthn isn't available
 * via `isPasskeySupported()`.
 */
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser'
import { API_BASE_URL } from '@/config/api'
import { getAuthToken, setAuthToken } from '@/lib/auth'

export function isPasskeySupported(): boolean {
  return browserSupportsWebAuthn()
}

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getAuthToken()
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  })
}

export interface PasskeySummary {
  credentialId: string
  deviceName: string | null
  backedUp: boolean
  createdAt: string
  lastUsedAt: string | null
}

export async function listPasskeys(): Promise<PasskeySummary[]> {
  const r = await authedFetch('/passkeys')
  if (!r.ok) return []
  const data = await r.json() as { passkeys: PasskeySummary[] }
  return data.passkeys || []
}

export async function deletePasskey(credentialId: string): Promise<boolean> {
  const r = await authedFetch(`/passkeys/${encodeURIComponent(credentialId)}`, { method: 'DELETE' })
  return r.ok
}

/**
 * Walk the user through registering a new passkey on this device.
 * Throws on user cancellation or platform errors so the caller can show
 * an actionable message.
 */
export async function registerPasskey(deviceName?: string): Promise<{ credentialId: string }> {
  if (!isPasskeySupported()) {
    throw new Error('Your browser doesn\'t support passkeys')
  }
  const optionsRes = await authedFetch('/passkeys/register/options', { method: 'POST', body: '{}' })
  if (!optionsRes.ok) throw new Error('Failed to start passkey registration')
  const options = await optionsRes.json()
  const attResp = await startRegistration({ optionsJSON: options })
  const verifyRes = await authedFetch('/passkeys/register/verify', {
    method: 'POST',
    body: JSON.stringify({ ...attResp, deviceName }),
  })
  if (!verifyRes.ok) {
    const err = await verifyRes.json().catch(() => ({}))
    throw new Error(err.error || 'Registration failed')
  }
  const data = await verifyRes.json() as { credentialId: string }
  return { credentialId: data.credentialId }
}

/**
 * Sign in with a passkey. Returns a session JWT that the caller stashes
 * via `setAuthToken` (already done here).
 */
export async function loginWithPasskey(email: string): Promise<{ userId: string; email: string }> {
  if (!isPasskeySupported()) throw new Error('Your browser doesn\'t support passkeys')
  const optionsRes = await fetch(`${API_BASE_URL}/passkeys/authenticate/options`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!optionsRes.ok) {
    const err = await optionsRes.json().catch(() => ({}))
    throw new Error(err.error || 'No passkeys for this email')
  }
  const options = await optionsRes.json()
  const userId: string = options._userId
  const assertion = await startAuthentication({ optionsJSON: options })
  const verifyRes = await fetch(`${API_BASE_URL}/passkeys/authenticate/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...assertion, userId }),
  })
  if (!verifyRes.ok) {
    const err = await verifyRes.json().catch(() => ({}))
    throw new Error(err.error || 'Passkey login failed')
  }
  const data = await verifyRes.json() as { token: string; userId: string; email: string }
  setAuthToken(data.token)
  return { userId: data.userId, email: data.email }
}
