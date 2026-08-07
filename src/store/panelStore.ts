import { create } from 'zustand'

/**
 * Unified Panel Manager
 *
 * Replaces 30+ individual useState booleans in DashboardPage with a single
 * store that manages which panel is open and its context props.
 *
 * Rules:
 * - Only ONE panel open at a time
 * - Opening a new panel pushes the previous to history (for back navigation)
 * - Escape key or click-outside closes the active panel
 */

export type PanelId =
  | 'add-relative'
  | 'profile'
  | 'tree-management'
  | 'suggestions'
  | 'duplicate-detection'
  | 'bookmarks'
  | 'migration-map'
  | 'history'
  | 'activity'
  | 'pending-edits'
  | 'media-gallery'
  | 'timeline'
  | 'source'
  | 'descendancy'
  | 'dna'
  | 'all-people'
  | 'life-story'
  | 'comments'
  | 'statistics'
  | 'relationships'
  | 'astrology'

/** Panel-specific props passed when opening a panel */
export interface PanelProps {
  personId?: string | null
  personName?: string
  initialFilter?: Record<string, unknown>
}

interface PanelHistoryEntry {
  panelId: PanelId
  props: PanelProps
}

interface PanelState {
  activePanel: PanelId | null
  panelProps: PanelProps
  panelHistory: PanelHistoryEntry[]

  openPanel: (id: PanelId, props?: PanelProps) => void
  closePanel: () => void
  goBack: () => void
  closePanelIfActive: (id: PanelId) => void
}

export const usePanelStore = create<PanelState>((set, get) => ({
  activePanel: null,
  panelProps: {},
  panelHistory: [],

  openPanel: (id, props = {}) => {
    const { activePanel, panelProps: currentProps } = get()

    // If same panel with same props, do nothing
    if (activePanel === id) {
      // Update props if different
      set({ panelProps: props })
      return
    }

    // Push current panel to history (if one is open)
    const newHistory = activePanel
      ? [...get().panelHistory, { panelId: activePanel, props: currentProps }]
      : get().panelHistory

    set({
      activePanel: id,
      panelProps: props,
      panelHistory: newHistory,
    })
  },

  closePanel: () => {
    set({
      activePanel: null,
      panelProps: {},
      panelHistory: [],
    })
  },

  goBack: () => {
    const { panelHistory } = get()
    if (panelHistory.length === 0) {
      set({ activePanel: null, panelProps: {}, panelHistory: [] })
      return
    }

    const prev = panelHistory[panelHistory.length - 1]
    set({
      activePanel: prev.panelId,
      panelProps: prev.props,
      panelHistory: panelHistory.slice(0, -1),
    })
  },

  closePanelIfActive: (id) => {
    if (get().activePanel === id) {
      get().closePanel()
    }
  },
}))
