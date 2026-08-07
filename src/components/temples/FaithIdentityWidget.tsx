/**
 * FaithIdentityWidget — Shows AI-enriched faith identity information
 * for the user's primary institution (church/mosque).
 *
 * Christian: Parish heritage, denomination traditions, patron saint, sacraments
 * Muslim: Masjid heritage, community (jamaat), school of thought, key practices
 *
 * Replaces GotraWidget for non-Hindu faiths.
 */

import { useState, useEffect, useMemo } from 'react';
import { Gem, ChevronDown, ChevronUp, Church, Building2 } from 'lucide-react';
import type { FaithContext } from '@/data/temples/sacredPlaceLabels';
import { resolveBackendUrl } from '@/config/api';
import { getTempleById } from '@/data/temples';
import { getCachedDynamicTemple } from '@/services/googleMapsApiService';

const API_BASE = resolveBackendUrl('/api');

interface FaithIdentityData {
  heritage: string;
  traditions: string;
  practices: string;
  community: string;
}

interface FaithIdentityWidgetProps {
  faithContext: FaithContext;
  /** placeId or templeId — name will be resolved automatically */
  institutionId: string;
  /** Optional: if name is already known, pass it to avoid a lookup */
  institutionName?: string;
  embedded?: boolean;
}

const FAITH_CONFIG: Record<'Christian' | 'Islam', {
  icon: typeof Church;
  symbol: string;
  title: string;
  subtitle: string;
  borderColor: string;
  bgColor: string;
  accentBg: string;
  sections: Array<{ key: keyof FaithIdentityData; label: string }>;
}> = {
  Christian: {
    icon: Church,
    symbol: '\u2720',  // Maltese cross
    title: 'Your Parish Heritage',
    subtitle: 'Your family\'s church identity',
    borderColor: 'border-[#1565C0]/25',
    bgColor: 'bg-[#EEF5FF] dark:bg-[#0D2744]/30',
    accentBg: 'bg-[#1565C0]/15',
    sections: [
      { key: 'heritage', label: 'Church Heritage & History' },
      { key: 'traditions', label: 'Denomination & Traditions' },
      { key: 'practices', label: 'Sacraments & Worship Style' },
      { key: 'community', label: 'Parish Community' },
    ],
  },
  Islam: {
    icon: Building2,
    symbol: '\u262A',  // Star and crescent
    title: 'Your Masjid Heritage',
    subtitle: 'Your family\'s mosque identity',
    borderColor: 'border-[#2E7D32]/25',
    bgColor: 'bg-[#EEFAF0] dark:bg-[#0A2E0F]/30',
    accentBg: 'bg-[#2E7D32]/15',
    sections: [
      { key: 'heritage', label: 'Mosque Heritage & History' },
      { key: 'traditions', label: 'School of Thought (Mazhab)' },
      { key: 'practices', label: 'Key Practices & Gatherings' },
      { key: 'community', label: 'Jamaat & Community' },
    ],
  },
};

async function fetchFaithIdentity(
  institutionName: string,
  institutionId: string,
  faithContext: 'Christian' | 'Islam',
): Promise<FaithIdentityData | null> {
  try {
    const token = localStorage.getItem('auth_token');
    const res = await fetch(`${API_BASE}/sacred-places/enrich-faith-identity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ institutionName, institutionId, faith: faithContext }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function FaithIdentityWidget({ faithContext, institutionId, institutionName: nameProp, embedded }: FaithIdentityWidgetProps) {
  const [data, setData] = useState<FaithIdentityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [resolvedName, setResolvedName] = useState<string>(nameProp || '');

  const config = useMemo(() => {
    if (faithContext === 'Christian') return FAITH_CONFIG.Christian;
    if (faithContext === 'Islam') return FAITH_CONFIG.Islam;
    return null;
  }, [faithContext]);

  // Resolve institution name if not provided
  useEffect(() => {
    if (nameProp) { setResolvedName(nameProp); return; }
    // Try local DB first
    const local = getTempleById(institutionId);
    if (local) { setResolvedName(local.name); return; }
    // Try cached dynamic temple
    getCachedDynamicTemple(institutionId)
      .then(dt => { if (dt) setResolvedName(dt.name); })
      .catch(() => {});
  }, [institutionId, nameProp]);

  useEffect(() => {
    if (!config || !resolvedName || !institutionId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchFaithIdentity(resolvedName, institutionId, faithContext as 'Christian' | 'Islam')
      .then(result => { if (!cancelled) { setData(result); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [resolvedName, institutionId, faithContext, config]);

  if (!config) return null;
  if (!loading && !data) return null;

  const _Icon = config.icon;

  return (
    <div className={embedded ? '' : `rounded-xl border ${config.borderColor} ${config.bgColor} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
      >
        <div className={`w-8 h-8 rounded-lg ${config.accentBg} flex items-center justify-center shrink-0`}>
          <span className="text-[16px]">{config.symbol}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-[#2F3E8F] uppercase tracking-wider">{config.title}</p>
          <p className="text-[14px] font-bold text-[#3D2E1F] dark:text-[#f5f5f5] truncate">{resolvedName || 'Your primary institution'}</p>
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
        <div className={`px-4 pb-4 space-y-3 border-t ${config.borderColor}`}>
          {config.sections.map(s => {
            const value = data[s.key];
            if (!value) return null;
            return (
              <div key={s.key}>
                <p className="text-[10px] font-semibold text-[#2F3E8F] uppercase tracking-wider mb-0.5">{s.label}</p>
                <p className="text-[12px] text-[#5A4D3F] dark:text-[#B8A090] leading-relaxed">{value}</p>
              </div>
            );
          })}
          <div className="flex items-center gap-1.5 pt-1">
            <Gem className="w-3 h-3 text-[#2F3E8F]" />
            <span className="text-[10px] text-[#8B7355] dark:text-[#A19F9D]">Powered by AI</span>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {expanded && loading && (
        <div className={`px-4 pb-4 space-y-2 border-t ${config.borderColor} pt-3`}>
          {[80, 60, 90, 70].map((w, i) => (
            <div key={i} className="h-3 bg-black/5 dark:bg-white/5 rounded animate-pulse" style={{ width: `${w}%` }} />
          ))}
        </div>
      )}
    </div>
  );
}
