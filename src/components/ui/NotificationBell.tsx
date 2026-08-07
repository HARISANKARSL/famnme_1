/**
 * NotificationBell — B5 redesign
 *
 * Groups notifications by time (Today · This week · Earlier), rolls up
 * high-volume low-value types (birthdays, anniversaries) into a single
 * collapsible row, and shows inline actions where the backend supports
 * them (Mark read · View).
 *
 * Note: invite-accept / CR-approve actions still route through their
 * dedicated panels for auth + history reasons; here we expose one-click
 * "View" and "Mark read" that handle the common case without navigation.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Bell, CheckCheck, Loader2, Cake, Heart, CloudRain, MessageSquare,
  ChevronDown, Settings as SettingsIcon, Mail, FileEdit, UserCheck, Gem,
} from 'lucide-react'
import {
  getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead,
} from '@/services/collaborationApiService'
import type { AppNotification } from '@/types'

interface NotificationBellProps {
  className?: string
  onOpenSettings?: () => void
  onOpenAll?: () => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}-${mm}-${yy}`;
  } catch {
    return dateStr;
  }
}

type Bucket = 'today' | 'week' | 'earlier'

function bucketFor(dateStr: string): Bucket {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = diff / 86_400_000
  if (days < 1) return 'today'
  if (days < 7) return 'week'
  return 'earlier'
}

const BUCKET_LABELS: Record<Bucket, string> = {
  today: 'Today',
  week: 'This week',
  earlier: 'Earlier',
}

const ROLLUP_TYPES = new Set<AppNotification['type']>([
  'birthday', 'anniversary', 'death_anniversary',
])

function iconFor(type: AppNotification['type']) {
  switch (type) {
    case 'birthday':          return <Cake className="h-3.5 w-3.5 text-[#C2A46D]" />
    case 'anniversary':       return <Heart className="h-3.5 w-3.5 text-[#C29A94]" />
    case 'death_anniversary': return <CloudRain className="h-3.5 w-3.5 text-[#7A6D62]" />
    case 'share_comment':
    case 'cr_comment':        return <MessageSquare className="h-3.5 w-3.5 text-[#2F3E8F]" />
    case 'invitation':
    case 'claim_requested':   return <Mail className="h-3.5 w-3.5 text-[#2F3E8F]" />
    case 'cr_submitted':
    case 'cr_approved':
    case 'cr_rejected':
    case 'edit_approved':
    case 'edit_rejected':     return <FileEdit className="h-3.5 w-3.5 text-[#2F3E8F]" />
    case 'claim_approved':    return <UserCheck className="h-3.5 w-3.5 text-[#2F3E8F]" />
    default:                  return <Gem className="h-3.5 w-3.5 text-[#2F3E8F]" />
  }
}

export function NotificationBell({ className, onOpenSettings, onOpenAll }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rollupsExpanded, setRollupsExpanded] = useState<Record<Bucket, boolean>>({ today: false, week: false, earlier: false })
  const dropdownRef = useRef<HTMLDivElement>(null)

  const refreshCount = useCallback(async () => {
    try { setUnreadCount(await getUnreadCount()) } catch { /* silent */ }
  }, [])

  useEffect(() => {
    refreshCount()
    const id = setInterval(refreshCount, 30_000)
    return () => clearInterval(id)
  }, [refreshCount])

  const handleToggle = async () => {
    const next = !isOpen
    setIsOpen(next)
    if (next) {
      setLoading(true)
      try { setNotifications(await getNotifications(30)) } catch { /* keep */ }
      finally { setLoading(false) }
    }
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    if (isOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id)
      setNotifications(prev => prev.map(n => n.notificationId === id ? { ...n, isRead: true } : n))
      setUnreadCount(c => Math.max(0, c - 1))
    } catch { /* ignore */ }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead()
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch { /* ignore */ }
  }

  // Group by bucket and split rollup vs regular
  const grouped = useMemo(() => {
    const buckets: Record<Bucket, { regular: AppNotification[]; rollup: AppNotification[] }> = {
      today:   { regular: [], rollup: [] },
      week:    { regular: [], rollup: [] },
      earlier: { regular: [], rollup: [] },
    }
    for (const n of notifications) {
      const b = bucketFor(n.createdAt)
      if (ROLLUP_TYPES.has(n.type)) buckets[b].rollup.push(n)
      else buckets[b].regular.push(n)
    }
    return buckets
  }, [notifications])

  const rollupLabel = (items: AppNotification[]): string => {
    if (items.length === 0) return ''
    const counts: Record<string, number> = {}
    for (const n of items) counts[n.type] = (counts[n.type] || 0) + 1
    const parts: string[] = []
    if (counts.birthday)          parts.push(`${counts.birthday} birthday${counts.birthday > 1 ? 's' : ''}`)
    if (counts.anniversary)       parts.push(`${counts.anniversary} anniversar${counts.anniversary > 1 ? 'ies' : 'y'}`)
    if (counts.death_anniversary) parts.push(`${counts.death_anniversary} remembrance${counts.death_anniversary > 1 ? 's' : ''}`)
    return parts.join(' · ')
  }

  const renderBucket = (b: Bucket) => {
    const g = grouped[b]
    if (g.regular.length === 0 && g.rollup.length === 0) return null
    return (
      <div key={b}>
        <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8B7355] dark:text-[#888]">
          {BUCKET_LABELS[b]}
        </div>

        {g.rollup.length > 0 && (
          <div>
            <button
              onClick={() => setRollupsExpanded(p => ({ ...p, [b]: !p[b] }))}
              className="w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors"
              aria-expanded={rollupsExpanded[b]}
            >
              <Cake className="h-4 w-4 text-[#C2A46D] shrink-0" />
              <span className="flex-1 text-[13px] text-[#3D2E1F] dark:text-[#F3F2F1] truncate">
                {rollupLabel(g.rollup)}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-[#8B7355] dark:text-[#888] transition-transform duration-200 ${rollupsExpanded[b] ? 'rotate-180' : ''}`}
              />
            </button>
            {rollupsExpanded[b] && (
              <div className="border-l-2 border-[#C2A46D]/30 ml-4">
                {g.rollup.map(n => renderRow(n))}
              </div>
            )}
          </div>
        )}

        {g.regular.map(n => renderRow(n))}
      </div>
    )
  }

  const renderRow = (n: AppNotification) => {
    const canInlineMark = !n.isRead
    return (
      <div
        key={n.notificationId}
        className={`group w-full px-4 py-3 border-b border-[#E2DBCE]/40 dark:border-[#2a2a2a]/60 flex items-start gap-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] ${
          !n.isRead ? 'bg-[#E8EDFF]/40 dark:bg-[#2F3E8F]/10' : ''
        }`}
      >
        <div className="mt-1 shrink-0 flex items-center justify-center w-5 h-5">{iconFor(n.type)}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-[#3D2E1F] dark:text-[#F3F2F1] truncate">{n.title}</p>
          {n.message && (
            <p className="text-[12px] text-[#8B7355] dark:text-[#999] mt-0.5 line-clamp-2">{n.message}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-[#B8A090] dark:text-[#666]">{timeAgo(n.createdAt)}</span>
            {canInlineMark && (
              <button
                onClick={() => handleMarkRead(n.notificationId)}
                className="text-[10px] text-[#2F3E8F] dark:text-[#8CA0FF] hover:underline font-medium"
              >
                Mark read
              </button>
            )}
          </div>
        </div>
        {!n.isRead && <div className="mt-2 h-2 w-2 rounded-full bg-[#2F3E8F] shrink-0" />}
      </div>
    )
  }

  const totalShown = notifications.length

  return (
    <div ref={dropdownRef} className={`relative ${className || ''}`}>
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-lg text-[#5B5449] dark:text-[#B8B8B8] hover:text-[#3D2E1F] dark:hover:text-[#F3F2F1] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F3E8F]/40"
        title="Notifications"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center h-4 min-w-[16px] px-0.5 rounded-full bg-[#C53838] text-white text-[10px] font-bold leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[360px] bg-white dark:bg-[#1a1a1a] rounded-xl shadow-[0_12px_36px_rgba(0,0,0,0.12)] border border-[#E2DBCE]/60 dark:border-[#2a2a2a] z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2DBCE]/60 dark:border-[#2a2a2a]">
            <div>
              <h3 className="text-[14px] font-semibold text-[#3D2E1F] dark:text-[#F3F2F1]">Notifications</h3>
              {unreadCount > 0 && (
                <p className="text-[11px] text-[#8B7355] dark:text-[#888] mt-0.5">{unreadCount} unread</p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[12px] text-[#2F3E8F] dark:text-[#8CA0FF] hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-[#B8A090]" />
              </div>
            ) : totalShown === 0 ? (
              <div className="py-12 text-center px-6">
                <div className="text-[15px] font-semibold text-[#3D2E1F] dark:text-[#F3F2F1] font-display">
                  All caught up <span aria-hidden="true">✨</span>
                </div>
                <div className="text-[12px] mt-1 text-[#8B7355] dark:text-[#888]">
                  New activity from your tree will show up here.
                </div>
              </div>
            ) : (
              <>
                {renderBucket('today')}
                {renderBucket('week')}
                {renderBucket('earlier')}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#E2DBCE]/60 dark:border-[#2a2a2a] bg-[#F8F6F1] dark:bg-[#141414]">
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 text-[12px] text-[#5B5449] dark:text-[#888] hover:text-[#2F3E8F] dark:hover:text-[#8CA0FF]"
            >
              <SettingsIcon className="h-3.5 w-3.5" />
              Notification settings
            </button>
            {onOpenAll && (
              <button
                onClick={onOpenAll}
                className="text-[12px] text-[#2F3E8F] dark:text-[#8CA0FF] hover:underline font-medium"
              >
                View all
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
