/**
 * PersonFieldsCore - Shared person fields component used by all add/edit modals
 *
 * Provides a consistent set of person-level fields across the entire application.
 * Two modes:
 *   - 'quick-add': Name + Gender always visible, everything else in a single collapsible block
 *   - 'full': Same fields but sections auto-expand when data exists (for EditPersonModal)
 *
 * Standardizations enforced:
 *   - Religion: Always a Select dropdown (never free-text)
 *   - Elder Status: Always 'elder' | 'younger' | undefined
 *   - Native Language: Always a Select dropdown
 *   - Last Name: Optional by default
 */

import { useState, useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/DateInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { RELIGION_OPTIONS, NATIVE_LANGUAGE_OPTIONS, isCustomReligion, isCustomLanguage } from '@/components/forms/CulturalMetadataFields';
import { aiApiCalls } from '@/api/apicalls';
import { PlaceAutocomplete } from '@/components/ui/PlaceAutocomplete';
import type { Person } from '@/types';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface PersonFieldsCoreProps {
  /** Current form values */
  values: Partial<Person>;
  /** Called when any field changes */
  onChange: (updates: Partial<Person>) => void;
  /** 'quick-add' = collapsed optional fields; 'full' = auto-expand if data exists */
  mode: 'quick-add' | 'full';
  /** Whether last name is required (default: false) */
  lastNameRequired?: boolean;
  /** Show biography field (default: false) */
  showBiography?: boolean;
  /** Reference person for contextual labels (e.g., \"Age relative to X\") */
  referencePerson?: Person;
  /** Pre-fill gender suggestion based on role (user can always override) */
  genderSuggestion?: 'male' | 'female';
  /** Suggest last name based on family rules */
  lastNameSuggestion?: string;
  /** Disable all fields */
  disabled?: boolean;
  /** Support date qualifiers (circa/before/after) — only in 'full' mode */
  showDateQualifiers?: boolean;
  /** Disable AI gender suggestions (for Edit mode) */
  isEdit?: boolean;
  /** Validation errors map */
  errors?: Record<string, string>;
  /** Validation function from useFormValidation */
  validateField?: (name: string, value: string, config: any) => string;
  /** Input sanitization function from useFormValidation */
  sanitizeInput?: (value: string) => string;
  /** Hide elder status / age relative to field */
  hideElderStatus?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function PersonFieldsCore({
  values,
  onChange,
  mode,
  lastNameRequired = false,
  showBiography = false,
  referencePerson,
  genderSuggestion,
  lastNameSuggestion,
  disabled = false,
  showDateQualifiers = false,
  isEdit = false,
  errors = {},
  validateField,
  sanitizeInput,
  hideElderStatus = false,
}: PersonFieldsCoreProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  // Determine if optional section should auto-expand
  const hasExistingOptionalData = !!(
    values.birthDate || values.birthPlace || values.religion ||
    values.gotra || values.caste || values.nativePlace || values.nativeLanguage ||
    values.elderStatus || values.occupation || values.education ||
    values.middleName || values.maidenName || values.biography ||
    (values.isLiving === false)
  );

  const [showMore, setShowMore] = useState(
    mode === 'full' ? hasExistingOptionalData : false
  );

  // Re-sync expansion when switching persons in full mode
  useEffect(() => {
    if (mode === 'full') {
      setShowMore(hasExistingOptionalData);
    }
  }, [values.firstName, values.lastName, mode]);

  // Apply gender suggestion on mount (only if gender not already set)
  useEffect(() => {
    if (genderSuggestion && !values.gender) {
      onChange({ gender: genderSuggestion });
    }
  }, [genderSuggestion]);

  // Apply last name suggestion on mount (only if last name not already set)
  useEffect(() => {
    if (lastNameSuggestion && !values.lastName) {
      onChange({ lastName: lastNameSuggestion });
    }
  }, [lastNameSuggestion]);

  const [aiSuggestedGender, setAiSuggestedGender] = useState<'male' | 'female' | 'other' | null>(null);
  const [loadingGender, setLoadingGender] = useState(false);
  const [hasManuallySelectedGender, setHasManuallySelectedGender] = useState(false);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Debounced API call to identify gender by first name
  useEffect(() => {
    if (isEdit) {
      setAiSuggestedGender(null);
      return;
    }

    const name = (values.firstName || '').trim();
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
            onChangeRef.current({ gender: extractedGender });
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
  }, [values.firstName, hasManuallySelectedGender, isEdit]);

  const updateField = <K extends keyof Person>(field: K, value: Person[K] | undefined) => {
    onChange({ [field]: value } as Partial<Person>);
  };

  const handleFieldChange = (field: string, val: string, config?: any) => {
    const sanitized = (config?.type === 'name' || config?.type === 'description') && sanitizeInput
      ? sanitizeInput(val)
      : val;

    onChange({ [field]: sanitized } as Partial<Person>);

    if (validateField && config) {
      validateField(field, sanitized, config);
    }
  };

  const handleDateChange = (field: 'birthDate' | 'deathDate', val: string) => {
    // 1. Update the local state
    const newValues = { ...values, [field]: val };
    onChange({ [field]: val } as Partial<Person>);

    // 2. Perform validation if validateField is available
    if (validateField) {
      const isDeceased = newValues.isLiving === false;
      const bDate = newValues.birthDate || '';
      const dDate = isDeceased ? newValues.deathDate || '' : '';

      // Validate birthDate
      const birthConfig = {
        type: 'date' as any,
        label: 'Birth date',
        pairedDate: dDate,
      };
      validateField('birthDate', bDate, birthConfig);

      // Validate deathDate
      const deathConfig = {
        type: 'date' as any,
        label: 'Death date',
        pairedDate: bDate,
      };
      validateField('deathDate', dDate, deathConfig);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-4">
      {/* ================================================================== */}
      {/* Required Fields (always visible) — D1 quick mode: 4 fields only */}
      {/* ================================================================== */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="pfc-firstName">First Name *</Label>
            <Input
              id="pfc-firstName"
              value={values.firstName || ''}
              onChange={(e) => handleFieldChange('firstName', e.target.value, { required: true, type: 'name', label: 'First name' })}
              required
              disabled={disabled}
              error={errors?.firstName}
              showCharCount
              charLimit={50}
            />
          </div>
          <div>
            <Label htmlFor="pfc-lastName" className="flex items-center justify-between mb-3">
              <span>Last Name{lastNameRequired ? ' *' : ''}</span>
              {lastNameSuggestion && values.lastName === lastNameSuggestion && (
                <span className="text-[10px] text-muted-foreground font-normal normal-case">Suggested from family</span>
              )}
            </Label>
            <Input
              id="pfc-lastName"
              value={values.lastName || ''}
              onChange={(e) => handleFieldChange('lastName', e.target.value, { required: lastNameRequired, type: 'name', label: 'Last name' })}
              required={lastNameRequired}
              disabled={disabled}
              error={errors?.lastName}
              showCharCount
              charLimit={50}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="pfc-gender" className="flex items-center justify-between">
            <span>Gender *</span>
            {!isEdit && loadingGender && <span className="text-[10px] text-muted-foreground animate-pulse">Detecting...</span>}
          </Label>
          <Select
            value={values.gender || ''}
            onValueChange={(value) => {
              setHasManuallySelectedGender(true);
              const val = value as 'male' | 'female' | 'other';
              updateField('gender', val);
              if (validateField) {
                validateField('gender', val, { required: true, type: 'name', label: 'Gender' });
              }
            }}
            disabled={disabled}
          >
            <SelectTrigger className={cn(
              "h-11 md:h-9 bg-white dark:bg-transparent transition-all",
              errors?.gender ? "border-red-500 focus:ring-red-500/20" : ""
            )}>
              <SelectValue placeholder="Select gender" />
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
          {errors?.gender && (
            <span className="text-[11px] text-red-500 font-medium mt-1.5 px-1 block animate-in fade-in-50 slide-in-from-top-1 duration-150">
              {errors.gender}
            </span>
          )}
          {genderSuggestion && !aiSuggestedGender && (
            <p className="text-xs text-muted-foreground mt-1">Suggested based on role — you can change this</p>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* Optional Fields Toggle (hidden in full mode — all fields always visible) */}
      {/* ================================================================== */}
      {mode !== 'full' && (
        <button
          type="button"
          onClick={() => setShowMore(!showMore)}
          className="flex items-center gap-2 w-full text-sm text-[#2F3E8F] hover:text-[#8B5E3C] font-medium py-2"
        >
          {showMore ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {showMore ? 'Hide additional details' : 'Add more details'}
        </button>
      )}

      {/* ================================================================== */}
      {/* Optional Fields — always visible in full mode, collapsible in quick-add */}
      {/* ================================================================== */}
      {(mode === 'full' || showMore) && (
        <div className="space-y-4">
          {/* Middle + Maiden Name — moved from the required section per D1 quick-mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pfc-middleName">Middle Name</Label>
              <Input
                id="pfc-middleName"
                value={values.middleName || ''}
                onChange={(e) => handleFieldChange('middleName', e.target.value, { required: false, type: 'name', label: 'Middle name' })}
                placeholder="e.g., parent's name, spouse's name"
                disabled={disabled}
                error={errors?.middleName}
                showCharCount
                charLimit={50}
              />
              <p className="text-xs text-muted-foreground mt-1">Optional — any additional name or identifier</p>
            </div>
            <div>
              <Label htmlFor="pfc-maidenName">Maiden Name</Label>
              <Input
                id="pfc-maidenName"
                value={values.maidenName || ''}
                onChange={(e) => handleFieldChange('maidenName', e.target.value, { required: false, type: 'name', label: 'Maiden name' })}
                placeholder="Name at birth or previous family name"
                disabled={disabled}
                error={errors?.maidenName}
                showCharCount
                charLimit={50}
              />
              <p className="text-xs text-muted-foreground mt-1">Optional — birth name or previously used family name</p>
            </div>
          </div>

          {/* Birth Date */}
          <div>
            <Label htmlFor="pfc-birthDate">Birth Date</Label>
            <DateInput
              id="pfc-birthDate"
              value={values.birthDate || ''}
              onChange={(e) => handleDateChange('birthDate', e.target.value)}
              disabled={disabled}
              max={values.isLiving === false ? (values.deathDate || todayStr) : todayStr}
              {...(showDateQualifiers ? {
                qualifier: values.birthDateQualifier ?? undefined,
                onQualifierChange: (q: 'exact' | 'about' | 'before' | 'after' | 'between') => updateField('birthDateQualifier', q),
                endDate: values.birthDateEnd ?? undefined,
                onEndDateChange: (e: { target: { value: string } }) => updateField('birthDateEnd', e.target.value),
              } : {})}
            />
            {errors?.birthDate && (
              <span className="text-[11px] text-red-500 font-medium mt-1.5 px-1 block animate-in fade-in-50 slide-in-from-top-1 duration-150">
                {errors.birthDate}
              </span>
            )}
          </div>

          {/* Birth Place */}
          <div>
            <Label htmlFor="pfc-birthPlace">Birth Place</Label>
            <PlaceAutocomplete
              id="pfc-birthPlace"
              value={values.birthPlace || ''}
              onChange={(val) => handleFieldChange('birthPlace', val, { required: false, type: 'location', label: 'Birth Place' })}
              disabled={disabled}
              placeholder="Search for birth place..."
              error={errors?.birthPlace}
            />
          </div>

          {/* Religion (standardized Select) */}
          <div>
            <Label htmlFor="pfc-religion">Religion</Label>
            <Select
              value={isCustomReligion(values.religion) ? 'Other' : (values.religion || 'not-specified')}
              onValueChange={(value) => {
                const val = value === 'not-specified' ? undefined : value;
                updateField('religion', val);
                if (validateField) {
                  validateField('religion', val === 'Other' ? '' : (val || ''), { required: false, type: 'name', label: 'Religion' });
                }
              }}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not-specified">Not specified</SelectItem>
                {RELIGION_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isCustomReligion(values.religion) && (
              <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-150">
                <Label htmlFor="pfc-religion-other">Specify Religion</Label>
                <Input
                  id="pfc-religion-other"
                  value={values.religion === 'Other' ? '' : (values.religion || '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleFieldChange('religion', val || 'Other', { required: false, type: 'name', label: 'Religion' });
                  }}
                  placeholder="Enter religion"
                  disabled={disabled}
                  error={errors?.religion}
                  showCharCount
                  charLimit={50}
                />
              </div>
            )}
          </div>

          {/* Cultural: Gotra + Caste */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pfc-gotra">Gotra (गोत्र)</Label>
              <Input
                id="pfc-gotra"
                value={values.gotra || ''}
                onChange={(e) => handleFieldChange('gotra', e.target.value, { required: false, type: 'name', label: 'Gotra' })}
                placeholder="e.g., Bharadwaja, Kashyap"
                disabled={disabled}
                error={errors?.gotra}
                showCharCount
                charLimit={50}
              />
            </div>
            <div>
              <Label htmlFor="pfc-caste">Caste / Jati</Label>
              <Input
                id="pfc-caste"
                value={values.caste || ''}
                onChange={(e) => handleFieldChange('caste', e.target.value, { required: false, type: 'name', label: 'Caste' })}
                placeholder="e.g., Brahmin, Kshatriya"
                disabled={disabled}
                error={errors?.caste}
                showCharCount
                charLimit={50}
              />
              <p className="text-xs text-muted-foreground mt-1">Optional — sensitive information</p>
            </div>
          </div>

          {/* Cultural: Native Place + Native Language */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pfc-nativePlace">Native Place</Label>
              <PlaceAutocomplete
                id="pfc-nativePlace"
                value={values.nativePlace || ''}
                onChange={(val) => handleFieldChange('nativePlace', val, { required: false, type: 'location', label: 'Native Place' })}
                disabled={disabled}
                placeholder="Search for native place..."
                error={errors?.nativePlace}
              />
            </div>
            <div>
              <Label htmlFor="pfc-nativeLanguage">Native Language</Label>
              <Select
                value={isCustomLanguage(values.nativeLanguage) ? 'Other' : (values.nativeLanguage || 'not-specified')}
                onValueChange={(value) => {
                  const val = value === 'not-specified' ? undefined : value;
                  updateField('nativeLanguage', val);
                  if (validateField) {
                    validateField('nativeLanguage', val === 'Other' ? '' : (val || ''), { required: false, type: 'name', label: 'Native Language' });
                  }
                }}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not-specified">Not specified</SelectItem>
                  {NATIVE_LANGUAGE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isCustomLanguage(values.nativeLanguage) && (
              <div className="col-span-1 sm:col-span-2 animate-in fade-in slide-in-from-top-1 duration-150">
                <Label htmlFor="pfc-nativeLanguage-other">Specify Native Language</Label>
                <Input
                  id="pfc-nativeLanguage-other"
                  value={values.nativeLanguage === 'Other' ? '' : (values.nativeLanguage || '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleFieldChange('nativeLanguage', val || 'Other', { required: false, type: 'name', label: 'Native Language' });
                  }}
                  placeholder="Enter native language"
                  disabled={disabled}
                  error={errors?.nativeLanguage}
                  showCharCount
                  charLimit={50}
                />
              </div>
            )}
          </div>

          {/* Elder Status */}
          {!hideElderStatus && (
            <div>
              <Label htmlFor="pfc-elderStatus">
                {referencePerson
                  ? `Age relative to ${referencePerson.firstName}`
                  : 'Elder Status'}
              </Label>
              <Select
                value={values.elderStatus || 'not-specified'}
                onValueChange={(value) => updateField('elderStatus', value === 'not-specified' ? undefined : value as 'elder' | 'younger')}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not-specified">Not specified</SelectItem>
                  <SelectItem value="elder">Elder (बड़ा/बड़ी)</SelectItem>
                  <SelectItem value="younger">Younger (छोटा/छोटी)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Living Status */}
          <div>
            <Label htmlFor="pfc-isLiving">Status</Label>
            <Select
              value={values.isLiving === false ? 'deceased' : 'living'}
              onValueChange={(value) => {
                const isLiving = value === 'living';
                onChange({ isLiving, deathDate: isLiving ? undefined : values.deathDate } as Partial<Person>);
                if (validateField) {
                  // Clear deathDate error
                  validateField('deathDate', '', { type: 'date' as any, label: 'Death date' });
                  // Revalidate birthDate with empty deathDate
                  validateField('birthDate', values.birthDate || '', { type: 'date' as any, label: 'Birth date', pairedDate: '' });
                }
              }}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="living">Living</SelectItem>
                <SelectItem value="deceased">Deceased</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Death Fields (conditional) */}
          {values.isLiving === false && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pfc-deathDate">Death Date</Label>
                <DateInput
                  id="pfc-deathDate"
                  value={values.deathDate || ''}
                  onChange={(e) => handleDateChange('deathDate', e.target.value)}
                  disabled={disabled}
                  min={values.birthDate || undefined}
                  max={todayStr}
                  {...(showDateQualifiers ? {
                    qualifier: values.deathDateQualifier ?? undefined,
                    onQualifierChange: (q: 'exact' | 'about' | 'before' | 'after' | 'between') => updateField('deathDateQualifier', q),
                    endDate: values.deathDateEnd ?? undefined,
                    onEndDateChange: (e: { target: { value: string } }) => updateField('deathDateEnd', e.target.value),
                  } : {})}
                />
                {errors?.deathDate && (
                  <span className="text-[11px] text-red-500 font-medium mt-1.5 px-1 block animate-in fade-in-50 slide-in-from-top-1 duration-150">
                    {errors.deathDate}
                  </span>
                )}
              </div>
              <div>
                <Label htmlFor="pfc-deathPlace">Death Place</Label>
                <PlaceAutocomplete
                  id="pfc-deathPlace"
                  value={values.deathPlace || ''}
                  onChange={(val) => handleFieldChange('deathPlace', val, { required: false, type: 'location', label: 'Death Place' })}
                  disabled={disabled}
                  placeholder="Search for death place..."
                  error={errors?.deathPlace}
                />
              </div>
            </div>
          )}

          {/* Occupation + Education */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pfc-occupation">Occupation</Label>
              <Input
                id="pfc-occupation"
                value={values.occupation || ''}
                onChange={(e) => handleFieldChange('occupation', e.target.value, { required: false, type: 'location', label: 'Occupation' })}
                disabled={disabled}
                error={errors?.occupation}
                showCharCount
                charLimit={50}
              />
            </div>
            <div>
              <Label htmlFor="pfc-education">Education</Label>
              <Input
                id="pfc-education"
                value={values.education || ''}
                onChange={(e) => handleFieldChange('education', e.target.value, { required: false, type: 'location', label: 'Education' })}
                placeholder="e.g., B.Tech, M.A."
                disabled={disabled}
                error={errors?.education}
                showCharCount
                charLimit={50}
              />
            </div>
          </div>

          {/* Biography (optional) */}
          {showBiography && (
            <div>
              <Label htmlFor="pfc-biography">Biography</Label>
              <Textarea
                id="pfc-biography"
                value={values.biography || ''}
                onChange={(e) => handleFieldChange('biography', e.target.value, { required: false, type: 'biography', label: 'Biography' })}
                placeholder="Brief biography or notes"
                rows={4}
                disabled={disabled}
                error={errors?.biography}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
