/**
 * DuplicateDetectionPanel - Advanced duplicate detection with multi-signal scoring
 *
 * Features:
 * - Phonetic, fuzzy, structural, and biographical matching
 * - Category badges (name/structural/biographical/combined)
 * - Confidence meter with color-coded levels
 * - Profile photos and rich person cards
 * - Match reason tags with signal type icons
 */

import { useState, useCallback, useEffect } from 'react';

import { X, Search, Loader2, Merge, Users, GitBranch, User, Heart, Fingerprint, ArrowLeft } from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';
import { Button } from '@/components/ui/button';
import { fetchDuplicates, type DuplicatePair } from '@/services/neo4jDataService';
import { useToast } from '@/components/ui/use-toast';
import { aiApiCalls } from '@/api/apicalls';

interface DuplicateDetectionPanelProps {
  treeId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectPair?: (pair: DuplicatePair) => void;
  variant?: 'panel' | 'fullpage';
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return 'text-red-700 bg-red-100 border-red-200';
  if (confidence >= 60) return 'text-[#2F3E8F] bg-blue-100 border-[#2F3E8F]/30';
  if (confidence >= 40) return 'text-[#2F3E8F] bg-blue-100 border-[#2F3E8F]/30';
  return 'text-gray-600 bg-gray-100 border-gray-200';
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 80) return 'High';
  if (confidence >= 60) return 'Medium';
  if (confidence >= 40) return 'Low';
  return 'Possible';
}

function getConfidenceBarColor(confidence: number): string {
  if (confidence >= 80) return 'bg-red-500';
  if (confidence >= 60) return 'bg-[#E8EDFF]0';
  if (confidence >= 40) return 'bg-[#E8EDFF]0';
  return 'bg-gray-400';
}

function getCategoryIcon(category?: string) {
  switch (category) {
    case 'structural': return <GitBranch className="w-3 h-3" />;
    case 'biographical': return <Fingerprint className="w-3 h-3" />;
    case 'combined': return <Users className="w-3 h-3" />;
    default: return <User className="w-3 h-3" />;
  }
}

function getCategoryLabel(category?: string): string {
  switch (category) {
    case 'structural': return 'Graph Match';
    case 'biographical': return 'Bio Match';
    case 'combined': return 'Multi-Signal';
    default: return 'Name Match';
  }
}

