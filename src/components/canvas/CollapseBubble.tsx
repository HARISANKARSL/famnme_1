/**
 * CollapseBubble - Compact clickable pill for collapsed groups
 *
 * Shows a label like "Parents", "5 Siblings", "3 Children" with a caret
 * pointing toward the anchor card. Clicking re-expands the group.
 */

import { ChevronUp, ChevronDown, ChevronRight } from 'lucide-react';
import type { CollapsedBubble as BubbleType } from '@/services/progressiveDisclosureService';
import { LAYOUT_CONSTANTS } from '@/constants/layoutConstants';
import type { ResponsiveBreakpoint } from '@/constants/responsiveLayoutConstants';

interface CollapseBubbleProps {
  bubble: BubbleType;
  anchorX: number;
  anchorY: number;
  onExpand: () => void;
  breakpoint?: ResponsiveBreakpoint;
}

export function CollapseBubble({
  bubble,
  anchorX,
  anchorY,
  onExpand,
  breakpoint,
}: CollapseBubbleProps) {
  const pw = breakpoint?.personWidth ?? LAYOUT_CONSTANTS.PERSON_WIDTH;
  const ph = breakpoint?.personHeight ?? LAYOUT_CONSTANTS.PERSON_HEIGHT;

  // Position relative to anchor card
  let x: number;
  let y: number;

  switch (bubble.placement) {
    case 'top':
      // Above card, centered
      x = anchorX + pw / 2;
      y = anchorY - 40;
      break;
    case 'bottom':
      // Below card, centered
      x = anchorX + pw / 2;
      y = anchorY + ph + 12;
      break;
    case 'side':
      // Right side of card
      x = anchorX + pw + 16;
      y = anchorY + ph / 2;
      break;
  }

  const Icon = bubble.placement === 'top'
    ? ChevronUp
    : bubble.placement === 'bottom'
    ? ChevronDown
    : ChevronRight;

  return (
    <div
      className="collapse-bubble absolute z-10 cursor-pointer"
      style={{
        transform: `translate(${x}px, ${y}px) translate(-50%, -50%)`,
        pointerEvents: 'auto',
        transition: `transform ${LAYOUT_CONSTANTS.LAYOUT_TRANSITION_DURATION}ms ${LAYOUT_CONSTANTS.LAYOUT_TRANSITION_EASING}, opacity 200ms ease`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onExpand();
      }}
      role="button"
      tabIndex={0}
      aria-label={`Show ${bubble.label}`}
    >
      <div className="flex items-center gap-1 px-3 py-1.5 bg-white/95 backdrop-blur-sm
                      border border-gray-300 rounded-full shadow-md
                      hover:bg-[#E8EDFF] hover:border-[#2F3E8F]
                      hover:shadow-lg transition-all duration-200
                      text-xs font-medium text-gray-700 hover:text-[#25327A]
                      whitespace-nowrap">
        <Icon className="w-3 h-3 flex-shrink-0" />
        <span>{bubble.label}</span>
      </div>
    </div>
  );
}
