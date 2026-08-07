/**
 * FeedLanguageSelector — Language preference selector for the Daily Share feed.
 * Allows users to pick preferred languages and toggle strict/soft filtering mode.
 */

import { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import type { FeedPreferences } from '@/services/dailyShareApiService';

interface FeedLanguageSelectorProps {
  preferences: FeedPreferences;
  onUpdate: (prefs: FeedPreferences) => void;
  loading?: boolean;
}

const LANGUAGES = [
  { code: 'hi-IN', label: 'Hindi',     flag: 'HI' },
  { code: 'ta-IN', label: 'Tamil',     flag: 'TA' },
  { code: 'te-IN', label: 'Telugu',    flag: 'TE' },
  { code: 'bn-IN', label: 'Bengali',   flag: 'BN' },
  { code: 'kn-IN', label: 'Kannada',   flag: 'KN' },
  { code: 'ml-IN', label: 'Malayalam',  flag: 'ML' },
  { code: 'mr-IN', label: 'Marathi',   flag: 'MR' },
  { code: 'gu-IN', label: 'Gujarati',  flag: 'GU' },
  { code: 'pa-IN', label: 'Punjabi',   flag: 'PA' },
  { code: 'or-IN', label: 'Odia',      flag: 'OR' },
];

export function FeedLanguageSelector({ preferences, onUpdate, loading }: FeedLanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const toggleLanguage = (code: string) => {
    if (code === 'english') return;
    const current = new Set(preferences.preferredLanguages);
    if (current.has(code)) {
      current.delete(code);
    } else {
      current.add(code);
    }
    onUpdate({ ...preferences, preferredLanguages: Array.from(current) });
  };

  const toggleMode = () => {
    onUpdate({
      ...preferences,
      languageMode: preferences.languageMode === 'strict' ? 'soft' : 'strict',
    });
  };

  const preferredWithoutEnglish = preferences.preferredLanguages.filter(l => l !== 'english');
  const selectedCount = preferredWithoutEnglish.length + 1;
  const selectedLabel = selectedCount === LANGUAGES.length + 1
    ? 'All'
    : selectedCount <= 2
      ? ['EN', ...preferredWithoutEnglish.map(c => LANGUAGES.find(l => l.code === c)?.flag || c)].join(', ')
      : `${selectedCount} languages`;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
          bg-white/80 border border-gray-200 hover:bg-gray-50 transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed"
        title="Language preferences"
      >
        <Globe className="h-3.5 w-3.5 text-gray-500" />
        <span className="text-gray-700">{selectedLabel}</span>
        <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          {/* Mode toggle */}
          <div className="px-3 py-2.5 border-b border-gray-100">
            <button
              onClick={toggleMode}
              className="flex items-center justify-between w-full text-xs"
            >
              <div>
                <span className="font-medium text-gray-700">
                  {preferences.languageMode === 'strict' ? 'Strict mode' : 'Discovery mode'}
                </span>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {preferences.languageMode === 'strict'
                    ? 'Only show posts in selected languages'
                    : 'Show all posts, prioritize selected'}
                </p>
              </div>
              <div className={`relative w-8 h-4.5 rounded-full transition-colors ${
                preferences.languageMode === 'strict' ? 'bg-[#2F3E8F]' : 'bg-gray-300'
              }`}>
                <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${
                  preferences.languageMode === 'strict' ? 'translate-x-4' : 'translate-x-0.5'
                }`} />
              </div>
            </button>
          </div>

          {/* Language list */}
          <div className="max-h-56 overflow-y-auto py-1">
            {/* English (always checked, disabled) */}
            <div className="flex items-center justify-between w-full px-3 py-2 text-xs text-gray-900 font-medium opacity-80 cursor-default">
              <span>English</span>
              <Check className="h-3.5 w-3.5 text-[#2F3E8F]" />
            </div>

            {LANGUAGES.map(lang => {
              const selected = preferences.preferredLanguages.includes(lang.code);
              return (
                <button
                  key={lang.code}
                  onClick={() => toggleLanguage(lang.code)}
                  className="flex items-center justify-between w-full px-3 py-2 hover:bg-gray-50 transition-colors"
                >
                  <span className={`text-xs ${selected ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                    {lang.label}
                  </span>
                  {selected && <Check className="h-3.5 w-3.5 text-[#2F3E8F]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
