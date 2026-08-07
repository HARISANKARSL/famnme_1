/**
 * PlaceholderCard Component - Collapsed Group Placeholder
 *
 * Displays a placeholder for collapsed groups with:
 * - Stacked silhouette effect (3 layered cards)
 * - Count badge showing number of hidden people
 * - Label describing the group type
 * - Hover effect with "Click to expand" hint
 * - Same dimensions as PersonCard (180×240px)
 *
 * This is visual aggregation only - nodes remain separate in data model
 */

import { useState, forwardRef } from 'react';
import { Users, ChevronDown } from 'lucide-react';
import { LAYOUT_CONSTANTS } from '@/constants/layoutConstants';
import type { PlaceholderNode } from '@/types';
import type { ResponsiveBreakpoint } from '@/constants/responsiveLayoutConstants';
import { useTheme } from '@/contexts/ThemeContext';

export interface PlaceholderCardProps {
  placeholder: PlaceholderNode;
  onExpand: () => void;
  breakpoint?: ResponsiveBreakpoint;
}

export const PlaceholderCard = forwardRef<HTMLDivElement, PlaceholderCardProps>(({
  placeholder,
  onExpand,
  breakpoint
}, ref) => {
  const [isHovered, setIsHovered] = useState(false);
  const { collapsedGroup } = placeholder;
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onExpand();
  };

  return (
    <div
      ref={ref}
      className="absolute cursor-pointer transition-all duration-200"
      style={{
        transform: `translate(${placeholder.x}px, ${placeholder.y}px)`,
        width: breakpoint?.personWidth ?? LAYOUT_CONSTANTS.PERSON_WIDTH,
        height: breakpoint?.personHeight ?? LAYOUT_CONSTANTS.PERSON_HEIGHT,
        pointerEvents: 'auto',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* Stacked silhouette effect - three layers */}
      <div className="relative w-full h-full">
        {/* Background card (furthest back) */}
        <div
          className={`absolute inset-0 rounded-lg opacity-40 transform ${isDark ? 'bg-zinc-800' : 'bg-gray-200'}`}
          style={{
            transform: 'translate(8px, 8px)',
          }}
        />

        {/* Middle card */}
        <div
          className={`absolute inset-0 rounded-lg opacity-60 transform ${isDark ? 'bg-zinc-750' : 'bg-gray-300'}`}
          style={{
            transform: 'translate(4px, 4px)',
          }}
        />

        {/* Main card (front) */}
        <div
          className={`
            relative rounded-lg border-2 border-dashed
            p-4 flex flex-col items-center justify-center
            w-full h-full
            transition-all duration-200
            ${isDark
              ? isHovered
                ? 'border-[#7B8FD4] bg-[#22222E] shadow-xl shadow-black/40'
                : 'border-zinc-700 bg-zinc-900'
              : isHovered
                ? 'border-[#2F3E8F] bg-[#E8EDFF] shadow-lg shadow-[#E8D5C4]'
                : 'border-gray-400 bg-gray-100'
            }
          `}
        >
          {/* Icon */}
          <Users
            className={`w-12 h-12 mb-3 transition-colors ${
              isDark
                ? isHovered ? 'text-[#7B8FD4]' : 'text-zinc-500'
                : isHovered ? 'text-[#2F3E8F]' : 'text-gray-500'
            }`}
          />

          {/* Count badge */}
          <div
            className={`
              rounded-full px-3 py-1 text-sm font-bold mb-2
              transition-colors
              ${isDark
                ? isHovered ? 'bg-[#7B8FD4] text-zinc-950' : 'bg-zinc-700 text-zinc-300'
                : isHovered ? 'bg-[#2F3E8F] text-white' : 'bg-gray-600 text-white'
              }
            `}
          >
            +{collapsedGroup.count}
          </div>

          {/* Label */}
          <div
            className={`
              font-medium text-center text-sm
              transition-colors
              ${isDark
                ? isHovered ? 'text-zinc-100' : 'text-zinc-400'
                : isHovered ? 'text-[#25327A]' : 'text-gray-700'
              }
            `}
          >
            {collapsedGroup.label}
          </div>

          {/* Group type indicator */}
          <div className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
            {collapsedGroup.groupType}
          </div>

          {/* Expand hint (only on hover) */}
          {isHovered && (
            <div className={`mt-3 text-xs flex items-center animate-pulse ${isDark ? 'text-[#7B8FD4]' : 'text-[#2F3E8F]'}`}>
              <ChevronDown className="w-3 h-3 mr-1" />
              Click to expand
            </div>
          )}

          {/* Warning indicator for complex marriages */}
          {collapsedGroup.hasComplexMarriages && (
            <div
              className="absolute top-2 right-2 w-3 h-3 bg-yellow-400 rounded-full"
              title="Contains non-standard marriage patterns"
            />
          )}
        </div>
      </div>

      {/* Accessibility label */}
      <div className="sr-only">
        Collapsed group: {collapsedGroup.label}
        {collapsedGroup.hiddenPersonIds.length} hidden members
        {collapsedGroup.hasComplexMarriages && ' - Contains complex marriages'}
        Click to expand
      </div>
    </div>
  );
});

PlaceholderCard.displayName = 'PlaceholderCard';
