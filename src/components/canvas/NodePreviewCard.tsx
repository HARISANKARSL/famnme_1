/**
 * NodePreviewCard — floating preview card shown on hover (desktop) or tap (mobile).
 *
 * Renders via portal to document.body at a fixed screen position.
 * Shows person name (always) + up to 4 configurable fields.
 * Missing data fields are hidden dynamically.
 */

import { memo, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar, CalendarX2, MapPin, MapPinOff, Briefcase, GraduationCap,
  Scroll, Users, Heart, Home, Languages, Flag, GitBranch, X,
} from 'lucide-react';
import { PREVIEW_FIELD_MAP, type PreviewFieldExtras } from '@/constants/previewFieldRegistry';
import { resolveBackendUrl } from '@/config/api';
import { BottomSheet } from '@/components/ui/BottomSheet';
import type { Person } from '@/types';
import type { RelationshipLabelEntry } from '@/services/relationshipLabelService';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Calendar, CalendarX: CalendarX2, MapPin, MapPinOff, Briefcase, GraduationCap,
  Scroll, Users, Heart, Home, Languages, Flag, GitBranch,
};

interface NodePreviewCardProps {
  person: Person;
  position: { top: number; left: number };
  previewFields: string[];
  relationshipLabel?: RelationshipLabelEntry;
  locale?: string;
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  isMobile: boolean;
}

function getGenderBorderColor(person: Person): string {
  if (person.isHomePerson) return '#C2A46D'; // gold
  if (person.gender === 'male') return '#60a5fa';
  if (person.gender === 'female') return '#f472b6';
  return '#d1d5db';
}

function getPhotoUrl(person: Person): string | null {
  if (!person.profilePhotoUrl) return null;
  if (person.profilePhotoUrl.startsWith('http')) return person.profilePhotoUrl;
  return resolveBackendUrl(person.profilePhotoUrl);
}

function PreviewContent({
  person,
  previewFields,
  relationshipLabel,
  locale,
}: {
  person: Person;
  previewFields: string[];
  relationshipLabel?: RelationshipLabelEntry;
  locale?: string;
}) {
  const extras: PreviewFieldExtras = { relationshipLabel, locale };
  const fullName = [person.firstName, person.lastName].filter(name => name && name !== 'undefined').join(' ');
  const photoUrl = getPhotoUrl(person);
  const borderColor = getGenderBorderColor(person);

  // Resolve fields: only show ones with data
  const resolvedFields: Array<{ key: string; label: string; value: string; iconName: string }> = [];
  for (const fieldKey of previewFields) {
    const config = PREVIEW_FIELD_MAP.get(fieldKey);
    if (!config) continue;
    const value = config.getValue(person, extras);
    if (value) {
      resolvedFields.push({ key: fieldKey, label: config.label, value, iconName: config.icon });
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* Header: photo + name */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-100"
          style={{ border: `2px solid ${borderColor}` }}
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={fullName}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-medium">
              {person.firstName.charAt(0)}{person.lastName?.charAt(0) || ''}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
            {fullName}
          </p>
          {person.isLiving === false && (
            <span className="text-[10px] text-gray-400 font-medium">Deceased</span>
          )}
        </div>
      </div>

      {/* Configurable fields */}
      {resolvedFields.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-1 border-t border-gray-100">
          {resolvedFields.map(({ key, label, value, iconName }) => {
            const IconComp = ICON_MAP[iconName];
            return (
              <div key={key} className="flex items-start gap-2 text-xs">
                {IconComp && (
                  <IconComp className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <span className="text-gray-400 text-[10px] uppercase tracking-wide">{label}</span>
                  <p className="text-gray-700 leading-tight truncate">{value}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NodePreviewCardInner({
  person,
  position,
  previewFields,
  relationshipLabel,
  locale,
  onClose,
  onMouseEnter,
  onMouseLeave,
  isMobile,
}: NodePreviewCardProps) {
  const [visible, setVisible] = useState(false);
  const borderColor = getGenderBorderColor(person);

  // Animate in
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Mobile: use BottomSheet
  if (isMobile) {
    return (
      <BottomSheet open={true} onClose={onClose} title="Person Details">
        <div className="px-4 pb-4">
          <PreviewContent
            person={person}
            previewFields={previewFields}
            relationshipLabel={relationshipLabel}
            locale={locale}
          />
        </div>
      </BottomSheet>
    );
  }

  // Desktop: floating card via portal
  return createPortal(
    <div
      className="fixed z-[9999] pointer-events-auto"
      style={{
        top: position.top,
        left: position.left,
        width: 260,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(4px)',
        transition: 'opacity 150ms ease-out, transform 150ms ease-out',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-3.5 relative"
        style={{
          borderLeft: `3px solid ${borderColor}`,
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Close preview"
        >
          <X className="w-3 h-3" />
        </button>

        <PreviewContent
          person={person}
          previewFields={previewFields}
          relationshipLabel={relationshipLabel}
          locale={locale}
        />
      </div>
    </div>,
    document.body,
  );
}

export const NodePreviewCard = memo(NodePreviewCardInner, (prev, next) => {
  return (
    prev.person.personId === next.person.personId &&
    prev.person.updatedAt === next.person.updatedAt &&
    prev.position.top === next.position.top &&
    prev.position.left === next.position.left &&
    prev.previewFields === next.previewFields &&
    prev.isMobile === next.isMobile
  );
});
