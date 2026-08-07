/**
 * ViewerEditTab - Inline edit form in FullPageMediaViewer sidebar
 */

import { useState, useEffect, useRef } from 'react';
import { Loader2, Search, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/DateInput';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateMemory, uploadAICeremonyUrl } from '@/services/memoriesApiService';
import { autocompletePlaces } from '@/services/placeApiService';
import { MEMORY_CATEGORY_GROUPS } from '@/constants/memoryCategories';
import { resolveBackendUrl } from '@/config/api';
import type { Memory, MemoryPrivacy } from '@/types';
import { validateField, validateTextField, validateDescriptionField, VALIDATION_LIMITS } from '@/utils/validation';
import { useToast } from '@/components/ui/use-toast';

interface ViewerEditTabProps {
  memory: Memory;
  persons: Array<{ personId: string; firstName: string; lastName: string; profilePhotoUrl?: string | null }>;
  onUpdated: () => void;
  titleMaxLength?: number;
  titleMinLength?: number;
  descriptionMaxLength?: number;
  descriptionMinLength?: number;
}

export function ViewerEditTab({
  memory,
  persons,
  onUpdated,
  titleMaxLength,
  titleMinLength,
  descriptionMaxLength,
  descriptionMinLength,
}: ViewerEditTabProps) {
  const formatDateForInput = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      if (dateStr.includes('T')) {
        return dateStr.split('T')[0];
      }
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      return '';
    }
  };

  const [title, setTitle] = useState(memory.title);
  const [description, setDescription] = useState(memory.description || '');
  const [dateTaken, setDateTaken] = useState(formatDateForInput(memory.dateTaken));
  const [placeTaken, setPlaceTaken] = useState(memory.place || (memory as any).placeTaken || '');
  const [category, setCategory] = useState(memory.category || '');
  const [textdata, setTextdata] = useState((typeof memory.textdata === 'string' && memory.textdata) || memory.textContent || memory.files?.[0]?.textContent || '');
  const [privacy, setPrivacy] = useState<MemoryPrivacy>(memory.privacy || 'tree');
  const [taggedPersonIds, setTaggedPersonIds] = useState<string[]>(() => {
    const rawIds = ((memory as any).taggedPeople || memory.files?.[0]?.taggedPeople || memory.taggedPersons || memory.files?.[0]?.taggedPersons || []).map((p: any) => p.id || p.personId);
    const activePersons = (persons || []).filter((p: any) => !p.isDeleted);
    return rawIds.filter(id => activePersons.some((ap: any) => ap.personId === id));
  });
  const [personSearch, setPersonSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  const [aiCeremonyData, setAiCeremonyData] = useState<any>(null);
  const [isAiCeremonyLoading, setIsAiCeremonyLoading] = useState(false);

  const formFileds = validateField(title, {
    name: 'Title',
    maxLength: titleMaxLength ?? 100,
    minLength: titleMinLength,
    required: true,
    noWhitespaceOnly: true,
  });
  const descVal = validateField(description, {
    name: 'Description',
    maxLength: descriptionMaxLength ?? VALIDATION_LIMITS.description,
    minLength: descriptionMinLength,
    noWhitespaceOnly: true,
  });
  const isTextStory = memory.memoryType === 'text' || memory.textdata || memory.textContent || !!memory.files?.[0]?.textContent;
  const isFormInvalid = !formFileds.isValid || !descVal.isValid || (isTextStory && textdata.length > 300);

  // Place Autocomplete
  const [placeSearchQuery, setPlaceSearchQuery] = useState('');
  const [placeSuggestions, setPlaceSuggestions] = useState<string[]>([]);
  const [showPlaceDropdown, setShowPlaceDropdown] = useState(false);
  const [isPlaceLoading, setIsPlaceLoading] = useState(false);
  const placeContainerRef = useRef<HTMLDivElement>(null);
  const placeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Category State & Ref
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryContainerRef = useRef<HTMLDivElement>(null);

  const handlePlaceSearchChange = (val: string, immediate = false) => {
    setPlaceSearchQuery(val);

    if (placeTimeoutRef.current) {
      clearTimeout(placeTimeoutRef.current);
    }

    const triggerSearch = async () => {
      setIsPlaceLoading(true);
      try {
        const suggestions = await autocompletePlaces(val);
        const sorted = [...suggestions].sort((a, b) => a.localeCompare(b));
        setPlaceSuggestions(sorted);
      } catch (err) {
        console.error('Failed to search places:', err);
      } finally {
        setIsPlaceLoading(false);
      }
    };

    if (immediate) {
      void triggerSearch();
    } else {
      placeTimeoutRef.current = setTimeout(triggerSearch, 300);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (placeContainerRef.current && !placeContainerRef.current.contains(event.target as Node)) {
        setShowPlaceDropdown(false);
      }
      if (categoryContainerRef.current && !categoryContainerRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Sync state when memory prop updates (e.g. after full detail fetch)
  useEffect(() => {
    setTitle(memory.title || '');
    setDescription(memory.description || '');
    setDateTaken(formatDateForInput(memory.dateTaken));
    setPlaceTaken(memory.place || (memory as any).placeTaken || '');
    setCategory(memory.category || '');
    setTextdata((typeof memory.textdata === 'string' && memory.textdata) || memory.textContent || memory.files?.[0]?.textContent || '');
    setPrivacy(memory.privacy || 'tree');
    setTaggedPersonIds(() => {
      const rawIds = ((memory as any).taggedPeople || memory.files?.[0]?.taggedPeople || memory.taggedPersons || memory.files?.[0]?.taggedPersons || []).map((p: any) => p.id || p.personId);
      const activePersons = (persons || []).filter((p: any) => !p.isDeleted);
      return rawIds.filter(id => activePersons.some((ap: any) => ap.personId === id));
    });
    setShowPlaceDropdown(false);
    setPlaceSearchQuery('');
    setShowCategoryDropdown(false);

    // Auto-fetch AI Category suggestions if it's a photo with a URL - DISABLED
    /*
    const firstFile = memory.files?.[0];
    const mediaUrl = firstFile?.thumbnailSignedUrl || firstFile?.signedUrl || memory.mediaUrl || firstFile?.fileUrl || '';
    if (mediaUrl) {
      setIsAiCeremonyLoading(true);
      uploadAICeremonyUrl(resolveBackendUrl(mediaUrl))
        .then(res => setAiCeremonyData(res))
        .catch(err => console.warn('Failed to fetch AI category suggestions', err))
        .finally(() => setIsAiCeremonyLoading(false));
    } else {
      setAiCeremonyData(null);
    }
    */
    setAiCeremonyData(null);
  }, [memory]);

  const filteredPersons = persons.filter(p => {
    const q = personSearch.trim().toLowerCase();
    if (!q) return true;
    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
    return fullName.includes(q);
  });

  const handleConfirmSave = async () => {
    setShowConfirmSave(false);
    if (!title.trim() || isFormInvalid) return;
    const mid = memory.memoryId || (memory as any)._id;
    if (!mid) return;

    setSaving(true);
    try {
      const taggedPeople = taggedPersonIds.map(id => {
        const p = persons.find(per => per.personId === id);
        return {
          name: `${p?.firstName || ''} ${p?.lastName || ''}`.trim(),
          id,
          profilePhotoUrl: p?.profilePhotoUrl || null,
          profileImageUrl: p?.profilePhotoUrl || null
        };
      });

      const fileId = memory.files?.[0]?._id;

      await updateMemory(mid, {
        title: title.trim(),
        description: description.trim(),
        dateTaken: dateTaken,
        place: placeTaken.trim(),
        placeTaken: placeTaken.trim(),
        category: category,
        textdata: isTextStory ? true : "",
        textContent: isTextStory ? textdata.trim() : "",
        privacy,
        taggedPeople,
        ...(fileId ? { fileId, fileid: fileId } : {})
      });

      toast({
        title: 'Success',
        description: 'Memory updated successfully.',
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onUpdated();
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (!title.trim() || isFormInvalid) return;
    setShowConfirmSave(true);
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-gray-500">Title</Label>
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="text-sm"
          error={title.length > 0 ? formFileds.error : undefined}
          showCharCount
          charLimit={titleMaxLength ?? 100}
        />
      </div>
      <div>
        <Label className="text-xs text-gray-500">Description</Label>
        <Textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          className={`text-sm transition-all duration-200 ${description.trim().length > 0 ? 'min-h-[160px]' : 'min-h-[60px]'}`}
          error={description.length > 0 ? descVal.error : undefined}
          showCharCount
          charLimit={descriptionMaxLength ?? VALIDATION_LIMITS.description}
        />
      </div>

      {isTextStory && (
        <div>
          <Label className="text-xs text-gray-500">Story / Content</Label>
          <Textarea
            value={textdata}
            onChange={e => setTextdata(e.target.value.slice(0, 300))}
            maxLength={300}
            className="text-sm min-h-[120px] font-serif"
            showCharCount
            charLimit={300}
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-gray-500">Date</Label>
          <DateInput value={dateTaken} onChange={e => setDateTaken(e.target.value)} className="text-sm" />
        </div>
        <div className="relative" ref={placeContainerRef}>
          <Label className="text-xs text-gray-500 dark:text-gray-300">Place</Label>
          <div className="relative mt-1">
            <button
              type="button"
              onClick={() => {
                setShowPlaceDropdown(!showPlaceDropdown);
                if (!showPlaceDropdown) {
                  const initialQuery = placeTaken || '';
                  handlePlaceSearchChange(initialQuery, true);
                }
              }}
              className="w-full h-9 px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg text-sm bg-white dark:bg-stone-900 text-gray-700 dark:text-gray-300 flex items-center justify-between text-left focus:outline-none focus:border-[#2F3E8F]"
            >
              <span className={placeTaken ? "text-gray-900 dark:text-gray-100 truncate pr-4 text-sm" : "text-stone-400 dark:text-stone-500 truncate text-sm"}>
                {placeTaken || "Select place"}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {placeTaken && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlaceTaken('');
                      setPlaceSearchQuery('');
                      setPlaceSuggestions([]);
                    }}
                    className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </span>
                )}
                <ChevronDown className="w-4 h-4 text-stone-400 dark:text-stone-500" />
              </div>
            </button>

            {showPlaceDropdown && (
              <div className="absolute z-50 bottom-full mb-1 left-0 right-0 bg-white dark:bg-stone-900 border border-gray-200 dark:border-white/10 rounded-lg shadow-lg p-2 space-y-2 max-h-48 overflow-y-auto animate-in fade-in-50 duration-200">
                {/* Search Input field */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-stone-400 dark:text-stone-500" />
                  <Input
                    value={placeSearchQuery}
                    onChange={(e) => handlePlaceSearchChange(e.target.value)}
                    placeholder="Search places..."
                    className="pl-8 text-xs h-9"
                    autoFocus
                  />
                </div>

                {/* Places List */}
                <div className="space-y-1">
                  {isPlaceLoading ? (
                    <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-[#2F3E8F] dark:text-blue-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Searching places...
                    </div>
                  ) : placeSuggestions.length > 0 ? (
                    placeSuggestions.map((placeName) => (
                      <button
                        key={placeName}
                        type="button"
                        onClick={() => {
                          setPlaceTaken(placeName);
                          setShowPlaceDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs rounded hover:bg-[#F4F6F9] dark:hover:bg-[#252525] text-stone-700 dark:text-stone-300 transition-colors"
                      >
                        {placeName}
                      </button>
                    ))
                  ) : (
                    <div className="text-xs text-stone-400 dark:text-stone-500 px-3 py-4 text-center">
                      {placeSearchQuery.trim().length >= 2 ? "No places found" : "Type to search places"}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="relative" ref={categoryContainerRef}>
        <Label className="text-xs text-gray-500 dark:text-gray-400">Category</Label>
        <div className="relative mt-1">
          <Input
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setShowCategoryDropdown(true);
            }}
            onFocus={() => setShowCategoryDropdown(true)}
            placeholder="Select or type a category (optional)"
            className="pr-10 text-sm"
          />
          <button
            type="button"
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            className="absolute right-0 top-0 h-full px-3 flex items-center justify-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
        {showCategoryDropdown && (
          <div className="absolute z-50 bottom-full mb-1 left-0 right-0 bg-white dark:bg-stone-900 border border-gray-200 dark:border-white/10 rounded-lg shadow-lg max-h-48 overflow-y-auto p-1 space-y-2 animate-in fade-in-50 duration-200">
            {(() => {
              const rawSuggestions: string[] = aiCeremonyData?.detectedKeywords || aiCeremonyData?.structured?.detectedKeywords || aiCeremonyData?.structured?.reasons || [];
              const suggestions = rawSuggestions.map(s => s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '));
              const lowerSuggestions = suggestions.map(s => s.toLowerCase());

              const isExactMatch = MEMORY_CATEGORY_GROUPS.some(g => g.categories.some(c => c.toLowerCase() === category.toLowerCase())) || lowerSuggestions.includes(category.toLowerCase());
              const searchVal = isExactMatch ? "" : category;

              const filteredSuggestions = suggestions.filter(s => s.toLowerCase().includes(searchVal.toLowerCase()));

              const filteredGroups = MEMORY_CATEGORY_GROUPS.map(g => {
                const filteredCategories = g.categories.filter(c =>
                  !lowerSuggestions.includes(c.toLowerCase()) &&
                  c.toLowerCase().includes(searchVal.toLowerCase())
                );
                return { ...g, categories: filteredCategories };
              }).filter(g => g.categories.length > 0);

              if (filteredSuggestions.length === 0 && filteredGroups.length === 0) {
                return (
                  <div className="text-xs text-stone-500 dark:text-stone-400 p-2 text-center">
                    No matching categories. Type to add custom category.
                  </div>
                );
              }

              return (
                <>
                  {/* AI Suggestions */}
                  {filteredSuggestions.length > 0 && (
                    <div className="space-y-0.5">
                      <div className="px-2 py-1 text-xs font-semibold text-[#2F3E8F] dark:text-blue-400 flex items-center gap-1">✨ AI Suggestions</div>
                      {filteredSuggestions.map((reason: string) => (
                        <button
                          key={`ai-${reason}`}
                          type="button"
                          onClick={() => {
                            setCategory(reason);
                            setShowCategoryDropdown(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs rounded hover:bg-[#F4F6F9] dark:hover:bg-[#252525] text-stone-700 dark:text-stone-300 transition-colors"
                        >
                          ✨ {reason}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Standard Categories */}
                  {filteredGroups.map(g => (
                    <div key={g.label} className="space-y-0.5">
                      <div className="px-2 py-1 text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">{g.label}</div>
                      {g.categories.map(c => (
                        <button
                          key={`cat-${c}`}
                          type="button"
                          onClick={() => {
                            setCategory(c);
                            setShowCategoryDropdown(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs rounded hover:bg-[#F4F6F9] dark:hover:bg-[#252525] text-stone-700 dark:text-stone-300 transition-colors"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  ))}
                </>
              );
            })()}
          </div>
        )}
      </div>
      {/* <div>
        <Label className="text-xs text-gray-500 dark:text-gray-400">Privacy</Label>
        <select
          value={privacy}
          onChange={e => setPrivacy(e.target.value as MemoryPrivacy)}
          className="w-full mt-1 px-2 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg text-sm bg-white dark:bg-stone-900 text-gray-900 dark:text-white focus:border-[#E8D5C4] outline-none"
        >
          <option value="tree"> 123</option>
          <option value="private">Private</option>
          <option value="public">Public</option>
        </select>
      </div> */}

      {/* Person tags */}
      <div>
        <Label className="text-xs text-gray-500">Tagged People</Label>
        <div className="relative mt-1 mb-1">
          <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-gray-400" />
          <Input value={personSearch} onChange={e => setPersonSearch(e.target.value)} placeholder="Search..." className="pl-7 text-sm h-8" />
        </div>
        <div className="max-h-[150px] overflow-y-auto space-y-0.5 border border-gray-100 dark:border-white/5 rounded p-1">
          {filteredPersons.slice(0, 20).map(p => {
            const checked = taggedPersonIds.includes(p.personId);
            return (
              <label key={p.personId} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-xs ${checked ? 'bg-[#E8EDFF] dark:bg-[#2F3E8F]/20' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                <input type="checkbox" checked={checked}
                  onChange={() => setTaggedPersonIds(prev => checked ? prev.filter(id => id !== p.personId) : [...prev, p.personId])}
                  className="w-3 h-3 rounded border-gray-300 dark:border-white/10 text-[#2F3E8F]" />
                <span className="text-gray-700 dark:text-gray-300">{p.firstName} {p.lastName}</span>
              </label>
            );
          })}
        </div>
      </div>

      <Button size="sm" onClick={handleSave} disabled={saving || !title.trim() || isFormInvalid} className="w-full">
        {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Saving...</> : saved ? 'Saved!' : 'Save Changes'}
      </Button>

      <ConfirmationModal
        open={showConfirmSave}
        onClose={() => setShowConfirmSave(false)}
        onConfirm={handleConfirmSave}
        title="Confirm Save Changes"
        description="Are you sure you want to save the changes to this memory?"
        confirmText="Save"
        cancelText="Cancel"
        variant="info"
      />
    </div>
  );
}
