/**
 * SelectUnionModal - Modal for selecting which marriage/union a child belongs to
 *
 * Shown when adding a child to a person who has multiple marriages.
 * User selects which marriage the child should be attached to.
 *
 * Each union is displayed with:
 * - Spouse names
 * - Marriage dates
 * - Existing children count
 * - Marriage status (active/ended)
 */

import { Dialog, ResponsiveDialogContent as DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Heart, Users, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Person, Union } from '@/types';
import type { Relationship } from '@/services/elkLayoutService';
import { getUnionChildren } from '@/utils/unionHelpers';

export interface SelectUnionModalProps {
  open: boolean;
  onClose: () => void;
  referencePerson: Person;
  unions: Array<{
    union: Union;
    spouse: Person | null;
  }>;
  allPersons: Person[];
  relationships: Relationship[];
  onSelect: (unionId: string) => void;
}

export function SelectUnionModal({
  open,
  onClose,
  referencePerson,
  unions,
  allPersons,
  relationships,
  onSelect,
}: SelectUnionModalProps) {
  const [selectedUnionId, setSelectedUnionId] = useState<string>('');

  useEffect(() => {
    if (open) {
      setSelectedUnionId('');
    }
  }, [open]);

  const handleContinue = () => {
    if (selectedUnionId) {
      onSelect(selectedUnionId);
      onClose();
    }
  };

  const formatDate = (date?: string | null) => {
    if (!date) return null;
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return date;
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = String(d.getFullYear()).slice(-2);
      return `${dd}-${mm}-${yy}`;
    } catch {
      return date;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            Which Marriage Should This Child Belong To?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {referencePerson.firstName} has multiple marriages. Select which marriage this child belongs to.
          </p>

          {/* Union Selection */}
          <RadioGroup value={selectedUnionId} onValueChange={setSelectedUnionId}>
            {unions.map(({ union, spouse }) => {
              const childrenCount = getUnionChildren(union.unionId, allPersons, relationships).length;
              const isActive = !union.endDate || new Date(union.endDate) > new Date();

              return (
                <div
                  key={union.unionId}
                  className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent cursor-pointer"
                >
                  <RadioGroupItem value={union.unionId} id={union.unionId} />
                  <Label htmlFor={union.unionId} className="font-normal cursor-pointer flex-1">
                    {/* Marriage Header */}
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className={`h-4 w-4 ${isActive ? 'text-pink-500' : 'text-gray-400'}`} />
                      <span className="font-medium">
                        {referencePerson.firstName} & {spouse ? [spouse.firstName, spouse.lastName].filter(n => n && n !== 'undefined').join(' ') : 'Unknown'}
                      </span>
                      {!isActive && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          Ended
                        </span>
                      )}
                      {isActive && union.startDate && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>

                    {/* Marriage Details */}
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {/* Dates */}
                      {(union.startDate || union.endDate) && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {formatDate(union.startDate) || '?'}
                            {' - '}
                            {union.endDate ? formatDate(union.endDate) : 'Present'}
                          </span>
                        </div>
                      )}

                      {/* Marriage Place */}
                      {union.marriagePlace && (
                        <div className="text-xs">
                          Married in {union.marriagePlace}
                        </div>
                      )}

                      {/* Existing Children */}
                      {childrenCount > 0 && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                          <Users className="h-3 w-3" />
                          <span>
                            {childrenCount} {childrenCount === 1 ? 'child' : 'children'} from this marriage
                          </span>
                        </div>
                      )}

                      {/* Ceremony Type */}
                      {union.ceremonyType && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {union.ceremonyType === 'arranged' && 'Arranged marriage'}
                          {union.ceremonyType === 'love' && 'Love marriage'}
                          {union.ceremonyType === 'inter-caste' && 'Inter-caste marriage'}
                          {union.ceremonyType === 'inter-religion' && 'Inter-religion marriage'}
                        </div>
                      )}
                    </div>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleContinue} disabled={!selectedUnionId}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
