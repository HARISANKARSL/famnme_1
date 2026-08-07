/**
 * EndMarriageModal - Modal for ending a marriage (divorce, separation, etc.)
 *
 * Supports:
 * - Setting end date for a union
 * - Adding notes about the separation
 * - Visual distinction for ended marriages in the tree
 */

import { useState } from 'react';
import { Dialog, ResponsiveDialogContent as DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, AlertTriangle } from 'lucide-react';
import type { Person, Union } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface EndMarriageModalProps {
  open: boolean;
  onClose: () => void;
  union: Union;
  partners: Person[];  // The two people in the union
  onEndMarriage: (unionId: string, endDate: string, notes?: string) => Promise<void>;
  onSuccess?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function EndMarriageModal({
  open,
  onClose,
  union,
  partners,
  onEndMarriage,
  onSuccess,
}: EndMarriageModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [endDate, setEndDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!endDate) {
      toast({
        title: 'Error',
        description: 'Please enter the end date of the marriage',
        variant: 'destructive',
      });
      return;
    }

    // Validate end date is after start date
    if (union.startDate && new Date(endDate) < new Date(union.startDate)) {
      toast({
        title: 'Error',
        description: 'End date cannot be before the marriage date',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      await onEndMarriage(union.unionId, endDate, notes || undefined);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to end marriage:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to end marriage',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEndDate('');
    setNotes('');
    onClose();
  };

  const getPartnerNames = () => {
    if (partners.length === 0) return 'Unknown';
    if (partners.length === 1) return `${partners[0].firstName} ${partners[0].lastName}`;
    return `${partners[0].firstName} ${partners[0].lastName} and ${partners[1].firstName} ${partners[1].lastName}`;
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>End Marriage</DialogTitle>
          <DialogDescription>
            Record the end of the marriage between {getPartnerNames()}
          </DialogDescription>
        </DialogHeader>

        <Alert className="bg-[#E8EDFF] border-[#2F3E8F]/30">
          <AlertTriangle className="h-4 w-4 text-[#2F3E8F]" />
          <AlertDescription className="text-blue-800">
            This will mark the marriage as ended. The relationship history will be preserved.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Marriage Info */}
          <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Marriage Date:</span>
              <span>{union.startDate ? (() => {
                try {
                  const d = new Date(union.startDate);
                  if (isNaN(d.getTime())) return union.startDate;
                  const dd = String(d.getDate()).padStart(2, '0');
                  const mm = String(d.getMonth() + 1).padStart(2, '0');
                  const yy = String(d.getFullYear()).slice(-2);
                  return `${dd}-${mm}-${yy}`;
                } catch {
                  return union.startDate;
                }
              })() : 'Not specified'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Marriage Type:</span>
              <span className="capitalize">{union.type || 'Not specified'}</span>
            </div>
            {union.marriagePlace && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Place:</span>
                <span>{union.marriagePlace}</span>
              </div>
            )}
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date *</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              The date when the marriage legally ended (divorce finalized, separation date, etc.)
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional context about the separation..."
              rows={3}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              End Marriage
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
