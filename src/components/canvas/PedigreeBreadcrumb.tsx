/**
 * PedigreeBreadcrumb - Bottom navigation trail matching Ancestry.com style
 */

import { memo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { resolveBackendUrl } from '@/config/api';
import type { Person } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';

interface BreadcrumbEntry {
  personId: string;
  name: string;
  person?: Person;
}

interface PedigreeBreadcrumbProps {
  trail: BreadcrumbEntry[];
  onNavigate: (personId: string) => void;
}

function getFallbackAvatar(gender?: string) {
  return gender === 'female' ? '/avatar-female.svg' : '/avatar-male.svg';
}

const BreadcrumbAvatar = memo(function BreadcrumbAvatar({ person }: { person?: Person }) {
  if (!person) return null;
  const photoSrc = person.profilePhotoUrl
    ? resolveBackendUrl(person.profilePhotoUrl)
    : getFallbackAvatar(person.gender);
  const [src, setSrc] = useState(photoSrc);
  const [errored, setErrored] = useState(false);

  return (
    <img
      src={src}
      alt=""
      className="w-6 h-6 rounded-full object-cover flex-shrink-0"
      loading="lazy"
      onError={() => {
        if (!errored) {
          setErrored(true);
          setSrc(getFallbackAvatar(person.gender));
        }
      }}
    />
  );
});

export function PedigreeBreadcrumb({ trail, onNavigate }: PedigreeBreadcrumbProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  if (trail.length <= 1) return null;

  return (
    <div
      className="absolute bottom-4 left-4 z-30 rounded-lg shadow-lg px-3 py-2 flex items-center gap-1.5 text-sm max-w-[80vw] overflow-x-auto"
      style={{
        backgroundColor: isDark ? '#242424' : '#ffffff',
        border: isDark ? '1px solid #3f3f46' : '1px solid #e5e0db',
        boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.08)'
      }}
    >
      {trail.map((entry, i) => (
        <span key={entry.personId} className="flex items-center gap-1.5 flex-shrink-0">
          {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
          <BreadcrumbAvatar person={entry.person} />
          {i < trail.length - 1 ? (
            <button
              className="hover:underline font-medium"
              style={{ color: isDark ? '#93C5FD' : '#2F3E8F' }}
              onClick={() => onNavigate(entry.personId)}
            >
              {entry.name}
            </button>
          ) : (
            <span className="text-slate-800 dark:text-zinc-100 font-semibold">{entry.name}</span>
          )}
        </span>
      ))}
    </div>
  );
}
