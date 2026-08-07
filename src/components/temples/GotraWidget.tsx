/**
 * GotraWidget — Displays AI-generated information about the family's gotra.
 * Shown on the Celebrate Culture page when the primary user has a gotra set.
 * AI content is fetched from the backend and cached in Neo4j.
 */

import { useState, useEffect } from 'react';
import { Gem, ChevronDown, ChevronUp } from 'lucide-react';
import { enrichGotra } from '@/services/googleMapsApiService';

interface GotraEnrichment {
  sage: string;
  deities: string;
  practices: string;
  significance: string;
}

interface GotraWidgetProps {
  gotra: string;
  embedded?: boolean;
}

export function GotraWidget({ gotra, embedded }: GotraWidgetProps) {
  const [data, setData] = useState<GotraEnrichment | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    enrichGotra(gotra)
      .then(result => { if (!cancelled) { setData(result); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [gotra]);

  if (!loading && !data) return null;

  const gotraContent = (
    <div className={embedded ? '' : 'rounded-xl border border-[#FF8C00]/25 bg-[#FFF8EE] dark:bg-[#3D2000]/30 dark:border-[#FF8C00]/15 overflow-hidden'}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#FF8C00]/5 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-[#FF8C00]/15 flex items-center justify-center shrink-0">
          <span className="text-[16px]">ॐ</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-[#2F3E8F] uppercase tracking-wider">Your Gotra</p>
          <p className="text-[14px] font-bold text-[#3D2E1F] dark:text-[#f5f5f5]">{gotra} Gotra</p>
        </div>
        {loading ? (
          <div className="w-4 h-4 rounded-full border-2 border-[#2F3E8F]/40 border-t-[#2F3E8F] animate-spin shrink-0" />
        ) : (
          expanded
            ? <ChevronUp className="w-4 h-4 text-[#8B7355] shrink-0" />
            : <ChevronDown className="w-4 h-4 text-[#8B7355] shrink-0" />
        )}
      </button>

      {/* Content */}
      {expanded && !loading && data && (
        <div className="px-4 pb-4 space-y-3 border-t border-[#FF8C00]/15">
          <GotraSection label="Founding Sage (Rishi)" value={data.sage} />
          <GotraSection label="Associated Deities" value={data.deities} />
          <GotraSection label="Traditional Practices" value={data.practices} />
          <GotraSection label="Significance" value={data.significance} />
          <div className="flex items-center gap-1.5 pt-1">
            <Gem className="w-3 h-3 text-[#2F3E8F]" />
            <span className="text-[10px] text-[#8B7355] dark:text-[#A19F9D]">✨ Powered by AI · Cached for this gotra</span>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {expanded && loading && (
        <div className="px-4 pb-4 space-y-2 border-t border-[#FF8C00]/15 pt-3">
          {[80, 60, 90, 70].map((w, i) => (
            <div key={i} className={`h-3 bg-[#FF8C00]/10 rounded animate-pulse`} style={{ width: `${w}%` }} />
          ))}
        </div>
      )}
    </div>
  );

  return gotraContent;
}

function GotraSection({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-[#2F3E8F] uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-[12px] text-[#5A4D3F] dark:text-[#B8A090] leading-relaxed">{value}</p>
    </div>
  );
}
