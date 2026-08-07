/**
 * PedigreeFocusCard - Ancestry.com-style focus card (dark theme)
 * Dark header, green section headers, avatars next to names.
 * Memoized SmallAvatar to prevent image flickering.
 */

import { memo, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Home } from 'lucide-react';
import type { PedigreeFocusContext } from '@/services/ancestryPedigreeService';
import type { Person } from '@/types';
import { getPersonPhotoUrl, getDefaultAvatar } from '@/utils/personPhotoUtils';
import { useTheme } from '@/contexts/ThemeContext';


interface PedigreeFocusCardProps {
  focusContext: PedigreeFocusContext;
  width: number;
  onViewFamilyTree: (personId: string) => void;
  onAddRelative: () => void;
  onPersonClick: (personId: string) => void;
  homePersonId?: string;
}

function formatYear(dateStr?: string | null): string {
  if (!dateStr) return '';
  const match = dateStr.match(/\d{4}/);
  return match ? match[0] : '';
}

function getLifespan(person: Person): string {
  const birth = formatYear(person.birthDate);
  if (!birth) return '';
  if (person.isLiving) return `${birth}-Living`;
  const death = formatYear(person.deathDate);
  return death ? `${birth}-${death}` : `b. ${birth}`;
}


const SmallAvatar = memo(function SmallAvatar({ person }: { person: Person }) {
  const photoSrc = getPersonPhotoUrl(person) || getDefaultAvatar(person.gender);
  const [src, setSrc] = useState(photoSrc);
  const [errored, setErrored] = useState(false);
  const borderColor = person.gender === 'female' ? '#f9a8d4' : '#94a3b8';
  const hasPhoto = !!person.photoThumbUrl || !!person.profilePhotoUrl || !!person.photoUrl;

  return (
    <img
      src={src}
      alt=""
      className={`w-5 h-5 rounded-full object-cover flex-shrink-0 ${(!hasPhoto || errored) ? 'dark:invert dark:brightness-150' : ''}`}
      style={{ border: `1.5px solid ${borderColor}` }}
      loading="lazy"
      onError={() => {
        if (!errored) {
          setErrored(true);
          setSrc(getDefaultAvatar(person.gender));
        }
      }}
    />
  );
});

const FocusAvatar = memo(function FocusAvatar({ person }: { person: Person }) {
  const photoSrc = getPersonPhotoUrl(person) || getDefaultAvatar(person.gender);
  const [src, setSrc] = useState(photoSrc);
  const [errored, setErrored] = useState(false);
  const borderColor = person.gender === 'female' ? '#f9a8d4' : '#94a3b8';
  const hasPhoto = !!person.photoThumbUrl || !!person.profilePhotoUrl || !!person.photoUrl;

  return (
    <img
      src={src}
      alt={person.firstName}
      className={`w-9 h-9 rounded-full object-cover flex-shrink-0 ${(!hasPhoto || errored) ? 'dark:invert dark:brightness-150' : ''}`}
      style={{ border: `2px solid ${borderColor}` }}
      loading="lazy"
      onError={() => {
        if (!errored) {
          setErrored(true);
          setSrc(getDefaultAvatar(person.gender));
        }
      }}
    />
  );
});


