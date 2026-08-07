/**
 * PendingEditsPanel - Review panel for approval workflow
 */

import { useState, useEffect } from 'react';
import { X, Check, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';
import { listPendingEdits, approvePendingEdit, rejectPendingEdit } from '@/services/pendingEditService';
import type { PendingEdit } from '@/types';

interface PendingEditsPanelProps {
  treeId: string;
  onClose: () => void;
  onEditApplied?: () => void;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return `${dd}-${mm}-${yy} ${time}`;
  } catch {
    return iso;
  }
}

export function PendingEditsPanel({ treeId, onClose, onEditApplied }: PendingEditsPanelProps) {
  const { isMobile } = useResponsive();
  const [edits, setEdits] = useState<PendingEdit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState<string | null>(null);

  useEffect(() => {
    loadEdits();
  }, [treeId]);

  async function loadEdits() {
    setLoading(true);
    try {
      const result = await listPendingEdits(treeId);
      setEdits(result.edits);
      setTotal(result.total);
    } catch (err) {
      console.error('Failed to load pending edits:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(editId: string) {
    setProcessing(editId);
    try {
      await approvePendingEdit(editId);
      await loadEdits();
      onEditApplied?.();
    } catch (err) {
      console.error('Failed to approve:', err);
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(editId: string) {
    setProcessing(editId);
    try {
      await rejectPendingEdit(editId, rejectReason || undefined);
      setShowRejectInput(null);
      setRejectReason('');
      await loadEdits();
    } catch (err) {
      console.error('Failed to reject:', err);
    } finally {
      setProcessing(null);
    }
  }

  function renderDiff(edit: PendingEdit) {
    try {
      const proposed = JSON.parse(edit.proposedChanges);
      const current = edit.currentState ? JSON.parse(edit.currentState) : {};

      const keys = Object.keys(proposed).filter(
        k => !['personId', 'createdAt', 'createdBy', 'updatedAt', '_treeId'].includes(k)
      );

      return (
        <div className="space-y-1 mt-2 text-xs">
          {keys.map(key => (
            <div key={key}>
              <span className="font-medium text-gray-600">{key}: </span>
              {current[key] != null && (
                <span className="text-red-500 line-through mr-1">{String(current[key])}</span>
              )}
              <span className="text-green-600">{String(proposed[key])}</span>
            </div>
          ))}
        </div>
      );
    } catch {
      return <p className="text-xs text-gray-400">Unable to display changes</p>;
    }
  }

  return (
    <div className={`fixed ${isMobile ? 'inset-0' : 'right-0 top-14 bottom-0 w-96'} bg-white shadow-xl border-l border-gray-200 z-40 flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Pending Edits</h2>
          <p className="text-xs text-gray-500">{total} pending review</p>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-200">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Edits List */}
      <div className={`flex-1 overflow-y-auto p-3 space-y-2 ${isMobile ? 'pb-16' : ''}`}>
        {loading && <p className="text-sm text-gray-400 text-center py-8">Loading...</p>}
        {!loading && edits.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No pending edits</p>
        )}
        {edits.map(edit => {
          const isExpanded = expandedId === edit.editId;

          return (
            <div key={edit.editId} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {edit.action === 'update' ? 'Update' : edit.action} {edit.personName || edit.entityId}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(edit.proposedAt)}</p>
                </div>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : edit.editId)}
                  className="p-1 rounded hover:bg-gray-100"
                >
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {isExpanded && (
                <>
                  {renderDiff(edit)}

                  {/* Reject reason input */}
                  {showRejectInput === edit.editId && (
                    <input
                      type="text"
                      placeholder="Reason (optional)"
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      className="w-full mt-2 px-2 py-1 text-xs border rounded"
                    />
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleApprove(edit.editId)}
                      disabled={processing === edit.editId}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium
                        bg-green-50 text-green-700 rounded hover:bg-green-100 disabled:opacity-50"
                    >
                      <Check className="w-3 h-3" /> Approve
                    </button>
                    <button
                      onClick={() => {
                        if (showRejectInput === edit.editId) {
                          handleReject(edit.editId);
                        } else {
                          setShowRejectInput(edit.editId);
                        }
                      }}
                      disabled={processing === edit.editId}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium
                        bg-red-50 text-red-700 rounded hover:bg-red-100 disabled:opacity-50"
                    >
                      <XCircle className="w-3 h-3" /> Reject
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
