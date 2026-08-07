/**
 * SettingsPage — B6 unified settings hub
 *
 * Five tabs: Account · Trees · Privacy · Notifications · Preferences.
 * Keyboard shortcut: ⌘, / Ctrl+,  opens this page from anywhere.
 *
 * Backend coverage is incomplete for some fields (delete account, passkeys,
 * sessions list). Those rows are rendered as affordances with a "Coming soon"
 * toast so the hub is a single source of truth for users to discover them.
 */
import { useEffect, useMemo, useState, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  User, TreePine, Shield, Bell, Sliders,
  ArrowLeft, Check, Loader2, X, Globe, Plus, ChevronDown,
  FileText, FileJson,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useTreeStore } from '@/store/treeStore'
import { useToast } from '@/components/ui/use-toast'
import { TopBar } from '@/components/layout/TopBar'
import { MobileTopBar } from '@/components/layout/MobileTopBar'
import { useResponsive } from '@/hooks/useResponsive'
import { SUPPORTED_LOCALES } from '@/data/kinship'
import { changeLanguage } from '@/i18n'
import { getUserTrees, setDefaultTree, exportGedcom, exportCsv } from '@/services/neo4jDataService'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { useStreak } from '@/hooks/useStreak'
import { PasskeyManager } from '@/components/settings/PasskeyManager'
import { BadgeShelf } from '@/components/rewards/BadgeShelf'
import { buildExportArchive, downloadArchive } from '@/services/dataExportService'
import { getAuthToken } from '@/lib/auth'
import { resolveBackendUrl, API_BASE_URL } from '@/config/api'
import { userApi } from '@/api/endpoints'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const API_BASE = resolveBackendUrl('/api')
import type { TreeMetadata } from '@/types'

type TabId = 'account' | 'trees' | 'privacy' | 'notifications' | 'preferences'

const TABS: Array<{ id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; description: string }> = [
  { id: 'account', label: 'Account', icon: User, description: 'Name, email, password, security' },
  { id: 'trees', label: 'Trees', icon: TreePine, description: 'Per-tree settings and defaults' },
  // { id: 'privacy',       label: 'Privacy',       icon: Shield,  description: 'Default visibility, data export' },
  // { id: 'notifications', label: 'Notifications', icon: Bell,    description: 'Email, push, digest' },
  { id: 'preferences', label: 'Preferences', icon: Sliders, description: 'Language, theme, accessibility' },
]

