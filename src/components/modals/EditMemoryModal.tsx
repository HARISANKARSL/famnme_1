/**
 * EditMemoryModal - Edit an existing memory's metadata and person tags
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Loader2, Search, Pencil, ChevronDown } from 'lucide-react';
import { trackEvent } from '@/services/firebase/analytics.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateMemory, addMemoryTag, removeMemoryTag, uploadAICeremonyUrl } from '@/services/memoriesApiService';
import { autocompletePlaces } from '@/services/placeApiService';
import { MEMORY_CATEGORY_GROUPS } from '@/constants/memoryCategories';
import { resolveBackendUrl } from '@/config/api';
import type { Memory, MemoryPrivacy } from '@/types';
import { useResponsive } from '@/hooks/useResponsive';
import { validateField, validateTextField, validateDescriptionField, VALIDATION_LIMITS } from '@/utils/validation';
import { useToast } from '@/components/ui/use-toast';
import { DateInput } from '@/components/ui/DateInput';
import { ConfirmationModal } from './ConfirmationModal';

interface EditMemoryModalProps {
  memory: Memory;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  persons: Array<{
    personId: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl?: string | null;
  }>;
  titleMaxLength?: number;
  titleMinLength?: number;
  descriptionMaxLength?: number;
  descriptionMinLength?: number;
}

export function EditMemoryModal({
  memory,
  open,
  onClose,
  onUpdated,
  persons,
  titleMaxLength,
  titleMinLength,
  descriptionMaxLength,
  descriptionMinLength,
}: EditMemoryModalProps) {
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

  const { isMobile } = useResponsive();
  const [title, setTitle] = useState(memory.title);
  const [description, setDescription] = useState(memory.description || '');
  const [dateTaken, setDateTaken] = useState(formatDateForInput(memory.dateTaken));
  const [placeTaken, setPlaceTaken] = useState(memory.placeTaken || '');
  const [category, setCategory] = useState(memory.category || '');
  const [privacy, setPrivacy] = useState<MemoryPrivacy>(memory.privacy || 'tree');
  const [taggedPersonIds, setTaggedPersonIds] = useState<string[]>(() => {
    const rawIds = (memory.taggedPersons || (memory as any).taggedPeople || memory.files?.[0]?.taggedPeople || memory.files?.[0]?.taggedPersons || []).map((p: any) => p.personId || p.id);
    const activePersons = (persons || []).filter((p: any) => !p.isDeleted);
    return rawIds.filter(id => activePersons.some((ap: any) => ap.personId === id));
  });

  const [personSearch, setPersonSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
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
  const isFormInvalid = !formFileds.isValid || !descVal.isValid;

  // Reset form when memory changes
  useEffect(() => {
    setTitle(memory.title);
    setDescription(memory.description || '');
    setDateTaken(formatDateForInput(memory.dateTaken));
    setPlaceTaken(memory.placeTaken || '');
    setCategory(memory.category || '');
    setPrivacy(memory.privacy || 'tree');
    setTaggedPersonIds(() => {
      const rawIds = (memory.taggedPersons || (memory as any).taggedPeople || memory.files?.[0]?.taggedPeople || memory.files?.[0]?.taggedPersons || []).map((p: any) => p.personId || p.id);
      const activePersons = (persons || []).filter((p: any) => !p.isDeleted);
      return rawIds.filter(id => activePersons.some((ap: any) => ap.personId === id));
    });
    setPersonSearch('');
    setError(null);
    setShowPlaceDropdown(false);
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
        // Sort results alphabetically (case-insensitive)
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

  if (!open) return null;

  const togglePerson = (personId: string) => {
    const p = persons.find(per => per.personId === personId);
    const name = p ? `${p.firstName} ${p.lastName}` : 'Unknown';
    const isTagged = taggedPersonIds.includes(personId);
    if (isTagged) {
      trackEvent("post_untagged", { tagged_id: personId, tagged_name: name });
    } else {
      trackEvent("post_tagged", { tagged_id: personId, tagged_name: name });
    }
    setTaggedPersonIds(prev =>
      prev.includes(personId) ? prev.filter(id => id !== personId) : [...prev, personId]
    );
  };

  const filteredPersons = persons.filter(p => {
    const q = personSearch.trim().toLowerCase();
    if (!q) return true;
    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
    return fullName.includes(q);
  });


  const handleConfirmSave = async () => {
    setShowConfirmSave(false);
    setSaving(true);
    setError(null);
    const mid = memory.memoryId || (memory as any)._id;

    let mediaType = "Text";
    if (memory.memoryType === 'photo') {
      mediaType = (memory.files && memory.files.length > 1) ? "Multiple Images" : "Image";
    } else if (memory.memoryType === 'video') {
      mediaType = "Video";
    } else if (memory.memoryType === 'audio') {
      mediaType = "Audio";
    }

    const taggedNames = taggedPersonIds.map(id => {
      const p = persons.find(per => per.personId === id);
      return p ? `${p.firstName} ${p.lastName}` : 'Unknown';
    });

    trackEvent("edit_post_started", {
      post_id: mid,
      post_type: "memory",
      media_type: mediaType,
      tagged_ids: taggedPersonIds,
      tagged_names: taggedNames,
    });

    try {
      const fileId = memory.files?.[0]?._id;

      // Update scalar fields
      await updateMemory(mid, {
        title: title.trim(),
        description: description.trim(),
        dateTaken: dateTaken,
        place: placeTaken.trim(),
        placeTaken: placeTaken.trim(),
        category: category,
        privacy,
        ...(fileId ? { fileId, fileid: fileId } : {})
      });

      // Diff tagged person IDs
      const originalIds = new Set((memory.taggedPersons || (memory as any).taggedPeople || memory.files?.[0]?.taggedPeople || memory.files?.[0]?.taggedPersons || []).map((p: any) => p.personId || p.id));
      const newIds = new Set(taggedPersonIds);

      // Add new tags
      for (const id of newIds) {
        if (!originalIds.has(id)) {
          await addMemoryTag(mid, id);
        }
      }
      // Remove old tags
      for (const id of originalIds) {
        if (!newIds.has(id)) {
          await removeMemoryTag(mid, id);
        }
      }

      trackEvent("edit_post_completed", {
        post_id: mid,
        post_type: "memory",
        media_type: mediaType,
        tagged_ids: taggedPersonIds,
        tagged_names: taggedNames,
      });

      toast({
        title: 'Success',
        description: 'Memory updated successfully.',
      });
      onUpdated();
      onClose();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to update memory';
      trackEvent("edit_post_failed", {
        post_id: mid,
        post_type: "memory",
        media_type: mediaType,
        tagged_ids: taggedPersonIds,
        tagged_names: taggedNames,
        error: errMsg,
      });
      setError(errMsg);
      toast({
        title: 'Error Updating Memory',
        description: errMsg,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (!title.trim() || isFormInvalid) return;
    setShowConfirmSave(true);
  };

  return (
    <div className={`fixed inset-0 z-[70] ${isMobile ? 'flex items-end' : 'flex items-center justify-center'}`}>
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />

      <div className={`relative w-full bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-md border border-[#E2E8F0]/60 dark:border-[#2a2a2a] shadow-[0_20px_60px_rgba(0,0,0,0.12)] flex flex-col ${isMobile ? 'rounded-t-2xl rounded-b-none max-h-[90dvh] overflow-hidden' : 'max-w-lg mx-2 sm:mx-4 rounded-2xl max-h-[95vh] sm:max-h-[90vh]'}`} style={isMobile ? { paddingBottom: 'env(safe-area-inset-bottom)' } : undefined}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4 border-b border-[#E2E8F0]/60 dark:border-[#2a2a2a]">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-[#2F3E8F]" />
            <h2 className="text-base font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">Edit Memory</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-5 py-4 space-y-4">
          {/* Details */}
          <div>
            <Label className="text-sm text-gray-700 dark:text-gray-300">Title <span className="text-white">*</span></Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (title.trim() && !isFormInvalid) {
                    handleSave();
                  }
                }
              }}
              placeholder="Memory title"
              autoFocus
              error={title.length > 0 ? formFileds.error : undefined}
              showCharCount
              charLimit={titleMaxLength ?? 100}
            />
          </div>
          <div>
            <Label className="text-sm text-gray-700">Description</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add a description (optional)"
              className={`transition-all duration-200 ${description.trim().length > 0 ? 'min-h-[160px]' : 'min-h-[80px]'}`}
              error={description.length > 0 ? descVal.error : undefined}
              showCharCount
              charLimit={descriptionMaxLength ?? VALIDATION_LIMITS.description}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-sm text-gray-700">Date Taken</Label>
              <DateInput
                value={dateTaken}
                onChange={e => setDateTaken(e.target.value)}
              />
            </div>
            <div className="relative" ref={placeContainerRef}>
              <Label className="text-sm text-gray-700 dark:text-gray-300">Place</Label>
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
                  className="w-full px-3 py-2 border border-gray-200 dark:border-[#2a2a2a] rounded-lg text-sm bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 flex items-center justify-between text-left focus:outline-none focus:border-[#2F3E8F]"
                >
                  <span className={placeTaken ? "text-gray-900 dark:text-gray-100 truncate pr-4" : "text-stone-400 dark:text-stone-500 truncate"}>
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
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-[#1a1a1a] border border-[#E2E8F0]/80 dark:border-[#2a2a2a] rounded-lg shadow-lg p-2 space-y-2 max-h-64 overflow-y-auto animate-in fade-in-50 duration-200">
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
            <Label className="text-sm text-gray-700 dark:text-gray-300">Category</Label>
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
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-[#1a1a1a] border border-[#E2E8F0]/80 dark:border-[#2a2a2a] rounded-lg shadow-lg max-h-60 overflow-y-auto p-1 space-y-2 animate-in fade-in-50 duration-200">
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
            <Label className="text-sm text-gray-700">Privacy</Label>
            <select
              value={privacy}
              onChange={e => setPrivacy(e.target.value as MemoryPrivacy)}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:border-[#E8D5C4] focus:ring-1 focus:ring-[#E8D5C4] outline-none"
            >
              <option value="tree">Tree Members</option>
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </div> */}

          {/* Person Tagging */}
          <div>
            <Label className="text-sm text-gray-700 mb-2 block">
              Tagged People ({taggedPersonIds.length} selected)
            </Label>
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-[#8B7355] dark:text-[#999]" />
              <Input
                value={personSearch}
                onChange={e => setPersonSearch(e.target.value)}
                placeholder="Search people..."
                className="pl-8"
              />
            </div>
            <div className="max-h-[200px] overflow-y-auto space-y-1 border border-[#E2E8F0]/60 dark:border-[#2a2a2a] rounded-lg p-1">
              {filteredPersons.map(p => {
                const checked = taggedPersonIds.includes(p.personId);
                return (
                  <label
                    key={p.personId}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${checked ? 'bg-[#E8EDFF]' : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePerson(p.personId)}
                      className="w-4 h-4 rounded border-gray-300 text-[#2F3E8F] focus:ring-[#2F3E8F]"
                    />
                    <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                      {p.profilePhotoUrl ? (
                        <img src={resolveBackendUrl(p.profilePhotoUrl)} alt={p.firstName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-[9px] text-gray-500 font-medium">
                          {p.firstName[0]}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-700">{p.firstName} {p.lastName}</span>
                  </label>
                );
              })}
              {filteredPersons.length === 0 && (
                <p className="text-sm text-[#8B7355] dark:text-[#999] text-center py-3">No people found</p>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-3 sm:px-5 py-3 border-t border-[#E2E8F0]/60 dark:border-[#2a2a2a]">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !title.trim() || isFormInvalid}>
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>

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
