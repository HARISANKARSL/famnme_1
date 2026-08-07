/**
 * Tutorial Store — manages two guided tours (Dashboard + Tree View).
 *
 * Each tour persists independently in localStorage.
 * Auto-launches at the appropriate moment for first-time users.
 */

import { create } from 'zustand';
import {
  DASHBOARD_TUTORIAL_STEPS,
  TREE_TUTORIAL_STEPS,
  type TutorialStep,
  type TutorialId,
} from '@/data/tutorialSteps';

const STORAGE_KEYS: Record<TutorialId, string> = {
  dashboard: 'dashboard-tutorial-completed',
  tree: 'tree-tutorial-completed',
};

const STEP_MAP: Record<TutorialId, TutorialStep[]> = {
  dashboard: DASHBOARD_TUTORIAL_STEPS,
  tree: TREE_TUTORIAL_STEPS,
};

interface TutorialState {
  isActive: boolean;
  currentStep: number;
  tutorialId: TutorialId;
  steps: TutorialStep[];

  shouldAutoLaunch: (id: TutorialId) => boolean;
  startTutorial: (id: TutorialId) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
}

export const useTutorialStore = create<TutorialState>((set, get) => ({
  isActive: false,
  currentStep: 0,
  tutorialId: 'dashboard',
  steps: DASHBOARD_TUTORIAL_STEPS,

  shouldAutoLaunch: (id: TutorialId) => {
    try {
      return !localStorage.getItem(STORAGE_KEYS[id]);
    } catch {
      return false;
    }
  },

  startTutorial: (id: TutorialId) => {
    set({
      isActive: true,
      currentStep: 0,
      tutorialId: id,
      steps: STEP_MAP[id],
    });
  },

  nextStep: () => {
    const { currentStep, steps } = get();
    if (currentStep < steps.length - 1) {
      set({ currentStep: currentStep + 1 });
    } else {
      get().completeTutorial();
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 });
    }
  },

  skipTutorial: () => {
    const { tutorialId } = get();
    try { localStorage.setItem(STORAGE_KEYS[tutorialId], new Date().toISOString()); } catch {}
    set({ isActive: false, currentStep: 0 });
  },

  completeTutorial: () => {
    const { tutorialId } = get();
    try { localStorage.setItem(STORAGE_KEYS[tutorialId], new Date().toISOString()); } catch {}
    set({ isActive: false, currentStep: 0 });
  },
}));
