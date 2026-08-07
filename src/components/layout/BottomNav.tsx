import { useState } from 'react'
import { Home, GitBranch, Plus, Menu, UserPlus, Heart, Baby, UsersRound, Image } from 'lucide-react'
import { useResponsive } from '@/hooks/useResponsive'

export interface BottomNavProps {
  activeTab?: 'home' | 'canvas' | 'memories' | 'discover'
  onGoHome?: () => void
  onFocusCanvas?: () => void
  onOpenMemories?: () => void
  onOpenDiscover?: () => void
  onOpenDrawer?: () => void
  selectedPersonId?: string | null
  onAddParent?: () => void
  onAddSpouse?: () => void
  onAddChild?: () => void
  onAddSibling?: () => void
  onAddMemory?: () => void
  onNavigateToTree?: () => void
}

export function BottomNav({
  activeTab = 'home',
  onGoHome,
  onFocusCanvas,
  onOpenMemories,
  onOpenDiscover,
  onOpenDrawer,
  selectedPersonId,
  onAddParent,
  onAddSpouse,
  onAddChild,
  onAddSibling,
  onAddMemory,
  onNavigateToTree,
}: BottomNavProps) {
  const { isMobileLandscape } = useResponsive()
  const [showAddSheet, setShowAddSheet] = useState(false)

  const hasSelection = !!selectedPersonId

  if (isMobileLandscape) return null

  const tabs = [
    { id: 'home' as const, label: 'Home', icon: Home, action: onGoHome },
    { id: 'canvas' as const, label: 'Tree', icon: GitBranch, action: onFocusCanvas },
    { id: 'add' as const, label: '', icon: Plus, action: () => {} },
    { id: 'memories' as const, label: 'Memories', icon: Image, action: onOpenMemories || onOpenDiscover },
    { id: 'menu' as const, label: 'More', icon: Menu, action: onOpenDrawer },
  ]

  // When a person is selected: show relative options. Otherwise: show general options.
  const addOptions = hasSelection
    ? [
        { label: 'Parent', icon: UserPlus, action: onAddParent },
        { label: 'Spouse', icon: Heart, action: onAddSpouse },
        { label: 'Child', icon: Baby, action: onAddChild },
        { label: 'Sibling', icon: UsersRound, action: onAddSibling },
      ]
    : [
        { label: 'Memory', icon: Image, action: onAddMemory },
        { label: 'Tree', icon: GitBranch, action: () => { setShowAddSheet(false); onNavigateToTree?.() } },
      ]

  return (
    <>
      {/* Add Bottom Sheet Overlay */}
      {showAddSheet && (
        <div
          className="fixed inset-0 bg-black/25 z-40 md:hidden"
          onClick={() => setShowAddSheet(false)}
        />
      )}

      {/* Add Bottom Sheet — iOS Action Sheet style */}
      {showAddSheet && (
        <div
          className="fixed bottom-[calc(50px+env(safe-area-inset-bottom))] left-0 right-0 z-50 md:hidden animate-ios-slide-up"
        >
          <div className="mx-3 mb-2">
            <div className="ios-card shadow-lg">
              {/* Handle indicator */}
              <div className="flex justify-center pt-2.5 pb-1.5">
                <div className="w-9 h-[4px] bg-[#C7C7CC] dark:bg-[#48484A] rounded-full" />
              </div>
              {/* Title */}
              <p className="text-center text-[13px] font-semibold text-[#8B7355] dark:text-[#8d8d93] uppercase tracking-wide pb-2">
                {hasSelection ? 'Add Relative' : 'Quick Actions'}
              </p>
              {/* Options grid */}
              <div className="ios-quick-actions px-2 pb-3">
                {addOptions.map((opt) => {
                  const Icon = opt.icon
                  return (
                    <button
                      key={opt.label}
                      onClick={() => { setShowAddSheet(false); opt.action?.() }}
                      className="ios-quick-action ios-pressable"
                    >
                      <div className="w-12 h-12 rounded-[14px] bg-[#2F3E8F]/[0.08] dark:bg-[#5A6BFF]/[0.12] flex items-center justify-center">
                        <Icon className="w-[22px] h-[22px] text-[#2F3E8F] dark:text-[#7B8FD4]" strokeWidth={1.8} />
                      </div>
                      <span className="text-[11px] font-medium text-[#3D2E1F] dark:text-[#D4D0CC] leading-tight text-center">
                        {opt.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── iOS Translucent Tab Bar ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden ios-tab-bar"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-end justify-around h-[50px]">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id

            // Center Add button — elevated circular button
            if (tab.id === 'add') {
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    navigator.vibrate?.(10)
                    setShowAddSheet(!showAddSheet)
                  }}
                  className="flex flex-col items-center justify-center -mt-3 ios-pressable"
                >
                  <div className={`w-[44px] h-[44px] rounded-full flex items-center justify-center transition-all duration-200 ${
                    showAddSheet
                      ? 'bg-[#8B7355] shadow-[0_2px_12px_rgba(139,115,85,0.4)]'
                      : 'bg-[#2F3E8F] shadow-[0_2px_12px_rgba(47,62,143,0.35)]'
                  }`}>
                    <Plus
                      className={`w-[22px] h-[22px] text-white transition-transform duration-200 ${showAddSheet ? 'rotate-45' : ''}`}
                      strokeWidth={2.5}
                    />
                  </div>
                </button>
              )
            }

            // Menu tab — no active state
            if (tab.id === 'menu') {
              return (
                <button
                  key={tab.id}
                  onClick={() => { navigator.vibrate?.(10); tab.action?.() }}
                  className="flex flex-col items-center justify-center w-[60px] pt-1.5 pb-0.5 ios-pressable"
                >
                  <Menu className="w-[22px] h-[22px] text-[#8B7355] dark:text-[#8d8d93]" strokeWidth={1.6} />
                  <span className="text-[10px] font-medium text-[#8B7355] dark:text-[#8d8d93] mt-0.5">
                    More
                  </span>
                </button>
              )
            }

            // Regular tabs — iOS-style with filled/outline icons
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => {
                  navigator.vibrate?.(10)
                  tab.action?.()
                }}
                className="flex flex-col items-center justify-center w-[60px] pt-1.5 pb-0.5 ios-pressable"
              >
                <div className="relative">
                  <Icon
                    className={`w-[22px] h-[22px] transition-colors duration-150 ${
                      isActive
                        ? 'text-[#2F3E8F] dark:text-[#7B8FD4]'
                        : 'text-[#8B7355] dark:text-[#8d8d93]'
                    }`}
                    strokeWidth={isActive ? 2.2 : 1.6}
                    fill={isActive ? 'currentColor' : 'none'}
                  />
                </div>
                <span className={`text-[10px] mt-0.5 transition-colors duration-150 ${
                  isActive
                    ? 'font-semibold text-[#2F3E8F] dark:text-[#7B8FD4]'
                    : 'font-medium text-[#8B7355] dark:text-[#8d8d93]'
                }`}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
