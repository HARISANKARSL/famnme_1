/**
 * AddGuardianModal - Modal for adding guardians (step-parent, adoptive parent, foster parent, legal guardian)
 *
 * Supports:
 * - Adding existing family member as guardian
 * - Creating new person as guardian
 * - Different guardian types (adoption, step-parent, foster, legal-guardian)
 * - Legal tracking (court order references, dates)
 */

import { useState } from 'react';
import { Dialog, ResponsiveDialogContent as DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, UserPlus, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { PersonFieldsCore } from '@/components/forms/PersonFieldsCore';
import type { Person, GuardianRelationship } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface AddGuardianModalProps {
  open: boolean;
  onClose: () => void;
  treeId: string;
  childPerson: Person;  // The child who is getting a guardian
  existingPersons?: Person[];  // List of people in the tree who can be selected as guardians
  onAddExistingGuardian?: (guardianId: string, guardianData: Omit<GuardianRelationship, 'guardianId' | 'childId'>) => Promise<void>;
  onCreateGuardian?: (personData: Partial<Person>, guardianData: Omit<GuardianRelationship, 'guardianId' | 'childId'>) => Promise<void>;
  onSuccess?: () => void;
}

type GuardianMode = 'select' | 'existing' | 'new';

// ============================================================================
// Component
// ============================================================================

export function AddGuardianModal({
  open,
  onClose,
  treeId: _treeId,
  childPerson,
  existingPersons = [],
  onAddExistingGuardian,
  onCreateGuardian,
  onSuccess,
}: AddGuardianModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<GuardianMode>('select');

  // Guardian relationship data
  const [guardianData, setGuardianData] = useState<Omit<GuardianRelationship, 'guardianId' | 'childId'>>({
    guardianType: 'step-parent',
    isLegalGuardian: false,
    startDate: undefined,
    endDate: undefined,
    courtOrderRef: undefined,
    notes: undefined,
  });

  // Selected existing person
  const [selectedGuardianId, setSelectedGuardianId] = useState<string>('');

  // New person form data
  const [newPersonData, setNewPersonData] = useState<Partial<Person>>({
    gender: 'male',
    isLiving: true,
    isHomePerson: false,
  });

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'existing') {
      if (!selectedGuardianId) {
        toast({
          title: 'Error',
          description: 'Please select a person to add as guardian',
          variant: 'destructive',
        });
        return;
      }

      try {
        setLoading(true);
        await onAddExistingGuardian?.(selectedGuardianId, guardianData);
        onSuccess?.();
        onClose();
      } catch (error) {
        console.error('Failed to add guardian:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to add guardian',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    } else if (mode === 'new') {
      if (!newPersonData.firstName) {
        toast({
          title: 'Error',
          description: 'First name is required',
          variant: 'destructive',
        });
        return;
      }

      try {
        setLoading(true);
        await onCreateGuardian?.(newPersonData, guardianData);
        onSuccess?.();
        onClose();
      } catch (error) {
        console.error('Failed to create guardian:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to create guardian',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleClose = () => {
    setMode('select');
    setSelectedGuardianId('');
    setGuardianData({
      guardianType: 'step-parent',
      isLegalGuardian: false,
      startDate: undefined,
      endDate: undefined,
      courtOrderRef: undefined,
      notes: undefined,
    });
    setNewPersonData({
      gender: 'male',
      isLiving: true,
      isHomePerson: false,
    });
    onClose();
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Add Guardian for {childPerson.firstName} {childPerson.lastName}
          </DialogTitle>
          <DialogDescription>
            Add a step-parent, adoptive parent, foster parent, or legal guardian
          </DialogDescription>
        </DialogHeader>

        {/* Mode Selection */}
        {mode === 'select' && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              How would you like to add a guardian?
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setMode('existing')}
                className="flex flex-col items-center gap-2 p-6 border-2 rounded-lg hover:border-primary hover:bg-accent transition-colors"
              >
                <Users className="h-8 w-8 text-muted-foreground" />
                <span className="font-medium">Select Existing Person</span>
                <span className="text-sm text-muted-foreground text-center">
                  Choose someone already in the family tree
                </span>
              </button>

              <button
                onClick={() => setMode('new')}
                className="flex flex-col items-center gap-2 p-6 border-2 rounded-lg hover:border-primary hover:bg-accent transition-colors"
              >
                <UserPlus className="h-8 w-8 text-muted-foreground" />
                <span className="font-medium">Create New Person</span>
                <span className="text-sm text-muted-foreground text-center">
                  Add a new person as guardian
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Existing Person Selection */}
        {mode === 'existing' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="existingPerson">Select Person *</Label>
                <Select
                  value={selectedGuardianId}
                  onValueChange={setSelectedGuardianId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a person..." />
                  </SelectTrigger>
                  <SelectContent>
                    {existingPersons
                      .filter(p => p.personId !== childPerson.personId)
                      .map((person) => (
                        <SelectItem key={person.personId} value={person.personId}>
                          {person.firstName} {person.lastName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Guardian Relationship Details */}
              {renderGuardianFields()}
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setMode('select')}>
                Back
              </Button>
              <Button type="submit" disabled={loading || !selectedGuardianId}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add as Guardian
              </Button>
            </div>
          </form>
        )}

        {/* New Person Form */}
        {mode === 'new' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Guardian Person Fields */}
            <PersonFieldsCore
              values={newPersonData}
              onChange={(updates) => setNewPersonData(prev => ({ ...prev, ...updates }))}
              mode="quick-add"
              showBiography={true}
              disabled={loading}
              hideElderStatus={true}
            />

            {/* Guardian Relationship Details */}
            {renderGuardianFields()}

            {/* Submit Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setMode('select')}>
                Back
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Guardian
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );

  const [showLegalDetails, setShowLegalDetails] = useState(false);

  // Helper function to render guardian-specific fields
  function renderGuardianFields() {
    return (
      <div className="space-y-4 border-t pt-4 mt-4">
        <h3 className="text-sm font-semibold">Guardian Relationship Details</h3>

        <div>
          <Label htmlFor="guardianType">Guardian Type *</Label>
          <Select
            value={guardianData.guardianType}
            onValueChange={(value) => {
              setGuardianData({ ...guardianData, guardianType: value as GuardianRelationship['guardianType'] });
              if (value === 'informal-caregiver') setShowLegalDetails(false);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="informal-caregiver">Informal Caregiver (relative who raised the child)</SelectItem>
              <SelectItem value="step-parent">Step-Parent (spouse of biological parent)</SelectItem>
              <SelectItem value="adoption">Adoptive Parent (legal adoption)</SelectItem>
              <SelectItem value="foster">Foster Parent (temporary care)</SelectItem>
              <SelectItem value="legal-guardian">Legal Guardian (court-appointed)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            {guardianData.guardianType === 'informal-caregiver' && 'Raised by a relative without legal formality (e.g., chacha, mausi)'}
            {guardianData.guardianType === 'step-parent' && 'Parent through marriage to biological parent'}
            {guardianData.guardianType === 'adoption' && 'Legally adopted the child'}
            {guardianData.guardianType === 'foster' && 'Temporary care arrangement'}
            {guardianData.guardianType === 'legal-guardian' && 'Court-appointed guardian without adoption'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={guardianData.startDate || ''}
              onChange={(e) => setGuardianData({ ...guardianData, startDate: e.target.value || undefined })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              When guardianship began
            </p>
          </div>
          <div>
            <Label htmlFor="endDate">End Date (if applicable)</Label>
            <Input
              id="endDate"
              type="date"
              value={guardianData.endDate || ''}
              onChange={(e) => setGuardianData({ ...guardianData, endDate: e.target.value || undefined })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              For temporary arrangements (foster care)
            </p>
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={guardianData.notes || ''}
            onChange={(e) => setGuardianData({ ...guardianData, notes: e.target.value || undefined })}
            placeholder="Any additional context about this guardianship..."
            rows={2}
          />
        </div>

        {/* Legal Details (collapsible) */}
        {guardianData.guardianType !== 'informal-caregiver' && (
          <>
            <button
              type="button"
              onClick={() => setShowLegalDetails(!showLegalDetails)}
              className="flex items-center gap-2 w-full text-sm text-[#2F3E8F] hover:text-[#8B5E3C] font-medium py-2"
            >
              {showLegalDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Legal Details (optional)
            </button>
            {showLegalDetails && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isLegalGuardian"
                    checked={guardianData.isLegalGuardian}
                    onCheckedChange={(checked) => setGuardianData({ ...guardianData, isLegalGuardian: checked === true })}
                  />
                  <Label htmlFor="isLegalGuardian" className="text-sm font-normal">
                    Has legal guardianship rights (can make legal decisions for the child)
                  </Label>
                </div>

                <div>
                  <Label htmlFor="courtOrderRef">Court Order Reference</Label>
                  <Input
                    id="courtOrderRef"
                    value={guardianData.courtOrderRef || ''}
                    onChange={(e) => setGuardianData({ ...guardianData, courtOrderRef: e.target.value || undefined })}
                    placeholder="e.g., Case #2024-FAM-12345"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Legal document reference for adoption or guardianship orders
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }
}
