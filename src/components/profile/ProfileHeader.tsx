import { useState, useRef } from 'react';
import { ArrowLeft, ChevronDown, Edit2, Trash2, Eye, GitMerge, Clock, FileText, Camera } from 'lucide-react';
import type { Person } from '@/types';
import { getPersonPhotoUrl, getDefaultAvatar } from '@/utils/personPhotoUtils';


interface ProfileHeaderProps {
  person: Person;
  onClose: () => void;
  onEditPerson: () => void;
  onDeletePerson: () => void;
  onViewInTree: () => void;
  onViewHistory: () => void;
  onManageTags: () => void;
  onMergeDuplicate?: () => void;
  onPhotoChange?: (file: File) => void;
}

export function ProfileHeader({
  person,
  onClose,
  onEditPerson,
  onDeletePerson,
  onViewInTree,
  onViewHistory,
  onManageTags,
  onMergeDuplicate,
  onPhotoChange,
}: ProfileHeaderProps) {
  const [showEditMenu, setShowEditMenu] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fullName = `${person.firstName} ${person.lastName || ''}`.trim();
  const birthYear = person.birthDate ? new Date(person.birthDate).getFullYear() : null;
  const deathYear = person.deathDate ? new Date(person.deathDate).getFullYear() : null;

  const lifespan = birthYear
    ? deathYear
      ? `${birthYear} - ${deathYear}`
      : person.isLiving === false
        ? `${birthYear} - ?`
        : `${birthYear} -`
    : null;

  const fallbackAvatar = getDefaultAvatar(person.gender);


  return (
    <div className="bg-[#3D2E1F] text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 md:px-6">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tree
        </button>

        <div className="flex items-center gap-2">
          {/* Edit dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowEditMenu(!showEditMenu); setShowToolsMenu(false); }}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-md transition-colors"
            >
              Edit <ChevronDown className="h-3 w-3" />
            </button>
            {showEditMenu && (
              <div className="absolute right-0 top-full mt-1 bg-[#F9FAFB] dark:bg-[#1A1A1A] text-[#3D2E1F] dark:text-[#F3F2F1] rounded-lg shadow-xl border border-[#E2E8F0] dark:border-[#2a2a2a] py-1 min-w-[180px] z-50">
                <button onClick={() => { onEditPerson(); setShowEditMenu(false); }} className="w-full px-3 py-2 text-left text-sm text-[#8B7355] dark:text-gray-300 hover:bg-[#F4F6FA] dark:hover:bg-white/[0.04] flex items-center gap-2">
                  <Edit2 className="h-4 w-4 text-[#8B7355] dark:text-gray-400" /> Quick Edit
                </button>
                <div className="h-px bg-[#E2E8F0] dark:bg-[#2a2a2a] my-1" />
                <button onClick={() => { onDeletePerson(); setShowEditMenu(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" /> Delete Person
                </button>
              </div>
            )}
          </div>

          {/* Tools dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowToolsMenu(!showToolsMenu); setShowEditMenu(false); }}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-md transition-colors"
            >
              Tools <ChevronDown className="h-3 w-3" />
            </button>
            {showToolsMenu && (
              <div className="absolute right-0 top-full mt-1 bg-[#F9FAFB] dark:bg-[#1A1A1A] text-[#3D2E1F] dark:text-[#F3F2F1] rounded-lg shadow-xl border border-[#E2E8F0] dark:border-[#2a2a2a] py-1 min-w-[180px] z-50">
                <button onClick={() => { onViewInTree(); setShowToolsMenu(false); }} className="w-full px-3 py-2 text-left text-sm text-[#8B7355] dark:text-gray-300 hover:bg-[#F4F6FA] dark:hover:bg-white/[0.04] flex items-center gap-2">
                  <Eye className="h-4 w-4 text-[#8B7355] dark:text-gray-400" /> View in Tree
                </button>
                {onMergeDuplicate && (
                  <button onClick={() => { onMergeDuplicate(); setShowToolsMenu(false); }} className="w-full px-3 py-2 text-left text-sm text-[#8B7355] dark:text-gray-300 hover:bg-[#F4F6FA] dark:hover:bg-white/[0.04] flex items-center gap-2">
                    <GitMerge className="h-4 w-4 text-[#8B7355] dark:text-gray-400" /> Merge with Duplicate
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Person info */}
      <div className="flex flex-col items-center pb-6 pt-2">
        {/* Photo */}
        <div className="relative group mb-3">
          <img
            src={getPersonPhotoUrl(person) || fallbackAvatar}
            alt={fullName}
            className="w-24 h-24 rounded-full object-cover border-2 border-white/30"
            onError={(e) => { const img = e.target as HTMLImageElement; img.onerror = null; img.src = fallbackAvatar; }}
          />

          {onPhotoChange && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <Camera className="h-6 w-6 text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onPhotoChange(file);
                }}
              />
            </>
          )}
        </div>

        {/* Name */}
        <h1 className="text-2xl md:text-3xl font-serif-display italic font-semibold tracking-wide">
          {fullName}
        </h1>

        {/* Lifespan */}
        {lifespan && (
          <p className="text-gray-300 text-sm mt-1">{lifespan}</p>
        )}

        {/* Birth/death places */}
        <div className="text-gray-400 text-xs mt-1 flex flex-wrap justify-center gap-x-4">
          {person.birthPlace && <span>b. {person.birthPlace}</span>}
          {person.deathPlace && <span>d. {person.deathPlace}</span>}
        </div>

        {/* Tags */}
        {'tags' in person && Array.isArray((person as Record<string, unknown>).tags) && ((person as Record<string, unknown>).tags as string[]).length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 mt-3">
            {((person as Record<string, unknown>).tags as string[]).map((tag: string) => (
              <span key={tag} className="px-2 py-0.5 text-xs bg-white/15 rounded-full text-gray-200">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Close dropdowns on click outside */}
      {(showEditMenu || showToolsMenu) && (
        <div className="fixed inset-0 z-40" onClick={() => { setShowEditMenu(false); setShowToolsMenu(false); }} />
      )}
    </div>
  );
}
