/**
 * Responsive Layout Constants for Family Tree
 *
 * This file defines breakpoint-based layout configurations for different screen sizes.
 * The family tree adapts its card sizes, spacing, and button positioning based on viewport width.
 *
 * Breakpoints:
 * - Mobile (0-767px): Compact layout, stacked buttons, smaller cards
 * - Tablet (768-1023px): Medium layout, side buttons enabled, moderate spacing
 * - Desktop (1024px+): Full layout, optimal spacing, all features enabled
 */

export interface ResponsiveBreakpoint {
  /** Minimum viewport width for this breakpoint */
  minWidth: number;

  /** Person card width in pixels */
  personWidth: number;

  /** Person card height in pixels */
  personHeight: number;

  /** Vertical gap between generations in pixels */
  generationGap: number;

  /** Horizontal spacing between nodes in pixels */
  nodeSpacing: number;

  /** Horizontal gap between spouses in pixels */
  spouseGap: number;

  /** Gap between different family units (couples or solos) in the same row */
  familyUnitGap: number;

  /** Text size class for Tailwind */
  textSize: 'xs' | 'sm' | 'base';

  /** Whether to show side buttons (Add Spouse, Delete) */
  showSideButtons: boolean;

  /** Minimum button size for touch targets */
  minButtonSize: number;

  /** Photo height within person card */
  photoHeight: number;

  /** Info section height within person card */
  infoHeight: number;
}

/**
 * Responsive breakpoint configurations
 * Ordered from largest to smallest for efficient lookup
 */
export const RESPONSIVE_BREAKPOINTS: ResponsiveBreakpoint[] = [
  // Desktop (1024px+)
  // Full professional layout with Ancestry-style proportional spacing
  {
    minWidth: 1024,
    personWidth: 180,
    personHeight: 240,
    generationGap: 120,      // Tighter vertical spacing (0.67× card height)
    nodeSpacing: 60,          // Sibling spacing — 1.71× spouse gap for clear visual distinction
    spouseGap: 35,            // Spouse gap — partners clearly paired (0.19× card width)
    familyUnitGap: 100,       // Between unrelated family groups only (0.56× card width)
    textSize: 'sm',          // 14px - comfortable reading
    showSideButtons: true,   // Full button layout
    minButtonSize: 36,       // Standard click target
    photoHeight: 144,        // 60% of card
    infoHeight: 96           // 40% of card
  },

  // Tablet (768px - 1023px)
  // Balanced layout for medium screens
  {
    minWidth: 768,
    personWidth: 160,
    personHeight: 220,
    generationGap: 150,      // Compact vertical spacing
    nodeSpacing: 50,         // Tight horizontal spacing
    spouseGap: 40,           // Near-touching spouses
    familyUnitGap: 50,       // Gap between family units
    textSize: 'sm',          // 14px - still readable at arm's length
    showSideButtons: true,   // Side buttons fit comfortably
    minButtonSize: 44,       // Touch-friendly target
    photoHeight: 132,        // 60% of card
    infoHeight: 88           // 40% of card
  },

  // Mobile (320px - 767px)
  // Compact layout optimized for small screens
  {
    minWidth: 0,
    personWidth: 140,
    personHeight: 190,
    generationGap: 120,      // Compact spacing for small screens
    nodeSpacing: 40,         // Minimal horizontal spacing
    spouseGap: 30,           // Near-touching spouses
    familyUnitGap: 40,       // Gap between family units
    textSize: 'xs',          // 12px - smaller but still legible
    showSideButtons: false,  // Stack all buttons vertically
    minButtonSize: 44,       // iOS/Android touch target minimum
    photoHeight: 114,        // 60% of card
    infoHeight: 76           // 40% of card
  }
];

/**
 * Determines the appropriate breakpoint configuration for a given viewport width
 *
 * @param viewportWidth - Current viewport width in pixels
 * @returns The matching ResponsiveBreakpoint configuration
 *
 * @example
 * const breakpoint = getBreakpoint(window.innerWidth);
 * console.log(breakpoint.personWidth); // 180, 160, or 140 depending on width
 */
export function getBreakpoint(viewportWidth: number): ResponsiveBreakpoint {
  // Iterate from largest to smallest breakpoint
  for (let i = 0; i < RESPONSIVE_BREAKPOINTS.length; i++) {
    if (viewportWidth >= RESPONSIVE_BREAKPOINTS[i].minWidth) {
      return RESPONSIVE_BREAKPOINTS[i];
    }
  }

  // Fallback to mobile (smallest) breakpoint
  return RESPONSIVE_BREAKPOINTS[RESPONSIVE_BREAKPOINTS.length - 1];
}

/**
 * Calculates responsive zoom level based on viewport and tree size
 * Ensures the tree fits comfortably on screen at initial load
 *
 * @param treeWidth - Total width of the tree layout in pixels
 * @param treeHeight - Total height of the tree layout in pixels
 * @param viewportWidth - Current viewport width in pixels
 * @param viewportHeight - Current viewport height in pixels
 * @param padding - Padding around tree in pixels (default: 100)
 * @returns Optimal zoom level (clamped between 0.3 and 1.0)
 */
export function calculateResponsiveZoom(
  treeWidth: number,
  treeHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  padding: number = 100
): number {
  const availableWidth = viewportWidth - padding * 2;
  const availableHeight = viewportHeight - padding * 2;

  const scaleX = availableWidth / treeWidth;
  const scaleY = availableHeight / treeHeight;

  // Use the smaller scale to ensure tree fits in both dimensions
  const optimalZoom = Math.min(scaleX, scaleY);

  // Clamp between 0.3x (30%) and 1.0x (100%) - never zoom in beyond actual size
  return Math.max(0.3, Math.min(1.0, optimalZoom));
}

/**
 * Checks if the viewport is in mobile mode
 * Useful for conditional rendering and touch gesture detection
 */
export function isMobileViewport(): boolean {
  return window.innerWidth < 768;
}

/**
 * Checks if the viewport is in tablet mode
 */
export function isTabletViewport(): boolean {
  return window.innerWidth >= 768 && window.innerWidth < 1024;
}

/**
 * Checks if the viewport is in desktop mode
 */
export function isDesktopViewport(): boolean {
  return window.innerWidth >= 1024;
}

/**
 * Debounces a function call to prevent excessive execution
 * Useful for resize event handlers
 *
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return function(this: unknown, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}
