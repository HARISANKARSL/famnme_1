/**
 * MultipleMarriagePrompt - Prompt when adding spouse to person with existing marriage
 *
 * Handles scenarios:
 * - Widowhood (first spouse deceased)
 * - Divorce (first marriage ended)
 * - Data entry error (user wants to replace incorrect spouse)
 *
 * Prompts user to either:
 * - Add a second spouse (create new union)
 * - Replace current spouse (update existing union)
 * - Cancel
 */

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, ResponsiveDialogContent as DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertTriangle, Users, UserX, Info } from 'lucide-react';
import { useState } from 'react';
import type { Person, Union } from '@/types';

export interface MultipleMarriagePromptProps {
  open: boolean;
  onClose: () => void;
  referencePerson: Person;
  existingSpouses: Array<{
    spouse: Person;
    union: Union;
  }>;
  onDecision: (decision: 'add-second' | 'replace' | 'cancel', replaceUnionId?: string) => void;
}

export function MultipleMarriagePrompt({
  open,
  onClose,
  referencePerson,
  existingSpouses,
  onDecision,
}: MultipleMarriagePromptProps) {
  const [selectedOption, setSelectedOption] = useState<'add-second' | 'replace'>('add-second');
  const [selectedUnionToReplace, setSelectedUnionToReplace] = useState<string>(
    existingSpouses[0]?.union.unionId || ''
  );

  const handleContinue = () => {
    if (selectedOption === 'replace') {
      onDecision('replace', selectedUnionToReplace);
    } else {
      onDecision('add-second');
    }
  };

  const handleCancel = () => {
    onDecision('cancel');
    onClose();
  };

  const getYearStr = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        if (/^\d{4}$/.test(dateStr)) return dateStr;
        return '';
      }
      return String(d.getFullYear());
    } catch {
      return '';
    }
  };

  const activeSpouses = existingSpouses.filter(
    ({ union }) => !union.endDate && !union.endReason
  );
  const endedSpouses = existingSpouses.filter(
    ({ union }) => union.endDate || union.endReason
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleCancel(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-blue-500" />
            {referencePerson.firstName} Already Has {existingSpouses.length > 1 ? 'Multiple Spouses' : 'a Spouse'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing Marriages Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {activeSpouses.length > 0 && (
                <div className={endedSpouses.length > 0 ? "mb-3" : ""}>
                  <div className="font-medium mb-1">Existing Marriage{activeSpouses.length > 1 ? 's' : ''}:</div>
                  <ul className="space-y-1 text-sm list-disc pl-4">
                    {activeSpouses.map(({ spouse, union }) => {
                      const startYear = getYearStr(union.startDate);
                      return (
                        <li key={union.unionId}>
                          <strong>
                            {referencePerson.firstName} & {spouse.firstName} {spouse.lastName || ''}
                          </strong>
                          {startYear && ` (${startYear} - Present)`}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {endedSpouses.length > 0 && (
                <div>
                  <div className="font-medium mb-1">Divorced or Widowed:</div>
                  <ul className="space-y-1 text-sm list-disc pl-4">
                    {endedSpouses.map(({ spouse, union }) => {
                      const reason = union.endReason ? (union.endReason.charAt(0).toUpperCase() + union.endReason.slice(1)) : 'Ended';
                      const startYear = getYearStr(union.startDate);
                      const endYear = getYearStr(union.endDate);
                      return (
                        <li key={union.unionId}>
                          <strong>
                            {referencePerson.firstName} & {spouse.firstName} {spouse.lastName || ''}
                          </strong>
                          {` - ${reason}`}
                          {startYear && ` (${startYear}`}
                          {startYear && endYear && ` - ${endYear}`}
                          {startYear && !endYear && ' - Ended'}
                          {startYear && ')'}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>

          {/* Decision Radio Group */}
          <div className="space-y-3">
            <Label className="text-base">What would you like to do?</Label>
            <RadioGroup value={selectedOption} onValueChange={(value) => setSelectedOption(value as 'add-second' | 'replace')}>
              {/* Add Second Spouse */}
              <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent cursor-pointer">
                <RadioGroupItem value="add-second" id="add-second" />
                <Label htmlFor="add-second" className="font-normal cursor-pointer flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">Add a second spouse</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    For widowhood, divorce, or multiple marriages. This will create a new marriage with its own set of children.
                  </p>
                </Label>
              </div>

            </RadioGroup>
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleContinue}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
