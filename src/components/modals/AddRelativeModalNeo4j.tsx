/**
 * AddRelativeModalNeo4j - Modal for adding relatives using Neo4j backend
 *
 * Neo4j-specific version that uses neo4jService instead of Supabase.
 * Supports adding: parent, spouse, child relationships.
 */

import { useState, useEffect } from 'react';
import { Dialog, ResponsiveDialogContent as DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { PersonFieldsCore } from '@/components/forms/PersonFieldsCore';
import { RelationshipBreadcrumb, buildRelationshipChain } from '@/components/ui/RelationshipBreadcrumb';
import * as neo4jAPI from '@/services/neo4jDataService';
import { useAuthStore } from '@/store/authStore';
import type { Person } from '@/types';
import type { TreeWindowData } from '@/services/neo4jDataService';
import { validatePersonDates, validateChildParentDates, type TemporalWarning } from '@/services/temporalValidationService';
import { useFormValidation } from '@/hooks/useFormValidation';
import { isCustomReligion, isCustomLanguage } from '@/components/forms/CulturalMetadataFields';

// ============================================================================
// Types
// ============================================================================

export interface AddRelativeModalNeo4jProps {
  open: boolean;
  onClose: () => void;
  treeId: string;
  referencePerson: Person;
  relationship: 'father' | 'mother' | 'son' | 'daughter' | 'parent' | 'child';
  roleHint?: 'father' | 'mother' | 'son' | 'daughter';
  onSuccess?: () => void;
  selectedUnionId?: string; // Optional: pre-selected union for child addition
  treeData?: TreeWindowData; // Optional: pre-loaded tree data to avoid re-fetching
  replaceGhostPersonId?: string; // Optional: ID of ghost/deleted node to replace
}

// ============================================================================
// Component
// ============================================================================

export function AddRelativeModalNeo4j({
  open,
  onClose,
  treeId,
  referencePerson,
  relationship,
  roleHint,
  onSuccess,
  selectedUnionId,
  treeData: preloadedTreeData,
  replaceGhostPersonId,
}: AddRelativeModalNeo4jProps) {
  // Derive effective role from relationship or roleHint
  const isParentRelationship = relationship === 'father' || relationship === 'mother' || relationship === 'parent';
  const isChildRelationship = relationship === 'son' || relationship === 'daughter' || relationship === 'child';
  const effectiveRole = roleHint ?? (relationship as 'father' | 'mother' | 'son' | 'daughter' | 'parent' | 'child');
  const { toast } = useToast();
  const { user } = useAuthStore();
  const userId = user?.id || 'demo-user-001';
  const { errors, validateField, sanitizeInput, validateStep, resetValidation } = useFormValidation();
  const [loading, setLoading] = useState(false);

  // Union selection step (for child + multiple marriages)
  const [unionStep, setUnionStep] = useState<'checking' | 'select' | 'form'>('form');
  const [availableUnions, setAvailableUnions] = useState<Array<{ union: import('@/types').Union; spouse: Person | null }>>([]);
  const [chosenUnionId, setChosenUnionId] = useState<string | null>(null);

  // State for second parent marriage question
  const [existingParent, setExistingParent] = useState<Person | null>(null);
  const [marriageChoice, setMarriageChoice] = useState<'married' | 'not-married' | null>(null);
  const [showMarriageQuestion, setShowMarriageQuestion] = useState(false);
  const [parentsFull, setParentsFull] = useState(false);

  // Parent-child relationship type
  const [parentChildType, setParentChildType] = useState<'biological' | 'adopted' | 'step' | 'unknown'>('biological');

  // Temporal validation
  const [temporalWarnings, setTemporalWarnings] = useState<TemporalWarning[]>([]);
  const [warningsAcknowledged, setWarningsAcknowledged] = useState(false);

  // Suggest gender based on role hint (user can override)
  const suggestedGender = (): 'male' | 'female' | undefined => {
    const role = roleHint ?? relationship;
    if (role === 'father' || role === 'son') return 'male';
    if (role === 'mother' || role === 'daughter') return 'female';
    return undefined;
  };

  const getSuggestedLastName = (): string | undefined => {
    if (isChildRelationship) {
      if (referencePerson.gender === 'male' && referencePerson.lastName) {
        return referencePerson.lastName;
      }
      if (referencePerson.gender === 'female') {
        // If mother, try to get father's last name from the selected union
        const union = availableUnions.find(u => u.union.unionId === (chosenUnionId || availableUnions[0]?.union.unionId));
        if (union?.spouse && union.spouse.gender === 'male' && union.spouse.lastName) {
          return union.spouse.lastName;
        }
        // Fallback to mother's last name
        if (referencePerson.lastName) {
          return referencePerson.lastName;
        }
      }
      if (referencePerson.lastName) return referencePerson.lastName;
    }
    if (isParentRelationship && effectiveRole === 'father' && referencePerson.lastName) {
      return referencePerson.lastName;
    }
    return undefined;
  };

  const [formData, setFormData] = useState<Partial<Person>>({
    gender: suggestedGender() ?? 'male',
    isLiving: true,
    isHomePerson: false,
    createdBy: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Check for multiple marriages when adding a child — uses preloaded treeData (no API call)
  useEffect(() => {
    if (open) {
      resetValidation();
    }
    if (!open || !isChildRelationship) {
      setUnionStep('form');
      return;
    }
    if (selectedUnionId) {
      setChosenUnionId(selectedUnionId);
      setUnionStep('form');
      return;
    }

    const data = preloadedTreeData;
    if (!data) {
      setUnionStep('form');
      return;
    }

    const personUnionIds = data.relationships
      .filter(r => r.type === 'PARTNER_IN' && r.fromId === referencePerson.personId)
      .map(r => r.toId);

    const marriageUnions = data.unions.filter(
      u => personUnionIds.includes(u.unionId) && (u.type === 'marriage' || u.type === 'partnership')
    );

    if (marriageUnions.length > 1) {
      const unionsWithSpouse = marriageUnions.map(u => {
        const spouseId = data.relationships
          .filter(r => r.type === 'PARTNER_IN' && r.toId === u.unionId && r.fromId !== referencePerson.personId)
          .map(r => r.fromId)[0];
        const spouse = spouseId ? data.persons.find(p => p.personId === spouseId) ?? null : null;
        return { union: u, spouse };
      });
      setAvailableUnions(unionsWithSpouse);
      setChosenUnionId(marriageUnions[0].unionId);
      setUnionStep('select');
    } else {
      setUnionStep('form');
    }
  }, [open, relationship, referencePerson.personId, selectedUnionId, preloadedTreeData]);

  // Check for existing parent when adding father/mother — uses preloaded treeData (no API call)
  useEffect(() => {
    if (!open || !isParentRelationship || replaceGhostPersonId) {
      return;
    }

    const data = preloadedTreeData;
    if (!data) {
      setShowMarriageQuestion(false);
      return;
    }

    const childUnionIds = data.relationships
      .filter(r => r.type === 'HAS_CHILD' && r.toId === referencePerson.personId)
      .map(r => r.fromId);

    const parentUnions = data.unions.filter(u => childUnionIds.includes(u.unionId));

    const existingParents: Person[] = [];
    for (const union of parentUnions) {
      const partnerIds = data.relationships
        .filter(r => r.type === 'PARTNER_IN' && r.toId === union.unionId)
        .map(r => r.fromId);

      for (const partnerId of partnerIds) {
        const parent = data.persons.find(p => p.personId === partnerId);
        if (parent && !parent.isDeleted && !parent.personId.startsWith('ghost-spouse-')) {
          existingParents.push(parent);
        }
      }
    }

    if (existingParents.length >= 2) {
      setParentsFull(true);
      setShowMarriageQuestion(false);
    } else if (existingParents.length > 0) {
      setExistingParent(existingParents[0]);
      setShowMarriageQuestion(true);
    } else {
      setShowMarriageQuestion(false);
    }
  }, [open, relationship, referencePerson.personId, preloadedTreeData, replaceGhostPersonId]);

  // Pre-fill the form with existing ghost person details if available
  useEffect(() => {
    if (open && replaceGhostPersonId && preloadedTreeData) {
      const ghostPerson = preloadedTreeData.persons.find(p => p.personId === replaceGhostPersonId);
      if (ghostPerson) {
        setFormData({
          firstName: ghostPerson.firstName || '',
          lastName: ghostPerson.lastName || '',
          gender: ghostPerson.gender || suggestedGender() || 'male',
          isLiving: ghostPerson.isLiving ?? true,
          middleName: ghostPerson.middleName || '',
          maidenName: ghostPerson.maidenName || '',
          biography: ghostPerson.biography || '',
          birthDate: ghostPerson.birthDate || '',
          birthPlace: ghostPerson.birthPlace || '',
          deathDate: ghostPerson.deathDate || '',
          deathPlace: ghostPerson.deathPlace || '',
          occupation: ghostPerson.occupation || '',
          education: ghostPerson.education || '',
          gotra: ghostPerson.gotra || '',
          caste: ghostPerson.caste || '',
          religion: ghostPerson.religion || '',
          nativePlace: ghostPerson.nativePlace || '',
          nativeLanguage: ghostPerson.nativeLanguage || '',
          elderStatus: ghostPerson.elderStatus,
        });
      }
    }
  }, [open, replaceGhostPersonId, preloadedTreeData]);

  // Suggest gender based on role (user can always override)
  useEffect(() => {
    if (replaceGhostPersonId) return; // Skip gender override for ghost node recovery
    const gender = suggestedGender();
    if (gender) {
      setFormData((prev) => ({ ...prev, gender }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relationship, roleHint, replaceGhostPersonId]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      firstName: (formData.firstName || '').trim(),
      lastName: (formData.lastName || '').trim(),
      gender: formData.gender || '',
      middleName: (formData.middleName || '').trim(),
      maidenName: (formData.maidenName || '').trim(),
      biography: (formData.biography || '').trim(),
      birthDate: formData.birthDate || '',
      deathDate: formData.isLiving === false ? formData.deathDate || '' : '',
      religion: formData.religion === 'Other' ? '' : (formData.religion || ''),
      nativeLanguage: formData.nativeLanguage === 'Other' ? '' : (formData.nativeLanguage || ''),
    };

    const isValid = validateStep(fieldsToValidate, configs as any);
    if (!isValid) {
      toast({
        title: 'Validation Failed',
        description: 'Please correct the highlighted fields.',
        variant: 'destructive',
      });
      return;
    }

    const updatedFormData = {
      ...formData,
      firstName: (formData.firstName || '').trim(),
      lastName: (formData.lastName || '').trim(),
      middleName: formData.middleName ? formData.middleName.trim() : undefined,
      maidenName: formData.maidenName ? formData.maidenName.trim() : undefined,
      biography: formData.biography ? formData.biography.trim() : undefined,
    };

    // Run temporal validation
    const warnings: TemporalWarning[] = [];
    warnings.push(...validatePersonDates(updatedFormData));

    // Validate parent-child dates based on relationship direction
    if (isParentRelationship) {
      // New person is parent, referencePerson is child
      warnings.push(...validateChildParentDates(referencePerson, updatedFormData, 'New parent'));
    } else if (isChildRelationship) {
      // New person is child, referencePerson is parent
      warnings.push(...validateChildParentDates(updatedFormData, referencePerson, referencePerson.firstName));
    }

    if (warnings.length > 0 && !warningsAcknowledged) {
      setTemporalWarnings(warnings);
      return;
    }

    try {
      setLoading(true);

      // Prepare person data (omit auto-generated fields)
      const personData: Omit<Person, 'personId' | 'createdAt' | 'updatedAt'> = {
        firstName: updatedFormData.firstName!,
        lastName: updatedFormData.lastName || '',
        gender: updatedFormData.gender!,
        isLiving: updatedFormData.isLiving ?? true,
        isHomePerson: false,
        createdBy: userId,
        middleName: updatedFormData.middleName,
        maidenName: updatedFormData.maidenName,
        birthDate: updatedFormData.birthDate,
        birthPlace: updatedFormData.birthPlace,
        deathDate: updatedFormData.deathDate,
        deathPlace: updatedFormData.deathPlace,
        occupation: updatedFormData.occupation,
        education: updatedFormData.education,
        gotra: updatedFormData.gotra,
        caste: updatedFormData.caste,
        religion: updatedFormData.religion,
        nativePlace: updatedFormData.nativePlace,
        nativeLanguage: updatedFormData.nativeLanguage,
        elderStatus: updatedFormData.elderStatus,
        biography: updatedFormData.biography,
      };

      // Handle different relationship types
      if (replaceGhostPersonId) {
        // Update the existing placeholder node properties
        await neo4jAPI.updatePerson(replaceGhostPersonId, personData, treeId);
        // Activate the node to set isDeleted = false (commented out as requested)
        // await neo4jAPI.activateGhostNode(replaceGhostPersonId, treeId);

        toast({
          title: 'Success',
          description: `${personData.firstName} ${personData.lastName} added successfully`,
        });
      } else if (isParentRelationship) {
        // Adding parent
        // Pass marriedToExistingParent based on user choice
        const isMarried = marriageChoice === 'married' || marriageChoice === null; // Default to married if no choice

        await neo4jAPI.addParent(referencePerson.personId, personData, isMarried, treeId, parentChildType);

        const roleLabel = effectiveRole === 'father' ? 'Father' : effectiveRole === 'mother' ? 'Mother' : 'Parent';
        const relationshipType = isMarried ? 'married' : 'separate union (half-sibling)';
        toast({
          title: 'Success',
          description: `${roleLabel} added successfully ${existingParent && marriageChoice ? `(${relationshipType})` : ''}`,
        });
      } else if (isChildRelationship) {
        // Adding child - use chosenUnionId (from union select step) or selectedUnionId prop

        let targetUnionId: string | null = null;

        if (chosenUnionId || selectedUnionId) {
          // Union was selected by user or pre-selected by caller
          targetUnionId = (chosenUnionId || selectedUnionId)!;
          console.log('Using selected union:', targetUnionId);
        } else {
          // Fetch current tree data to check for existing unions
          const treeData: TreeWindowData = await neo4jAPI.fetchTreeWindow(treeId, referencePerson.personId);

          // Find marriage unions for the reference person
          const personUnionIds = treeData.relationships
            .filter(r => r.type === 'PARTNER_IN' && r.fromId === referencePerson.personId)
            .map(r => r.toId);

          const marriageUnions = treeData.unions.filter(
            u => personUnionIds.includes(u.unionId) && (u.type === 'marriage' || u.type === 'partnership')
          );

          if (marriageUnions.length > 0) {
            // Use the first marriage union (person is married)
            targetUnionId = marriageUnions[0].unionId;
            console.log('Using existing marriage union:', targetUnionId);
          } else {
            // No marriage union — check if a single-parent union already exists
            const existingSingleUnions = treeData.unions.filter(
              u => personUnionIds.includes(u.unionId) && u.type === 'unknown'
            );

            if (existingSingleUnions.length > 0) {
              // Reuse the existing single-parent union
              targetUnionId = existingSingleUnions[0].unionId;
              console.log('Reusing existing single-parent union:', targetUnionId);
            } else {
              // First child for this single parent — pass null as union and pass parentId
              targetUnionId = null;
              console.log('No union found. Creating single parent child directly linked to parentId.');
            }
          }
        }

        // Add child to the union or parent directly
        await neo4jAPI.addChildToUnion(treeId, targetUnionId, personData, parentChildType, targetUnionId ? undefined : referencePerson.personId);

        const childGenderLabel = formData.gender === 'male' ? 'Son' : formData.gender === 'female' ? 'Daughter' : 'Child';
        toast({
          title: 'Success',
          description: `${childGenderLabel} added successfully`,
        });
      }

      // Trigger tree refresh and close modal
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to add relative:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add relative',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      gender: suggestedGender() ?? 'male',
      isLiving: true,
    });
    setExistingParent(null);
    setMarriageChoice(null);
    setShowMarriageQuestion(false);
    setParentsFull(false);
    setUnionStep('form');
    setAvailableUnions([]);
    setChosenUnionId(null);
    resetValidation();
    onClose();
  };

  const getRelationshipTitle = () => {
    const name = `${referencePerson.firstName} ${referencePerson.lastName || ''}`.trim();
    if (isParentRelationship) {
      const parentLabel = effectiveRole === 'father' || relationship === 'father'
        ? 'Father'
        : effectiveRole === 'mother' || relationship === 'mother'
          ? 'Mother'
          : formData.gender === 'male'
            ? 'Father'
            : formData.gender === 'female'
              ? 'Mother'
              : 'Parent';
      return `Add parent for ${name} (${parentLabel})`;
    }
    if (isChildRelationship) {
      const childLabel = effectiveRole === 'son' || relationship === 'son'
        ? 'Son'
        : effectiveRole === 'daughter' || relationship === 'daughter'
          ? 'Daughter'
          : formData.gender === 'male'
            ? 'Son'
            : formData.gender === 'female'
              ? 'Daughter'
              : 'Child';
      return `Add child for ${name} (${childLabel})`;
    }
    return `Add relative for ${name}`;
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getRelationshipTitle()}</DialogTitle>
        </DialogHeader>

        {/* Breadcrumb Trail */}
        <div className="px-6">
          <RelationshipBreadcrumb
            steps={buildRelationshipChain(relationship, referencePerson.firstName, undefined)}
          />
        </div>

        {/* Union selection step — shown when person has multiple marriages and we're adding a child */}
        {unionStep === 'checking' && (
          <div className="px-6 py-4 flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking marriages...
          </div>
        )}

        {unionStep === 'select' && availableUnions.length > 0 && (
          <div className="px-6 py-4 bg-[#E8EDFF] dark:bg-blue-950/20 border-t border-b border-[#E8D5C4] dark:border-zinc-800 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
              {referencePerson.firstName} has multiple marriages — which marriage is this child from?
            </h3>
            <div className="space-y-2">
              {availableUnions.map(({ union, spouse }) => (
                <label
                  key={union.unionId}
                  className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                    chosenUnionId === union.unionId
                      ? 'border-[#2F3E8F] dark:border-blue-500 bg-[#E8EDFF] dark:bg-blue-950/30'
                      : 'border-gray-200 dark:border-zinc-800 hover:border-[#2F3E8F] dark:hover:border-blue-500 bg-white dark:bg-zinc-900/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="union-choice"
                    value={union.unionId}
                    checked={chosenUnionId === union.unionId}
                    onChange={() => setChosenUnionId(union.unionId)}
                    className="mt-0.5 mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-zinc-100">
                      {referencePerson.firstName} & {spouse ? `${spouse.firstName} ${spouse.lastName || ''}`.trim() : 'Unknown spouse'}
                    </div>
                    {union.startDate && (
                      <div className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                        Since {new Date(union.startDate).getFullYear()}
                        {union.endDate ? ` – ${new Date(union.endDate).getFullYear()}` : ''}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
            <button
              type="button"
              className="w-full py-2 px-4 bg-[#2F3E8F] hover:bg-[#25327A] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
              onClick={() => setUnionStep('form')}
              disabled={!chosenUnionId}
            >
              Continue to child details
            </button>
          </div>
        )}

        {/* Parents Full — both parents already assigned */}
        {parentsFull && (
          <div className="px-6 py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-zinc-100 mb-1">
              Both parents already assigned
            </p>
            <p className="text-sm text-gray-600 dark:text-zinc-400 mb-4">
              {referencePerson.firstName} already has both a father and a mother in the family tree.
            </p>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </div>
        )}

        {/* Marriage Question (if second parent) */}
        {showMarriageQuestion && existingParent && marriageChoice === null && (
          <div className="px-6 py-4 bg-[#E8EDFF] dark:bg-blue-950/20 border-t border-b border-[#E8D5C4] dark:border-zinc-800">
            <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-zinc-100">
              {referencePerson.firstName} already has {existingParent.gender === 'male' ? 'a father' : 'a mother'}: {existingParent.firstName} {existingParent.lastName || ''}
            </h3>
            <p className="text-sm text-gray-700 dark:text-zinc-300 mb-4">
              Is this {relationship} married to {existingParent.firstName}?
            </p>
            <div className="space-y-2">
              <label className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                marriageChoice === 'married'
                  ? 'border-[#2F3E8F] dark:border-blue-500 bg-[#E8EDFF] dark:bg-blue-950/30'
                  : 'border-gray-300 dark:border-zinc-800 hover:border-[#2F3E8F] dark:hover:border-blue-500 bg-white dark:bg-zinc-900/50'
              }`}>
                <input
                  type="radio"
                  name="marriage-choice"
                  value="married"
                  onChange={() => setMarriageChoice('married')}
                  className="mt-0.5 mr-3"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-zinc-100">Yes, they are married</div>
                  <div className="text-sm text-gray-600 dark:text-zinc-400">Children will be full siblings</div>
                </div>
              </label>
              <label className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                marriageChoice === 'not-married'
                  ? 'border-[#2F3E8F] dark:border-blue-500 bg-[#E8EDFF] dark:bg-blue-950/30'
                  : 'border-gray-300 dark:border-zinc-800 hover:border-[#2F3E8F] dark:hover:border-blue-500 bg-white dark:bg-zinc-900/50'
              }`}>
                <input
                  type="radio"
                  name="marriage-choice"
                  value="not-married"
                  onChange={() => setMarriageChoice('not-married')}
                  className="mt-0.5 mr-3"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-zinc-100">No, they are not married</div>
                  <div className="text-sm text-gray-600 dark:text-zinc-400">Children will be half-siblings (different unions)</div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Only show form when not in union selection step AND after marriage choice (if applicable) */}
        {!parentsFull && unionStep === 'form' && (!showMarriageQuestion || marriageChoice !== null) && (
          <form onSubmit={handleSubmit} className="space-y-6 px-6 pb-6">

          {/* Person Fields */}
          <PersonFieldsCore
            values={formData}
            onChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))}
            mode="quick-add"
            showBiography={true}
            genderSuggestion={suggestedGender()}
            lastNameSuggestion={getSuggestedLastName()}
            referencePerson={referencePerson}
            disabled={loading}
            showDateQualifiers={true}
            errors={errors}
            validateField={validateField}
            sanitizeInput={sanitizeInput}
            hideElderStatus={true}
          />

          {/* Temporal Validation Warnings */}
          {temporalWarnings.length > 0 && !warningsAcknowledged && (
            <div className="bg-[#E8EDFF] dark:bg-blue-950/20 border border-[#2F3E8F]/30 dark:border-blue-900/40 rounded-lg p-3 space-y-2">
              <p className="text-blue-800 dark:text-blue-400 font-medium text-sm">Date consistency warnings:</p>
              <ul className="text-[#2F3E8F] dark:text-blue-300 text-sm space-y-1 ml-4 list-disc">
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
                  setWarningsAcknowledged(true);
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
            <Button type="submit" disabled={loading || !formData.firstName?.trim() || !formData.gender}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add {isParentRelationship ? 'Parent' : 'Child'}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
