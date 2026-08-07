/**
 * NodeDisplayPreferencesModal — lets users choose which fields appear
 * on the node hover/tap preview card (up to 4 additional fields + name).
 * Persists preferences to the server (FamilyTree node in Neo4j).
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  ResponsiveDialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Calendar, CalendarX2, MapPin, MapPinOff, Briefcase, GraduationCap,
  Scroll, Users, Heart, Home, Languages, Flag, GitBranch,
  ChevronUp, ChevronDown, X, RotateCcw, Loader2,
  CloudCog,
} from 'lucide-react';
import { PREVIEW_FIELD_REGISTRY, DEFAULT_PREVIEW_FIELDS } from '@/constants/previewFieldRegistry';
import { useTreeStore } from '@/store/treeStore';
import { getTreeNodeDisplayPreferences, updateTreeNodeDisplayPreferences } from '@/services/neo4jDataService';


const MAX_FIELDS = 4;

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Calendar, CalendarX: CalendarX2, MapPin, MapPinOff, Briefcase, GraduationCap,
  Scroll, Users, Heart, Home, Languages, Flag, GitBranch,
};

interface NodeDisplayPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  treeId: string;
}

export function NodeDisplayPreferencesModal({ isOpen, onClose, treeId }: NodeDisplayPreferencesModalProps) {
  const storeFields = useTreeStore(s => s.previewFields);
  const setPreviewFields = useTreeStore(s => s.setPreviewFields);

  const [selected, setSelected] = useState<string[]>(storeFields);
  console.log("selected", selected);
  const [saving, setSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

  // Fetch from API on open
  useEffect(() => {
    if (isOpen) {
      const fetchPrefs = async () => {
        setInitialLoading(true);
        try {
          const data = await getTreeNodeDisplayPreferences(treeId);
          if (data?.fields) {
            // Normalize fields to ensure matching with frontend keys
            const normalized = data.fields
              .map(f => {
                if (f === 'birthDate' || f === 'birth_date') return 'dateOfBirth';
                if (f === 'deathDate' || f === 'death_date' || f === 'date_of_death') return 'dateOfDeath';
                if (f === 'birth_place') return 'birthPlace';
                if (f === 'death_place') return 'deathPlace';
                if (f === 'native_place') return 'nativePlace';
                if (f === 'native_language') return 'nativeLanguage';
                if (f === 'relationshipLabel') return 'relationship';
                return f;
              })
              .filter(f => PREVIEW_FIELD_REGISTRY.some(reg => reg.key === f));
            setSelected(normalized);
            setPreviewFields(normalized); // sync store
          }
        } catch (err) {
          console.error('Failed to fetch node display preferences:', err);
          // Fallback to store fields
          setSelected(storeFields);
        } finally {
          setInitialLoading(false);
        }
      };
      fetchPrefs();
    }
  }, [isOpen, treeId]);

  const handleToggle = (key: string) => {
    setSelected(prev => {
      if (prev.includes(key)) {
        return prev.filter(k => k !== key);
      }
      if (prev.length >= MAX_FIELDS) return prev; // block
      return [...prev, key];
    });
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setSelected(prev => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const handleMoveDown = (index: number) => {
    setSelected(prev => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const handleRemove = (key: string) => {
    setSelected(prev => prev.filter(k => k !== key));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save to server
      await updateTreeNodeDisplayPreferences(treeId, { fields: selected });
      // Update local store (also persists to localStorage as fallback)
      setPreviewFields(selected);
      onClose();
    } catch (err) {
      console.error('Failed to save node display preferences:', err);
      // Still update local store so the UI reflects the change
      setPreviewFields(selected);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSelected([...DEFAULT_PREVIEW_FIELDS]);
  };

  const atLimit = selected.length >= MAX_FIELDS;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <ResponsiveDialogContent mobileTitle="Node Display Settings" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-gray-900">
            Node Display Settings
          </DialogTitle>
          <DialogDescription>
            Choose which fields appear when you hover over a person in the tree.
            Name is always shown.
          </DialogDescription>
        </DialogHeader>

        {initialLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="w-8 h-8 text-[#2F3E8F] animate-spin" />
            <p className="text-sm text-gray-500">Loading preferences...</p>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {/* Selected fields with reorder */}
            {selected.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Selected fields ({selected.length}/{MAX_FIELDS})
                </p>
                <div className="space-y-1">
                  {selected.map((key, index) => {
                    const config = PREVIEW_FIELD_REGISTRY.find(f => f.key === key);
                    if (!config) return null;
                    const IconComp = ICON_MAP[config.icon];
                    return (
                      <div
                        key={key}
                        className="flex items-center gap-2 px-3 py-2 bg-[#2F3E8F]/5 border border-[#2F3E8F]/15 rounded-lg"
                      >
                        {IconComp && <IconComp className="w-3.5 h-3.5 text-[#2F3E8F] flex-shrink-0" />}
                        <span className="text-sm text-gray-800 flex-1">{config.label}</span>
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            className="p-1 rounded hover:bg-[#2F3E8F]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            aria-label="Move up"
                          >
                            <ChevronUp className="w-3.5 h-3.5 text-[#2F3E8F]" />
                          </button>
                          <button
                            onClick={() => handleMoveDown(index)}
                            disabled={index === selected.length - 1}
                            className="p-1 rounded hover:bg-[#2F3E8F]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            aria-label="Move down"
                          >
                            <ChevronDown className="w-3.5 h-3.5 text-[#2F3E8F]" />
                          </button>
                          <button
                            onClick={() => handleRemove(key)}
                            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                            aria-label="Remove"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Available fields */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Available fields
              </p>
              {atLimit && (
                <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                  You can select up to {MAX_FIELDS} fields in addition to the name.
                </p>
              )}
              <div className="grid grid-cols-2 gap-1.5">
                {PREVIEW_FIELD_REGISTRY.map((config) => {
                  const isSelected = selected.includes(config.key);
                  const isDisabled = !isSelected && atLimit;
                  const IconComp = ICON_MAP[config.icon];
                  return (
                    <button
                      key={config.key}
                      onClick={() => handleToggle(config.key)}
                      disabled={isDisabled}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-sm transition-all border ${isSelected
                        ? 'bg-[#2F3E8F]/5 border-[#2F3E8F]/20 text-[#2F3E8F]'
                        : isDisabled
                          ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-[#2F3E8F]/30 hover:bg-[#2F3E8F]/[0.02]'
                        }`}
                    >
                      {IconComp && (
                        <IconComp className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-[#2F3E8F]' : isDisabled ? 'text-gray-300' : 'text-gray-400'
                          }`} />
                      )}
                      <span className="truncate">{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset to defaults
          </button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-[#2F3E8F] hover:bg-[#263278] text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </ResponsiveDialogContent>
    </Dialog>
  );
}
