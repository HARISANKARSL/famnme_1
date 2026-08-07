import { useState, useEffect, useMemo } from 'react';
import { Plus, Calendar, Heart, Baby, BookOpen, Briefcase, GraduationCap, Loader2, Trash2, Edit2, Check, X as XIcon, Upload, FileText, Image as ImageIcon, ExternalLink, ChevronDown, UserPlus, Users } from 'lucide-react';
import type { Person, Union, LifeEvent, Source, SourceCitation } from '@/types';
import type { Relationship } from '@/services/elkLayoutService';
// removed phase1ApiService import since it is no longer needed here
import { getPersonCitations, getPersonSources, createSource, createPersonSource, addCitation, deleteCitation, deletePersonSource } from '@/services/sourceApiService';
import { treeApiCalls } from '@/api/apicalls';
import { resolveBackendUrl } from '@/config/api';
import { getPersonPhotoUrl, getDefaultAvatar } from '@/utils/personPhotoUtils';
import { Dialog, ResponsiveDialogContent as DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useFormValidation } from '@/hooks/useFormValidation';
import { PlaceAutocomplete } from '@/components/ui/PlaceAutocomplete';
import { useToast } from '@/components/ui/use-toast';

interface FactsTabProps {
  person: Person;
  treeId: string;
  persons: Person[];
  unions: Union[];
  relationships: Relationship[];
  onPersonNavigate: (personId: string) => void;
  onAddRelative: (personId: string, action: string) => void;
}

