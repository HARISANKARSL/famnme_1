/**
 * RelativeSidePicker - Shared picker dialog for grandparent / uncle-aunt / cousin flows
 *
 * For grandparent/uncle-aunt: shows Father's side / Mother's side options
 * For cousin: shows a list of available uncles/aunts to pick from
 */

import { Dialog, ResponsiveDialogContent as DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Crown, UserPlus, Users } from 'lucide-react';
import type { Person } from '@/types';

// ============================================================================
// Types
// ============================================================================

export type RelativeSidePickerMode = 'grandparent' | 'uncle-aunt' | 'cousin';

export interface ParentOption {
  person: Person;
  side: 'father' | 'mother';
}

export interface RelativeSidePickerProps {
  open: boolean;
  onClose: () => void;
  mode: RelativeSidePickerMode;
  originalPerson: Person;
  /** Available parents (for grandparent/uncle-aunt modes) */
  parents?: ParentOption[];
  /** Available uncles/aunts (for cousin mode) */
  unclesAunts?: Array<{ person: Person; side: 'paternal' | 'maternal' }>;
  onSelectParent?: (parent: ParentOption) => void;
  onSelectUncleAunt?: (uncleAunt: Person) => void;
}

// ============================================================================
// Component
// ============================================================================

export function RelativeSidePicker({
  open,
  onClose,
  mode,
  originalPerson,
  parents = [],
  unclesAunts = [],
  onSelectParent,
  onSelectUncleAunt,
}: RelativeSidePickerProps) {
  const getTitle = () => {
    switch (mode) {
      case 'grandparent':
        return `Add Grandparent for ${originalPerson.firstName}`;
      case 'uncle-aunt':
        return `Add Uncle/Aunt for ${originalPerson.firstName}`;
      case 'cousin':
        return `Add Cousin for ${originalPerson.firstName}`;
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'grandparent':
        return `Which parent's parent would you like to add?`;
      case 'uncle-aunt':
        return `Which parent's sibling would you like to add?`;
      case 'cousin':
        return `Select the uncle/aunt whose child (cousin) you'd like to add:`;
    }
  };

  const Icon = mode === 'grandparent' ? Crown : mode === 'uncle-aunt' ? UserPlus : Users;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {getTitle()}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-gray-600 mb-4">{getDescription()}</p>

        {/* Parent selection (grandparent / uncle-aunt modes) */}
        {(mode === 'grandparent' || mode === 'uncle-aunt') && (
          <div className="space-y-3">
            {parents.map((parentOption) => (
              <button
                key={parentOption.person.personId}
                onClick={() => {
                  onSelectParent?.(parentOption);
                  onClose();
                }}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-[#2F3E8F] hover:bg-[#E8EDFF] text-left transition-all group"
              >
                <div className="font-semibold text-gray-900 group-hover:text-[#25327A]">
                  {parentOption.side === 'father' ? "Father's side" : "Mother's side"}
                </div>
                <div className="text-sm text-gray-500 mt-0.5">
                  via {parentOption.person.firstName} {parentOption.person.lastName}
                </div>
              </button>
            ))}

            {parents.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No parents found in the tree for {originalPerson.firstName}.
              </p>
            )}
          </div>
        )}

        {/* Uncle/Aunt selection (cousin mode) */}
        {mode === 'cousin' && (
          <div className="space-y-3">
            {unclesAunts.map(({ person, side }) => (
              <button
                key={person.personId}
                onClick={() => {
                  onSelectUncleAunt?.(person);
                  onClose();
                }}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-[#2F3E8F] hover:bg-[#E8EDFF] text-left transition-all group"
              >
                <div className="font-semibold text-gray-900 group-hover:text-[#25327A]">
                  {person.firstName} {person.lastName}
                </div>
                <div className="text-sm text-gray-500 mt-0.5 capitalize">
                  {side === 'paternal' ? "Father's side" : "Mother's side"} ·{' '}
                  {person.gender === 'male' ? 'Uncle' : person.gender === 'female' ? 'Aunt' : 'Uncle/Aunt'}
                </div>
              </button>
            ))}

            {unclesAunts.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No uncles or aunts found in the tree for {originalPerson.firstName}.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
