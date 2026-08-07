/**
 * Kinship Term Registry
 *
 * Provides locale-aware kinship patterns and group labels.
 * Uses lazy loading to only import the patterns for the selected locale.
 */

import type { KinshipPattern, GroupLabelSet, LocaleConfig } from './types';

export type { KinshipPattern, KinshipTerm, GroupLabelSet, LocaleConfig } from './types';

export const SUPPORTED_LOCALES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'ur-IN', name: 'Urdu', nativeName: 'اُردُو' },
] as const;

/** Locales that need right-to-left rendering. */
export const RTL_LOCALES: ReadonlySet<string> = new Set(['ur-IN'])
export function isRTLLocale(code: string | undefined | null): boolean {
  return !!code && RTL_LOCALES.has(code)
}

const localeCache = new Map<string, LocaleConfig>();

/** English locale config — no kinship patterns needed; labels use englishLabel directly */
const ENGLISH_CONFIG: LocaleConfig = {
  code: 'en',
  name: 'English',
  nativeName: 'English',
  patterns: [],
  groupLabels: {
    childrenGroupLabels: {},
    parentPairLabels: {},
  },
};

async function loadLocale(code: string): Promise<LocaleConfig> {
  const cached = localeCache.get(code);
  if (cached) return cached;

  let config: LocaleConfig;
  switch (code) {
    case 'en': config = ENGLISH_CONFIG; break;
    case 'hi-IN': config = (await import('./hi-IN')).hiIN; break;
    case 'ta-IN': config = (await import('./ta-IN')).taIN; break;
    case 'te-IN': config = (await import('./te-IN')).teIN; break;
    case 'bn-IN': config = (await import('./bn-IN')).bnIN; break;
    case 'kn-IN': config = (await import('./kn-IN')).knIN; break;
    case 'ml-IN': config = (await import('./ml-IN')).mlIN; break;
    case 'mr-IN': config = (await import('./mr-IN')).mrIN; break;
    case 'gu-IN': config = (await import('./gu-IN')).guIN; break;
    default: config = ENGLISH_CONFIG; break;
  }

  localeCache.set(code, config);
  return config;
}

export async function getKinshipPatterns(locale: string): Promise<KinshipPattern[]> {
  const config = await loadLocale(locale);
  return config.patterns;
}

export async function getGroupLabels(locale: string): Promise<GroupLabelSet> {
  const config = await loadLocale(locale);
  return config.groupLabels;
}

export async function getLocaleConfig(locale: string): Promise<LocaleConfig> {
  return loadLocale(locale);
}
