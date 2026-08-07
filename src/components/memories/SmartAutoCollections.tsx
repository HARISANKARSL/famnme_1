/**
 * SmartAutoCollections — Client-side clustering of memories into suggested album groups
 * Clusters by shared category, date proximity, place, or tagged persons
 */

import { useMemo, useState } from 'react';
import { Wand2, FolderPlus, X, ChevronRight } from 'lucide-react';
import type { Memory } from '@/types';

interface SmartAutoCollectionsProps {
  memories: Memory[];
  onCreateAlbum: (name: string, memoryIds: string[]) => void;
}

interface SuggestedCollection {
  id: string;
  name: string;
  reason: string;
  memoryIds: string[];
  previewUrls: string[];
}

export function SmartAutoCollections({ memories, onCreateAlbum }: SmartAutoCollectionsProps) {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const suggestions = useMemo(() => {
    if (memories.length < 4) return [];
    const results: SuggestedCollection[] = [];

    // 1. Group by category
    const byCategory = new Map<string, Memory[]>();
    memories.forEach(m => {
      if (m.category) {
        if (!byCategory.has(m.category)) byCategory.set(m.category, []);
        byCategory.get(m.category)!.push(m);
      }
    });
    byCategory.forEach((mems, cat) => {
      if (mems.length >= 3) {
        results.push({
          id: `cat-${cat}`,
          name: `${cat} Memories`,
          reason: `${mems.length} memories in "${cat}"`,
          memoryIds: mems.map(m => m.memoryId),
          previewUrls: mems.filter(m => m.mediaUrl).slice(0, 3).map(m => m.mediaUrl!),
        });
      }
    });

    // 2. Group by place
    const byPlace = new Map<string, Memory[]>();
    memories.forEach(m => {
      if (m.placeTaken) {
        const place = m.placeTaken.trim().toLowerCase();
        if (!byPlace.has(place)) byPlace.set(place, []);
        byPlace.get(place)!.push(m);
      }
    });
    byPlace.forEach((mems, place) => {
      if (mems.length >= 3) {
        const displayName = mems[0].placeTaken!;
        results.push({
          id: `place-${place}`,
          name: `Memories from ${displayName}`,
          reason: `${mems.length} memories at this location`,
          memoryIds: mems.map(m => m.memoryId),
          previewUrls: mems.filter(m => m.mediaUrl).slice(0, 3).map(m => m.mediaUrl!),
        });
      }
    });

    // 3. Group by tagged person (most tagged)
    const byPerson = new Map<string, { name: string; memories: Memory[] }>();
    memories.forEach(m => {
      const tagged = (m as any).taggedPeople || m.files?.[0]?.taggedPeople || m.taggedPersons || m.files?.[0]?.taggedPersons || [];
      tagged.forEach((p: any) => {
        const id = p.id || p.personId;
        const name = p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim();
        if (!byPerson.has(id)) byPerson.set(id, { name, memories: [] });
        byPerson.get(id)!.memories.push(m);
      });
    });
    byPerson.forEach(({ name, memories: mems }) => {
      if (mems.length >= 4) {
        results.push({
          id: `person-${name}`,
          name: `${name}'s Album`,
          reason: `${mems.length} memories featuring ${name}`,
          memoryIds: mems.map(m => m.memoryId),
          previewUrls: mems.filter(m => m.mediaUrl).slice(0, 3).map(m => m.mediaUrl!),
        });
      }
    });

    // 4. Group by date proximity (same month)
    const byMonth = new Map<string, Memory[]>();
    memories.forEach(m => {
      if (m.dateTaken) {
        const key = m.dateTaken.substring(0, 7); // YYYY-MM
        if (!byMonth.has(key)) byMonth.set(key, []);
        byMonth.get(key)!.push(m);
      }
    });
    byMonth.forEach((mems, monthKey) => {
      if (mems.length >= 4) {
        const d = new Date(monthKey + '-01');
        const label = d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
        results.push({
          id: `month-${monthKey}`,
          name: `${label}`,
          reason: `${mems.length} memories from this month`,
          memoryIds: mems.map(m => m.memoryId),
          previewUrls: mems.filter(m => m.mediaUrl).slice(0, 3).map(m => m.mediaUrl!),
        });
      }
    });

    // Deduplicate and limit
    const seen = new Set<string>();
    return results.filter(r => {
      const key = r.memoryIds.sort().join(',');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 6);
  }, [memories]);

  if (suggestions.length === 0 || dismissed) return null;

  return (
    <div className="border-b border-[#E2E8F0]/60 dark:border-[#2a2a2a] bg-violet-50/30 dark:bg-violet-950/10">
      <div className="px-5 sm:px-8 py-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-violet-100 dark:bg-violet-900/30 shrink-0">
            <Wand2 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">Suggested Albums</p>
            <p className="text-[11px] text-[#8B7355] dark:text-[#999]">{suggestions.length} album ideas based on your memories</p>
          </div>
          <button onClick={() => setExpanded(!expanded)}
            className="text-[12px] font-medium text-violet-600 dark:text-violet-400 hover:underline shrink-0 flex items-center gap-1">
            {expanded ? 'Hide' : 'Show'}
            <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
          <button onClick={() => setDismissed(true)}
            className="p-1 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.05]">
            <X className="w-3.5 h-3.5 text-[#B8A090] dark:text-[#666]" strokeWidth={1.5} />
          </button>
        </div>

        {expanded && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {suggestions.map(s => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-[#E2E8F0]/60 dark:border-[#2a2a2a] bg-white/60 dark:bg-white/[0.02]">
                <div className="flex -space-x-2 shrink-0">
                  {s.previewUrls.map((url, i) => (
                    <div key={i} className="w-8 h-8 rounded-lg overflow-hidden border-2 border-white dark:border-[#1a1a1a]">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {s.previewUrls.length === 0 && (
                    <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                      <FolderPlus className="w-3.5 h-3.5 text-violet-500" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[#3D2E1F] dark:text-[#f5f5f5] truncate">{s.name}</p>
                  <p className="text-[10px] text-[#8B7355] dark:text-[#999]">{s.reason}</p>
                </div>
                <button
                  onClick={() => onCreateAlbum(s.name, s.memoryIds)}
                  className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                >
                  Create
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
