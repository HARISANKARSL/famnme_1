/**
 * ELK Layout Service — SHIM
 *
 * This file is a backwards-compatibility shim. The ELK.js dependency has been
 * removed and replaced by a custom layout engine in src/services/layout/.
 *
 * All types and functions are re-exported from the custom engine so that
 * existing imports throughout the codebase continue to work without changes.
 */

// Re-export types
export type { Position, Relationship, LayoutInput, LayoutResult } from './layout/types';
export { normalizeSingleParentUnions } from './layout/types';

// Re-export layout functions from the custom engine
export {
  calculateFamilyTreeLayout,
  calculateIncrementalLayout,
  clearCustomLayoutCache as clearLayoutCache,
  detectStructuralChange,
} from './layout/familyTreeLayoutEngine';

export type { StructuralChangeType } from './layout/familyTreeLayoutEngine';

// Re-export getAnchorPoint from layoutConstants (where the original also had it)
import { LAYOUT_CONSTANTS } from '@/constants/layoutConstants';

export interface LayoutConstants {
  PERSON_WIDTH: number;
  PERSON_HEIGHT: number;
  GENERATION_GAP: number;
  NODE_SPACING: number;
  SPOUSE_GAP: number;
  FAMILY_UNIT_GAP: number;
  UNION_HEIGHT: number;
  UNION_WIDTH: number;
}

export function getAnchorPoint(
  nodePos: { x: number; y: number },
  anchor: 'top' | 'bottom' | 'left' | 'right',
  layoutConstants: LayoutConstants = LAYOUT_CONSTANTS
): { x: number; y: number } {
  const halfWidth = layoutConstants.PERSON_WIDTH / 2;
  const halfHeight = layoutConstants.PERSON_HEIGHT / 2;

  switch (anchor) {
    case 'top':
      return { x: nodePos.x + halfWidth, y: nodePos.y };
    case 'bottom':
      return { x: nodePos.x + halfWidth, y: nodePos.y + layoutConstants.PERSON_HEIGHT };
    case 'left':
      return { x: nodePos.x, y: nodePos.y + halfHeight };
    case 'right':
      return { x: nodePos.x + layoutConstants.PERSON_WIDTH, y: nodePos.y + halfHeight };
    default:
      return nodePos;
  }
}
