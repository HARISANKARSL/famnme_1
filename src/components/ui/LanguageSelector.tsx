/**
 * LanguageSelector - Dropdown for selecting app + kinship term language
 */

import { useState, useRef, useEffect } from 'react';
import { Languages, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES } from '@/data/kinship';
import { useTreeStore } from '@/store/treeStore';
import { changeLanguage } from '@/i18n';

export function LanguageSelector() {
  const { locale, setLocale } = useTreeStore();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentLocale = SUPPORTED_LOCALES.find(l => l.code === locale) || SUPPORTED_LOCALES.find(l => l.code !== 'en') || SUPPORTED_LOCALES[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLocaleChange = async (code: string) => {
    setLocale(code); // kinship terms
    await changeLanguage(code); // i18next UI strings
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-[#E8D5C4] transition-colors text-gray-700 text-sm"
        title={t('language.appLanguage')}
      >
        <Languages className="w-4 h-4" />
        <span className="hidden sm:inline font-medium">{currentLocale.nativeName}</span>
        <ChevronDown className="w-3 h-3 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
          <div className="px-3 py-1.5 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase">{t('language.appLanguage')}</p>
          </div>
          {SUPPORTED_LOCALES.filter(loc => loc.code !== 'en').map((loc) => (
            <button
              key={loc.code}
              onClick={() => handleLocaleChange(loc.code)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                locale === loc.code ? 'bg-[#E8EDFF] text-[#25327A] font-medium' : 'text-gray-700'
              }`}
            >
              <span>{loc.nativeName}</span>
              <span className="text-xs text-gray-400">{loc.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
