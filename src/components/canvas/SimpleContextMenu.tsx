/**
 * SimpleContextMenu - Custom context menu that works with absolutely positioned elements
 *
 * A lightweight alternative to Radix UI Context Menu that doesn't interfere
 * with absolute positioning.
 *
 * Supports both right-click (desktop) and long-press (touch devices).
 * On mobile, renders as a bottom sheet instead of a positioned dropdown.
 * On mobile, submenu opens inline (below parent item) instead of to the right.
 * Viewport-aware: repositions if menu would overflow screen bounds.
 *
 * Features:
 * - Tiered context menu (Primary, Secondary, More..., Destructive)
 * - Mobile bottom sheet with drag handle
 * - Long-press visual feedback at 200ms
 * - Mobile collapse toggles for parents/siblings/children
 */

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { UserPlus, Heart, Baby, Users, Eye, Trash2, HeartCrack, UserCheck, Crown, ChevronDown, Clock, Image, Zap, BookOpen, Tag, MessageCircle, MoreHorizontal, EyeOff, Mail, GitBranch } from 'lucide-react';
import type { Person } from '@/types';

const LONG_PRESS_DURATION = 350; // ms

export interface SimpleContextMenuProps {
  person: Person;
  children: ReactNode;
  onAddParent?: () => void;
  onAddSpouse?: () => void;
  onMarryExisting?: () => void;  // Marry to existing person in tree
  onAddChild?: () => void;
  onAddSibling?: () => void;
  onAddGrandparent?: () => void;
  onAddUncleAunt?: () => void;
  onAddCousin?: () => void;
  onEndMarriage?: () => void;
  hasSpouse?: boolean;  // Whether the person has an active marriage
  onEdit?: () => void;
  onViewRelationships?: () => void;
  onFocus?: () => void;
  onViewHistory?: () => void;
  onOpenGallery?: () => void;
  onAddMemory?: () => void;
  onQuickAdd?: () => void;
  onManageTags?: () => void;
  onViewLifeStory?: () => void;
  onViewComments?: () => void;
  onViewProfile?: () => void;
  onDelete?: () => void;
  onGhostAdd?: () => void;
  // Mobile collapse toggles (Phase 1B)
  onToggleParents?: () => void;
  onToggleSiblings?: () => void;
  onToggleChildren?: () => void;
  parentsHidden?: boolean;
  siblingsHidden?: boolean;
  childrenHidden?: boolean;
  hasParents?: boolean;
  hasSiblings?: boolean;
  hasChildren?: boolean;
  // Additional mobile actions
  onInviteFamily?: () => void;
  onViewTheirTree?: () => void;
  // Branch privacy
  onSetBranchPrivacy?: () => void;
  // Open the Add Relative side panel (same as + button)
  onOpenAddRelativePanel?: () => void;
}

