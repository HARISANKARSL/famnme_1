/**
 * SnapshotPanel - Create, list, and restore tree snapshots
 */

import { useState, useEffect } from 'react';
import { X, Database, Loader2, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { API_BASE_URL } from '@/config/api';
import { getAuthToken } from '@/lib/auth';

interface Snapshot {
  snapshotId: string;
  treeId: string;
  name: string;
  description?: string;
  personCount: number;
  createdBy: string;
  createdAt: string;
}

interface SnapshotPanelProps {
  treeId: string;
  isOpen: boolean;
  onClose: () => void;
  onRestored?: () => void;
}

export function SnapshotPanel({ treeId, isOpen, onClose, onRestored }: SnapshotPanelProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const loadSnapshots = () => {
    setLoading(true);
    fetch(`${API_BASE_URL}/tree/${treeId}/snapshots`, { headers })
      .then(r => r.json())
      .then(setSnapshots)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) loadSnapshots();
  }, [isOpen, treeId]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await fetch(`${API_BASE_URL}/tree/${treeId}/snapshots`, {
        method: 'POST', headers,
        body: JSON.stringify({ name: newName.trim() }),
      });
      setNewName('');
      setShowCreate(false);
      loadSnapshots();
    } catch (e) { console.error(e); }
    finally { setCreating(false); }
  };

  const handleRestore = async (snapshotId: string) => {
    if (!confirm('Are you sure you want to restore this snapshot? This will replace all current tree data.')) return;
    setRestoring(snapshotId);
    try {
      await fetch(`${API_BASE_URL}/tree/${treeId}/snapshots/${snapshotId}/restore`, {
        method: 'POST', headers,
      });
      onRestored?.();
    } catch (e) { console.error(e); }
    finally { setRestoring(null); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[380px] bg-white shadow-xl z-50 flex flex-col border-l">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-indigo-50 to-indigo-100">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-600" />
          <h2 className="font-semibold text-gray-900">Tree Snapshots</h2>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-indigo-200 rounded">
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="px-4 py-3 border-b">
        {showCreate ? (
          <div className="flex gap-2">
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Snapshot name" className="flex-1" />
            <Button size="sm" onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="w-full" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" /> Create Snapshot
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : snapshots.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No snapshots yet.</p>
        ) : (
          snapshots.map(s => (
            <div key={s.snapshotId} className="border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm text-gray-900">{s.name}</h4>
                <span className="text-xs text-gray-400">{s.personCount} persons</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {(() => {
                  try {
                    const d = new Date(s.createdAt);
                    if (isNaN(d.getTime())) return s.createdAt;
                    const dd = String(d.getDate()).padStart(2, '0');
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const yy = String(d.getFullYear()).slice(-2);
                    return `${dd}-${mm}-${yy}`;
                  } catch {
                    return s.createdAt;
                  }
                })()}
              </p>
              <Button size="sm" variant="outline" className="mt-2 h-7 text-xs"
                onClick={() => handleRestore(s.snapshotId)}
                disabled={restoring === s.snapshotId}>
                {restoring === s.snapshotId ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RotateCcw className="w-3 h-3 mr-1" />}
                Restore
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
