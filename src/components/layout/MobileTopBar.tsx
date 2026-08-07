import { Search, Bell } from 'lucide-react'
import { useResponsive } from '@/hooks/useResponsive'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

interface MobileTopBarProps {
  treeName?: string
  onSearchOpen: () => void
  /** When true, show compact inline bar (tree/canvas view). When false, show iOS large title (dashboard home). */
  isCompact?: boolean
  /** Greeting text for large title mode */
  greeting?: string
  /** Subtitle (e.g. date) for large title mode */
  subtitle?: string
  /** User avatar URL */
  avatarUrl?: string | null
  /** User initials fallback */
  userInitials?: string
  onAvatarPress?: () => void
  /** Notification badge count */
  notificationCount?: number
}

export function MobileTopBar({
  treeName,
  onSearchOpen,
  isCompact = false,
  greeting,
  subtitle,
  avatarUrl,
  userInitials = '',
  onAvatarPress,
  notificationCount = 0,
}: MobileTopBarProps) {
  const { isMobileLandscape } = useResponsive()

  // Hide in landscape to maximize canvas space
  if (isMobileLandscape) return null

  // ── Compact mode: minimal bar for tree/canvas views ──
  if (isCompact) {
    return (
      <div className="ios-bar-translucent h-11 flex items-center justify-between px-3 relative z-20 md:hidden safe-area-top border-b border-black/[0.06] dark:border-white/[0.06]">
        {/* Left: App logo */}
        <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
          <img src="/logo.png" alt="FamNme" className="w-6 h-6 object-contain rounded" />
        </div>

        {/* Center: Tree Name */}
        <h1 className="text-[#3D2E1F] dark:text-[#f5f5f5] font-semibold text-[15px] truncate max-w-[200px] text-center">
          {treeName || 'FamNme'}
        </h1>

        {/* Right: Theme & Search */}
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={onSearchOpen}
            className="w-8 h-8 flex items-center justify-center rounded-full ios-pressable"
            aria-label="Search"
          >
            <Search className="w-[18px] h-[18px] text-[#2F3E8F] dark:text-[#7B8FD4]" strokeWidth={2} />
          </button>
        </div>
      </div>
    )
  }

  // ── Large Title mode: iOS-style dashboard header ──
  return (
    <div className="md:hidden safe-area-top relative z-20">
      {/* Status bar spacer with translucent background */}
      <div className="ios-bar-translucent">
        {/* Top mini-bar: avatar + logo + actions */}
        <div className="flex items-center justify-between px-4 h-11">
          {/* Left: User avatar */}
          <button
            onClick={onAvatarPress}
            className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ios-pressable ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#2F3E8F]/10 dark:bg-[#5A6BFF]/15 flex items-center justify-center">
                <span className="text-[11px] font-bold text-[#2F3E8F] dark:text-[#7B8FD4]">
                  {userInitials}
                </span>
              </div>
            )}
          </button>

          {/* Center: Logo */}
          <div className="flex items-center gap-1.5">
            <img src="/logo.png" alt="FamNme" className="w-6 h-6 object-contain rounded" />
            <span className="text-[15px] font-semibold text-[#2F3E8F] dark:text-[#7B8FD4]">
              {treeName || 'FamNme'}
            </span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {notificationCount > 0 && (
              <button className="w-8 h-8 flex items-center justify-center rounded-full ios-pressable relative">
                <Bell className="w-[18px] h-[18px] text-[#3D2E1F] dark:text-[#D4D0CC]" strokeWidth={1.8} />
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-[#FF3B30] rounded-full flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white leading-none px-1">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                </span>
              </button>
            )}
            <button
              onClick={onSearchOpen}
              className="w-8 h-8 flex items-center justify-center rounded-full ios-pressable"
              aria-label="Search"
            >
              <Search className="w-[18px] h-[18px] text-[#2F3E8F] dark:text-[#7B8FD4]" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* Large Title Area */}
      <div className="px-4 pt-1 pb-2 bg-[#F8F6F1] dark:bg-[#121212]">
        <h1 className="ios-large-title text-[#3D2E1F] dark:text-[#F5F1E8] animate-ios-slide-up">
          {greeting || 'Home'}
        </h1>
        {subtitle && (
          <p className="text-[13px] text-[#8B7355] dark:text-[#8d8d93] mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
