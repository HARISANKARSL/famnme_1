import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import { isRTLLocale } from './data/kinship';

// Lazy-load other languages to keep bundle small
const loadLanguage = async (lang: string) => {
  switch (lang) {
    case 'hi-IN': return (await import('./locales/hi-IN.json')).default;
    case 'ta-IN': return (await import('./locales/ta-IN.json')).default;
    case 'te-IN': return (await import('./locales/te-IN.json')).default;
    case 'bn-IN': return (await import('./locales/bn-IN.json')).default;
    case 'kn-IN': return (await import('./locales/kn-IN.json')).default;
    case 'ml-IN': return (await import('./locales/ml-IN.json')).default;
    case 'mr-IN': return (await import('./locales/mr-IN.json')).default;
    case 'gu-IN': return (await import('./locales/gu-IN.json')).default;
    case 'pa-IN': return (await import('./locales/pa-IN.json')).default;
    case 'ur-IN': return (await import('./locales/ur-IN.json')).default;
    default: return en;
  }
};

/** Sync the <html> element direction + lang to the active locale. */
function applyDocumentLang(lang: string) {
  try {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRTLLocale(lang) ? 'rtl' : 'ltr';
  } catch { /* noop */ }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: 'familytree-locale',
      caches: ['localStorage'],
    },
  });

// Load non-English language on demand
export async function changeLanguage(lang: string) {
  if (lang === 'en') {
    await i18n.changeLanguage('en');
    applyDocumentLang('en');
    return;
  }
  if (!i18n.hasResourceBundle(lang, 'translation')) {
    const resources = await loadLanguage(lang);
    i18n.addResourceBundle(lang, 'translation', resources, true, true);
  }
  await i18n.changeLanguage(lang);
  localStorage.setItem('familytree-locale', lang);
  applyDocumentLang(lang);
}

// Auto-load saved language on startup
const savedLang = localStorage.getItem('familytree-locale') || 'hi-IN';
if (savedLang !== 'en') {
  changeLanguage(savedLang);
}

export default i18n;