function getCategoryColor(category?: string): string {
  switch (category) {
    case 'structural': return 'text-[#2F3E8F] bg-[#E8EDFF] border-[#2F3E8F]/30';
    case 'biographical': return 'text-teal-700 bg-teal-50 border-teal-200';
    case 'combined': return 'text-purple-700 bg-purple-50 border-purple-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

function getReasonIcon(reason: string) {
  if (reason.includes('Phonetic')) return <span className="text-[10px]">~</span>;
  if (reason.includes('Similar')) return <span className="text-[10px]">~</span>;
  if (reason.includes('parents') || reason.includes('children') || reason.includes('Married to'))
    return <Heart className="w-2.5 h-2.5" />;
  if (reason.includes('birth') || reason.includes('death'))
    return <Fingerprint className="w-2.5 h-2.5" />;
  return null;
}

function PersonCard({ person }: { person: DuplicatePair['person1'] }) {
  return (
    <div className="bg-white border border-gray-100 rounded-lg p-2.5 shadow-sm">
      <div className="flex items-center gap-2">
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
          person.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-[#2F3E8F]'
        }`}>
          {person.profilePhotoUrl ? (
            <img src={person.profilePhotoUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
          ) : (
            (person.firstName?.[0] || '?').toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm text-gray-900 truncate">
            {person.firstName} {person.lastName}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            {person.gender && <span className="capitalize">{person.gender}</span>}
            {person.birthDate && <span>b. {person.birthDate.slice(0, 4)}</span>}
            {person.deathDate && <span>d. {person.deathDate.slice(0, 4)}</span>}
          </div>
          {person.birthPlace && (
            <div className="text-[10px] text-gray-400 truncate">{person.birthPlace}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DuplicateDetectionPanel({ treeId, isOpen, onClose, onSelectPair, variant = 'panel' }: DuplicateDetectionPanelProps) {
  const { isMobile } = useResponsive();
  const [pairs, setPairs] = useState<DuplicatePair[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const { toast } = useToast();
  const [dismissingKeys, setDismissingKeys] = useState<string[]>([]);

  const handleScan = useCallback(async () => {
    setLoading(true);
    try {
      const results = await fetchDuplicates(treeId);
      setPairs(results);
      setScanned(true);
    } catch (err) {
      console.error('Failed to scan for duplicates:', err);
    } finally {
      setLoading(false);
    }
  }, [treeId]);

  const handleReviewLater = useCallback((pair: DuplicatePair) => {
    setPairs(prev => prev.filter(p => 
      !(p.person1.personId === pair.person1.personId && p.person2.personId === pair.person2.personId)
    ));
  }, []);

  const handleDismiss = useCallback(async (pair: DuplicatePair) => {
    const key = `${pair.person1.personId}-${pair.person2.personId}`;
    setDismissingKeys(prev => [...prev, key]);
    try {
      await aiApiCalls.dismissDuplicate(pair.person1.personId, pair.person2.personId);
      setPairs(prev => prev.filter(p => 
        !(p.person1.personId === pair.person1.personId && p.person2.personId === pair.person2.personId)
      ));
      toast({
        title: 'Duplicate Dismissed',
        description: 'The duplicate pair has been dismissed.',
      });
    } catch (err) {
      console.error('Failed to dismiss duplicate:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to dismiss duplicate pair.',
        variant: 'destructive',
      });
    } finally {
      setDismissingKeys(prev => prev.filter(k => k !== key));
    }
  }, [toast]);

  if (!isOpen) return null;


  const highCount = pairs.filter(p => p.confidence >= 80).length;
  const medCount = pairs.filter(p => p.confidence >= 60 && p.confidence < 80).length;
  const lowCount = pairs.filter(p => p.confidence < 60).length;

  const isFullpage = variant === 'fullpage';

  return (
    <div className={isFullpage
      ? 'absolute inset-0 z-40 bg-[#F6F2EA] dark:bg-[#141414] flex flex-col'
      : `fixed ${isMobile ? 'inset-0' : 'inset-y-0 right-0 w-[440px]'} bg-[#FAFAF8] shadow-xl z-50 flex flex-col border-l border-gray-200`
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
          <Merge className="w-5 h-5 text-[#C2A46D]" strokeWidth={1.8} />
          <h1 className="text-[16px] font-bold text-[#3D2E1F] dark:text-[#F3F2F1]">Duplicate Detection</h1>
        </div>
      ) : (
        <div className="flex items-center justify-between px-5 py-3.5 border-b bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
              <Fingerprint className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">Duplicate Detection</h2>
              <p className="text-[11px] text-gray-500">Phonetic + Fuzzy + Graph Analysis</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-purple-200/50 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      )}

      {/* Scan Button */}
      <div className="px-4 py-3 border-b bg-white">
        <Button onClick={handleScan} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing tree...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              {scanned ? 'Re-scan for Duplicates' : 'Scan for Duplicates'}
            </>
          )}
        </Button>
      </div>

      {/* Summary bar */}
      {scanned && pairs.length > 0 && (
        <div className="px-4 py-2 border-b bg-white flex items-center justify-between text-xs">
          <span className="text-gray-600 font-medium">{pairs.length} potential duplicate{pairs.length !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2">
            {highCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-[#2F3E8F] font-semibold">{highCount} high</span>
            )}
            {medCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-[#2F3E8F] font-semibold">{medCount} med</span>
            )}
            {lowCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-semibold">{lowCount} low</span>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      <div className={`flex-1 overflow-y-auto p-3 space-y-3 ${isMobile ? 'pb-16' : ''}`}>
        {!scanned ? (
          <div className="text-center py-12">
            <Fingerprint className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <div className="text-sm text-gray-500 mb-1">Advanced Duplicate Scanner</div>
            <div className="text-xs text-gray-400 max-w-[280px] mx-auto">
              Uses phonetic matching, fuzzy string comparison, graph-structural analysis, and biographical data to find potential duplicates.
            </div>
          </div>
        ) : pairs.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-10 h-10 text-green-300 mx-auto mb-3" />
            <div className="text-sm text-gray-600 font-medium">No duplicates found</div>
            <div className="text-xs text-gray-400 mt-1">Your tree data looks clean!</div>
          </div>
        ) : (
          pairs.map((pair, index) => (
            <div key={index} className="rounded-xl border bg-white p-3.5 hover:shadow-md transition-all hover:border-purple-200">
              {/* Top row: category + confidence */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getCategoryColor(pair.matchCategory)}`}>
                    {getCategoryIcon(pair.matchCategory)}
                    {getCategoryLabel(pair.matchCategory)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getConfidenceColor(pair.confidence)}`}>
                    {getConfidenceLabel(pair.confidence)} ({pair.confidence}%)
                  </span>
                </div>
              </div>

              {/* Confidence bar */}
              <div className="w-full h-1 bg-gray-100 rounded-full mb-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getConfidenceBarColor(pair.confidence)}`}
                  style={{ width: `${pair.confidence}%` }}
                />
              </div>

              {/* Side-by-side person cards */}
              <div className="grid grid-cols-2 gap-2 mb-2.5">
                <PersonCard person={pair.person1} />
                <PersonCard person={pair.person2} />
              </div>

              {/* Match reasons */}
              <div className="flex flex-wrap gap-1 mb-2.5">
                {pair.matchReasons.map((reason, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full border border-gray-100">
                    {getReasonIcon(reason)}
                    {reason}
                  </span>
                ))}
              </div>

              {/* Actions row */}
              <div className="space-y-2">
                {onSelectPair && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-8 text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
                    onClick={() => onSelectPair(pair)}
                  >
                    <Merge className="w-3 h-3 mr-1.5" />
                    Compare & Merge
                  </Button>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1 h-8 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-gray-100"
                    onClick={() => handleReviewLater(pair)}
                  >
                    Review Later
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1 h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 border border-transparent"
                    onClick={() => handleDismiss(pair)}
                    disabled={dismissingKeys.includes(`${pair.person1.personId}-${pair.person2.personId}`)}
                  >
                    {dismissingKeys.includes(`${pair.person1.personId}-${pair.person2.personId}`) ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                        Dismissing...
                      </>
                    ) : (
                      'Dismiss'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
