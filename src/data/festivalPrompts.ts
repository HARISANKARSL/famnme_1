/**
 * Festival Prompts — backward-compatible re-export from src/data/festivals/.
 *
 * All festival data now lives in src/data/festivals/ (split by religion).
 * Religion detection logic lives in src/services/religionDetectionService.ts.
 */

export type { FestivalPromptBundle, FestivalPrompt } from './festivals/types';
export { ALL_FESTIVALS as FESTIVAL_PROMPT_BUNDLES } from './festivals';
export { getActiveFestivalBundle, getFestivalsByReligion } from './festivals';
export {
  inferReligionFromSurname,
  detectPersonReligion,
  detectFamilyReligion,
} from '@/services/religionDetectionService';
