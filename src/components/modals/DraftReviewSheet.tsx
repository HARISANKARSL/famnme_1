/**
 * DraftReviewSheet — Summary of draft changes before submitting to owner.
 *
 * Shows each change item as a diff card with the option to remove items
 * before submitting. Includes an optional note for context.
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useContributorStore } from '@/store/contributorStore'
import { useToast } from '@/components/ui/use-toast'
import type { FieldChange } from '@/types'

interface DraftReviewSheetProps {
  open: boolean
  onClose: () => void
}

export function DraftReviewSheet({ open, onClose }: DraftReviewSheetProps) {
  const { toast } = useToast()
  const draftItems = useContributorStore(s => s.draftItems)
  const draftNote = useContributorStore(s => s.draftNote)
  const setDraftNote = useContributorStore(s => s.setDraftNote)
  const removeDraftItem = useContributorStore(s => s.removeDraftItem)
  const submitDraft = useContributorStore(s => s.submitDraft)
  const isSubmitting = useContributorStore(s => s.isSubmitting)
  const [submitted, setSubmitted] = useState(false)
  const ownerName = useContributorStore(s => s.ownerName)

  const handleSubmit = async () => {
    const success = await submitDraft()
    if (success) {
      setSubmitted(true)
      toast({ title: 'Changes submitted!', description: `${ownerName || 'The owner'} will review them.` })
      setTimeout(() => { setSubmitted(false); onClose() }, 2000)
    } else {
      toast({ title: 'Failed to submit', description: 'Please try again.', variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#2F3E8F]">Review Your Changes</DialogTitle>
          <DialogDescription>
            {draftItems.length} change{draftItems.length !== 1 ? 's' : ''} ready to submit
          </DialogDescription>
        </DialogHeader>

        {/* Success state */}
        {submitted && (
          <div className="text-center py-8 space-y-3">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Changes submitted!</h3>
            <p className="text-sm text-gray-500">{ownerName || 'The owner'} will review them and you'll be notified.</p>
          </div>
        )}

        {/* Change items list */}
        {!submitted && (
          <div className="space-y-4">
            {draftItems.map((item) => (
              <div key={item.localId} className="p-3 rounded-lg border border-gray-200 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {/* Change type badge */}
                    <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full ${
                      item.changeType === 'edit_person' ? 'bg-blue-50 text-blue-700' :
                      item.changeType === 'add_person' ? 'bg-green-50 text-green-700' :
                      item.changeType === 'add_union' ? 'bg-purple-50 text-purple-700' :
                      item.changeType === 'delete_person' ? 'bg-red-50 text-red-700' :
                      'bg-gray-50 text-gray-700'
                    }`}>
                      {item.changeType.replace('_', ' ')}
                    </span>
                    <p className="text-sm font-medium text-gray-800 mt-1">{item.displayLabel}</p>
                  </div>
                  <button
                    onClick={() => removeDraftItem(item.localId)}
                    className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 p-1"
                    title="Remove from draft"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Field changes diff */}
                {item.changeType === 'edit_person' && item.fieldChanges && (
                  <div className="space-y-1.5">
                    {Object.entries(item.fieldChanges).map(([field, change]) => {
                      const fc = change as FieldChange
                      return (
                        <div key={field} className="text-xs">
                          <span className="text-gray-500 font-medium">{field}:</span>
                          {fc.old != null && fc.old !== '' && (
                            <span className="ml-2 px-1.5 py-0.5 bg-red-50 text-red-700 line-through rounded">
                              {String(fc.old)}
                            </span>
                          )}
                          <span className="mx-1 text-gray-400">&rarr;</span>
                          <span className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded">
                            {String(fc.new)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* New person preview */}
                {item.changeType === 'add_person' && item.newEntityData && (
                  <div className="text-xs text-gray-600 space-y-0.5">
                    {(item.newEntityData as Record<string, unknown>).firstName && (
                      <p>Name: <span className="font-medium">{String((item.newEntityData as Record<string, unknown>).firstName)} {String((item.newEntityData as Record<string, unknown>).lastName || '')}</span></p>
                    )}
                    {(item.newEntityData as Record<string, unknown>).gender && <p>Gender: {String((item.newEntityData as Record<string, unknown>).gender)}</p>}
                    {(item.newEntityData as Record<string, unknown>).birthDate && <p>Born: {String((item.newEntityData as Record<string, unknown>).birthDate)}</p>}
                  </div>
                )}
              </div>
            ))}

            {/* Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Add a note <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={draftNote}
                onChange={e => setDraftNote(e.target.value)}
                placeholder="Explain your changes (e.g., 'I was born in Pune, not Mumbai')"
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/20 focus:border-[#2F3E8F]"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Keep Editing
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || draftItems.length === 0}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                Submit for Review
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