export function SimpleContextMenu({
  person,
  children,
  onAddParent,
  onAddSpouse,
  onMarryExisting,
  onAddChild,
  onAddSibling,
  onAddGrandparent,
  onAddUncleAunt,
  onAddCousin,
  onEndMarriage,
  hasSpouse,
  onEdit: _onEdit,
  onViewRelationships,
  onFocus: _onFocus,
  onViewHistory,
  onOpenGallery,
  onAddMemory,
  onQuickAdd,
  onManageTags,
  onViewLifeStory,
  onViewComments,
  onViewProfile: _onViewProfile,
  onDelete,
  onGhostAdd,
  onToggleParents,
  onToggleSiblings,
  onToggleChildren,
  parentsHidden,
  siblingsHidden,
  childrenHidden,
  hasParents,
  hasSiblings,
  hasChildren,
  onInviteFamily,
  onViewTheirTree,
  onSetBranchPrivacy,
  onOpenAddRelativePanel,
}: SimpleContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [_showSubMenu, setShowSubMenu] = useState(false);
  const [showMoreItems, setShowMoreItems] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [longPressHint, setLongPressHint] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const openMenu = useCallback((x: number, y: number) => {
    // Viewport-aware positioning
    const menuWidth = 240;
    const menuHeight = 620; // full menu with all items
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let adjX = x;
    let adjY = y;

    if (x + menuWidth > vw) adjX = vw - menuWidth - 8;
    if (y + menuHeight > vh) adjY = vh - menuHeight - 8;
    if (adjX < 8) adjX = 8;
    if (adjY < 8) adjY = 8;

    setPosition({ x: adjX, y: adjY });
    setIsOpen(true);
    setShowSubMenu(false);
    setShowMoreItems(false);
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Do not show context menu for ghost/placeholder nodes
    if (person?.isDeleted) {
      return;
    }
    // Open the same Add Relative panel that the + button opens
    if (onOpenAddRelativePanel) {
      onOpenAddRelativePanel();
      return;
    }
    openMenu(e.clientX, e.clientY);
  };
 
  // Long-press handlers for touch devices
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (person?.isDeleted) return;

    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
 
    // Start hint timer at 200ms for visual feedback
    longPressHintTimerRef.current = setTimeout(() => {
      setLongPressHint(true);
      longPressHintTimerRef.current = null;
    }, 200);
 
    longPressTimerRef.current = setTimeout(() => {
      if (onOpenAddRelativePanel) {
        onOpenAddRelativePanel();
      } else if (touchStartPosRef.current) {
        openMenu(touchStartPosRef.current.x, touchStartPosRef.current.y);
      }
      longPressTimerRef.current = null;
      setLongPressHint(false);
    }, LONG_PRESS_DURATION);
  }, [openMenu, person?.isDeleted, onOpenAddRelativePanel]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!longPressTimerRef.current || !touchStartPosRef.current) return;

    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);

    // Cancel long-press if finger moved more than 10px
    if (dx > 10 || dy > 10) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
      if (longPressHintTimerRef.current) {
        clearTimeout(longPressHintTimerRef.current);
        longPressHintTimerRef.current = null;
      }
      setLongPressHint(false);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (longPressHintTimerRef.current) {
      clearTimeout(longPressHintTimerRef.current);
      longPressHintTimerRef.current = null;
    }
    setLongPressHint(false);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setShowSubMenu(false);
    setShowMoreItems(false);
  };

  const handleItemClick = (callback?: () => void) => {
    if (callback) callback();
    handleClose();
  };

  // Adjust position after menu renders to ensure it's fully visible (desktop only)
  useEffect(() => {
    if (!isOpen || !menuRef.current || isMobile) return;
    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    let newX = position.x;
    let newY = position.y;
    if (rect.bottom > vh - 8) newY = Math.max(8, vh - rect.height - 8);
    if (rect.right > vw - 8) newX = Math.max(8, vw - rect.width - 8);
    if (newX !== position.x || newY !== position.y) {
      setPosition({ x: newX, y: newY });
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };

    const handleTouchOutside = (e: TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleTouchOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleTouchOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      if (longPressHintTimerRef.current) {
        clearTimeout(longPressHintTimerRef.current);
      }
    };
  }, []);

  // Min height for menu items: 48px on mobile, 44px on desktop
  const itemMinH = isMobile ? 'min-h-[48px]' : 'min-h-[44px]';

  const submenuContent = (
    <>
      {/* Immediate Family */}
      <div className="px-3 py-1 text-xs font-semibold text-[#8B7355] dark:text-[#666] uppercase tracking-wider">Immediate</div>
      <button
        onClick={() => handleItemClick(onAddParent)}
        className={`w-full px-3 py-2 text-left text-sm hover:bg-black/[0.03] dark:hover:bg-white/[0.04] flex items-center gap-2 ${itemMinH}`}
      >
        <UserPlus className="h-4 w-4" />
        Add Parent
      </button>
      <button
        onClick={() => handleItemClick(onAddSpouse)}
        className={`w-full px-3 py-2 text-left text-sm hover:bg-black/[0.03] dark:hover:bg-white/[0.04] flex items-center gap-2 ${itemMinH}`}
      >
        <Heart className="h-4 w-4" />
        Add Spouse
      </button>
      <button
        onClick={() => handleItemClick(onMarryExisting)}
        className={`w-full px-3 py-2 text-left text-sm hover:bg-black/[0.03] dark:hover:bg-white/[0.04] flex items-center gap-2 ${itemMinH}`}
      >
        <Heart className="h-4 w-4" />
        Marry to Existing Person
      </button>
      <button
        onClick={() => handleItemClick(onAddChild)}
        className={`w-full px-3 py-2 text-left text-sm hover:bg-black/[0.03] dark:hover:bg-white/[0.04] flex items-center gap-2 ${itemMinH}`}
      >
        <Baby className="h-4 w-4" />
        Add Child
      </button>
      <button
        onClick={() => handleItemClick(onAddSibling)}
        className={`w-full px-3 py-2 text-left text-sm hover:bg-black/[0.03] dark:hover:bg-white/[0.04] flex items-center gap-2 ${itemMinH}`}
      >
        <Users className="h-4 w-4" />
        Add Sibling
      </button>

      {/* More relatives sub-header */}
      <div className="h-px bg-gray-200 my-1" />
      <div className="px-3 py-1 text-xs font-semibold text-[#8B7355] dark:text-[#666] uppercase tracking-wider">More relatives...</div>
      <button
        onClick={() => handleItemClick(onAddGrandparent)}
        className={`w-full px-3 py-2 text-left text-sm hover:bg-black/[0.03] dark:hover:bg-white/[0.04] flex items-center gap-2 ${itemMinH}`}
      >
        <Crown className="h-4 w-4" />
        Add Grandparent
      </button>
      <button
        onClick={() => handleItemClick(onAddUncleAunt)}
        className={`w-full px-3 py-2 text-left text-sm hover:bg-black/[0.03] dark:hover:bg-white/[0.04] flex items-center gap-2 ${itemMinH}`}
      >
        <UserPlus className="h-4 w-4" />
        Add Uncle/Aunt
      </button>
      <button
        onClick={() => handleItemClick(onAddCousin)}
        className={`w-full px-3 py-2 text-left text-sm hover:bg-black/[0.03] dark:hover:bg-white/[0.04] flex items-center gap-2 ${itemMinH}`}
      >
        <Users className="h-4 w-4" />
        Add Cousin
      </button>

    </>
  );

  // Person display name
  const personName = person ? [person.firstName, person.lastName].filter(n => n && n !== 'undefined').join(' ').trim() || 'Unknown' : 'Unknown';

  // ---- Shared menu items (used by both desktop and mobile) ----

  const _renderMobileCollapseToggles = () => {
    if (!isMobile) return null;
    const toggles = [];
    if (hasParents && onToggleParents) {
      toggles.push(
        <button
          key="toggle-parents"
          onClick={() => handleItemClick(onToggleParents)}
          className="w-full px-3 py-2 text-left text-sm hover:bg-black/[0.03] dark:hover:bg-white/[0.04] flex items-center gap-2 min-h-[48px]"
        >
          {parentsHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          {parentsHidden ? 'Show Parents' : 'Hide Parents'}
        </button>
      );
    }
    if (hasChildren && onToggleChildren) {
      toggles.push(
        <button
          key="toggle-children"
          onClick={() => handleItemClick(onToggleChildren)}
          className="w-full px-3 py-2 text-left text-sm hover:bg-black/[0.03] dark:hover:bg-white/[0.04] flex items-center gap-2 min-h-[48px]"
        >
          {childrenHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          {childrenHidden ? 'Show Children' : 'Hide Children'}
        </button>
      );
    }
    if (hasSiblings && onToggleSiblings) {
      toggles.push(
        <button
          key="toggle-siblings"
          onClick={() => handleItemClick(onToggleSiblings)}
          className="w-full px-3 py-2 text-left text-sm hover:bg-black/[0.03] dark:hover:bg-white/[0.04] flex items-center gap-2 min-h-[48px]"
        >
          {siblingsHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          {siblingsHidden ? 'Show Siblings' : 'Hide Siblings'}
        </button>
      );
    }
    if (toggles.length === 0) return null;
    return (
      <>
        {toggles}
        <div className="h-px bg-gray-200 my-1" />
      </>
    );
  };

  const renderGhostMenu = () => (
    <button
      onClick={() => handleItemClick(onGhostAdd)}
      className={`w-full px-3 py-2 text-left text-sm hover:bg-[#E8EDFF] flex items-center gap-2 text-[#2F3E8F] font-medium ${itemMinH}`}
    >
      <UserPlus className="h-4 w-4" />
      Add Person Here
    </button>
  );

  const renderTier1Primary = () => (
    <>
      {/* Add Relatives — shown directly, no submenu */}
      {submenuContent}
    </>
  );

  const _renderTier2Secondary = () => (
    <>
      <div className="h-px bg-gray-200 my-1" />

      {/* Quick Add Family */}
      <button
        onClick={() => handleItemClick(onQuickAdd)}
        className={`w-full px-3 py-2 text-left text-sm hover:bg-black/[0.03] dark:hover:bg-white/[0.04] flex items-center gap-2 ${itemMinH}`}
      >
        <Zap className="h-4 w-4 text-[#2F3E8F]" />
        Quick Add Family
      </button>

      {/* Media Gallery */}
      <button
        onClick={() => handleItemClick(onOpenGallery)}
        className={`w-full px-3 py-2 text-left text-sm hover:bg-black/[0.03] dark:hover:bg-white/[0.04] flex items-center gap-2 ${itemMinH}`}
      >
        <Image className="h-4 w-4" />
        Media Gallery
      </button>

      {/* Add Memory */}
      <button
        onClick={() => handleItemClick(onAddMemory)}
        className={`w-full px-3 py-2 text-left text-sm hover:bg-black/[0.03] dark:hover:bg-white/[0.04] flex items-center gap-2 ${itemMinH}`}
      >
        <BookOpen className="h-4 w-4" />
        Add Memory
      </button>

      {/* Invite to Claim — person-specific invite (desktop + mobile) */}
      {onInviteFamily && (
        <button
          onClick={() => handleItemClick(onInviteFamily)}
          className={`w-full px-3 py-2 text-left text-sm hover:bg-black/[0.03] dark:hover:bg-white/[0.04] flex items-center gap-2 ${isMobile ? 'min-h-[48px]' : ''}`}
        >
          <Mail className="h-4 w-4 text-[#C2A46D]" />
          <span>Invite <span className="font-medium">{person.firstName}</span> to join</span>
        </button>
      )}
      {isMobile && onViewTheirTree && (
        <button
          onClick={() => handleItemClick(onViewTheirTree)}
          className="w-full px-3 py-2 text-left text-sm hover:bg-black/[0.03] dark:hover:bg-white/[0.04] flex items-center gap-2 min-h-[48px]"
        >
          <GitBranch className="h-4 w-4" />
          View Their Tree
        </button>
      )}
    </>
  );

  const _renderTier3More = () => (
    <>
      <div className="h-px bg-gray-200 my-1" />

      {/* More... toggle button */}
      <button
        onClick={() => setShowMoreItems(!showMoreItems)}
        className={`w-full px-3 py-2 text-left text-sm hover:bg-black/[0.03] dark:hover:bg-white/[0.04] flex items-center gap-2 ${itemMinH} text-gray-500`}
      >
        <MoreHorizontal className="h-4 w-4" />
        More...
        <span className={`ml-auto transition-transform duration-200 ${showMoreItems ? 'rotate-180' : ''}`}>
          <ChevronDown className="h-3 w-3" />
        </span>
      </button>

      {showMoreItems && (
        <div className="bg-gray-50/50">
          <button
            onClick={() => handleItemClick(onViewRelationships)}
            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${itemMinH}`}
          >
            <Eye className="h-4 w-4" />
            View Relationships
          </button>
          <button
            onClick={() => handleItemClick(onViewHistory)}
            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${itemMinH}`}
          >
            <Clock className="h-4 w-4" />
            View History
          </button>
          <button
            onClick={() => handleItemClick(onManageTags)}
            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${itemMinH}`}
          >
            <Tag className="h-4 w-4" />
            Manage Tags
          </button>
          <button
            onClick={() => handleItemClick(onViewLifeStory)}
            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${itemMinH}`}
          >
            <BookOpen className="h-4 w-4" />
            View LifeStory
          </button>
          <button
            onClick={() => handleItemClick(onViewComments)}
            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${itemMinH}`}
          >
            <MessageCircle className="h-4 w-4" />
            Comments
          </button>
        </div>
      )}
    </>
  );

  const _renderTier4Destructive = () => (
    <>
      <div className="h-px bg-gray-200 my-1" />

      {/* End Marriage - only show if person has spouse */}
      {hasSpouse && onEndMarriage && (
        <button
          onClick={() => handleItemClick(onEndMarriage)}
          className={`w-full px-3 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2 text-red-500 ${itemMinH}`}
        >
          <HeartCrack className="h-4 w-4" />
          End Marriage
        </button>
      )}

      {onSetBranchPrivacy && (
        <button
          onClick={() => handleItemClick(onSetBranchPrivacy)}
          className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${itemMinH}`}
        >
          <EyeOff className="h-4 w-4" />
          Set Branch Privacy
        </button>
      )}

      <button
        onClick={() => handleItemClick(onDelete)}
        className={`w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2 ${itemMinH}`}
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>
    </>
  );

  return (
    <>
      <div
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={longPressHint ? 'ring-2 ring-[#2F3E8F]/40 rounded-xl transition-all duration-150' : ''}
      >
        {children}
      </div>

      {isOpen && (isMobile ? (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/30 z-[9998]"
            onClick={handleClose}
          />

          {/* Bottom sheet */}
          <div
            ref={menuRef}
            role="menu"
            aria-label={`Actions for ${personName}`}
            className="fixed inset-x-0 bottom-0 z-[9999] bg-white/95 backdrop-blur-sm rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.08)] border-t border-gray-200 py-2 max-h-[80vh] overflow-y-auto"
            style={{
              animation: 'slideUp 0.25s ease-out',
            }}
          >
            {/* Drag handle */}
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-2" />

            {/* Person header */}
            <div className="px-4 py-2 border-b border-[#E2E8F0]/60 dark:border-[#2a2a2a] mb-1">
              <p className="text-sm font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">{personName}</p>
            </div>

            {/* Ghost nodes get limited menu; normal nodes get full tiers */}
            {person.isDeleted ? renderGhostMenu() : renderTier1Primary()}
          </div>

          {/* Slide-up animation */}
          <style>{`
            @keyframes slideUp {
              from {
                transform: translateY(100%);
              }
              to {
                transform: translateY(0);
              }
            }
          `}</style>
        </>
      ) : (
        /* Desktop dropdown */
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Actions for ${personName}`}
          className="fixed z-[9999] bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-md rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-[#E2E8F0]/60 dark:border-[#2a2a2a] py-1 min-w-[240px] max-h-[80vh] overflow-y-auto"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
          }}
        >
          {/* Ghost nodes get limited menu; normal nodes get full tiers */}
          {person.isDeleted ? renderGhostMenu() : renderTier1Primary()}
        </div>
      ))}
    </>
  );
}
