/**
 * BranchPrivacyModal - Set branch visibility (public/family-only/private)
 */

import { useState } from 'react';
import { X, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/config/api';
import { getAuthToken } from '@/lib/auth';
import { useResponsive } from '@/hooks/useResponsive';

interface BranchPrivacyModalProps {
  personId: string;
  personName: string;
  currentVisibility: 'public' | 'family-only' | 'private';
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const VISIBILITY_OPTIONS = [
  { value: 'public',      label: 'Public',      icon: '🌍', description: 'Visible to anyone with the tree link' },
  { value: 'family-only', label: 'Family only', icon: '👥', description: 'Visible only to people invited to this tree' },
  { value: 'private',     label: 'Private',     icon: '🔒', description: 'Visible only to you and the tree owner' },
] as const;

export function BranchPrivacyModal({ personId, personName, currentVisibility, isOpen, onClose, onSaved }: BranchPrivacyModalProps) {
  const { isMobile } = useResponsive();
  const [selected, setSelected] = useState(currentVisibility);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = getAuthToken();
      await fetch(`${API_BASE_URL}/person/${personId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ branchVisibility: selected }),
      });
      onSaved?.();
      onClose();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black/50 z-50 ${isMobile ? 'flex items-end' : 'flex items-center justify-center'}`} onClick={onClose}>
      <div className={`bg-white shadow-xl ${isMobile ? 'w-full rounded-t-xl rounded-b-none max-h-[90dvh] overflow-y-auto' : 'w-[400px] max-w-[90vw] rounded-xl'}`} style={isMobile ? { paddingBottom: 'env(safe-area-inset-bottom)' } : undefined} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-gray-900">Branch Privacy</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm text-gray-600 mb-4">
            Set privacy for <strong>{personName}</strong> and all their downstream descendants.
          </p>

          <div className="space-y-2">
            {VISIBILITY_OPTIONS.map(opt => (
              <label key={opt.value} className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${selected === opt.value ? 'border-indigo-500 bg-indigo-50' : 'hover:bg-gray-50'}`}>
                <input
                  type="radio"
                  name="visibility"
                  value={opt.value}
                  checked={selected === opt.value}
                  onChange={() => setSelected(opt.value)}
                  className="mt-1"
                />
                <span className="text-2xl leading-none mt-0.5" aria-hidden>{opt.icon}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900">{opt.label}</span>
                  <p className="text-xs text-gray-500">{opt.description}</p>
                </div>
              </label>
            ))}
          </div>

          {/* D7 — preview "see who can view this" */}
          <button
            type="button"
            onClick={() => {
              const audience = selected === 'public'
                ? 'Anyone with the tree link can view this branch.'
                : selected === 'family-only'
                  ? 'Only people you have invited as collaborators can view this branch. Open Settings → Trees to see the list.'
                  : 'Only you and the tree owner can view this branch.';
              alert(audience);
            }}
            className="mt-3 text-xs text-indigo-600 hover:underline"
          >
            See who can view this →
          </button>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t bg-gray-50 rounded-b-xl">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || selected === currentVisibility}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
