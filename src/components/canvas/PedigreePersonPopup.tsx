import type { Person } from '@/types';
import { X, User, Edit3, Plus, ArrowRight, Eye } from 'lucide-react';
import { resolveBackendUrl } from '@/config/api';

interface PedigreePersonPopupProps {
  person: Person;
  position: { x: number; y: number };
  onClose: () => void;
  onViewFamilyTree: (personId: string) => void;
  onEdit: (personId: string) => void;
  onAddRelative: (personId: string) => void;
  onViewProfile: (personId: string) => void;
}

export function PedigreePersonPopup({
  person,
  position,
  onClose,
  onViewFamilyTree,
  onEdit,
  onAddRelative,
  onViewProfile,
}: PedigreePersonPopupProps) {
  const name = [person.firstName, person.lastName].filter(n => n && n !== 'undefined').join(' ').trim() || 'Unnamed';
  const birthYear = person.birthDate ? new Date(person.birthDate).getFullYear() : null;
  const deathYear = person.deathDate ? new Date(person.deathDate).getFullYear() : null;

  const lifespan = birthYear
    ? `${birthYear} – ${deathYear || (person.isLiving !== false ? 'Present' : '?')}`
    : 'No dates recorded';

  const avatarUrl = person.photoThumbUrl ? resolveBackendUrl(person.photoThumbUrl) : null;

  return (
    <div
      className="absolute z-50 w-64 bg-white dark:bg-[#1E1E1E] rounded-xl shadow-xl ring-1 ring-black/10 dark:ring-white/10 p-4 animate-in fade-in zoom-in-95 duration-150"
      style={{ left: position.x, top: position.y }}
    >
      <div className="flex justify-between items-start gap-2 mb-3">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-stone-100 dark:ring-[#333]"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
              <User className="w-5 h-5 text-stone-400 dark:text-stone-500" />
            </div>
          )}
          <div>
            <h4 className="text-sm font-semibold text-stone-800 dark:text-stone-200 leading-tight">
              {name}
            </h4>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">{lifespan}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-1">
        <button
          onClick={() => onViewProfile(person.personId)}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/60 transition-colors font-medium"
        >
          <Eye className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" />
          View Profile
        </button>
        <button
          onClick={() => onViewFamilyTree(person.personId)}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/60 transition-colors font-medium"
        >
          <ArrowRight className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" />
          Set as Focus Person
        </button>
        <button
          onClick={() => onEdit(person.personId)}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/60 transition-colors font-medium"
        >
          <Edit3 className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" />
          Edit Info
        </button>
        <button
          onClick={() => onAddRelative(person.personId)}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/60 transition-colors font-medium"
        >
          <Plus className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" />
          Add Parent
        </button>
      </div>
    </div>
  );
}
