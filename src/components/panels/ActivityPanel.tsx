/**
 * ActivityPanel - Tree-level activity feed showing recent changes
 */

import { useState, useEffect } from 'react';
import { X, Clock } from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';
import { getTreeActivity } from '@/services/activityService';
import type { ChangeLog } from '@/types';

interface ActivityPanelProps {
  treeId: string;
  onClose: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  try {
    if (isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}-${mm}-${yy}`;
  } catch {
    return d.toLocaleDateString();
  }
}

function getActionIcon(action: string): string {
  switch (action) {
    case 'create': return '+';
    case 'update': return '~';
    case 'delete': return '-';
    case 'revert': return '<';
    default: return '?';
  }
}

function getActionColor(action: string): string {
  switch (action) {
    case 'create': return 'bg-green-500';
    case 'update': return 'bg-[#E8EDFF]0';
    case 'delete': return 'bg-red-500';
    case 'revert': return 'bg-[#E8EDFF]0';
    default: return 'bg-gray-500';
  }
}

function describeChange(entry: ChangeLog): string {
  const name = entry.personName || 'Unknown';
  switch (entry.action) {
    case 'create': return `${name} was added`;
    case 'update': {
      if (entry.before && entry.after) {
        try {
          const before = JSON.parse(entry.before);
          const after = JSON.parse(entry.after);
          const changed = Object.keys(after).filter(k =>
            !['updatedAt', 'createdAt', 'personId', 'createdBy'].includes(k) &&
            JSON.stringify(before[k]) !== JSON.stringify(after[k])
          );
          if (changed.length === 1) return `${name}'s ${changed[0]} was updated`;
          if (changed.length <= 3) return `${name}'s ${changed.join(', ')} updated`;
          return `${name} was updated (${changed.length} fields)`;
        } catch { /* fallthrough */ }
      }
      return `${name} was updated`;
    }
    case 'delete': return `${name} was removed`;
    case 'revert': return `Change to ${name} was reverted`;
    default: return `${name}: ${entry.action}`;
  }
}

export function ActivityPanel({ treeId, onClose }: ActivityPanelProps) {
  const { isMobile } = useResponsive();
  const [entries, setEntries] = useState<ChangeLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  useEffect(() => {
    loadActivity();
  }, [treeId, offset]);

  async function loadActivity() {
    setLoading(true);
    try {
      const result = await getTreeActivity(treeId, limit, offset);
      setEntries(result.entries);
      setTotal(result.total);
    } catch (err) {
      console.error('Failed to load activity:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`fixed ${isMobile ? 'inset-0' : 'right-0 top-14 bottom-0 w-96'} bg-white shadow-xl border-l border-gray-200 z-40 flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Activity Feed</h2>
          <p className="text-xs text-gray-500">{total} events</p>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-200">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Timeline */}
      <div className={`flex-1 overflow-y-auto ${isMobile ? 'pb-16' : ''}`}>
        {loading && <p className="text-sm text-gray-400 text-center py-8">Loading...</p>}
        {!loading && entries.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No activity yet</p>
        )}
        <div className="relative pl-8 pr-4 py-3">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />

          {entries.map((entry, _i) => (
            <div key={entry.changeLogId} className="relative pb-4 last:pb-0">
              {/* Timeline dot */}
              <div className={`absolute -left-3 top-1 w-4 h-4 rounded-full ${getActionColor(entry.action)} text-white text-[8px] flex items-center justify-center font-bold`}>
                {getActionIcon(entry.action)}
              </div>

              {/* Content */}
              <div className="ml-3">
                <p className="text-sm text-gray-800">{describeChange(entry)}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {formatDate(entry.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Load more */}
        {!loading && entries.length < total && (
          <div className="px-4 pb-4">
            <button
              onClick={() => setOffset(o => o + limit)}
              className="w-full py-2 text-xs text-sky-600 hover:bg-sky-50 rounded"
            >
              Load more...
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
