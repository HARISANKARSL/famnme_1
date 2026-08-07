import type { LucideIcon } from 'lucide-react'
import {
  Home, Users, BarChart3, Map as MapIcon, Clock, List,
  Route, Lightbulb, Merge, UserPlus, Heart, Baby, UsersRound,
  Bookmark, Activity, Moon, Languages, Settings,
  LogOut, User, BookOpen, GitBranch, Image, Shield, Pencil,
  MessageCircle, Tag, Eye, Mic,
} from 'lucide-react'
import type { PanelId } from '@/store/panelStore'

export type SpotlightCategory = 'navigate' | 'discover' | 'build' | 'stories' | 'settings'

export interface SpotlightAction {
  id: string
  label: string
  keywords: string[]
  icon: LucideIcon
  category: SpotlightCategory
  panelId?: PanelId
  shortcut?: string
  /** If true, only shown when a person is selected */
  requiresSelection?: boolean
  /** Custom action key for non-panel actions */
  actionKey?: string
}

/** All app-wide actions searchable via Spotlight */
export const SPOTLIGHT_ACTIONS: SpotlightAction[] = [
  // ── Navigate ──────────────────────────────────────
  {
    id: 'nav-home',
    label: 'Go Home',
    keywords: ['home', 'dashboard', 'back'],
    icon: Home,
    category: 'navigate',
    actionKey: 'go-home',
  },
  {
    id: 'nav-tree',
    label: 'Family Tree',
    keywords: ['tree', 'canvas', 'family'],
    icon: GitBranch,
    category: 'navigate',
    actionKey: 'go-tree',
  },
  {
    id: 'nav-all-people',
    label: 'All People',
    keywords: ['people', 'members', 'list', 'directory', 'everyone'],
    icon: Users,
    category: 'navigate',
    panelId: 'all-people',
  },
  {
    id: 'nav-tree-overview',
    label: 'Tree Overview',
    keywords: ['overview', 'summary', 'stats', 'tree info'],
    icon: BarChart3,
    category: 'navigate',
    actionKey: 'tree-overview',
  },

  // ── Discover ──────────────────────────────────────
  {
    id: 'discover-migration-map',
    label: 'Migration Map',
    keywords: ['migration', 'map', 'geography', 'locations', 'places', 'where'],
    icon: MapIcon,
    category: 'discover',
    panelId: 'migration-map',
  },
  {
    id: 'discover-timeline',
    label: 'Timeline',
    keywords: ['timeline', 'history', 'chronology', 'events', 'when'],
    icon: Clock,
    category: 'discover',
    panelId: 'timeline',
  },
  {
    id: 'discover-statistics',
    label: 'Statistics',
    keywords: ['statistics', 'stats', 'analytics', 'numbers', 'data'],
    icon: BarChart3,
    category: 'discover',
    panelId: 'dna',
  },
  {
    id: 'discover-descendancy',
    label: 'Descendancy List',
    keywords: ['descendants', 'descendancy', 'lineage', 'offspring', 'children'],
    icon: List,
    category: 'discover',
    panelId: 'descendancy',
    requiresSelection: true,
  },
  {
    id: 'discover-pathfinder',
    label: 'Relationship Pathfinder',
    keywords: ['relationship', 'path', 'connection', 'how related', 'find relation'],
    icon: Route,
    category: 'discover',
    actionKey: 'relationship-path',
  },
  {
    id: 'discover-suggestions',
    label: 'Smart Suggestions',
    keywords: ['suggestions', 'recommend', 'improve', 'missing', 'incomplete'],
    icon: Lightbulb,
    category: 'discover',
    panelId: 'suggestions',
  },
  {
    id: 'discover-duplicates',
    label: 'Duplicate Detection',
    keywords: ['duplicate', 'merge', 'same person', 'duplicates'],
    icon: Merge,
    category: 'discover',
    panelId: 'duplicate-detection',
  },
  {
    id: 'discover-sources',
    label: 'Sources & Evidence',
    keywords: ['sources', 'evidence', 'references', 'citations', 'proof'],
    icon: BookOpen,
    category: 'discover',
    panelId: 'source',
  },

  // ── Build (person actions) ────────────────────────
  {
    id: 'build-add-parent',
    label: 'Add Parent',
    keywords: ['parent', 'father', 'mother', 'add parent'],
    icon: UserPlus,
    category: 'build',
    actionKey: 'add-parent',
    requiresSelection: true,
  },
  {
    id: 'build-add-spouse',
    label: 'Add Spouse',
    keywords: ['spouse', 'husband', 'wife', 'partner', 'marry', 'marriage'],
    icon: Heart,
    category: 'build',
    actionKey: 'add-spouse',
    requiresSelection: true,
  },
  {
    id: 'build-add-child',
    label: 'Add Child',
    keywords: ['child', 'son', 'daughter', 'kid', 'baby'],
    icon: Baby,
    category: 'build',
    actionKey: 'add-child',
    requiresSelection: true,
  },
  {
    id: 'build-add-sibling',
    label: 'Add Sibling',
    keywords: ['sibling', 'brother', 'sister'],
    icon: UsersRound,
    category: 'build',
    actionKey: 'add-sibling',
    requiresSelection: true,
  },
  {
    id: 'build-edit',
    label: 'Edit Person',
    keywords: ['edit', 'modify', 'change', 'update details'],
    icon: Pencil,
    category: 'build',
    actionKey: 'edit',
    requiresSelection: true,
  },

  // ── Stories & Activity ────────────────────────────
  {
    id: 'stories-memories',
    label: 'Memories & Stories',
    keywords: ['memories', 'stories', 'photos', 'gallery'],
    icon: Image,
    category: 'stories',
    actionKey: 'open-memories',
  },
  {
    id: 'stories-activity',
    label: 'Activity Feed',
    keywords: ['activity', 'feed', 'recent', 'changes', 'updates'],
    icon: Activity,
    category: 'stories',
    panelId: 'activity',
  },
  {
    id: 'stories-bookmarks',
    label: 'Bookmarks',
    keywords: ['bookmarks', 'saved', 'favorites', 'starred'],
    icon: Bookmark,
    category: 'stories',
    panelId: 'bookmarks',
  },

  // ── Settings ──────────────────────────────────────
  {
    id: 'settings-profile',
    label: 'My Profile',
    keywords: ['profile', 'account', 'my info'],
    icon: User,
    category: 'settings',
    panelId: 'profile',
  },
  {
    id: 'settings-tree',
    label: 'Tree Settings',
    keywords: ['tree settings', 'configuration', 'preferences'],
    icon: Settings,
    category: 'settings',
    actionKey: 'tree-settings',
  },
  {
    id: 'settings-dark-mode',
    label: 'Toggle Dark Mode',
    keywords: ['dark', 'light', 'theme', 'mode', 'night'],
    icon: Moon,
    category: 'settings',
    actionKey: 'toggle-theme',
  },
  {
    id: 'settings-language',
    label: 'Language Settings',
    keywords: ['language', 'locale', 'translation', 'hindi', 'english'],
    icon: Languages,
    category: 'settings',
    actionKey: 'language',
  },
  {
    id: 'settings-invite',
    label: 'Invite Collaborator',
    keywords: ['invite', 'collaborate', 'share', 'team', 'family member'],
    icon: UserPlus,
    category: 'settings',
    actionKey: 'invite',
  },
  {
    id: 'settings-voice',
    label: 'Voice Assistant',
    keywords: ['voice', 'speak', 'mic', 'microphone', 'talk'],
    icon: Mic,
    category: 'settings',
    actionKey: 'voice',
  },
  {
    id: 'settings-sign-out',
    label: 'Sign Out',
    keywords: ['sign out', 'logout', 'log out', 'exit'],
    icon: LogOut,
    category: 'settings',
    actionKey: 'sign-out',
  },

  // ── Person-specific (shown when person selected) ──
  {
    id: 'person-gallery',
    label: 'Photos & Media',
    keywords: ['photos', 'media', 'gallery', 'images', 'pictures'],
    icon: Image,
    category: 'build',
    actionKey: 'media-gallery',
    requiresSelection: true,
  },
  {
    id: 'person-life-story',
    label: 'Life Story',
    keywords: ['life story', 'biography', 'bio'],
    icon: BookOpen,
    category: 'build',
    panelId: 'life-story',
    requiresSelection: true,
  },
  {
    id: 'person-comments',
    label: 'Comments',
    keywords: ['comments', 'notes', 'discussion'],
    icon: MessageCircle,
    category: 'build',
    actionKey: 'view-comments',
    requiresSelection: true,
  },
  {
    id: 'person-tags',
    label: 'Manage Tags',
    keywords: ['tags', 'labels', 'categories'],
    icon: Tag,
    category: 'build',
    actionKey: 'manage-tags',
    requiresSelection: true,
  },
  {
    id: 'person-history',
    label: 'View History',
    keywords: ['history', 'audit', 'changes', 'log'],
    icon: Eye,
    category: 'build',
    actionKey: 'view-history',
    requiresSelection: true,
  },
  {
    id: 'person-privacy',
    label: 'Branch Privacy',
    keywords: ['privacy', 'private', 'hide', 'protect'],
    icon: Shield,
    category: 'build',
    actionKey: 'branch-privacy',
    requiresSelection: true,
  },
]

/** Category display config */
export const SPOTLIGHT_CATEGORIES: Record<SpotlightCategory, { label: string; order: number }> = {
  navigate: { label: 'Navigate', order: 0 },
  build: { label: 'Build & Edit', order: 1 },
  discover: { label: 'Discover', order: 2 },
  stories: { label: 'Stories & Activity', order: 3 },
  settings: { label: 'Settings', order: 4 },
}

/** Simple fuzzy match: all query words must appear in the label or keywords */
export function matchAction(action: SpotlightAction, query: string): boolean {
  const q = query.toLowerCase().trim()
  if (!q) return true

  const words = q.split(/\s+/)
  const searchable = [action.label, ...action.keywords].join(' ').toLowerCase()

  return words.every(word => searchable.includes(word))
}

/** Recent actions storage */
const RECENT_KEY = 'spotlight-recent'
const MAX_RECENT = 5

export function getRecentActions(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_KEY)
    return stored ? (JSON.parse(stored) as string[]).slice(0, MAX_RECENT) : []
  } catch {
    return []
  }
}

export function addRecentAction(actionId: string): void {
  try {
    const recent = getRecentActions().filter(id => id !== actionId)
    recent.unshift(actionId)
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
  } catch {
    // ignore
  }
}
