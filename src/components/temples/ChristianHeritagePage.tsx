/**
 * ChristianHeritagePage — "Coming Soon" experience for Christian users.
 *
 * Shows:
 * - Faith identity hero banner
 * - Checklist of upcoming features (church registry, calendar, etc.)
 * - "Notify me" button (stores intent in localStorage)
 * - Manual entry section (lets users add churches before the registry is ready)
 */

import { useState } from 'react';
import { Bell, Plus, Check, Church, Pencil } from 'lucide-react';
import { ManualSacredPlaceForm } from './ManualSacredPlaceForm';

interface ChristianHeritagePageProps {
  treeId?: string;
}

const UPCOMING_FEATURES = [
  'Church Registry — 1,000+ churches across India',
  'Diocese & denomination mapping (Catholic, CSI, Marthoma, Pentecostal…)',
  'Christian celebrations calendar (Christmas, Easter, Good Friday, Onam…)',
  'Baptism & confirmation venue tracking',
  'Family church traditions & parish history',
  'Map of ancestral parishes across Kerala, Goa & beyond',
];

interface SavedEntry { name: string }

export function ChristianHeritagePage({ treeId }: ChristianHeritagePageProps) {
  const notifyKey = `cc_notify_${treeId}_christian`;
  const manualKey = `cc_manual_${treeId}`;

  const [notified, setNotified] = useState(() => !!localStorage.getItem(notifyKey));
  const [showForm, setShowForm] = useState(false);
  const [savedEntries, setSavedEntries] = useState<string[]>(() => {
    try {
      const all: SavedEntry[] = JSON.parse(localStorage.getItem(manualKey) ?? '[]');
      return all.filter(e => !('faithType' in e) || (e as { faithType?: string }).faithType !== 'mosque').map(e => e.name);
    } catch { return []; }
  });

  const handleNotify = () => {
    localStorage.setItem(notifyKey, '1');
    setNotified(true);
  };

  const handleSaved = (name: string) => {
    setSavedEntries(prev => [...prev, name]);
    setShowForm(false);
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div
          className="px-4 md:px-6 pt-6 pb-8"
          style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #ede9fe 50%, #fce7f3 100%)' }}
        >
          <div className="max-w-lg">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(30, 64, 175, 0.12)' }}>
              <Church className="w-7 h-7 text-[#1d4ed8]" />
            </div>
            <h2 className="text-[20px] font-bold text-[#1e3a8a] mb-1">
              Christian Heritage
            </h2>
            <p className="text-[13px] text-[#3b4f8a]/80 leading-relaxed">
              Your family's churches and sacred places, preserved across generations
            </p>
          </div>
        </div>

        <div className="px-4 md:px-6 py-5 space-y-5">

          {/* Saved churches */}
          {savedEntries.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-[#3D2E1F] dark:text-[#f5f5f5] uppercase tracking-wider mb-2.5">
                Your Saved Places
              </p>
              <div className="space-y-2">
                {savedEntries.map((name, i) => (
                  <div key={i} className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-white dark:bg-[#1a1a1a] border border-[#E2DBCE]/60 dark:border-[#2a2a2a]">
                    <div className="w-7 h-7 rounded-lg bg-[#dbeafe] flex items-center justify-center shrink-0">
                      <Church className="w-3.5 h-3.5 text-[#1d4ed8]" />
                    </div>
                    <span className="text-[13px] font-medium text-[#3D2E1F] dark:text-[#f5f5f5]">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Coming soon card */}
          <div className="rounded-2xl border border-[#bfdbfe] dark:border-[#1e3a8a]/40 bg-[#eff6ff]/80 dark:bg-[#1e3a8a]/10 p-5">
            <p className="text-[11px] font-semibold text-[#1d4ed8] uppercase tracking-wider mb-3">
              What's Coming for Christian Families
            </p>
            <div className="space-y-2.5 mb-4">
              {UPCOMING_FEATURES.map((f, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded border border-[#93c5fd] dark:border-[#1e40af] shrink-0 mt-0.5" />
                  <p className="text-[13px] text-[#1e3a8a] dark:text-[#93c5fd] leading-snug">{f}</p>
                </div>
              ))}
            </div>
            <button
              onClick={handleNotify}
              disabled={notified}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold transition-colors ${
                notified
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 cursor-default'
                  : 'bg-[#1d4ed8] text-white hover:bg-[#1e40af]'
              }`}
            >
              {notified
                ? <><Check className="w-4 h-4" /> Notification set</>
                : <><Bell className="w-4 h-4" /> Notify me when available</>
              }
            </button>
          </div>

          {/* Manual entry */}
          <div className="rounded-2xl border border-[#E2DBCE] dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] p-5">
            <div className="flex items-center gap-2 mb-1">
              <Pencil className="w-3.5 h-3.5 text-[#2F3E8F]" />
              <p className="text-[14px] font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">
                Add Your Family's Sacred Places Now
              </p>
            </div>
            <p className="text-[12px] text-[#8B7355] dark:text-[#A19F9D] mb-4 leading-relaxed">
              You can record your family's important churches today. They'll be enriched automatically once our
              church registry launches.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#2F3E8F]/30 text-[13px] font-medium text-[#2F3E8F] hover:bg-[#F6F2EA] dark:hover:bg-[#1E1E1E] transition-colors"
            >
              <Plus className="w-4 h-4" /> Add a church or sacred place
            </button>
          </div>

        </div>
      </div>

      {showForm && (
        <ManualSacredPlaceForm
          faithType="church"
          treeId={treeId}
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
