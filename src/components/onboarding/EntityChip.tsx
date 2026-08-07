/**
 * EntityChip — Extracted family member chip for the story capture review.
 *
 * Shows name, role, gender icon with inline edit/delete.
 * When expandable=true (Review phase), editing opens a full detail form
 * with all person fields (birthDate, occupation, religion, etc.).
 */

import { useState } from 'react';
import { X, Pencil, Check, User, ChevronDown, ChevronUp } from 'lucide-react';
import type { StoryEntity } from '@/services/storyParseService';
import { PlaceAutocomplete } from '@/components/ui/PlaceAutocomplete';

interface EntityChipProps {
  entity: StoryEntity;
  onUpdate: (tempId: string, updates: Partial<StoryEntity>) => void;
  onRemove: (tempId: string) => void;
  expandable?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  self: 'You',
  father: 'Father',
  mother: 'Mother',
  spouse: 'Spouse',
  son: 'Son',
  daughter: 'Daughter',
  brother: 'Brother',
  sister: 'Sister',
  grandfather: 'Grandfather',
  grandmother: 'Grandmother',
  uncle: 'Uncle',
  aunt: 'Aunt',
  cousin: 'Cousin',
  'father-in-law': 'Father-in-law',
  'mother-in-law': 'Mother-in-law',
  'half-brother': 'Half-brother',
  'half-sister': 'Half-sister',
};

function getGenderColor(gender: string): string {
  if (gender === 'male') return 'bg-[#E8EDFF] dark:bg-blue-950/40 border-[#2F3E8F]/30 dark:border-blue-800/40 text-blue-800 dark:text-blue-200';
  if (gender === 'female') return 'bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-800/40 text-pink-800 dark:text-pink-200';
  return 'bg-stone-50 dark:bg-zinc-900 border-stone-200 dark:border-zinc-800 text-stone-800 dark:text-zinc-200';
}

function getGenderIconColor(gender: string): string {
  if (gender === 'male') return 'text-blue-500 dark:text-blue-400';
  if (gender === 'female') return 'text-pink-500 dark:text-pink-400';
  return 'text-stone-400 dark:text-zinc-500';
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'bg-green-400';
  if (confidence >= 0.5) return 'bg-blue-400';
  return 'bg-red-400';
}

// ─── Inline Edit (compact, used in Input phase) ─────────────────────────────