function getEventIcon(type: string) {
  const lower = type.toLowerCase();
  if (lower.includes('birth')) return <Baby className="h-4 w-4 text-blue-500" />;
  if (lower.includes('death') || lower.includes('rites')) return <Calendar className="h-4 w-4 text-gray-500" />;
  if (lower.includes('marriage') || lower.includes('wedding') || lower.includes('vivah')) return <Heart className="h-4 w-4 text-blue-500" />;
  if (lower.includes('education') || lower.includes('vidya')) return <GraduationCap className="h-4 w-4 text-indigo-500" />;
  if (lower.includes('career') || lower.includes('military')) return <Briefcase className="h-4 w-4 text-emerald-500" />;
  return <BookOpen className="h-4 w-4 text-blue-500" />;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}-${mm}-${yy}`;
  } catch {
    return dateStr;
  }
}

function extractYear(dateStr?: string | null): string {
  if (!dateStr) return '';
  try { return String(new Date(dateStr).getFullYear()); } catch { return ''; }
}

export function FactsTab({
  person,
  treeId,
  persons,
  unions,
  relationships,
  onPersonNavigate,
  onAddRelative,
}: FactsTabProps) {
  const { errors, validateField, validateStep, sanitizeInput, clearError, resetValidation } = useFormValidation();
  const { toast } = useToast();
  const [lifeEvents, setLifeEvents] = useState<LifeEvent[]>([]);
  const [citations, setCitations] = useState<SourceCitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullPerson, setFullPerson] = useState<Person | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; mimeType?: string | null; name?: string | null } | null>(null);

  const hasBasicDetails = useMemo(() => {
    if (!fullPerson) return false;
    return !!(
      fullPerson.occupation ||
      fullPerson.education ||
      fullPerson.religion ||
      fullPerson.nationality ||
      fullPerson.ethnicity ||
      fullPerson.caste ||
      fullPerson.gotra ||
      fullPerson.nativePlace ||
      fullPerson.nativeLanguage
    );
  }, [fullPerson]);

  // Add Family dropdown
  const [showAddFamilyMenu, setShowAddFamilyMenu] = useState(false);

  // Add Fact state
  const [showAddFact, setShowAddFact] = useState(false);
  const [newFact, setNewFact] = useState({ eventType: '', eventDate: '', location: '', description: '', unionId: '' });
  const [savingFact, setSavingFact] = useState(false);
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [editFact, setEditFact] = useState({ eventType: '', eventDate: '', location: '', description: '', endDate: '', endReason: '', endStatus: 'active' });
  const [factToDelete, setFactToDelete] = useState<string | null>(null);
  const [sourceToDelete, setSourceToDelete] = useState<string | null>(null);

  // Add Source state
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSource, setNewSource] = useState({
    title: '',
    type: 'document' as string,
    factType: 'general' as string,
    confidence: 'medium' as string,
    detail: '',
  });
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [savingSource, setSavingSource] = useState(false);

  const hasOpenMarriage = useMemo(() => {
    return lifeEvents.some(
      le => le.eventType?.toLowerCase() === 'marriage' && !le.eventEndDate
    );
  }, [lifeEvents]);

  const personMarriages = useMemo(() => {
    const unionIds = relationships
      .filter(r => r.type === 'PARTNER_IN' && r.fromId === person.personId)
      .map(r => r.toId);
    
    return unionIds.map(uid => {
      const union = unions.find(u => u.unionId === uid && (u.type === 'marriage' || u.type === 'partnership'));
      if (!union) return null;
      
      const spouseRel = relationships.find(r => r.type === 'PARTNER_IN' && r.toId === uid && r.fromId !== person.personId);
      const spouse = spouseRel ? persons.find(p => p.personId === spouseRel.fromId) : null;
      return {
        unionId: uid,
        spouseName: spouse ? `${spouse.firstName || ''} ${spouse.lastName || ''}`.trim() : 'Unknown Spouse'
      };
    }).filter(Boolean) as {unionId: string, spouseName: string}[];
  }, [person.personId, relationships, unions, persons]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [events, cites, p] = await Promise.all([
          treeApiCalls.getLifeEvents(person.personId).catch(() => []),
          getPersonSources(person.personId).catch(() => []),
          treeApiCalls.getPerson(person.personId).catch(() => null),
        ]);
        if (!cancelled) {
          setLifeEvents(events);
          setCitations(cites);
          setFullPerson(p);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [person.personId, unions.length, relationships.length]);

  // Fact handlers
  const handleAddFact = async () => {
    if (!newFact.eventType.trim()) return;

    const configs = {
      factLocation: { required: false, type: 'location', label: 'Location' },
      factDescription: { required: false, type: 'description', label: 'Description' },
    };
    const fieldsToValidate = {
      factLocation: (newFact.location || '').trim(),
      factDescription: (newFact.description || '').trim(),
    };
    const isValid = validateStep(fieldsToValidate, configs as any);
    if (!isValid) return;

    setSavingFact(true);
    try {
      const payload: any = {
        treeId: treeId,
        eventType: newFact.eventType,
        eventDate: newFact.eventDate || null,
        eventDateQualifier: newFact.eventDate ? "EXACT" : null,
        eventEndDate: null,
        location: newFact.location || "",
        description: newFact.description || "",
        notes: newFact.description || ""
      };
      
      if (newFact.eventType === 'divorce' || newFact.eventType === 'widowed') {
         if (!newFact.unionId && personMarriages.length === 1) {
             payload.unionId = personMarriages[0].unionId;
         } else {
             payload.unionId = newFact.unionId;
         }
      }

      await treeApiCalls.addLifeEvent(person.personId, payload);
      setNewFact({ eventType: '', eventDate: '', location: '', description: '', unionId: '' });
      setShowAddFact(false);
      clearError('factLocation');
      clearError('factDescription');
      const events = await treeApiCalls.getLifeEvents(person.personId).catch(() => []);
      setLifeEvents(events);
    } catch (err) {
      console.error('Failed to add fact:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to add fact',
        variant: 'destructive',
      });
    } finally {
      setSavingFact(false);
    }
  };

  const handleUpdateFact = async (eventId: string) => {
    const configs = {
      editFactLocation: { required: false, type: 'location', label: 'Location' },
      editFactDescription: { required: false, type: 'description', label: 'Description' },
    };
    const fieldsToValidate = {
      editFactLocation: (editFact.location || '').trim(),
      editFactDescription: (editFact.description || '').trim(),
    };
    const isValid = validateStep(fieldsToValidate, configs as any);
    if (!isValid) return;

    setSavingFact(true);
    try {
      const typeLower = editFact.eventType.toLowerCase();
      let payload: any;

      if (typeLower === 'birth' || typeLower === 'death') {
        payload = {
          eventDate: editFact.eventDate || null,
          eventDateQualifier: "exact",
          eventEndDate: null,
          location: editFact.location || "",
        };
      } else if (typeLower === 'marriage') {
        payload = {
          eventDate: editFact.eventDate || null,
          eventDateQualifier: "exact",
          location: editFact.location || "",
          notes: editFact.description || "",
          endDate: editFact.endDate || null,
          endReason: editFact.endReason || ""
        };
      } else if (typeLower === 'divorce') {
        payload = {
          eventDate: editFact.eventDate || null,
          eventDateQualifier: "exact",
          notes: editFact.description || ""
        };
      } else {
        payload = {
          eventType: editFact.eventType,
          eventDate: editFact.eventDate || null,
          description: editFact.description || "",
          notes: "",
          location: editFact.location || ""
        };
      }

      await treeApiCalls.updateLifeEvent(eventId, payload);
      setEditingFactId(null);
      clearError('editFactLocation');
      clearError('editFactDescription');
      const events = await treeApiCalls.getLifeEvents(person.personId).catch(() => []);
      setLifeEvents(events);
    } catch (err) {
      console.error('Failed to update fact:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update fact',
        variant: 'destructive',
      });
    } finally {
      setSavingFact(false);
    }
  };

  const handleDeleteFact = async (eventId: string) => {
    try {
      await treeApiCalls.deleteLifeEvent(eventId);
      setLifeEvents(prev => prev.filter(e => e.eventId !== eventId));
      setFactToDelete(null);
    } catch (err) {
      console.error('Failed to delete fact:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete fact',
        variant: 'destructive',
      });
    }
  };

  // Source handlers
  const handleAddSource = async () => {
    const errorMsg = validateField('sourceTitle', newSource.title, { required: true, type: 'source_title', label: 'Source title' });
    if (errorMsg) return;

    setSavingSource(true);
    try {
      // Use the new unified API to create source and citation in one call
      await createPersonSource(person.personId, {
        title: newSource.title,
        type: newSource.type,
        factType: newSource.factType,
        confidence: newSource.confidence,
        detail: newSource.detail,
      }, sourceFile || undefined);

      // Reset and reload
      setNewSource({ title: '', type: 'document', factType: 'general', confidence: 'medium', detail: '' });
      setSourceFile(null);
      setShowAddSource(false);
      resetValidation();
      const cites = await getPersonSources(person.personId).catch(() => []);
      setCitations(cites);
    } catch (err) {
      console.error('Failed to add source:', err);
    } finally {
      setSavingSource(false);
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    try {
      await deletePersonSource(sourceId);
      // Remove the citation associated with this source from local state
      setCitations(prev => prev.filter(c => (c.source?.sourceId || c.sourceId) !== sourceId));
      setSourceToDelete(null);
    } catch (err) {
      console.error('Failed to delete source:', err);
    }
  };

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

  // Build timeline events
  const timelineEvents = useMemo(() => {
    const events: Array<{ 
      year: string; 
      type: string; 
      label: string; 
      detail: string; 
      icon: React.ReactNode; 
      eventId?: string;
      editable?: boolean;
      deletable?: boolean;
    }> = [];

    // Life events from API
    for (const ev of lifeEvents) {
      const displayLabel = ev.eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      events.push({
        year: extractYear(ev.eventDate),
        type: ev.eventType,
        label: ev.title || displayLabel,
        detail: [formatDate(ev.eventDate), ev.location, ev.description].filter(Boolean).join(' - '),
        icon: getEventIcon(ev.eventType),
        eventId: ev.eventId,
        editable: ev.editable,
        deletable: ev.deletable,
      });
    }

    return events;
  }, [lifeEvents]);

  const fallbackAvatar = (gender?: string | null) => getDefaultAvatar(gender);


  function PersonLink({ p }: { p: Person }) {
    return (
      <button
        onClick={() => onPersonNavigate(p.personId)}
        className="flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-white/[0.04] rounded-lg p-2 w-full text-left transition-colors"
      >
        <img
          src={getPersonPhotoUrl(p) || getDefaultAvatar(p.gender)}
          alt={p.firstName}
          className="w-8 h-8 rounded-full object-cover border border-stone-200 dark:border-stone-800"
          onError={(e) => { const img = e.target as HTMLImageElement; img.onerror = null; img.src = getDefaultAvatar(p.gender); }}
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{p.firstName} {p.lastName}</p>
          {p.birthDate && <p className="text-xs text-gray-500 dark:text-gray-400">{extractYear(p.birthDate)}</p>}
        </div>
      </button>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#2F3E8F]" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column - Timeline */}
        <div className="md:col-span-1 order-1">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-[#3D2E1F] dark:text-[#E2DBCE]">Timeline</h3>
            {!showAddFact && (
              <button
                onClick={() => {
                  setShowAddFact(true);
                  clearError('factLocation');
                  clearError('factDescription');
                }}
                className="flex items-center gap-1.5 text-sm text-[#2F3E8F] dark:text-[#8CA0FF] hover:text-[#8B5E3C]"
              >
                <Plus className="h-3.5 w-3.5" /> Add fact
              </button>
            )}
          </div>
          {/* Add Fact */}
          {showAddFact && (
            <div className="mb-4 p-3 bg-white dark:bg-[#1E1E1E] rounded-lg border border-[#E2E8F0] dark:border-[#2a2a2a] space-y-2">
              <select
                value={newFact.eventType}
                onChange={e => {
                  const val = e.target.value;
                  if (val === 'marriage') {
                    setShowAddFact(false);
                    setNewFact({ ...newFact, eventType: '' });
                    onAddRelative(person.personId, 'add-spouse');
                  } else {
                    setNewFact({ ...newFact, eventType: val });
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2F3E8F]"
              >
                <option value="">Select event type...</option>
                <option value="career">Career</option>
                <option value="death">Death</option>
                {hasOpenMarriage && <option value="divorce">Divorced</option>}
                <option value="education">Education</option>
                <option value="immigration">Immigration</option>
                <option value="marriage">Marriage</option>
                <option value="medical">Medical</option>
                <option value="military_service">Military Service</option>
                <option value="religious_ceremony">Religious Ceremony</option>
                <option value="retirement">Retirement</option>
                {hasOpenMarriage && <option value="widowed">Widowed</option>}
                <option value="other">Other</option>
              </select>
              {(newFact.eventType === 'divorce' || newFact.eventType === 'widowed') && personMarriages.length > 1 && (
                <select
                  value={newFact.unionId}
                  onChange={e => setNewFact({ ...newFact, unionId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2F3E8F]"
                >
                  <option value="">Select marriage...</option>
                  {personMarriages.map(m => (
                    <option key={m.unionId} value={m.unionId}>
                      Marriage to {m.spouseName}
                    </option>
                  ))}
                </select>
              )}
              <input
                type="date"
                value={newFact.eventDate}
                onChange={e => setNewFact({ ...newFact, eventDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2F3E8F]"
                placeholder="Date"
              />
              <div className="space-y-1">
                <PlaceAutocomplete
                  value={newFact.location}
                  onChange={val => {
                    const sanitized = sanitizeInput(val);
                    setNewFact({ ...newFact, location: sanitized });
                    validateField('factLocation', sanitized, { required: false, type: 'location', label: 'Location' });
                  }}
                  className="w-full"
                  placeholder="Location"
                  error={errors.factLocation}
                  disabled={savingFact}
                />
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] text-gray-400">max limit: 50</span>
                  {newFact.location.length > 0 && (
                    <span className="text-[10px] text-gray-400">
                      {newFact.location.length}/50
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <textarea
                  value={newFact.description}
                  maxLength={300}
                  rows={3}
                  onChange={e => {
                    const val = sanitizeInput(e.target.value);
                    setNewFact({ ...newFact, description: val });
                    validateField('factDescription', val, { required: false, type: 'description', label: 'Description' });
                  }}
                  onBlur={e => {
                    validateField('factDescription', e.target.value, { required: false, type: 'description', label: 'Description' });
                  }}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2F3E8F] ${
                    errors.factDescription ? 'border-red-500 focus:ring-red-200' : 'border-gray-300'
                  }`}
                  placeholder="Description"
                />
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] text-gray-400">max limit: 300</span>
                  {newFact.description.length > 0 && (
                    <span className="text-[10px] text-gray-400">
                      {newFact.description.length}/300
                    </span>
                  )}
                </div>
                {errors.factDescription && (
                  <span className="text-[11px] text-red-500 font-medium px-1 block animate-in fade-in-50 slide-in-from-top-1 duration-150">
                    {errors.factDescription}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddFact}
                  disabled={savingFact || !newFact.eventType || ((newFact.eventType === 'divorce' || newFact.eventType === 'widowed') && personMarriages.length > 1 && !newFact.unionId)}
                  className="px-3 py-1.5 text-sm bg-[#2F3E8F] text-white rounded-lg hover:bg-[#25327A] disabled:opacity-50 flex items-center gap-1"
                >
                  {savingFact ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowAddFact(false);
                    clearError('factLocation');
                    clearError('factDescription');
                  }}
                  className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <div className="space-y-0">
            {timelineEvents.map((ev, i) => (
              <div key={i} className="flex gap-3 relative group">
                {/* Vertical line */}
                {i < timelineEvents.length - 1 && (
                  <div className="absolute left-[15px] top-8 bottom-0 w-px bg-gray-200 dark:bg-stone-800" />
                )}
                {/* Icon */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-50 dark:bg-stone-900 border border-gray-200 dark:border-stone-800 flex items-center justify-center z-10">
                  {ev.icon}
                </div>
                {/* Content */}
                <div className="pb-4 min-w-0 flex-1">
                  {editingFactId === ev.eventId ? (
                    // Inline edit form for life events
                    <div className="space-y-2 p-2 bg-gray-50 dark:bg-stone-900 rounded-lg border border-[#E2E8F0] dark:border-stone-850">
                      {['birth', 'death', 'marriage', 'divorce', 'widowed'].includes(editFact.eventType.toLowerCase()) ? (
                        <div className="px-3 py-1.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg capitalize">
                          {editFact.eventType}
                        </div>
                      ) : (
                        <select
                          value={editFact.eventType}
                          onChange={e => setEditFact({ ...editFact, eventType: e.target.value })}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2F3E8F]"
                        >
                          <option value="education">Education</option>
                          <option value="career">Career</option>
                          <option value="military_service">Military Service</option>
                          <option value="immigration">Immigration</option>
                          <option value="retirement">Retirement</option>
                          <option value="medical">Medical</option>
                          <option value="religious_ceremony">Religious Ceremony</option>
                          {hasOpenMarriage && (
                            <>
                              <option value="divorce">Divorced</option>
                              <option value="widowed">Widowed</option>
                            </>
                          )}
                          <option value="other">Other</option>
                        </select>
                      )}
                      <input
                        type="date"
                        value={editFact.eventDate}
                        onChange={e => setEditFact({ ...editFact, eventDate: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2F3E8F]"
                      />
                      {editFact.eventType.toLowerCase() !== 'divorce' && (
                        <div className="space-y-1">
                          <PlaceAutocomplete
                            value={editFact.location}
                            onChange={val => {
                              const sanitized = sanitizeInput(val);
                              setEditFact({ ...editFact, location: sanitized });
                              validateField('editFactLocation', sanitized, { required: false, type: 'location', label: 'Location' });
                            }}
                            className="!py-1.5 focus:!ring-1 focus:!ring-[#2F3E8F] border rounded-lg"
                            placeholder="Location"
                            error={errors.editFactLocation}
                            disabled={savingFact}
                          />
                          <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] text-gray-400">max limit: 50</span>
                            {editFact.location.length > 0 && (
                              <span className="text-[10px] text-gray-400">
                                {editFact.location.length}/50
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {!['birth', 'death'].includes(editFact.eventType.toLowerCase()) && (
                        <div className="space-y-1">
                          <textarea
                            value={editFact.description}
                            maxLength={300}
                            rows={3}
                            onChange={e => {
                              const val = sanitizeInput(e.target.value);
                              setEditFact({ ...editFact, description: val });
                              validateField('editFactDescription', val, { required: false, type: 'description', label: 'Description' });
                            }}
                            onBlur={e => {
                              validateField('editFactDescription', e.target.value, { required: false, type: 'description', label: 'Description' });
                            }}
                            className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2F3E8F] ${
                              errors.editFactDescription ? 'border-red-500 focus:ring-red-200' : 'border-gray-300'
                            }`}
                            placeholder={['marriage', 'divorce'].includes(editFact.eventType.toLowerCase()) ? "Notes" : "Description"}
                          />
                          <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] text-gray-400">max limit: 300</span>
                            {editFact.description.length > 0 && (
                              <span className="text-[10px] text-gray-400">
                                {editFact.description.length}/300
                              </span>
                            )}
                          </div>
                          {errors.editFactDescription && (
                            <span className="text-[11px] text-red-500 font-medium px-1 block animate-in fade-in-50 slide-in-from-top-1 duration-150">
                              {errors.editFactDescription}
                            </span>
                          )}
                        </div>
                      )}
                      {editFact.eventType.toLowerCase() === 'marriage' && (
                        <div className="space-y-2">
                          {/* <div className="flex gap-4 items-center px-1">
                            <label className="flex items-center gap-1.5 text-sm text-gray-700">
                              <input
                                type="radio"
                                name="endStatus"
                                value="active"
                                checked={!editFact.endStatus || editFact.endStatus === 'active'}
                                onChange={() => setEditFact({ ...editFact, endStatus: 'active', endDate: '', endReason: '' })}
                                className="text-[#2F3E8F] focus:ring-[#2F3E8F]"
                              />
                              Active
                            </label>
                            <label className="flex items-center gap-1.5 text-sm text-gray-700">
                              <input
                                type="radio"
                                name="endStatus"
                                value="divorced"
                                checked={editFact.endStatus === 'divorced'}
                                onChange={() => setEditFact({ ...editFact, endStatus: 'divorced' })}
                                className="text-[#2F3E8F] focus:ring-[#2F3E8F]"
                              />
                              Divorced
                            </label>
                            <label className="flex items-center gap-1.5 text-sm text-gray-700">
                              <input
                                type="radio"
                                name="endStatus"
                                value="widowed"
                                checked={editFact.endStatus === 'widowed'}
                                onChange={() => setEditFact({ ...editFact, endStatus: 'widowed' })}
                                className="text-[#2F3E8F] focus:ring-[#2F3E8F]"
                              />
                              Widowed
                            </label>
                          </div> */}
                          {(editFact.endStatus === 'divorced' || editFact.endStatus === 'widowed') && (
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <label className="text-[10px] text-gray-500 ml-1">
                                  {editFact.endStatus === 'divorced' ? 'Divorce Date' : 'Widowed Date'}
                                </label>
                                <input
                                  type="date"
                                  value={editFact.endDate}
                                  onChange={e => setEditFact({ ...editFact, endDate: e.target.value })}
                                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2F3E8F]"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-[10px] text-gray-500 ml-1">
                                  {editFact.endStatus === 'divorced' ? 'Divorce Reason' : 'Reason'}
                                </label>
                                <input
                                  type="text"
                                  value={editFact.endReason}
                                  onChange={e => setEditFact({ ...editFact, endReason: e.target.value })}
                                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2F3E8F]"
                                  placeholder="Reason"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateFact(ev.eventId!)}
                          disabled={savingFact}
                          className="px-3 py-1 text-sm bg-[#2F3E8F] text-white rounded-lg hover:bg-[#25327A] disabled:opacity-50 flex items-center gap-1"
                        >
                          {savingFact ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingFactId(null);
                            clearError('editFactLocation');
                            clearError('editFactDescription');
                          }}
                          className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          {ev.year && <span className="text-xs font-bold text-[#2F3E8F] dark:text-[#8CA0FF]">{ev.year}</span>}
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{ev.label}</span>
                        </div>
                        {ev.detail && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ev.detail}</p>}
                      </div>
                      {/* Edit/Delete icons conditional on API flags */}
                      {ev.eventId && (ev.editable || ev.deletable) && (
                        <div className="inline-flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          {ev.editable && (
                            <button
                              onClick={() => {
                                const matchingEvent = lifeEvents.find(le => le.eventId === ev.eventId);
                                if (matchingEvent) {
                                  clearError('editFactLocation');
                                  clearError('editFactDescription');
                                  setEditFact({
                                    eventType: matchingEvent.eventType,
                                    eventDate: matchingEvent.eventDate || '',
                                    location: matchingEvent.location || '',
                                    description: matchingEvent.description || matchingEvent.notes || '',
                                    endDate: (matchingEvent as any).eventEndDate || '',
                                    endReason: (matchingEvent as any).endReason || '',
                                    endStatus: ((matchingEvent as any).eventEndDate || (matchingEvent as any).endReason) ? 
                                      ((matchingEvent as any).endReason?.toLowerCase().includes('widow') ? 'widowed' : 'divorced') 
                                      : 'active',
                                  });
                                  setEditingFactId(ev.eventId!);
                                }
                              }}
                              className="p-0.5 text-gray-400 hover:text-[#2F3E8F]"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          )}
                          {ev.deletable && (
                            <button
                              onClick={() => setFactToDelete(ev.eventId!)}
                              className="p-0.5 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center column - Sources */}
        <div className="md:col-span-1 order-3 md:order-2">
          {/* Basic Details Section */}
          {hasBasicDetails && fullPerson && (
            <div className="mb-6 p-4 bg-[#F8F9FA] dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-sm">
              <h3 className="text-xs font-bold text-[#8B7355] dark:text-[#C2A46D] uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-[#2a2a2a] pb-2">Basic Details</h3>
              <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                {fullPerson.occupation && (
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Occupation</label>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{fullPerson.occupation}</p>
                  </div>
                )}
                {fullPerson.education && (
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Education</label>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{fullPerson.education}</p>
                  </div>
                )}
                {fullPerson.religion && (
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Religion</label>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{fullPerson.religion}</p>
                  </div>
                )}
                {fullPerson.nationality && (
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Nationality</label>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{fullPerson.nationality}</p>
                  </div>
                )}
                {fullPerson.ethnicity && (
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Ethnicity</label>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{fullPerson.ethnicity}</p>
                  </div>
                )}
                {fullPerson.caste && (
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Caste</label>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{fullPerson.caste}</p>
                  </div>
                )}
                {fullPerson.gotra && (
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Gotra</label>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{fullPerson.gotra}</p>
                  </div>
                )}
                {fullPerson.nativePlace && (
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Native Place</label>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{fullPerson.nativePlace}</p>
                  </div>
                )}
                {fullPerson.nativeLanguage && (
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Language</label>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{fullPerson.nativeLanguage}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-[#3D2E1F] dark:text-[#E2DBCE]">Sources & Citations</h3>
            {!showAddSource && (
              <button
                onClick={() => { setShowAddSource(true); resetValidation(); }}
                className="flex items-center gap-1.5 text-sm text-[#2F3E8F] dark:text-[#8CA0FF] hover:text-[#8B5E3C]"
              >
                <Plus className="h-3.5 w-3.5" /> Add source
              </button>
            )}
          </div>
          {/* Add Source */}
          {showAddSource && (
            <div className="mb-4 p-3 bg-white dark:bg-[#1E1E1E] rounded-lg border border-[#E2E8F0] dark:border-[#2a2a2a] space-y-2">
              <div className="space-y-1">
                <input
                  type="text"
                  value={newSource.title}
                  maxLength={180}
                  onChange={e => {
                    const val = sanitizeInput(e.target.value);
                    setNewSource({ ...newSource, title: val });
                    validateField('sourceTitle', val, { required: true, type: 'source_title', label: 'Source title' });
                  }}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2F3E8F] ${
                    errors.sourceTitle ? 'border-red-500 focus:ring-red-200' : 'border-gray-300'
                  }`}
                  placeholder="Source title (e.g., Birth Certificate)"
                />
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] text-gray-400">max limit: 180</span>
                  {newSource.title.length > 0 && (
                    <span className="text-[10px] text-gray-400">
                      {newSource.title.length}/180
                    </span>
                  )}
                </div>
                {errors.sourceTitle && (
                  <span className="text-[11px] text-red-500 font-medium px-1 block animate-in fade-in-50 slide-in-from-top-1 duration-150">
                    {errors.sourceTitle}
                  </span>
                )}
              </div>
              <select
                value={newSource.type}
                onChange={e => setNewSource({ ...newSource, type: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2F3E8F]"
              >
                <option value="document">Document</option>
                <option value="photo">Photo</option>
                <option value="certificate">Certificate</option>
                <option value="census">Census Record</option>
                <option value="newspaper">Newspaper</option>
                <option value="book">Book</option>
                <option value="website">Website</option>
                <option value="oral">Oral History</option>
                <option value="other">Other</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newSource.factType}
                  onChange={e => setNewSource({ ...newSource, factType: e.target.value })}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2F3E8F]"
                >
                  <option value="general">General</option>
                  <option value="birth">Birth</option>
                  <option value="death">Death</option>
                  <option value="marriage">Marriage</option>
                  <option value="name">Name</option>
                  <option value="residence">Residence</option>
                  <option value="occupation">Occupation</option>
                </select>
                <select
                  value={newSource.confidence}
                  onChange={e => setNewSource({ ...newSource, confidence: e.target.value })}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2F3E8F]"
                >
                  <option value="high">High Confidence</option>
                  <option value="medium">Medium Confidence</option>
                  <option value="low">Low Confidence</option>
                </select>
              </div>
              <input
                type="text"
                value={newSource.detail}
                onChange={e => setNewSource({ ...newSource, detail: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2F3E8F]"
                placeholder="Citation detail / page reference"
              />
              {/* Document Upload */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-gray-600">
                  <Upload className="h-3.5 w-3.5" />
                  {sourceFile ? sourceFile.name : 'Attach document'}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                    onChange={e => setSourceFile(e.target.files?.[0] || null)}
                  />
                </label>
                {sourceFile && (
                  <button onClick={() => setSourceFile(null)} className="text-gray-400 hover:text-red-500">
                    <XIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddSource}
                  disabled={savingSource || !newSource.title}
                  className="px-3 py-1.5 text-sm bg-[#2F3E8F] text-white rounded-lg hover:bg-[#25327A] disabled:opacity-50 flex items-center gap-1"
                >
                  {savingSource ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  Save Source
                </button>
                <button
                  onClick={() => { setShowAddSource(false); setSourceFile(null); resetValidation(); }}
                  className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {citations.length === 0 ? (
            <div className="text-center py-8 text-gray-400 min-h-[320px] flex flex-col justify-center items-center">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No sources yet</p>
              <p className="text-xs mt-1">Add sources to document this person's facts</p>
            </div>
          ) : (
            <div className="space-y-3 min-h-[320px] max-h-[480px] overflow-y-auto pr-1.5 scrollbar-thin">
              {citations.map((c) => {
                const source = c.source || {};
                const sourceTitle = source.title || c.sourceTitle || 'Untitled Source';
                
                // Resolve the document URL: prefer previewUrl for thumbnails, fileUrl for full view
                const rawDocUrl = source.fileUrl || c.fileUrl;
                const rawPreviewUrl = source.previewUrl || source.fileUrl || c.fileUrl;
                
                const docUrl = rawDocUrl ? resolveBackendUrl(rawDocUrl) : null;
                const previewUrl = rawPreviewUrl ? resolveBackendUrl(rawPreviewUrl) : docUrl;
                
                const docMime = source.fileMimeType || c.fileMimeType || (rawDocUrl && /\.(jpe?g|png|gif|webp)$/i.test(rawDocUrl) ? 'image/jpeg' : rawDocUrl && /\.pdf$/i.test(rawDocUrl) ? 'application/pdf' : null);
                const docName = source.fileName || c.fileName || (rawDocUrl ? rawDocUrl.split('/').pop() : null);

                return (
                  <div key={c.citationId} className="p-3 bg-white dark:bg-[#1E1E1E] rounded-lg border border-gray-200 dark:border-[#2a2a2a] group relative overflow-hidden w-full">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 break-all pr-6">{sourceTitle}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.factType}</p>
                    {c.confidence && (
                      <span className={`inline-block mt-1 px-1.5 py-0.5 text-xs rounded ${
                        c.confidence === 'high' ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400' :
                        c.confidence === 'medium' ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400' :
                        'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                      }`}>
                        {c.confidence}
                      </span>
                    )}
                    {/* Document preview */}
                    {docUrl && (
                      <div className="mt-2">
                        {docMime?.startsWith('image/') ? (
                          <div
                            onClick={() => setPreviewDoc({ url: docUrl, mimeType: docMime, name: docName })}
                            className="block cursor-pointer group/preview"
                          >
                            <img
                              src={previewUrl || docUrl || ''}
                              alt={docName || 'Source document'}
                              className="max-h-32 rounded border border-gray-200 object-contain hover:opacity-90 transition-opacity"
                            />
                            <span className="flex items-center gap-1 mt-1 text-xs text-[#2F3E8F] group-hover/preview:underline">
                              <ImageIcon className="h-3 w-3" /> View full size
                            </span>
                          </div>
                        ) : docMime === 'application/pdf' ? (
                          <a
                            href={docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center gap-1.5 mt-1 px-2 py-1.5 bg-red-50 rounded border border-red-100 text-sm text-red-700 hover:bg-red-100 transition-colors text-left"
                          >
                            <FileText className="h-4 w-4" />
                            <span className="truncate flex-1">{docName || 'View PDF'}</span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        ) : (
                          <a
                            href={docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center gap-1.5 mt-1 px-2 py-1.5 bg-[#E8EDFF] rounded border border-[#2F3E8F]/20 text-sm text-[#2F3E8F] hover:bg-blue-100 transition-colors text-left"
                          >
                            <FileText className="h-4 w-4" />
                            <span className="truncate flex-1">{docName || 'View document'}</span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        )}
                      </div>
                    )}
                    {/* Delete button on hover */}
                    <button
                      onClick={() => setSourceToDelete(c.source?.sourceId || c.sourceId)}
                      className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column - Relationships */}
        <div className="md:col-span-1 order-2 md:order-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-[#3D2E1F] dark:text-[#E2DBCE]">Relationships</h3>
            <div className="relative">
              <button
                onClick={() => setShowAddFamilyMenu(!showAddFamilyMenu)}
                className="flex items-center gap-1.5 text-sm text-[#2F3E8F] dark:text-[#8CA0FF] hover:text-[#8B5E3C]"
              >
                <Plus className="h-3.5 w-3.5" /> Add family <ChevronDown className="h-3 w-3" />
              </button>
              {showAddFamilyMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowAddFamilyMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#1E1E1E] rounded-lg shadow-xl border border-[#E2E8F0] dark:border-[#2a2a2a] py-1 min-w-[180px] z-50">
                    <button
                      onClick={() => { onAddRelative(person.personId, 'add-parent'); setShowAddFamilyMenu(false); }}
                      className="w-full px-3 py-2 text-left text-sm text-[#8B7355] dark:text-[#A19F9D] hover:bg-[#F4F6FA] dark:hover:bg-white/[0.04] flex items-center gap-2"
                    >
                      <UserPlus className="h-4 w-4" /> Add Parent
                    </button>
                    <button
                      onClick={() => { onAddRelative(person.personId, 'add-spouse'); setShowAddFamilyMenu(false); }}
                      className="w-full px-3 py-2 text-left text-sm text-[#8B7355] dark:text-[#A19F9D] hover:bg-[#F4F6FA] dark:hover:bg-white/[0.04] flex items-center gap-2"
                    >
                      <Heart className="h-4 w-4" /> Add Spouse
                    </button>
                    <button
                      onClick={() => { onAddRelative(person.personId, 'add-child'); setShowAddFamilyMenu(false); }}
                      className="w-full px-3 py-2 text-left text-sm text-[#8B7355] dark:text-[#A19F9D] hover:bg-[#F4F6FA] dark:hover:bg-white/[0.04] flex items-center gap-2"
                    >
                      <Baby className="h-4 w-4" /> Add Child
                    </button>
                    <button
                      onClick={() => { onAddRelative(person.personId, 'add-sibling'); setShowAddFamilyMenu(false); }}
                      className="w-full px-3 py-2 text-left text-sm text-[#8B7355] dark:text-[#A19F9D] hover:bg-[#F4F6FA] dark:hover:bg-white/[0.04] flex items-center gap-2"
                    >
                      <Users className="h-4 w-4" /> Add Sibling
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="space-y-4">
            {/* Parents */}
            {parents.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Parents</h4>
                {parents.map(p => <PersonLink key={p.personId} p={p} />)}
              </div>
            )}

            {/* Siblings */}
            {siblings.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Siblings</h4>
                {siblings.map(p => <PersonLink key={p.personId} p={p} />)}
              </div>
            )}

            {/* Spouses */}
            {spouses.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Spouse{spouses.length > 1 ? 's' : ''}</h4>
                {spouses.map(({ spouse, union }) => (
                  <div key={spouse.personId}>
                    <PersonLink p={spouse} />
                    {union.startDate && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 ml-12 -mt-1 mb-1">
                        m. {extractYear(union.startDate)}{union.marriagePlace ? `, ${union.marriagePlace}` : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Children */}
            {children.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Children</h4>
                {children.map(p => <PersonLink key={p.personId} p={p} />)}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Delete Fact Confirmation Modal */}
      {factToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 relative">
            <button
              onClick={() => setFactToDelete(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <XIcon className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Event</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete this event? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setFactToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2F3E8F]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteFact(factToDelete)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Source Confirmation Modal */}
      {sourceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 relative">
            <button
              onClick={() => setSourceToDelete(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <XIcon className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Source</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete this source? This will remove the citation from this person.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSourceToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2F3E8F]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteSource(sourceToDelete)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Document Preview Modal */}
      {previewDoc && (
        <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
          <DialogContent className="max-w-5xl sm:max-w-5xl w-[95vw] p-6">
            <DialogHeader>
              <DialogTitle className="truncate pr-8">{previewDoc.name || 'Document Preview'}</DialogTitle>
            </DialogHeader>
            <div className="mt-4 flex items-center justify-center bg-gray-50 dark:bg-zinc-900/50 rounded-xl border border-gray-100 dark:border-zinc-800 p-2 overflow-hidden max-h-[85vh]">
              {previewDoc.mimeType?.startsWith('image/') ? (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.name || 'Preview'}
                  className="max-h-[75vh] object-contain rounded-lg shadow-sm"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <FileText className="h-16 w-16 text-blue-500 mb-4" />
                  <p className="text-sm font-medium mb-4">Preview not available for this file type.</p>
                  <a
                    href={previewDoc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2F3E8F] text-white rounded-lg text-sm hover:bg-[#25327A] transition-colors"
                  >
                    Open in new tab <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
