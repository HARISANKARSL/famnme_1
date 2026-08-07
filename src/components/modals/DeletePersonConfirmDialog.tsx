import { useState } from 'react';
import { AlertTriangle, Home } from 'lucide-react';
import type { Person } from '@/types';
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

export interface DeletePersonConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  person: Person | null;
}

export function DeletePersonConfirmDialog({
  open,
  onClose,
  onConfirm,
  person,
}: DeletePersonConfirmDialogProps) {
  if (!person) return null;

  const personName = `${person.firstName} ${person.lastName}`.trim();

  const handleClose = () => {
    onClose();
  };

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete {personName}?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-2" asChild>
            <div>
              <p>
                Are you sure you want to delete <strong>{personName}</strong> from the family tree?
              </p>
              <div className="bg-[#E8EDFF] border border-[#2F3E8F]/30 rounded p-3 space-y-2">
                <p className="text-blue-800 font-medium">
                  This person will be permanently removed from the tree.
                </p>
                <ul className="text-[#2F3E8F] text-sm space-y-1 ml-4 list-disc">
                  <li>Their personal data will be deleted</li>
                  <li>If they have a spouse or children, a placeholder will remain so you can add someone new</li>
                </ul>
              </div>

              {/* D6 — before/after mini-diagram */}
              <div className="rounded border border-stone-200 bg-stone-50 p-3 text-xs">
                <p className="text-[11px] uppercase tracking-wide text-stone-500 mb-2">After deletion</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <p className="text-[10px] text-stone-400 mb-1">Before</p>
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white ring-2 ring-stone-300 text-[11px] font-semibold text-stone-700">
                      {(person.firstName?.[0] || '?').toUpperCase()}
                    </div>
                    <p className="mt-1 text-[11px] text-stone-600 truncate">{personName}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-stone-400 mb-1">After</p>
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-stone-100 ring-2 ring-dashed ring-stone-400 text-[18px] text-stone-400">
                      +
                    </div>
                    <p className="mt-1 text-[11px] text-stone-500 italic">Placeholder</p>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-stone-500 text-center">
                  Lineage stays intact — relatives keep their connections through the placeholder.
                </p>
              </div>

              {/* D6 — home-person warning */}
              {person.isHomePerson && (
                <div className="flex items-start gap-2 rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                  <Home className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>
                    <strong>Heads up:</strong> {personName} is currently the home person of this tree.
                    Another member will be auto-promoted to home person after deletion.
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            Delete Person
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
