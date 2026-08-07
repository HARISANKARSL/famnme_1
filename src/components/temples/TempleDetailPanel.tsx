import { useState } from 'react';
import { X, Landmark, MapPin, BookOpen, Building2, Route, ScrollText, ChevronDown, ChevronUp, Gem, Heart, Image, Flame, ExternalLink, Clock } from 'lucide-react';
import type { Temple, TempleConnection } from '@/data/temples/types';
import type { TempleLink, DynamicTemple, ServiceTimings } from '@/types';
import type { FaithContext } from '@/data/temples/sacredPlaceLabels';
import { getSetAsMyLabel } from '@/data/temples/sacredPlaceLabels';
import { TempleAILoadingOverlay } from './TempleAILoadingOverlay';
import { ServiceTimingsCard } from './ServiceTimingsCard';

interface LocalEnrichment {
  aiRituals: string;
  aiSignificance: string;
  aiVisitorTips: string;
  aiHowToReach: string;
  aiEnrichedAt: string;
}

interface TempleDetailPanelProps {
  temple: Temple;
  connections?: TempleConnection[];
  onClose: () => void;
  // Temple link features
  myTempleLinks?: TempleLink[];
  onSetAsMyTemple?: (temple: Temple) => void;
  memoryCount?: number;
  onViewMemories?: (temple: Temple) => void;
  // Google Maps / AI enrichment
  dynamicTemple?: DynamicTemple;
  isLoading?: boolean;
  userLat?: number;
  userLng?: number;
  onRefreshDynamicEnrichment?: () => void;
  isRefreshingDynamic?: boolean;
  // Local DB temple AI enrichment
  localEnrichment?: LocalEnrichment;
  onEnrichLocal?: () => void;
  isEnrichingLocal?: boolean;
  // Faith context for dynamic labels
  faithContext?: FaithContext;
}

function MarkdownText({ text }: { text: string }) {
  const cleaned = text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1');

  return (
    <div className="text-[13px] text-[#5A4D3F] dark:text-[#B8A090] leading-relaxed whitespace-pre-line">
      {cleaned}
    </div>
  );
}

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[#E2DBCE]/60 dark:border-[#2a2a2a] last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2.5 py-3.5 px-1 text-left hover:bg-[#F6F2EA]/50 dark:hover:bg-[#1E1E1E]/50 transition-colors rounded-lg"
      >
        <Icon className="w-4 h-4 text-[#2F3E8F] shrink-0" />
        <span className="text-[13px] font-semibold text-[#3D2E1F] dark:text-[#f5f5f5] flex-1">{title}</span>
        {isOpen ? <ChevronUp className="w-4 h-4 text-[#8B7355]" /> : <ChevronDown className="w-4 h-4 text-[#8B7355]" />}
      </button>
      {isOpen && (
        <div className="pb-4 px-1">
          {children}
        </div>
      )}
    </div>
  );
}

const DEITY_GRADIENTS: Record<string, string> = {
  Shiva: 'from-blue-500 to-indigo-600',
  Vishnu: 'from-yellow-500 to-blue-600',
  Brahma: 'from-blue-600 to-rose-600',
  Durga: 'from-pink-500 to-rose-600',
  Parvati: 'from-pink-400 to-fuchsia-500',
  Ganesha: 'from-blue-500 to-blue-600',
  Hanuman: 'from-blue-600 to-blue-600',
  Krishna: 'from-indigo-500 to-blue-600',
  Rama: 'from-green-500 to-emerald-600',
  Lakshmi: 'from-blue-400 to-blue-500',
  Murugan: 'from-blue-600 to-sky-600',
  Ayyappa: 'from-teal-500 to-cyan-600',
};

// Parse Google Maps opening_hours.periods to determine if place is open now
function isOpenNow(openingHoursJson: string): boolean | null {
  try {
    const periods = JSON.parse(openingHoursJson) as Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
    const now = new Date();
    const day = now.getDay();
    const timeStr = now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0');

    for (const period of periods) {
      if (period.open.day === day) {
        const openTime = period.open.time;
        const closeTime = period.close?.time ?? '2359';
        const closeDay = period.close?.day ?? day;
        if (closeDay === day) {
          if (timeStr >= openTime && timeStr <= closeTime) return true;
        } else {
          // Open past midnight
          if (timeStr >= openTime) return true;
        }
      }
    }
    return false;
  } catch {
    return null;
  }
}