export function SettingsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const initialTab = (params.get('tab') as TabId) || 'account'
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)
  const user = useAuthStore(s => s.user)
  const { isMobile } = useResponsive()

  useEffect(() => {
    setParams(prev => {
      const p = new URLSearchParams(prev)
      p.set('tab', activeTab)
      return p
    }, { replace: true })
  }, [activeTab, setParams])

  const userInitials = (user?.fullName || user?.email || 'U')
    .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="h-screen flex flex-col bg-[#F6F2EA] dark:bg-[#0a0a0a] text-[#3D2E1F] dark:text-[#F3F2F1]">
      {/* App shell — same nav as dashboard */}
      {isMobile ? (
        <MobileTopBar
          treeName="Settings"
          isCompact={true}
          onSearchOpen={() => navigate('/dashboard')}
          userInitials={userInitials}
        />
      ) : (
        <TopBar
          treeName="Settings"
          onOpenSpotlight={() => navigate('/dashboard')}
          isTreeView={false}
        />
      )}

      {/* Scrollable content area */}
      <main id="main-content" className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 md:px-8 pt-6 pb-16">
          {/* Breadcrumb */}
          <button
            onClick={() => {
              if (window.history.state && window.history.state.idx > 0) {
                navigate(-1)
              } else {
                navigate('/dashboard')
              }
            }}
            className="flex items-center gap-1.5 text-[13px] text-[#8B7355] dark:text-[#888] hover:text-[#2F3E8F] dark:hover:text-[#8CA0FF] mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <h1 className="font-display text-[28px] md:text-[32px] font-semibold mb-1">Settings</h1>
          <p className="text-[14px] text-[#8B7355] dark:text-[#888] mb-6">
            Control your account, trees, and preferences in one place.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
            {/* Tabs — sidebar on desktop, horizontal scroll on mobile */}
            <nav
              aria-label="Settings sections"
              className="md:block flex overflow-x-auto md:overflow-visible gap-1 md:gap-0.5 md:sticky md:top-4 self-start pb-2 md:pb-0 scrollbar-hide"
            >
              {TABS.map(tab => {
                const Icon = tab.icon
                const active = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-2.5 whitespace-nowrap md:w-full rounded-xl px-3 py-2.5 text-[14px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F3E8F]/40 ${active
                      ? 'bg-[#2F3E8F]/[0.08] dark:bg-white/[0.06] text-[#2F3E8F] dark:text-[#8CA0FF] font-semibold'
                      : 'text-[#5B5449] dark:text-[#B8B8B8] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                      }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </nav>

            {/* Panel */}
            <section className="bg-white/70 dark:bg-[#141414] border border-[#E2DBCE]/60 dark:border-[#2a2a2a] rounded-2xl p-5 md:p-7">
              {activeTab === 'account' && <AccountPanel />}
              {activeTab === 'trees' && <TreesPanel />}
              {activeTab === 'privacy' && <PrivacyPanel />}
              {activeTab === 'notifications' && <NotificationsPanel />}
              {activeTab === 'preferences' && <PreferencesPanel />}
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Shared primitives
   ───────────────────────────────────────────────────────────── */

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 className="font-display text-[20px] font-semibold">{title}</h2>
      {subtitle && <p className="text-[13px] text-[#8B7355] dark:text-[#888] mt-0.5">{subtitle}</p>}
    </div>
  )
}

function Row({
  label, hint, children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 border-b border-[#E2DBCE]/50 dark:border-[#2a2a2a] last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-[#3D2E1F] dark:text-[#F3F2F1]">{label}</p>
        {hint && <p className="text-[12px] text-[#8B7355] dark:text-[#888] mt-0.5">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F3E8F]/40 ${checked ? 'bg-[#2F3E8F]' : 'bg-[#D4D0CC] dark:bg-[#3a3a3a]'
        }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </button>
  )
}

function BtnSecondary({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2DBCE]/80 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-[13px] font-medium text-[#3D2E1F] dark:text-[#F3F2F1] px-3 py-1.5 hover:border-[#2F3E8F] hover:text-[#2F3E8F] dark:hover:border-[#8CA0FF] dark:hover:text-[#8CA0FF] transition-colors disabled:opacity-50 disabled:pointer-events-none"
    >
      {children}
    </button>
  )
}

function useLocalBool(key: string, defaultValue: boolean): [boolean, (v: boolean) => void] {
  const [val, setVal] = useState<boolean>(() => {
    try { const s = localStorage.getItem(key); return s == null ? defaultValue : s === 'true' } catch { return defaultValue }
  })
  const update = (v: boolean) => {
    setVal(v)
    try { localStorage.setItem(key, String(v)) } catch { /* noop */ }
  }
  return [val, update]
}

/* ─────────────────────────────────────────────────────────────
   Account
   ───────────────────────────────────────────────────────────── */

function AccountPanel() {
  const user = useAuthStore(s => s.user)
  const signOut = useAuthStore(s => s.signOut)
  const navigate = useNavigate()
  const { toast } = useToast()
  const { currentStreak, longestStreak, freezesAvailable } = useStreak(user?.id)

  const [twoFA, setTwoFA] = useLocalBool('pref_two_fa', false)

  const signOutAll = async () => {
    await signOut()
  }

  const comingSoon = (feature: string) => toast({ title: `${feature} — coming soon`, description: 'This control will be available in a future release.' })

  return (
    <>
      <SectionHeading title="Account" subtitle="Your identity and sign-in." />
      <Row label="Name" hint="Shown to collaborators across your trees.">
        <span className="text-[13px] text-[#8B7355] dark:text-[#888]">{user?.fullName || '—'}</span>
      </Row>
      <Row label="Email" hint="Used for sign-in and notifications.">
        <span className="text-[13px] text-[#8B7355] dark:text-[#888]">{user?.email || '—'}</span>
      </Row>
      {/* <Row label="Password" hint="Change anytime from the reset flow.">
        <BtnSecondary onClick={() => navigate('/reset-password')}>Change password</BtnSecondary>
      </Row>
      <Row label="Two-factor authentication" hint="Extra security on every new device.">
        <Toggle checked={twoFA} onChange={setTwoFA} label="Enable 2FA" />
      </Row>
      <Row label="Passkeys" hint="Sign in without a password on supported devices.">
        <PasskeyManager />
      </Row>
      <Row label="Sessions" hint="Sign out on all other devices.">
        <BtnSecondary onClick={signOutAll}>Sign out all</BtnSecondary>
      </Row>
      <Row label="Delete account" hint="Permanently remove your account and data.">
        <BtnSecondary onClick={() => comingSoon('Account deletion')}>Delete</BtnSecondary>
      </Row> */}

      {/* <div className="pt-6">
        <SectionHeading
          title="Streak & badges"
          subtitle={`Current: ${currentStreak}-day · Longest: ${longestStreak}-day · Freezes: ${freezesAvailable}`}
        />
        <BadgeShelf currentStreak={currentStreak} longestStreak={longestStreak} />
      </div> */}
    </>
  )
}

/* ─────────────────────────────────────────────────────────────
   Trees
   ───────────────────────────────────────────────────────────── */

function TreesPanel() {
  const [trees, setTrees] = useState<TreeMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [defaultTreeId, setDefaultTreeId] = useState<string | null>(() => localStorage.getItem('defaultTreeId'))
  const user = useAuthStore(s => s.user)
  const { toast } = useToast()

  useEffect(() => {
    (async () => {
      if (!user) { setLoading(false); return }
      try {
        const list = await getUserTrees(user.id)
        setTrees(list)
        const defaultTree = list?.find((t: any) => t.isDefault === true)
        if (defaultTree) {
          setDefaultTreeId(defaultTree.treeId)
          try { localStorage.setItem('defaultTreeId', defaultTree.treeId) } catch { /* noop */ }
        }
      } catch { /* keep empty */ }
      finally { setLoading(false) }
    })()
  }, [user])

  const [exporting, setExporting] = useState<string | null>(null)

  const setDefault = async (treeId: string) => {
    try {
      await setDefaultTree(treeId)
      setDefaultTreeId(treeId)
      try { localStorage.setItem('defaultTreeId', treeId) } catch { /* noop */ }
      toast({ title: 'Default tree updated', description: 'This tree will open next time.', variant: 'success' })
    } catch (e) {
      toast({ title: 'Failed to set default tree', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' })
    }
  }

  const handleExport = async (treeId: string, treeName: string, format: 'gedcom' | 'csv') => {
    setExporting(treeId)
    try {
      if (format === 'csv') {
        await exportCsv(treeId, treeName)
        toast({ title: 'Export complete', description: 'CSV file downloaded successfully.', variant: 'success' })
      } else {
        await exportGedcom(treeId, treeName)
        toast({ title: 'Export complete', description: 'GEDCOM file downloaded successfully.', variant: 'success' })
      }
    } catch (e) {
      toast({ title: 'Export failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' })
    } finally {
      setExporting(null)
    }
  }

  return (
    <>
      <SectionHeading title="Trees" subtitle="Default tree and export." />
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-[#B8A090]" /></div>
      ) : trees.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-[#8B7355] dark:text-[#888]">
          You don't have any trees yet.{' '}
          <Link to="/dashboard" className="text-[#2F3E8F] dark:text-[#8CA0FF] hover:underline">Create one</Link>.
        </div>
      ) : (
        <div className="space-y-2">
          {trees.map(t => {
            const isDefault = defaultTreeId === t.treeId
            return (
              <div key={t.treeId} className="flex items-center justify-between gap-3 px-3 py-3 rounded-xl border border-[#E2DBCE]/60 dark:border-[#2a2a2a]">
                <div className="min-w-0">
                  <p className="text-[14px] font-medium truncate">{t.treeName}</p>
                  <p className="text-[12px] text-[#8B7355] dark:text-[#888]">
                    {t.userRole || 'owner'} · {t.personCount} member{t.personCount === 1 ? '' : 's'}
                    {isDefault && <span className="ml-2 inline-flex items-center gap-1 text-[#2F3E8F] dark:text-[#8CA0FF]"><Check className="w-3 h-3" /> default</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!isDefault && <BtnSecondary onClick={() => setDefault(t.treeId)}>Set default</BtnSecondary>}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        disabled={exporting !== null}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2DBCE]/80 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-[13px] font-medium text-[#3D2E1F] dark:text-[#F3F2F1] px-3 py-1.5 hover:border-[#2F3E8F] hover:text-[#2F3E8F] dark:hover:border-[#8CA0FF] dark:hover:text-[#8CA0FF] transition-colors disabled:opacity-50 disabled:pointer-events-none"
                      >
                        {exporting === t.treeId ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Exporting…</>
                        ) : (
                          'Export'
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 bg-white dark:bg-[#1a1a1a] border border-[#E2DBCE]/60 dark:border-[#2a2a2a] p-1">
                      <DropdownMenuItem
                        onClick={() => handleExport(t.treeId, t.treeName, 'csv')}
                        className="flex items-center gap-2 cursor-pointer focus:bg-[#F6F2EA] dark:focus:bg-zinc-800 rounded-md px-3 py-2 text-sm text-[#3D2E1F] dark:text-[#F3F2F1] transition-colors"
                      >
                        <FileText className="w-4 h-4 text-[#2F3E8F] dark:text-[#8CA0FF]" />
                        <span>Export CSV</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExport(t.treeId, t.treeName, 'gedcom')}
                        className="flex items-center gap-2 cursor-pointer focus:bg-[#F6F2EA] dark:focus:bg-zinc-800 rounded-md px-3 py-2 text-sm text-[#3D2E1F] dark:text-[#F3F2F1] transition-colors"
                      >
                        <FileJson className="w-4 h-4 text-[#2F3E8F] dark:text-[#8CA0FF]" />
                        <span>Export GEDCOM</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

/* ─────────────────────────────────────────────────────────────
   Privacy
   ───────────────────────────────────────────────────────────── */

function PrivacyPanel() {
  const [publicDefault, setPublicDefault] = useLocalBool('privacy_public_default', false)
  const [showLivingDob, setShowLivingDob] = useLocalBool('privacy_show_living_dob', false)
  const [showLivingAddress, setShowLivingAddress] = useLocalBool('privacy_show_living_address', false)
  const [exporting, setExporting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const user = useAuthStore(s => s.user)
  const { toast } = useToast()

  const handleExport = async () => {
    if (!user) return
    setExporting(true)
    try {
      const archive = await buildExportArchive({ id: user.id, email: user.email, fullName: user.fullName })
      downloadArchive(archive)
      toast({ title: 'Your archive is downloading', description: `${archive.trees.length} tree${archive.trees.length === 1 ? '' : 's'} included.` })
    } catch (e) {
      toast({
        title: 'Export failed',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally { setExporting(false) }
  }

  return (
    <>
      <SectionHeading title="Privacy" subtitle="Defaults for new members and data you add." />
      <Row label="New members public by default" hint="Uncheck to default to family-only.">
        <Toggle checked={publicDefault} onChange={setPublicDefault} label="Public by default" />
      </Row>
      <Row label="Share date of birth for living members" hint="When off, only decade is shown publicly.">
        <Toggle checked={showLivingDob} onChange={setShowLivingDob} label="Share DOB" />
      </Row>
      <Row label="Share addresses for living members" hint="When off, only city/state is shown.">
        <Toggle checked={showLivingAddress} onChange={setShowLivingAddress} label="Share addresses" />
      </Row>
      <Row label="Download your data" hint="Export all your trees, people, unions, and relationships as a JSON archive.">
        <BtnSecondary onClick={handleExport} disabled={exporting || !user}>
          {exporting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparing…</> : 'Download archive'}
        </BtnSecondary>
      </Row>
      <Row label="Delete all my data" hint="Permanent. This cannot be undone.">
        <BtnSecondary onClick={() => setConfirmingDelete(true)}>Delete data</BtnSecondary>
      </Row>

      {confirmingDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#E2DBCE]/60 dark:border-[#2a2a2a] shadow-xl p-6">
            <h3 id="delete-dialog-title" className="font-display text-[18px] font-semibold text-[#3D2E1F] dark:text-[#F3F2F1]">Delete all your data?</h3>
            <p className="text-[13px] text-[#8B7355] dark:text-[#888] mt-1.5">
              This will remove every tree, person, memory, and comment you own. It cannot be undone.
              Please email <a href="mailto:support@familyaconnect.com" className="text-[#2F3E8F] dark:text-[#8CA0FF] underline">support@familyaconnect.com</a> to begin the deletion process — we'll confirm by reply before anything is removed.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <BtnSecondary onClick={() => setConfirmingDelete(false)}>Cancel</BtnSecondary>
              <a
                href="mailto:support@familyaconnect.com?subject=Delete%20my%20FamilyAConnect%20data"
                onClick={() => setConfirmingDelete(false)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#C53838] hover:brightness-110 text-white text-[13px] font-medium px-3 py-1.5"
              >
                Email support
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ─────────────────────────────────────────────────────────────
   Notifications
   ───────────────────────────────────────────────────────────── */

interface NotifPrefsShape {
  emailEnabled: boolean
  pushEnabled: boolean
  digestMode: boolean
  perType: { birthday: boolean; anniversary: boolean; comment: boolean; cr: boolean; invitation: boolean }
}
const NOTIF_CACHE_KEY = 'notifPrefs.cache'
const DEFAULT_NOTIF_PREFS: NotifPrefsShape = {
  emailEnabled: true, pushEnabled: true, digestMode: false,
  perType: { birthday: true, anniversary: true, comment: true, cr: true, invitation: true },
}

function loadNotifCache(): NotifPrefsShape {
  try {
    const raw = localStorage.getItem(NOTIF_CACHE_KEY)
    if (raw) return { ...DEFAULT_NOTIF_PREFS, ...JSON.parse(raw) }
  } catch { /* noop */ }
  return DEFAULT_NOTIF_PREFS
}
function saveNotifCache(prefs: NotifPrefsShape) {
  try { localStorage.setItem(NOTIF_CACHE_KEY, JSON.stringify(prefs)) } catch { /* noop */ }
}

function NotificationsPanel() {
  const [prefs, setPrefs] = useState<NotifPrefsShape>(() => loadNotifCache())
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const saveTimerRef = useRef<number | null>(null)

  // Hydrate from server on mount.
  useEffect(() => {
    const token = getAuthToken()
    if (!token) return
    let cancelled = false
      ; (async () => {
        try {
          const res = await fetch(`${API_BASE}/notification-prefs`, { headers: { Authorization: `Bearer ${token}` } })
          if (!res.ok) return
          const srv = await res.json() as Partial<NotifPrefsShape>
          if (cancelled) return
          const merged: NotifPrefsShape = {
            emailEnabled: srv.emailEnabled ?? DEFAULT_NOTIF_PREFS.emailEnabled,
            pushEnabled: srv.pushEnabled ?? DEFAULT_NOTIF_PREFS.pushEnabled,
            digestMode: srv.digestMode ?? DEFAULT_NOTIF_PREFS.digestMode,
            perType: { ...DEFAULT_NOTIF_PREFS.perType, ...(srv.perType || {}) },
          }
          setPrefs(merged)
          saveNotifCache(merged)
        } catch { /* offline → keep cache */ }
      })()
    return () => { cancelled = true }
  }, [])

  // Debounced save on change.
  const update = (patch: Partial<NotifPrefsShape>) => {
    const next: NotifPrefsShape = {
      ...prefs,
      ...patch,
      perType: patch.perType ? { ...prefs.perType, ...patch.perType } : prefs.perType,
    }
    setPrefs(next)
    saveNotifCache(next)
    setStatus('saving')
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(async () => {
      const token = getAuthToken()
      if (!token) { setStatus('idle'); return }
      try {
        const res = await fetch(`${API_BASE}/notification-prefs`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(next),
        })
        setStatus(res.ok ? 'saved' : 'error')
        if (res.ok) window.setTimeout(() => setStatus('idle'), 1500)
      } catch { setStatus('error') }
    }, 400)
  }

  const setBool = (key: keyof NotifPrefsShape) => (v: boolean) => update({ [key]: v } as Partial<NotifPrefsShape>)
  const setType = (key: keyof NotifPrefsShape['perType']) => (v: boolean) => update({ perType: { [key]: v } as Partial<NotifPrefsShape['perType']> as NotifPrefsShape['perType'] })

  return (
    <>
      <SectionHeading
        title="Notifications"
        subtitle={
          status === 'saving' ? 'Saving…' :
            status === 'saved' ? 'Saved ✓' :
              status === 'error' ? 'Couldn\'t save. Changes stay on this device.' :
                'Channels and per-type toggles.'
        }
      />
      <Row label="Email notifications"><Toggle checked={prefs.emailEnabled} onChange={setBool('emailEnabled')} label="Email" /></Row>
      <Row label="Push notifications" hint="Only sent on mobile for essential events."><Toggle checked={prefs.pushEnabled} onChange={setBool('pushEnabled')} label="Push" /></Row>
      <Row label="Digest mode" hint="Only show essential notifications (invites, mentions, change requests)."><Toggle checked={prefs.digestMode} onChange={setBool('digestMode')} label="Digest" /></Row>

      <div className="pt-6">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#8B7355] dark:text-[#888] mb-1">By type</h3>
      </div>
      <Row label="Birthdays"><Toggle checked={prefs.perType.birthday} onChange={setType('birthday')} label="Birthdays" /></Row>
      <Row label="Anniversaries"><Toggle checked={prefs.perType.anniversary} onChange={setType('anniversary')} label="Anniversaries" /></Row>
      <Row label="Comments"><Toggle checked={prefs.perType.comment} onChange={setType('comment')} label="Comments" /></Row>
      <Row label="Suggested edits"><Toggle checked={prefs.perType.cr} onChange={setType('cr')} label="Suggested edits" /></Row>
      <Row label="Invitations"><Toggle checked={prefs.perType.invitation} onChange={setType('invitation')} label="Invitations" /></Row>
    </>
  )
}

/* ─────────────────────────────────────────────────────────────
   Preferences
   ───────────────────────────────────────────────────────────── */

import { useTheme } from '@/contexts/ThemeContext'

const INDIAN_LANGUAGES = [
  { code: 'hindi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'bengali', name: 'Bengali', native: 'বাংলা' },
  { code: 'telugu', name: 'Telugu', native: 'తెలుగు' },
  { code: 'marathi', name: 'Marathi', native: 'ਮਰਾਠੀ' },
  { code: 'tamil', name: 'Tamil', native: 'தமிழ்' },
  { code: 'gujarati', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'kannada', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'malayalam', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'odia', name: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'punjabi', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'urdu', name: 'Urdu', native: 'اردو' },
  { code: 'assamese', name: 'Assamese', native: 'অসমীয়া' },
  { code: 'sanskrit', name: 'Sanskrit', native: 'संस्कृतम्' }
]

function PreferencesPanel() {
  const { locale, setLocale } = useTreeStore()
  const { setTheme, resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const [reduceMotion, setReduceMotion] = useLocalBool('pref_reduce_motion', false)
  const [timezone, setTimezone] = useState<string>(() => localStorage.getItem('pref_tz') || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
  const { toast } = useToast()

  const localeOpts = useMemo(() => SUPPORTED_LOCALES, [])

  // Preferred languages state (sessionStorage/user profile bound)
  const [preferredLangs, setPreferredLangs] = useState<string[]>([])
  const [tempLangs, setTempLangs] = useState<string[]>([])
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Direct truth GET fetcher
  const fetchPrefsFromBackend = async (authToken: string) => {
    try {
      let response = await fetch(`${API_BASE_URL}${userApi.exploreRootsUser}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok && response.status === 404) {
        response = await fetch(`${API_BASE_URL}${userApi.exploreRootsUserFallback}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        })
      }

      if (response.ok) {
        const resBody = await response.json()
        const rawLangs = resBody?.data?.feedLanguagePreference ?? resBody?.feedLanguagePreference;
        const langs = Array.isArray(rawLangs) ? rawLangs : (Array.isArray(resBody?.data) ? resBody.data : null);
        if (langs !== null) {
          const langsWithEnglish = langs.includes('english') ? langs : ['english', ...langs];
          setPreferredLangs(langsWithEnglish)
          sessionStorage.setItem('preferredLanguages', JSON.stringify(langsWithEnglish))
          return langsWithEnglish
        }
      }
    } catch (err) {
      console.error('Failed to load preferred languages from API:', err)
    }
    return null
  }

  // Fetch preferences on mount
  useEffect(() => {
    const loadPrefs = async () => {
      setIsLoadingPrefs(true)

      // 1. Try sessionStorage first
      const cached = sessionStorage.getItem('preferredLanguages')
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed)) {
            const parsedWithEnglish = parsed.includes('english') ? parsed : ['english', ...parsed];
            setPreferredLangs(parsedWithEnglish)
          }
        } catch (e) {
          console.warn('Failed to parse cached preferredLanguages:', e)
        }
      }

      // 2. Fetch from backend API
      const authToken = getAuthToken() || localStorage.getItem('auth_token')
      if (authToken) {
        await fetchPrefsFromBackend(authToken)
      }
      setIsLoadingPrefs(false)
    }
    loadPrefs()
  }, [])

  // Persist preferences to sessionStorage and backend database
  const savePrefs = async (langs: string[]) => {
    const authToken = getAuthToken() || localStorage.getItem('auth_token')
    if (!authToken) return

    const langsWithEnglish = langs.includes('english') ? langs : ['english', ...langs]
    setIsSaving(true)
    setIsLoadingPrefs(true) // Display skeleton loading during save and GET fetch cycle!
    try {
      let response = await fetch(`${API_BASE_URL}${userApi.exploreRootsUser}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ feedLanguagePreference: langsWithEnglish })
      })

      if (!response.ok && response.status === 404) {
        response = await fetch(`${API_BASE_URL}${userApi.exploreRootsUserFallback}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ feedLanguagePreference: langsWithEnglish })
        })
      }

      if (response.ok) {
        // Query GET API immediately after success to pull direct truth from server
        const fetchedLangs = await fetchPrefsFromBackend(authToken)

        if (fetchedLangs) {
          toast({
            title: 'Preferences saved ✓',
            description: 'Your preferred languages have been updated.',
          })
        } else {
          // Fallback if GET fails
          sessionStorage.setItem('preferredLanguages', JSON.stringify(langsWithEnglish))
          setPreferredLangs(langsWithEnglish)
        }
      } else {
        throw new Error('API save failed')
      }
    } catch (err) {
      console.error('Failed to save preferred languages:', err)
      toast({
        title: 'Error saving preferences',
        description: 'We couldn\'t save your preferences. Changes were not applied.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
      setIsLoadingPrefs(false)
    }
  }

  const handleAddLanguage = async (code: string) => {
    if (isSaving) return
    if (!preferredLangs.includes(code)) {
      const next = [...preferredLangs, code]
      await savePrefs(next)
    }
  }

  const handleRemoveLanguage = async (code: string) => {
    if (isSaving) return
    const next = preferredLangs.filter(c => c !== code)
    await savePrefs(next)
  }

  const toggleTheme = (next: boolean) => {
    setTheme(next ? 'dark' : 'light')
  }

  const handleLocale = async (code: string) => {
    setLocale(code)
    try { await changeLanguage(code) } catch { /* noop */ }
  }

  const handleTz = (tz: string) => {
    setTimezone(tz)
    try { localStorage.setItem('pref_tz', tz) } catch { /* noop */ }
  }

  const availableLangs = useMemo(() => {
    return INDIAN_LANGUAGES.filter(lang => !preferredLangs.includes(lang.code))
  }, [preferredLangs])

  return (
    <>
      <SectionHeading title="Preferences" subtitle="Language, theme, and accessibility." />
      {/* <Row label="Interface Language" hint="Language used across the interface.">
        <select
          value={locale}
          onChange={e => handleLocale(e.target.value)}
          className="rounded-lg border border-[#E2DBCE]/80 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-[13px] px-2.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F3E8F]/40"
        >
          {localeOpts.map(l => (<option key={l.code} value={l.code}>{l.nativeName} · {l.name}</option>))}
        </select>
      </Row> */}

      <Row label="Preferred Languages" hint="Choose one or more languages to customize your feed and stories.">
        <div className="flex flex-col gap-3 w-full max-w-[360px]">
          {/* Trigger Dropdown & Checklist popover */}
          {isLoadingPrefs ? (
            <div className="h-10 w-[220px] bg-stone-200 dark:bg-stone-800 animate-pulse rounded-lg" />
          ) : (
            <div className="relative w-full" ref={dropdownRef}>
              {/* Trigger Button */}
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  setTempLangs([...preferredLangs])
                  setIsOpen(!isOpen)
                }}
                className="flex w-[220px] items-center justify-between rounded-lg border border-[#E2DBCE]/80 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-[13px] text-stone-700 dark:text-[#E2DBCE] min-h-[40px] focus:outline-none focus:border-[#2F3E8F] focus:ring-2 focus:ring-[#2F3E8F]/20 cursor-pointer disabled:opacity-50 transition-all hover:border-[#E2DBCE]"
              >
                <span className="truncate pr-4 text-left font-semibold text-stone-500 dark:text-stone-400">
                  + Add languages
                </span>
                <ChevronDown className="w-4 h-4 text-stone-400" />
              </button>

              {/* Dropdown Menu Overlap Content */}
              {isOpen && (
                <div className="absolute z-50 top-full mt-1 left-0 bg-white dark:bg-[#151515] border border-[#E2DBCE]/80 dark:border-[#2a2a2a] rounded-lg shadow-xl p-2 max-h-[320px] min-w-[280px] flex flex-col animate-in fade-in-50 slide-in-from-top-2 duration-150">
                  {/* Header: Select All + Close Button */}
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800 mb-1.5 px-1 shrink-0">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={tempLangs.length === INDIAN_LANGUAGES.length}
                        onChange={(e) => {
                          const checked = e.target.checked
                          if (checked) {
                            setTempLangs(INDIAN_LANGUAGES.map(l => l.code))
                          } else {
                            // Fallback to first language
                            setTempLangs([INDIAN_LANGUAGES[0].code])
                          }
                        }}
                        className="w-4.5 h-4.5 rounded border-gray-300 dark:border-stone-700 text-cyan-600 dark:text-cyan-500 focus:ring-cyan-500/30 cursor-pointer"
                      />
                      <span className="text-[12px] font-semibold text-stone-500 dark:text-stone-400">Select All</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Scrollable list */}
                  <div className="overflow-y-auto flex-1 space-y-0.5 pr-0.5 max-h-[180px]">
                    {/* English (always checked, disabled) */}
                    <div
                      className="flex items-center gap-2.5 px-2.5 py-1.5 rounded text-[13px] select-none bg-[#ecfeff] dark:bg-[#083344]/30 text-[#0891b2] dark:text-[#22d3ee] font-medium opacity-80 cursor-default"
                    >
                      <input
                        type="checkbox"
                        checked={true}
                        disabled={true}
                        className="w-4.5 h-4.5 rounded border-gray-300 dark:border-stone-700 text-cyan-600 dark:text-cyan-500 cursor-not-allowed"
                      />
                      <div className="flex items-center justify-between w-full">
                        <span>English</span>
                        <span className="text-[11px] opacity-60 font-normal">English</span>
                      </div>
                    </div>

                    {INDIAN_LANGUAGES.map(lang => {
                      const isChecked = tempLangs.includes(lang.code)
                      return (
                        <label
                          key={lang.code}
                          className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded cursor-pointer text-[13px] select-none transition-colors ${isChecked
                              ? 'bg-[#ecfeff] dark:bg-[#083344]/30 text-[#0891b2] dark:text-[#22d3ee] font-medium'
                              : 'hover:bg-stone-50 dark:hover:bg-stone-900/60 text-stone-700 dark:text-stone-300'
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setTempLangs(prev => prev.filter(c => c !== lang.code))
                              } else {
                                setTempLangs(prev => [...prev, lang.code])
                              }
                            }}
                            className="w-4.5 h-4.5 rounded border-gray-300 dark:border-stone-700 text-cyan-600 dark:text-cyan-500 focus:ring-cyan-500/30 cursor-pointer"
                          />
                          <div className="flex items-center justify-between w-full">
                            <span>{lang.name}</span>
                            <span className="text-[11px] opacity-60 font-normal">{lang.native}</span>
                          </div>
                        </label>
                      )
                    })}
                  </div>

                  {/* Footer: Fixed Save / Cancel buttons */}
                  <div className="pt-2 border-t border-stone-100 dark:border-stone-800 mt-1.5 px-1 shrink-0 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-900 text-[12px] font-medium text-stone-600 dark:text-stone-400 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSaving || tempLangs.length === 0}
                      onClick={async () => {
                        await savePrefs(tempLangs)
                        setIsOpen(false)
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#06b6d4] hover:bg-[#0891b2] dark:bg-[#06b6d4] dark:hover:bg-[#0891b2] text-white text-[12px] font-semibold flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                    >
                      {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Active Chips row */}
          <div className="flex flex-wrap gap-1.5 min-h-[30px] items-center">
            {/* English (always selected, non-removable) */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-stone-100 dark:bg-[#202020] border border-stone-200 dark:border-[#2a2a2a] rounded-full shadow-sm text-[12px] font-medium text-stone-500 dark:text-stone-400 transition-all select-none cursor-default opacity-85">
              <span>English (Default)</span>
            </div>

            {preferredLangs.filter(code => code !== 'english').map(code => {
              const lang = INDIAN_LANGUAGES.find(l => l.code === code)
              if (!lang) return null
              return (
                <div
                  key={code}
                  className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-white dark:bg-[#202020] border border-stone-200 dark:border-[#2a2a2a] rounded-full shadow-sm text-[12px] font-medium text-stone-700 dark:text-stone-300 transition-all select-none"
                >
                  <span>{lang.name}</span>
                  <button
                    type="button"
                    disabled={isSaving || isLoadingPrefs}
                    onClick={() => handleRemoveLanguage(code)}
                    className="p-0.5 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </button>
                </div>
              )
            })}
          </div>

        </div>
      </Row>

      <Row label="Dark mode">
        <Toggle checked={isDark} onChange={toggleTheme} label="Dark mode" />
      </Row>
      {/* <Row label="Reduce motion" hint="Minimise non-essential animations.">
        <Toggle checked={reduceMotion} onChange={setReduceMotion} label="Reduce motion" />
      </Row>
      <Row label="Timezone" hint="Used for birthday notifications and dates.">
        <input
          type="text"
          value={timezone}
          onChange={e => handleTz(e.target.value)}
          className="rounded-lg border border-[#E2DBCE]/80 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-[13px] px-2.5 py-1.5 w-[220px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F3E8F]/40"
        />
      </Row> */}
    </>
  )
}
