/**
 * Session continuity — Phase 3 / 6.10 + 6.11
 *
 * Tracks the user's last-viewed person and last view per tree so:
 *   - The canvas can open on the last-viewed person (not just home).
 *   - The dashboard can show a "Continue where you left off" nudge.
 *
 * State lives in localStorage (per-device) — no server roundtrip needed
 * for what is essentially UX glue.
 */
const KEY = 'fc_session_continuity_v1'

export type SessionView =
  | { kind: 'home' }
  | { kind: 'tree'; treeId: string; personId?: string; personName?: string }
  | { kind: 'memories'; treeId: string; personId?: string; personName?: string }
  | { kind: 'profile'; treeId: string; personId: string; personName?: string }

export interface SessionState {
  /** The last view the user was on, across all trees. */
  lastView?: SessionView
  /** Per-tree last-viewed person — used by the canvas to choose focus. */
  lastViewedPersonByTree?: Record<string, { personId: string; personName?: string; at: number }>
  /** Per-tree last-touched person — used to surface "you last viewed X". */
  lastEditedPersonByTree?: Record<string, { personId: string; personName?: string; at: number }>
  updatedAt?: number
}

function load(): SessionState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as SessionState
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch { return {} }
}

function save(s: SessionState) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...s, updatedAt: Date.now() }))
  } catch { /* quota — ignore */ }
}

export function recordView(view: SessionView) {
  const s = load()
  s.lastView = view
  if ((view.kind === 'tree' || view.kind === 'memories' || view.kind === 'profile') && view.personId) {
    s.lastViewedPersonByTree = {
      ...(s.lastViewedPersonByTree || {}),
      [view.treeId]: {
        personId: view.personId,
        personName: 'personName' in view ? view.personName : undefined,
        at: Date.now(),
      },
    }
  }
  save(s)
}

export function recordEdit(treeId: string, personId: string, personName?: string) {
  const s = load()
  s.lastEditedPersonByTree = {
    ...(s.lastEditedPersonByTree || {}),
    [treeId]: { personId, personName, at: Date.now() },
  }
  save(s)
}

export function getLastViewedPerson(treeId: string): { personId: string; personName?: string; at: number } | null {
  const s = load()
  return s.lastViewedPersonByTree?.[treeId] ?? null
}

export function getLastView(): SessionView | null {
  return load().lastView ?? null
}

/**
 * Returns the most recent person interaction across viewed/edited tracks
 * for surfacing in a "you last viewed X" line on the dashboard.
 */
export function getLastTouchedPerson(treeId: string): { personId: string; personName?: string; at: number } | null {
  const s = load()
  const v = s.lastViewedPersonByTree?.[treeId]
  const e = s.lastEditedPersonByTree?.[treeId]
  if (!v && !e) return null
  if (!v) return e!
  if (!e) return v
  return v.at >= e.at ? v : e
}
