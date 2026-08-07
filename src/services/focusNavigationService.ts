/**
 * Focus Navigation Service
 *
 * Manages navigation history for "View their family tree" feature.
 * Allows navigating between different focus persons and going back.
 */

export type FocusHistoryEntry = {
  personId: string;
  personName: string;
};

export type FocusNavigationState = {
  history: FocusHistoryEntry[];
  currentIndex: number;
};

/**
 * Create initial navigation state with a home person
 */
export function createInitialNavigation(
  homePersonId: string,
  homePersonName: string
): FocusNavigationState {
  return {
    history: [{ personId: homePersonId, personName: homePersonName }],
    currentIndex: 0,
  };
}

/**
 * Navigate to a new focus person. Truncates any forward history.
 */
export function navigateToFocus(
  state: FocusNavigationState,
  personId: string,
  personName: string
): FocusNavigationState {
  // If clicked person already exists anywhere in the breadcrumb trail, remove everything after them
  const existingIndex = state.history.findIndex(entry => entry.personId === personId);
  if (existingIndex !== -1) {
    const newHistory = state.history.slice(0, existingIndex + 1);
    return {
      history: newHistory,
      currentIndex: existingIndex,
    };
  }

  // Truncate forward history and append
  const newHistory = [
    ...state.history.slice(0, state.currentIndex + 1),
    { personId, personName },
  ];

  return {
    history: newHistory,
    currentIndex: newHistory.length - 1,
  };
}

/**
 * Navigate back in history. Returns null if already at start.
 */
export function navigateBack(
  state: FocusNavigationState
): FocusNavigationState | null {
  if (state.currentIndex <= 0) return null;
  return {
    ...state,
    currentIndex: state.currentIndex - 1,
  };
}

/**
 * Navigate to home (index 0)
 */
export function navigateHome(
  state: FocusNavigationState
): FocusNavigationState {
  return {
    ...state,
    currentIndex: 0,
  };
}

/**
 * Get the current focus person ID
 */
export function getCurrentFocusId(state: FocusNavigationState): string | null {
  return state.history[state.currentIndex]?.personId ?? null;
}

/**
 * Get breadcrumb entries (history up to current index)
 */
export function getBreadcrumbs(state: FocusNavigationState): FocusHistoryEntry[] {
  return state.history.slice(0, state.currentIndex + 1);
}

/**
 * Check if we can go back
 */
export function canGoBack(state: FocusNavigationState): boolean {
  return state.currentIndex > 0;
}

/**
 * Check if we're at home
 */
export function isAtHome(state: FocusNavigationState): boolean {
  return state.currentIndex === 0;
}
