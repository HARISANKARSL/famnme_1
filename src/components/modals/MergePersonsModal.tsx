/**
 * MergePersonsModal - Side-by-side comparison for merging duplicate persons
 */

import { useState } from 'react';
import { Dialog, ResponsiveDialogContent as DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Merge, Check } from 'lucide-react';
import { mergePersons, type DuplicatePair } from '@/services/neo4jDataService';

interface MergePersonsModalProps {
  open: boolean;
  onClose: () => void;
  pair: DuplicatePair;
  treeId: string;
  onMerged?: () => void;
}

type FieldKey = 'firstName' | 'lastName' | 'birthDate' | 'gender' | 'birthPlace';

const FIELDS: Array<{ key: FieldKey; label: string }> = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'birthDate', label: 'Birth Date' },
  { key: 'gender', label: 'Gender' },
  { key: 'birthPlace', label: 'Birth Place' },
];

export function MergePersonsModal({ open, onClose, pair, treeId, onMerged }: MergePersonsModalProps) {
  const [keepId, setKeepId] = useState(pair.person1.personId);
  const [fieldSelections, setFieldSelections] = useState<Record<string, 'keep' | 'remove'>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const removeId = keepId === pair.person1.personId ? pair.person2.personId : pair.person1.personId;
  const keepPerson = keepId === pair.person1.personId ? pair.person1 : pair.person2;
  const removePerson = keepId === pair.person1.personId ? pair.person2 : pair.person1;

  const handleMerge = async () => {
    setLoading(true);
    setError(null);
    try {
      await mergePersons(treeId, keepId, removeId, fieldSelections);
      onMerged?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to merge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="w-5 h-5 text-purple-600" />
            Merge Persons
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Keep/Remove Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => setKeepId(pair.person1.personId)}
              className={`rounded-lg border-2 p-3 text-left transition-all ${
                keepId === pair.person1.personId
                  ? 'border-green-400 dark:border-emerald-400 bg-green-100 dark:bg-emerald-500/10 text-stone-900 dark:text-zinc-100'
                  : 'border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 text-stone-700 dark:text-zinc-300'
              }`}
            >
              {keepId === pair.person1.personId && (
                <span className="text-xs font-bold text-green-700 dark:text-emerald-400 flex items-center gap-1 mb-1">
                  <Check className="w-3 h-3" /> Keep
                </span>
              )}
              <div className="font-semibold">{pair.person1.firstName} {pair.person1.lastName}</div>
              {pair.person1.birthDate && <div className="text-xs text-gray-500 dark:text-zinc-500">{pair.person1.birthDate}</div>}
            </button>
            <button
              onClick={() => setKeepId(pair.person2.personId)}
              className={`rounded-lg border-2 p-3 text-left transition-all ${
                keepId === pair.person2.personId
                  ? 'border-green-400 dark:border-emerald-400 bg-green-100 dark:bg-emerald-500/10 text-stone-900 dark:text-zinc-100'
                  : 'border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 text-stone-700 dark:text-zinc-300'
              }`}
            >
              {keepId === pair.person2.personId && (
                <span className="text-xs font-bold text-green-700 dark:text-emerald-400 flex items-center gap-1 mb-1">
                  <Check className="w-3 h-3" /> Keep
                </span>
              )}
              <div className="font-semibold">{pair.person2.firstName} {pair.person2.lastName}</div>
              {pair.person2.birthDate && <div className="text-xs text-gray-500 dark:text-zinc-500">{pair.person2.birthDate}</div>}
            </button>
          </div>

          {/* Field Selection */}
          <div className="text-sm text-gray-600 dark:text-zinc-300 font-medium">Select which fields to keep:</div>
          <div className="space-y-2">
            {FIELDS.map(({ key, label }) => {
              const keepVal = keepPerson[key];
              const removeVal = removePerson[key];
              if (!keepVal && !removeVal) return null;

              return (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <span className="w-24 text-gray-600 dark:text-zinc-400">{label}:</span>
                  <button
                    onClick={() => setFieldSelections(prev => ({ ...prev, [key]: 'keep' }))}
                    className={`flex-1 px-2 py-1 rounded border text-left truncate transition-all ${
                      fieldSelections[key] !== 'remove'
                        ? 'border-green-300 dark:border-emerald-500 bg-green-100 dark:bg-emerald-500/10 text-stone-900 dark:text-zinc-100'
                        : 'border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 text-stone-755 dark:text-zinc-400'
                    }`}
                  >
                    {keepVal || <span className="text-gray-400 italic dark:text-zinc-500">empty</span>}
                  </button>
                  <button
                    onClick={() => setFieldSelections(prev => ({ ...prev, [key]: 'remove' }))}
                    className={`flex-1 px-2 py-1 rounded border text-left truncate transition-all ${
                      fieldSelections[key] === 'remove'
                        ? 'border-green-300 dark:border-emerald-500 bg-green-100 dark:bg-emerald-500/10 text-stone-900 dark:text-zinc-100'
                        : 'border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 text-stone-755 dark:text-zinc-400'
                    }`}
                  >
                    {removeVal || <span className="text-gray-400 italic dark:text-zinc-500">empty</span>}
                  </button>
                </div>
              );
            })}
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleMerge}
              disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Merge'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
