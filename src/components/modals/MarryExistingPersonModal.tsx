/**
 * MarryExistingPersonModal - Modal for marrying two existing people
 *
 * Features:
 * - Searchable person picker
 * - Automatic marriage validation
 * - Marriage pattern selection for complex cases
 * - Cultural context documentation
 */

import { useState, useEffect, useMemo } from 'react';
import { Dialog, ResponsiveDialogContent as DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/DateInput';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { PersonPicker } from '@/components/ui/PersonPicker';
import { MarriagePatternFields } from '@/components/forms/MarriagePatternFields';
import { validateMarriage, type MarriageValidationResult } from '@/services/marriageValidationService';
import { getPersonSpouses } from '@/utils/unionHelpers';
import type { Person, Union, ValidationConfig } from '@/types';
import type { Relationship } from '@/services/elkLayoutService';
import type { UnionFormData } from './AddSpouseModal';
import * as neo4jAPI from '@/services/neo4jDataService';

// ============================================================================
// Types
// ============================================================================

export interface MarryExistingPersonModalProps {
  open: boolean;
  onClose: () => void;
  referencePerson: Person;
  allPersons: Person[];
  unions: Union[];
  relationships: Relationship[];
  onSubmit: (spouseId: string, unionData: UnionFormData) => Promise<void>;
  treeId: string;
}

// ============================================================================
// Component
// ============================================================================

export function MarryExistingPersonModal({
  open,
  onClose,
  referencePerson,
  allPersons,
  unions,
  relationships,
  onSubmit,
  treeId,
}: MarryExistingPersonModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [validationResult, setValidationResult] = useState<MarriageValidationResult | null>({ valid: true, errors: [], warnings: [] });
  const [validationConfig, setValidationConfig] = useState<ValidationConfig | null>(null);

  const [unionData, setUnionData] = useState<Partial<UnionFormData>>({
    type: 'marriage',
  });

  // ============================================================================
  // Calculate Excluded Persons
  // ============================================================================

  const excludedPersonIds = useMemo(() => {
    const excluded: string[] = [referencePerson.personId];

    // Get existing spouses - only exclude if strict mode or single marriage policy
    // (we allow multiple spouses with polyandry/polygyny)
    const existingSpouses = getPersonSpouses(
      referencePerson.personId,
      allPersons,
      unions,
      relationships
    );
    const existingSpouseIds = existingSpouses.map(s => s.spouse.personId);

    // Only exclude existing spouses in strict mode
    // In permissive mode, allow selecting them again (will trigger polyandry/polygyny pattern)
    if (validationConfig?.consanguinityLevel === 'strict' &&
        !validationConfig?.allowPolyandry &&
        !validationConfig?.allowPolygyny) {
      excluded.push(...existingSpouseIds);
    }

    return excluded;
  }, [referencePerson, allPersons, unions, relationships, validationConfig]);

  // ============================================================================
  // Load Validation Config
  // ============================================================================

  useEffect(() => {
    const loadValidationConfig = async () => {
      if (open && treeId) {
        try {
          const config = await neo4jAPI.getTreeValidationConfig(treeId);
          setValidationConfig(config);
        } catch (error) {
          console.error('Failed to load validation config:', error);
          setValidationConfig({
            consanguinityLevel: 'strict',
            allowPolyandry: false,
            allowPolygyny: false,
            allowUncleNieceMarriage: false,
            allowAuntNephewMarriage: false,
          });
        }
      }
    };
    loadValidationConfig();
  }, [open, treeId]);

  // ============================================================================
  // Validation on Person Selection
  // ============================================================================

  // useEffect(() => {
  //   if (!selectedPerson) {
  //     setValidationResult({ valid: true, errors: [], warnings: [] });
  //     return;
  //   }
  // 
  //   const validateAsync = async () => {
  //     setValidating(true);
  // 
  //     try {
  //       const result = await validateMarriage({
  //         person1: referencePerson,
  //         person2: selectedPerson,
  //         allPersons,
  //         unions,
  //         relationships,
  //         enforceGotraRule: referencePerson.religion === 'Hindu' || selectedPerson.religion === 'Hindu',
  //         validationConfig: validationConfig || undefined,
  //       });
  // 
  //       setValidationResult(result);
  //     } catch (error) {
  //       console.error('Validation failed:', error);
  //     } finally {
  //       setValidating(false);
  //     }
  //   };
  // 
  //   validateAsync();
  // }, [selectedPerson, validationConfig]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPerson) {
      toast({
        title: 'Error',
        description: 'Please select a person to marry',
        variant: 'destructive',
      });
      return;
    }

    if (!validationResult?.valid && validationResult?.errors.some((e) => e.severity === 'error')) {
      toast({
        title: 'Validation Failed',
        description: 'Please fix errors before proceeding',
        variant: 'destructive',
      });
      return;
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

    try {
      setLoading(true);

      // Collect validation overrides (warning codes that were acknowledged)
      const validationOverrides = validationResult?.warnings.map(w => w.code) || [];

      const finalUnionData: UnionFormData = {
        ...unionData,
        validationOverrides: validationOverrides.length > 0 ? validationOverrides : undefined,
      } as UnionFormData;

      await onSubmit(selectedPerson.personId, finalUnionData);

      onClose();
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
  };

  const handleClose = () => {
    setSelectedPerson(null);
    setUnionData({ type: 'marriage' });
    setValidationResult(null);
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
            Marry {referencePerson.firstName} {referencePerson.lastName} to Existing Person
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Person Picker */}
          <PersonPicker
            persons={allPersons}
            selectedPersonId={selectedPerson?.personId}
            onSelect={setSelectedPerson}
            excludePersonIds={excludedPersonIds}
            label="Select Spouse from Tree *"
            placeholder="Search for person in tree..."
          />

          {/* Selected Person Preview */}
          {selectedPerson && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <h3 className="font-semibold mb-2">Selected Person</h3>
              <div className="text-sm space-y-1">
                <p><strong>Name:</strong> {selectedPerson.firstName} {selectedPerson.lastName}</p>
                {selectedPerson.birthDate && (
                  <p><strong>Born:</strong> {selectedPerson.birthDate}</p>
                )}
                {selectedPerson.gender && (
                  <p><strong>Gender:</strong> <span className="capitalize">{selectedPerson.gender}</span></p>
                )}
                {selectedPerson.occupation && (
                  <p><strong>Occupation:</strong> {selectedPerson.occupation}</p>
                )}
              </div>
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

          {/* Marriage Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Marriage Details</h3>

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
                  onChange={(e) => setUnionData({ ...unionData, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="marriagePlace">Marriage Place</Label>
                <Input
                  id="marriagePlace"
                  value={unionData.marriagePlace || ''}
                  onChange={(e) => setUnionData({ ...unionData, marriagePlace: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={unionData.notes || ''}
                onChange={(e) => setUnionData({ ...unionData, notes: e.target.value })}
                placeholder="Any additional context about this marriage"
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || validating || !selectedPerson || (validationResult != null && !validationResult.valid)}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Marriage
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
