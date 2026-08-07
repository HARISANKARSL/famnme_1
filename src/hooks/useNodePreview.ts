/**
 * useNodePreview — manages hover (desktop) and tap (mobile) preview card interactions.
 *
 * - Desktop: 200ms hover delay before showing preview, dismiss on mouseLeave.
 * - Mobile: tap toggles preview, tap outside dismisses.
 * - Auto-positions to avoid viewport overflow.
 * - Dismisses on pan, zoom, Escape, or context menu.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

const HOVER_DELAY_MS = 200;
const GAP = 8; // px gap between card and preview
const PREVIEW_WIDTH = 260;
const PREVIEW_HEIGHT_ESTIMATE = 200; // conservative estimate for positioning

export interface NodePreviewState {
  previewPersonId: string | null;
  previewPosition: { top: number; left: number } | null;
  handleMouseEnter: (personId: string, cardElement: HTMLElement) => void;
  handleMouseLeave: () => void;
  handlePreviewMouseEnter: () => void;
  handlePreviewMouseLeave: () => void;
  handleTap: (personId: string, cardElement: HTMLElement) => void;
  dismissPreview: () => void;
}

interface UseNodePreviewOptions {
  isTouchDevice: boolean;
  /** Called to check if panning is active — if so, suppress preview */
  isPanning?: boolean;
}

export function useNodePreview({ isTouchDevice, isPanning }: UseNodePreviewOptions): NodePreviewState {
  const [previewPersonId, setPreviewPersonId] = useState<string | null>(null);
  const [previewPosition, setPreviewPosition] = useState<{ top: number; left: number } | null>(null);

  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOverPreviewRef = useRef(false);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const clearLeaveTimer = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, []);

  const computePosition = useCallback((cardElement: HTMLElement): { top: number; left: number } => {
    const rect = cardElement.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left: number;
    let top: number;

    // Prefer right side of card
    if (rect.right + GAP + PREVIEW_WIDTH < vw) {
      left = rect.right + GAP;
    } else if (rect.left - GAP - PREVIEW_WIDTH > 0) {
      // Flip to left
      left = rect.left - GAP - PREVIEW_WIDTH;
    } else {
      // Center horizontally if no room on either side
      left = Math.max(8, (vw - PREVIEW_WIDTH) / 2);
    }

    // Prefer aligned to top of card
    top = rect.top;
    if (top + PREVIEW_HEIGHT_ESTIMATE > vh - 16) {
      // Flip above or adjust up
      top = Math.max(16, vh - PREVIEW_HEIGHT_ESTIMATE - 16);
    }
    if (top < 16) top = 16;

    return { top, left };
  }, []);

  const dismissPreview = useCallback(() => {
    clearHoverTimer();
    clearLeaveTimer();
    isOverPreviewRef.current = false;
    setPreviewPersonId(null);
    setPreviewPosition(null);
  }, [clearHoverTimer, clearLeaveTimer]);

  const handleMouseEnter = useCallback((personId: string, cardElement: HTMLElement) => {
    if (isTouchDevice) return;
    clearLeaveTimer();

    // If already showing this person's preview, keep it
    if (previewPersonId === personId) return;

    clearHoverTimer();
    hoverTimerRef.current = setTimeout(() => {
      const pos = computePosition(cardElement);
      setPreviewPersonId(personId);
      setPreviewPosition(pos);
    }, HOVER_DELAY_MS);
  }, [isTouchDevice, previewPersonId, clearHoverTimer, clearLeaveTimer, computePosition]);

  const handleMouseLeave = useCallback(() => {
    if (isTouchDevice) return;
    clearHoverTimer();

    // Small delay before dismissing to allow mouse to move to the preview card
    leaveTimerRef.current = setTimeout(() => {
      if (!isOverPreviewRef.current) {
        dismissPreview();
      }
    }, 100);
  }, [isTouchDevice, clearHoverTimer, dismissPreview]);

  const handlePreviewMouseEnter = useCallback(() => {
    isOverPreviewRef.current = true;
    clearLeaveTimer();
  }, [clearLeaveTimer]);

  const handlePreviewMouseLeave = useCallback(() => {
    isOverPreviewRef.current = false;
    // Small delay so the user can move back to the card
    leaveTimerRef.current = setTimeout(() => {
      if (!isOverPreviewRef.current) {
        dismissPreview();
      }
    }, 150);
  }, [clearLeaveTimer, dismissPreview]);

  const handleTap = useCallback((personId: string, cardElement: HTMLElement) => {
    if (!isTouchDevice) return;

    if (previewPersonId === personId) {
      // Toggle off
      dismissPreview();
    } else {
      const pos = computePosition(cardElement);
      setPreviewPersonId(personId);
      setPreviewPosition(pos);
    }
  }, [isTouchDevice, previewPersonId, dismissPreview, computePosition]);

  // Dismiss on pan
  useEffect(() => {
    if (isPanning && previewPersonId) {
      dismissPreview();
    }
  }, [isPanning, previewPersonId, dismissPreview]);

  // Dismiss on Escape key
  useEffect(() => {
    if (!previewPersonId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissPreview();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewPersonId, dismissPreview]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearHoverTimer();
      clearLeaveTimer();
    };
  }, [clearHoverTimer, clearLeaveTimer]);

  return {
    previewPersonId,
    previewPosition,
    handleMouseEnter,
    handleMouseLeave,
    handlePreviewMouseEnter,
    handlePreviewMouseLeave,
    handleTap,
    dismissPreview,
  };
}
