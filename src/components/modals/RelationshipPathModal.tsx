/**
 * RelationshipPathModal - Advanced relationship path finder
 *
 * Features:
 * - Two PersonPicker dropdowns with swap button
 * - Rich result display with kinship term, explanation, and visual path
 * - Backend-computed step-by-step labels between each hop
 * - Hindi kinship terms with romanization
 * - Multiple paths: shows alternate relationships if found
 * - Common ancestors display
 * - Person photos with proper URL resolution
 * - Highlighted path on canvas via callback
 */

import { useState, useCallback, useMemo } from 'react';
import { Dialog, ResponsiveDialogContent as DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PersonPicker, formatPersonName } from '@/components/ui/PersonPicker';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowDown, Route, X, ArrowLeftRight, Users, Heart, Info, GitFork } from 'lucide-react';
import { /* fetchAllRelationshipPaths, */ type AllRelationshipPathsResult, type RelationshipPathResult } from '@/services/neo4jDataService';
import { aiApiCalls, type AIRelationshipResponse } from '@/api/apicalls';
import { lookupKinshipTerm, type KinshipTerm } from '@/data/indianKinshipTerms';
import type { StructuralRelationship } from '@/services/relationshipResolver';
import type { Person, Union } from '@/types';
import type { Relationship } from '@/services/elkLayoutService';
import { resolveBackendUrl } from '@/config/api';
import { useContributorStore } from '@/store/contributorStore';

