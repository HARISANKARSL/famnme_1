import { AlertTriangle } from 'lucide-react';
import type { TreeMetadata } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  ResponsiveAlertDialogContent as AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface DeleteTreeConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tree: TreeMetadata | null;
  isOnlyTree?: boolean;
  isCurrentTree?: boolean;
}

export function DeleteTreeConfirmDialog({
  open,
  onClose,
  onConfirm,
  tree,
  isOnlyTree = false,
  isCurrentTree = false,
}: DeleteTreeConfirmDialogProps) {
  if (!tree) return null;

  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete "{tree.treeName}"?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 pt-2">
            <p>
              This tree contains <strong>{tree.personCount}</strong>{' '}
              {tree.personCount === 1 ? 'person' : 'people'}.
            </p>
            <p className="text-red-600 font-medium">
              This action cannot be undone. All data in this tree will be
              permanently deleted.
            </p>
            {isOnlyTree && (
              <p className="bg-yellow-50 border border-yellow-200 rounded p-3 text-yellow-800">
                This is your only tree. After deletion, you'll need to create a
                new tree to continue using the app.
              </p>
            )}
            {isCurrentTree && !isOnlyTree && (
              <p className="bg-[#E8EDFF] border border-[#2F3E8F]/30 rounded p-3 text-blue-800">
                This is your currently active tree. After deletion, you'll be
                switched to another tree.
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Delete Tree
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
