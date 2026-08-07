import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/use-toast'
import {
  LogOut, User, Users, Settings, ChevronDown,
  Moon, List, BookOpen, LayoutDashboard,
} from 'lucide-react'
import { LayoutModeSwitcher } from '@/components/canvas/LayoutModeSwitcher'
import { useState, useRef, useEffect, useMemo } from 'react'
import { Flame } from 'lucide-react'
import { NotificationBell } from '@/components/ui/NotificationBell'
import type { LayoutMode } from '@/store/treeStore'
import type { Person } from '@/types'
import { resolveBackendUrl } from '@/config/api'
import { useTutorialStore } from '@/store/tutorialStore'

export interface TopBarProps {
  treeName?: string
  onOpenSettings?: () => void
  pendingEditCount?: number
  onOpenPendingEdits?: () => void
  layoutMode?: LayoutMode
  onLayoutModeChange?: (mode: LayoutMode) => void
  persons?: Person[]
  // Navigation
  onOpenAllPeople?: () => void
  onOpenOverview?: () => void
  onOpenProfile?: () => void
  onOpenFeedPreferences?: () => void
  // Spotlight search
  onOpenSpotlight?: () => void
  // Context flag
  isTreeView?: boolean
  // Streak
  streakDays?: number

  // Legacy props (kept for compat, some still used by callers)
  onZoomIn?: () => void
  onZoomOut?: () => void
  onResetView?: () => void
  onDownload?: () => void
  bloodRelationMode?: unknown
  onBloodRelationModeChange?: unknown
  unions?: unknown
  relationships?: unknown
  onOpenRelationshipPath?: () => void
  onOpenSuggestions?: () => void
  onOpenDuplicateDetection?: () => void
  onOpenMigrationMap?: () => void
  onOpenTimeline?: () => void
  onOpenDescendancyList?: () => void
  onOpenStatistics?: () => void
  onOpenInviteCollaborator?: () => void
  onOpenCollaboration?: () => void
  onOpenManageCollaborators?: () => void
  onOpenSources?: () => void
  onOpenActivityFeed?: () => void
  onOpenBookmarks?: () => void
  onOpenMemories?: () => void
  onOpenGridSettings?: () => void
}

import { useTheme } from '@/contexts/ThemeContext'

/* ── Shared menu classes ─────────────────────────────── */
const menuItemClass =
  'w-full text-left px-4 py-2 text-[13px] text-[#8B7355] dark:text-[#999] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] hover:text-[#3D2E1F] dark:hover:text-[#f5f5f5] flex items-center gap-3 transition-all duration-150'
const menuPanelClass =
  'fixed left-0 right-0 top-14 w-full rounded-none md:absolute md:left-0 md:right-auto md:top-full md:mt-1.5 md:rounded-xl bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-md border border-[#E2E8F0]/80 dark:border-[#2a2a2a] py-1.5 z-50 shadow-[0_8px_30px_rgba(0,0,0,0.08)]'
const userMenuPanelClass =
  'fixed left-0 right-0 top-14 w-full rounded-none md:absolute md:right-0 md:left-auto md:top-full md:mt-1.5 md:rounded-xl md:w-64 md:max-h-[80vh] md:overflow-y-auto bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-md border border-[#E2E8F0]/80 dark:border-[#2a2a2a] py-1.5 z-50 shadow-[0_8px_30px_rgba(0,0,0,0.08)]'
const menuDividerClass = 'border-t border-[#E2E8F0]/60 dark:border-[#2a2a2a] my-1'

