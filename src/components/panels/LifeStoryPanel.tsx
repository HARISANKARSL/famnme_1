import { useState, useEffect, useMemo } from 'react';
import { BookOpen, X, Edit2, Gem, Loader2 } from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';
import type { Person, Union } from '@/types';
import type { Relationship } from '@/services/elkLayoutService';
import { generateLifeStory } from '@/services/lifeStoryService';
import { getLifeEvents } from '@/services/phase1ApiService';
import { aiApiCalls } from '@/api/apicalls';
import { resolveBackendUrl } from '@/config/api';

interface LifeStoryPanelProps {
  personId: string;
  treeId: string;
  persons: Person[];
  unions: Union[];
  relationships: Relationship[];
  onClose: () => void;
}

export function LifeStoryPanel({
  personId,
  treeId: _treeId,
  persons,
  unions,
  relationships,
  onClose,
}: LifeStoryPanelProps) {
  const { isMobile } = useResponsive();
  const [customNotes, setCustomNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [lifeEvents, setLifeEvents] = useState<
    Array<{ eventType: string; eventDate?: string | null; location?: string | null; description?: string | null }>
  >([]);

  const person = useMemo(() => persons.find(p => p.personId === personId), [persons, personId]);

  // Derive parents
  const parents = useMemo(() => {
    if (!person) return [];
    // Find unions where this person is a child (HAS_CHILD relationship pointing to person)
    const parentUnionIds = relationships
      .filter(r => r.type === 'HAS_CHILD' && r.toId === personId)
      .map(r => r.fromId);

    const parentIds = new Set<string>();
    for (const uid of parentUnionIds) {
      relationships
        .filter(r => r.type === 'PARTNER_IN' && r.toId === uid)
        .forEach(r => parentIds.add(r.fromId));
    }
    return persons.filter(p => parentIds.has(p.personId));
  }, [person, persons, relationships, personId]);

  // Derive spouses + union info
  const spouses = useMemo(() => {
    if (!person) return [];
    // Find unions where person is a partner
    const partnerRels = relationships.filter(
      r => r.type === 'PARTNER_IN' && r.fromId === personId
    );
    const result: Array<{ spouse: Person; union: Union }> = [];
    for (const rel of partnerRels) {
      const union = unions.find(u => u.unionId === rel.toId);
      if (!union) continue;
      // Find the other partner
      const otherPartnerRel = relationships.find(
        r => r.type === 'PARTNER_IN' && r.toId === rel.toId && r.fromId !== personId
      );
      if (!otherPartnerRel) continue;
      const spouse = persons.find(p => p.personId === otherPartnerRel.fromId);
      if (spouse) result.push({ spouse, union });
    }
    return result;
  }, [person, persons, unions, relationships, personId]);

  // Derive children
  const children = useMemo(() => {
    if (!person) return [];
    const partnerRels = relationships.filter(
      r => r.type === 'PARTNER_IN' && r.fromId === personId
    );
    const childIds = new Set<string>();
    for (const rel of partnerRels) {
      relationships
        .filter(r => r.type === 'HAS_CHILD' && r.fromId === rel.toId)
        .forEach(r => childIds.add(r.toId));
    }
    return persons.filter(p => childIds.has(p.personId));
  }, [person, persons, relationships, personId]);

  // Derive siblings (share at least one parent union)
  const siblings = useMemo(() => {
    if (!person) return [];
    const parentUnionIds = relationships
      .filter(r => r.type === 'HAS_CHILD' && r.toId === personId)
      .map(r => r.fromId);

    const siblingIds = new Set<string>();
    for (const uid of parentUnionIds) {
      relationships
        .filter(r => r.type === 'HAS_CHILD' && r.fromId === uid && r.toId !== personId)
        .forEach(r => siblingIds.add(r.toId));
    }
    return persons.filter(p => siblingIds.has(p.personId));
  }, [person, persons, relationships, personId]);

  // Fetch life events
  // useEffect(() => {
  //   let cancelled = false;
  //   async function fetchEvents() {
  //     try {
  //       const events = await getLifeEvents(personId);
  //       if (!cancelled) {
  //         setLifeEvents(
  //           events.map(e => ({
  //             eventType: e.eventType,
  //             eventDate: e.eventDate,
  //             location: e.location,
  //             description: e.description,
  //           }))
  //         );
  //       }
  //     } catch {
  //       // Life events may not exist yet; silently ignore
  //     }
  //   }
  //   fetchEvents();
  //   return () => { cancelled = true; };
  // }, [personId]);

  // Template-based narrative (instant fallback)
  const templateNarrative = useMemo(() => {
    if (!person) return '';
    return generateLifeStory({ person, parents, spouses, children, siblings, lifeEvents });
  }, [person, parents, spouses, children, siblings, lifeEvents]);

  // AI-generated narrative (async, preferred)
  const [aiNarrative, setAiNarrative] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setAiLoading(true);
    console.log("Initiating AI Life Story call for", personId);
    aiApiCalls.getLifeStory(personId).then(res => {
      console.log("AI Life Story response:", res);
      if (!cancelled) {
        setAiNarrative(res?.story || null);
        setAiLoading(false);
      }
    }).catch((err) => { 
      console.error("AI Life Story error:", err);
      if (!cancelled) setAiLoading(false); 
    });
    return () => { cancelled = true; };
  }, [personId]);

  const narrative = aiNarrative || templateNarrative;
  const isAI = !!aiNarrative;

  if (!person) return null;

  const photoUrl = person.profilePhotoUrl
    ? resolveBackendUrl(person.profilePhotoUrl)
    : null;

  const lifespan = [
    person.birthDate ? new Date(person.birthDate).getFullYear() : '?',
    person.isLiving ? 'present' : person.deathDate ? new Date(person.deathDate).getFullYear() : '?',
  ].join(' - ');

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`fixed ${isMobile ? 'inset-0' : 'right-0 top-0 bottom-0 w-full sm:w-[420px]'} bg-white shadow-2xl z-50 flex flex-col overflow-hidden`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-sky-600" />
            <h2 className="text-lg font-semibold text-gray-900">Life Story</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Person Info */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={person.firstName}
              className="w-14 h-14 rounded-full object-cover border-2 border-sky-200"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-sky-100 flex items-center justify-center border-2 border-sky-200">
              <span className="text-xl font-bold text-sky-700">
                {person.firstName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              {person.firstName} {person.lastName || ''}
            </h3>
            <p className="text-sm text-gray-500">{lifespan}</p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className={`flex-1 overflow-y-auto px-6 py-5 space-y-6 ${isMobile ? 'pb-16' : ''}`}>
          {/* Auto-Generated Narrative */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Narrative
              </h4>
              {aiLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2F3E8F]" />}
              {isAI && !aiLoading && (
                <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[#2F3E8F]/10 text-[#2F3E8F] font-medium">
                  <Gem className="w-2.5 h-2.5" /> AI Generated
                </span>
              )}
            </div>
            {narrative ? (
              <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                {narrative}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">
                Not enough data to generate a life story. Add birth dates, relationships, and life events to see the narrative.
              </p>
            )}
          </div>

          {/* Custom Notes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Custom Notes
              </h4>
              <button
                onClick={() => setIsEditingNotes(!isEditingNotes)}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                title={isEditingNotes ? 'Done editing' : 'Edit notes'}
              >
                <Edit2 className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            {isEditingNotes ? (
              <textarea
                className="w-full min-h-[120px] rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-y"
                placeholder="Write your own notes or narrative override here..."
                value={customNotes}
                onChange={e => setCustomNotes(e.target.value)}
              />
            ) : (
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line min-h-[40px]">
                {customNotes || (
                  <span className="text-gray-400 italic">
                    No custom notes yet. Click the edit icon to add your own narrative.
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
