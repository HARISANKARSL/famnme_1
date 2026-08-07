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
import { Loader2 } from 'lucide-react';

export interface DuplicateTreeDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (newName: string) => Promise<void>;
  tree: TreeMetadata | null;
}

export function DuplicateTreeDialog({
  open,
  onClose,
  onConfirm,
  tree,
}: DuplicateTreeDialogProps) {
  const [newName, setNewName] = useState(tree ? `${tree.treeName} (Copy)` : '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tree && open) {
      setNewName(`${tree.treeName} (Copy)`);
    }
  }, [tree, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !tree) return;

    setLoading(true);
    try {
      await onConfirm(newName.trim());
      onClose();
    } catch (error) {
      console.error('Failed to duplicate tree:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!tree) return null;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate Tree</DialogTitle>
          <DialogDescription>
            Create a copy of "{tree.treeName}"
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newTreeName">New Tree Name</Label>
              <Input
                id="newTreeName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter name for duplicated tree"
                required
                autoFocus
              />
            </div>
            <p className="text-sm text-gray-600">
              This will create an exact copy of the tree with all {tree.personCount}{' '}
              {tree.personCount === 1 ? 'person' : 'people'} and their relationships.
            </p>
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
            <Button type="submit" disabled={loading || !newName.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Duplicate Tree
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
