/**
 * EditPersonModal - Slide-in side panel for editing person details using Neo4j backend
 *
 * Renders as a right-side drawer that slides over the profile page,
 * keeping the person's profile visible on the left for context.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useResponsive } from '@/hooks/useResponsive';
import { useFormValidation } from '@/hooks/useFormValidation';
import { isCustomReligion, isCustomLanguage } from '@/components/forms/CulturalMetadataFields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, X, Users, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { PersonFieldsCore } from '@/components/forms/PersonFieldsCore';
import * as neo4jAPI from '@/services/neo4jDataService';
import { useAuthStore } from '@/store/authStore';
import { useContributorStore } from '@/store/contributorStore';
import { ContributorEditBanner } from '@/components/ui/ContributorEditBanner';
import type { Person } from '@/types';
import { PhotoUploadInput } from '@/components/ui/PhotoUploadInput';
import { PlaceAutocomplete } from '@/components/ui/PlaceAutocomplete';
import { resolveBackendUrl } from '@/config/api';
import { validatePersonDates, type TemporalWarning } from '@/services/temporalValidationService';
import { getPersonPhotoUrl, getDefaultAvatar } from '@/utils/personPhotoUtils';



export interface EditPersonModalProps {
  open: boolean;
  onClose: () => void;
  person: Person;
  onSuccess?: () => void;
  treeId?: string;
  treePersons?: Person[];
}

export function EditPersonModal({
  open,
  onClose,
  person,
  onSuccess,
  treeId,
  treePersons,
}: EditPersonModalProps) {
  const { toast } = useToast();
  const { isMobile } = useResponsive();
  const { errors, validateField, sanitizeInput, validateStep, resetValidation } = useFormValidation();
  const { user } = useAuthStore();
  const userId = user?.id || 'demo-user-001';
  const myRole = useContributorStore(s => s.myRole);
  const ownerName = useContributorStore(s => s.ownerName);
  const addDraftItem = useContributorStore(s => s.addDraftItem);
  const isContributor = myRole === 'contributor';
  const [loading, setLoading] = useState(false);
  const [temporalWarnings, setTemporalWarnings] = useState<TemporalWarning[]>([]);
  const [warningsAcknowledged, setWarningsAcknowledged] = useState(false);
  // Initialize formData directly from person prop — avoids a blank first render
  // that causes Radix UI Select to lock onto the fallback value.
  const buildFormData = (p: Person): Partial<Person> => ({
    firstName: p.firstName,
    lastName: p.lastName,
    middleName: p.middleName,
    maidenName: p.maidenName,
    gender: p.gender,
    birthDate: p.birthDate,
    birthDateQualifier: p.birthDateQualifier,
    birthDateEnd: p.birthDateEnd,
    birthPlace: p.birthPlace,
    deathDate: p.deathDate,
    deathDateQualifier: p.deathDateQualifier,
    deathDateEnd: p.deathDateEnd,
    deathPlace: p.deathPlace,
    isLiving: p.isLiving,
    occupation: p.occupation,
    education: p.education,
    biography: p.biography,
    gotra: p.gotra,
    caste: p.caste,
    religion: p.religion,
    nativePlace: p.nativePlace,
    nativeLanguage: p.nativeLanguage,
    elderStatus: p.elderStatus,
  });
  const [formData, setFormData] = useState<Partial<Person>>(() => buildFormData(person));
  const initialFormDataRef = useRef<Partial<Person>>(buildFormData(person));

  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [fetchedPerson, setFetchedPerson] = useState<Person>(person);
  const [isFetchingFresh, setIsFetchingFresh] = useState(false);


  // Parent reassignment state
  const [currentParents, setCurrentParents] = useState<Person[]>([]);
  const [showParentEditor, setShowParentEditor] = useState(false);
  const [selectedFatherId, setSelectedFatherId] = useState<string>('');
  const [selectedMotherId, setSelectedMotherId] = useState<string>('');
  const [parentSearchQuery, setParentSearchQuery] = useState('');
  const [savingParents, setSavingParents] = useState(false);

  // Fetch current parents on open
  const fetchParents = useCallback(async () => {
    try {
      const result = await neo4jAPI.getPersonParents(person.personId);
      setCurrentParents(result.parents);
      const father = result.parents.find(p => p.gender === 'male');
      const mother = result.parents.find(p => p.gender === 'female');
      setSelectedFatherId(father?.personId || '');
      setSelectedMotherId(mother?.personId || '');
    } catch {
      // Silently fail — parents section will show empty
    }
  }, [person.personId]);

  const fetchFreshData = useCallback(async () => {
    try {
      setIsFetchingFresh(true);
      const data = await neo4jAPI.getPerson(person.personId);
      setFetchedPerson(data);
      setFormData(buildFormData(data));
      initialFormDataRef.current = buildFormData(data);
    } catch (err) {
      console.error('Failed to fetch fresh person data:', err);
    } finally {
      setIsFetchingFresh(false);
    }
  }, [person.personId]);

  useEffect(() => {
    if (open) {
      fetchFreshData();
      fetchParents();
      resetValidation();
    }
  }, [open, fetchFreshData, fetchParents, resetValidation]);


  // Re-sync form data if a different person is loaded into the same modal instance
  useEffect(() => {
    const fresh = buildFormData(person);
    setFormData(fresh);
    setFetchedPerson(person);
    initialFormDataRef.current = fresh;
    setShowParentEditor(false);
  }, [person.personId]);


  // Cleanup preview URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (photoPreviewUrl && photoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);
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
      gotra: { required: false, type: 'name', label: 'Gotra' },
      caste: { required: false, type: 'name', label: 'Caste' },
      occupation: { required: false, type: 'location', label: 'Occupation' },
      education: { required: false, type: 'location', label: 'Education' },
      birthPlace: { required: false, type: 'location', label: 'Birth Place' },
      nativePlace: { required: false, type: 'location', label: 'Native Place' },
      deathPlace: { required: false, type: 'location', label: 'Death Place' },
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
      gotra: (formData.gotra || '').trim(),
      caste: (formData.caste || '').trim(),
      occupation: (formData.occupation || '').trim(),
      education: (formData.education || '').trim(),
      birthPlace: (formData.birthPlace || '').trim(),
      nativePlace: (formData.nativePlace || '').trim(),
      deathPlace: formData.isLiving === false ? (formData.deathPlace || '').trim() : '',
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
      middleName: formData.middleName ? formData.middleName.trim() : '',
      maidenName: formData.maidenName ? formData.maidenName.trim() : '',
      biography: formData.biography ? formData.biography.trim() : '',
      gotra: formData.gotra ? formData.gotra.trim() : '',
      caste: formData.caste ? formData.caste.trim() : '',
      occupation: formData.occupation ? formData.occupation.trim() : '',
      education: formData.education ? formData.education.trim() : '',
      birthPlace: formData.birthPlace ? formData.birthPlace.trim() : '',
      nativePlace: formData.nativePlace ? formData.nativePlace.trim() : '',
      deathPlace: formData.deathPlace ? formData.deathPlace.trim() : '',
    };

    // Run temporal validation
    const warnings = validatePersonDates(formData);
    if (warnings.length > 0 && !warningsAcknowledged) {
      setTemporalWarnings(warnings);
      return;
    }

    // Contributor flow: save to draft instead of direct Neo4j write
    if (isContributor) {
      const fieldChanges: Record<string, { old: unknown; new: unknown }> = {};
      const original = person as Record<string, unknown>;
      const current = updatedFormData as Record<string, unknown>;
      for (const key of Object.keys(current)) {
        const oldVal = original[key];
        const newVal = current[key];
        const isOldFalsy = oldVal === undefined || oldVal === null || oldVal === '';
        const isNewFalsy = newVal === undefined || newVal === null || newVal === '';
        if (isOldFalsy && isNewFalsy) {
          continue;
        }
        if (newVal !== oldVal && newVal !== undefined) {
          fieldChanges[key] = { old: oldVal, new: newVal };
        }
      }
      if (selectedPhoto) {
        fieldChanges['profilePhotoUrl'] = { old: person.profilePhotoUrl, new: '[new photo pending]' };
      }
      if (Object.keys(fieldChanges).length === 0) {
        toast({ title: 'No changes', description: 'No changes were made.' });
        return;
      }
      addDraftItem({
        changeType: 'edit_person',
        targetEntityId: person.personId,
        targetEntityType: 'Person',
        fieldChanges,
        entitySnapshot: { ...person },
        displayLabel: `Edit ${updatedFormData.firstName || ''} ${updatedFormData.lastName || ''}`.trim(),
      });
      toast({ title: 'Saved to draft', description: 'Submit your changes when ready for review.' });
      onClose();
      return;
    }

    try {
      setLoading(true);

      // Step 1: Upload photo if new photo selected
      if (selectedPhoto) {
        setUploadingPhoto(true);
        try {
          await neo4jAPI.updatePersonPhoto(
            person.personId,
            selectedPhoto,
            treeId
          );
        } catch (uploadError) {
          console.error('Photo upload error:', uploadError);
          toast({
            title: 'Photo Upload Failed',
            description: uploadError instanceof Error ? uploadError.message : 'Could not upload photo',
            variant: 'destructive',
          });
          // Stop if photo upload is critical or continue? User request implies it's part of edit.
          return;
        } finally {
          setUploadingPhoto(false);
        }
      }

      // Step 2: Update person fields
      await neo4jAPI.updatePerson(person.personId, updatedFormData, treeId);


      toast({
        title: 'Success',
        description: `${updatedFormData.firstName} ${updatedFormData.lastName} updated successfully`,
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to update person:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update person',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop — click to close */}
      <div
        className="fixed inset-0 z-[50] bg-black/25 backdrop-blur-[2px] transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Side Panel — slides in from right */}
      <div
        ref={panelRef}
        className={`fixed z-[51] h-full bg-white/95 dark:bg-[#1E1E1E]/95 backdrop-blur-md shadow-[0_0_60px_rgba(0,0,0,0.1)] overflow-y-auto animate-slide-in-right ${
          isMobile ? 'inset-0 w-full' : 'top-0 right-0 w-full max-w-xl border-l border-[#E2E8F0]/60 dark:border-[#2a2a2a]'
        }`}
        style={{
          animation: 'slideInRight 0.3s ease-out',
        }}
      >
        {/* Panel Header */}
        <div className="sticky top-0 z-10 px-5 py-4 flex items-center justify-between border-b border-[#E2E8F0]/60 dark:border-[#2a2a2a] text-white" style={{ background: 'linear-gradient(135deg, #3D2E1F, #5A4333)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={getPersonPhotoUrl(fetchedPerson) || getDefaultAvatar(fetchedPerson.gender)}
              alt={fetchedPerson.firstName}
              className={`w-10 h-10 rounded-full object-cover border-2 border-white/30 flex-shrink-0 ${isFetchingFresh ? 'opacity-50' : ''}`}
            />


            <div className="min-w-0">
              <h2 className="text-base font-semibold truncate">Edit {person.firstName} {person.lastName}</h2>
              <p className="text-xs text-white/60">
                {isContributor
                  ? 'Changes save to draft for owner review'
                  : 'Update person profile details'}
              </p>

            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-6">
          {/* Contributor banner */}
          {isContributor && <ContributorEditBanner ownerName={ownerName || 'the tree owner'} />}

          {/* Profile Photo */}
          <div className="py-4 border-b border-[#E2E8F0] dark:border-[#2a2a2a]">
            <PhotoUploadInput
              currentPhotoUrl={getPersonPhotoUrl(fetchedPerson) || undefined}


              previewUrl={photoPreviewUrl}
              onPhotoSelect={(file) => {
                setSelectedPhoto(file);
                if (file) {
                  setPhotoPreviewUrl(URL.createObjectURL(file));
                } else {
                  setPhotoPreviewUrl(null);
                }
              }}
              disabled={loading || uploadingPhoto}
            />
          </div>

          {/* Person Fields */}
          <PersonFieldsCore
            values={formData}
            onChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))}
            mode="full"
            showBiography={true}
            showDateQualifiers={true}
            disabled={loading || uploadingPhoto}
            isEdit={true}
            errors={errors}
            validateField={validateField}
            sanitizeInput={sanitizeInput}
          />

          {/* Parent Reassignment Section */}
          {/* Hiding section as requested by user */}
          {false && treePersons && treePersons.length > 0 && (
            <div className="border-t border-[#E2E8F0] pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#2F3E8F]" />
                  Parents
                </h3>
                {!showParentEditor && (
                  <button
                    type="button"
                    onClick={() => setShowParentEditor(true)}
                    className="text-xs text-[#2F3E8F] hover:text-[#25327A] font-medium"
                  >
                    Change Parents
                  </button>
                )}
              </div>

              {!showParentEditor ? (
                <div className="text-sm text-gray-600">
                  {currentParents.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {currentParents.map(p => (
                        <span key={p.personId} className="inline-flex items-center gap-1 bg-[#E8EDFF] text-[#2F3E8F] px-2.5 py-1 rounded-full text-xs font-medium">
                          {p.firstName} {p.lastName}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400 italic text-xs">No parents assigned</span>
                  )}
                </div>
              ) : (
                <div className="space-y-3 bg-[#F9FAFB] dark:bg-zinc-800 rounded-lg p-3">
                  {parentSearchQuery && (
                    <div className="text-xs text-gray-400 mb-1">
                      Showing matches for "{parentSearchQuery}"
                    </div>
                  )}
                  <div>
                    <Input
                      placeholder="Search by name to filter..."
                      value={parentSearchQuery}
                      onChange={(e) => setParentSearchQuery(e.target.value)}
                      className="h-8 text-xs mb-2"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500 mb-1">Father</Label>
                      <Select value={selectedFatherId || '_none'} onValueChange={(v) => setSelectedFatherId(v === '_none' ? '' : v)}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select father" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">None</SelectItem>
                          {treePersons
                            .filter(p =>
                              p.personId !== person.personId &&
                              p.personId !== selectedMotherId &&
                              !p.isDeleted &&
                              (!parentSearchQuery || `${p.firstName} ${p.lastName}`.toLowerCase().includes(parentSearchQuery.toLowerCase()))
                            )
                            .map(p => (
                              <SelectItem key={p.personId} value={p.personId}>
                                {p.firstName} {p.lastName} {p.gender === 'male' ? '(M)' : p.gender === 'female' ? '(F)' : ''}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs mb-1">Mother</Label>
                      <Select value={selectedMotherId || '_none'} onValueChange={(v) => setSelectedMotherId(v === '_none' ? '' : v)}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select mother" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">None</SelectItem>
                          {treePersons
                            .filter(p =>
                              p.personId !== person.personId &&
                              p.personId !== selectedFatherId &&
                              !p.isDeleted &&
                              (!parentSearchQuery || `${p.firstName} ${p.lastName}`.toLowerCase().includes(parentSearchQuery.toLowerCase()))
                            )
                            .map(p => (
                              <SelectItem key={p.personId} value={p.personId}>
                                {p.firstName} {p.lastName} {p.gender === 'male' ? '(M)' : p.gender === 'female' ? '(F)' : ''}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      disabled={savingParents}
                      className="bg-[#2F3E8F] hover:bg-[#25327A] text-white text-xs h-8"
                      onClick={async () => {
                        try {
                          setSavingParents(true);
                          await neo4jAPI.reassignParents(
                            person.personId,
                            selectedFatherId || null,
                            selectedMotherId || null,
                            treeId
                          );
                          toast({ title: 'Parents updated', description: 'Parent assignment saved successfully' });
                          setShowParentEditor(false);
                          await fetchParents();
                        } catch (err) {
                          toast({
                            title: 'Error',
                            description: err instanceof Error ? err.message : 'Failed to reassign parents',
                            variant: 'destructive',
                          });
                        } finally {
                          setSavingParents(false);
                        }
                      }}
                    >
                      {savingParents ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ArrowRight className="h-3 w-3 mr-1" />}
                      Save Parents
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => {
                        setShowParentEditor(false);
                        // Reset to current values
                        const father = currentParents.find(p => p.gender === 'male');
                        const mother = currentParents.find(p => p.gender === 'female');
                        setSelectedFatherId(father?.personId || '');
                        setSelectedMotherId(mother?.personId || '');
                        setParentSearchQuery('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

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

          {/* Actions — sticky bottom bar */}
          <div className="sticky bottom-0 bg-[#F9FAFB] dark:bg-[#1E1E1E] border-t border-[#E2E8F0] dark:border-[#2a2a2a] px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] flex items-center justify-end gap-2 -mx-5 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="dark:bg-transparent dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-850 dark:hover:text-stone-100"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || uploadingPhoto}
              className="bg-[#2F3E8F] hover:bg-[#25327A] text-white"
            >
              {uploadingPhoto ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading Photo...
                </>
              ) : loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                isContributor ? 'Save to Draft' : 'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
