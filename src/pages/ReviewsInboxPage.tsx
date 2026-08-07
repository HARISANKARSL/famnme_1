/**
 * ReviewsInboxPage — Owner's inbox for reviewing Change Requests.
 *
 * Shows a list of pending CRs and previously reviewed ones.
 * Accessible via #reviews hash route in DashboardPage.
 */

import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { getTreeCRs } from '@/services/changeRequestApiService'
import type { ChangeRequest } from '@/types'

const ChangeRequestDetail = lazy(() =>
  import('@/components/modals/ChangeRequestDetail').then(m => ({ default: m.ChangeRequestDetail }))
)

interface ReviewsInboxPageProps {
  treeId: string
  onClose: () => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function CRStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: 'bg-amber-50 text-amber-700 border-amber-200',
    merged: 'bg-green-50 text-green-700 border-green-200',
    closed: 'bg-red-50 text-red-700 border-red-200',
    withdrawn: 'bg-gray-50 text-gray-500 border-gray-200',
  }
  return (
    <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full border ${styles[status] || styles.open}`}>
      {status}
    </span>
  )
}

export function ReviewsInboxPage({ treeId, onClose }: ReviewsInboxPageProps) {
  const [pendingCRs, setPendingCRs] = useState<ChangeRequest[]>([])
  const [reviewedCRs, setReviewedCRs] = useState<ChangeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCrId, setSelectedCrId] = useState<string | null>(null)
  const [showReviewed, setShowReviewed] = useState(false)

  const loadCRs = useCallback(async () => {
    setLoading(true)
    try {
      const [pendingResult, reviewedResult] = await Promise.all([
        getTreeCRs(treeId, { status: 'open' }),
        getTreeCRs(treeId, { status: undefined, limit: 20 }),
      ])
      setPendingCRs(pendingResult.crs)
      setReviewedCRs(reviewedResult.crs.filter(cr => cr.status !== 'open' && cr.status !== 'draft'))
    } catch {
      // Silent fail
    } finally {
      setLoading(false)
    }
  }, [treeId])

  useEffect(() => { loadCRs() }, [loadCRs])

  const handleDetailClose = () => {
    setSelectedCrId(null)
    loadCRs() // Refresh after review
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-[#2F3E8F]">Suggested edits</h1>
            <p className="text-xs text-gray-500">Review proposed changes from family members</p>
          </div>
        </div>
        {pendingCRs.length > 0 && (
          <span className="px-2 py-1 text-xs font-bold text-white bg-[#2F3E8F] rounded-full">
            {pendingCRs.length}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse p-4 rounded-xl border border-gray-100">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 bg-gray-200 rounded" />
                    <div className="h-3 w-24 bg-gray-200 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && pendingCRs.length === 0 && reviewedCRs.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <svg className="w-16 h-16 text-gray-200 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 text-sm">No suggested edits yet.</p>
            <p className="text-gray-400 text-xs">When family members propose changes, they'll appear here.</p>
          </div>
        )}

        {/* Pending section */}
        {!loading && pendingCRs.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Review</h2>
            {pendingCRs.map(cr => (
              <button
                key={cr.crId}
                onClick={() => setSelectedCrId(cr.crId)}
                className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-[#2F3E8F]/30 hover:bg-[#F6F2EA]/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#2F3E8F]/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[#2F3E8F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {cr.submitterName || cr.submitterEmail || 'Contributor'}
                      </p>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {cr.submittedAt ? timeAgo(cr.submittedAt) : ''}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{cr.title || `${cr.itemCount} changes`}</p>
                    {cr.description && (
                      <p className="text-xs text-gray-400 mt-1 truncate italic">"{cr.description}"</p>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Previously reviewed section */}
        {!loading && reviewedCRs.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setShowReviewed(!showReviewed)}
              className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600"
            >
              <svg className={`w-3 h-3 transition-transform ${showReviewed ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Previously Reviewed ({reviewedCRs.length})
            </button>
            {showReviewed && reviewedCRs.map(cr => (
              <button
                key={cr.crId}
                onClick={() => setSelectedCrId(cr.crId)}
                className="w-full text-left p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors opacity-70"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-600 truncate">
                        {cr.submitterName || 'Contributor'} &middot; {cr.title || `${cr.itemCount} changes`}
                      </p>
                      <CRStatusBadge status={cr.status} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {cr.mergedAt ? `Merged ${timeAgo(cr.mergedAt)}` : cr.reviewedAt ? `Reviewed ${timeAgo(cr.reviewedAt)}` : ''}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedCrId && (
        <Suspense fallback={null}>
          <ChangeRequestDetail
            treeId={treeId}
            crId={selectedCrId}
            onClose={handleDetailClose}
          />
        </Suspense>
      )}
    </div>
  )
}
