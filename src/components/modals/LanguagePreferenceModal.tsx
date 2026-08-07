/**
 * LanguagePreferenceModal — Onboarding-style language preference selector.
 *
 * Shown when a user hasn't set feed language preferences yet.
 * Follows the ConversationalWizard design language: warm tones, card-based
 * selection, generous touch targets, mobile bottom-sheet support.
 */

import { useState } from 'react';
import { Globe, Check, Filter, X } from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';
import {
  Dialog,
  ResponsiveDialogContent as DialogContent,
} from '@/components/ui/dialog';

interface LanguagePreferenceModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (preferredLanguages: string[], languageMode: 'strict' | 'soft') => void;
  initialLanguages?: string[];
  initialMode?: 'strict' | 'soft';
}

const LANGUAGES = [
  { code: 'hi-IN', label: 'Hindi',      nativeName: 'हिन्दी',      region: 'North India' },
  { code: 'ta-IN', label: 'Tamil',      nativeName: 'தமிழ்',       region: 'South India' },
  { code: 'te-IN', label: 'Telugu',     nativeName: 'తెలుగు',      region: 'South India' },
  { code: 'bn-IN', label: 'Bengali',    nativeName: 'বাংলা',       region: 'East India' },
  { code: 'kn-IN', label: 'Kannada',    nativeName: 'ಕನ್ನಡ',       region: 'South India' },
  { code: 'ml-IN', label: 'Malayalam',   nativeName: 'മലയാളം',     region: 'South India' },
  { code: 'mr-IN', label: 'Marathi',    nativeName: 'मराठी',       region: 'West India' },
  { code: 'gu-IN', label: 'Gujarati',   nativeName: 'ગુજરાતી',     region: 'West India' },
];

