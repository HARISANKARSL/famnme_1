/**
 * RelationshipPathPage - Interactive relationship path finder.
 *
 * Design: Dashboard-matching aesthetics with:
 *   - Warm hero empty state explaining the tool
 *   - Multi-language kinship terms (9 Indian languages)
 *   - AI-powered native language explanation
 *   - Dashboard-style result cards
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { PersonPicker, formatPersonName } from '@/components/ui/PersonPicker';
import { Loader2, ArrowDown, Route, ArrowLeft, ArrowLeftRight, Users, Heart, Info, GitFork, X, Gem, Globe, ChevronDown } from 'lucide-react';
import { /* fetchAllRelationshipPaths, */ fetchRelationshipExplanation, type AllRelationshipPathsResult, type RelationshipPathResult, type RelationshipExplanation } from '@/services/neo4jDataService';
import { aiApiCalls, type AIRelationshipResponse } from '@/api/apicalls';
import { lookupKinshipTerm, type KinshipTerm } from '@/data/indianKinshipTerms';
import { getKinshipPatterns, SUPPORTED_LOCALES } from '@/data/kinship';
import type { StructuralRelationship } from '@/services/relationshipResolver';
import type { Person, Union } from '@/types';
import type { Relationship } from '@/services/elkLayoutService';
import { resolveBackendUrl } from '@/config/api';
import { useResponsive } from '@/hooks/useResponsive';
import { useTreeStore } from '@/store/treeStore';
import { useContributorStore } from '@/store/contributorStore';

interface RelationshipPathPageProps {
  persons: Person[];
  unions: Union[];
  relationships: Relationship[];
  treeId: string;
  onBack: () => void;
  onPathFound?: (personIds: string[]) => void;
  onClearPath?: () => void;
}

function mapToStructural(dr: { relationship: string; degree: number; removed: number; lineage: string; gender: string; elderStatus?: 'elder' | 'younger' | null; guardianType?: string }): StructuralRelationship {
  return {
    relationship: dr.relationship as StructuralRelationship['relationship'],
    degree: dr.degree,
    removed: dr.removed,
    lineage: (dr.lineage === 'unknown' ? 'direct' : dr.lineage) as StructuralRelationship['lineage'],
    gender: (dr.gender || 'other') as 'male' | 'female' | 'other',
    elderStatus: dr.elderStatus ?? null,
    guardianType: dr.guardianType as StructuralRelationship['guardianType'],
  };
}

