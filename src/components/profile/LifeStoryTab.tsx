import { useState, useMemo } from 'react';
import { Loader2, Gem, Sparkles } from 'lucide-react';
import type { Person, Union } from '@/types';
import type { Relationship } from '@/services/elkLayoutService';
import { generateLifeStory } from '@/services/lifeStoryService';
import { resolveBackendUrl } from '@/config/api';
import { getPersonPhotoUrl, getDefaultAvatar } from '@/utils/personPhotoUtils';

interface LifeStoryTabProps {
  person: Person;
  treeId: string;
  persons: Person[];
  unions: Union[];
  relationships: Relationship[];
  onPersonNavigate: (personId: string) => void;
  aiCitations: any[];
  aiLoading: boolean;
  onUpdateBiography?: () => Promise<void>;
}

function extractYear(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  try { return new Date(dateStr).getFullYear(); } catch { return null; }
}

export function LifeStoryTab({
  person,
  treeId: _treeId,
  persons,
  unions,
  relationships,
  onPersonNavigate,
  aiCitations,
  aiLoading,
  onUpdateBiography,
}: LifeStoryTabProps) {
  const [lifeEvents] = useState<
    Array<{ eventType: string; eventDate?: string | null; location?: string | null; description?: string | null }>
  >([]);
  const [loading] = useState(false);

  // Derive family
  const parents = useMemo(() => {
    const parentUnionIds = relationships
      .filter(r => r.type === 'HAS_CHILD' && r.toId === person.personId)
      .map(r => r.fromId);
    const parentIds = new Set<string>();
    for (const uid of parentUnionIds) {
      relationships
        .filter(r => r.type === 'PARTNER_IN' && r.toId === uid)
        .forEach(r => parentIds.add(r.fromId));
    }
    return persons.filter(p => parentIds.has(p.personId));
  }, [persons, relationships, person.personId]);

  const spouses = useMemo(() => {
    const partnerRels = relationships.filter(r => r.type === 'PARTNER_IN' && r.fromId === person.personId);
    const result: Array<{ spouse: Person; union: Union }> = [];
    for (const rel of partnerRels) {
      const union = unions.find(u => u.unionId === rel.toId);
      if (!union) continue;
      const otherRel = relationships.find(r => r.type === 'PARTNER_IN' && r.toId === rel.toId && r.fromId !== person.personId);
      if (!otherRel) continue;
      const spouse = persons.find(p => p.personId === otherRel.fromId);
      if (spouse) result.push({ spouse, union });
    }
    return result;
  }, [persons, unions, relationships, person.personId]);

  const children = useMemo(() => {
    const partnerRels = relationships.filter(r => r.type === 'PARTNER_IN' && r.fromId === person.personId);
    const childIds = new Set<string>();
    for (const rel of partnerRels) {
      relationships
        .filter(r => r.type === 'HAS_CHILD' && r.fromId === rel.toId)
        .forEach(r => childIds.add(r.toId));
    }
    return persons.filter(p => childIds.has(p.personId));
  }, [persons, relationships, person.personId]);

  const siblings = useMemo(() => {
    const parentUnionIds = relationships
      .filter(r => r.type === 'HAS_CHILD' && r.toId === person.personId)
      .map(r => r.fromId);
    const siblingIds = new Set<string>();
    for (const uid of parentUnionIds) {
      relationships
        .filter(r => r.type === 'HAS_CHILD' && r.fromId === uid && r.toId !== person.personId)
        .forEach(r => siblingIds.add(r.toId));
    }
    return persons.filter(p => siblingIds.has(p.personId));
  }, [persons, relationships, person.personId]);

  // Template narrative (instant fallback)
  const templateNarrative = useMemo(() => {
    return generateLifeStory({ person, parents, spouses, children, siblings, lifeEvents });
  }, [person, parents, spouses, children, siblings, lifeEvents]);

  // Only show template as fallback once AI has finished loading (to avoid jarring swap)
  const narrative = aiLoading ? null : (person.biography || templateNarrative);
  const isAI = !!person.biography && !aiLoading;

  // Consolidate backend biographyReferences and transient aiCitations
  const citationsToRender = useMemo(() => {
    let refs = person.biographyReferences;
    if (typeof refs === 'string') {
      try {
        refs = JSON.parse(refs);
      } catch (e) {
        console.error('Failed to parse biographyReferences:', e);
        refs = null;
      }
    }

    if (Array.isArray(refs) && refs.length > 0) {
      return refs.map(ref => ({
        label: ref.displayName || ref.label || '',
        personId: ref.personId || ref.id
      }));
    }

    if (Array.isArray(aiCitations) && aiCitations.length > 0) {
      return aiCitations.map(cit => ({
        label: cit.label || cit.displayName || '',
        personId: cit.personId || cit.id
      }));
    }

    return [];
  }, [person.biographyReferences, aiCitations]);

  // Build timeline items for visual display
  const timelineItems = useMemo(() => {
    const items: Array<{
      year: number | null;
      heading: string;
      text: string;
      type: 'birth' | 'marriage' | 'event' | 'death';
    }> = [];

    items.push({
      year: extractYear(person.birthDate),
      heading: 'Birth',
      text: [person.birthPlace, parents.length > 0 ? `Born to ${parents.map(p => `${p.firstName} ${p.lastName}`).join(' and ')}` : null].filter(Boolean).join('. '),
      type: 'birth',
    });

    for (const { spouse, union } of spouses) {
      items.push({
        year: extractYear(union.startDate),
        heading: 'Marriage',
        text: `Married ${spouse.firstName} ${spouse.lastName}${union.marriagePlace ? ` in ${union.marriagePlace}` : ''}`,
        type: 'marriage',
      });
    }

    for (const ev of lifeEvents) {
      items.push({
        year: extractYear(ev.eventDate),
        heading: ev.eventType,
        text: [ev.description, ev.location].filter(Boolean).join(' - '),
        type: 'event',
      });
    }

    if (person.deathDate || person.isLiving === false) {
      items.push({
        year: extractYear(person.deathDate),
        heading: 'Death',
        text: person.deathPlace || '',
        type: 'death',
      });
    }

    items.sort((a, b) => {
      if (a.year === null && b.year === null) return 0;
      if (a.year === null) return -1;
      if (b.year === null) return 1;
      return a.year - b.year;
    });

    return items;
  }, [person, parents, spouses, lifeEvents]);

  const fallbackAvatar = (gender?: string | null) => getDefaultAvatar(gender);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#2F3E8F]" />
      </div>
    );
  }

  const typeColor = (type: string) => {
    switch (type) {
      case 'birth': return 'bg-[#E8EDFF]0';
      case 'marriage': return 'bg-[#E8EDFF]0';
      case 'death': return 'bg-gray-500';
      default: return 'bg-[#E8EDFF]0';
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Narrative block */}
      <div className="bg-white dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-[#2a2a2a] p-5 mb-8">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-serif-display italic text-gray-800 dark:text-gray-200">The Life Story of {person.firstName}</h3>
            {isAI && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#2F3E8F]/10 dark:bg-[#2F3E8F]/20 text-[#2F3E8F] dark:text-[#8CA0FF] font-medium shrink-0">
                <Gem className="w-3 h-3" /> AI
              </span>
            )}
          </div>
          {onUpdateBiography && (
            <button
              onClick={onUpdateBiography}
              disabled={aiLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-[#2F3E8F] to-[#4A5DBC] hover:from-[#25327A] hover:to-[#3B4CA3] active:scale-95 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:pointer-events-none"
            >
              {aiLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {person.biography ? 'Update Story' : 'Generate Story'}
            </button>
          )}
        </div>
        {aiLoading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-3 bg-gray-200 dark:bg-stone-800 rounded w-full" />
            <div className="h-3 bg-gray-200 dark:bg-stone-800 rounded w-11/12" />
            <div className="h-3 bg-gray-200 dark:bg-stone-800 rounded w-4/5" />
            <div className="h-3 bg-gray-200 dark:bg-stone-800 rounded w-full" />
            <div className="h-3 bg-gray-200 dark:bg-stone-800 rounded w-3/4" />
            <div className="h-3 bg-gray-200 dark:bg-stone-800 rounded w-11/12" />
          </div>
        ) : (
          <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
            {narrative}
          </div>
        )}

        {/* Sources block */}
        {citationsToRender.length > 0 && !aiLoading && (
          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-stone-850">
            <h4 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Sources</h4>
            <div className="flex flex-wrap gap-2">
              {citationsToRender.map((cit, idx) => (
                <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded bg-gray-50/80 dark:bg-stone-905/30 border border-gray-100 dark:border-stone-850 text-xs text-gray-600 dark:text-gray-400 font-medium">
                  {cit.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Family card */}
      <div className="bg-[#3D2E1F] rounded-xl p-4 mb-8 flex flex-wrap gap-4 justify-center">
        {/* Person */}
        <div className="flex flex-col items-center">
          <img
            src={getPersonPhotoUrl(person) || getDefaultAvatar(person.gender)}
            alt={person.firstName}
            className="w-14 h-14 rounded-full object-cover border-2 border-[#2F3E8F]"
            onError={(e) => { const img = e.target as HTMLImageElement; img.onerror = null; img.src = getDefaultAvatar(person.gender); }}
          />
          <span className="text-white text-xs mt-1 font-medium">{person.firstName}</span>
        </div>
        {/* Spouse(s) */}
        {spouses.map(({ spouse }) => (
          <div key={spouse.personId} className="flex flex-col items-center cursor-pointer" onClick={() => onPersonNavigate(spouse.personId)}>
            <img
              src={getPersonPhotoUrl(spouse) || getDefaultAvatar(spouse.gender)}
              alt={spouse.firstName}
              className="w-14 h-14 rounded-full object-cover border-2 border-white/30"
              onError={(e) => { const img = e.target as HTMLImageElement; img.onerror = null; img.src = getDefaultAvatar(spouse.gender); }}
            />
            <span className="text-gray-300 text-xs mt-1">{spouse.firstName}</span>
          </div>
        ))}
        {/* Parents */}
        {parents.map(p => (
          <div key={p.personId} className="flex flex-col items-center cursor-pointer" onClick={() => onPersonNavigate(p.personId)}>
            <img
              src={getPersonPhotoUrl(p) || getDefaultAvatar(p.gender)}
              alt={p.firstName}
              className="w-14 h-14 rounded-full object-cover border-2 border-white/30"
              onError={(e) => { const img = e.target as HTMLImageElement; img.onerror = null; img.src = getDefaultAvatar(p.gender); }}
            />
            <span className="text-gray-400 text-xs mt-1">{p.firstName}</span>
          </div>
        ))}
      </div>

      {/* Visual timeline */}
      <h3 className="text-lg font-semibold text-gray-800 dark:text-[#E2DBCE] mb-4">Timeline</h3>
      <div className="relative pl-8">
        {/* Vertical line */}
        <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-300 dark:bg-stone-800" />

        {timelineItems.map((item, i) => (
          <div key={i} className="relative mb-6">
            {/* Dot */}
            <div className={`absolute left-[-21px] top-1 w-3 h-3 rounded-full ${typeColor(item.type)} border-2 border-white dark:border-[#1E1E1E]`} />
            {/* Year marker */}
            {item.year && (
              <span className="inline-block text-xs font-bold text-[#2F3E8F] dark:text-[#8CA0FF] bg-[#E8EDFF] dark:bg-[#2F3E8F]/20 px-2 py-0.5 rounded mb-1">
                {item.year}
              </span>
            )}
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{item.heading}</h4>
            {item.text && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{item.text}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