export function LanguagePreferenceModal({
  open,
  onClose,
  onSave,
  initialLanguages = ['hi-IN'],
  initialMode = 'soft',
}: LanguagePreferenceModalProps) {
  const { isMobile } = useResponsive();
  const [selected, setSelected] = useState<Set<string>>(() => {
    const set = new Set(initialLanguages || []);
    set.add('english');
    return set;
  });
  const [mode, setMode] = useState<'strict' | 'soft'>(initialMode);

  const toggleLang = (code: string) => {
    if (code === 'english') return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const handleSave = () => {
    onSave(Array.from(selected), mode);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="sm:max-w-[440px] p-0 gap-0 overflow-hidden [&>button.absolute]:hidden"
        mobileTitle="Choose Your Languages"
      >
        <div className={isMobile ? '' : 'max-h-[85dvh] overflow-y-auto'}>

          {/* ── Header ── */}
          <div className={`
            sticky top-0 z-10
            ${isMobile
              ? 'px-4 pt-2 pb-2'
              : 'px-6 pt-7 pb-5 bg-gradient-to-b from-[#F6F2EA]/60 to-white dark:from-[#1a1714]/60 dark:to-[#1a1a1a]'
            }
          `}>
            {/* Desktop: full header with icon + title + close button */}
            {!isMobile && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-[#2F3E8F]/10 flex items-center justify-center flex-shrink-0">
                    <Globe className="h-5 w-5 text-[#2F3E8F]" />
                  </div>
                  <div>
                    <h2
                      className="text-xl font-bold text-[#3D2E1F] dark:text-[#F3F2F1]"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      Choose Your Languages
                    </h2>
                    <p className="text-[13px] text-[#8B7355] dark:text-[#A19F9D] mt-0.5">
                      Pick the languages you speak or read
                    </p>
                  </div>
                </div>
                {/* Close button — always visible, not behind scroll */}
                <button
                  onClick={onClose}
                  className="h-8 w-8 rounded-lg flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all text-[#8B7355] dark:text-[#999] flex-shrink-0"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
            )}

            {/* Mobile: just subtitle (BottomSheet has drag handle + title + close via swipe) */}
            {isMobile && (
              <div className="flex items-center justify-between">
                <p className="text-[13px] text-[#8B7355] dark:text-[#A19F9D]">
                  Pick the languages you speak or read
                </p>
                <button
                  onClick={onClose}
                  className="h-9 w-9 -mr-1 rounded-lg flex items-center justify-center text-[#8B7355] hover:bg-black/[0.04] transition-all"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
            )}
          </div>

          {/* ── Language cards ── */}
          <div className="px-4 sm:px-5 pb-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#B8A090] dark:text-[#888] mb-2.5 px-1">
              Select one or more
            </p>
            {/* Default language notification */}
            <div className="mb-3.5 px-3.5 py-2.5 bg-blue-50/60 dark:bg-blue-950/15 border border-blue-100/60 dark:border-blue-900/40 rounded-xl text-[11px] text-blue-600 dark:text-[#8FA4FF] flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span>English is set as your default language and is always enabled.</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {/* English (always checked, disabled for interaction) */}
              <div
                className="
                  flex items-center justify-between
                  w-full min-h-[52px] px-4 py-3
                  rounded-xl border-2 text-left
                  border-[#2F3E8F] bg-[#E8EDFF] dark:bg-[#2F3E8F]/20 dark:border-[#2F3E8F]
                  select-none cursor-default opacity-85
                "
              >
                <div className="flex items-baseline gap-2.5 min-w-0">
                  <span className="text-sm sm:text-[15px] font-semibold text-[#2F3E8F] dark:text-[#8FA4FF]">
                    English
                  </span>
                  <span className="text-sm text-[#2F3E8F]/70 dark:text-[#8FA4FF]/70">
                    English (Default Language)
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className="text-[10px] text-[#B8A090] dark:text-[#777] hidden sm:inline">
                    International
                  </span>
                  <div className="h-[22px] w-[22px] rounded-full flex items-center justify-center flex-shrink-0 bg-[#2F3E8F] scale-100">
                    <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                  </div>
                </div>
              </div>

              {LANGUAGES.map(lang => {
                const isSelected = selected.has(lang.code);
                return (
                  <button
                    key={lang.code}
                    onClick={() => toggleLang(lang.code)}
                    className={`
                      flex items-center justify-between
                      w-full min-h-[52px] px-4 py-3
                      rounded-xl border-2 text-left
                      transition-all active:scale-[0.98]
                      ${isSelected
                        ? 'border-[#2F3E8F] bg-[#E8EDFF] dark:bg-[#2F3E8F]/20 dark:border-[#2F3E8F]'
                        : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-[#1E1E1E] hover:border-stone-300 dark:hover:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-800/40'
                      }
                    `}
                  >
                    <div className="flex items-baseline gap-2.5 min-w-0">
                      <span className={`text-sm sm:text-[15px] font-semibold ${
                        isSelected ? 'text-[#2F3E8F] dark:text-[#8FA4FF]' : 'text-[#3D2E1F] dark:text-[#F3F2F1]'
                      }`}>
                        {lang.label}
                      </span>
                      <span className={`text-sm ${
                        isSelected ? 'text-[#2F3E8F]/70 dark:text-[#8FA4FF]/70' : 'text-[#8B7355] dark:text-[#A19F9D]'
                      }`}>
                        {lang.nativeName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className="text-[10px] text-[#B8A090] dark:text-[#777] hidden sm:inline">
                        {lang.region}
                      </span>
                      <div className={`
                        h-[22px] w-[22px] rounded-full flex items-center justify-center flex-shrink-0 transition-all
                        ${isSelected
                          ? 'bg-[#2F3E8F] scale-100'
                          : 'bg-stone-100 dark:bg-stone-700 scale-90'
                        }
                      `}>
                        {isSelected && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Feed mode ── */}
          <div className="px-4 sm:px-5 pt-3 pb-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#B8A090] dark:text-[#888] mb-2.5 px-1">
              Feed mode
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Discovery */}
              <button
                onClick={() => setMode('soft')}
                className={`
                  relative px-3.5 py-3 sm:py-3.5 rounded-xl border-2 text-left transition-all active:scale-[0.98]
                  ${mode === 'soft'
                    ? 'border-[#2F3E8F] bg-[#E8EDFF] dark:bg-[#2F3E8F]/20'
                    : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-[#1E1E1E] hover:border-stone-300'
                  }
                `}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Globe className={`h-4 w-4 ${mode === 'soft' ? 'text-[#2F3E8F]' : 'text-stone-400'}`} />
                  <span className={`text-[13px] font-semibold ${
                    mode === 'soft' ? 'text-[#2F3E8F] dark:text-[#8FA4FF]' : 'text-stone-600 dark:text-stone-300'
                  }`}>
                    Discovery
                  </span>
                </div>
                <p className="text-[11px] text-[#8B7355] dark:text-[#A19F9D] leading-snug">
                  All posts, your languages first
                </p>
                {mode === 'soft' && (
                  <div className="absolute top-2 right-2 h-4 w-4 rounded-full bg-[#2F3E8F] flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                  </div>
                )}
              </button>

              {/* Strict */}
              <button
                onClick={() => setMode('strict')}
                className={`
                  relative px-3.5 py-3 sm:py-3.5 rounded-xl border-2 text-left transition-all active:scale-[0.98]
                  ${mode === 'strict'
                    ? 'border-[#C2A46D] bg-[#C2A46D]/10 dark:bg-[#C2A46D]/15'
                    : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-[#1E1E1E] hover:border-stone-300'
                  }
                `}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Filter className={`h-4 w-4 ${mode === 'strict' ? 'text-[#C2A46D]' : 'text-stone-400'}`} />
                  <span className={`text-[13px] font-semibold ${
                    mode === 'strict' ? 'text-[#8B6914] dark:text-[#D4B778]' : 'text-stone-600 dark:text-stone-300'
                  }`}>
                    Strict
                  </span>
                </div>
                <p className="text-[11px] text-[#8B7355] dark:text-[#A19F9D] leading-snug">
                  Only my selected languages
                </p>
                {mode === 'strict' && (
                  <div className="absolute top-2 right-2 h-4 w-4 rounded-full bg-[#C2A46D] flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="px-4 sm:px-5 pt-4 pb-5 sm:pb-6 flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3"
            style={isMobile ? { paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' } : undefined}
          >
            <button
              onClick={handleSave}
              disabled={selected.size === 0}
              className="
                w-full sm:flex-1 min-h-[48px] sm:min-h-[44px]
                rounded-xl bg-[#2F3E8F] text-white
                text-sm font-semibold
                hover:bg-[#3B4DA6] active:scale-[0.98]
                transition-all
                disabled:opacity-40 disabled:cursor-not-allowed
              "
            >
              Save Preferences
            </button>
            <button
              onClick={onClose}
              className="
                w-full sm:w-auto
                min-h-[44px] px-5
                rounded-xl
                text-[13px] font-medium text-stone-500 dark:text-stone-400
                hover:text-stone-700 dark:hover:text-stone-200
                hover:bg-stone-100 dark:hover:bg-stone-800
                transition-all
              "
            >
              Skip for now
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