export function PedigreeFocusCard({
  focusContext,
  width,
  onViewFamilyTree: _onViewFamilyTree,
  onAddRelative,
  onPersonClick,
  homePersonId,
}: PedigreeFocusCardProps) {
  const { focusPerson, spouses, siblings, halfSiblings } = focusContext;
  const [spouseExpanded, setSpouseExpanded] = useState(true);
  const [siblingsExpanded, setSiblingsExpanded] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div
      className="absolute rounded shadow-lg overflow-hidden pedigree-node"
      style={{
        width,
        backgroundColor: isDark ? '#242424' : '#f5f5f0',
        border: isDark ? '1px solid #3f3f46' : '1px solid #ccc',
        transition: 'left 0.5s ease, top 0.5s ease',
      }}
    >
      {/* Header */}
      <div className="px-3 py-2 flex items-center gap-2.5" style={{ backgroundColor: isDark ? '#1C1C22' : '#2F3E8F' }}>
        <FocusAvatar person={focusPerson} />
        <div className="min-w-0">
          <div className="font-bold text-sm text-white truncate leading-tight">
            {[focusPerson.firstName, focusPerson.lastName].filter(n => n && n !== 'undefined').join(' ')}
          </div>
          <div className="text-xs text-white/90">
            {getLifespan(focusPerson)}
          </div>
        </div>
      </div>

      {/* Spouse & Children Section */}
      {spouses.length > 0 && (
        <div className={`border-b ${isDark ? 'border-zinc-800' : 'border-gray-300'}`}>
          <button
            className={`w-full flex items-center gap-1 px-3 py-1.5 text-xs font-semibold ${isDark ? 'hover:bg-zinc-800/80' : 'hover:bg-gray-100'} transition-colors`}
            style={{ color: isDark ? '#93C5FD' : '#2F3E8F' }}
            onClick={() => setSpouseExpanded(!spouseExpanded)}
          >
            Spouse & Children
            {spouseExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {spouseExpanded && (
            <div className="px-3 pb-2">
              {spouses.map((sg, i) => (
                <div key={i} className="mb-1">
                  {sg.person.personId !== 'single' && (
                    <div
                      className="flex items-center gap-1.5 text-sm cursor-pointer hover:underline truncate"
                      style={{ color: isDark ? '#93C5FD' : '#2F3E8F' }}
                      onClick={() => onPersonClick(sg.person.personId)}
                    >
                      <SmallAvatar person={sg.person} />
                      {[sg.person.firstName, sg.person.lastName].filter(n => n && n !== 'undefined').join(' ')}
                    </div>
                  )}
                  {sg.children.map(child => (
                    <div
                      key={child.personId}
                      className="flex items-center gap-1.5 pl-4 text-sm cursor-pointer hover:underline truncate py-0.5"
                      style={{ color: isDark ? '#E4E4E7' : '#44403c' }}
                      onClick={() => onPersonClick(child.personId)}
                    >
                      <SmallAvatar person={child} />
                      {child.personId === homePersonId && (
                        <Home className="w-3 h-3 flex-shrink-0" style={{ color: isDark ? '#93C5FD' : '#2F3E8F' }} />
                      )}
                      {[child.firstName, child.lastName].filter(n => n && n !== 'undefined').join(' ')}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Siblings Section */}
      {(siblings.length > 0 || halfSiblings.length > 0) && (
        <div className={`border-b ${isDark ? 'border-zinc-800' : 'border-gray-300'}`}>
          <button
            className={`w-full flex items-center gap-1 px-3 py-1.5 text-xs font-semibold ${isDark ? 'hover:bg-zinc-800/80' : 'hover:bg-gray-100'} transition-colors`}
            style={{ color: isDark ? '#93C5FD' : '#2F3E8F' }}
            onClick={() => setSiblingsExpanded(!siblingsExpanded)}
          >
            Siblings
            {siblingsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {siblingsExpanded && (
            <div className="px-3 pb-2">
              {siblings.map(sib => (
                <div
                  key={sib.personId}
                  className="flex items-center gap-1.5 text-sm cursor-pointer hover:underline truncate py-0.5"
                  style={{ color: isDark ? '#E4E4E7' : '#44403c' }}
                  onClick={() => onPersonClick(sib.personId)}
                >
                  <SmallAvatar person={sib} />
                  {[sib.firstName, sib.lastName].filter(n => n && n !== 'undefined').join(' ')}
                </div>
              ))}
              {halfSiblings.length > 0 && (
                <>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-1.5 mb-0.5 font-semibold">
                    Half Siblings
                  </div>
                  {halfSiblings.map(hs => (
                    <div
                      key={hs.personId}
                      className="flex items-center gap-1.5 text-sm cursor-pointer hover:underline truncate py-0.5"
                      style={{ color: isDark ? '#A1A1AA' : '#78716c' }}
                      onClick={() => onPersonClick(hs.personId)}
                    >
                      <SmallAvatar person={hs} />
                      {[hs.firstName, hs.lastName].filter(n => n && n !== 'undefined').join(' ')}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Relative Button */}
      <button
        className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm ${isDark ? 'hover:bg-zinc-800/80' : 'hover:bg-gray-100'} transition-colors`}
        style={{ color: isDark ? '#93C5FD' : '#2F3E8F' }}
        onClick={onAddRelative}
      >
        <Plus className="w-3.5 h-3.5" />
        Add relative
      </button>
    </div>
  );
}
