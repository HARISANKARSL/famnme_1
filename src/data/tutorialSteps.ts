/**
 * Tutorial step definitions for two guided tours:
 * 1. Dashboard Tour (10 steps) — auto-launches on first login
 * 2. Tree View Tour (8 steps) — auto-launches when user first opens tree
 */

export type TutorialId = 'dashboard' | 'tree';

export interface TutorialStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

export const DASHBOARD_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    targetSelector: '[data-tutorial="sidebar-home"]',
    title: 'Welcome to FamNme!',
    description: 'This is your dashboard — your starting point every time you open the app. Let us walk you through the key features.',
    position: 'right',
  },
  {
    id: 'tree-overview',
    targetSelector: '[data-tutorial="widget-overview"]',
    title: 'Your Family at a Glance',
    description: 'See your tree stats — total members, generations, marriages, and living/deceased counts. Click "View Tree" to see the full family tree.',
    position: 'bottom',
  },
  {
    id: 'quick-actions',
    targetSelector: '[data-tutorial="widget-actions"]',
    title: 'Quick Actions',
    description: 'Jump to common tasks: view your tree, add memories, explore migration maps, or invite family members to collaborate.',
    position: 'bottom',
  },
  {
    id: 'add-memory',
    targetSelector: '[data-tutorial="widget-memory"]',
    title: 'Capture Family Stories',
    description: "Get daily prompts to record family memories, stories, and photos — personalized to your family's festivals and cultural traditions.",
    position: 'bottom',
  },
  {
    id: 'timeline',
    targetSelector: '[data-tutorial="widget-timeline"]',
    title: 'Your Family Timeline',
    description: "See births, deaths, and historical events relevant to your family's home state — all on a visual timeline.",
    position: 'right',
  },
  {
    id: 'view-menu',
    targetSelector: '[data-tutorial="topbar-view"]',
    title: 'Views & Exploration',
    description: 'Switch between Vertical Tree, Horizontal Tree, and Fan Chart layouts. Also access the Migration Map, Timeline, and Statistics from here.',
    position: 'bottom',
  },
  {
    id: 'analysis-menu',
    targetSelector: '[data-tutorial="topbar-analysis"]',
    title: 'Analysis Tools',
    description: 'Find the relationship path between any two people, get smart suggestions to improve your tree data, and detect duplicate entries.',
    position: 'bottom',
  },
  {
    id: 'collaboration-menu',
    targetSelector: '[data-tutorial="topbar-collaboration"]',
    title: 'Collaborate with Family',
    description: 'Invite family members to contribute to the tree. Manage sources and citations to document your family research.',
    position: 'bottom',
  },
  {
    id: 'activity-menu',
    targetSelector: '[data-tutorial="topbar-activity"]',
    title: 'Activity & Memories',
    description: 'Track all changes made to your tree, manage bookmarks for quick access, and browse your family\'s memories and stories.',
    position: 'bottom',
  },
  {
    id: 'profile',
    targetSelector: '[data-tutorial="topbar-profile"]',
    title: 'Your Profile & Settings',
    description: 'Access settings, change theme, or replay this tutorial anytime. Now try clicking "Family Tree" in the sidebar to explore your tree!',
    position: 'bottom',
  },
];

export const TREE_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'tree-canvas',
    targetSelector: '[data-tutorial="tree-canvas"]',
    title: 'Your Family Tree',
    description: 'This is your interactive family tree. Drag to pan around, scroll to zoom. Each card represents a family member.',
    position: 'bottom',
  },
  {
    id: 'tree-search',
    targetSelector: '[data-tutorial="tree-search"]',
    title: 'Find Anyone',
    description: 'Search for any family member by name. Click a result to jump directly to their card in the tree.',
    position: 'bottom',
  },
  {
    id: 'person-card',
    targetSelector: '[data-tutorial="person-card"]',
    title: 'Person Cards',
    description: 'Click a card to select them and view details. Right-click (or long-press on mobile) to see options: Add Parent, Add Spouse, Add Child, Edit, and more.',
    position: 'bottom',
  },
  {
    id: 'home-breadcrumb',
    targetSelector: '[data-tutorial="home-breadcrumb"]',
    title: 'Focus Navigation',
    description: 'This shows who you\'re focused on. Click the home icon to return to the main person, or click any name to navigate to them.',
    position: 'top',
  },
  {
    id: 'minimap',
    targetSelector: '[data-tutorial="minimap"]',
    title: 'Minimap',
    description: 'A bird\'s-eye view of your entire tree. Click anywhere on it to instantly jump to that area of the tree.',
    position: 'left',
  },
  {
    id: 'zoom-controls',
    targetSelector: '[data-tutorial="zoom-controls"]',
    title: 'Zoom & Fit',
    description: 'Zoom in and out, or fit the entire tree to your screen. You can also use mouse wheel or pinch gestures on mobile.',
    position: 'left',
  },
  {
    id: 'tree-views',
    targetSelector: '[data-tutorial="topbar-view"]',
    title: 'Three Tree Views',
    description: 'Try switching views! Vertical Tree (top-down family layout), Horizontal Tree (left-right pedigree), and Fan Chart (radial ancestor view).',
    position: 'bottom',
  },
  {
    id: 'add-member',
    targetSelector: '[data-tutorial="sidebar-tree"]',
    title: 'Start Building!',
    description: "You're all set! Right-click any person to add parents, children, or spouses. Look for greyed-out placeholder cards to fill in missing family members. Happy tree building!",
    position: 'right',
  },
];
