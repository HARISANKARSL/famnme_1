/**
 * AddSiblingModal - Modal for adding siblings with parent choice
 *
 * Key Feature: Asks user to specify parent relationship BEFORE adding sibling.
 * This is critical for Indian families where half-siblings are common.
 *
 * Parent Options:
 * - Same parents (full sibling)
 * - Same mother, different father (maternal half-sibling)
 * - Same father, different mother (paternal half-sibling)
 * - Parents unknown (orphan/adopted)
 *
 * @see references/new file-ancestry.md - Indian family structures
 */

import { useState, useEffect } from 'react';
import { Dialog, ResponsiveDialogContent as DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { PersonFieldsCore } from '@/components/forms/PersonFieldsCore';
import type { Person } from '@/types';
import { RelationshipBreadcrumb, buildRelationshipChain } from '@/components/ui/RelationshipBreadcrumb';
import { validatePersonDates, validateSiblingDates, type TemporalWarning } from '@/services/temporalValidationService';
import { useFormValidation } from '@/hooks/useFormValidation';
import { isCustomReligion, isCustomLanguage } from '@/components/forms/CulturalMetadataFields';

// ============================================================================
// Types
// ============================================================================

export type ParentRelationshipType =
  | 'same-parents'
  | 'same-mother'
  | 'same-father'
  | 'unknown-parents';

export interface AddSiblingModalProps {
  open: boolean;
  onClose: () => void;
  referencePerson: Person;
  defaultGender?: 'male' | 'female';
  onSubmit: (siblingData: SiblingFormData) => Promise<void>;
}

export interface SiblingFormData {
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
  parentRelationship: ParentRelationshipType;

  // Indian cultural fields
  gotra?: string;
  caste?: string;
  religion?: string;
  nativePlace?: string;
  nativeLanguage?: string;
  elderStatus?: 'elder' | 'younger';
  biography?: string;
}

// ============================================================================
// Component
// ============================================================================

export function AddSiblingModal({
  open,
  onClose,
  referencePerson,
  defaultGender,
  onSubmit,
}: AddSiblingModalProps) {
  const { toast } = useToast();
  const { errors, validateField, sanitizeInput, validateStep, resetValidation } = useFormValidation();
  const [step, setStep] = useState<'choice' | 'form'>('form');
  const [loading, setLoading] = useState(false);
  const [temporalWarnings, setTemporalWarnings] = useState<TemporalWarning[]>([]);
  const [warningsAcknowledged, setWarningsAcknowledged] = useState(false);
  const [parentChoice, setParentChoice] = useState<ParentRelationshipType | null>('same-parents');
  const [formData, setFormData] = useState<Partial<SiblingFormData>>({
    isLiving: true,
    gender: defaultGender || 'male',
  });

  useEffect(() => {
    if (open) {
      setFormData({ isLiving: true, gender: defaultGender || 'male' });
      setParentChoice('same-parents');
      setStep('form');
      setTemporalWarnings([]);
      setWarningsAcknowledged(false);
      resetValidation();
    }
  }, [open, defaultGender, resetValidation]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleParentChoice = (choice: ParentRelationshipType) => {
    setParentChoice(choice);
    setStep('form');
  };

  const handleBack = () => {
    // Parent relationship selection is hidden, so back does nothing
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!parentChoice) {
      toast({
        title: 'Error',
        description: 'Please select parent relationship',
        variant: 'destructive',
      });
      return;
    }

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

    // Temporal validation
    if (!warningsAcknowledged) {
      const warnings: TemporalWarning[] = [];
      warnings.push(...validatePersonDates(updatedFormData));
      warnings.push(...validateSiblingDates(updatedFormData, [referencePerson]));
      if (warnings.length > 0) {
        setTemporalWarnings(warnings);
        return;
      }
    }

    try {
      setLoading(true);

      await onSubmit({
        ...updatedFormData,
        parentRelationship: parentChoice,
      } as SiblingFormData);

      handleClose();
    } catch (error) {
      console.error('Failed to add sibling:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add sibling',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetValidation();
    onClose();
  };

  // ============================================================================
  // Render: Parent Choice Step (Hidden by default)
  // ============================================================================

  const _renderParentChoice = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 mb-4">
        How is this sibling related to <span className="font-semibold">{referencePerson.firstName} {referencePerson.lastName}</span>?
      </p>

      <div className="space-y-3">
        {/* Same Parents */}
        <button
          onClick={() => handleParentChoice('same-parents')}
          className="w-full p-4 border-2 border-gray-200 dark:border-stone-800 rounded-lg hover:border-[#2F3E8F] dark:hover:border-[#8CA0FF] hover:bg-[#E8EDFF] dark:hover:bg-[#2F3E8F]/20 text-left transition-all group"
        >
          <div className="font-semibold text-gray-900 dark:text-gray-200 group-hover:text-[#25327A] dark:group-hover:text-[#8CA0FF]">
            Same mother and father
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Full sibling (both parents same)
          </div>
        </button>

        {/* Same Mother */}
        <button
          onClick={() => handleParentChoice('same-mother')}
          className="w-full p-4 border-2 border-gray-200 dark:border-stone-800 rounded-lg hover:border-pink-500 hover:bg-pink-50 dark:hover:bg-pink-950/20 text-left transition-all group"
        >
          <div className="font-semibold text-gray-900 dark:text-gray-200 group-hover:text-pink-700 dark:group-hover:text-pink-400">
            Same mother, different father
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Maternal half-sibling (mother's other marriage)
          </div>
        </button>

        {/* Same Father */}
        <button
          onClick={() => handleParentChoice('same-father')}
          className="w-full p-4 border-2 border-gray-200 dark:border-stone-800 rounded-lg hover:border-[#2F3E8F] dark:hover:border-[#8CA0FF] hover:bg-[#E8EDFF] dark:hover:bg-[#2F3E8F]/20 text-left transition-all group"
        >
          <div className="font-semibold text-gray-900 dark:text-gray-200 group-hover:text-[#25327A] dark:group-hover:text-[#8CA0FF]">
            Same father, different mother
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Paternal half-sibling (father's other marriage)
          </div>
        </button>

        {/* Unknown Parents */}
        <button
          onClick={() => handleParentChoice('unknown-parents')}
          className="w-full p-4 border-2 border-gray-200 dark:border-stone-800 rounded-lg hover:border-gray-500 dark:hover:border-stone-400 hover:bg-gray-50 dark:hover:bg-[#1A1A1A] text-left transition-all group"
        >
          <div className="font-semibold text-gray-900 dark:text-gray-200 group-hover:text-gray-700 dark:group-hover:text-gray-300">
            Parents unknown / not listed
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            For adopted, foster, or when parents aren't in tree
          </div>
        </button>
      </div>
    </div>
  );

  // ============================================================================
  // Render: Sibling Details Form
  // ============================================================================

  const renderSiblingForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Back Button Hidden */}

      {/* Breadcrumb Trail */}
      <RelationshipBreadcrumb
        steps={buildRelationshipChain(
          formData.gender === 'female' ? 'sister' : 'brother',
          referencePerson.firstName,
          undefined // No home person context needed for siblings
        )}
      />

      {/* Parent Choice Display Hidden */}

      {/* Person Fields */}
      <PersonFieldsCore
        values={formData}
        onChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))}
        mode="quick-add"
        showBiography={true}
        referencePerson={referencePerson}
        lastNameSuggestion={referencePerson.lastName}
        disabled={loading}
        errors={errors}
        validateField={validateField}
        sanitizeInput={sanitizeInput}
      />

      {/* Temporal Validation Warnings */}
      {temporalWarnings.length > 0 && !warningsAcknowledged && (
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
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Sibling
        </Button>
      </div>
    </form>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Sibling Details</DialogTitle>
        </DialogHeader>

        {renderSiblingForm()}
      </DialogContent>
    </Dialog>
  );
}
