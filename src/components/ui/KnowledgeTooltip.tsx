/**
 * KnowledgeTooltip - Info tooltip for cultural terms
 */

import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getKnowledgeEntry } from '@/data/culturalKnowledgeBase';

interface KnowledgeTooltipProps {
  term: string;
  className?: string;
}

export function KnowledgeTooltip({ term, className }: KnowledgeTooltipProps) {
  const entry = getKnowledgeEntry(term);
  if (!entry) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className={`h-3.5 w-3.5 text-blue-400 cursor-help inline-block ${className || ''}`} />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs" side="top">
          <div className="text-xs space-y-1">
            <p className="font-semibold">
              {entry.term} {entry.localTerm && <span className="text-gray-400">({entry.localTerm})</span>}
            </p>
            <p className="text-gray-600">{entry.description}</p>
            {entry.significance && (
              <p className="text-[#2F3E8F] italic">{entry.significance}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
