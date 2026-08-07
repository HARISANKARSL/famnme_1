/**
 * CulturalMetadataFields - Form fields for Indian cultural information
 *
 * Provides input fields for Indian-specific cultural metadata:
 * - Gotra (clan/lineage)
 * - Caste (social group) - optional, sensitive
 * - Religion
 * - Native place (ancestral village)
 * - Native language
 * - Elder status
 *
 * Used in: Person creation/editing forms
 *
 * @see references/new file-ancestry.md - Cultural context
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info } from 'lucide-react';
import { GOTRAS } from '@/data/gotras';

// ============================================================================
// Shared Option Constants (used by PersonFieldsCore and this component)
// ============================================================================

export const RELIGION_OPTIONS = [
  { value: 'Hindu', label: 'Hindu' },
  { value: 'Muslim', label: 'Muslim' },
  { value: 'Christian', label: 'Christian' },
  { value: 'Sikh', label: 'Sikh' },
  { value: 'Buddhist', label: 'Buddhist' },
  { value: 'Jain', label: 'Jain' },
  { value: 'Parsi', label: 'Parsi' },
  { value: 'Other', label: 'Other' },
  { value: 'Prefer not to say', label: 'Prefer not to say' },
] as const;

export const NATIVE_LANGUAGE_OPTIONS = [
  { value: 'Hindi', label: 'Hindi (हिन्दी)' },
  { value: 'Bengali', label: 'Bengali (বাংলা)' },
  { value: 'Telugu', label: 'Telugu (తెలుగు)' },
  { value: 'Marathi', label: 'Marathi (मराठी)' },
  { value: 'Tamil', label: 'Tamil (தமிழ்)' },
  { value: 'Gujarati', label: 'Gujarati (ગુજરાતી)' },
  { value: 'Kannada', label: 'Kannada (ಕನ್ನಡ)' },
  { value: 'Malayalam', label: 'Malayalam (മലയാളം)' },
  { value: 'Punjabi', label: 'Punjabi (ਪੰਜਾਬੀ)' },
  { value: 'Odia', label: 'Odia (ଓଡ଼ିଆ)' },
  { value: 'Urdu', label: 'Urdu (اردو)' },
  { value: 'Other', label: 'Other' },
] as const;

export const isCustomReligion = (val: string | undefined | null): boolean => {
  if (!val || val === 'not-specified') return false;
  return !RELIGION_OPTIONS.some(opt => opt.value === val && opt.value !== 'Other');
};

export const isCustomLanguage = (val: string | undefined | null): boolean => {
  if (!val || val === 'not-specified') return false;
  return !NATIVE_LANGUAGE_OPTIONS.some(opt => opt.value === val && opt.value !== 'Other');
};
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ============================================================================
// Types
// ============================================================================

export interface CulturalMetadata {
  gotra?: string;
  caste?: string;
  religion?: string;
  nativePlace?: string;
  nativeLanguage?: string;
  elderStatus?: 'elder' | 'younger';
}

export interface CulturalMetadataFieldsProps {
  /** Current values */
  values: CulturalMetadata;

  /** Update handler */
  onChange: (values: CulturalMetadata) => void;

  /** Show all fields or just common ones */
  mode?: 'full' | 'compact';

  /** Disable all fields */
  disabled?: boolean;

  /** Fields to hide (e.g. when promoted to essential section) */
  hideFields?: (keyof CulturalMetadata)[];

  /** Auto-inherited gotra from father (for new children) */
  inheritedGotra?: string;
}

// ============================================================================
// Component
// ============================================================================

export function CulturalMetadataFields({
  values,
  onChange,
  mode = 'full',
  disabled = false,
  hideFields,
  inheritedGotra,
}: CulturalMetadataFieldsProps) {
  const updateField = (field: keyof CulturalMetadata, value: string | undefined) => {
    onChange({
      ...values,
      [field]: value || undefined,
    });
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="border-b pb-2">
        <h3 className="text-sm font-semibold text-gray-900">
          Cultural Information
        </h3>
        <p className="text-xs text-gray-500">
          Optional fields for Indian cultural context
        </p>
      </div>

      {/* Gotra */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Label htmlFor="gotra">Gotra (गोत्र)</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Clan/lineage in Hindu tradition. Traced through the paternal line.
                  Important for marriage customs (same gotra marriage typically prohibited).
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input
          id="gotra"
          value={values.gotra || ''}
          onChange={(e) => updateField('gotra', e.target.value)}
          placeholder="e.g., Bharadwaja, Kashyap, Vishwamitra"
          disabled={disabled}
          list="gotra-autocomplete"
        />
        <datalist id="gotra-autocomplete">
          {GOTRAS.map(g => <option key={g} value={g} />)}
        </datalist>
        {inheritedGotra && (
          <p className="text-xs text-emerald-600 mt-1">
            Auto-inherited from father: <strong>{inheritedGotra}</strong>
          </p>
        )}
        {inheritedGotra && values.gotra && values.gotra !== inheritedGotra && (
          <p className="text-xs text-[#2F3E8F] mt-1 flex items-center gap-1">
            <Info className="h-3 w-3" />
            Different from father&apos;s gotra ({inheritedGotra}). Verify if this is intentional.
          </p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Common gotras: Bharadwaja, Kashyap, Vasistha, Vishwamitra, Atri, Jamadagni, Gautama
        </p>
      </div>

      {/* Religion */}
      {!hideFields?.includes('religion') && (
        <div>
          <Label htmlFor="religion">Religion</Label>
          <Select
            value={values.religion || 'not-specified'}
            onValueChange={(value) => updateField('religion', value === 'not-specified' ? undefined : value)}
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
        </div>
      )}

      {/* Full Mode Additional Fields */}
      {mode === 'full' && (
        <>
          {/* Caste (Sensitive - Optional) */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Label htmlFor="caste">Caste (जाति) - Optional</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      Social group classification. This field is optional and sensitive.
                      Only include if relevant for historical/genealogical record-keeping.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="caste"
              value={values.caste || ''}
              onChange={(e) => updateField('caste', e.target.value)}
              placeholder="Optional - only if historically relevant"
              disabled={disabled}
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional. Only shared with people you invite to this tree.
            </p>
          </div>

          {/* Native Place */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Label htmlFor="nativePlace">Native Place (मूल निवास)</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      Ancestral village or place of origin. Common in Indian families to
                      track where ancestors came from.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="nativePlace"
              value={values.nativePlace || ''}
              onChange={(e) => updateField('nativePlace', e.target.value)}
              placeholder="e.g., Village name, District, State"
              disabled={disabled}
            />
          </div>

          {/* Native Language */}
          <div>
            <Label htmlFor="nativeLanguage">Native Language (मातृभाषा)</Label>
            <Select
              value={values.nativeLanguage || 'not-specified'}
              onValueChange={(value) => updateField('nativeLanguage', value === 'not-specified' ? undefined : value)}
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

          {/* Elder Status */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Label htmlFor="elderStatus">Elder/Younger Status</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      For siblings: Indicates if this person is elder or younger than their
                      reference sibling. Important for Indian kinship terminology.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
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
            <p className="text-xs text-gray-500 mt-1">
              Used for proper kinship terms (e.g., ताऊ vs चाचा)
            </p>
          </div>
        </>
      )}

      {/* Cultural Note */}
      <div className="p-3 bg-[#E8EDFF] border border-[#2F3E8F]/30 rounded-lg">
        <p className="text-xs text-[#2F3E8F]">
          <strong>Note:</strong> These fields help preserve cultural context and enable accurate
          relationship terminology. All fields are optional and can be left blank.
        </p>
      </div>
    </div>
  );
}
