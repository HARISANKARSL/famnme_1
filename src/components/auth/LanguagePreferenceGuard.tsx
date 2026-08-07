import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_BASE_URL } from '@/config/api';
import { userApi } from '@/api/endpoints';
import { Check, Globe, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getUserTrees } from '@/services/neo4jDataService';

// Major Indian languages list with full lowercase codes matching the backend names
const INDIAN_LANGUAGES = [
  { code: 'hindi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'bengali', name: 'Bengali', native: 'বাংলা' },
  { code: 'telugu', name: 'Telugu', native: 'తెలుగు' },
  { code: 'marathi', name: 'Marathi', native: 'ਮਰਾਠੀ' },
  { code: 'tamil', name: 'Tamil', native: 'தமிழ்' },
  { code: 'gujarati', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'kannada', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'malayalam', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'odia', name: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'punjabi', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'urdu', name: 'Urdu', native: 'اردو' },
  { code: 'assamese', name: 'Assamese', native: 'অসমীয়া' },
  { code: 'sanskrit', name: 'Sanskrit', native: 'संस्कृतम्' }
];

export function LanguagePreferenceGuard() {
  const user = useAuthStore(s => s.user);
  const token = useAuthStore(s => s.token);
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(['english']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only run if the user is authenticated
    if (!user) {
      setIsOpen(false);
      return;
    }

    const checkPreferences = async () => {
      const authToken = token || localStorage.getItem('auth_token');
      if (!authToken) return;

      try {
        // Only show language preferences if the user has created at least one tree
        const trees = await getUserTrees(user.id, true);
        if (trees.length === 0) {
          setIsOpen(false);
          return;
        }

        // 1. Check sessionStorage first to see if language preference is already cached
        const cached = sessionStorage.getItem('preferredLanguages');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              // Cached preferences exist, no need to fetch or show modal
              setIsOpen(false);
              return;
            }
          } catch (e) {
            console.warn('Failed to parse cached preferredLanguages:', e);
          }
        }

        // 2. Fetch from backend API
        // Try '/tree/explore-roots/user' first
        let response = await fetch(`${API_BASE_URL}${userApi.exploreRootsUser}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });

        // Fallback to '/explore-roots/user'
        if (!response.ok && response.status === 404) {
          response = await fetch(`${API_BASE_URL}${userApi.exploreRootsUserFallback}`, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          });
        }

        if (response.ok) {
          const resBody = await response.json();
          const rawLangs = resBody?.data?.feedLanguagePreference ?? resBody?.feedLanguagePreference;
          
          if (Array.isArray(rawLangs) && rawLangs.length > 0) {
            const langsWithEnglish = rawLangs.includes('english') ? rawLangs : ['english', ...rawLangs];
            sessionStorage.setItem('preferredLanguages', JSON.stringify(langsWithEnglish));
            setIsOpen(false);
            return; // Languages found, bypass modal
          }
        }
        // Clear cached storage if preferences are empty on the server
        sessionStorage.removeItem('preferredLanguages');
      } catch (err) {
        console.warn('GET language preference API error:', err);
        sessionStorage.removeItem('preferredLanguages');
      }
      
      // Fall back to showing the selection modal
      setIsOpen(true);
    };

    checkPreferences();

    // Listen for custom tree-created event to check again
    const handleTreeCreatedEvent = () => {
      checkPreferences();
    };
    window.addEventListener('tree-created', handleTreeCreatedEvent);

    return () => {
      window.removeEventListener('tree-created', handleTreeCreatedEvent);
    };
  }, [user, token]);

  const toggleLanguage = (code: string) => {
    if (code === 'english') return;
    setSelected(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    const authToken = token || localStorage.getItem('auth_token');

    try {
      // 1. POST request to save in backend
      let response = await fetch(`${API_BASE_URL}${userApi.exploreRootsUser}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ feedLanguagePreference: selected })
      });

      // Fallback POST to '/explore-roots/user'
      if (!response.ok && response.status === 404) {
        response = await fetch(`${API_BASE_URL}${userApi.exploreRootsUserFallback}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ feedLanguagePreference: selected })
        });
      }

      if (response.ok) {
        // Only save in sessionStorage when API succeeds
        sessionStorage.setItem('preferredLanguages', JSON.stringify(selected));
        // Only close the modal on success
        setIsOpen(false);
      } else {
        console.warn('Backend API save failed');
        setError('Failed to save language preferences on server. Please try again.');
      }
    } catch (err) {
      console.warn('Failed to save language preferences:', err);
      setError('Connection error. Failed to save preferences.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" />
      
      <div className="relative w-full max-w-lg mx-4 bg-[#ffffff] dark:bg-[#1e1d1c] rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Decorative Top Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#2F3E8F] via-[#4B2C5E] to-[#C2A46D]" />

        {/* Modal Content Wrapper */}
        <div className="px-6 py-6 overflow-y-auto flex-1">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2.5 bg-[#2F3E8F]/10 dark:bg-[#2F3E8F]/20 rounded-xl text-[#2F3E8F] dark:text-[#8CA0FF] mt-0.5">
              <Globe className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 leading-tight">
                Feed Languages
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Choose the languages you'd like to see in your feed.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50 rounded-xl text-xs text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Default language notification */}
          <div className="mb-4 px-3 py-2 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/30 rounded-xl text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span>English is included by default. Select additional languages to personalize your feed.</span>
          </div>

          {/* Languages Grid */}
          <div className="grid grid-cols-2 gap-2 my-2 pr-1 max-h-[40vh] overflow-y-auto">
            {/* English (always checked, disabled for interaction) */}
            <div
              className="flex items-center justify-between p-3 rounded-xl border text-left border-[#2F3E8F] bg-[#2F3E8F]/5 text-[#2F3E8F] dark:border-[#8CA0FF] dark:bg-[#8CA0FF]/10 dark:text-[#8CA0FF] font-medium shadow-sm select-none cursor-default"
            >
              <div className="min-w-0">
                <p className="text-sm truncate">English</p>
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate">English (Included)</p>
              </div>
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2F3E8F] dark:bg-[#8CA0FF] text-white dark:text-[#1e1d1c]">
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
              </div>
            </div>

            {INDIAN_LANGUAGES.map(lang => {
              const isSelected = selected.includes(lang.code);
              return (
                <button
                  key={lang.code}
                  onClick={() => toggleLanguage(lang.code)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-200 ${
                    isSelected
                      ? 'border-[#2F3E8F] bg-[#2F3E8F]/5 text-[#2F3E8F] dark:border-[#8CA0FF] dark:bg-[#8CA0FF]/10 dark:text-[#8CA0FF] font-medium shadow-sm'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-[#282726] text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm truncate">{lang.name}</p>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate">{lang.native}</p>
                  </div>
                  {isSelected && (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2F3E8F] dark:bg-[#8CA0FF] text-white dark:text-[#1e1d1c]">
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-4 leading-normal">
            This setting only affects content shown in your feed and does not change the app language.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-neutral-50 dark:bg-[#171615] border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center gap-3">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {selected.length} language{selected.length !== 1 ? 's' : ''} selected
          </p>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="px-6 bg-[#2F3E8F] hover:bg-[#3B4DA6] dark:bg-[#8CA0FF] dark:hover:bg-[#a3b3ff] dark:text-[#1e1d1c] text-white font-medium rounded-xl transition-all duration-200 shadow-md shadow-[#2F3E8F]/10 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save & Continue</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