// Haversine distance in km
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function TempleDetailPanel({
  temple,
  connections,
  onClose,
  myTempleLinks,
  onSetAsMyTemple,
  memoryCount,
  onViewMemories,
  dynamicTemple,
  isLoading = false,
  userLat,
  userLng,
  onRefreshDynamicEnrichment,
  isRefreshingDynamic = false,
  localEnrichment,
  onEnrichLocal,
  isEnrichingLocal = false,
  faithContext,
}: TempleDetailPanelProps) {
  const gradient = (temple.deity ? DEITY_GRADIENTS[temple.deity] : undefined) || 'from-[#2F3E8F] to-[#8B5E3C]';
  const isLinked = myTempleLinks?.some(l => l.templeId === temple.templeId);

  // Dynamic temple extras
  const openStatus = dynamicTemple?.openingHours ? isOpenNow(dynamicTemple.openingHours) : null;
  const distance = (userLat != null && userLng != null && dynamicTemple)
    ? distanceKm(userLat, userLng, dynamicTemple.lat, dynamicTemple.lng)
    : null;
  const directionsUrl = dynamicTemple
    ? `https://www.google.com/maps/dir/?api=1&destination=${dynamicTemple.lat},${dynamicTemple.lng}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="hidden md:block flex-1" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full md:w-[480px] lg:w-[520px] h-full bg-[#F8F6F1] dark:bg-[#1E1E1E] border-l border-[#E2DBCE]/80 dark:border-[#2a2a2a] flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden">
        {/* AI Loading Overlay */}
        <TempleAILoadingOverlay templeName={temple.name} isVisible={isLoading || isEnrichingLocal} />

        {/* Hero � with optional cover photo */}
        {dynamicTemple?.photoUrl ? (
          <div className="relative shrink-0" style={{ height: '180px' }}>
            <img
              src={dynamicTemple.photoUrl}
              alt={temple.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Landmark className="w-4 h-4 text-white/80" />
                {temple.category && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/20 text-white">
                    {temple.category}
                  </span>
                )}
                {openStatus !== null && (
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${openStatus ? 'bg-[#5A7E6A]/80 text-white' : 'bg-black/40 text-white/80'}`}>
                    {openStatus ? 'Open now' : 'Closed'}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-white leading-tight">{temple.name}</h1>
              <div className="flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-white/70 shrink-0" />
                <span className="text-[12px] md:text-[13px] text-white/80 truncate">
                  {temple.location ? `${temple.location}, ${temple.state}` : (dynamicTemple.formattedAddress || temple.state)}
                </span>
                {distance != null && (
                  <span className="text-[11px] text-white/70 shrink-0">{'\u00b7'} {distance.toFixed(1)} km away</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className={`relative bg-gradient-to-br ${gradient} px-5 pt-4 pb-6 shrink-0`}>
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <Landmark className="w-5 h-5 text-white/80" />
              {temple.category && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/20 text-white">
                  {temple.category}
                </span>
              )}
              {openStatus !== null && (
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${openStatus ? 'bg-[#5A7E6A]/80 text-white' : 'bg-black/40 text-white/80'}`}>
                  {openStatus ? 'Open now' : 'Closed'}
                </span>
              )}
            </div>

            <h1 className="text-xl font-bold text-white leading-tight">
              {temple.name}
            </h1>

            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <MapPin className="w-3.5 h-3.5 text-white/70" />
              <span className="text-[13px] text-white/80">
                {temple.location ? `${temple.location}, ${temple.state}` : (dynamicTemple?.formattedAddress || temple.state)}
              </span>
              {distance != null && (
                <span className="text-[12px] text-white/70 ml-1">{'\u00b7'} {distance.toFixed(1)} km away</span>
              )}
            </div>

            {/* Deity badges */}
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              {(temple.deities?.length ?? 0) > 0 ? (
                temple.deities!.map(d => (
                  <span key={d} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/20 text-white">
                    {d}
                  </span>
                ))
              ) : temple.deity ? (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/20 text-white">
                  {temple.deity}
                </span>
              ) : null}
            </div>
          </div>
        )}

        {/* Family connections */}
        {connections && connections.length > 0 && (
          <div className="px-5 py-3 bg-[#F6F2EA] dark:bg-[#1a1a1a] border-b border-[#E2DBCE]/60 dark:border-[#2a2a2a] shrink-0">
            <p className="text-[11px] font-semibold text-[#2F3E8F] uppercase tracking-wider mb-1.5">Family Connection</p>
            {connections.map((conn, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <Gem className="w-3.5 h-3.5 text-[#2F3E8F] shrink-0 mt-0.5" />
                <span className="text-[12px] text-[#6B5E4F] dark:text-[#B8A090]">{conn.reason}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        {(onSetAsMyTemple || onViewMemories) && (
          <div className="px-5 py-3 border-b border-[#E2DBCE]/60 dark:border-[#2a2a2a] shrink-0 flex items-center gap-2 flex-wrap">
            {onSetAsMyTemple && !isLinked && (
              <button
                onClick={() => onSetAsMyTemple(temple)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-white bg-[#2F3E8F] hover:bg-[#3B4DA6] transition-colors"
              >
                <Heart className="w-3.5 h-3.5" />
                {getSetAsMyLabel(faithContext ?? null)}
              </button>
            )}
            {isLinked && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#2F3E8F] bg-[#2F3E8F]/10">
                <Heart className="w-3.5 h-3.5 fill-current" />
                Linked to you
              </span>
            )}
            {onViewMemories && (
              <button
                onClick={() => onViewMemories(temple)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#6B5E4F] dark:text-[#B8A090] bg-[#ECE7DF] dark:bg-[#1E1E1E] hover:bg-[#E2DBCE] dark:hover:bg-[#333] transition-colors"
              >
                <Image className="w-3.5 h-3.5" />
                {memoryCount && memoryCount > 0
                  ? `${memoryCount} ${memoryCount === 1 ? 'Memory' : 'Memories'}`
                  : 'Add your first memory'}
              </button>
            )}
          </div>
        )}

        {/* Content sections */}
        <div className="flex-1 overflow-y-auto px-5 py-2">
          {/* Static DB content */}
          {temple.info && (
            <CollapsibleSection title="Overview" icon={BookOpen} defaultOpen>
              <MarkdownText text={temple.info} />
            </CollapsibleSection>
          )}

          {temple.story && (
            <CollapsibleSection title="Story & Legend" icon={ScrollText}>
              <MarkdownText text={temple.story} />
            </CollapsibleSection>
          )}

          {/* === Section order: Timings > How to Reach > Rituals > Significance > Visitor Tips === */}

          {/* 1. Timings & Services — AI-enriched (dynamic temples) */}
          {dynamicTemple?.aiServiceTimings && (() => {
            try {
              const timings = JSON.parse(dynamicTemple.aiServiceTimings) as ServiceTimings;
              return (
                <CollapsibleSection title="Timings & Services" icon={Clock} defaultOpen>
                  <ServiceTimingsCard timings={timings} />
                </CollapsibleSection>
              );
            } catch { return null; }
          })()}

          {/* 2. How to Reach — merged: AI text + directions button + rating + website */}
          {(dynamicTemple?.aiHowToReach || localEnrichment?.aiHowToReach || directionsUrl) && (
            <CollapsibleSection title="How to Reach" icon={Route} defaultOpen>
              <div className="space-y-3">
                {/* AI-generated directions text */}
                {(dynamicTemple?.aiHowToReach || localEnrichment?.aiHowToReach) && (
                  <MarkdownText text={dynamicTemple?.aiHowToReach ?? localEnrichment!.aiHowToReach} />
                )}

                {/* Google Maps rating */}
                {dynamicTemple?.googleRating != null && (
                  <p className="text-[12px] text-[#6B5E4F] dark:text-[#B8A090]">
                    Google Maps rating: <span className="font-semibold text-[#2F3E8F]">{dynamicTemple.googleRating.toFixed(1)}</span>
                  </p>
                )}

                {/* Website link */}
                {dynamicTemple?.website && (
                  <a
                    href={dynamicTemple.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[12px] text-[#2F3E8F] hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Visit website
                  </a>
                )}

                {/* Get Directions button */}
                {directionsUrl && (
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#2F3E8F] text-white text-[12px] font-medium hover:bg-[#3B4DA6] transition-colors w-fit"
                  >
                    <Route className="w-3.5 h-3.5" />
                    Get Directions
                  </a>
                )}

                {/* Open/closed status */}
                {openStatus !== null && (
                  <div className="flex items-center gap-1.5 text-[12px] text-[#6B5E4F] dark:text-[#B8A090]">
                    <Clock className="w-3.5 h-3.5 text-[#2F3E8F]" />
                    {openStatus ? 'Open right now based on typical hours' : 'Likely closed right now \u2014 check before visiting'}
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* 3. Rituals & Practices */}
          {(dynamicTemple?.aiRituals || localEnrichment?.aiRituals) && (
            <CollapsibleSection title="Rituals & Practices" icon={Flame} defaultOpen>
              <MarkdownText text={dynamicTemple?.aiRituals ?? localEnrichment!.aiRituals} />
            </CollapsibleSection>
          )}

          {/* 4. Significance & Miracles */}
          {(dynamicTemple?.aiSignificance || localEnrichment?.aiSignificance) && (
            <CollapsibleSection title="Significance & Miracles" icon={Gem} defaultOpen>
              <MarkdownText text={dynamicTemple?.aiSignificance ?? localEnrichment!.aiSignificance} />
            </CollapsibleSection>
          )}

          {/* 5. Visitor Tips / Visiting Guide */}
          {(temple.visitingGuide || dynamicTemple?.aiVisitorTips || localEnrichment?.aiVisitorTips) && (
            <CollapsibleSection title="Visiting Guide" icon={Route}>
              <MarkdownText text={temple.visitingGuide ?? dynamicTemple?.aiVisitorTips ?? localEnrichment!.aiVisitorTips} />
            </CollapsibleSection>
          )}

          {/* Enrich / Refresh AI button */}
          {onEnrichLocal && (
            <div className="py-3 border-b border-[#E2DBCE]/60 dark:border-[#2a2a2a] last:border-0">
              <button
                onClick={onEnrichLocal}
                disabled={isEnrichingLocal}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium text-[#2F3E8F] bg-[#2F3E8F]/8 hover:bg-[#2F3E8F]/15 disabled:opacity-60 disabled:cursor-not-allowed transition-colors w-full"
              >
                {isEnrichingLocal ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-[#2F3E8F]/40 border-t-[#2F3E8F] animate-spin shrink-0" />
                    Generating AI insights...
                  </>
                ) : (
                  <>
                    <Gem className="w-3.5 h-3.5 shrink-0" />
                    {localEnrichment ? 'Refresh AI insights' : 'Enrich with AI \u2014 get rituals, history, visitor tips & directions'}
                  </>
                )}
              </button>
            </div>
          )}

          {/* Refresh enrichment for dynamic temples */}
          {dynamicTemple?.isAIEnriched && onRefreshDynamicEnrichment && (
            <div className="py-3 border-b border-[#E2DBCE]/60 dark:border-[#2a2a2a] last:border-0">
              <button
                onClick={onRefreshDynamicEnrichment}
                disabled={isRefreshingDynamic}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium text-[#2F3E8F] bg-[#2F3E8F]/8 hover:bg-[#2F3E8F]/15 disabled:opacity-60 disabled:cursor-not-allowed transition-colors w-full"
              >
                {isRefreshingDynamic ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-[#2F3E8F]/40 border-t-[#2F3E8F] animate-spin shrink-0" />
                    Refreshing AI insights...
                  </>
                ) : (
                  <>
                    <Gem className="w-3.5 h-3.5 shrink-0" />
                    Refresh AI insights
                  </>
                )}
              </button>
            </div>
          )}

          {/* Static content sections */}
          {temple.architecture && (
            <CollapsibleSection title="Architecture" icon={Building2}>
              <MarkdownText text={temple.architecture} />
            </CollapsibleSection>
          )}

          {temple.mentionInScripture && (
            <CollapsibleSection title="Scriptural References" icon={BookOpen}>
              <MarkdownText text={temple.mentionInScripture} />
            </CollapsibleSection>
          )}
        </div>
      </div>
    </div>
  );
}
