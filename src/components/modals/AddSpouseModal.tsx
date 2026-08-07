/**
 * AddSpouseModal - Modal for adding spouse with marriage validation
 *
 * Features:
 * - Validates marriages using gotra rules (Hindu tradition)
 * - Checks for consanguinity (blood relation)
 * - Detects existing marriages
 * - Inter-caste/inter-religion warnings
 * - Marriage ceremony type selection
 * - Living arrangement (joint vs nuclear family)
 *
 * @see services/marriageValidationService.ts
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, ResponsiveDialogContent as DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/DateInput';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Info, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { PersonFieldsCore } from '@/components/forms/PersonFieldsCore';
import { MarriagePatternFields } from '@/components/forms/MarriagePatternFields';
import { PersonPicker } from '@/components/ui/PersonPicker';
import { validateMarriage, type MarriageValidationResult } from '@/services/marriageValidationService';
import { getPersonSpouses } from '@/utils/unionHelpers';
import type { Person, Union, ValidationConfig } from '@/types';
import type { Relationship } from '@/services/elkLayoutService';
import { RelationshipBreadcrumb, buildRelationshipChain } from '@/components/ui/RelationshipBreadcrumb';
import * as neo4jAPI from '@/services/neo4jDataService';
import { validatePersonDates, validateUnionDates, type TemporalWarning } from '@/services/temporalValidationService';
import { useFormValidation } from '@/hooks/useFormValidation';
import { isCustomReligion, isCustomLanguage } from '@/components/forms/CulturalMetadataFields';

// ============================================================================
// Types
// ============================================================================

export interface AddSpouseModalProps {
  open: boolean;
  onClose: () => void;
  referencePerson: Person;
  allPersons: Person[];
  unions: Union[];
  relationships: Relationship[];
  onSubmit: (spouseData: SpouseFormData, unionData: UnionFormData) => Promise<void>;
  onMarryExisting?: (spouseId: string, unionData: UnionFormData) => Promise<void>;
  treeId?: string;
  userTrees?: Array<{ treeId: string; treeName: string }>;
  existingSpouses?: Array<{ spouse: Person; union: Union }>;
}

export interface SpouseFormData {
  firstName: string;
  lastName: string;
  middleName?: string;
  maidenName?: string;
  gender: 'male' | 'female' | 'other';
  birthDate?: string;
  birthPlace?: string;
  isLiving: boolean;
  deathDate?: string;
  deathPlace?: string;
  occupation?: string;
  education?: string;
  elderStatus?: 'elder' | 'younger';

  // Cultural metadata
  gotra?: string;
  caste?: string;
  religion?: string;
  nativePlace?: string;
  nativeLanguage?: string;
  biography?: string;
}

export interface UnionFormData {
  type: 'marriage' | 'partnership';
  startDate?: string;
  endDate?: string;
  marriagePlace?: string;
  ceremonyType?: 'arranged' | 'love' | 'inter-caste' | 'inter-religion';
  livingArrangement?: 'joint' | 'nuclear';
  notes?: string;
  marriagePattern?: 'standard' | 'levirate' | 'sororate' | 'polyandry' | 'polygyny' | 'consanguineous';
  precedingUnionId?: string;
  culturalContext?: string;
  validationOverrides?: string[];
  husbandTreeId?: string;
  wifeTreeId?: string;
}

// ============================================================================
// Component
// ============================================================================

export function AddSpouseModal({
  open,
  onClose,
  referencePerson,
  allPersons,
  unions,
  relationships,
  onSubmit,
  onMarryExisting,
  treeId,
  userTrees = [],
  existingSpouses,
}: AddSpouseModalProps) {
  const { toast } = useToast();
  const { errors, validateField, sanitizeInput, validateStep, resetValidation } = useFormValidation();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<MarriageValidationResult | null>({ valid: true, errors: [], warnings: [] });
  const [validationConfig, setValidationConfig] = useState<ValidationConfig | null>(null);
  const [temporalWarnings, setTemporalWarnings] = useState<TemporalWarning[]>([]);
  const [temporalAcknowledged, setTemporalAcknowledged] = useState(false);

  const [showAdditional, setShowAdditional] = useState(false);

  // Selection mode: 'new' or 'existing'
  const [selectionMode, setSelectionMode] = useState<'new' | 'existing'>('new');
  const [selectedExistingPerson, setSelectedExistingPerson] = useState<Person | null>(null);

  // Note: Gender is no longer auto-set to support same-sex marriages
  const [spouseData, setSpouseData] = useState<Partial<SpouseFormData>>({
    isLiving: true,
    gender: undefined, // Let user select any gender
  });

  const [unionData, setUnionData] = useState<Partial<UnionFormData>>({
    type: 'marriage',
  });

  // Calculate excluded persons for existing person picker
  const excludedPersonIds = useMemo(() => {
    const excluded: string[] = [referencePerson.personId];
    const existingSpouses = getPersonSpouses(
      referencePerson.personId,
      allPersons,
      unions,
      relationships
    );
    const existingSpouseIds = existingSpouses.map(s => s.spouse.personId);

    // Only exclude existing spouses in strict mode
    if (validationConfig?.consanguinityLevel === 'strict' &&
      !validationConfig?.allowPolyandry &&
      !validationConfig?.allowPolygyny) {
      excluded.push(...existingSpouseIds);
    }
    return excluded;
  }, [referencePerson, allPersons, unions, relationships, validationConfig]);

  // Ref for debounce timer and mounted state
  const validationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    if (open) {
      resetValidation();
    }
  }, [open, resetValidation]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (validationTimerRef.current) clearTimeout(validationTimerRef.current);
    };
  }, []);

  // ============================================================================
  // Load Validation Config (cached per treeId)
  // ============================================================================

  const validationConfigCacheRef = useRef<{ treeId: string; config: ValidationConfig } | null>(null);

  useEffect(() => {
    if (!open || !treeId) return;

    // Use cached config if same tree
    if (validationConfigCacheRef.current?.treeId === treeId) {
      setValidationConfig(validationConfigCacheRef.current.config);
      return;
    }

    let cancelled = false;
    const loadValidationConfig = async () => {
      try {
        const config = await neo4jAPI.getTreeValidationConfig(treeId);
        if (!cancelled) {
          setValidationConfig(config);
          validationConfigCacheRef.current = { treeId, config };
        }
      } catch (error) {
        console.error('Failed to load validation config:', error);
        if (!cancelled) {
          const fallback: ValidationConfig = {
            consanguinityLevel: 'strict',
            allowPolyandry: false,
            allowPolygyny: false,
            allowUncleNieceMarriage: false,
            allowAuntNephewMarriage: false,
          };
          setValidationConfig(fallback);
        }
      }
    };
    loadValidationConfig();
    return () => { cancelled = true; };
  }, [open, treeId]);

  // ============================================================================
  // Validation (debounced 400ms)
  // ============================================================================

  // useEffect(() => {
  //   // Clear any pending validation
  //   if (validationTimerRef.current) clearTimeout(validationTimerRef.current);
  // 
  //   // Validate based on selection mode
  //   if (selectionMode === 'existing') {
  //     if (!selectedExistingPerson) {
  //       setValidationResult({ valid: true, errors: [], warnings: [] });
  //       return;
  //     }
  // 
  //     // Existing person selection: validate immediately (no typing involved)
  //     let cancelled = false;
  //     const validateAsync = async () => {
  //       setValidating(true);
  //       try {
  //         const result = await validateMarriage({
  //           person1: referencePerson,
  //           person2: selectedExistingPerson,
  //           allPersons,
  //           unions,
  //           relationships,
  //           enforceGotraRule: referencePerson.religion === 'Hindu' || selectedExistingPerson.religion === 'Hindu',
  //           validationConfig: validationConfig || undefined,
  //         });
  //         if (!cancelled) setValidationResult(result);
  //       } catch (error) {
  //         console.error('Validation failed:', error);
  //       } finally {
  //         if (!cancelled) setValidating(false);
  //       }
  //     };
  //     validateAsync();
  //     return () => { cancelled = true; };
  //   } else {
  //     // Mode: 'new' — debounce validation while user types
  //     if (!spouseData.firstName || !spouseData.lastName) {
  //       setValidationResult({ valid: true, errors: [], warnings: [] });
  //       return;
  //     }
  // 
  //     validationTimerRef.current = setTimeout(() => {
  //       let cancelled = false;
  // 
  //       const validateAsync = async () => {
  //         if (!isMountedRef.current) return;
  //         setValidating(true);
  // 
  //         try {
  //           const tempSpouse: Person = {
  //             personId: 'temp-spouse',
  //             firstName: spouseData.firstName!,
  //             lastName: spouseData.lastName!,
  //             gender: spouseData.gender || 'other',
  //             isLiving: spouseData.isLiving ?? true,
  //             isHomePerson: false,
  //             gotra: spouseData.gotra,
  //             caste: spouseData.caste,
  //             religion: spouseData.religion,
  //             createdBy: 'temp',
  //             createdAt: new Date().toISOString(),
  //             updatedAt: new Date().toISOString(),
  //           };
  // 
  //           const result = await validateMarriage({
  //             person1: referencePerson,
  //             person2: tempSpouse,
  //             allPersons,
  //             unions,
  //             relationships,
  //             enforceGotraRule: referencePerson.religion === 'Hindu' || tempSpouse.religion === 'Hindu',
  //             validationConfig: validationConfig || undefined,
  //           });
  // 
  //           if (!cancelled && isMountedRef.current) {
  //             setValidationResult(result);
  // 
  //             // Inter-caste/inter-religion are now shown as auto-detected tags
  //             // in the validation warnings area, not set as ceremonyType
  //           }
  //         } catch (error) {
  //           console.error('Validation failed:', error);
  //         } finally {
  //           if (!cancelled && isMountedRef.current) setValidating(false);
  //         }
  //       };
  // 
  //       validateAsync();
  // 
  //       // Return cleanup won't work inside setTimeout, but the cancelled flag + isMountedRef handles it
  //     }, 400);
  // 
  //       return () => {
  //         if (validationTimerRef.current) clearTimeout(validationTimerRef.current);
  //       };
  //     }
  //   }, [selectionMode, selectedExistingPerson, spouseData.firstName, spouseData.lastName, spouseData.gotra, spouseData.religion, spouseData.caste, validationConfig]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validationResult?.valid && validationResult?.errors.some((e) => e.severity === 'error')) {
      toast({
        title: 'Validation Failed',
        description: 'Please fix errors before proceeding',
        variant: 'destructive',
      });
      return;
    }

    const unionConfigs = {
      startDate: { required: false, type: 'date', label: 'Marriage date' },
      marriagePlace: { required: false, type: 'location', label: 'Marriage place' },
      notes: { required: false, type: 'description', label: 'Notes' },
    };

    const unionFieldsToValidate = {
      startDate: unionData.startDate || '',
      marriagePlace: (unionData.marriagePlace || '').trim(),
      notes: (unionData.notes || '').trim(),
    };

    const isUnionValid = validateStep(unionFieldsToValidate, unionConfigs as any);

    let updatedSpouseData = { ...spouseData };
    if (selectionMode === 'new') {
      const configs = {
        firstName: { required: true, type: 'name', label: 'First name' },
        lastName: { required: false, type: 'name', label: 'Last name' },
        gender: { required: true, type: 'name', label: 'Gender' },
        middleName: { required: false, type: 'name', label: 'Middle name' },
        maidenName: { required: false, type: 'name', label: 'Maiden name' },
        biography: { required: false, type: 'biography', label: 'Biography' },
        birthDate: { required: false, type: 'date', label: 'Birth date' },
        deathDate: { required: false, type: 'date', label: 'Death date' },
        religion: { required: false, type: 'name', label: 'Religion' },
        nativeLanguage: { required: false, type: 'name', label: 'Native Language' },
      };

      const fieldsToValidate = {
        firstName: (spouseData.firstName || '').trim(),
        lastName: (spouseData.lastName || '').trim(),
        gender: spouseData.gender || '',
        middleName: (spouseData.middleName || '').trim(),
        maidenName: (spouseData.maidenName || '').trim(),
        biography: (spouseData.biography || '').trim(),
        birthDate: spouseData.birthDate || '',
        deathDate: spouseData.isLiving === false ? spouseData.deathDate || '' : '',
        religion: spouseData.religion === 'Other' ? '' : (spouseData.religion || ''),
        nativeLanguage: spouseData.nativeLanguage === 'Other' ? '' : (spouseData.nativeLanguage || ''),
      };

      const isPersonValid = validateStep(fieldsToValidate, configs as any);
      if (!isPersonValid || !isUnionValid) {
        toast({
          title: 'Validation Failed',
          description: 'Please correct the highlighted fields.',
          variant: 'destructive',
        });
        return;
      }

      updatedSpouseData = {
        ...spouseData,
        firstName: (spouseData.firstName || '').trim(),
        lastName: (spouseData.lastName || '').trim(),
        middleName: spouseData.middleName ? spouseData.middleName.trim() : undefined,
        maidenName: spouseData.maidenName ? spouseData.maidenName.trim() : undefined,
        biography: spouseData.biography ? spouseData.biography.trim() : undefined,
      };
    } else {
      if (!isUnionValid) {
        toast({
          title: 'Validation Failed',
          description: 'Please correct the highlighted fields.',
          variant: 'destructive',
        });
        return;
      }
    }

    // Check if cultural context is required but not provided
    if (validationResult?.warnings.some(w => w.requiresJustification) && !unionData.culturalContext?.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide cultural/historical context for this marriage pattern',
        variant: 'destructive',
      });
      return;
    }

    // Temporal validation for dates
    if (!temporalAcknowledged) {
      const tempWarnings: TemporalWarning[] = [];
      if (selectionMode === 'new') {
        tempWarnings.push(...validatePersonDates(updatedSpouseData));
      }
      const spouseForDates = selectionMode === 'existing' ? selectedExistingPerson : updatedSpouseData;
      if (spouseForDates && unionData.startDate) {
        tempWarnings.push(...validateUnionDates(
          { startDate: unionData.startDate, endDate: unionData.endDate },
          referencePerson,
          spouseForDates,
          referencePerson.firstName,
          selectionMode === 'existing' ? selectedExistingPerson?.firstName : updatedSpouseData.firstName || 'Spouse'
        ));
      }
      if (tempWarnings.length > 0) {
        setTemporalWarnings(tempWarnings);
        return;
      }
    }

    if (selectionMode === 'existing') {
      // Validate existing person selection
      if (!selectedExistingPerson) {
        toast({
          title: 'Error',
          description: 'Please select a person from the tree',
          variant: 'destructive',
        });
        return;
      }

      try {
        setLoading(true);

        // Collect validation overrides
        const validationOverrides = validationResult?.warnings.map(w => w.code) || [];

        const finalUnionData: UnionFormData = {
          ...unionData,
          type: unionData.type || 'marriage',
          validationOverrides: validationOverrides.length > 0 ? validationOverrides : undefined,
        };

        if (onMarryExisting) {
          // Delegate to parent handler (supports move-children prompt)
          await onMarryExisting(selectedExistingPerson.personId, finalUnionData);
        } else {
          // Fallback: call API directly
          await neo4jAPI.createUnionBetweenExisting(
            treeId!,
            referencePerson.personId,
            selectedExistingPerson.personId,
            {
              type: finalUnionData.type || 'marriage',
              startDate: finalUnionData.startDate,
              marriagePlace: finalUnionData.marriagePlace,
              notes: finalUnionData.notes,
              marriagePattern: finalUnionData.marriagePattern,
              culturalContext: finalUnionData.culturalContext,
              precedingUnionId: finalUnionData.precedingUnionId,
              validationOverrides: finalUnionData.validationOverrides,
            }
          );
          onClose();
        }

        toast({
          title: 'Success',
          description: 'Marriage created successfully',
        });

        handleClose();
      } catch (error) {
        console.error('Failed to create marriage:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to create marriage',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    } else {
      // Mode: 'new' - create new spouse
      try {
        setLoading(true);

        // Collect validation overrides (warning codes that were acknowledged)
        const validationOverrides = validationResult?.warnings.map(w => w.code) || [];

        const finalUnionData: UnionFormData = {
          ...unionData,
          type: unionData.type || 'marriage',
          validationOverrides: validationOverrides.length > 0 ? validationOverrides : undefined,
        };

        await onSubmit(updatedSpouseData as SpouseFormData, finalUnionData);
        handleClose();
      } catch (error) {
        console.error('Failed to add spouse:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to add spouse',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleClose = () => {
    setSpouseData({ isLiving: true, gender: undefined }); // Reset without auto-gender
    setUnionData({ type: 'marriage' });
    setValidationResult(null);
    setSelectionMode('new');
    setSelectedExistingPerson(null);
    setShowAdditional(false);
    resetValidation();
    onClose();
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Add Spouse for {referencePerson.firstName} {referencePerson.lastName}
          </DialogTitle>
        </DialogHeader>

        {/* Breadcrumb Trail */}
        <div className="px-6">
          <RelationshipBreadcrumb
            steps={buildRelationshipChain(
              'spouse',
              referencePerson.firstName,
              undefined // No home person context needed for spouse
            )}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tab Bar: Create New | Select Existing */}
          <div className="flex border-b">
            <button
              type="button"
              onClick={() => { setSelectionMode('new'); setValidationResult(null); }}
              className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors border-b-2 ${selectionMode === 'new'
                ? 'border-[#2F3E8F] text-[#2F3E8F]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              Create New Person
            </button>
            <button
              type="button"
              onClick={() => { setSelectionMode('existing'); setValidationResult(null); }}
              className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors border-b-2 ${selectionMode === 'existing'
                ? 'border-[#2F3E8F] text-[#2F3E8F]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              Select Existing Person
            </button>
          </div>

          {/* Multiple Marriage Notice */}
          {existingSpouses && existingSpouses.length > 0 && (
            <Alert className="bg-[#E8EDFF] border-[#2F3E8F]/30">
              <Info className="h-4 w-4 text-[#2F3E8F]" />
              <AlertDescription className="text-blue-800">
                <p className="font-medium mb-1">
                  {referencePerson.firstName} has {existingSpouses.length} existing marriage{existingSpouses.length > 1 ? 's' : ''}
                </p>
                <ul className="text-sm space-y-0.5 mb-2">
                  {existingSpouses.map(({ spouse, union }) => (
                    <li key={union.unionId}>
                      {spouse.firstName} {spouse.lastName}
                      {union.startDate && ` (${new Date(union.startDate).getFullYear()})`}
                      {union.endDate ? ` - ended` : ' - active'}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-[#2F3E8F]">
                  Adding a new spouse will create an additional marriage record.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Existing Person Picker (only shown in 'existing' mode) */}
          {selectionMode === 'existing' && (
            <div className="space-y-4">
              <PersonPicker
                persons={allPersons}
                selectedPersonId={selectedExistingPerson?.personId}
                onSelect={setSelectedExistingPerson}
                excludePersonIds={excludedPersonIds}
                label="Select Spouse from Tree *"
                placeholder="Search for person in tree..."
              />

              {/* Selected Person Preview */}
              {selectedExistingPerson && (
                <div className="border rounded-lg p-4 bg-muted/50">
                  <h3 className="font-semibold mb-2">Selected Person</h3>
                  <div className="text-sm space-y-1">
                    <p><strong>Name:</strong> {selectedExistingPerson.firstName} {selectedExistingPerson.lastName}</p>
                    {selectedExistingPerson.birthDate && (
                      <p><strong>Born:</strong> {selectedExistingPerson.birthDate}</p>
                    )}
                    {selectedExistingPerson.gender && (
                      <p><strong>Gender:</strong> <span className="capitalize">{selectedExistingPerson.gender}</span></p>
                    )}
                    {selectedExistingPerson.occupation && (
                      <p><strong>Occupation:</strong> {selectedExistingPerson.occupation}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Validation Status */}
          {/* {validating && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>Validating marriage...</AlertDescription>
            </Alert>
          )}

          {validationResult && validationResult.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {validationResult.errors.map((error, i) => (
                    <li key={i}>{error.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {validationResult && validationResult.warnings.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {validationResult.warnings.map((warning, i) => (
                    <li key={i}>{warning.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {validationResult && validationResult.valid && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Marriage validation passed!
              </AlertDescription>
            </Alert>
          )} */}

          {/* Marriage Pattern Selection (shown when warnings require it) */}
          {validationResult && (
            <MarriagePatternFields
              unionData={unionData}
              setUnionData={(data) => setUnionData(prev => ({ ...prev, ...data }) as Partial<UnionFormData>)}
              validationResult={validationResult}
              unions={unions}
              relationships={relationships}
              referencePerson={referencePerson}
            />
          )}

          {/* Person Fields (only for 'new' mode) */}
          {selectionMode === 'new' && (
            <PersonFieldsCore
              values={spouseData}
              onChange={(updates) => setSpouseData(prev => ({ ...prev, ...updates }) as Partial<SpouseFormData>)}
              mode="quick-add"
              showBiography={true}
              referencePerson={referencePerson}
              disabled={loading}
              errors={errors}
              validateField={validateField}
              sanitizeInput={sanitizeInput}
              hideElderStatus={true}
            />
          )}

          {/* Union Type (essential) */}
          <div>
            <Label htmlFor="unionType">Relationship Type</Label>
            <Select
              value={unionData.type || 'marriage'}
              onValueChange={(value) =>
                setUnionData({ ...unionData, type: value as 'marriage' | 'partnership' })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="marriage">Marriage (विवाह)</SelectItem>
                <SelectItem value="partnership">Partnership / Live-in</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Toggle Button */}
          <button
            type="button"
            onClick={() => setShowAdditional(!showAdditional)}
            className="flex items-center gap-2 text-sm text-[#2F3E8F] hover:text-[#8B5E3C] font-medium py-2"
          >
            {showAdditional ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showAdditional ? 'Hide additional details' : 'Show additional details'}
          </button>

          {/* Additional Details (collapsed) */}
          {showAdditional && (
            <div className="space-y-4">
              {/* Marriage Details */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-sm font-semibold">Marriage Details</h3>

                <div>
                  <Label htmlFor="ceremonyType">Ceremony Type</Label>
                  <Select
                    value={unionData.ceremonyType || 'not-specified'}
                    onValueChange={(value) =>
                      setUnionData({ ...unionData, ceremonyType: value === 'not-specified' ? undefined : value as UnionFormData['ceremonyType'] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not-specified">Not specified</SelectItem>
                      <SelectItem value="arranged">Arranged (व्यवस्थित विवाह)</SelectItem>
                      <SelectItem value="love">Love Marriage (प्रेम विवाह)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Marriage Date</Label>
                    <DateInput
                      id="startDate"
                      value={unionData.startDate || ''}
                      onChange={(e) => {
                        setUnionData({ ...unionData, startDate: e.target.value });
                        validateField('startDate', e.target.value, { required: false, type: 'date', label: 'Marriage date' });
                      }}
                      onBlur={(e) => {
                        validateField('startDate', e.target.value, { required: false, type: 'date', label: 'Marriage date' });
                      }}
                      max={new Date().toISOString().split('T')[0]}
                    />
                    {errors.startDate && (
                      <span className="text-[11px] text-red-500 font-medium mt-1.5 px-1 block animate-in fade-in-50 slide-in-from-top-1 duration-150">
                        {errors.startDate}
                      </span>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="marriagePlace">Marriage Place</Label>
                    <Input
                      id="marriagePlace"
                      value={unionData.marriagePlace || ''}
                      onChange={(e) => {
                        const val = sanitizeInput(e.target.value);
                        setUnionData({ ...unionData, marriagePlace: val });
                        validateField('marriagePlace', val, { required: false, type: 'location', label: 'Marriage place' });
                      }}
                      onBlur={(e) => {
                        validateField('marriagePlace', e.target.value, { required: false, type: 'location', label: 'Marriage place' });
                      }}
                      error={errors.marriagePlace}
                      showCharCount
                      charLimit={50}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={unionData.notes || ''}
                    onChange={(e) => {
                      const val = sanitizeInput(e.target.value);
                      setUnionData({ ...unionData, notes: val });
                      validateField('notes', val, { required: false, type: 'description', label: 'Notes' });
                    }}
                    onBlur={(e) => {
                      validateField('notes', e.target.value, { required: false, type: 'description', label: 'Notes' });
                    }}
                    placeholder="Any additional context about this marriage"
                    error={errors.notes}
                    showCharCount
                    charLimit={300}
                  />
                </div>
              </div>

              {/* Tree Navigation Setup */}
              {/* {userTrees.length > 0 && (
                <div className="space-y-4 border-t pt-4 mt-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-semibold">Family Tree Navigation (Optional)</Label>
                    <Info className="w-4 h-4 text-gray-400" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="husbandTreeId">Husband's Family Tree</Label>
                      <Select
                        value={unionData.husbandTreeId || 'none'}
                        onValueChange={(value) => setUnionData({ ...unionData, husbandTreeId: value === 'none' ? undefined : value })}
                      >
                        <SelectTrigger id="husbandTreeId">
                          <SelectValue placeholder="Select tree (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {userTrees.map(tree => (
                            <SelectItem key={tree.treeId} value={tree.treeId}>
                              {tree.treeName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="wifeTreeId">Wife's Family Tree</Label>
                      <Select
                        value={unionData.wifeTreeId || 'none'}
                        onValueChange={(value) => setUnionData({ ...unionData, wifeTreeId: value === 'none' ? undefined : value })}
                      >
                        <SelectTrigger id="wifeTreeId">
                          <SelectValue placeholder="Select tree (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {userTrees.map(tree => (
                            <SelectItem key={tree.treeId} value={tree.treeId}>
                              {tree.treeName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500">
                    Configure navigation icons to switch between family trees.
                    Icons will appear on the person cards.
                  </p>
                </div>
              )} */}

            </div>
          )}

          {/* Temporal Validation Warnings */}
          {temporalWarnings.length > 0 && !temporalAcknowledged && (
            <div className="bg-[#E8EDFF] border border-[#2F3E8F]/30 rounded-lg p-3 space-y-2">
              <p className="text-blue-800 font-medium text-sm">Date consistency warnings:</p>
              <ul className="text-[#2F3E8F] text-sm space-y-1 ml-4 list-disc">
                {temporalWarnings.map((w) => (
                  <li key={w.code}>{w.message}</li>
                ))}
              </ul>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setTemporalAcknowledged(true);
                  setTemporalWarnings([]);
                }}
              >
                I understand, proceed anyway
              </Button>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              // D2 — validations are nudges, not blockers. Only hard-error severity blocks.
              disabled={loading || validating ||
                (validationResult?.errors.some(e => e.severity === 'error') ?? false) ||
                (selectionMode === 'existing' && !selectedExistingPerson)}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectionMode === 'existing' ? 'Create Marriage' : 'Add Spouse'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
