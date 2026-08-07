import type { Person } from '@/types';

import { resolveBackendUrl } from '@/config/api';

/**
 * Get the most appropriate photo URL for a person.
 * Prioritizes:
 * 1. photoThumbUrl (pre-signed thumb from storage)
 * 2. profilePhotoUrl (original upload)
 * 
 * Falls back to null if no photo is available.
 */
export function getPersonPhotoUrl(person: Partial<Person>): string | null {
  if (person.photoThumbUrl) {
    return resolveBackendUrl(person.photoThumbUrl);
  }
  if (person.profilePhotoUrl) {
    return resolveBackendUrl(person.profilePhotoUrl);
  }
  if (person.photoUrl) {
    return resolveBackendUrl(person.photoUrl);
  }
  return null;
}


/**
 * Get the default avatar based on gender.
 */
export function getDefaultAvatar(gender?: string | null): string {
  const basePath = import.meta.env.BASE_URL || '/';
  if (gender === 'male') return `${basePath}male.png`;
  if (gender === 'female') return `${basePath}female.png`;
  return `${basePath}avatar-default.svg`;
}
