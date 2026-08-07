/**
 * DraftCRBanner — persistent bottom bar showing draft change count.
 * Visible when the contributor has unsaved draft changes.
 *
 * "You have N draft changes" + [Review and Submit] + [Discard]
 */

import { useState } from 'react'
import { useContributorStore } from '@/store/contributorStore'

interface DraftCRBannerProps {
  onOpenReview: () => void
}

export function DraftCRBanner({ onOpenReview }: DraftCRBannerProps) {
  const draftItems = useContributorStore(s => s.draftItems)
  const clearDraft = useContributorStore(s => s.clearDraft)
  const [showDiscard, setShowDiscard] = useState(false)

  if (draftItems.length === 0) return null

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        {/* Mobile: above bottom nav (56px), desktop: at bottom */}
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <svg className="w-5 h-5 text-[#2F3E8F] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                You have <span className="text-[#2F3E8F]">{draftItems.length}</span> draft change{draftItems.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowDiscard(true)}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Discard
            </button>
            <button
              onClick={onOpenReview}
              className="px-4 py-1.5 bg-[#2F3E8F] text-white text-sm font-medium rounded-lg hover:bg-[#253275] transition-colors"
            >
              Review & Submit
            </button>
          </div>
        </div>
      </div>

      {/* Discard confirmation overlay */}
      {showDiscard && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Discard all changes?</h3>
            <p className="text-sm text-gray-500">
              Your {draftItems.length} draft change{draftItems.length !== 1 ? 's' : ''} will be permanently removed.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDiscard(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Keep Editing
              </button>
              <button
                onClick={() => { clearDraft(); setShowDiscard(false) }}
                className="px-4 py-2 text-sm bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Discard All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
