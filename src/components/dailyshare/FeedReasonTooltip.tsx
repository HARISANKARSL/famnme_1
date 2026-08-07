/**
 * FeedReasonTooltip — "Why am I seeing this?" tooltip for personalized feed posts.
 * Shows a small info icon that reveals the ranking reasons on hover/tap.
 */

import { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

interface FeedReasonTooltipProps {
  reasons: string[];
}

export function FeedReasonTooltip({ reasons }: FeedReasonTooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (reasons.length === 0) return null;

  return (
    <div className="relative inline-flex" ref={tooltipRef}>
      {/* <button
        onClick={() => setOpen(!open)}
        className="p-0.5 rounded-full text-[#8B7355]/40 hover:text-[#8B7355]/70 hover:bg-black/[0.04] transition-colors"
        aria-label="Why am I seeing this?"
        title="Why am I seeing this?"
      >
        <Info className="h-3 w-3" />
      </button> */}

      {open && (
        <div className="absolute right-0 bottom-full mb-1 w-52 bg-white dark:bg-[#2a2a2a] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 p-2.5">
          <p className="text-[10px] font-medium text-[#8B7355] dark:text-[#A19F9D] mb-1.5 uppercase tracking-wider">
            Why this post
          </p>
          <ul className="space-y-1">
            {reasons.map((reason, i) => (
              <li key={i} className="text-xs text-[#3D2E1F] dark:text-[#F3F2F1] flex items-start gap-1.5">
                <span className="text-[#2F3E8F] mt-0.5 flex-shrink-0">&#x2022;</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
