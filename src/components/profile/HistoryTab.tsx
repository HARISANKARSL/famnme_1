import { useState, useEffect, useCallback } from 'react';
import { Clock, RotateCcw, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { getPersonHistory, revertChange } from '@/services/changeLogService';
import type { ChangeLog } from '@/types';

interface HistoryTabProps {
  personId: string;
  personName: string;
  onTreeReload: () => void;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  try {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}-${mm}-${yy}`;
  } catch {
    return dateStr;
  }
}

const FIELD_LABELS: Record<string, string> = {
  firstName: 'First Name', lastName: 'Last Name', middleName: 'Middle Name',
  maidenName: 'Maiden Name', gender: 'Gender', birthDate: 'Birth Date',
  birthPlace: 'Birth Place', deathDate: 'Death Date', deathPlace: 'Death Place',
  isLiving: 'Living Status', isHomePerson: 'Home Person', occupation: 'Occupation',
  biography: 'Biography', education: 'Education', nationality: 'Nationality',
  ethnicity: 'Ethnicity', profilePhotoUrl: 'Profile Photo', gotra: 'Gotra',
  caste: 'Caste', religion: 'Religion', nativePlace: 'Native Place',
  nativeLanguage: 'Native Language', multipleBirth: 'Multiple Birth',
  birthOrder: 'Birth Order', elderStatus: 'Elder Status',
};

// Fields whose raw values should never be shown (replaced with a label)
const URL_FIELDS = new Set(['profilePhotoUrl']);

type DiffEntry = {
  field: string;
  fieldLabel: string;
  old: string;
  new: string;
  isPhoto: boolean;
  oldPhotoUrl: string;
  newPhotoUrl: string;
};

function parseDiff(before: string | null, after: string | null): DiffEntry[] {
  try {
    const beforeObj = before ? JSON.parse(before) : {};
    const afterObj = after ? JSON.parse(after) : {};
    const allKeys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);
    const changes: DiffEntry[] = [];
    for (const key of allKeys) {
      const oldRaw = beforeObj[key] ?? '';
      const newRaw = afterObj[key] ?? '';
      const oldVal = String(oldRaw);
      const newVal = String(newRaw);
      if (oldVal === newVal) continue;

      const isPhoto = URL_FIELDS.has(key);
      changes.push({
        field: key,
        fieldLabel: FIELD_LABELS[key] || key,
        old: isPhoto ? (oldVal ? 'Photo set' : 'None') : formatValue(key, oldVal),
        new: isPhoto ? (newVal ? 'Photo updated' : 'Removed') : formatValue(key, newVal),
        isPhoto,
        oldPhotoUrl: isPhoto ? oldVal : '',
        newPhotoUrl: isPhoto ? newVal : '',
      });
    }
    return changes;
  } catch {
    return [];
  }
}

function formatValue(field: string, val: string): string {
  if (!val) return '-';
  // Boolean fields
  if (field === 'isLiving') return val === 'true' ? 'Living' : 'Deceased';
  if (field === 'isHomePerson' || field === 'multipleBirth') return val === 'true' ? 'Yes' : 'No';
  // Long text — truncate
  if (val.length > 80) return val.slice(0, 80) + '…';
  return val;
}

const actionColor: Record<string, string> = {
  create: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/30',
  update: 'text-[#2F3E8F] bg-[#E8EDFF] dark:text-[#8CA0FF] dark:bg-[#2F3E8F]/20',
  delete: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30',
  revert: 'text-[#2F3E8F] bg-[#E8EDFF] dark:text-[#8CA0FF] dark:bg-[#2F3E8F]/20',
};

export function HistoryTab({ personId, personName, onTreeReload }: HistoryTabProps) {
  const [entries, setEntries] = useState<ChangeLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reverting, setReverting] = useState<string | null>(null);
  const limit = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPersonHistory(personId, limit, offset);
      setEntries(data.entries);
      setTotal(data.total);
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoading(false);
    }
  }, [personId, offset]);

  useEffect(() => { load(); }, [load]);

  const handleRevert = async (changeLogId: string) => {
    setReverting(changeLogId);
    try {
      await revertChange(changeLogId);
      await load();
      onTreeReload();
    } catch (err) {
      console.error('Revert failed:', err);
    } finally {
      setReverting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#2F3E8F]" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-[#E2DBCE] mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5" /> Change History for {personName}
      </h3>

      {entries.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No changes recorded yet</p>
      ) : (
        <div className="space-y-2">
          {entries.map(entry => {
            const isExpanded = expandedId === entry.changeLogId;
            const changes = parseDiff(entry.before, entry.after);
            return (
              <div key={entry.changeLogId} className="bg-white dark:bg-[#1E1E1E] rounded-lg border border-gray-200 dark:border-[#2a2a2a]">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : entry.changeLogId)}
                  className="w-full flex items-center gap-3 p-3 text-left"
                >
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${actionColor[entry.action] || 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-stone-900'}`}>
                    {entry.action}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-300 flex-1">
                    {entry.action === 'create' ? 'Person created' :
                     entry.action === 'delete' ? 'Person deleted' :
                     entry.action === 'revert' ? 'Change reverted' :
                     `${changes.length} field${changes.length !== 1 ? 's' : ''} changed`}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{relativeTime(entry.timestamp)}</span>
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />}
                </button>

                {isExpanded && changes.length > 0 && (
                  <div className="px-3 pb-3 border-t border-gray-100 dark:border-[#2a2a2a]">
                    <table className="w-full mt-2 text-xs">
                      <thead>
                        <tr className="text-gray-500 dark:text-gray-400">
                          <th className="text-left py-1 font-medium">Field</th>
                          <th className="text-left py-1 font-medium">Before</th>
                          <th className="text-left py-1 font-medium">After</th>
                        </tr>
                      </thead>
                      <tbody>
                        {changes.map((c, i) => (
                          <tr key={i} className="border-t border-gray-50 dark:border-stone-850">
                            <td className="py-1 pr-2 text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">{c.fieldLabel}</td>
                            <td className="py-1 pr-2 text-red-500 dark:text-red-400">
                              {c.isPhoto ? (
                                c.oldPhotoUrl
                                  ? <img src={c.oldPhotoUrl} alt="before" className="w-8 h-8 rounded-full object-cover inline-block border border-stone-200 dark:border-stone-800" />
                                  : <span className="italic text-gray-400 dark:text-gray-500">None</span>
                              ) : (c.old || '-')}
                            </td>
                            <td className="py-1 text-green-600 dark:text-green-400">
                              {c.isPhoto ? (
                                c.newPhotoUrl
                                  ? <img src={c.newPhotoUrl} alt="after" className="w-8 h-8 rounded-full object-cover inline-block border border-stone-200 dark:border-stone-800" />
                                  : <span className="italic text-gray-400 dark:text-gray-500">Removed</span>
                              ) : (c.new || '-')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {entry.action !== 'revert' && (
                      <button
                        onClick={() => handleRevert(entry.changeLogId)}
                        disabled={reverting === entry.changeLogId}
                        className="mt-2 flex items-center gap-1 text-xs text-[#2F3E8F] dark:text-[#8CA0FF] hover:text-[#8B5E3C] dark:hover:text-[#A8C0FF]"
                      >
                        {reverting === entry.changeLogId ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                        Revert this change
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="px-3 py-1 text-sm bg-gray-100 dark:bg-[#2A2A2A] rounded-lg hover:bg-gray-200 dark:hover:bg-[#333] text-gray-800 dark:text-gray-200 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-gray-500 dark:text-gray-400">
            {offset + 1}-{Math.min(offset + limit, total)} of {total}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total}
            className="px-3 py-1 text-sm bg-gray-100 dark:bg-[#2A2A2A] rounded-lg hover:bg-gray-200 dark:hover:bg-[#333] text-gray-800 dark:text-gray-200 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