function PersonAvatar({ person, size = 'md' }: { person: Person; size?: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-14 h-14' };
  const textSizes = { sm: 'text-xs', md: 'text-sm', lg: 'text-xl' };
  const dim = dims[size];
  const textSize = textSizes[size];
  const photoUrl = person.profilePhotoUrl ? resolveBackendUrl(person.profilePhotoUrl) : null;

  return (
    <div className={`${dim} rounded-full flex items-center justify-center ${textSize} font-bold shrink-0 ring-2 ring-white dark:ring-[#242424] shadow-sm ${
      person.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-[#E8EDFF] text-[#2F3E8F]'
    }`}>
      {photoUrl ? (
        <img src={photoUrl} alt={person.firstName} className={`${dim} rounded-full object-cover`} />
      ) : (
        person.firstName[0]?.toUpperCase()
      )}
    </div>
  );
}

function PathVisualization({ pathResult }: { pathResult: RelationshipPathResult }) {
  const { path, stepLabels } = pathResult;

  return (
    <div className="space-y-0">
      {path.map((person, index) => {
        const isEndpoint = index === 0 || index === path.length - 1;
        const stepLabel = stepLabels && index < stepLabels.length ? stepLabels[index]?.label : null;

        return (
          <div key={person.personId}>
            <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors ${
              isEndpoint
                ? 'bg-white dark:bg-[#242424] shadow-sm ring-1 ring-[#2F3E8F]/20 dark:ring-[#5A6BFF]/20'
                : 'bg-white/60 dark:bg-[#1E1E1E]/60 ring-1 ring-stone-100 dark:ring-[#333]'
            }`}>
              <PersonAvatar person={person} size="sm" />
              <div className="flex-1 min-w-0">
                <div className={`font-semibold truncate text-[13px] ${isEndpoint ? 'text-[#3D2E1F] dark:text-[#F3F2F1]' : 'text-[#5D4E3C] dark:text-[#D4D0CC]'}`}>
                  {formatPersonName(person)}
                </div>
                <div className="text-[10px] text-[#8B7355] dark:text-[#999] flex items-center gap-2">
                  {person.gender === 'male' ? 'Male' : person.gender === 'female' ? 'Female' : ''}
                  {person.birthDate && <span>b. {new Date(person.birthDate).getFullYear()}</span>}
                </div>
              </div>
              {isEndpoint && (
                <span className="text-[9px] font-bold text-[#2F3E8F] dark:text-[#5A6BFF] bg-[#2F3E8F]/[0.08] dark:bg-[#5A6BFF]/[0.12] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {index === 0 ? 'From' : 'To'}
                </span>
              )}
            </div>
            {index < path.length - 1 && (
              <div className="flex items-center gap-2 pl-8 py-1.5">
                <ArrowDown className="w-3 h-3 text-[#C2A46D]" />
                <span className="text-[11px] text-[#8B7355] dark:text-[#999] italic">
                  {stepLabel ? stepLabel.toLowerCase() : 'related to'}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function RelationshipPathPage({
  persons,
  unions: _unions,
  relationships: _relationships,
  treeId,
  onBack,
  onPathFound,
  onClearPath,
}: RelationshipPathPageProps) {
  const { isMobile } = useResponsive();
  const locale = useTreeStore(s => s.locale);
  const [personA, setPersonA] = useState<Person | null>(null);
  const [personB, setPersonB] = useState<Person | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AllRelationshipPathsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // AI explanation state
  const [aiExplanation, setAiExplanation] = useState<RelationshipExplanation | null>(null);
  const [aiPathResult, setAiPathResult] = useState<AIRelationshipResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [detectedLang, setDetectedLang] = useState<string>('en');
  const [showNative, setShowNative] = useState(true);
  const nativeLanguage = useMemo(() => {
    try {
      const claimedId = useContributorStore.getState().myClaimedPersonId;
      if (claimedId) {
        const claimedPerson = persons.find(p => p.personId === claimedId);
        if (claimedPerson?.nativeLanguage) {
          return claimedPerson.nativeLanguage;
        }
      }
    } catch (e) {
      console.warn(e);
    }
    const homePerson = persons.find(p => p.isHomePerson);
    return homePerson?.nativeLanguage || '';
  }, [persons]);

  // Multi-language kinship
  const [multiLangTerm, setMultiLangTerm] = useState<{ label: string; romanization?: string; englishLabel: string; langName: string } | null>(null);

  const handleFindPath = useCallback(async () => {
    if (!personA || !personB) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setAiExplanation(null);
    setMultiLangTerm(null);

    try {
      // Try fetching structural path from Neo4j (may fail with 404)
      try {
        const allResult = await fetchAllRelationshipPaths(personA.personId, personB.personId, treeId);
        setResult(allResult);
        if (allResult.primaryPath.personIds.length > 0) {
          onPathFound?.(allResult.primaryPath.personIds);
        }
      } catch (neoErr) {
        console.warn('Structural Relationship API failed (likely 404), falling back to AI Story:', neoErr);
        // We continue because the AI API might still work
      }

      // Fetch AI Story from new API
      setAiLoading(true);
      try {
        const aiResponse = await aiApiCalls.getRelationshipStory(treeId, personA.personId, personB.personId, nativeLanguage.trim() || '');
        setAiPathResult(aiResponse);
        
        // If we don't have a Neo4j result, we can still set a minimal "hasResult" flag
        // or trigger path highlighting if the IDs are in the AI response
        if (aiResponse.path && aiResponse.path.length > 0) {
           const pathIds = [personA.personId, ...aiResponse.path.map(p => p.person_id)];
           onPathFound?.(pathIds);
        }
      } catch (aiErr) {
        console.error('AI Relationship API failed:', aiErr);
        if (!result) {
          setError('Could not find relationship information.');
        }
      } finally {
        setAiLoading(false);
      }

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to find relationship path');
    } finally {
      setLoading(false);
    }
  }, [personA, personB, treeId, onPathFound, result, nativeLanguage]);

  // Resolve multi-language kinship term when result changes
  const derived = result?.primaryPath?.derivedRelationship;

  // Legacy Hindi kinship term (fallback)
  const kinshipTerm: KinshipTerm | null = useMemo(() => {
    if (!derived) return null;
    try { return lookupKinshipTerm(mapToStructural(derived)); } catch { return null; }
  }, [derived]);

  // Load locale-specific kinship term
  useEffect(() => {
    if (!derived) return;
    const structural = mapToStructural(derived);

    const loadTerm = async () => {
      const targetLocale = locale || 'hi-IN';
      const patterns = await getKinshipPatterns(targetLocale);
      const localeName = SUPPORTED_LOCALES.find(l => l.code === targetLocale)?.nativeName || targetLocale;

      // Find matching pattern
      for (const pattern of patterns) {
        const m = pattern.match;
        let matches = true;
        if (m.relationship && m.relationship !== structural.relationship) matches = false;
        if (m.gender && m.gender !== structural.gender) matches = false;
        if (m.lineage && m.lineage !== structural.lineage) matches = false;
        if (m.degree !== undefined && m.degree !== structural.degree) matches = false;
        if (m.removed !== undefined && m.removed !== structural.removed) matches = false;
        if (m.elderStatus !== undefined && m.elderStatus !== structural.elderStatus) matches = false;
        if (matches) {
          setMultiLangTerm({
            label: pattern.term.label,
            romanization: pattern.term.romanization,
            englishLabel: pattern.term.englishLabel,
            langName: localeName,
          });
          return;
        }
      }
      // Fallback to legacy Hindi
      if (kinshipTerm) {
        setMultiLangTerm({
          label: kinshipTerm.label,
          romanization: kinshipTerm.romanization,
          englishLabel: derived.label || '',
          langName: 'हिन्दी',
        });
      }
    };
    loadTerm();
  }, [derived, locale, kinshipTerm]);

  // Auto-fetch AI explanation when result arrives (Keep original logic as fallback or enrichment)
  useEffect(() => {
    if (!result || !personA || !personB || result.primaryPath.path.length === 0) return;
    if (!derived || derived.relationship === 'none') return;
    if (aiPathResult) return; // Skip if we already have the new AI result

    const fetchAI = async () => {
      setAiLoading(true);
      try {
        const termForAI = multiLangTerm || (kinshipTerm ? {
          label: kinshipTerm.label,
          romanization: kinshipTerm.romanization,
          englishLabel: derived.label || '',
        } : undefined);

        const { explanation, detectedLanguage } = await fetchRelationshipExplanation(
          personA.personId, personB.personId, treeId,
          locale !== 'en' ? locale : undefined,
          termForAI,
        );
        setAiExplanation(explanation);
        setDetectedLang(detectedLanguage);
      } catch {
        // Non-critical
      } finally {
        setAiLoading(false);
      }
    };
    fetchAI();
  }, [result, personA, personB, treeId, derived, multiLangTerm, kinshipTerm, locale, aiPathResult]);

  const handleSwap = () => {
    const temp = personA;
    setPersonA(personB);
    setPersonB(temp);
    setResult(null);
    setAiExplanation(null);
    setAiPathResult(null);
    onClearPath?.();
  };

  const hasResult = (result && result.primaryPath.path.length > 0) || (aiPathResult && aiPathResult.path.length > 0);
  const langLabel = SUPPORTED_LOCALES.find(l => l.code === detectedLang)?.nativeName || detectedLang;

  return (
    <div className="absolute inset-0 z-40 bg-[#F2EFE9] dark:bg-[#000] flex flex-col">
      {/* Header */}
      <div className="shrink-0 h-14 flex items-center gap-3 px-4 md:px-6 border-b border-[#E2DBCE]/60 dark:border-[#2A2A2A] bg-white/80 dark:bg-[#1A1A1A]/80 backdrop-blur-sm">
        <button onClick={onBack} className="p-1.5 -ml-1.5 rounded-lg hover:bg-[#2F3E8F]/[0.06] dark:hover:bg-white/[0.06] transition-colors" aria-label="Back">
          <ArrowLeft className="w-5 h-5 text-[#3D2E1F] dark:text-[#D4D0CC]" />
        </button>
        <Route className="w-5 h-5 text-[#C2A46D]" strokeWidth={1.8} />
        <h1 className="text-[16px] font-bold text-[#3D2E1F] dark:text-[#F3F2F1]">Relationship Pathfinder</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full px-4 md:px-6 py-6 md:py-8 space-y-5">

          {/* ═══ Hero intro (when no result) ═══ */}
          {!hasResult && !loading && (
            <div className="text-center mb-2">
              {/* Visual hint — two circles connected */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#2F3E8F]/[0.08] flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#2F3E8F]" />
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#C2A46D]" />
                  <div className="w-6 h-px bg-[#C2A46D]" />
                  <div className="w-2 h-2 rounded-full bg-[#C2A46D]" />
                  <div className="w-6 h-px bg-[#C2A46D]" />
                  <div className="w-2 h-2 rounded-full bg-[#C2A46D]" />
                </div>
                <div className="w-12 h-12 rounded-full bg-[#4B2C5E]/[0.08] flex items-center justify-center">
                  <Heart className="w-5 h-5 text-[#4B2C5E]" />
                </div>
              </div>
              <p className="text-[14px] text-[#3D2E1F] dark:text-[#D4D0CC] font-medium mb-1">
                Discover how two family members are connected
              </p>
              <p className="text-[12px] text-[#8B7355] dark:text-[#999] max-w-sm mx-auto">
                Select two people below and we&apos;ll trace their family path, show the kinship term in your language, and explain the relationship with AI
              </p>
            </div>
          )}

          {/* ═══ Person pickers — dashboard card style ═══ */}
          <div className={`rounded-2xl bg-white dark:bg-[#242424] shadow-sm ring-1 ring-stone-100 dark:ring-[#333] p-4 md:p-5`}>
            <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-end gap-3'}`}>
              <div className="flex-1">
                <PersonPicker
                  persons={persons}
                  selectedPersonId={personA?.personId}
                  onSelect={setPersonA}
                  excludePersonIds={personB ? [personB.personId] : []}
                  label="From"
                  placeholder="Select a person..."
                />
              </div>

              <button
                onClick={handleSwap}
                disabled={!personA && !personB}
                className={`p-2.5 rounded-xl bg-[#F6F2EA] dark:bg-[#1E1E1E] ring-1 ring-stone-100 dark:ring-[#333] hover:ring-[#C2A46D]/40 disabled:opacity-30 transition-all ${
                  isMobile ? 'self-center' : 'mb-1'
                }`}
                title="Swap persons"
              >
                <ArrowLeftRight className="w-4 h-4 text-[#8B7355]" />
              </button>

              <div className="flex-1">
                <PersonPicker
                  persons={persons}
                  selectedPersonId={personB?.personId}
                  onSelect={setPersonB}
                  excludePersonIds={personA ? [personA.personId] : []}
                  label="To"
                  placeholder="Select a person..."
                />
              </div>
            </div>



            {/* Find button — inside the card */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleFindPath}
                disabled={!personA || !personB || loading}
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-[13px] font-semibold text-white disabled:opacity-40 transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ background: 'linear-gradient(180deg, #C2A46D, #A8894F)' }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Finding...
                  </>
                ) : (
                  <>
                    <Route className="w-4 h-4" />
                    Find Relationship
                  </>
                )}
              </button>
              {(result || aiPathResult) && (
                <button onClick={() => { onClearPath?.(); setResult(null); setAiExplanation(null); setAiPathResult(null); }}
                  className="h-10 px-3 rounded-xl bg-white dark:bg-[#333] ring-1 ring-stone-200 dark:ring-[#444] text-[#8B7355] hover:ring-[#C2A46D]/40 transition-all">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="text-[13px] text-red-600 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 p-4 rounded-2xl">
              {error}
            </div>
          )}

          {/* ═══ RESULTS ═══ */}
          {hasResult && (
            <div className="space-y-4">

              {/* ── Main Relationship Card — gradient hero ── */}
              <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-[#2F3E8F] to-[#4B2C5E] text-white">
                <div className="px-6 py-6 text-center relative">
                  {/* Decorative */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.03] rounded-full -translate-y-12 translate-x-12" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/[0.03] rounded-full translate-y-10 -translate-x-10" />

                  <div className="relative">
                    {/* Person avatars */}
                    <div className="flex items-center justify-center gap-4 mb-4">
                      {personA && <PersonAvatar person={personA} size="lg" />}
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-8 h-px bg-white/30" />
                        <Route className="w-4 h-4 text-[#C2A46D]" />
                        <div className="w-8 h-px bg-white/30" />
                      </div>
                      {personB && <PersonAvatar person={personB} size="lg" />}
                    </div>

                    {/* English relationship label */}
                    <div className="text-2xl md:text-3xl font-bold mb-1 capitalize">
                      {aiPathResult?.kinship?.english || derived?.label || 'Related'}
                    </div>

                    {/* Native kinship term */}
                    {(aiPathResult?.kinship?.indian || multiLangTerm) && (
                      <div className="mt-2">
                        <span className="text-xl font-semibold text-[#C2A46D]">
                          {aiPathResult?.kinship?.indian || multiLangTerm?.label}
                        </span>
                        {multiLangTerm?.romanization && !aiPathResult?.kinship?.indian && (
                          <span className="text-sm text-white/60 ml-2 italic">({multiLangTerm.romanization})</span>
                        )}
                        <div className="text-[10px] text-white/40 mt-0.5 uppercase tracking-wider">
                          {aiPathResult?.source === 'llm' ? 'AI Identified' : multiLangTerm?.langName}
                        </div>
                      </div>
                    )}

                    {/* Lineage badge */}
                    {derived?.lineage && derived.lineage !== 'direct' && derived.lineage !== 'mixed' && derived.lineage !== 'unknown' && (
                      <div className="inline-flex items-center gap-1 mt-3 px-3 py-1 bg-white/[0.1] rounded-full text-xs">
                        <Users className="w-3 h-3" />
                        {derived.lineage === 'paternal' ? "Father's side" : "Mother's side"}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats footer */}
                <div className="px-6 py-2.5 bg-black/[0.15] flex items-center justify-between text-[11px] text-white/50">
                  <span>
                    {aiPathResult?.kinship?.hop_count || (result ? result.primaryPath.path.length - 1 : 0)} step{(aiPathResult?.kinship?.hop_count || (result ? result.primaryPath.path.length - 1 : 0)) !== 1 ? 's' : ''} apart
                  </span>
                  {result && result.pathCount > 1 && <span>{result.pathCount} paths found</span>}
                </div>
              </div>

              {/* ── AI Explanation — dark navy card ── */}
              <div className="rounded-2xl bg-[#1a1a2e] ring-1 ring-[#2a2a4e] overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-[#C2A46D] via-[#2F3E8F] to-[#4B2C5E]" />
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Gem className="w-4 h-4 text-[#C2A46D]" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#C2A46D]">AI Explanation</span>
                    {(detectedLang !== 'en' || aiPathResult?.source === 'llm') && (
                      <span className="text-[10px] text-white/40 ml-auto flex items-center gap-1">
                        <Globe className="w-3 h-3" /> {aiPathResult?.source === 'llm' ? 'AI Story' : langLabel}
                      </span>
                    )}
                  </div>

                  {aiLoading ? (
                    <div className="flex items-center gap-2 py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-[#C2A46D]" />
                      <span className="text-[12px] text-white/50">Generating explanation...</span>
                    </div>
                  ) : aiPathResult ? (
                    <div className="space-y-4">
                       <p className="text-[14px] text-white/95 leading-relaxed font-medium">
                        {aiPathResult.text}
                      </p>
                      
                      {aiPathResult.kinship && (aiPathResult.kinship.indian || aiPathResult.kinship.english || (aiPathResult.kinship.hop_count !== undefined && aiPathResult.kinship.hop_count !== null)) && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                          {aiPathResult.kinship.indian && (
                            <div className="px-2.5 py-1 bg-[#C2A46D]/20 rounded-lg">
                              <span className="text-[10px] text-[#C2A46D] uppercase block font-bold mb-0.5">Indian Term</span>
                              <span className="text-[13px] text-white font-semibold">{aiPathResult.kinship.indian}</span>
                            </div>
                          )}
                          {aiPathResult.kinship.english && (
                            <div className="px-2.5 py-1 bg-[#2F3E8F]/20 rounded-lg">
                              <span className="text-[10px] text-[#2F3E8F] uppercase block font-bold mb-0.5">English</span>
                              <span className="text-[13px] text-white font-semibold capitalize">{aiPathResult.kinship.english}</span>
                            </div>
                          )}
                          {aiPathResult.kinship.hop_count !== undefined && aiPathResult.kinship.hop_count !== null && (
                            <div className="px-2.5 py-1 bg-white/5 rounded-lg">
                              <span className="text-[10px] text-white/40 uppercase block font-bold mb-0.5">Degrees</span>
                              <span className="text-[13px] text-white font-semibold">{aiPathResult.kinship.hop_count} hop{aiPathResult.kinship.hop_count !== 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : aiExplanation ? (
                    <div className="space-y-3">
                      {/* Native language explanation */}
                      {showNative && aiExplanation.nativeExplanation !== aiExplanation.englishExplanation && (
                        <div>
                          <p className="text-[13px] text-white/90 leading-relaxed">{aiExplanation.nativeExplanation}</p>
                        </div>
                      )}

                      {/* English explanation */}
                      <div>
                        {aiExplanation.nativeExplanation !== aiExplanation.englishExplanation && (
                          <button onClick={() => setShowNative(v => !v)} className="text-[10px] text-[#C2A46D] hover:text-[#C2A46D]/80 mb-1 flex items-center gap-1">
                            <ChevronDown className={`w-3 h-3 transition-transform ${showNative ? '' : '-rotate-90'}`} />
                            {showNative ? 'English translation' : 'Show native language'}
                          </button>
                        )}
                        <p className="text-[12px] text-white/60 leading-relaxed">{aiExplanation.englishExplanation}</p>
                      </div>

                      {/* Cultural note */}
                      {aiExplanation.culturalNote && (
                        <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
                          <Info className="w-3.5 h-3.5 text-[#C2A46D] mt-0.5 shrink-0" />
                          <p className="text-[11px] text-white/40 leading-relaxed italic">{aiExplanation.culturalNote}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[12px] text-white/30 py-2">AI explanation unavailable</p>
                  )}
                </div>
              </div>

              {/* ── Description (from backend) ── */}
              {derived?.description && (
                <div className="rounded-2xl bg-white dark:bg-[#242424] shadow-sm ring-1 ring-stone-100 dark:ring-[#333] p-4">
                  <div className="flex gap-2">
                    <Info className="w-4 h-4 text-[#2F3E8F] mt-0.5 shrink-0" />
                    <p className="text-[13px] text-[#5D4E3C] dark:text-[#D4D0CC] leading-relaxed">{derived.description}</p>
                  </div>
                </div>
              )}

              {/* ── Alternate relationships ── */}
              {result && result.alternatePaths.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold text-[#2F3E8F] dark:text-[#5A6BFF] uppercase tracking-[0.08em] mb-2 flex items-center gap-2">
                    <GitFork className="w-3.5 h-3.5" />
                    Also related as
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.alternatePaths.map((altPath, idx) => {
                      const altDerived = altPath.derivedRelationship;
                      if (!altDerived) return null;
                      return (
                        <div key={idx} className="px-3 py-2 bg-white dark:bg-[#242424] shadow-sm ring-1 ring-stone-100 dark:ring-[#333] rounded-xl text-[12px]">
                          <div className="font-semibold text-[#3D2E1F] dark:text-[#F3F2F1]">{altDerived.label}</div>
                          {altDerived.lineage && altDerived.lineage !== 'direct' && altDerived.lineage !== 'unknown' && (
                            <div className="text-[10px] text-[#8B7355] dark:text-[#999] mt-0.5">
                              {altDerived.lineage === 'paternal' ? "Father's side" : "Mother's side"}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Common Ancestors ── */}
              {result && result.commonAncestors && result.commonAncestors.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold text-[#2F3E8F] dark:text-[#5A6BFF] uppercase tracking-[0.08em] mb-2 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" />
                    Common Ancestors
                  </div>
                  <div className="space-y-1.5">
                    {result.commonAncestors.map(ancestor => (
                      <div key={ancestor.personId} className="flex items-center gap-2.5 px-3 py-2.5 bg-white dark:bg-[#242424] shadow-sm ring-1 ring-stone-100 dark:ring-[#333] rounded-xl">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          ancestor.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-[#E8EDFF] text-[#2F3E8F]'
                        }`}>
                          {ancestor.firstName[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-semibold text-[#3D2E1F] dark:text-[#F3F2F1] truncate">{formatPersonName(ancestor)}</div>
                          <div className="text-[10px] text-[#8B7355] dark:text-[#999]">{ancestor.connectionType}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Family Connection Path ── */}
              <div>
                <div className="text-[10px] font-semibold text-[#2F3E8F] dark:text-[#5A6BFF] uppercase tracking-[0.08em] mb-3 flex items-center gap-2">
                  <Heart className="w-3.5 h-3.5" />
                  Family Connection Path
                </div>
                {aiPathResult?.path && aiPathResult.path.length > 0 ? (
                   <div className="space-y-0">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-[#242424] shadow-sm ring-1 ring-[#2F3E8F]/20 dark:ring-[#5A6BFF]/20">
                      <PersonAvatar person={personA} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate text-[13px] text-[#3D2E1F] dark:text-[#F3F2F1]">
                          {formatPersonName(personA)}
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-[#2F3E8F] dark:text-[#5A6BFF] bg-[#2F3E8F]/[0.08] dark:bg-[#5A6BFF]/[0.12] px-2 py-0.5 rounded-full uppercase tracking-wider">
                        From
                      </span>
                    </div>

                    {aiPathResult.path.map((step, idx) => (
                      <div key={idx}>
                        <div className="flex items-center gap-2 pl-8 py-1.5">
                          <ArrowDown className="w-3 h-3 text-[#C2A46D]" />
                          <span className="text-[11px] text-[#8B7355] dark:text-[#999] italic">
                            {step.relation_to_previous || 'related to'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/60 dark:bg-[#1E1E1E]/60 ring-1 ring-stone-100 dark:ring-[#333]">
                           <div className="w-8 h-8 rounded-full bg-[#E8EDFF] flex items-center justify-center text-xs font-bold text-[#2F3E8F]">
                            {step.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate text-[13px] text-[#5D4E3C] dark:text-[#D4D0CC]">
                              {step.name}
                            </div>
                          </div>
                          {idx === aiPathResult.path.length - 1 && (
                            <span className="text-[9px] font-bold text-[#2F3E8F] dark:text-[#5A6BFF] bg-[#2F3E8F]/[0.08] dark:bg-[#5A6BFF]/[0.12] px-2 py-0.5 rounded-full uppercase tracking-wider">
                              To
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <PathVisualization pathResult={result.primaryPath} />
                )}
              </div>
            </div>
          )}

          {/* No path found */}
          {result && result.primaryPath.path.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-[#8B7355]/[0.08] flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7 text-[#8B7355]" />
              </div>
              <div className="text-[14px] font-medium text-[#3D2E1F] dark:text-[#D4D0CC]">
                No connection found
              </div>
              <div className="text-[12px] text-[#8B7355] dark:text-[#999] mt-1 max-w-xs mx-auto">
                These two family members don&apos;t appear to be connected in this tree. They may belong to different family branches.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