interface RelationshipPathModalProps {
  open: boolean;
  onClose: () => void;
  persons: Person[];
  unions: Union[];
  relationships: Relationship[];
  treeId: string;
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

function PersonAvatar({ person, size = 'md' }: { person: Person; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const photoUrl = person.profilePhotoUrl ? resolveBackendUrl(person.profilePhotoUrl) : null;

  return (
    <div className={`${dim} rounded-full flex items-center justify-center ${textSize} font-bold shrink-0 ${person.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-[#2F3E8F]'
      }`}>
      {photoUrl ? (
        <img src={photoUrl} alt={person.firstName} className={`${dim} rounded-full object-cover`} />
      ) : (
        person.firstName[0]?.toUpperCase()
      )}
    </div>
  );
}

export function RelationshipPathModal({
  open,
  onClose,
  persons,
  unions: _unions,
  relationships: _relationships,
  treeId,
  onPathFound,
  onClearPath,
}: RelationshipPathModalProps) {
  const [personA, setPersonA] = useState<Person | null>(null);
  const [personB, setPersonB] = useState<Person | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [result, setResult] = useState<AllRelationshipPathsResult | null>(null);
  const [aiPathResult, setAiPathResult] = useState<AIRelationshipResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  const handleFindPath = useCallback(async () => {
    if (!personA || !personB) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Try structural API (may 404)
      // try {
      //   const allResult = await fetchAllRelationshipPaths(personA.personId, personB.personId, treeId);
      //   setResult(allResult);
      //   if (allResult.primaryPath.personIds.length > 0) {
      //     onPathFound?.(allResult.primaryPath.personIds);
      //   }
      // } catch (neoErr) {
      //   console.warn('Structural API failed, falling back to AI:', neoErr);
      // }

      // Try AI API
      setAiLoading(true);
      try {
        const aiResponse = await aiApiCalls.getRelationshipStory(treeId, personA.personId, personB.personId, nativeLanguage.trim() || '');
        setAiPathResult(aiResponse);
        if (aiResponse.path && aiResponse.path.length > 0 && !result) {
          const pathIds = [personA.personId, ...aiResponse.path.map(p => p.person_id)];
          onPathFound?.(pathIds);
        }
      } catch (aiErr) {
        console.error('AI API failed:', aiErr);
        if (!result) setError('Relationship information unavailable.');
      } finally {
        setAiLoading(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to find relationship path');
    } finally {
      setLoading(false);
    }
  }, [personA, personB, treeId, onPathFound, result, nativeLanguage]);

  const handleSwap = () => {
    const temp = personA;
    setPersonA(personB);
    setPersonB(temp);
    setResult(null);
    setAiPathResult(null);
    onClearPath?.();
  };

  const handleClose = () => {
    onClearPath?.();
    setResult(null);
    setAiPathResult(null);
    setError(null);
    setPersonA(null);
    setPersonB(null);
    onClose();
  };

  const derived = result?.primaryPath?.derivedRelationship;

  // Hindi kinship term for primary relationship
  const kinshipTerm: KinshipTerm | null = useMemo(() => {
    if (!derived) return null;
    try { return lookupKinshipTerm(mapToStructural(derived)); } catch { return null; }
  }, [derived]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="max-w-2xl !p-0 !gap-0 flex flex-col [&>button:last-child]:text-white [&>button:last-child]:opacity-80 [&>button:last-child]:hover:opacity-100 [&>button:last-child]:hover:bg-white/20 [&>button:last-child]:z-10"
        style={{ overflow: 'hidden', maxHeight: '85vh' }}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2F3E8F] to-[#25327A] px-6 py-4 rounded-t-2xl shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white text-lg">
              <Route className="w-5 h-5" />
              Relationship Finder
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/70 text-sm mt-1">
            Discover how two family members are related to each other
          </p>
        </div>

        {/* Form section */}
        <div className="px-6 pt-5 pb-3 space-y-4 shrink-0 relative z-10">
          <div className="flex items-end gap-2">
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
              className="p-2 mb-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors"
              title="Swap persons"
            >
              <ArrowLeftRight className="w-4 h-4 text-gray-500" />
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



          <div className="flex gap-2">
            <Button
              onClick={handleFindPath}
              disabled={!personA || !personB || loading}
              className="bg-[#2F3E8F] hover:bg-[#25327A] flex-1"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Finding relationship...
                </>
              ) : (
                <>
                  <Route className="w-4 h-4 mr-2" />
                  Find Relationship
                </>
              )}
            </Button>
            {(result || aiPathResult) && (
              <Button variant="outline" onClick={() => { onClearPath?.(); setResult(null); setAiPathResult(null); }}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Scrollable results section */}
        <div className="overflow-y-auto overscroll-contain px-6 pb-6 min-h-0">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-4 rounded-lg">
              {error}
            </div>
          )}

          {(aiLoading || aiPathResult) && (
            <div className="mb-4">
              <div className="text-[10px] font-semibold text-[#2F3E8F] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5" />
                AI Relationship Story
              </div>
              {aiLoading ? (
                <div className="flex items-center gap-2 py-3 px-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2F3E8F]" />
                  <span className="text-xs text-gray-500">Generating AI story...</span>
                </div>
              ) : aiPathResult && (
                <div className="bg-[#1a1a2e] text-white rounded-xl p-4 shadow-md ring-1 ring-white/10">
                  <p className="text-[13px] leading-relaxed mb-3">
                    {aiPathResult.text}
                  </p>
                  {aiPathResult.kinship && (aiPathResult.kinship.indian || aiPathResult.kinship.english) && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-white/10">
                      {aiPathResult.kinship.indian && (
                        <div className="px-2 py-0.5 bg-[#C2A46D]/20 rounded text-[11px] text-[#C2A46D] font-bold uppercase">
                          {aiPathResult.kinship.indian}
                        </div>
                      )}
                      {aiPathResult.kinship.english && (
                        <div className="px-2 py-0.5 bg-[#2F3E8F]/30 rounded text-[11px] text-white/90 font-medium capitalize">
                          {aiPathResult.kinship.english}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {((result && result.primaryPath.path.length > 0) || (aiPathResult && aiPathResult.path.length > 0)) && (
            <div className="space-y-4">

              {/* Relationship Card */}
              {derived && derived.relationship !== 'none' && (
                <div className="bg-gradient-to-br from-[#FDF8F3] to-[#E8EDFF] border border-[#E8D5C4] rounded-xl overflow-hidden">
                  <div className="px-6 py-5 text-center">
                    <div className="text-3xl font-bold text-[#8B5E3C] mb-1">
                      {derived.label}
                    </div>

                    {/* Hindi kinship term */}
                    {kinshipTerm && (
                      <div className="flex items-baseline justify-center gap-2 mt-1">
                        <span className="text-lg font-semibold text-[#5D4E3C]">{kinshipTerm.label}</span>
                        {kinshipTerm.romanization && (
                          <span className="text-sm text-[#8B7355] italic">({kinshipTerm.romanization})</span>
                        )}
                      </div>
                    )}

                    {derived.lineage && derived.lineage !== 'direct' && derived.lineage !== 'mixed' && derived.lineage !== 'unknown' && (
                      <div className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-white/60 rounded-full text-xs text-[#8B7355]">
                        <Users className="w-3 h-3" />
                        {derived.lineage === 'paternal' ? "Father's side" : "Mother's side"}
                      </div>
                    )}
                  </div>

                  {derived.description && (
                    <div className="px-6 py-4 bg-white/50 border-t border-[#E8D5C4]">
                      <div className="flex gap-2">
                        <Info className="w-4 h-4 text-[#2F3E8F] mt-0.5 shrink-0" />
                        <p className="text-sm text-[#5D4E3C] leading-relaxed">
                          {derived.description}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="px-6 py-2 bg-[#F5EDE4] flex items-center justify-between text-xs text-[#B8A090]">
                    <span>{result.primaryPath.path.length - 1} step{result.primaryPath.path.length > 2 ? 's' : ''} apart</span>
                    {result.pathCount > 1 && (
                      <span>{result.pathCount} path{result.pathCount > 1 ? 's' : ''} found</span>
                    )}
                  </div>
                </div>
              )}

              {/* Alternate relationships */}
              {result.alternatePaths.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-[#5D4E3C] mb-2 flex items-center gap-2">
                    <GitFork className="w-4 h-4 text-[#2F3E8F]" />
                    Also related as
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.alternatePaths.map((altPath, idx) => {
                      const altDerived = altPath.derivedRelationship;
                      if (!altDerived) return null;
                      return (
                        <div
                          key={idx}
                          className="px-3 py-2 bg-white border border-[#E8D5C4] rounded-lg text-sm"
                        >
                          <div className="font-medium text-[#8B5E3C]">{altDerived.label}</div>
                          {altDerived.lineage && altDerived.lineage !== 'direct' && altDerived.lineage !== 'unknown' && (
                            <div className="text-xs text-[#B8A090] mt-0.5">
                              {altDerived.lineage === 'paternal' ? "Father's side" : "Mother's side"}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Common Ancestors */}
              {result.commonAncestors.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-[#5D4E3C] mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#2F3E8F]" />
                    Common Ancestors
                  </div>
                  <div className="space-y-1.5">
                    {result.commonAncestors.map(ancestor => (
                      <div
                        key={ancestor.personId}
                        className="flex items-center gap-2.5 px-3 py-2 bg-white border border-[#E8D5C4] rounded-lg"
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${ancestor.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-[#2F3E8F]'
                          }`}>
                          {ancestor.firstName[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-[#3D2E1F] truncate">
                            {formatPersonName(ancestor)}
                          </div>
                          <div className="text-xs text-[#B8A090]">{ancestor.connectionType}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Visual Path */}
              <div>
                <div className="text-sm font-semibold text-[#5D4E3C] mb-3 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-[#2F3E8F]" />
                  Family Connection Path
                </div>
                {aiPathResult?.path && aiPathResult.path.length > 0 ? (
                  <div className="space-y-0">
                    {/* Simplified path visualization for AI result in modal */}
                    <div className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 bg-[#E8EDFF] border-[#2F3E8F] shadow-sm">
                      <PersonAvatar person={personA!} />
                      <div className="flex-1 min-w-0 font-semibold text-[#8B5E3C]">
                        {formatPersonName(personA)}
                      </div>
                      <span className="text-[10px] font-medium text-[#2F3E8F] bg-[#2F3E8F]/10 px-2 py-0.5 rounded-full">FROM</span>
                    </div>

                    {aiPathResult.path.map((step, idx) => (
                      <div key={idx}>
                        <div className="flex items-center gap-2 pl-8 py-1">
                          <ArrowDown className="w-3 h-3 text-[#2F3E8F]" />
                          <span className="text-xs text-[#B8A090] italic">{step.relation_to_previous || 'related to'}</span>
                        </div>
                        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-colors ${idx === aiPathResult.path.length - 1 ? 'bg-[#E8EDFF] border-[#2F3E8F] shadow-sm' : 'bg-white border-gray-200'}`}>
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500">{step.name?.[0]}</div>
                          <div className="flex-1 min-w-0 font-semibold text-gray-800">{step.name}</div>
                          {idx === aiPathResult.path.length - 1 && (
                            <span className="text-[10px] font-medium text-[#2F3E8F] bg-[#2F3E8F]/10 px-2 py-0.5 rounded-full">TO</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : result && (
                  <PathVisualization pathResult={result.primaryPath} />
                )}
              </div>
            </div>
          )}

          {/* No path found */}
          {((result && result.primaryPath.path.length === 0) || (!result && !aiPathResult && !loading && !aiLoading && personA && personB)) && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <div className="text-sm text-gray-500">
                No relationship path found between these two persons.
              </div>
              <div className="text-xs text-gray-400 mt-1">
                They may not be connected in this family tree.
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Renders the vertical path chain with person cards and step labels */
function PathVisualization({ pathResult }: { pathResult: RelationshipPathResult }) {
  const { path, stepLabels } = pathResult;

  return (
    <div className="space-y-0">
      {path.map((person, index) => {
        const isEndpoint = index === 0 || index === path.length - 1;
        // Use backend stepLabels if available
        const stepLabel = stepLabels && index < stepLabels.length
          ? stepLabels[index]?.label
          : null;

        return (
          <div key={person.personId}>
            {/* Person card */}
            <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-colors ${isEndpoint
              ? 'bg-[#E8EDFF] border-[#2F3E8F] shadow-sm'
              : 'bg-white border-gray-200'
              }`}>
              <PersonAvatar person={person} />

              <div className="flex-1 min-w-0">
                <div className={`font-semibold truncate ${isEndpoint ? 'text-[#8B5E3C]' : 'text-gray-800'}`}>
                  {formatPersonName(person)}
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  {person.gender === 'male' ? 'Male' : person.gender === 'female' ? 'Female' : ''}
                  {person.birthDate && (
                    <span>b. {new Date(person.birthDate).getFullYear()}</span>
                  )}
                  {!person.isLiving && person.deathDate && (
                    <span>d. {new Date(person.deathDate).getFullYear()}</span>
                  )}
                </div>
              </div>

              {isEndpoint && (
                <span className="text-[10px] font-medium text-[#2F3E8F] bg-[#2F3E8F]/10 px-2 py-0.5 rounded-full">
                  {index === 0 ? 'FROM' : 'TO'}
                </span>
              )}
            </div>

            {/* Step label arrow */}
            {index < path.length - 1 && (
              <div className="flex items-center gap-2 pl-8 py-1">
                <ArrowDown className="w-3 h-3 text-[#2F3E8F]" />
                <span className="text-xs text-[#B8A090] italic">
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
