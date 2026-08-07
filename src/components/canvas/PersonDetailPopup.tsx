/**
 * PersonDetailPopup — Ancestry-style click-to-popup detail card
 *
 * Shows when a person card is clicked. Displays photo, name, dates,
 * and action buttons (Profile, Add Relative, "..." for more options).
 * Clicking canvas or another card dismisses it.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { User, UserPlus, MoreHorizontal, Focus, Edit, Trash2, Clock, Image, BookOpen, Tag, MessageCircle, Zap, Heart, Baby, Users, Crown, UserCheck, HeartCrack } from 'lucide-react';
import type { Person } from '@/types';
import { resolveBackendUrl } from '@/config/api';
import type { RelationshipLabelEntry } from '@/services/relationshipLabelService';

import { getPersonPhotoUrl, getDefaultAvatar as getAvatar } from '@/utils/personPhotoUtils';

const BASE_PATH = import.meta.env.BASE_URL || '/';
function getDefaultAvatar(gender: Person['gender']): string {
  return getAvatar(gender);
}


function formatLifespan(birthDate?: string | null, deathDate?: string | null, isLiving?: boolean): string {
  if (!birthDate) return '';
  const birthYear = new Date(birthDate).getFullYear();
  if (deathDate) return `${birthYear} – ${new Date(deathDate).getFullYear()}`;
  if (isLiving) return `b. ${birthYear}`;
  return `${birthYear}`;
}

export interface PersonDetailPopupProps {
  person: Person;
  anchorX: number; // card left X in canvas space
  anchorY: number; // card top Y in canvas space
  cardWidth: number;
  cardHeight: number;
  relationshipLabel?: RelationshipLabelEntry;
  // Actions
  onViewProfile?: () => void;
  onAddRelative?: () => void;
  onFocus?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onViewHistory?: () => void;
  onOpenGallery?: () => void;
  onAddMemory?: () => void;
  onManageTags?: () => void;
  onViewLifeStory?: () => void;
  onViewComments?: () => void;
  onQuickAdd?: () => void;
  onAddParent?: () => void;
  onAddSpouse?: () => void;
  onMarryExisting?: () => void;
  onAddChild?: () => void;
  onAddSibling?: () => void;
  onAddGrandparent?: () => void;
  onAddUncleAunt?: () => void;
  onAddCousin?: () => void;
  onAddGuardian?: () => void;
  onEndMarriage?: () => void;
  hasSpouse?: boolean;
  onClose: () => void;
}

export function PersonDetailPopup({
  person,
  anchorX,
  anchorY,
  cardWidth,
  cardHeight,
  relationshipLabel,
  onViewProfile,
  onAddRelative: _onAddRelative,
  onFocus,
  onEdit,
  onDelete,
  onViewHistory,
  onOpenGallery,
  onAddMemory,
  onManageTags,
  onViewLifeStory,
  onViewComments,
  onQuickAdd,
  onAddParent,
  onAddSpouse,
  onMarryExisting,
  onAddChild,
  onAddSibling,
  onAddGrandparent,
  onAddUncleAunt,
  onAddCousin,
  onAddGuardian,
  onEndMarriage,
  hasSpouse,
  onClose,
}: PersonDetailPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showAddRelativeMenu, setShowAddRelativeMenu] = useState(false);

  const fullName = [person.firstName, person.lastName].filter(name => name && name !== 'undefined').join(' ');
  const lifespan = formatLifespan(person.birthDate, person.deathDate, person.isLiving);
  const isMale = person.gender === 'male';
  const nameColor = isMale ? 'text-[#2F3E8F] dark:text-blue-400' : 'text-[#2F3E8F] dark:text-pink-400';

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleAction = useCallback((action?: () => void) => {
    if (action) action();
    onClose();
  }, [onClose]);

  // Position: below the card, centered
  const popupLeft = anchorX + cardWidth / 2;
  const popupTop = anchorY + cardHeight + 8;

  return (
    <div
      ref={popupRef}
      className="person-detail-popup absolute z-30"
      style={{
        left: popupLeft,
        top: popupTop,
        transform: 'translateX(-50%)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white/98 dark:bg-zinc-900/98 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200 dark:border-zinc-800 overflow-hidden min-w-[260px] max-w-[300px]">
        {/* Header: Photo + Name + Dates */}
        <div className="flex items-start gap-3 p-3">
          <img
            src={getPersonPhotoUrl(person) || getDefaultAvatar(person.gender)}
            alt={fullName}
            className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-gray-200 dark:border-zinc-800"
          />

          <div className="flex-1 min-w-0">
            <div className={`font-semibold text-sm leading-tight ${nameColor} truncate`}>
              {fullName}
            </div>
            {lifespan && (
              <div className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{lifespan}</div>
            )}
            {relationshipLabel && (
              <div className="text-xs text-[#2F3E8F] dark:text-zinc-300 font-medium mt-0.5">
                {relationshipLabel.englishLabel}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-1.5 px-3 pb-3">
          <button
            onClick={() => handleAction(onViewProfile)}
            className="flex items-center gap-1.5 h-8 px-3 bg-[#2F3E8F] dark:bg-blue-600 hover:bg-[#25327A] dark:hover:bg-blue-500
                       text-white text-xs font-medium rounded-lg
                       transition-colors duration-150"
          >
            <User className="w-3.5 h-3.5" />
            Profile
          </button>

          {/* Add Relative dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowAddRelativeMenu(!showAddRelativeMenu); setShowMoreMenu(false); }}
              className="flex items-center gap-1.5 h-8 px-3 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700
                         text-gray-700 dark:text-zinc-300 text-xs font-medium rounded-lg
                         transition-colors duration-150"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Relative
            </button>

            {showAddRelativeMenu && (
              <div className="absolute left-0 top-full mt-1 bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-gray-200 dark:border-zinc-800 py-1 min-w-[180px] z-40 max-h-[300px] overflow-y-auto">
                <button onClick={() => handleAction(onAddParent)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                  <UserPlus className="h-4 w-4" /> Add Parent
                </button>
                <button onClick={() => handleAction(onAddSpouse)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                  <Heart className="h-4 w-4" /> Add Spouse
                </button>
                <button onClick={() => handleAction(onMarryExisting)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                  <Heart className="h-4 w-4" /> Marry Existing
                </button>
                <button onClick={() => handleAction(onAddChild)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                  <Baby className="h-4 w-4" /> Add Child
                </button>
                <button onClick={() => handleAction(onAddSibling)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Add Sibling
                </button>
                <div className="h-px bg-gray-200 dark:bg-zinc-800 my-1" />
                <button onClick={() => handleAction(onAddGrandparent)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                  <Crown className="h-4 w-4" /> Add Grandparent
                </button>
                <button onClick={() => handleAction(onAddUncleAunt)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                  <UserPlus className="h-4 w-4" /> Add Uncle/Aunt
                </button>
                <button onClick={() => handleAction(onAddCousin)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Add Cousin
                </button>
                <button onClick={() => handleAction(onAddGuardian)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                  <UserCheck className="h-4 w-4" /> Add Guardian
                </button>
              </div>
            )}
          </div>

          {/* "..." more menu */}
          <div className="relative">
            <button
              onClick={() => { setShowMoreMenu(!showMoreMenu); setShowAddRelativeMenu(false); }}
              className="flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700
                         text-gray-700 dark:text-zinc-300 rounded-lg transition-colors duration-150"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-gray-200 dark:border-zinc-800 py-1 min-w-[180px] z-40 max-h-[320px] overflow-y-auto">
                <button onClick={() => handleAction(onEdit)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                  <Edit className="h-4 w-4" /> Edit Details
                </button>
                <button onClick={() => handleAction(onFocus)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                  <Focus className="h-4 w-4" /> Focus on Person
                </button>
                <button onClick={() => handleAction(onQuickAdd)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 text-[#2F3E8F] dark:text-blue-400 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-[#2F3E8F] dark:text-blue-400" /> Quick Add
                </button>
                <div className="h-px bg-gray-200 dark:bg-zinc-800 my-1" />
                <button onClick={() => handleAction(onViewHistory)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> View History
                </button>
                <button onClick={() => handleAction(onOpenGallery)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                  <Image className="h-4 w-4" /> Media Gallery
                </button>
                <button onClick={() => handleAction(onAddMemory)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> Add Memory
                </button>
                <button onClick={() => handleAction(onManageTags)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                  <Tag className="h-4 w-4" /> Manage Tags
                </button>
                <button onClick={() => handleAction(onViewLifeStory)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> Life Story
                </button>
                <button onClick={() => handleAction(onViewComments)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" /> Comments
                </button>
                {hasSpouse && onEndMarriage && (
                  <>
                    <div className="h-px bg-gray-200 dark:bg-zinc-800 my-1" />
                    <button onClick={() => handleAction(onEndMarriage)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 text-[#2F3E8F] dark:text-blue-400 flex items-center gap-2">
                      <HeartCrack className="h-4 w-4" /> End Marriage
                    </button>
                  </>
                )}
                <div className="h-px bg-gray-200 dark:bg-zinc-800 my-1" />
                <button onClick={() => handleAction(onDelete)} className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center gap-2">
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
