/**
 * SuggestionsPanel - Progressive Disclosure Smart Suggestions
 *
 * Shows suggestions in tiers:
 *   Tier 1: Structural Integrity (broken lineage, missing generation, missing parents)
 *   Tier 2: Essential Data (birth dates, single parents)
 *   Tier 3: Enrichment (photos, spouses, profiles)
 *
 * Each tier unlocks when >=70% of the previous tier is addressed (fixed or dismissed).
 * Locked tiers show as a preview with item count.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Lightbulb, Calendar, Users, Heart, Camera, UserPlus, Loader2, ChevronRight, AlertTriangle, Unlink, Info, Gem, Lock, CheckCircle2, Shield, Database, Palette, ArrowLeft } from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';
import { Button } from '@/components/ui/button';
import { fetchSuggestions, fetchAIEnrichedSuggestions, dismissAISuggestion, type SuggestionsResult, type Suggestion } from '@/services/neo4jDataService';

interface SuggestionsPanelProps {
  treeId: string;
  treeName?: string;
  isOpen: boolean;
  onClose: () => void;
  onFixSuggestion?: (suggestion: Suggestion) => void;
  variant?: 'panel' | 'fullpage';
}

const ICON_MAP: Record<string, React.ReactNode> = {
  calendar: <Calendar className="w-4 h-4" />,
  users: <Users className="w-4 h-4" />,
  heart: <Heart className="w-4 h-4" />,
  camera: <Camera className="w-4 h-4" />,
  'user-plus': <UserPlus className="w-4 h-4" />,
  'alert-triangle': <AlertTriangle className="w-4 h-4" />,
  unlink: <Unlink className="w-4 h-4" />,
  info: <Info className="w-4 h-4" />,
  sparkles: <Gem className="w-4 h-4" />,
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'border-l-blue-700 dark:border-l-blue-500 bg-[#E8EDFF] dark:bg-blue-950/20',
  medium: 'border-l-blue-500 dark:border-l-blue-400 bg-[#E8EDFF] dark:bg-blue-950/20',
  low: 'border-l-[#2F3E8F] dark:border-l-blue-600 bg-[#E8EDFF] dark:bg-blue-950/20',
  info: 'border-l-blue-400 dark:border-l-blue-300 bg-[#E8EDFF] dark:bg-blue-950/20',
};

const TIER_ICONS: Record<number, React.ReactNode> = {
  1: <Shield className="w-4 h-4" />,
  2: <Database className="w-4 h-4" />,
  3: <Palette className="w-4 h-4" />,
};

const TIER_COLORS: Record<number, { bg: string; text: string; border: string; progressBg: string; progress: string }> = {
  1: { bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-900/50', progressBg: 'bg-red-100 dark:bg-red-950/40', progress: 'bg-red-500' },
  2: { bg: 'bg-[#E8EDFF] dark:bg-blue-950/20', text: 'text-[#2F3E8F] dark:text-[#8CA0FF]', border: 'border-[#2F3E8F]/30 dark:border-blue-900/40', progressBg: 'bg-blue-100 dark:bg-blue-950/40', progress: 'bg-blue-600 dark:bg-blue-500' },
  3: { bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-900/50', progressBg: 'bg-emerald-100 dark:bg-emerald-950/40', progress: 'bg-emerald-500' },
};

const UNLOCK_THRESHOLD = 0.7; // 70% of previous tier must be addressed

export function SuggestionsPanel({ treeId, treeName, isOpen, onClose, onFixSuggestion, variant = 'panel' }: SuggestionsPanelProps) {
  const { isMobile } = useResponsive();
  const [data, setData] = useState<SuggestionsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`suggestions-dismissed-${treeId}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const loadSuggestions = useCallback(async (silent = false) => {
    if (!silent) {
      setData(null);
      setLoading(true);
      setDismissedIds(new Set());
      try {
        localStorage.removeItem(`suggestions-dismissed-${treeId}`);
        console.log('[SuggestionsPanel] Cleared dismissed suggestions for tree:', treeId);
      } catch (e) {
        console.error('[SuggestionsPanel] Failed to clear dismissed suggestions from localStorage:', e);
      }
    }

    try {
      // Try AI-enriched suggestions first, fall back to standard
      console.log('[SuggestionsPanel] Fetching suggestions for tree:', treeId);
      const aiResult = await fetchAIEnrichedSuggestions(treeId);
      if (aiResult) {
        console.log('[SuggestionsPanel] Received AI-enriched suggestions:', aiResult);
        setData(aiResult);
      } else {
        const result = await fetchSuggestions(treeId);
        console.log('[SuggestionsPanel] Received standard suggestions:', result);
        setData(result);
      }
    } catch (err) {
      console.error('[SuggestionsPanel] Failed to load suggestions:', err);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [treeId]);

  // Sync dismissedIds when treeId changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`suggestions-dismissed-${treeId}`);
      setDismissedIds(saved ? new Set(JSON.parse(saved)) : new Set());
    } catch {
      setDismissedIds(new Set());
    }
  }, [treeId]);

  useEffect(() => {
    if (isOpen) loadSuggestions();
  }, [isOpen, loadSuggestions]);

  const handleDismiss = async (id: string) => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(`suggestions-dismissed-${treeId}`, JSON.stringify([...next]));
      } catch (e) {
        console.error('[SuggestionsPanel] Failed to save dismissed suggestions to localStorage:', e);
      }
      return next;
    });

    try {
      await dismissAISuggestion(id);
      console.log(`[SuggestionsPanel] Successfully dismissed suggestion ${id} on AI backend`);
      await loadSuggestions();
    } catch (err) {
      console.error(`[SuggestionsPanel] Failed to dismiss suggestion ${id} on AI backend:`, err);
    }
  };

  // Compute tier states
  const tierState = useMemo(() => {
    if (!data) return { tiers: [], activeTier: 1 };

    const allSuggestions = data.suggestions;

    const tierData = [1, 2, 3].map(tierNum => {
      const tierSuggestions = allSuggestions.filter(s => s.tier === tierNum);
      const totalCount = tierSuggestions.length;
      const dismissedCount = tierSuggestions.filter(s => dismissedIds.has(s.id)).length;
      const visibleSuggestions = tierSuggestions.filter(s => !dismissedIds.has(s.id));
      const addressedPercent = totalCount > 0 ? dismissedCount / totalCount : 1;
      const tierInfo = data.tiers?.find(t => t.tier === tierNum);

      return {
        tier: tierNum as 1 | 2 | 3,
        label: tierInfo?.label || `Tier ${tierNum}`,
        description: tierInfo?.description || '',
        totalCount,
        dismissedCount,
        visibleSuggestions,
        addressedPercent,
        isComplete: totalCount === 0 || addressedPercent >= 1,
      };
    });

    // Determine which tiers are unlocked
    // Tier 1: always unlocked
    // Tier 2: unlocked when Tier 1 is >=70% addressed OR has 0 items
    // Tier 3: unlocked when Tier 2 is >=70% addressed OR has 0 items
    const tier1Unlocked = true;
    const tier2Unlocked = tierData[0].totalCount === 0 || tierData[0].addressedPercent >= UNLOCK_THRESHOLD;
    const tier3Unlocked = tier2Unlocked && (tierData[1].totalCount === 0 || tierData[1].addressedPercent >= UNLOCK_THRESHOLD);

    const unlocked = [tier1Unlocked, tier2Unlocked, tier3Unlocked];

    // Active tier = first unlocked tier that still has visible suggestions
    let activeTier = 1;
    for (let i = 0; i < 3; i++) {
      if (unlocked[i] && tierData[i].visibleSuggestions.length > 0) {
        activeTier = i + 1;
        break;
      }
      // If this tier is complete and next is unlocked, move to next
      if (unlocked[i] && tierData[i].visibleSuggestions.length === 0 && i < 2 && unlocked[i + 1]) {
        continue;
      }
      if (unlocked[i]) {
        activeTier = i + 1;
        break;
      }
    }

    const computedState = {
      tiers: tierData.map((td, i) => ({
        ...td,
        isUnlocked: unlocked[i],
      })),
      activeTier,
    };

    console.log('[SuggestionsPanel] Computed Tier State:', {
      allSuggestionsLength: allSuggestions.length,
      dismissedIdsCount: dismissedIds.size,
      dismissedIds: Array.from(dismissedIds),
      activeTier: computedState.activeTier,
      tiers: computedState.tiers.map(t => ({
        tier: t.tier,
        isUnlocked: t.isUnlocked,
        isComplete: t.isComplete,
        totalCount: t.totalCount,
        dismissedCount: t.dismissedCount,
        visibleCount: t.visibleSuggestions.length,
        visibleSuggestions: t.visibleSuggestions
      }))
    });

    return computedState;
  }, [data, dismissedIds]);

  if (!isOpen) return null;

  const allComplete = tierState.tiers.every(t => t.visibleSuggestions.length === 0 && t.totalCount > 0) ||
    (data?.suggestions.length === 0);

  const isFullpage = variant === 'fullpage';

  return (
    <div className={isFullpage
      ? 'absolute inset-0 z-40 bg-[#F6F2EA] dark:bg-[#141414] flex flex-col'
      : `fixed ${isMobile ? 'inset-0' : 'inset-y-0 right-0 w-[400px]'} bg-[#FAFAF8] dark:bg-[#141414] shadow-xl z-50 flex flex-col border-l border-gray-200 dark:border-zinc-800`
    }>
      {/* Header */}
      {isFullpage ? (
        <div className="shrink-0 h-14 flex items-center gap-3 px-4 md:px-6 border-b border-[#E2DBCE]/60 dark:border-[#2A2A2A] bg-white/80 dark:bg-[#1A1A1A]/80 backdrop-blur-sm">
          <button
            onClick={onClose}
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-[#2F3E8F]/[0.06] dark:hover:bg-white/[0.06] transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-[#3D2E1F] dark:text-[#D4D0CC]" />
          </button>
          <Lightbulb className="w-5 h-5 text-[#C2A46D]" strokeWidth={1.8} />
          <h1 className="text-[16px] font-bold text-[#3D2E1F] dark:text-[#F3F2F1]">Smart Suggestions</h1>
        </div>
      ) : (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-zinc-800 bg-gradient-to-r from-blue-50 to-sky-50 dark:from-zinc-900 dark:to-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2F3E8F] flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-zinc-100 text-sm">Smart Suggestions</h2>
              <p className="text-[11px] text-gray-500 dark:text-zinc-455">Progressive guidance for tree improvement</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-blue-200/50 dark:hover:bg-zinc-850 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
          </button>
        </div>
      )}

      {treeName && (
        <div className="px-5 py-2 bg-[#E8EDFF]/60 dark:bg-[#1E254A] border-b border-[#E2DBCE]/40 dark:border-[#2A2A2A] flex items-center gap-2 text-[11px] text-[#2F3E8F] dark:text-[#8CA0FF]">
          <Info className="w-3.5 h-3.5 shrink-0 text-[#2F3E8F] dark:text-[#8CA0FF]" />
          <span>
            Showing suggestions for default tree: <strong className="font-semibold">{treeName}</strong>
          </span>
        </div>
      )}

      {/* Completeness Score */}
      {data && (
        <div className="px-5 py-3 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-[#1C1C1C]">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-zinc-400">Tree Completeness</span>
            <span className="font-bold text-[#25327A] dark:text-[#8CA0FF]">{data.completenessPercent}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-zinc-800 rounded-full h-2">
            <div
              className="bg-[#2F3E8F] dark:bg-[#8CA0FF] h-2 rounded-full transition-all duration-500"
              style={{ width: `${data.completenessPercent}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 dark:text-zinc-500 mt-1">{data.totalPersons} persons in tree</div>
        </div>
      )}

      {/* Content */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${isMobile ? 'pb-16' : ''}`}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : allComplete ? (
          <div className="text-center py-12">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <div className="text-sm font-medium text-gray-700 dark:text-zinc-300">All suggestions addressed!</div>
            <div className="text-xs text-gray-400 dark:text-zinc-505 mt-1">Your tree is in great shape.</div>
          </div>
        ) : (
          /* Render each tier */
          tierState.tiers.map(tier => {
            const colors = TIER_COLORS[tier.tier];
            const isActive = tier.isUnlocked && tier.visibleSuggestions.length > 0;
            const isLocked = !tier.isUnlocked;
            const isCompleted = tier.isUnlocked && tier.visibleSuggestions.length === 0 && tier.totalCount > 0;
            const isEmpty = tier.totalCount === 0;

            // Skip empty tiers entirely
            if (isEmpty) return null;

            return (
              <div key={tier.tier}>
                {/* Tier header */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isLocked ? 'bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 opacity-60' :
                  isCompleted ? `${colors.bg} ${colors.border} opacity-70` :
                    `${colors.bg} ${colors.border}`
                  }`}>
                  <div className={`${isLocked ? 'text-gray-400 dark:text-zinc-500' : colors.text}`}>
                    {isLocked ? <Lock className="w-4 h-4" /> :
                      isCompleted ? <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> :
                        TIER_ICONS[tier.tier]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-semibold ${isLocked ? 'text-gray-500 dark:text-zinc-400' : colors.text}`}>
                      {tier.label}
                    </div>
                    {isLocked && (
                      <div className="text-[10px] text-gray-400 dark:text-zinc-500">
                        Complete the above tier to unlock
                      </div>
                    )}
                    {isCompleted && (
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400">All addressed</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!isLocked && !isCompleted && (
                      <span className={`text-[10px] font-bold ${colors.text}`}>
                        {tier.visibleSuggestions.length} remaining
                      </span>
                    )}
                    {isLocked && (
                      <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium">
                        {tier.totalCount} items
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar for unlocked tiers */}
                {tier.isUnlocked && tier.totalCount > 0 && !isCompleted && (
                  <div className={`mx-3 mt-1.5 h-1 rounded-full ${colors.progressBg}`}>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${colors.progress}`}
                      style={{ width: `${tier.addressedPercent * 100}%` }}
                    />
                  </div>
                )}

                {/* Suggestion cards for active unlocked tiers */}
                {isActive && (
                  <div className="mt-2 space-y-2">
                    {tier.visibleSuggestions.map(suggestion => (
                      <div
                        key={suggestion.id}
                        className={`rounded-lg border border-l-4 p-3 bg-white dark:bg-[#1C1C1C] dark:border-zinc-800 ${PRIORITY_COLORS[suggestion.priority] || PRIORITY_COLORS.low}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-gray-500 dark:text-zinc-400 mt-0.5">
                            {ICON_MAP[suggestion.icon] || <Lightbulb className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 dark:text-zinc-200">
                              {(suggestion as Suggestion & { aiMessage?: string }).aiMessage || suggestion.message}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {/* {suggestion.unlockImpact != null && suggestion.unlockImpact > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                                  <Gem className="w-3 h-3" />
                                  Unlocks {suggestion.unlockImpact} {suggestion.unlockImpact === 1 ? 'person' : 'people'}
                                </span>
                              )} */}
                              {suggestion.type === 'missing-generation' && (
                                <span className="text-[10px] bg-blue-100 dark:bg-blue-950/40 text-[#2F3E8F] dark:text-[#8CA0FF] px-2 py-0.5 rounded-full">
                                  Missing generation
                                </span>
                              )}
                              {suggestion.type === 'broken-lineage' && (
                                <span className="text-[10px] bg-blue-100 dark:bg-blue-950/40 text-[#2F3E8F] dark:text-[#8CA0FF] px-2 py-0.5 rounded-full">
                                  Disconnected
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              {onFixSuggestion && suggestion.type !== 'prediction' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
                                  onClick={() => onFixSuggestion(suggestion)}
                                >
                                  Fix
                                  <ChevronRight className="w-3 h-3 ml-1" />
                                </Button>
                              )}
                              <button
                                onClick={() => handleDismiss(suggestion.id)}
                                className="text-xs text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
