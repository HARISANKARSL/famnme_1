import { useState, useEffect } from 'react';
import {
  Dialog,
  ResponsiveDialogContent as DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Zap, X, Plus } from 'lucide-react';
import * as neo4jAPI from '@/services/neo4jDataService';
import { aiApiCalls } from '@/api/apicalls';
import type { Person } from '@/types';
import { useFormValidation } from '@/hooks/useFormValidation';
import { cn } from '@/lib/utils';

type Gender = 'male' | 'female' | 'other';

interface QuickEntry {
  firstName: string;
  lastName: string;
  gender: Gender;
  coParentPersonId?: string;
}

export interface QuickAddWizardProps {
  open: boolean;
  onClose: () => void;
  person: Person;
  treeId: string;
  existingData: {
    hasParents: boolean;
    hasSpouse: boolean;
    spouseUnionId?: string;
  };
  onSuccess: () => void;
  userId: string;
  spouses?: Person[];
}

const emptyEntry = (gender: Gender = 'male', lastName = ''): QuickEntry => ({
  firstName: '',
  lastName,
  gender,
});

function EntryRow({
  entry,
  onChange,
  onRemove,
  label,
  genderLocked,
  errors,
  validateField,
  sanitizeInput,
  prefix,
  spouses,
  showMarriagePicker,
}: {
  entry: QuickEntry;
  onChange: (e: QuickEntry) => void;
  onRemove: () => void;
  label?: string;
  genderLocked?: boolean;
  errors: Record<string, string>;
  validateField: (name: string, value: string, config: any) => string;
  sanitizeInput: (value: string) => string;
  prefix: string;
  spouses?: Person[];
  showMarriagePicker?: boolean;
}) {
  const [aiSuggestedGender, setAiSuggestedGender] = useState<'male' | 'female' | 'other' | null>(null);
  const [loadingGender, setLoadingGender] = useState(false);
  const [hasManuallySelectedGender, setHasManuallySelectedGender] = useState(false);

  // Debounced API call to identify gender by first name
  useEffect(() => {
    if (genderLocked) return;
    const name = (entry.firstName || '').trim();
    if (!name || name.length < 2) {
      setAiSuggestedGender(null);
      return;
    }

    const handler = setTimeout(async () => {
      setLoadingGender(true);
      try {
        const res = await aiApiCalls.identifyGender(name);
        let extractedGender: 'male' | 'female' | 'other' | null = null;
        if (res) {
          if (typeof res.gender === 'string') {
            extractedGender = res.gender.toLowerCase() as any;
          } else if (res.data && typeof res.data.gender === 'string') {
            extractedGender = res.data.gender.toLowerCase() as any;
          } else if (typeof res.suggestedGender === 'string') {
            extractedGender = res.suggestedGender.toLowerCase() as any;
          } else if (res.data && typeof res.data.suggestedGender === 'string') {
            extractedGender = res.data.suggestedGender.toLowerCase() as any;
          }
        }

        if (extractedGender === 'male' || extractedGender === 'female' || extractedGender === 'other') {
          setAiSuggestedGender(extractedGender);
          if (!hasManuallySelectedGender) {
            onChange({ ...entry, gender: extractedGender });
            validateField(`${prefix}_gender`, extractedGender, {
              required: true,
              type: 'name',
              label: 'Gender',
            });
          }
        } else {
          setAiSuggestedGender(null);
        }
      } catch (err) {
        console.error('Failed to identify gender:', err);
      } finally {
        setLoadingGender(false);
      }
    }, 600); // 600ms debounce

    return () => clearTimeout(handler);
  }, [entry.firstName, genderLocked, hasManuallySelectedGender, prefix, validateField]);

  const handleFirstNameChange = (val: string) => {
    const sanitized = sanitizeInput(val);
    onChange({ ...entry, firstName: sanitized });
    validateField(`${prefix}_firstName`, sanitized, {
      required: true,
      type: 'name',
      label: 'First name',
    });
  };

  const handleLastNameChange = (val: string) => {
    const sanitized = sanitizeInput(val);
    onChange({ ...entry, lastName: sanitized });
    validateField(`${prefix}_lastName`, sanitized, {
      required: false,
      type: 'name',
      label: 'Last name',
    });
  };

  const handleGenderChange = (val: Gender) => {
    onChange({ ...entry, gender: val });
    validateField(`${prefix}_gender`, val, {
      required: true,
      type: 'name',
      label: 'Gender',
    });
  };

  const firstNameError = errors[`${prefix}_firstName`];
  const lastNameError = errors[`${prefix}_lastName`];
  const genderError = errors[`${prefix}_gender`];

  return (
    <div className="flex flex-col gap-3 p-4 bg-gray-50 border border-gray-200/80 rounded-xl w-full">
      <div className="flex items-center justify-between">
        {label && <span className="text-xs font-bold text-[#2F3E8F] uppercase tracking-wider">{label}</span>}
        {loadingGender && <span className="text-[10px] text-muted-foreground animate-pulse">Detecting...</span>}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start gap-3 w-full">
        {/* First name */}
        <div className="flex-1 min-w-0">
          <Input
            placeholder="First name"
            value={entry.firstName}
            onChange={(e) => handleFirstNameChange(e.target.value)}
            className="h-10 text-sm"
            error={firstNameError}
            showCharCount
            charLimit={50}
          />
        </div>

        {/* Last name */}
        <div className="flex-1 min-w-0">
          <Input
            placeholder="Last name"
            value={entry.lastName}
            onChange={(e) => handleLastNameChange(e.target.value)}
            className="h-10 text-sm"
            error={lastNameError}
            showCharCount
            charLimit={50}
          />
        </div>

        {/* Gender Select */}
        <div className="w-full sm:w-36 shrink-0 flex flex-col">
          <Select
            value={entry.gender}
            onValueChange={(v) => {
              setHasManuallySelectedGender(true);
              handleGenderChange(v as Gender);
            }}
            disabled={genderLocked}
          >
            <SelectTrigger className={cn(
              "h-10 text-sm w-full bg-white dark:bg-transparent transition-all",
              genderError ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""
            )}>
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">
                Male
              </SelectItem>
              <SelectItem value="female">
                Female
              </SelectItem>
              <SelectItem value="other">
                Other
              </SelectItem>
            </SelectContent>
          </Select>
          {genderError && (
            <span className="text-[11px] text-red-500 font-medium mt-1.5 px-1 block animate-in fade-in-50 slide-in-from-top-1 duration-150">
              {genderError}
            </span>
          )}
        </div>

        {/* Remove Button */}
        <div className="flex items-center justify-end pt-1 shrink-0 ml-auto sm:ml-0">
          <button
            type="button"
            onClick={onRemove}
            className="p-2 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors"
            title="Remove"
          >
            <X className="h-5 w-5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>

      {/* {aiSuggestedGender && (
        <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-medium px-1 -mt-1">
          AI suggests: {aiSuggestedGender === 'male' ? 'Male' : aiSuggestedGender === 'female' ? 'Female' : 'Other'}
        </p>
      )} */}

      {showMarriagePicker && spouses && spouses.length > 0 && (
        <div className="flex flex-col gap-1.5 w-full mt-1 border-t border-gray-200/50 pt-3">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">
            Which marriage is this child from? <span className="text-red-500">*</span>
          </label>
          <div className="w-full">
            <Select
              value={entry.coParentPersonId || ''}
              onValueChange={(val) => {
                onChange({ ...entry, coParentPersonId: val });
                validateField(`${prefix}_coParentPersonId`, val, {
                  required: true,
                  type: 'description',
                  label: 'Marriage selection',
                });
              }}
            >
              <SelectTrigger className={cn(
                "h-10 text-sm w-full bg-white dark:bg-transparent transition-all",
                errors[`${prefix}_coParentPersonId`] ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""
              )}>
                <SelectValue placeholder="Select co-parent / marriage" />
              </SelectTrigger>
              <SelectContent>
                {spouses.map((spouse) => (
                  <SelectItem key={spouse.personId} value={spouse.personId}>
                    {[spouse.firstName, spouse.lastName].filter(n => n && n !== 'undefined').join(' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors[`${prefix}_coParentPersonId`] && (
              <span className="text-[11px] text-red-500 font-medium mt-1.5 px-1 block animate-in fade-in-50 slide-in-from-top-1 duration-150">
                {errors[`${prefix}_coParentPersonId`]}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function QuickAddWizard({
  open,
  onClose,
  person,
  treeId,
  existingData,
  onSuccess,
  userId,
  spouses = [],
}: QuickAddWizardProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Hook for form validation
  const { errors, validateField, sanitizeInput, clearError, resetValidation } = useFormValidation();

  const oppositeGender: Gender = person.gender === 'male' ? 'female' : person.gender === 'female' ? 'male' : 'other';

  // State for entries
  const [fatherEntry, setFatherEntry] = useState<QuickEntry | null>(null);
  const [motherEntry, setMotherEntry] = useState<QuickEntry | null>(null);
  const [spouseEntry, setSpouseEntry] = useState<QuickEntry | null>(null);
  const [childEntries, setChildEntries] = useState<QuickEntry[]>([]);
  const [brotherEntries, setBrotherEntries] = useState<QuickEntry[]>([]);
  const [sisterEntries, setSisterEntries] = useState<QuickEntry[]>([]);
  const [paternalGrandfatherEntry, setPaternalGrandfatherEntry] = useState<QuickEntry | null>(null);
  const [paternalGrandmotherEntry, setPaternalGrandmotherEntry] = useState<QuickEntry | null>(null);
  const [maternalGrandfatherEntry, setMaternalGrandfatherEntry] = useState<QuickEntry | null>(null);
  const [maternalGrandmotherEntry, setMaternalGrandmotherEntry] = useState<QuickEntry | null>(null);

  // Reset state and validation when dialog open state changes
  useEffect(() => {
    if (!open) {
      setFatherEntry(null);
      setMotherEntry(null);
      setSpouseEntry(null);
      setChildEntries([]);
      setBrotherEntries([]);
      setSisterEntries([]);
      setPaternalGrandfatherEntry(null);
      setPaternalGrandmotherEntry(null);
      setMaternalGrandfatherEntry(null);
      setMaternalGrandmotherEntry(null);
      resetValidation();
    }
  }, [open, resetValidation]);

  // Handlers for removing with validation update
  const handleFatherRemove = () => {
    setFatherEntry(null);
    clearError('father_firstName');
    clearError('father_lastName');
    clearError('father_gender');
  };

  const handleMotherRemove = () => {
    setMotherEntry(null);
    clearError('mother_firstName');
    clearError('mother_lastName');
    clearError('mother_gender');
  };

  const handleSpouseRemove = () => {
    setSpouseEntry(null);
    clearError('spouse_firstName');
    clearError('spouse_lastName');
    clearError('spouse_gender');
  };

  const handleChildRemove = (index: number) => {
    const nextChildren = childEntries.filter((_, j) => j !== index);
    setChildEntries(nextChildren);

    // Clear all child error keys to prevent orphaned states
    for (let i = 0; i <= childEntries.length; i++) {
      clearError(`child_${i}_firstName`);
      clearError(`child_${i}_lastName`);
      clearError(`child_${i}_gender`);
      clearError(`child_${i}_coParentPersonId`);
    }
  };

  const handleBrotherRemove = (index: number) => {
    const next = brotherEntries.filter((_, j) => j !== index);
    setBrotherEntries(next);
    for (let i = 0; i <= brotherEntries.length; i++) {
      clearError(`brother_${i}_firstName`);
      clearError(`brother_${i}_lastName`);
      clearError(`brother_${i}_gender`);
    }
  };

  const handleSisterRemove = (index: number) => {
    const next = sisterEntries.filter((_, j) => j !== index);
    setSisterEntries(next);
    for (let i = 0; i <= sisterEntries.length; i++) {
      clearError(`sister_${i}_firstName`);
      clearError(`sister_${i}_lastName`);
      clearError(`sister_${i}_gender`);
    }
  };

  const handlePaternalGrandfatherRemove = () => {
    setPaternalGrandfatherEntry(null);
    clearError('pat_gf_firstName');
    clearError('pat_gf_lastName');
    clearError('pat_gf_gender');
  };

  const handlePaternalGrandmotherRemove = () => {
    setPaternalGrandmotherEntry(null);
    clearError('pat_gm_firstName');
    clearError('pat_gm_lastName');
    clearError('pat_gm_gender');
  };

  const handleMaternalGrandfatherRemove = () => {
    setMaternalGrandfatherEntry(null);
    clearError('mat_gf_firstName');
    clearError('mat_gf_lastName');
    clearError('mat_gf_gender');
  };

  const handleMaternalGrandmotherRemove = () => {
    setMaternalGrandmotherEntry(null);
    clearError('mat_gm_firstName');
    clearError('mat_gm_lastName');
    clearError('mat_gm_gender');
  };

  const isSiblingsEnabled = true;
  const isPaternalEnabled = true;
  const isMaternalEnabled = true;

  const isSpouseBeingAdded = !!(spouseEntry && spouseEntry.firstName.trim() !== '');
  const showMarriagePicker = !!(spouses && spouses.length > 1 && !isSpouseBeingAdded);

  const hasAnyEntry = !!(
    fatherEntry ||
    motherEntry ||
    spouseEntry ||
    childEntries.length > 0 ||
    brotherEntries.length > 0 ||
    sisterEntries.length > 0 ||
    paternalGrandfatherEntry ||
    paternalGrandmotherEntry ||
    maternalGrandfatherEntry ||
    maternalGrandmotherEntry
  );

  // Checks if active entries have validation errors or missing required fields
  const isFormInvalid = () => {
    if (!hasAnyEntry) return true;
    if (fatherEntry && (!fatherEntry.firstName.trim() || !fatherEntry.gender)) return true;
    if (motherEntry && (!motherEntry.firstName.trim() || !motherEntry.gender)) return true;
    if (spouseEntry && (!spouseEntry.firstName.trim() || !spouseEntry.gender)) return true;
    for (const child of childEntries) {
      if (!child.firstName.trim() || !child.gender) return true;
      if (showMarriagePicker && !child.coParentPersonId) return true;
    }
    for (const bro of brotherEntries) {
      if (!bro.firstName.trim() || !bro.gender) return true;
    }
    for (const sis of sisterEntries) {
      if (!sis.firstName.trim() || !sis.gender) return true;
    }
    if (paternalGrandfatherEntry && (!paternalGrandfatherEntry.firstName.trim() || !paternalGrandfatherEntry.gender)) return true;
    if (paternalGrandmotherEntry && (!paternalGrandmotherEntry.firstName.trim() || !paternalGrandmotherEntry.gender)) return true;
    if (maternalGrandfatherEntry && (!maternalGrandfatherEntry.firstName.trim() || !maternalGrandfatherEntry.gender)) return true;
    if (maternalGrandmotherEntry && (!maternalGrandmotherEntry.firstName.trim() || !maternalGrandmotherEntry.gender)) return true;
    if (Object.keys(errors).length > 0) return true;
    return false;
  };

  const validateAll = (): boolean => {
    let isValid = true;

    if (fatherEntry) {
      const firstErr = validateField('father_firstName', fatherEntry.firstName, { required: true, type: 'name', label: 'First name' });
      const lastErr = validateField('father_lastName', fatherEntry.lastName, { required: false, type: 'name', label: 'Last name' });
      const genderErr = validateField('father_gender', fatherEntry.gender, { required: true, type: 'name', label: 'Gender' });
      if (firstErr || lastErr || genderErr) isValid = false;
    }
    if (motherEntry) {
      const firstErr = validateField('mother_firstName', motherEntry.firstName, { required: true, type: 'name', label: 'First name' });
      const lastErr = validateField('mother_lastName', motherEntry.lastName, { required: false, type: 'name', label: 'Last name' });
      const genderErr = validateField('mother_gender', motherEntry.gender, { required: true, type: 'name', label: 'Gender' });
      if (firstErr || lastErr || genderErr) isValid = false;
    }
    if (spouseEntry) {
      const firstErr = validateField('spouse_firstName', spouseEntry.firstName, { required: true, type: 'name', label: 'First name' });
      const lastErr = validateField('spouse_lastName', spouseEntry.lastName, { required: false, type: 'name', label: 'Last name' });
      const genderErr = validateField('spouse_gender', spouseEntry.gender, { required: true, type: 'name', label: 'Gender' });
      if (firstErr || lastErr || genderErr) isValid = false;
    }
    childEntries.forEach((child, i) => {
      const firstErr = validateField(`child_${i}_firstName`, child.firstName, { required: true, type: 'name', label: 'First name' });
      const lastErr = validateField(`child_${i}_lastName`, child.lastName, { required: false, type: 'name', label: 'Last name' });
      const genderErr = validateField(`child_${i}_gender`, child.gender, { required: true, type: 'name', label: 'Gender' });
      let coParentErr = '';
      if (showMarriagePicker) {
        coParentErr = validateField(`child_${i}_coParentPersonId`, child.coParentPersonId || '', { required: true, type: 'description', label: 'Marriage selection' });
      }
      if (firstErr || lastErr || genderErr || coParentErr) isValid = false;
    });
    brotherEntries.forEach((bro, i) => {
      const firstErr = validateField(`brother_${i}_firstName`, bro.firstName, { required: true, type: 'name', label: 'First name' });
      const lastErr = validateField(`brother_${i}_lastName`, bro.lastName, { required: false, type: 'name', label: 'Last name' });
      const genderErr = validateField(`brother_${i}_gender`, bro.gender, { required: true, type: 'name', label: 'Gender' });
      if (firstErr || lastErr || genderErr) isValid = false;
    });
    sisterEntries.forEach((sis, i) => {
      const firstErr = validateField(`sister_${i}_firstName`, sis.firstName, { required: true, type: 'name', label: 'First name' });
      const lastErr = validateField(`sister_${i}_lastName`, sis.lastName, { required: false, type: 'name', label: 'Last name' });
      const genderErr = validateField(`sister_${i}_gender`, sis.gender, { required: true, type: 'name', label: 'Gender' });
      if (firstErr || lastErr || genderErr) isValid = false;
    });
    if (paternalGrandfatherEntry) {
      const firstErr = validateField('pat_gf_firstName', paternalGrandfatherEntry.firstName, { required: true, type: 'name', label: 'First name' });
      const lastErr = validateField('pat_gf_lastName', paternalGrandfatherEntry.lastName, { required: false, type: 'name', label: 'Last name' });
      const genderErr = validateField('pat_gf_gender', paternalGrandfatherEntry.gender, { required: true, type: 'name', label: 'Gender' });
      if (firstErr || lastErr || genderErr) isValid = false;
    }
    if (paternalGrandmotherEntry) {
      const firstErr = validateField('pat_gm_firstName', paternalGrandmotherEntry.firstName, { required: true, type: 'name', label: 'First name' });
      const lastErr = validateField('pat_gm_lastName', paternalGrandmotherEntry.lastName, { required: false, type: 'name', label: 'Last name' });
      const genderErr = validateField('pat_gm_gender', paternalGrandmotherEntry.gender, { required: true, type: 'name', label: 'Gender' });
      if (firstErr || lastErr || genderErr) isValid = false;
    }
    if (maternalGrandfatherEntry) {
      const firstErr = validateField('mat_gf_firstName', maternalGrandfatherEntry.firstName, { required: true, type: 'name', label: 'First name' });
      const lastErr = validateField('mat_gf_lastName', maternalGrandfatherEntry.lastName, { required: false, type: 'name', label: 'Last name' });
      const genderErr = validateField('mat_gf_gender', maternalGrandfatherEntry.gender, { required: true, type: 'name', label: 'Gender' });
      if (firstErr || lastErr || genderErr) isValid = false;
    }
    if (maternalGrandmotherEntry) {
      const firstErr = validateField('mat_gm_firstName', maternalGrandmotherEntry.firstName, { required: true, type: 'name', label: 'First name' });
      const lastErr = validateField('mat_gm_lastName', maternalGrandmotherEntry.lastName, { required: false, type: 'name', label: 'Last name' });
      const genderErr = validateField('mat_gm_gender', maternalGrandmotherEntry.gender, { required: true, type: 'name', label: 'Gender' });
      if (firstErr || lastErr || genderErr) isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateAll()) return;
    if (!hasAnyEntry) return;

    setLoading(true);
    try {
      const relatives: any[] = [];

      // 1. Father
      if (!existingData.hasParents && fatherEntry && fatherEntry.firstName.trim()) {
        relatives.push({
          type: 'father',
          firstName: fatherEntry.firstName.trim(),
          lastName: fatherEntry.lastName.trim(),
          gender: 'male',
        });
      }

      // 2. Mother
      if (!existingData.hasParents && motherEntry && motherEntry.firstName.trim()) {
        relatives.push({
          type: 'mother',
          firstName: motherEntry.firstName.trim(),
          lastName: motherEntry.lastName.trim(),
          gender: 'female',
        });
      }

      // 3. Spouse
      if (!existingData.hasSpouse && spouseEntry && spouseEntry.firstName.trim()) {
        relatives.push({
          type: 'spouse',
          firstName: spouseEntry.firstName.trim(),
          lastName: spouseEntry.lastName.trim(),
          gender: spouseEntry.gender,
        });
      }

      // 4. Children
      childEntries.forEach((child) => {
        if (child.firstName.trim()) {
          const item: any = {
            type: child.gender === 'female' ? 'daughter' : 'son',
            firstName: child.firstName.trim(),
            lastName: child.lastName.trim(),
            gender: child.gender,
          };
          if (showMarriagePicker && child.coParentPersonId) {
            item.coParentPersonId = child.coParentPersonId;
          }
          relatives.push(item);
        }
      });

      // 5. Brothers
      brotherEntries.forEach((bro) => {
        if (bro.firstName.trim()) {
          relatives.push({
            type: 'brother',
            firstName: bro.firstName.trim(),
            lastName: bro.lastName.trim(),
            gender: 'male',
          });
        }
      });

      // 6. Sisters
      sisterEntries.forEach((sis) => {
        if (sis.firstName.trim()) {
          relatives.push({
            type: 'sister',
            firstName: sis.firstName.trim(),
            lastName: sis.lastName.trim(),
            gender: 'female',
          });
        }
      });

      // 7. Paternal Grandfather
      if (paternalGrandfatherEntry && paternalGrandfatherEntry.firstName.trim()) {
        relatives.push({
          type: 'paternal_grandfather',
          firstName: paternalGrandfatherEntry.firstName.trim(),
          lastName: paternalGrandfatherEntry.lastName.trim(),
          gender: 'male',
        });
      }

      // 8. Paternal Grandmother
      if (paternalGrandmotherEntry && paternalGrandmotherEntry.firstName.trim()) {
        relatives.push({
          type: 'paternal_grandmother',
          firstName: paternalGrandmotherEntry.firstName.trim(),
          lastName: paternalGrandmotherEntry.lastName.trim(),
          gender: 'female',
        });
      }

      // 9. Maternal Grandfather
      if (maternalGrandfatherEntry && maternalGrandfatherEntry.firstName.trim()) {
        relatives.push({
          type: 'maternal_grandfather',
          firstName: maternalGrandfatherEntry.firstName.trim(),
          lastName: maternalGrandfatherEntry.lastName.trim(),
          gender: 'male',
        });
      }

      // 10. Maternal Grandmother
      if (maternalGrandmotherEntry && maternalGrandmotherEntry.firstName.trim()) {
        relatives.push({
          type: 'maternal_grandmother',
          firstName: maternalGrandmotherEntry.firstName.trim(),
          lastName: maternalGrandmotherEntry.lastName.trim(),
          gender: 'female',
        });
      }

      if (relatives.length === 0) {
        setLoading(false);
        return;
      }

      await neo4jAPI.quickAddRelatives(treeId, person.personId, relatives);

      toast({
        title: 'Family members added',
        description: `${relatives.length} family member${relatives.length > 1 ? 's' : ''} added successfully.`,
      });

      onSuccess();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add some family members.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const personName = [person.firstName, person.lastName].filter(Boolean).join(' ');

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen && !loading) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#2F3E8F]" />
            Quick Add Family for {personName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Parents Section */}
          {!existingData.hasParents && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-[#2F3E8F] uppercase tracking-wider mb-1">Parents</p>
              <div className="space-y-4">
                {fatherEntry ? (
                  <EntryRow
                    entry={fatherEntry}
                    onChange={setFatherEntry}
                    onRemove={handleFatherRemove}
                    label="Father"
                    genderLocked
                    errors={errors}
                    validateField={validateField}
                    sanitizeInput={sanitizeInput}
                    prefix="father"
                  />
                ) : (
                  <Button type="button" variant="outline" className="w-full h-11 border-dashed text-gray-500 hover:text-[#2F3E8F] hover:border-[#2F3E8F] hover:bg-[#F5F7FF] transition-all" onClick={() => setFatherEntry(emptyEntry('male', person.lastName))}>
                    <Plus className="h-4 w-4 mr-2" /> Add Father
                  </Button>
                )}
                {motherEntry ? (
                  <EntryRow
                    entry={motherEntry}
                    onChange={setMotherEntry}
                    onRemove={handleMotherRemove}
                    label="Mother"
                    genderLocked
                    errors={errors}
                    validateField={validateField}
                    sanitizeInput={sanitizeInput}
                    prefix="mother"
                  />
                ) : (
                  <Button type="button" variant="outline" className="w-full h-11 border-dashed text-gray-500 hover:text-[#2F3E8F] hover:border-[#2F3E8F] hover:bg-[#F5F7FF] transition-all" onClick={() => setMotherEntry(emptyEntry('female'))}>
                    <Plus className="h-4 w-4 mr-2" /> Add Mother
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Spouse Section */}
          {!existingData.hasSpouse && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-[#2F3E8F] uppercase tracking-wider mb-1">Spouse</p>
              <div className="space-y-4">
                {spouseEntry ? (
                  <EntryRow
                    entry={spouseEntry}
                    onChange={setSpouseEntry}
                    onRemove={handleSpouseRemove}
                    label="Spouse"
                    errors={errors}
                    validateField={validateField}
                    sanitizeInput={sanitizeInput}
                    prefix="spouse"
                  />
                ) : (
                  <Button type="button" variant="outline" className="w-full h-11 border-dashed text-gray-500 hover:text-[#2F3E8F] hover:border-[#2F3E8F] hover:bg-[#F5F7FF] transition-all" onClick={() => setSpouseEntry(emptyEntry(oppositeGender))}>
                    <Plus className="h-4 w-4 mr-2" /> Add Spouse
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Children Section */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-[#2F3E8F] uppercase tracking-wider mb-1">Children</p>
            <div className="space-y-4">
              {childEntries.map((child, i) => (
                <EntryRow
                  key={i}
                  entry={child}
                  label={`Child ${i + 1}`}
                  onChange={(updated) => {
                    const next = [...childEntries];
                    next[i] = updated;
                    setChildEntries(next);
                  }}
                  onRemove={() => handleChildRemove(i)}
                  errors={errors}
                  validateField={validateField}
                  sanitizeInput={sanitizeInput}
                  prefix={`child_${i}`}
                />
              ))}
              {childEntries.length < 5 && (
                <Button type="button" variant="outline" className="w-full h-11 border-dashed text-gray-500 hover:text-[#2F3E8F] hover:border-[#2F3E8F] hover:bg-[#F5F7FF] transition-all" onClick={() => setChildEntries([...childEntries, emptyEntry('male', person.lastName)])}>
                  <Plus className="h-4 w-4 mr-2" /> Add Child
                </Button>
              )}
            </div>
          </div>

          {/* Siblings Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-[#2F3E8F] uppercase tracking-wider">Siblings</p>
              {!isSiblingsEnabled && (
                <span className="text-[10px] text-amber-600 font-medium">Requires Father & Mother details</span>
              )}
            </div>
            <div className="space-y-4">
              {brotherEntries.map((bro, i) => (
                <EntryRow
                  key={`bro-${i}`}
                  entry={bro}
                  label={`Brother ${i + 1}`}
                  genderLocked
                  onChange={(updated) => {
                    const next = [...brotherEntries];
                    next[i] = updated;
                    setBrotherEntries(next);
                  }}
                  onRemove={() => handleBrotherRemove(i)}
                  errors={errors}
                  validateField={validateField}
                  sanitizeInput={sanitizeInput}
                  prefix={`brother_${i}`}
                />
              ))}
              {sisterEntries.map((sis, i) => (
                <EntryRow
                  key={`sis-${i}`}
                  entry={sis}
                  label={`Sister ${i + 1}`}
                  genderLocked
                  onChange={(updated) => {
                    const next = [...sisterEntries];
                    next[i] = updated;
                    setSisterEntries(next);
                  }}
                  onRemove={() => handleSisterRemove(i)}
                  errors={errors}
                  validateField={validateField}
                  sanitizeInput={sanitizeInput}
                  prefix={`sister_${i}`}
                />
              ))}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!isSiblingsEnabled}
                  className="flex-1 h-11 border-dashed text-gray-500 hover:text-[#2F3E8F] hover:border-[#2F3E8F] hover:bg-[#F5F7FF] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setBrotherEntries([...brotherEntries, emptyEntry('male', person.lastName)])}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Brother
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!isSiblingsEnabled}
                  className="flex-1 h-11 border-dashed text-gray-500 hover:text-[#2F3E8F] hover:border-[#2F3E8F] hover:bg-[#F5F7FF] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setSisterEntries([...sisterEntries, emptyEntry('female', person.lastName)])}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Sister
                </Button>
              </div>
            </div>
          </div>

          {/* Paternal Grandparents Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-[#2F3E8F] uppercase tracking-wider">Paternal Grandparents</p>
              {!isPaternalEnabled && (
                <span className="text-[10px] text-amber-600 font-medium">Requires Father details</span>
              )}
            </div>
            <div className="space-y-4">
              {paternalGrandfatherEntry ? (
                <EntryRow
                  entry={paternalGrandfatherEntry}
                  onChange={setPaternalGrandfatherEntry}
                  onRemove={handlePaternalGrandfatherRemove}
                  label="Paternal Grandfather"
                  genderLocked
                  errors={errors}
                  validateField={validateField}
                  sanitizeInput={sanitizeInput}
                  prefix="pat_gf"
                />
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={!isPaternalEnabled}
                  className="w-full h-11 border-dashed text-gray-500 hover:text-[#2F3E8F] hover:border-[#2F3E8F] hover:bg-[#F5F7FF] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setPaternalGrandfatherEntry(emptyEntry('male', fatherEntry?.lastName || person.lastName))}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Paternal Grandfather
                </Button>
              )}
              {paternalGrandmotherEntry ? (
                <EntryRow
                  entry={paternalGrandmotherEntry}
                  onChange={setPaternalGrandmotherEntry}
                  onRemove={handlePaternalGrandmotherRemove}
                  label="Paternal Grandmother"
                  genderLocked
                  errors={errors}
                  validateField={validateField}
                  sanitizeInput={sanitizeInput}
                  prefix="pat_gm"
                />
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={!isPaternalEnabled}
                  className="w-full h-11 border-dashed text-gray-500 hover:text-[#2F3E8F] hover:border-[#2F3E8F] hover:bg-[#F5F7FF] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setPaternalGrandmotherEntry(emptyEntry('female'))}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Paternal Grandmother
                </Button>
              )}
            </div>
          </div>

          {/* Maternal Grandparents Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-[#2F3E8F] uppercase tracking-wider">Maternal Grandparents</p>
              {!isMaternalEnabled && (
                <span className="text-[10px] text-amber-600 font-medium">Requires Mother details</span>
              )}
            </div>
            <div className="space-y-4">
              {maternalGrandfatherEntry ? (
                <EntryRow
                  entry={maternalGrandfatherEntry}
                  onChange={setMaternalGrandfatherEntry}
                  onRemove={handleMaternalGrandfatherRemove}
                  label="Maternal Grandfather"
                  genderLocked
                  errors={errors}
                  validateField={validateField}
                  sanitizeInput={sanitizeInput}
                  prefix="mat_gf"
                />
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={!isMaternalEnabled}
                  className="w-full h-11 border-dashed text-gray-500 hover:text-[#2F3E8F] hover:border-[#2F3E8F] hover:bg-[#F5F7FF] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setMaternalGrandfatherEntry(emptyEntry('male', motherEntry?.lastName))}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Maternal Grandfather
                </Button>
              )}
              {maternalGrandmotherEntry ? (
                <EntryRow
                  entry={maternalGrandmotherEntry}
                  onChange={setMaternalGrandmotherEntry}
                  onRemove={handleMaternalGrandmotherRemove}
                  label="Maternal Grandmother"
                  genderLocked
                  errors={errors}
                  validateField={validateField}
                  sanitizeInput={sanitizeInput}
                  prefix="mat_gm"
                />
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={!isMaternalEnabled}
                  className="w-full h-11 border-dashed text-gray-500 hover:text-[#2F3E8F] hover:border-[#2F3E8F] hover:bg-[#F5F7FF] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setMaternalGrandmotherEntry(emptyEntry('female'))}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Maternal Grandmother
                </Button>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4 border-t border-gray-100 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-11 md:h-10 text-sm font-medium"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              className="flex-1 h-11 md:h-10 text-sm font-medium bg-[#2F3E8F] hover:bg-[#25327A]"
              disabled={loading || isFormInvalid()}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create All
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
