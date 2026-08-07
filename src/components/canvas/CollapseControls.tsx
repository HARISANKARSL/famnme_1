/**
 * CollapseControls Component
 *
 * UI controls for collapsing and expanding family tree groups.
 * Provides buttons to:
 * - Collapse all safe sibling groups
 * - Expand all collapsed groups
 * - Show status of collapsed groups
 */

import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, Info } from 'lucide-react';
import type { CollapsedGroup } from '@/types';

export interface CollapseControlsProps {
  availableGroups: CollapsedGroup[];
  collapsedGroups: Map<string, CollapsedGroup>;
  onCollapseGroup: (groupId: string) => void;
  onExpandGroup: (groupId: string) => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
}

export function CollapseControls({
  availableGroups,
  collapsedGroups,
  onCollapseGroup: _onCollapseGroup,
  onExpandGroup: _onExpandGroup,
  onCollapseAll,
  onExpandAll
}: CollapseControlsProps) {
  const hasCollapsed = collapsedGroups.size > 0;
  const canCollapseMore = availableGroups.some(g => g.canCollapse && !collapsedGroups.has(g.groupId));

  // Count groups by type
  const siblingGroupCount = availableGroups.filter(g => g.groupType === 'siblings').length;
  const descendantGroupCount = availableGroups.filter(g => g.groupType === 'descendants').length;

  return (
    <div className="flex flex-col gap-2 p-3 bg-white border rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
        <Info className="w-4 h-4" />
        Tree Condensing
      </div>

      {/* Button row */}
      <div className="flex gap-2">
        {/* Collapse all button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onCollapseAll}
          disabled={!canCollapseMore}
          className="flex-1"
        >
          <ChevronUp className="w-4 h-4 mr-1" />
          Collapse Siblings
        </Button>

        {/* Expand all button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onExpandAll}
          disabled={!hasCollapsed}
          className="flex-1"
        >
          <ChevronDown className="w-4 h-4 mr-1" />
          Expand All
        </Button>
      </div>

      {/* Status indicators */}
      <div className="flex flex-col gap-1 text-xs text-gray-600">
        {collapsedGroups.size > 0 ? (
          <>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-[#2F3E8F] rounded-full" />
              <span className="font-medium">{collapsedGroups.size} group{collapsedGroups.size > 1 ? 's' : ''} collapsed</span>
            </div>
            <div className="text-gray-500 ml-3">
              Click placeholders to expand
            </div>
          </>
        ) : (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full" />
            <span>No groups collapsed</span>
          </div>
        )}

        {/* Available groups info */}
        {availableGroups.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="text-gray-500">
              Available to collapse:
            </div>
            {siblingGroupCount > 0 && (
              <div className="ml-2">
                • {siblingGroupCount} sibling group{siblingGroupCount > 1 ? 's' : ''}
              </div>
            )}
            {descendantGroupCount > 0 && (
              <div className="ml-2">
                • {descendantGroupCount} descendant chain{descendantGroupCount > 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Help text */}
      <div className="text-xs text-gray-500 border-t border-gray-200 pt-2">
        <span className="font-medium">Tip:</span> Collapsing reduces clutter in large trees.
        Only safe groups (no complex marriages) can be collapsed.
      </div>
    </div>
  );
}