function InlineEdit({
  entity,
  onUpdate,
  onClose,
}: {
  entity: StoryEntity;
  onUpdate: (tempId: string, updates: Partial<StoryEntity>) => void;
  onClose: () => void;
}) {
  const [editName, setEditName] = useState(entity.firstName);

  const handleSave = () => {
    if (editName.trim()) {
      onUpdate(entity.tempId, { firstName: editName.trim() });
    }
    onClose();
  };

  return (
    <div className="flex items-center gap-1">
      <input
        type="text"
        value={editName}
        onChange={(e) => setEditName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
        className="w-20 px-1 py-0 text-sm bg-white/80 dark:bg-zinc-900/80 border border-stone-300 dark:border-zinc-700 rounded
          focus:outline-none focus:ring-1 focus:ring-[#2F3E8F]/50 dark:focus:ring-blue-500/50
          h-6 text-base md:text-sm text-stone-800 dark:text-zinc-100"
        autoFocus
      />
      <button onClick={handleSave} className="p-0.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-stone-800 dark:text-zinc-100">
        <Check className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Expanded Edit Form (used in Review phase) ──────────────────────────────

function ExpandedEditForm({
  entity,
  onUpdate,
  onClose,
}: {
  entity: StoryEntity;
  onUpdate: (tempId: string, updates: Partial<StoryEntity>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    firstName: entity.firstName,
    lastName: entity.lastName || '',
    gender: entity.gender,
    birthDate: entity.birthDate || '',
    birthPlace: entity.birthPlace || '',
    deathDate: entity.deathDate || '',
    deathPlace: entity.deathPlace || '',
    occupation: entity.occupation || '',
    isLiving: entity.isLiving !== false,
    religion: entity.religion || '',
    nativePlace: entity.nativePlace || '',
  });

  const handleSave = () => {
    onUpdate(entity.tempId, {
      firstName: form.firstName.trim() || entity.firstName,
      lastName: form.lastName.trim() || undefined,
      gender: form.gender,
      birthDate: form.birthDate.trim() || undefined,
      birthPlace: form.birthPlace.trim() || undefined,
      deathDate: form.deathDate.trim() || undefined,
      deathPlace: form.deathPlace.trim() || undefined,
      occupation: form.occupation.trim() || undefined,
      isLiving: form.isLiving,
      religion: form.religion.trim() || undefined,
      nativePlace: form.nativePlace.trim() || undefined,
    });
    onClose();
  };

  const inputClass = "w-full px-3 py-2 text-base md:text-sm text-stone-800 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/40 dark:focus:ring-blue-500/40 h-11 md:h-9";
  const labelClass = "text-xs text-stone-400 dark:text-zinc-400 uppercase tracking-wider mb-1 block";

  return (
    <div className="w-full mt-2 p-4 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-2xl shadow-sm animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>First Name</label>
          <input
            type="text"
            value={form.firstName}
            onChange={(e) => setForm(prev => ({ ...prev, firstName: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Last Name</label>
          <input
            type="text"
            value={form.lastName}
            onChange={(e) => setForm(prev => ({ ...prev, lastName: e.target.value }))}
            className={inputClass}
            placeholder="Optional"
          />
        </div>
        <div>
          <label className={labelClass}>Gender</label>
          <select
            value={form.gender}
            onChange={(e) => setForm(prev => ({ ...prev, gender: e.target.value as 'male' | 'female' | 'other' }))}
            className={inputClass}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Birth Date</label>
          <input
            type="text"
            value={form.birthDate}
            onChange={(e) => setForm(prev => ({ ...prev, birthDate: e.target.value }))}
            className={inputClass}
            placeholder="e.g., 1955 or 1955-03-15"
          />
        </div>
        <div>
          <label className={labelClass}>Birth Place</label>
          <PlaceAutocomplete
            value={form.birthPlace}
            onChange={(val) => setForm(prev => ({ ...prev, birthPlace: val }))}
            className={inputClass}
            placeholder="Search for birth place..."
          />
        </div>
        <div>
          <label className={labelClass}>Occupation</label>
          <input
            type="text"
            value={form.occupation}
            onChange={(e) => setForm(prev => ({ ...prev, occupation: e.target.value }))}
            className={inputClass}
            placeholder="e.g., Teacher, Engineer"
          />
        </div>
        <div>
          <label className={labelClass}>Religion</label>
          <input
            type="text"
            value={form.religion}
            onChange={(e) => setForm(prev => ({ ...prev, religion: e.target.value }))}
            className={inputClass}
            placeholder="e.g., Hindu, Muslim, Christian"
          />
        </div>
        <div>
          <label className={labelClass}>Native Place</label>
          <PlaceAutocomplete
            value={form.nativePlace}
            onChange={(val) => setForm(prev => ({ ...prev, nativePlace: val }))}
            className={inputClass}
            placeholder="Search for native place..."
          />
        </div>
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!form.isLiving}
              onChange={(e) => setForm(prev => ({ ...prev, isLiving: !e.target.checked }))}
              className="w-4 h-4 rounded border-stone-300 dark:border-zinc-700 dark:bg-zinc-800 text-[#2F3E8F] dark:text-blue-500 focus:ring-[#2F3E8F]/40 dark:focus:ring-blue-500/40"
            />
            <span className="text-sm text-stone-600 dark:text-zinc-300">Deceased</span>
          </label>
        </div>
        {!form.isLiving && (
          <>
            <div>
              <label className={labelClass}>Death Date</label>
              <input
                type="text"
                value={form.deathDate}
                onChange={(e) => setForm(prev => ({ ...prev, deathDate: e.target.value }))}
                className={inputClass}
                placeholder="e.g., 2020"
              />
            </div>
            <div>
              <label className={labelClass}>Death Place</label>
              <PlaceAutocomplete
                value={form.deathPlace}
                onChange={(val) => setForm(prev => ({ ...prev, deathPlace: val }))}
                className={inputClass}
                placeholder="Search for death place..."
              />
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#2F3E8F] dark:bg-blue-600 text-white text-sm
            font-medium rounded-xl hover:bg-[#3B4DA6] dark:hover:bg-blue-500 active:scale-95 transition-all
            h-10 md:h-8"
        >
          <Check className="w-3.5 h-3.5" />
          Save
        </button>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-4 py-2 text-stone-500 dark:text-zinc-400 text-sm
            font-medium rounded-xl hover:bg-stone-100 dark:hover:bg-zinc-800 active:scale-95 transition-all
            h-10 md:h-8"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function EntityChip({ entity, onUpdate, onRemove, expandable = false }: EntityChipProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const roleLabel = ROLE_LABELS[entity.role] || entity.role;
  const isSelf = entity.role === 'self';

  const handleEditClick = () => {
    if (expandable) {
      setIsExpanded(!isExpanded);
    } else {
      setIsEditing(true);
    }
  };

  return (
    <div className={expandable && isExpanded ? 'w-full' : ''}>
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm
          transition-all duration-200 ${getGenderColor(entity.gender)}
          ${isSelf ? 'ring-2 ring-[#2F3E8F]/40 dark:ring-blue-500/40' : ''}`}
      >
        {/* Confidence dot */}
        <div className={`w-1.5 h-1.5 rounded-full ${getConfidenceColor(entity.confidence)}`} />

        <User className={`h-3.5 w-3.5 ${getGenderIconColor(entity.gender)}`} />

        {isEditing && !expandable ? (
          <InlineEdit
            entity={entity}
            onUpdate={onUpdate}
            onClose={() => setIsEditing(false)}
          />
        ) : (
          <span className="font-medium">{entity.firstName}</span>
        )}

        <span className="text-[11px] opacity-60">{roleLabel}</span>

        {!isEditing && (
          <button
            onClick={handleEditClick}
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full opacity-50 hover:opacity-100 transition-opacity"
            title="Edit details"
          >
            {expandable ? (
              isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
            ) : (
              <Pencil className="h-3 w-3" />
            )}
          </button>
        )}

        {!isSelf && (
          <button
            onClick={() => onRemove(entity.tempId)}
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full opacity-50 hover:opacity-100 transition-opacity"
            title="Remove"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Expanded edit form */}
      {expandable && isExpanded && (
        <ExpandedEditForm
          entity={entity}
          onUpdate={onUpdate}
          onClose={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
}