/** Dark-mode switch — inline toggle row (B6 spec). */
function DarkModeSwitchItem() {
  const { setTheme, resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const toggle = () => {
    setTheme(isDark ? 'light' : 'dark')
  }
  return (
    <button onClick={toggle} className={menuItemClass} role="switch" aria-checked={isDark}>
      <Moon className="w-4 h-4 text-[#B8A090]" />
      <span className="flex-1 text-left">Dark mode</span>
      <span
        aria-hidden="true"
        className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${isDark ? 'bg-[#2F3E8F]' : 'bg-[#D4D0CC] dark:bg-[#3a3a3a]'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${isDark ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </span>
    </button>
  )
}

type MenuId = 'tree' | 'user' | null

export function TopBar({
  treeName = 'Family Tree',
  persons,
  onOpenAllPeople,
  onOpenOverview,
  onOpenManageCollaborators,
  onOpenProfile,
  isTreeView = false,
  streakDays = 0,
}: TopBarProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user, signOut } = useAuthStore()
  const [openMenu, setOpenMenu] = useState<MenuId>(null)
  const topBarRef = useRef<HTMLDivElement>(null)

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (topBarRef.current && !topBarRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleMenu = (id: MenuId) => {
    setOpenMenu(prev => prev === id ? null : id)
  }

  const closeMenu = () => { setOpenMenu(null) }

  const handleLogout = async () => {
    try {
      await signOut()
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to sign out. Please try again.',
        variant: 'destructive',
      })
    }
    closeMenu()
  }

  const displayName = user?.fullName || user?.email || 'User'
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const homePersonPhotoUrl = useMemo(() => {
    const hp = persons?.find(p => p.isHomePerson)
    return hp?.profilePhotoUrl ? resolveBackendUrl(hp.profilePhotoUrl) : null
  }, [persons])

  return (
    <div ref={topBarRef} className="h-14 bg-white/80 dark:bg-[#1E1E1E]/80 backdrop-blur-sm border-b border-[#E2E8F0]/80 dark:border-[#2a2a2a] flex items-center justify-between px-3 md:px-6 relative z-20">
      {/* Left side: Tree Name dropdown */}
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        {(onOpenAllPeople || onOpenOverview) ? (
          <div className="relative">
            <button
              onClick={() => toggleMenu('tree')}
              data-tutorial="topbar-tree"
              title="Switch tree"
              aria-label={`Current tree: ${treeName}. Click to switch trees.`}
              className={`group flex items-center gap-1.5 font-semibold text-lg transition-all duration-150 rounded-lg px-1.5 py-1 max-w-[180px] sm:max-w-[240px] md:max-w-[280px] ${openMenu === 'tree'
                ? 'text-[#2F3E8F] dark:text-[#8CA0FF] bg-[#E8EDFF]/60 dark:bg-[#2F3E8F]/15'
                : 'text-[#3D2E1F] dark:text-[#f5f5f5] hover:text-[#2F3E8F] dark:hover:text-[#8CA0FF] hover:bg-[#F4F6F9] dark:hover:bg-[#2a2a2a]'
                }`}
            >
              <span className="truncate font-display">{treeName}</span>
              <span className="hidden sm:inline text-[11px] font-normal text-[#8B7355] dark:text-[#A8A8A8] opacity-0 group-hover:opacity-100 transition-opacity">Switch</span>
              <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${openMenu === 'tree' ? 'rotate-180' : ''}`} />
            </button>
            {openMenu === 'tree' && (
              <div className={`${menuPanelClass} md:w-52`}>
                {onOpenAllPeople && (
                  <button onClick={() => { onOpenAllPeople(); closeMenu() }} className={menuItemClass}>
                    <List className="w-4 h-4 text-[#B8A090]" />
                    All People
                  </button>
                )}
                {onOpenOverview && (
                  <button onClick={() => { onOpenOverview(); closeMenu() }} className={menuItemClass}>
                    <LayoutDashboard className="w-4 h-4 text-[#B8A090]" />
                    Tree Overview
                  </button>
                )}
                {/* {onOpenManageCollaborators && (
                  <button onClick={() => { onOpenManageCollaborators(); closeMenu() }} className={menuItemClass}>
                    <Users className="w-4 h-4 text-[#B8A090]" />
                    Manage Collaborators
                  </button>
                )} */}
                <div className={menuDividerClass} />
                <button onClick={() => { navigate('/trees'); closeMenu() }} className={menuItemClass}>
                  <LayoutDashboard className="w-4 h-4 text-[#B8A090]" />
                  Manage trees
                </button>
              </div>
            )}
          </div>
        ) : (
          <h1 className="text-[#3D2E1F] dark:text-[#f5f5f5] font-semibold text-lg truncate max-w-[120px] sm:max-w-[180px] md:max-w-[200px]">{treeName}</h1>
        )}
      </div>

      {/* Center: Layout mode switcher — only on the tree canvas */}
      <div className="flex-1 flex items-center justify-center mx-3">
        {isTreeView && <LayoutModeSwitcher variant="inline" />}
      </div>

      {/* Right side: Notifications + Streak + User menu (max 3 controls per B1) */}
      <div className="flex items-center gap-1 shrink-0">
        {/* <NotificationBell /> */}

        {/* Streak flame — with clearer affordance */}
        {streakDays > 0 && (
          <button
            type="button"
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[#C2A46D] hover:bg-[#F4F6FA] dark:hover:bg-[#323130] transition-colors"
            title={`${streakDays}-day streak. Keep it going!`}
            aria-label={`Streak: ${streakDays} days`}
          >
            <Flame className="w-4 h-4" fill="currentColor" strokeWidth={0} />
            <span className="text-xs font-bold">{streakDays}</span>
          </button>
        )}

        {/* User Menu — simplified: Account, Preferences, Support */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('user')}
            data-tutorial="topbar-profile"
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#F4F6FA] dark:hover:bg-[#323130] transition-colors"
          >
            {homePersonPhotoUrl ? (
              <img src={homePersonPhotoUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#2F3E8F] flex items-center justify-center shrink-0">
                <span className="text-white text-sm font-medium">{initials}</span>
              </div>
            )}
            <span className="hidden md:block text-sm text-[#3D2E1F] dark:text-[#F3F2F1] max-w-[120px] truncate">{displayName}</span>
            <ChevronDown className="w-3 h-3 text-[#8B7355] dark:text-[#D2D0CE] hidden md:block" />
          </button>

          {openMenu === 'user' && (
            <div className={userMenuPanelClass}>
              {/* Header */}
              <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-[#484644]">
                <div className="text-sm font-medium text-[#3D2E1F] dark:text-[#F3F2F1]">{displayName}</div>
                <div className="text-xs text-[#B8A090]">{user?.email}</div>
              </div>

              {/* Account section */}
              {/* {onOpenProfile && (
                <button onClick={() => { onOpenProfile(); closeMenu() }} className={menuItemClass}>
                  <User className="w-4 h-4 text-[#B8A090]" />
                  Profile
                </button>
              )} */}
              <button onClick={() => { navigate('/settings'); closeMenu() }} className={menuItemClass}>
                <Settings className="w-4 h-4 text-[#B8A090]" />
                Settings
                <span className="ml-auto text-[10px] text-[#B8A090]">Ctrl ,</span>
              </button>

              <DarkModeSwitchItem />

              <div className={menuDividerClass} />

              {/* <button onClick={() => { useTutorialStore.getState().startTutorial('dashboard'); closeMenu() }} className={menuItemClass}>
                <BookOpen className="w-4 h-4 text-[#B8A090]" />
                Take tour
              </button> */}

              {/* <div className={menuDividerClass} /> */}

              <button onClick={handleLogout} className={`${menuItemClass} text-red-500 hover:text-red-600`}>
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
