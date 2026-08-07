/**
 * DisputeResolutionPanel - List disputed fields with resolve actions
 */

import { useState, useEffect } from 'react';
import { X, AlertTriangle, Loader2, Check, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/config/api';
import { getAuthToken } from '@/lib/auth';

interface DisputedPerson {
  personId: string;
  firstName: string;
  lastName: string;
  confidenceLevels: Record<string, 'confirmed' | 'assumed' | 'disputed'>;
}

interface DisputeResolutionPanelProps {
  treeId: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToPerson?: (personId: string) => void;
}

export function DisputeResolutionPanel({ treeId, isOpen, onClose, onNavigateToPerson }: DisputeResolutionPanelProps) {
  const [disputed, setDisputed] = useState<DisputedPerson[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const token = getAuthToken();
    fetch(`${API_BASE_URL}/tree/${treeId}/disputed`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(setDisputed)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen, treeId]);

  const resolveField = async (personId: string, field: string, newLevel: 'confirmed' | 'assumed') => {
    const person = disputed.find(p => p.personId === personId);
    if (!person) return;
    const updated = { ...person.confidenceLevels, [field]: newLevel };
    const token = getAuthToken();
    await fetch(`${API_BASE_URL}/person/${personId}/confidence`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ confidenceLevels: updated }),
    });
    setDisputed(prev => prev.map(p =>
      p.personId === personId ? { ...p, confidenceLevels: updated } : p
    ).filter(p => Object.values(p.confidenceLevels).includes('disputed')));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[400px] bg-white shadow-xl z-50 flex flex-col border-l">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-blue-100">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <h2 className="font-semibold text-gray-900">Disputed Fields</h2>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-blue-200 rounded">
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : disputed.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No disputed fields found.</p>
        ) : (
          disputed.map(person => {
            const disputedFields = Object.entries(person.confidenceLevels)
              .filter(([, level]) => level === 'disputed');
            return (
              <div key={person.personId} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="font-medium text-sm text-gray-900 cursor-pointer hover:text-[#2F3E8F]"
                    onClick={() => onNavigateToPerson?.(person.personId)}
                  >
                    {person.firstName} {person.lastName}
                  </span>
                  <span className="text-xs bg-blue-100 text-[#2F3E8F] px-2 py-0.5 rounded-full">
                    {disputedFields.length} disputed
                  </span>
                </div>
                {disputedFields.map(([field]) => (
                  <div key={field} className="flex items-center justify-between py-1 text-xs border-t">
                    <span className="flex items-center gap-1 text-gray-600">
                      <HelpCircle className="w-3 h-3 text-red-500" />
                      {field}
                    </span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
                        onClick={() => resolveField(person.personId, field, 'confirmed')}>
                        <Check className="w-3 h-3 mr-0.5" /> Confirm
                      </Button>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
                        onClick={() => resolveField(person.personId, field, 'assumed')}>
                        Assume
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
