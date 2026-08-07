/**
 * PedigreeAncestorCard - Compact ancestor card matching Ancestry.com dark style
 * Memoized to prevent re-renders during pan/zoom.
 */

import { memo, useState } from 'react';
import type { Person } from '@/types';
import { getPersonPhotoUrl, getDefaultAvatar } from '@/utils/personPhotoUtils';
import { useTheme } from '@/contexts/ThemeContext';


interface PedigreeAncestorCardProps {
  person: Person;
  x: number;
  y: number;
  width: number;
  height: number;
  onClick: (personId: string) => void;
}

function formatYear(dateStr?: string | null): string {
  if (!dateStr) return '';
  const match = dateStr.match(/\d{4}/);
  return match ? match[0] : '';
}

function getLifespan(person: Person): string {
  const birth = formatYear(person.birthDate);
  if (!birth) return '';
  if (person.isLiving) return `${birth} - Living`;
  const death = formatYear(person.deathDate);
  return death ? `${birth} - ${death}` : birth;
}


export const PedigreeAncestorCard = memo(function PedigreeAncestorCard({
  person, x, y, width, height, onClick,
}: PedigreeAncestorCardProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const photoSrc = getPersonPhotoUrl(person) || getDefaultAvatar(person.gender);

  const [imgSrc, setImgSrc] = useState(photoSrc);
  const [imgErrored, setImgErrored] = useState(false);


  const borderLeft = person.gender === 'female' ? '#f9a8d4' : '#94a3b8';

  const hasPhoto = !!person.photoThumbUrl || !!person.profilePhotoUrl || !!person.photoUrl;

  return (
    <div
      className="absolute cursor-pointer rounded-lg shadow-sm flex items-center gap-2.5 px-3 pedigree-node"
      style={{
        left: x,
        top: y,
        width,
        height,
        backgroundColor: isDark ? '#242424' : '#ffffff',
        border: isDark ? '1.5px solid #3f3f46' : '1.5px solid #e5e0db',
        borderLeft: `4px solid ${borderLeft}`,
        transition: 'left 0.5s ease, top 0.5s ease, box-shadow 0.2s ease, transform 0.2s ease',
      }}
      onClick={() => onClick(person.personId)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.03)';
        e.currentTarget.style.boxShadow = isDark ? '0 4px 14px rgba(0,0,0,0.5)' : '0 4px 14px rgba(0,0,0,0.1)';
        e.currentTarget.style.zIndex = '10';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '';
        e.currentTarget.style.zIndex = '';
      }}
    >
      <img
        src={imgSrc}
        alt={person.firstName}
        className={`w-8 h-8 rounded-full object-cover flex-shrink-0 border border-gray-200 dark:border-zinc-700 ${(!hasPhoto || imgErrored) ? 'dark:invert dark:brightness-150' : ''}`}
        loading="lazy"
        onError={() => {
          if (!imgErrored) {
            setImgErrored(true);
            setImgSrc(getDefaultAvatar(person.gender));

          }
        }}
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-800 dark:text-zinc-100 truncate leading-tight">
          {[person.firstName, person.lastName].filter(n => n && n !== 'undefined').join(' ')}
        </div>
        <div className="text-xs text-gray-500 dark:text-zinc-400 truncate leading-tight">
          {getLifespan(person)}
        </div>
      </div>
    </div>
  );
});
