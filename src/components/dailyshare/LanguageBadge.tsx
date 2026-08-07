/**
 * LanguageBadge — Small colored pill showing the detected language of a post.
 * Displayed next to the timestamp on each post card.
 */

interface LanguageBadgeProps {
  language?: string;
  className?: string;
}

const LANG_CONFIG: Record<string, { label: string; color: string }> = {
  'en':    { label: 'EN', color: 'bg-blue-100 text-blue-700' },
  'hi-IN': { label: 'HI', color: 'bg-orange-100 text-orange-700' },
  'ta-IN': { label: 'TA', color: 'bg-green-100 text-green-700' },
  'te-IN': { label: 'TE', color: 'bg-teal-100 text-teal-700' },
  'bn-IN': { label: 'BN', color: 'bg-red-100 text-red-700' },
  'kn-IN': { label: 'KN', color: 'bg-yellow-100 text-yellow-700' },
  'ml-IN': { label: 'ML', color: 'bg-purple-100 text-purple-700' },
  'mr-IN': { label: 'MR', color: 'bg-pink-100 text-pink-700' },
  'gu-IN': { label: 'GU', color: 'bg-amber-100 text-amber-700' },
  'pa-IN': { label: 'PA', color: 'bg-indigo-100 text-indigo-700' },
  'or-IN': { label: 'OR', color: 'bg-emerald-100 text-emerald-700' },
};

export function LanguageBadge({ language, className = '' }: LanguageBadgeProps) {
  if (!language) return null;

  const config = LANG_CONFIG[language] || { label: language.split('-')[0].toUpperCase(), color: 'bg-gray-100 text-gray-600' };

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none ${config.color} ${className}`}
      title={getFullName(language)}
    >
      {config.label}
    </span>
  );
}

function getFullName(lang: string): string {
  const names: Record<string, string> = {
    'en': 'English', 'hi-IN': 'Hindi', 'ta-IN': 'Tamil', 'te-IN': 'Telugu',
    'bn-IN': 'Bengali', 'kn-IN': 'Kannada', 'ml-IN': 'Malayalam', 'mr-IN': 'Marathi',
    'gu-IN': 'Gujarati', 'pa-IN': 'Punjabi', 'or-IN': 'Odia',
  };
  return names[lang] || lang;
}
