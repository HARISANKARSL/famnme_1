/**
 * ChangeRequestDetail — Slide-in panel showing CR diff view + approve/reject actions.
 *
 * Desktop: right-side panel. Mobile: full-screen overlay.
 * Shows each change item with diff visualization, per-item approve/reject,
 * and bulk actions at the bottom.
 */

import { useState, useEffect, useCallback } from 'react'
import { getCR, approveItem, rejectItem, mergeCR, closeCR, addCRComment } from '@/services/changeRequestApiService'
import { useToast } from '@/components/ui/use-toast'
import type { ChangeRequest, FieldChange } from '@/types'

interface ChangeRequestDetailProps {
  treeId: string
  crId: string
  onClose: () => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function ItemStatusBadge({ status }: { status: string }) {
  if (status === 'approved') return <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-green-50 text-green-700 rounded-full">Approved</span>
  if (status === 'rejected') return <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-red-50 text-red-700 rounded-full">Rejected</span>
  return null
}

export function ChangeRequestDetail({ treeId, crId, onClose }: ChangeRequestDetailProps) {
  const { toast } = useToast()
  const [cr, setCR] = useState<ChangeRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [merging, setMerging] = useState(false)

  const loadCR = useCallback(async () => {
    try {
      const result = await getCR(treeId, crId)
      setCR(result.changeRequest)
    } catch {
      toast({ title: 'Failed to load', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [treeId, crId, toast])

  useEffect(() => { loadCR() }, [loadCR])

  const handleApproveItem = async (itemId: string) => {
    try {
      await approveItem(treeId, crId, itemId)
      loadCR()
    } catch {
      toast({ title: 'Failed to approve', variant: 'destructive' })
    }
  }

  const handleRejectItem = async (itemId: string, note?: string) => {
    try {
      await rejectItem(treeId, crId, itemId, note)
      loadCR()
    } catch {
      toast({ title: 'Failed to reject', variant: 'destructive' })
    }
  }

  const handleMerge = async () => {
    setMerging(true)
    try {
      const result = await mergeCR(treeId, crId)
      toast({ title: 'Changes merged!', description: `${result.merged} approved, ${result.rejected} rejected.` })
      onClose()
    } catch (err) {
      toast({ title: 'Merge failed', description: err instanceof Error ? err.message : 'Could not merge.', variant: 'destructive' })
    } finally {
      setMerging(false)
    }
  }

  const handleClose = async () => {
    try {
      await closeCR(treeId, crId)
      toast({ title: 'Suggested edit closed' })
      onClose()
    } catch {
      toast({ title: 'Failed to close', variant: 'destructive' })
    }
  }

  const handleComment = async () => {
    if (!commentText.trim()) return
    try {
      await addCRComment(treeId, crId, commentText.trim())
      setCommentText('')
      loadCR()
    } catch {
      toast({ title: 'Failed to add comment', variant: 'destructive' })
    }
  }

  const items = cr?.items ?? []
  const comments = cr?.comments ?? []
  const pendingItems = items.filter(i => i.status === 'pending')
  const isMergeable = cr?.status === 'open' && items.some(i => i.status === 'approved')

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-200">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-gray-800 truncate">{cr?.title || 'Suggested edit'}</h2>
            <p className="text-xs text-gray-500">
              {cr?.submitterName || 'Contributor'} &middot; {cr?.submittedAt ? timeAgo(cr.submittedAt) : ''}
            </p>
          </div>
          {cr?.status && (
            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
              cr.status === 'open' ? 'bg-amber-50 text-amber-700' :
              cr.status === 'merged' ? 'bg-green-50 text-green-700' :
              'bg-gray-50 text-gray-500'
            }`}>
              {cr.status}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="space-y-3 animate-pulse">
              <div className="h-20 bg-gray-100 rounded-lg" />
              <div className="h-20 bg-gray-100 rounded-lg" />
            </div>
          )}

          {/* Description */}
          {cr?.description && (
            <div className="p-3 bg-[#F6F2EA]/50 border-l-3 border-[#C2A46D]/50 rounded-r-lg">
              <p className="text-sm text-gray-600 italic">"{cr.description}"</p>
            </div>
          )}

          {/* Change items */}
          {items.map(item => (
            <div key={item.itemId} className={`p-3 rounded-lg border ${
              item.status === 'approved' ? 'border-green-200 bg-green-50/30 opacity-70' :
              item.status === 'rejected' ? 'border-red-200 bg-red-50/30 opacity-70' :
              'border-gray-200'
            }`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full ${
                    item.changeType === 'edit_person' ? 'bg-blue-50 text-blue-700' :
                    item.changeType === 'add_person' ? 'bg-green-50 text-green-700' :
                    item.changeType === 'add_union' ? 'bg-purple-50 text-purple-700' :
                    item.changeType === 'delete_person' ? 'bg-red-50 text-red-700' :
                    'bg-gray-50 text-gray-700'
                  }`}>
                    {item.changeType.replace(/_/g, ' ')}
                  </span>
                </div>
                <ItemStatusBadge status={item.status} />
              </div>

              {/* Field changes diff */}
              {item.changeType === 'edit_person' && item.fieldChanges && (
                <div className="space-y-1.5 mb-2">
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
                <div className="text-xs text-gray-600 space-y-0.5 mb-2">
                  <p>Name: <span className="font-medium">{String(item.newEntityData.firstName || '')} {String(item.newEntityData.lastName || '')}</span></p>
                  {(item.newEntityData as Record<string, unknown>).gender && <p>Gender: {String((item.newEntityData as Record<string, unknown>).gender)}</p>}
                  {(item.newEntityData as Record<string, unknown>).birthDate && <p>Born: {String((item.newEntityData as Record<string, unknown>).birthDate)}</p>}
                </div>
              )}

              {/* Reviewer note */}
              {item.reviewerNote && (
                <p className="text-xs text-gray-400 italic mb-2">Note: {item.reviewerNote}</p>
              )}

              {/* Per-item actions (only for open CRs with pending items) */}
              {cr?.status === 'open' && item.status === 'pending' && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleApproveItem(item.itemId)}
                    className="px-3 py-1 text-xs font-medium text-green-700 border border-green-200 rounded-lg hover:bg-green-50 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectItem(item.itemId)}
                    className="px-3 py-1 text-xs font-medium text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Comments */}
          {(comments.length > 0 || cr?.status === 'open') && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Comments</h3>
              {comments.map(comment => (
                <div key={comment.commentId} className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs">
                      <span className="font-medium text-gray-800">{comment.userName || 'User'}</span>
                      <span className="text-gray-400 ml-2">{timeAgo(comment.createdAt)}</span>
                    </p>
                    <p className="text-sm text-gray-600 mt-0.5">{comment.text}</p>
                  </div>
                </div>
              ))}

              {cr?.status === 'open' && (
                <div className="flex gap-2">
                  <input
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/20"
                    onKeyDown={e => { if (e.key === 'Enter') handleComment() }}
                  />
                  <button
                    onClick={handleComment}
                    disabled={!commentText.trim()}
                    className="px-3 h-9 bg-[#2F3E8F] text-white text-xs font-medium rounded-lg hover:bg-[#253275] disabled:opacity-50 transition-colors"
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom actions (only for open CRs) */}
        {cr?.status === 'open' && (
          <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-white space-y-2">
            {/* Approve all pending */}
            {pendingItems.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    for (const item of pendingItems) await approveItem(treeId, crId, item.itemId)
                    loadCR()
                  }}
                  className="flex-1 py-2 text-xs font-medium text-green-700 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                >
                  Approve All ({pendingItems.length})
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 py-2 text-xs font-medium text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Reject All
                </button>
              </div>
            )}

            {/* Merge button */}
            {isMergeable && (
              <button
                onClick={handleMerge}
                disabled={merging}
                className="w-full py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {merging ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                Merge Approved Changes
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
