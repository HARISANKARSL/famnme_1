/**
 * ChangeParentsModal - Modal for changing a child's parent union
 *
 * Allows:
 * - Moving a child from one union to another
 * - Useful for correcting data entry mistakes
 * - Handling cases where child was assigned to wrong parents
 */

import { useState, useEffect } from 'react';
import { Dialog, ResponsiveDialogContent as DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, AlertTriangle, ArrowRight } from 'lucide-react';
import type { Person, Union } from '@/types';
import type { Relationship } from '@/services/elkLayoutService';

// ============================================================================
// Types
// ============================================================================

export interface ChangeParentsModalProps {
  open: boolean;
  onClose: () => void;
  child: Person;  // The child being reassigned
  persons: Person[];  // All persons in the tree
  unions: Union[];  // All unions in the tree
  relationships: Relationship[];  // All relationships
  onChangeParents: (childId: string, fromUnionId: string, toUnionId: string) => Promise<void>;
  onSuccess?: () => void;
}

interface UnionWithPartners {
  union: Union;
  partners: Person[];
}

// ============================================================================
// Component
// ============================================================================

export function ChangeParentsModal({
  open,
  onClose,
  child,
  persons,
  unions,
  relationships,
  onChangeParents,
  onSuccess,
}: ChangeParentsModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentUnion, setCurrentUnion] = useState<UnionWithPartners | null>(null);
  const [availableUnions, setAvailableUnions] = useState<UnionWithPartners[]>([]);
  const [selectedUnionId, setSelectedUnionId] = useState<string>('');

  // ============================================================================
  // Effects
  // ============================================================================

  // Find current parent union and available unions
  useEffect(() => {
    if (!open) return;

    // Find current parent union
    const childRel = relationships.find(
      r => r.type === 'HAS_CHILD' && r.toId === child.personId
    );

    if (childRel) {
      const union = unions.find(u => u.unionId === childRel.fromId);
      if (union) {
        const partnerIds = relationships
          .filter(r => r.type === 'PARTNER_IN' && r.toId === union.unionId)
          .map(r => r.fromId);
        const partners = persons.filter(p => partnerIds.includes(p.personId));
        setCurrentUnion({ union, partners });
      }
    }

    // Find available unions (all unions except the current one)
    const unionsWithPartners: UnionWithPartners[] = unions
      .filter(u => u.unionId !== childRel?.fromId)
      .map(union => {
        const partnerIds = relationships
          .filter(r => r.type === 'PARTNER_IN' && r.toId === union.unionId)
          .map(r => r.fromId);
        const partners = persons.filter(p => partnerIds.includes(p.personId));
        return { union, partners };
      })
      // Only show unions that have at least one partner
      .filter(u => u.partners.length > 0);

    setAvailableUnions(unionsWithPartners);
  }, [open, child, persons, unions, relationships]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUnionId) {
      toast({
        title: 'Error',
        description: 'Please select a new parent union',
        variant: 'destructive',
      });
      return;
    }

    if (!currentUnion) {
      toast({
        title: 'Error',
        description: 'Could not determine current parent union',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      await onChangeParents(child.personId, currentUnion.union.unionId, selectedUnionId);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to change parents:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to change parents',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedUnionId('');
    onClose();
  };

  const getUnionLabel = (unionWithPartners: UnionWithPartners) => {
    const { union: _union, partners } = unionWithPartners;
    if (partners.length === 0) return 'Unknown Parents';
    if (partners.length === 1) return `${partners[0].firstName} ${partners[0].lastName} (single parent)`;
    return `${partners[0].firstName} ${partners[0].lastName} & ${partners[1].firstName} ${partners[1].lastName}`;
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Change Parents for {child.firstName} {child.lastName}
          </DialogTitle>
          <DialogDescription>
            Move this child to a different parent union
          </DialogDescription>
        </DialogHeader>

        <Alert className="bg-[#E8EDFF] border-[#2F3E8F]/30">
          <AlertTriangle className="h-4 w-4 text-[#2F3E8F]" />
          <AlertDescription className="text-blue-800">
            This will change which parents {child.firstName} is assigned to. Use this to correct mistakes or reassign children.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Parents */}
          <div className="space-y-2">
            <Label>Current Parents</Label>
            <div className="p-3 bg-muted rounded-lg text-sm">
              {currentUnion ? getUnionLabel(currentUnion) : 'No parents assigned'}
            </div>
          </div>

          {/* Arrow indicator */}
          <div className="flex justify-center">
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
          </div>

          {/* New Parents Selection */}
          <div className="space-y-2">
            <Label htmlFor="newParents">New Parents *</Label>
            <Select
              value={selectedUnionId}
              onValueChange={setSelectedUnionId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select new parents..." />
              </SelectTrigger>
              <SelectContent>
                {availableUnions.length === 0 ? (
                  <SelectItem value="no-unions" disabled>
                    No other parent unions available
                  </SelectItem>
                ) : (
                  availableUnions.map((unionWithPartners) => (
                    <SelectItem
                      key={unionWithPartners.union.unionId}
                      value={unionWithPartners.union.unionId}
                    >
                      {getUnionLabel(unionWithPartners)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select the union that should be {child.firstName}'s new parents
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedUnionId || availableUnions.length === 0}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Change Parents
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
