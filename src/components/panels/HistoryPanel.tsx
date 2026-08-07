/**
 * HistoryPanel - Shows version history for a person with revert capability
 */

import { useState, useEffect } from 'react';
import { X, RotateCcw, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';
import { getPersonHistory, revertChange } from '@/services/changeLogService';
import type { ChangeLog } from '@/types';

interface HistoryPanelProps {
  personId: string;
  personName: string;
  onClose: () => void;
  onReverted?: () => void;
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

function getActionLabel(action: string): string {
  switch (action) {
    case 'create': return 'Created';
    case 'update': return 'Updated';
    case 'delete': return 'Deleted';
    case 'revert': return 'Reverted';
    default: return action;
  }
}

function getActionColor(action: string): string {
  switch (action) {
    case 'create': return 'bg-green-100 text-green-700';
    case 'update': return 'bg-blue-100 text-[#2F3E8F]';
    case 'delete': return 'bg-blue-100 text-[#2F3E8F]';
    case 'revert': return 'bg-blue-100 text-[#2F3E8F]';
    default: return 'bg-gray-100 text-gray-700';
  }
}

function DiffView({ before, after }: { before: Record<string, any> | null; after: Record<string, any> | null }) {
  if (!before && !after) return null;

  const allKeys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);

  // Filter to only show changed fields
  const changedKeys = [...allKeys].filter(key => {
    if (['updatedAt', 'createdAt', 'personId', 'createdBy'].includes(key)) return false;
    const b = before?.[key];
    const a = after?.[key];
    return JSON.stringify(b) !== JSON.stringify(a);
  });

  if (changedKeys.length === 0) return <p className="text-xs text-gray-400 italic">No visible changes</p>;

  return (
    <div className="space-y-1 mt-2">
      {changedKeys.map(key => (
        <div key={key} className="text-xs">
          <span className="font-medium text-gray-600">{key}: </span>
          {before?.[key] != null && (
            <span className="text-red-500 line-through mr-1">{String(before[key])}</span>
          )}
          {after?.[key] != null && (
            <span className="text-green-600">{String(after[key])}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export function HistoryPanel({ personId, personName, onClose, onReverted }: HistoryPanelProps) {
  const { isMobile } = useResponsive();
  const [entries, setEntries] = useState<ChangeLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reverting, setReverting] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [personId]);

  async function loadHistory() {
    setLoading(true);
    try {
      const result = await getPersonHistory(personId);
      setEntries(result.entries);
      setTotal(result.total);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRevert(changeLogId: string) {
    setReverting(changeLogId);
    try {
      await revertChange(changeLogId);
      await loadHistory();
      onReverted?.();
    } catch (err) {
      console.error('Failed to revert:', err);
    } finally {
      setReverting(null);
    }
  }

  return (
    <div className={`fixed ${isMobile ? 'inset-0' : 'right-0 top-14 bottom-0 w-96'} bg-white shadow-xl border-l border-gray-200 z-40 flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">History</h2>
          <p className="text-xs text-gray-500">{personName} ({total} changes)</p>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-200">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Entries */}
      <div className={`flex-1 overflow-y-auto p-3 space-y-2 ${isMobile ? 'pb-16' : ''}`}>
        {loading && <p className="text-sm text-gray-400 text-center py-8">Loading...</p>}
        {!loading && entries.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No history yet</p>
        )}
        {entries.map(entry => {
          const isExpanded = expandedId === entry.changeLogId;
          let before: Record<string, any> | null = null;
          let after: Record<string, any> | null = null;
          try { if (entry.before) before = JSON.parse(entry.before); } catch { /* ignore */ }
          try { if (entry.after) after = JSON.parse(entry.after); } catch { /* ignore */ }

          return (
            <div key={entry.changeLogId} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getActionColor(entry.action)}`}>
                    {getActionLabel(entry.action)}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(entry.timestamp)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {entry.action === 'update' && (
                    <button
                      onClick={() => handleRevert(entry.changeLogId)}
                      disabled={reverting === entry.changeLogId}
                      className="text-xs px-2 py-1 rounded hover:bg-[#E8EDFF] text-[#2F3E8F] disabled:opacity-50"
                      title="Revert this change"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : entry.changeLogId)}
                    className="p-1 rounded hover:bg-gray-100"
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              {isExpanded && <DiffView before={before} after={after} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
