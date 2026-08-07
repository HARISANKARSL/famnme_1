import { create } from 'zustand'
import { DEFAULT_PREVIEW_FIELDS, PREVIEW_FIELD_MAP } from '@/constants/previewFieldRegistry'

interface CollapsedBranches {
  [nodeId: string]: {
    ancestorsCollapsed: boolean
    descendantsCollapsed: boolean
  }
}

// Persist locale to localStorage
const LOCALE_STORAGE_KEY = 'familytree-locale'
function getStoredLocale(): string {
  try {
    return localStorage.getItem(LOCALE_STORAGE_KEY) || 'hi-IN'
  } catch {
    return 'hi-IN'
  }
}

export type LayoutMode = 'tree' | 'pedigree' | 'descendant' | 'fan' | 'ancestry-pedigree' | 'vamshavali'

export type TreeDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

// Layout engine selection: 'elk' = ELK.js (legacy), 'custom' = custom engine
export type LayoutEngine = 'elk' | 'custom'

const PREVIEW_FIELDS_KEY = 'familytree-preview-fields'
function getStoredPreviewFields(): string[] {
  try {
    const stored = localStorage.getItem(PREVIEW_FIELDS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as unknown
      if (Array.isArray(parsed) && parsed.every(v => typeof v === 'string')) {
        return (parsed as string[]).filter(v => PREVIEW_FIELD_MAP.has(v)).slice(0, 4)
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_PREVIEW_FIELDS
}

const LAYOUT_ENGINE_KEY = 'familytree-layout-engine'
function getStoredLayoutEngine(): LayoutEngine {
  try {
    const stored = localStorage.getItem(LAYOUT_ENGINE_KEY)
    return stored === 'custom' ? 'custom' : 'custom' // Default to custom engine
  } catch {
    return 'custom'
  }
}

interface TreeState {
  selectedMemberId: string | null
  loading: boolean
  collapsedBranches: CollapsedBranches
  locale: string
  layoutMode: LayoutMode
  treeDirection: TreeDirection
  layoutEngine: LayoutEngine
  previewFields: string[]

  // Legacy Supabase-era properties (kept for backward compatibility with unused components)
  tree?: { id: string; tree_name: string } | null
  members?: { id: string; first_name: string; last_name: string | null; gender: string | null; is_primary_user: boolean; position_x: number; position_y: number; [key: string]: unknown }[]
  relationships?: { id: string; from_member_id: string; to_member_id: string; relationship_type: string; [key: string]: unknown }[]
  createTree?: (...args: unknown[]) => Promise<unknown>
  createMember?: (...args: unknown[]) => Promise<unknown>
  createRelationship?: (...args: unknown[]) => Promise<unknown>
  updateMember?: (...args: unknown[]) => Promise<unknown>
  deleteMember?: (...args: unknown[]) => Promise<unknown>

  // Actions
  setSelectedMemberId: (id: string | null) => void
  setLoading: (loading: boolean) => void
  toggleAncestors: (nodeId: string) => void
  toggleDescendants: (nodeId: string) => void
  resetCollapsedBranches: () => void
  setLocale: (locale: string) => void
  setLayoutMode: (mode: LayoutMode) => void
  setTreeDirection: (dir: TreeDirection) => void
  setLayoutEngine: (engine: LayoutEngine) => void
  setPreviewFields: (fields: string[]) => void
}

export const useTreeStore = create<TreeState>((set) => ({
  selectedMemberId: null,
  loading: false,
  collapsedBranches: {},
  locale: getStoredLocale(),
  layoutMode: 'tree' as LayoutMode,
  treeDirection: 'DOWN' as TreeDirection,
  layoutEngine: getStoredLayoutEngine(),
  previewFields: getStoredPreviewFields(),

  setSelectedMemberId: (id) => set({ selectedMemberId: id }),
  setLoading: (loading) => set({ loading }),

  toggleAncestors: (nodeId) => set((state) => {
    const current = state.collapsedBranches[nodeId] || { ancestorsCollapsed: false, descendantsCollapsed: false }
    return {
      collapsedBranches: {
        ...state.collapsedBranches,
        [nodeId]: {
          ...current,
          ancestorsCollapsed: !current.ancestorsCollapsed,
        },
      },
    }
  }),

  toggleDescendants: (nodeId) => set((state) => {
    const current = state.collapsedBranches[nodeId] || { ancestorsCollapsed: false, descendantsCollapsed: false }
    return {
      collapsedBranches: {
        ...state.collapsedBranches,
        [nodeId]: {
          ...current,
          descendantsCollapsed: !current.descendantsCollapsed,
        },
      },
    }
  }),

  resetCollapsedBranches: () => set({ collapsedBranches: {} }),

  setLocale: (locale) => {
    try { localStorage.setItem(LOCALE_STORAGE_KEY, locale) } catch { /* ignore */ }
    set({ locale })
  },

  setLayoutMode: (layoutMode) => set({ layoutMode }),
  setTreeDirection: (treeDirection) => set({ treeDirection }),
  setLayoutEngine: (layoutEngine) => {
    try { localStorage.setItem(LAYOUT_ENGINE_KEY, layoutEngine) } catch { /* ignore */ }
    set({ layoutEngine })
  },
  setPreviewFields: (previewFields) => {
    const clamped = previewFields.slice(0, 4)
    try { localStorage.setItem(PREVIEW_FIELDS_KEY, JSON.stringify(clamped)) } catch { /* ignore */ }
    set({ previewFields: clamped })
  },
}))
