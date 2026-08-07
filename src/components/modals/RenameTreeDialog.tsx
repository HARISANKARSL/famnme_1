import { useState, useEffect } from 'react';
import type { TreeMetadata } from '@/types';
import {
  Dialog,
  ResponsiveDialogContent as DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { validateTextField, VALIDATION_LIMITS } from '@/utils/validation';

export interface RenameTreeDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (newName: string, newDescription: string) => Promise<void>;
  tree: TreeMetadata | null;
}

export function RenameTreeDialog({
  open,
  onClose,
  onConfirm,
  tree,
}: RenameTreeDialogProps) {
  const [newName, setNewName] = useState(tree?.treeName || '');
  const [description, setDescription] = useState(tree?.description || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tree && open) {
      setNewName(tree.treeName);
      setDescription(tree.description || '');
    } else if (!open) {
      setNewName('');
      setDescription('');
    }
  }, [tree, open]);

  const nameVal = validateTextField(newName);
  const isFormInvalid = !nameVal.isValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !tree || isFormInvalid) return;

    setLoading(true);
    try {
      // Pass empty string for description as per user request
      await onConfirm(newName.trim(), '');
      setNewName('');
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Failed to rename tree:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!tree) return null;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Tree</DialogTitle>
          <DialogDescription>
            Enter a new name for "{tree.treeName}"
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="treeName">Tree Name</Label>
              <Input
                id="treeName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter tree name"
                required
                autoFocus
                error={newName.length > 0 ? nameVal.error : undefined}
                showCharCount
                charLimit={VALIDATION_LIMITS.text}
              />
            </div>
            {/* Description field commented out as per user request
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter tree description"
                rows={3}
              />
            </div>
            */}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !newName.trim() || isFormInvalid}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

