/**
 * FestivalPromptBanner — seasonal banner for upcoming Indian festivals
 */

import { useState } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { getActiveFestivalBundle } from '@/data/festivalPrompts';

interface FestivalPromptBannerProps {
  onStartPrompt: (title: string, textContent: string, category?: string) => void;
  inline?: boolean;
}

export function FestivalPromptBanner({ onStartPrompt, inline = false }: FestivalPromptBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const bundle = getActiveFestivalBundle();
  if (!bundle || dismissed) return null;

  const content = (
    <>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{bundle.emoji}</span>
        <p className="text-[13px] text-[#3D2E1F] dark:text-[#f5f5f5] font-medium flex-1">{bundle.banner}</p>
        <button onClick={() => setExpanded(!expanded)}
          className="text-[12px] font-medium text-[#2F3E8F] hover:underline shrink-0 flex items-center gap-1">
          {expanded ? 'Hide' : 'Show prompts'}
          <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
        <button onClick={() => setDismissed(true)}
          className="p-1 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.05]">
          <X className="w-3.5 h-3.5 text-[#B8A090] dark:text-[#666]" strokeWidth={1.5} />
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2">
          {bundle.prompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => onStartPrompt(
                prompt.suggestedTitle,
                `## ${prompt.question}\n\n`,
                prompt.suggestedCategory,
              )}
              className="w-full text-left p-3 rounded-xl border border-[#E2E8F0]/60 dark:border-[#2a2a2a] bg-white/60 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.04] transition-colors group"
            >
              <p className="text-[13px] text-[#3D2E1F] dark:text-[#e0e0e0]">{prompt.question}</p>
              <p className="text-[11px] text-[#2F3E8F] font-medium mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Start writing &rarr;
              </p>
            </button>
          ))}
        </div>
      )}
    </>
  );

  if (inline) {
    return (
      <div className="rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#E2E8F0]/60 dark:border-[#2a2a2a] p-3 mx-1 shadow-sm">
        {content}
      </div>
    );
  }

  return (
    <div className="border-b border-[#E2E8F0]/60 dark:border-[#2a2a2a] bg-gradient-to-r from-[#2F3E8F]/[0.06] to-[#2F3E8F]/[0.02]">
      <div className="px-5 sm:px-8 py-3">
        {content}
      </div>
    </div>
  );
}
