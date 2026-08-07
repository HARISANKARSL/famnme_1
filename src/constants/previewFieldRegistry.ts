/**
 * Preview Field Registry — defines configurable fields for the node hover preview card.
 *
 * Each entry maps a field key to a label, icon name, and a getValue function
 * that extracts the display value from a Person object.
 * Returns null when the field has no data (hidden dynamically).
 */

import type { Person } from '@/types';
import type { RelationshipLabelEntry } from '@/services/relationshipLabelService';

export interface PreviewFieldExtras {
  relationshipLabel?: RelationshipLabelEntry;
  locale?: string;
}

export interface PreviewFieldConfig {
  key: string;
  label: string;
  icon: string; // lucide-react icon name
  getValue: (person: Person, extras?: PreviewFieldExtras) => string | null;
}

function formatDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr; // fallback to raw string
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    return `${dd}-${mm}-${yyyy}`;
  } catch {
    return dateStr;
  }
}

function trimOrNull(val: string | null | undefined): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export const PREVIEW_FIELD_REGISTRY: PreviewFieldConfig[] = [
  {
    key: 'dateOfBirth',
    label: 'Date of Birth',
    icon: 'Calendar',
    getValue: (p) => formatDate(p.birthDate),
  },
  {
    key: 'dateOfDeath',
    label: 'Date of Death',
    icon: 'CalendarX',
    getValue: (p) => formatDate(p.deathDate),
  },
  {
    key: 'birthPlace',
    label: 'Birth Place',
    icon: 'MapPin',
    getValue: (p) => trimOrNull(p.birthPlace),
  },
  {
    key: 'deathPlace',
    label: 'Death Place',
    icon: 'MapPinOff',
    getValue: (p) => trimOrNull(p.deathPlace),
  },
  {
    key: 'occupation',
    label: 'Occupation',
    icon: 'Briefcase',
    getValue: (p) => trimOrNull(p.occupation),
  },
  {
    key: 'education',
    label: 'Education',
    icon: 'GraduationCap',
    getValue: (p) => trimOrNull(p.education),
  },
  {
    key: 'gotra',
    label: 'Gotra',
    icon: 'Scroll',
    getValue: (p) => trimOrNull(p.gotra),
  },
  {
    key: 'caste',
    label: 'Caste',
    icon: 'Users',
    getValue: (p) => trimOrNull(p.caste),
  },
  {
    key: 'religion',
    label: 'Religion',
    icon: 'Heart',
    getValue: (p) => trimOrNull(p.religion),
  },
  {
    key: 'nativePlace',
    label: 'Native Place',
    icon: 'Home',
    getValue: (p) => trimOrNull(p.nativePlace),
  },
  {
    key: 'nativeLanguage',
    label: 'Native Language',
    icon: 'Languages',
    getValue: (p) => trimOrNull(p.nativeLanguage),
  },
  {
    key: 'nationality',
    label: 'Nationality',
    icon: 'Flag',
    getValue: (p) => trimOrNull(p.nationality),
  },
];

/** Map for O(1) lookup by key */
export const PREVIEW_FIELD_MAP = new Map(
  PREVIEW_FIELD_REGISTRY.map(f => [f.key, f])
);

/** Default field selection */
export const DEFAULT_PREVIEW_FIELDS = ['dateOfBirth', 'occupation', 'birthPlace', 'gotra'];
