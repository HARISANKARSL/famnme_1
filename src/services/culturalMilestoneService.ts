/**
 * Cultural Milestone Service
 *
 * Deterministic milestone calculator based on DOB + religion + gender.
 */

import { CULTURAL_MILESTONES, type CulturalMilestone } from '@/data/culturalMilestones';

export interface SuggestedMilestone {
  milestone: CulturalMilestone;
  suggestedDate: string; // ISO date string
  isPast: boolean;
}

export function getSuggestedMilestones(
  birthDate: string | undefined | null,
  religion: string | undefined | null,
  gender: string | undefined | null
): SuggestedMilestone[] {
  if (!birthDate || !religion) return [];

  const bd = new Date(birthDate);
  if (isNaN(bd.getTime())) return [];

  const now = new Date();
  const normalizedGender = gender?.toLowerCase() as 'male' | 'female' | undefined;

  return CULTURAL_MILESTONES
    .filter(m => {
      if (m.religion !== religion) return false;
      if (m.gender && m.gender !== 'any' && m.gender !== normalizedGender) return false;
      return true;
    })
    .map(m => {
      let suggestedDate: Date;
      if (m.ageInDays != null) {
        suggestedDate = new Date(bd);
        suggestedDate.setDate(suggestedDate.getDate() + m.ageInDays);
      } else if (m.ageInYears != null) {
        suggestedDate = new Date(bd);
        suggestedDate.setFullYear(suggestedDate.getFullYear() + m.ageInYears);
      } else {
        return null;
      }
      return {
        milestone: m,
        suggestedDate: suggestedDate.toISOString().split('T')[0],
        isPast: suggestedDate < now,
      };
    })
    .filter((m): m is SuggestedMilestone => m !== null)
    .sort((a, b) => a.suggestedDate.localeCompare(b.suggestedDate));
}
