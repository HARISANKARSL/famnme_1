/**
 * Festival Registry — aggregates all religion-specific festival files
 * and provides the getActiveFestivalBundle() search function.
 */

import type { FestivalPromptBundle } from './types';
import { HINDU_FESTIVALS } from './hindu';
import { MUSLIM_FESTIVALS } from './muslim';
import { CHRISTIAN_FESTIVALS } from './christian';
import { SIKH_FESTIVALS } from './sikh';
import { JAIN_FESTIVALS } from './jain';
import { BUDDHIST_FESTIVALS } from './buddhist';
import { PARSI_FESTIVALS } from './parsi';
import { REGIONAL_FESTIVALS } from './regional';

export type { FestivalPromptBundle, FestivalPrompt } from './types';

/** All festivals across all religions */
export const ALL_FESTIVALS: FestivalPromptBundle[] = [
  ...HINDU_FESTIVALS,
  ...MUSLIM_FESTIVALS,
  ...CHRISTIAN_FESTIVALS,
  ...SIKH_FESTIVALS,
  ...JAIN_FESTIVALS,
  ...BUDDHIST_FESTIVALS,
  ...PARSI_FESTIVALS,
  ...REGIONAL_FESTIVALS,
];

/**
 * Get active festival bundle for today, filtered by religion.
 * - If religion is provided: only show festivals matching that religion
 * - If no religion: show any active festival (fallback)
 * - Returns null if no active festival today
 */
export function getActiveFestivalBundle(religion?: string | null): FestivalPromptBundle | null {
  const now = new Date();
  const mmdd = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const activeFestivals = ALL_FESTIVALS.filter(f => f.dates.includes(mmdd));
  if (activeFestivals.length === 0) return null;

  if (!religion) return activeFestivals[0];

  const religionLower = religion.toLowerCase();
  const matching = activeFestivals.filter(f =>
    f.religions.some(r => r.toLowerCase() === religionLower)
  );

  return matching.length > 0 ? matching[0] : null;
}

/**
 * Get all festivals for a specific religion (regardless of date).
 */
export function getFestivalsByReligion(religion: string): FestivalPromptBundle[] {
  const religionLower = religion.toLowerCase();
  return ALL_FESTIVALS.filter(f =>
    f.religions.some(r => r.toLowerCase() === religionLower)
  );
}
