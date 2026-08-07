/**
 * Contributor Store
 *
 * Zustand store managing the contributor's context and draft change items.
 * Draft items are stored client-side only (lost on logout — acceptable for v1).
 *
 * Flow: contributor edits → changes saved to draftItems → "Review and Submit"
 * bundles them into a Change Request via the API.
 */

import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { createChangeRequest } from '@/services/changeRequestApiService'
import type { TreeRole, ChangeItem, ChangeType, FieldChange } from '@/types'

interface DraftItem {
  localId: string  // client-side ID for removal
  changeType: ChangeType
  targetEntityId?: string
  targetEntityType?: string
  fieldChanges?: Record<string, FieldChange>
  newEntityData?: Record<string, unknown>
  unionData?: Record<string, unknown>
  relationshipData?: Record<string, unknown>
  entitySnapshot?: Record<string, unknown>
  // Display metadata (not sent to server)
  displayLabel: string  // e.g., "Edit Priya Sharma" or "Add Rahul Verma"
}

interface ContributorState {
  // Context (set when tree loads)
  myRole: TreeRole | null
  myClaimedPersonId: string | null
  ownerName: string | null
  treeId: string | null

  // Draft items
  draftItems: DraftItem[]
  draftNote: string
  isSubmitting: boolean

  // Actions
  setContributorContext: (role: TreeRole | null, claimedPersonId: string | null, ownerName: string | null, treeId: string | null) => void
  addDraftItem: (item: Omit<DraftItem, 'localId'>) => void
  removeDraftItem: (localId: string) => void
  clearDraft: () => void
  setDraftNote: (note: string) => void
  submitDraft: () => Promise<boolean>

  // Computed
  isContributor: () => boolean
  hasDraft: () => boolean
}

export const useContributorStore = create<ContributorState>((set, get) => ({
  myRole: null,
  myClaimedPersonId: null,
  ownerName: null,
  treeId: null,
  draftItems: [],
  draftNote: '',
  isSubmitting: false,

  setContributorContext: (role, claimedPersonId, ownerName, treeId) =>
    set({ myRole: role, myClaimedPersonId: claimedPersonId, ownerName, treeId }),

  addDraftItem: (item) =>
    set(s => ({
      draftItems: [...s.draftItems, { ...item, localId: uuidv4() }],
    })),

  removeDraftItem: (localId) =>
    set(s => ({
      draftItems: s.draftItems.filter(i => i.localId !== localId),
    })),

  clearDraft: () => set({ draftItems: [], draftNote: '' }),

  setDraftNote: (note) => set({ draftNote: note }),

  submitDraft: async () => {
    const { draftItems, draftNote, treeId } = get()
    if (!treeId || draftItems.length === 0) return false

    set({ isSubmitting: true })
    try {
      // Build title from draft items
      const editCount = draftItems.filter(i => i.changeType === 'edit_person').length
      const addCount = draftItems.filter(i => i.changeType === 'add_person' || i.changeType === 'add_union').length
      const parts: string[] = []
      if (editCount > 0) parts.push(`${editCount} edit${editCount > 1 ? 's' : ''}`)
      if (addCount > 0) parts.push(`${addCount} addition${addCount > 1 ? 's' : ''}`)
      const title = parts.join(' and ') || `${draftItems.length} changes`

      // Convert draft items to API format
      const items: Omit<ChangeItem, 'itemId' | 'crId' | 'status' | 'createdAt'>[] = draftItems.map((item, i) => ({
        sortOrder: i,
        changeType: item.changeType,
        targetEntityId: item.targetEntityId,
        targetEntityType: item.targetEntityType,
        fieldChanges: item.fieldChanges,
        newEntityData: item.newEntityData,
        unionData: item.unionData,
        relationshipData: item.relationshipData,
        entitySnapshot: item.entitySnapshot,
      }))

      await createChangeRequest(treeId, title, draftNote || undefined, items)
      set({ draftItems: [], draftNote: '', isSubmitting: false })
      return true
    } catch {
      set({ isSubmitting: false })
      return false
    }
  },

  isContributor: () => get().myRole === 'contributor',
  hasDraft: () => get().draftItems.length > 0,
}))
