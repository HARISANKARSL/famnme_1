/**
 * PersonCard Component - Fixed 180×240px Family Tree Node
 *
 * Displays a person's card in the family tree with:
 * - Profile photo (1:1 aspect ratio)
 * - Name (max 2 lines with ellipsis)
 * - Lifespan dates
 * - Anchor points for edges (top, bottom, left, right)
 * - Gender-based coloring (blue for males, pink for females)
 *
 * @see references/family-tree_ancestry.md
 */

import { forwardRef, memo, useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { LAYOUT_CONSTANTS } from '@/constants/layoutConstants';
import { useTheme } from '@/contexts/ThemeContext';
import type { Person, Union } from '@/types';
import type { ResponsiveBreakpoint } from '@/constants/responsiveLayoutConstants';
import type { RelationshipLabelEntry } from '@/services/relationshipLabelService';
import { Plus, Mic, ChevronUp, ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react';
import { resolveBackendUrl } from '@/config/api';
import { useTreeStore } from '@/store/treeStore';
import { transliterate } from '@/services/transliterationService';
import type { VamshavaliExpandInfo } from '@/types';
import { InlineAddRelativeChips } from '@/components/canvas/InlineAddRelativeChips';
import { getPersonPhotoUrl, getDefaultAvatar as getAvatar } from '@/utils/personPhotoUtils';


export interface PersonCardProps {
  person: Person;
  x: number;
  y: number;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  isSelected?: boolean;
  isFocused?: boolean;
  onAddRelative?: () => void;
  // C3 — optional one-tap relative chips (Parent/Spouse/Child/Sibling).
  // When provided, the "+" button reveals chips first instead of opening the full modal.
  onAddParent?: () => void;
  onAddSpouse?: () => void;
  onAddChild?: () => void;
  onAddSibling?: () => void;
  onInviteFamily?: () => void;
  onViewMemories?: () => void;
  onZoomToNode?: () => void;
  // Tree navigation
  onNavigateToTree?: (treeId: string) => void;
  personUnions?: Union[];
  // Blood relation expansion
  isExpandable?: boolean;
  isExpanded?: boolean;
  expansionMemberCount?: number;
  onToggleExpansion?: () => void;
  // Responsive layout
  breakpoint?: ResponsiveBreakpoint;
  // Highlight animation for newly added person
  isRecentlyAdded?: boolean;
  // Highlight for search result
  isSearchHighlight?: boolean;
  // Advanced search highlight
  isAdvancedSearchMatch?: boolean;
  hasAdvancedSearchActive?: boolean;
  // Highlight for relationship path
  isHighlighted?: boolean;
  // Relationship label (kinship term relative to home person)
  relationshipLabel?: RelationshipLabelEntry;
  // Progressive disclosure: per-node collapse chevrons
  hasParents?: boolean;
  hasSiblings?: boolean;
  hasChildren?: boolean;
  parentsHidden?: boolean;
  siblingsHidden?: boolean;
  childrenHidden?: boolean;
  onToggleParents?: () => void;
  onToggleSiblings?: () => void;
  onToggleChildren?: () => void;
  // "View their tree" for in-laws
  onViewTheirTree?: (personId: string) => void;
  isInLaw?: boolean;
  // Parent navigation icons (Ancestry-style)
  showParentNavIcons?: boolean;
  // Spouse toggle (Ancestry-style) — for persons with multiple marriages
  spouseList?: Array<{ unionId: string; spouseName: string; gender: string; isVisible: boolean }>;
  onToggleSpouseVisibility?: (unionId: string, visible: boolean) => void;
  // Memory count badge
  memoryCount?: number;
  // Broken lineage indicator
  isBrokenLineage?: boolean;
  // Split-view: node is a duplicate (appears on both paternal and maternal sides)
  isDuplicate?: boolean;
  // Voice add: open voice assistant scoped to this person
  onVoiceAdd?: () => void;
  // Node preview hover events
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  // Vamshavali mode — directional expand pills
  showVamshavaliPills?: boolean;
  vamshavaliExpandInfo?: VamshavaliExpandInfo;
  isVamshavaliNewNode?: boolean;
  // Claim visual states (GitHub-style collaboration)
  claimStatus?: 'unclaimed' | 'invited' | 'claimed';
  isClaimedByMe?: boolean;
  hasPendingCR?: boolean;
  // Read-only / public view — hides edit affordances (add, context menu, voice).
  readOnly?: boolean;
  // Gold pulse ring to highlight the invited person on the public invite landing.
  isInvitedHighlight?: boolean;
}

/**
 * Format lifespan for display
 * Examples: "1980 - 2020", "1980 - Present", "b. 1980"
 */
function formatLifespan(birthDate?: string | null, deathDate?: string | null, isLiving?: boolean): string {
  if (!birthDate) return '';

  const birthYear = new Date(birthDate).getFullYear();

  if (deathDate) {
    const deathYear = new Date(deathDate).getFullYear();
    return `${birthYear} – ${deathYear}`;
  }

  if (isLiving) {
    return `b. ${birthYear}`;
  }

  return `${birthYear}`;
}

// Helper function to get gender-based default avatar
function getDefaultAvatar(gender: Person['gender']): string {
  return getAvatar(gender);
}


/**
 * VamshavaliExpandPills — Direction-coded expand/collapse buttons for Vamshavali mode.
 *
 * Design: Warm, color-coded pills that invite exploration.
 * - Parents (top): Amber/warm — "look upward at your roots"
 * - Siblings (right): Violet — "look sideways at your generation"
 * - Children (bottom): Emerald/green — "look down at growth"
 */
function VamshavaliExpandPill({
  direction,
  count,
  isExpanded,
  onClick,
  position,
}: {
  direction: 'parents' | 'siblings' | 'children';
  count: number;
  isExpanded: boolean;
  onClick: () => void;
  position: React.CSSProperties;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const config = {
    parents: {
      defaultBg: isDark ? 'bg-amber-950/45' : 'bg-amber-50',
      defaultBorder: isDark ? 'border-amber-900/60' : 'border-amber-200/80',
      defaultText: isDark ? 'text-amber-300' : 'text-amber-700',
      expandedBg: isDark ? 'bg-amber-900/60' : 'bg-amber-100',
      expandedBorder: isDark ? 'border-amber-700/60' : 'border-amber-300/60',
      expandedText: isDark ? 'text-amber-200' : 'text-amber-800',
      hoverBg: isDark ? 'hover:bg-amber-900/80' : 'hover:bg-amber-100',
      hoverBorder: isDark ? 'hover:border-amber-600' : 'hover:border-amber-300',
      shadow: isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(217,164,65,0.15)',
      expandIcon: <ChevronUp className="w-3.5 h-3.5" />,
      collapseIcon: <ChevronDown className="w-3.5 h-3.5" />,
      label: count === 1 ? '1 parent' : `${count} parents`,
    },
    siblings: {
      defaultBg: isDark ? 'bg-violet-950/45' : 'bg-violet-50',
      defaultBorder: isDark ? 'border-violet-900/60' : 'border-violet-200/80',
      defaultText: isDark ? 'text-violet-300' : 'text-violet-700',
      expandedBg: isDark ? 'bg-violet-900/60' : 'bg-violet-100',
      expandedBorder: isDark ? 'border-violet-700/60' : 'border-violet-300/60',
      expandedText: isDark ? 'text-violet-200' : 'text-violet-800',
      hoverBg: isDark ? 'hover:bg-violet-900/80' : 'hover:bg-violet-100',
      hoverBorder: isDark ? 'hover:border-violet-600' : 'hover:border-violet-300',
      shadow: isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(139,92,246,0.12)',
      expandIcon: <ChevronRight className="w-3.5 h-3.5" />,
      collapseIcon: <ChevronRight className="w-3.5 h-3.5 rotate-180" />,
      label: count === 1 ? '1 sibling' : `${count} siblings`,
    },
    children: {
      defaultBg: isDark ? 'bg-emerald-950/45' : 'bg-emerald-50',
      defaultBorder: isDark ? 'border-emerald-900/60' : 'border-emerald-200/80',
      defaultText: isDark ? 'text-emerald-300' : 'text-emerald-700',
      expandedBg: isDark ? 'bg-emerald-900/60' : 'bg-emerald-100',
      expandedBorder: isDark ? 'border-emerald-700/60' : 'border-emerald-300/60',
      expandedText: isDark ? 'text-emerald-200' : 'text-[#A7F3D0]',
      hoverBg: isDark ? 'hover:bg-emerald-900/80' : 'hover:bg-emerald-100',
      hoverBorder: isDark ? 'hover:border-emerald-600' : 'hover:border-emerald-300',
      shadow: isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(16,185,129,0.12)',
      expandIcon: <ChevronDown className="w-3.5 h-3.5" />,
      collapseIcon: <ChevronUp className="w-3.5 h-3.5" />,
      label: count === 1 ? '1 child' : `${count} children`,
    },
  }[direction];

  const isCollapse = isExpanded && count === 0;
  const bg = isCollapse || isExpanded ? config.expandedBg : config.defaultBg;
  const border = isCollapse || isExpanded ? config.expandedBorder : config.defaultBorder;
  const text = isCollapse || isExpanded ? config.expandedText : config.defaultText;
  const hover = isCollapse ? '' : `${config.hoverBg} ${config.hoverBorder}`;
  const icon = isCollapse ? config.collapseIcon : config.expandIcon;
  const _label = isCollapse ? `Hide` : config.label;
  const ariaLabel = isCollapse
    ? `Hide ${direction}`
    : `Show ${config.label}`;

  return (
    <button
      className={`no-export absolute flex items-center justify-center gap-1 rounded-full text-[11px] font-semibold border transition-all duration-200 cursor-pointer select-none ${bg} ${border} ${text} ${hover} hover:scale-105 active:scale-95`}
      style={{
        ...position,
        padding: isCollapse ? '3px 8px' : '3px 10px',
        minWidth: isCollapse ? 32 : 44,
        minHeight: 26,
        pointerEvents: 'auto',
        zIndex: 15,
        boxShadow: config.shadow,
      }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      aria-expanded={isExpanded}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      {icon}
      {!isCollapse && <span>{count}</span>}
    </button>
  );
}

function VamshavaliExpandPills({
  expandInfo,
  hasParents,
  hasSiblings,
  hasChildren,
  parentsHidden,
  siblingsHidden,
  childrenHidden,
  onToggleParents,
  onToggleSiblings,
  onToggleChildren,
}: {
  expandInfo: VamshavaliExpandInfo;
  hasParents: boolean;
  hasSiblings: boolean;
  hasChildren: boolean;
  parentsHidden: boolean;
  siblingsHidden: boolean;
  childrenHidden: boolean;
  onToggleParents?: () => void;
  onToggleSiblings?: () => void;
  onToggleChildren?: () => void;
}) {
  return (
    <>
      {/* Top — Parents */}
      {hasParents && (expandInfo.hiddenParentCount > 0 || (!parentsHidden && expandInfo.hasVisibleParents)) && onToggleParents && (
        <VamshavaliExpandPill
          direction="parents"
          count={expandInfo.hiddenParentCount}
          isExpanded={!parentsHidden && expandInfo.hasVisibleParents}
          onClick={onToggleParents}
          position={{ top: -20, left: '50%', transform: 'translateX(-50%)' }}
        />
      )}
      {/* Right — Siblings */}
      {hasSiblings && (expandInfo.hiddenSiblingCount > 0 || (!siblingsHidden && expandInfo.hasVisibleSiblings)) && onToggleSiblings && (
        <VamshavaliExpandPill
          direction="siblings"
          count={expandInfo.hiddenSiblingCount}
          isExpanded={!siblingsHidden && expandInfo.hasVisibleSiblings}
          onClick={onToggleSiblings}
          position={{ top: '50%', right: -18, transform: 'translateY(-50%)' }}
        />
      )}
      {/* Bottom — Children */}
      {hasChildren && (expandInfo.hiddenChildrenCount > 0 || (!childrenHidden && expandInfo.hasVisibleChildren)) && onToggleChildren && (
        <VamshavaliExpandPill
          direction="children"
          count={expandInfo.hiddenChildrenCount}
          isExpanded={!childrenHidden && expandInfo.hasVisibleChildren}
          onClick={onToggleChildren}
          position={{ bottom: -20, left: '50%', transform: 'translateX(-50%)' }}
        />
      )}
    </>
  );
}

/**
 * PersonActionMenu — single "+" button above the card.
 * Clicking it centers the node and immediately opens "Add Relative".
 * Shows a brief tooltip hint on first appearance that auto-dismisses.
 */
function PersonActionMenu({
  visible,
  onAddRelative,
  onAddParent,
  onAddSpouse,
  onAddChild,
  onAddSibling,
  onVoiceAdd,
  onZoomToNode,
}: {
  visible: boolean;
  onAddRelative?: () => void;
  onAddParent?: () => void;
  onAddSpouse?: () => void;
  onAddChild?: () => void;
  onAddSibling?: () => void;
  onVoiceAdd?: () => void;
  onZoomToNode?: () => void;
}) {
  const [showHint, setShowHint] = useState(false);
  const [chipsOpen, setChipsOpen] = useState(false);
  const prevVisible = useRef(false);
  const hasChipHandlers = !!(onAddParent || onAddSpouse || onAddChild || onAddSibling);

  useEffect(() => {
    if (visible && !prevVisible.current) {
      // '+' just appeared — show hint briefly
      setShowHint(true);
      const timer = setTimeout(() => setShowHint(false), 2000);
      return () => clearTimeout(timer);
    }
    if (!visible) {
      setShowHint(false);
    }
    prevVisible.current = visible;
  }, [visible]);

  if (!onAddRelative) return null;

  return (
    <div
      className="no-export absolute -top-[52px] left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 transition-opacity duration-200"
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onZoomToNode?.();
          if (hasChipHandlers) {
            setChipsOpen(v => !v);
          } else {
            onAddRelative();
          }
        }}
        className="w-9 h-9 bg-[#2F3E8F] hover:bg-[#25327A] text-white
          rounded-full shadow-lg flex items-center justify-center
          transition-transform duration-200 hover:scale-110 active:scale-95"
        title="Add relative"
      >
        <Plus className="h-4 w-4" />
      </button>

      {chipsOpen && hasChipHandlers && (
        <InlineAddRelativeChips
          onAddParent={onAddParent}
          onAddSpouse={onAddSpouse}
          onAddChild={onAddChild}
          onAddSibling={onAddSibling}
          onClose={() => setChipsOpen(false)}
        />
      )}

      {onVoiceAdd && (
        <button
          onClick={(e) => { e.stopPropagation(); onZoomToNode?.(); onVoiceAdd(); }}
          className="w-9 h-9 bg-[#3B4DA6] hover:bg-[#004578] text-white
            rounded-full shadow-lg flex items-center justify-center
            transition-transform duration-200 hover:scale-110 active:scale-95"
          title="Add via voice"
        >
          <Mic className="h-4 w-4" />
        </button>
      )}

      {/* Auto-dismissing tooltip hint */}
      <div
        className="absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap
          bg-gray-900/90 text-white text-[11px] font-medium px-2.5 py-1 rounded-md
          shadow-lg backdrop-blur-sm
          transition-all duration-300 ease-out pointer-events-none"
        style={{
          opacity: showHint ? 1 : 0,
          transform: `translateY(-50%) translateX(${showHint ? '0' : '-6px'})`,
        }}
      >
        Add a family member
        {/* Small arrow pointing left */}
        <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2">
          <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-r-[5px] border-r-gray-900/90" />
        </div>
      </div>
    </div>
  );
}

/**
 * SpouseTogglePopup — hamburger icon + popup for toggling spouse visibility.
 * Only renders when a person has 2+ spouses.
 */
function SpouseTogglePopup({
  person,
  spouseList,
  onToggleSpouseVisibility,
  showParentNavIcons,
}: {
  person: Person;
  spouseList?: PersonCardProps['spouseList'];
  onToggleSpouseVisibility?: PersonCardProps['onToggleSpouseVisibility'];
  showParentNavIcons?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);

  // Close on scroll/wheel/resize
  useEffect(() => {
    if (!isOpen) return;
    const close = () => setIsOpen(false);
    window.addEventListener('wheel', close, { passive: true });
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('wheel', close);
      window.removeEventListener('resize', close);
    };
  }, [isOpen]);

  // Compute position when opening
  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 240;
      const dropdownHeight = 200;
      // Default: right of button
      let left = rect.right + 4;
      let top = rect.top;
      // Flip left if near right edge
      if (left + dropdownWidth > window.innerWidth - 8) {
        left = rect.left - dropdownWidth - 4;
      }
      // Flip up if near bottom edge
      if (top + dropdownHeight > window.innerHeight - 8) {
        top = Math.max(8, window.innerHeight - dropdownHeight - 8);
      }
      setDropdownPos({ top, left });
    }
    setIsOpen(!isOpen);
  }, [isOpen]);

  if (!spouseList || spouseList.length < 2 || !onToggleSpouseVisibility) return null;

  // Position below parent nav icons if they're shown
  const topOffset = showParentNavIcons ? 'top-[52px]' : 'top-1';

  return (
    <div
      className={`no-export absolute -left-3 ${topOffset} z-20`}
      style={{ pointerEvents: 'auto' }}
    >
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="w-[22px] h-[22px] rounded-full bg-[#2F3E8F]/90 dark:bg-blue-600/90 hover:bg-[#3B4DA6] dark:hover:bg-blue-500
          border-2 border-white dark:border-zinc-900 shadow-sm flex items-center justify-center
          transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer"
        title={`Spouses/Partners for ${person.firstName}`}
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="white">
          <rect x="2" y="3" width="12" height="1.5" rx="0.75" />
          <rect x="2" y="7" width="12" height="1.5" rx="0.75" />
          <rect x="2" y="11" width="12" height="1.5" rx="0.75" />
        </svg>
      </button>

      {isOpen && dropdownPos && createPortal(
        <>
          {/* Backdrop to close on outside click */}
          <div
            className="fixed inset-0"
            style={{ zIndex: 9998 }}
            onClick={() => setIsOpen(false)}
          />
          {/* Dropdown */}
          <div
            className="fixed bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-gray-200 dark:border-zinc-700 p-3 min-w-[220px] max-w-[260px]"
            style={{ zIndex: 9999, top: dropdownPos.top, left: dropdownPos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
              Spouses/Partners for {person.firstName}
            </div>
            {spouseList.map((sp) => (
              <div
                key={sp.unionId}
                className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-zinc-700 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center ${sp.gender === 'male' ? 'bg-slate-200 dark:bg-slate-800' : 'bg-blue-100 dark:bg-blue-950/40'
                      }`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill={sp.gender === 'male' ? '#475569' : '#e11d48'}>
                      <circle cx="12" cy="7" r="4" />
                      <path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-[#2F3E8F] dark:text-blue-300">{sp.spouseName || 'Unknown'}</div>
                    <div className="text-[10px] text-gray-400 dark:text-zinc-500">Spouse</div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSpouseVisibility(sp.unionId, !sp.isVisible);
                  }}
                  className={`w-9 h-5 rounded-full transition-colors duration-200 relative ${sp.isVisible ? 'bg-[#2F3E8F] dark:bg-blue-600' : 'bg-gray-300 dark:bg-zinc-700'
                    }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm absolute top-[3px] transition-transform duration-200 ${sp.isVisible ? 'translate-x-[18px]' : 'translate-x-[3px]'
                      }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

const PersonCardInner = forwardRef<HTMLDivElement, PersonCardProps>(({
  person,
  x,
  y,
  onClick,
  onDoubleClick,
  onContextMenu,
  isSelected = false,
  isFocused = false,
  onAddRelative,
  onAddParent,
  onAddSpouse,
  onAddChild,
  onAddSibling,
  onInviteFamily: _onInviteFamily,
  onViewMemories: _onViewMemories,
  onZoomToNode,
  onNavigateToTree: _onNavigateToTree,
  personUnions: _personUnions,
  isExpandable = false,
  isExpanded = false,
  expansionMemberCount = 0,
  onToggleExpansion,
  breakpoint,
  isRecentlyAdded = false,
  isSearchHighlight = false,
  isAdvancedSearchMatch = false,
  hasAdvancedSearchActive = false,
  isHighlighted = false,
  relationshipLabel,
  hasParents = false,
  hasSiblings = false,
  hasChildren = false,
  parentsHidden = false,
  siblingsHidden = false,
  childrenHidden = false,
  onToggleParents,
  onToggleSiblings,
  onToggleChildren,
  onViewTheirTree,
  isInLaw: _isInLaw = false,
  showParentNavIcons = false,
  spouseList,
  onToggleSpouseVisibility,
  memoryCount: _memoryCount = 0,
  isBrokenLineage = false,
  isDuplicate = false,
  onVoiceAdd,
  onMouseEnter: onMouseEnterProp,
  onMouseLeave: onMouseLeaveProp,
  showVamshavaliPills = false,
  vamshavaliExpandInfo,
  isVamshavaliNewNode = false,
  claimStatus = 'unclaimed',
  isClaimedByMe = false,
  hasPendingCR = false,
  readOnly = false,
  isInvitedHighlight = false,
}, ref) => {
  const locale = useTreeStore(s => s.locale);
  const isDeceased = person.isLiving === false || !!person.deathDate;
  const isGhost = person.isDeleted === true;
  const fullName = [person.firstName, person.lastName].filter(name => name && name !== 'undefined').join(' ');

  const displayName = locale === 'en'
    ? fullName
    : transliterate(fullName, locale);
  const lifespan = formatLifespan(person.birthDate, person.deathDate, person.isLiving);

  // Determine card style based on gender and home person status
  const isHome = person.isHomePerson;
  const isMale = person.gender === 'male';
  const isFemale = person.gender === 'female';

  // Ancestry-style card theme: subtle full-card border, no gradient top bar
  // Focus person gets green border + badge, male=stone/blue, female=rose/pink
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const cardTheme = isFocused
    ? {
      borderColor: '#16a34a', // green-600
      photoBg: isDark
        ? 'from-green-950/20 via-zinc-900 to-green-950/10'
        : 'from-green-50/60 via-white to-green-50/30',
      infoBg: isDark ? 'bg-transparent' : 'bg-white',
      nameColor: isDark ? 'text-zinc-100' : 'text-slate-800',
      metaColor: isDark ? 'text-zinc-400' : 'text-gray-500',
      shadow: isDark
        ? 'shadow-[0_1px_8px_-1px_rgba(22,163,74,0.3)]'
        : 'shadow-[0_1px_8px_-1px_rgba(22,163,74,0.18)]',
      hoverShadow: isDark
        ? 'hover:shadow-[0_4px_16px_-2px_rgba(22,163,74,0.4)]'
        : 'hover:shadow-[0_4px_16px_-2px_rgba(22,163,74,0.22)]',
    }
    : isHome
      ? {
        borderColor: isDark ? '#7B8FD4' : '#1d6fb8',
        photoBg: isDark
          ? 'from-blue-950/20 via-zinc-900 to-sky-950/10'
          : 'from-blue-50/40 via-white to-sky-50/20',
        infoBg: isDark ? 'bg-transparent' : 'bg-white',
        nameColor: isDark ? 'text-zinc-100' : 'text-slate-800',
        metaColor: isDark ? 'text-zinc-400' : 'text-gray-500',
        shadow: isDark
          ? 'shadow-[0_1px_8px_-1px_rgba(123,143,212,0.25)]'
          : 'shadow-[0_1px_8px_-1px_rgba(217,119,6,0.15)]',
        hoverShadow: isDark
          ? 'hover:shadow-[0_4px_16px_-2px_rgba(123,143,212,0.35)]'
          : 'hover:shadow-[0_4px_16px_-2px_rgba(217,119,6,0.20)]',
      }
      : isMale
        ? {
          borderColor: '#5A7DB8',
          photoBg: isDark
            ? 'from-slate-900/40 via-zinc-900 to-slate-950/20'
            : 'from-[#EEF2F9] via-white to-[#F5F7FB]',
          infoBg: isDark ? 'bg-transparent' : 'bg-white',
          nameColor: isDark ? 'text-zinc-100' : 'text-slate-800',
          metaColor: isDark ? 'text-zinc-400' : 'text-gray-500',
          shadow: isDark
            ? 'shadow-[0_1px_6px_-1px_rgba(90,125,184,0.25)]'
            : 'shadow-[0_1px_6px_-1px_rgba(90,125,184,0.20)]',
          hoverShadow: isDark
            ? 'hover:shadow-[0_4px_14px_-2px_rgba(90,125,184,0.35)]'
            : 'hover:shadow-[0_4px_14px_-2px_rgba(90,125,184,0.28)]',
        }
        : isFemale
          ? {
            borderColor: '#C29A94',
            photoBg: isDark
              ? 'from-rose-950/20 via-zinc-900 to-rose-950/10'
              : 'from-[#F7EFED] via-white to-[#FAF4F2]',
            infoBg: isDark ? 'bg-transparent' : 'bg-white',
            nameColor: isDark ? 'text-zinc-100' : 'text-slate-800',
            metaColor: isDark ? 'text-zinc-400' : 'text-gray-500',
            shadow: isDark
              ? 'shadow-[0_1px_6px_-1px_rgba(194,154,148,0.25)]'
              : 'shadow-[0_1px_6px_-1px_rgba(194,154,148,0.20)]',
            hoverShadow: isDark
              ? 'hover:shadow-[0_4px_14px_-2px_rgba(194,154,148,0.35)]'
              : 'hover:shadow-[0_4px_14px_-2px_rgba(194,154,148,0.28)]',
          }
          : {
            borderColor: '#A8A18D',
            photoBg: isDark
              ? 'from-zinc-800/40 via-zinc-900 to-zinc-950/20'
              : 'from-[#F4F2EC] via-white to-[#F8F6F0]',
            infoBg: isDark ? 'bg-transparent' : 'bg-white',
            nameColor: isDark ? 'text-zinc-100' : 'text-slate-800',
            metaColor: isDark ? 'text-zinc-400' : 'text-gray-500',
            shadow: isDark
              ? 'shadow-[0_1px_6px_-1px_rgba(168,161,141,0.22)]'
              : 'shadow-[0_1px_6px_-1px_rgba(168,161,141,0.18)]',
            hoverShadow: isDark
              ? 'hover:shadow-[0_4px_14px_-2px_rgba(168,161,141,0.30)]'
              : 'hover:shadow-[0_4px_14px_-2px_rgba(168,161,141,0.24)]',
          };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDoubleClick?.();
  };

  // Custom styling for advanced search highlight
  const advancedSearchClass = hasAdvancedSearchActive 
    ? (isAdvancedSearchMatch ? ' outline outline-4 outline-yellow-400 outline-offset-2 z-30 opacity-100 rounded-[12px]' : ' opacity-30 grayscale-[50%]')
    : '';

  return (
    <div
      ref={ref}
      data-gender={person.gender}
      className={`person-card absolute group${isHome ? ' person-card-home' : ''}${isRecentlyAdded ? ' person-card-recently-added' : ''}${isSearchHighlight ? ' person-card-search-highlight' : ''}${isHighlighted ? ' person-card-highlighted' : ''}${isInvitedHighlight ? ' person-card-invited-highlight' : ''}${isVamshavaliNewNode ? ' vamshavali-appear' : ''}${advancedSearchClass}`}
      style={{
        transform: `translate(${x}px, ${y}px)`,
        width: breakpoint?.personWidth ?? LAYOUT_CONSTANTS.PERSON_WIDTH,
        height: breakpoint?.personHeight ?? LAYOUT_CONSTANTS.PERSON_HEIGHT,
        zIndex: isSelected || isFocused || isSearchHighlight || isAdvancedSearchMatch ? 40 : 10,
        opacity: isGhost ? 0.6 : undefined,
        transition: `transform ${LAYOUT_CONSTANTS.LAYOUT_TRANSITION_DURATION}ms ${LAYOUT_CONSTANTS.LAYOUT_TRANSITION_EASING}`,
        pointerEvents: 'auto',
      }}
      onClick={onClick}
      onDoubleClick={isGhost ? undefined : handleDoubleClick}
      onContextMenu={onContextMenu}
      onMouseEnter={isGhost ? undefined : onMouseEnterProp}
      onMouseLeave={isGhost ? undefined : onMouseLeaveProp}
      role="button"
      tabIndex={0}
      aria-label={isGhost ? 'Add person here' : `${fullName} - ${lifespan}`}
    >
      {isGhost ? (
        /* Ghost node — interactive "+" placeholder or "Unknown" if read-only */
        <div
          className={`w-full h-full rounded-xl overflow-hidden
            flex flex-col items-center justify-center gap-3 group/ghost
            ${readOnly
              ? 'cursor-default shadow-[0_1px_4px_-1px_rgba(0,0,0,0.04)]'
              : 'cursor-pointer transition-all duration-300 ease-out shadow-[0_1px_4px_-1px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_-2px_rgba(47,62,143,0.15)] hover:-translate-y-0.5 active:scale-[0.97]'
            }`}
          style={{
            border: isDark ? '2px dashed #4b5563' : '2px dashed #9ca3af',
            backgroundColor: isDark ? '#1C1C22' : '#f9fafb',
          }}
        >
          {/* Large "+" icon (only in interactive mode) */}
          {!readOnly && (
            <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-zinc-800 group-hover/ghost:bg-[#E8EDFF] dark:group-hover/ghost:bg-blue-950/40
              border-2 border-dashed border-gray-300 dark:border-zinc-700 group-hover/ghost:border-[#2F3E8F]/40 dark:group-hover/ghost:border-blue-500/40
              flex items-center justify-center transition-all duration-200">
              <Plus className="h-7 w-7 text-gray-400 dark:text-zinc-500 group-hover/ghost:text-[#2F3E8F] dark:group-hover/ghost:text-blue-400 transition-colors duration-200" />
            </div>
          )}

          {/* Hint text */}
          <span className={`text-xs font-medium transition-colors duration-200 ${readOnly ? 'text-gray-400 dark:text-zinc-500' : 'text-gray-400 dark:text-zinc-500 group-hover/ghost:text-[#2F3E8F] dark:group-hover/ghost:text-blue-400'
            }`}>
            {readOnly ? 'Unknown' : 'Add Person'}
          </span>

          {/* Anchor Points (invisible, for edge connections) */}
          <div className="anchor anchor-top pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2" data-role="parents" />
          <div className="anchor anchor-bottom pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2" data-role="children" />
          <div className="anchor anchor-left pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 w-2 h-2" data-role="spouse" />
          <div className="anchor anchor-right pointer-events-none absolute top-1/2 right-0 -translate-y-1/2 w-2 h-2" data-role="spouse" />
        </div>
      ) : (
        /* Normal person card */
        <>
          <div
            className={`
          w-full h-full rounded-xl overflow-hidden cursor-pointer
          transition-all duration-300 ease-out ${cardTheme.shadow} ${cardTheme.hoverShadow}
          hover:-translate-y-0.5 active:scale-[0.97]
          ${isSelected ? 'ring-2 ring-[#2F3E8F] ring-offset-1' : ''}
        `}
            style={{
              border: isBrokenLineage
                ? '2px dashed #ef4444'
                : claimStatus === 'invited'
                  ? '2px dashed #C2A46D'
                  : claimStatus === 'claimed'
                    ? '2px solid #C2A46D'
                    : isDuplicate
                      ? `2px dashed ${cardTheme.borderColor}`
                      : `2px solid ${cardTheme.borderColor}`,
              backgroundColor: isDark
                ? (isHome ? '#2C2B24' : '#1C1C22')
                : (isHome ? '#fefce8' : '#fff'),
            }}
          >
            {/* Shared person badge — shown in split-view when person appears on both sides */}
            {isDuplicate && (
              <div
                className="absolute top-1 left-1 z-10 px-1.5 py-0.5 rounded-full
                       bg-purple-100 border border-purple-300 text-purple-700
                       text-[9px] font-semibold leading-none flex items-center gap-0.5"
                title="This person appears in both paternal and maternal sides"
              >
                <span>↔</span>
                <span>shared</span>
              </div>
            )}

            {/* Pending CR indicator — orange dot */}
            {hasPendingCR && (
              <div
                className="absolute top-1.5 left-1.5 z-10 w-2 h-2 rounded-full bg-orange-500"
                title="Has a pending suggested edit"
              />
            )}

            {/* Invited indicator — envelope icon */}
            {claimStatus === 'invited' && (
              <div
                className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center"
                title="Invitation sent — waiting for claim"
              >
                <svg className="w-2.5 h-2.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            )}

            {/* Focus Person Badge (Ancestry-style green circle) */}
            {isFocused && (
              <div
                className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full
                       bg-green-600 border-2 border-white shadow-sm
                       flex items-center justify-center"
                title="Focus person"
              >
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            )}

            {/* Profile Photo — no gradient top bar */}
            <div
              className={`w-full overflow-hidden flex items-center justify-center bg-gradient-to-b ${cardTheme.photoBg} relative photo-container`}
              style={{
                height: breakpoint?.photoHeight ?? 144,
                ...(isDeceased ? { filter: 'grayscale(40%) opacity(0.85)' } : {}),
              }}
            >
              {isDeceased && (
                <span
                  className="absolute top-1 left-1.5 z-10 text-gray-500 text-xs font-bold leading-none select-none"
                  title="Deceased"
                >†</span>
              )}
              <img
                src={getPersonPhotoUrl(person) || getDefaultAvatar(person.gender)}
                alt={fullName}
                loading="lazy"
                decoding="async"
                className={`w-full h-full ${
                  person.photoThumbUrl || person.profilePhotoUrl
                    ? 'object-cover'
                    : `object-contain opacity-40 dark:opacity-60 dark:invert dark:brightness-150`
                }`}
              />




              {/* Claimed badge — gold ring effect at bottom of photo */}
              {claimStatus === 'claimed' && (
                <div className="absolute bottom-1 right-1 z-10">
                  {isClaimedByMe ? (
                    <span className="px-1.5 py-0.5 bg-[#C2A46D] text-white text-[9px] font-semibold rounded-full leading-none">
                      You
                    </span>
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-[#C2A46D] flex items-center justify-center" title="Claimed by a family member">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Person Info — simplified: name + birth/death only */}
            <div className={`p-2.5 flex flex-col gap-0.5 ${cardTheme.infoBg}`} style={{ height: breakpoint?.infoHeight ?? 96 }}>
              <div
                className={`font-semibold tracking-tight leading-tight ${cardTheme.nameColor} overflow-hidden text-ellipsis line-clamp-2 ${breakpoint?.textSize === 'xs' ? 'text-xs' : 'text-sm'}`}
                title={fullName}
              >
                <span
                  aria-hidden="true"
                  className="inline-block mr-1 font-normal align-baseline"
                  style={{
                    color: isDark
                      ? (isMale ? '#93C5FD' : isFemale ? '#FBCFE8' : '#D4D4D8')
                      : (isMale ? '#5A7DB8' : isFemale ? '#C29A94' : '#A8A18D'),
                    fontSize: '0.85em',
                    lineHeight: 1,
                  }}
                  title={isMale ? 'Male' : isFemale ? 'Female' : 'Gender not specified'}
                >
                  {isMale ? '♂' : isFemale ? '♀' : '⚥'}
                </span>
                {displayName}
              </div>
              {lifespan && (
                <div className={`${cardTheme.metaColor} tabular-nums ${breakpoint?.textSize === 'xs' ? 'text-[10px]' : 'text-xs'}`}>
                  {lifespan}
                </div>
              )}
              {showVamshavaliPills && relationshipLabel?.englishLabel && (
                <div className="text-[10px] text-[#C2A46D] font-medium tracking-wide truncate mt-0.5">
                  {relationshipLabel.englishLabel}
                </div>
              )}
            </div>

            {/* Anchor Points (invisible, for edge connections) */}
            <div className="anchor anchor-top pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2" data-role="parents" />
            <div className="anchor anchor-bottom pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2" data-role="children" />
            <div className="anchor anchor-left pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 w-2 h-2" data-role="spouse" />
            <div className="anchor anchor-right pointer-events-none absolute top-1/2 right-0 -translate-y-1/2 w-2 h-2" data-role="spouse" />
          </div>
        </>
      )}

      {/* Parent Navigation Icons (Ancestry-style) — hidden for ghost nodes */}
      {!isGhost && showParentNavIcons && onViewTheirTree && (
        <div
          className="no-export absolute -left-3 top-1 z-20 flex flex-col gap-1"
          style={{ pointerEvents: 'auto' }}
        >
          {/* Male parent icon */}
          <button
            onClick={(e) => { e.stopPropagation(); onViewTheirTree(person.personId); }}
            className="w-[22px] h-[22px] rounded-full bg-slate-500/90 dark:bg-zinc-700/90 hover:bg-slate-600 dark:hover:bg-zinc-600
              border-2 border-white dark:border-zinc-900 shadow-sm flex items-center justify-center
              transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer"
            title={`View ${person.firstName}'s father's lineage`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
              <circle cx="12" cy="7" r="4" />
              <path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2" />
            </svg>
          </button>
          {/* Female parent icon */}
          <button
            onClick={(e) => { e.stopPropagation(); onViewTheirTree(person.personId); }}
            className="w-[22px] h-[22px] rounded-full bg-blue-400/90 dark:bg-blue-600/90 hover:bg-blue-500 dark:hover:bg-blue-500
              border-2 border-white dark:border-zinc-900 shadow-sm flex items-center justify-center
              transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer"
            title={`View ${person.firstName}'s mother's lineage`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
              <circle cx="12" cy="7" r="4" />
              <path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2" />
            </svg>
          </button>
        </div>
      )}

      {/* Spouse Toggle Icon (Ancestry-style) — hidden for ghost nodes */}
      {!isGhost && (
        <SpouseTogglePopup
          person={person}
          spouseList={spouseList}
          onToggleSpouseVisibility={onToggleSpouseVisibility}
          showParentNavIcons={showParentNavIcons}
        />
      )}

      {/* Action menu — single "+" button (hidden for ghost nodes, in Vamshavali mode, or in read-only public view) */}
      {!isGhost && !showVamshavaliPills && !readOnly && (
        <PersonActionMenu
          visible={isSelected}
          onAddRelative={onAddRelative}
          onAddParent={onAddParent}
          onAddSpouse={onAddSpouse}
          onAddChild={onAddChild}
          onAddSibling={onAddSibling}
          onVoiceAdd={onVoiceAdd}
          onZoomToNode={onZoomToNode}
        />
      )}



      {/* Root Person Badge - bottom left of the entire node */}
      {isHome && (
        <div
          className="root-person-badge absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 px-2 py-0.5 rounded-full
             bg-yellow-500 border border-yellow-600 shadow-sm
             flex items-center justify-center gap-1"
          title="Root person"
        >


          <span className="text-[9px] font-bold text-white tracking-wide uppercase">
            Root Person
          </span>
        </div>
      )}

      {/* Expand indicator — shows when person has hidden relatives */}
      {isExpandable && onToggleExpansion && (
        <button
          className="no-export absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all z-10"
          style={{
            backgroundColor: isExpanded ? '#16a34a' : '#2F3E8F',
            color: 'white',
            pointerEvents: 'auto',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            cursor: 'pointer',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpansion();
          }}
          title={isExpanded ? 'Hide extended family' : `Show ${expansionMemberCount} more relatives`}
        >
          {isExpanded ? '−' : '+'}{expansionMemberCount > 0 ? ` ${expansionMemberCount}` : ''}
        </button>
      )}

      {/* Vamshavali mode: directional expand pills */}
      {showVamshavaliPills && vamshavaliExpandInfo && (
        <VamshavaliExpandPills
          expandInfo={vamshavaliExpandInfo}
          hasParents={hasParents}
          hasSiblings={hasSiblings}
          hasChildren={hasChildren}
          parentsHidden={parentsHidden}
          siblingsHidden={siblingsHidden}
          childrenHidden={childrenHidden}
          onToggleParents={onToggleParents}
          onToggleSiblings={onToggleSiblings}
          onToggleChildren={onToggleChildren}
        />
      )}
    </div>
  );
});

PersonCardInner.displayName = 'PersonCard';

export const PersonCard = memo(PersonCardInner, (prevProps, nextProps) => {
  return (
    prevProps.person.personId === nextProps.person.personId &&
    prevProps.person.isDeleted === nextProps.person.isDeleted &&
    prevProps.person.isHomePerson === nextProps.person.isHomePerson &&
    prevProps.person.updatedAt === nextProps.person.updatedAt &&
    prevProps.person.profilePhotoUrl === nextProps.person.profilePhotoUrl &&
    prevProps.person.gender === nextProps.person.gender &&
    prevProps.person.isLiving === nextProps.person.isLiving &&
    prevProps.person.deathDate === nextProps.person.deathDate &&
    prevProps.x === nextProps.x &&
    prevProps.y === nextProps.y &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isFocused === nextProps.isFocused &&
    prevProps.isSearchHighlight === nextProps.isSearchHighlight &&
    prevProps.isAdvancedSearchMatch === nextProps.isAdvancedSearchMatch &&
    prevProps.hasAdvancedSearchActive === nextProps.hasAdvancedSearchActive &&
    prevProps.isHighlighted === nextProps.isHighlighted &&
    prevProps.isRecentlyAdded === nextProps.isRecentlyAdded &&
    prevProps.parentsHidden === nextProps.parentsHidden &&
    prevProps.childrenHidden === nextProps.childrenHidden &&
    prevProps.siblingsHidden === nextProps.siblingsHidden &&
    prevProps.isInLaw === nextProps.isInLaw &&
    prevProps.showParentNavIcons === nextProps.showParentNavIcons &&
    prevProps.spouseList === nextProps.spouseList &&
    prevProps.isExpandable === nextProps.isExpandable &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.expansionMemberCount === nextProps.expansionMemberCount &&
    prevProps.showVamshavaliPills === nextProps.showVamshavaliPills &&
    prevProps.isVamshavaliNewNode === nextProps.isVamshavaliNewNode &&
    prevProps.claimStatus === nextProps.claimStatus &&
    prevProps.isClaimedByMe === nextProps.isClaimedByMe &&
    prevProps.hasPendingCR === nextProps.hasPendingCR &&
    prevProps.readOnly === nextProps.readOnly &&
    prevProps.isInvitedHighlight === nextProps.isInvitedHighlight &&
    prevProps.vamshavaliExpandInfo?.hiddenParentCount === nextProps.vamshavaliExpandInfo?.hiddenParentCount &&
    prevProps.vamshavaliExpandInfo?.hiddenSiblingCount === nextProps.vamshavaliExpandInfo?.hiddenSiblingCount &&
    prevProps.vamshavaliExpandInfo?.hiddenChildrenCount === nextProps.vamshavaliExpandInfo?.hiddenChildrenCount
  );
});
