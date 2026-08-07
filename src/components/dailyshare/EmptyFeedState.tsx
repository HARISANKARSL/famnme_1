/**
 * EmptyFeedState — Shown when the feed has no posts.
 * Per 4.3, every empty state is an activation opportunity:
 * icon · heading · subtext · primary CTA.
 */

import { Newspaper, Globe, UserPlus } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

interface EmptyFeedStateProps {
  preferredLanguages: string[];
  languageMode: 'strict' | 'soft';
  onSwitchToSoft: () => void;
  /** Invite someone CTA — activates the feed */
  onInvite?: () => void;
}

const LANG_NAMES: Record<string, string> = {
  'en': 'English', 'hi-IN': 'Hindi', 'ta-IN': 'Tamil', 'te-IN': 'Telugu',
  'bn-IN': 'Bengali', 'kn-IN': 'Kannada', 'ml-IN': 'Malayalam', 'mr-IN': 'Marathi',
  'gu-IN': 'Gujarati', 'pa-IN': 'Punjabi', 'or-IN': 'Odia',
};

export function EmptyFeedState({ preferredLanguages, languageMode, onSwitchToSoft, onInvite }: EmptyFeedStateProps) {
  const langNames = preferredLanguages
    .map(code => LANG_NAMES[code] || code)
    .join(', ');

  const isStrictFiltered = languageMode === 'strict';

  if (isStrictFiltered) {
    return (
      <EmptyState
        icon={Newspaper}
        heading={`No posts in ${langNames} yet`}
        subtext={`Be the first to share something in ${langNames}, or explore posts in all languages.`}
        primaryAction={{
          label: 'Show all languages',
          onClick: onSwitchToSoft,
          icon: Globe,
        }}
        accent="#2F3E8F"
        size="regular"
      />
    );
  }

  return (
    <EmptyState
      icon={Newspaper}
      heading="Your family's feed starts here"
      subtext="Invite family to share memories, milestones, and stories. Everything they post will show up here."
      primaryAction={
        onInvite
          ? { label: 'Invite someone', onClick: onInvite, icon: UserPlus }
          : undefined
      }
      accent="#C2A46D"
      size="regular"
    />
  );
}
