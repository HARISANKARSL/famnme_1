/**
 * ManualSacredPlaceForm — Simple form for Christians/Muslims to record sacred places
 * before the full church/mosque registry is available.
 *
 * Saves as a pending entry in localStorage (`cc_manual_${treeId}`).
 * Entries will be enriched automatically once the registry launches.
 */

import { useState } from 'react';
import { X, MapPin } from 'lucide-react';

interface ManualSacredPlaceFormProps {
  faithType: 'church' | 'mosque' | 'sacred place';
  treeId?: string;
  onClose: () => void;
  onSaved: (name: string) => void;
}

const CONNECTION_TYPES_CHRISTIAN = [
  { value: 'regular_visit',      label: 'Regular Parish / Sunday Church' },
  { value: 'birth_temple',       label: 'Birth / Christening Church' },
  { value: 'ceremony_location',  label: 'Wedding / Ceremony Venue' },
  { value: 'ancestral',          label: 'Ancestral Parish' },
  { value: 'kula_devata',        label: 'Family Chapel / Heritage Church' },
  { value: 'pilgrimage',         label: 'Pilgrimage Site' },
];

const CONNECTION_TYPES_MOSQUE = [
  { value: 'regular_visit',      label: 'Regular Masjid / Friday Prayers' },
  { value: 'birth_temple',       label: 'Birth / Aqiqah Venue' },
  { value: 'ceremony_location',  label: 'Nikah / Wedding Venue' },
  { value: 'ancestral',          label: 'Ancestral Masjid' },
  { value: 'pilgrimage',         label: 'Hajj / Umrah Site' },
  { value: 'kula_devata',        label: 'Family Dargah / Shrine' },
];

export function ManualSacredPlaceForm({ faithType, treeId, onClose, onSaved }: ManualSacredPlaceFormProps) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [connectionType, setConnectionType] = useState('regular_visit');

  const connectionTypes = faithType === 'mosque' ? CONNECTION_TYPES_MOSQUE : CONNECTION_TYPES_CHRISTIAN;

  const placeholder = faithType === 'mosque'
    ? 'e.g. Cheraman Juma Masjid, Kodungallur'
    : "e.g. St Mary's Church, Ernakulam";

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const existing: unknown[] = JSON.parse(localStorage.getItem(`cc_manual_${treeId}`) ?? '[]');
    existing.push({
      name: trimmedName,
      location: location.trim(),
      connectionType,
      faithType,
      addedAt: new Date().toISOString(),
    });
    localStorage.setItem(`cc_manual_${treeId}`, JSON.stringify(existing));
    onSaved(trimmedName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-safe">
      <div className="w-full sm:max-w-md bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#E2DBCE]/60 dark:border-[#2a2a2a]">
          <h3 className="text-[15px] font-semibold text-[#3D2E1F] dark:text-[#f5f5f5] capitalize">
            Add a {faithType}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4 text-[#8B7355]" />
          </button>
        </div>

        {/* Fields */}
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-[#8B7355] uppercase tracking-wider mb-1 block">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder={placeholder}
              className="w-full h-10 px-3 text-sm border border-[#E2DBCE] dark:border-[#2a2a2a] rounded-lg bg-white dark:bg-[#1E1E1E] text-[#3D2E1F] dark:text-[#f5f5f5] placeholder:text-[#8B7355]/50 focus:outline-none focus:ring-1 focus:ring-[#2F3E8F]/40"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#8B7355] uppercase tracking-wider mb-1 block">
              Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B7355] pointer-events-none" />
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="City, State"
                className="w-full h-10 pl-8 pr-3 text-sm border border-[#E2DBCE] dark:border-[#2a2a2a] rounded-lg bg-white dark:bg-[#1E1E1E] text-[#3D2E1F] dark:text-[#f5f5f5] placeholder:text-[#8B7355]/50 focus:outline-none focus:ring-1 focus:ring-[#2F3E8F]/40"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#8B7355] uppercase tracking-wider mb-1 block">
              Connection Type
            </label>
            <select
              value={connectionType}
              onChange={e => setConnectionType(e.target.value)}
              className="w-full h-10 px-3 text-sm border border-[#E2DBCE] dark:border-[#2a2a2a] rounded-lg bg-white dark:bg-[#1E1E1E] text-[#3D2E1F] dark:text-[#f5f5f5] focus:outline-none focus:ring-1 focus:ring-[#2F3E8F]/40"
            >
              {connectionTypes.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[#E2DBCE] dark:border-[#2a2a2a] text-[13px] text-[#8B7355] hover:bg-[#F5F0EB] dark:hover:bg-[#1E1E1E] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="flex-1 py-2.5 rounded-xl bg-[#2F3E8F] text-white text-[13px] font-semibold hover:bg-[#A8643A] disabled:opacity-40 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
