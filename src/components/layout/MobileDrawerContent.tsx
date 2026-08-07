/**
 * MobileDrawerContent — B3 accordion redesign.
 *
 * Structure:
 *  - Profile card (avatar, name, email)
 *  - Quick actions row: 4 chips (Invite · Today · Export · Settings)
 *  - Accordion groups — one expanded at a time:
 *      Heritage · Community · Tree tools · Account · Support
 *  - Sign out (red, isolated)
 */

import { useState } from 'react'
import {
  User, TreesIcon, Users, Eye, BookOpen, Landmark, Newspaper,
  LayoutGrid, Download, Printer, FileText,
  Route, Lightbulb, Merge, Map as MapIcon, Clock, List, BarChart3,
  UserPlus, Activity, Bookmark, Settings, MessageSquareText, LogOut,
  ChevronRight, ChevronDown, Gem, Image as ImageIcon, HelpCircle,
  Globe, Calendar, MapPin, Building2,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import type { LayoutMode } from '@/store/treeStore'
import type { BloodRelationMode } from '@/types'

type DrawerContext = 'dashboard' | 'tree-loaded' | 'tree-canvas'

interface MobileDrawerContentProps {
  context: DrawerContext
  treeName?: string
  layoutMode?: LayoutMode
  onLayoutModeChange?: (mode: LayoutMode) => void
  bloodRelationMode?: BloodRelationMode
  onBloodRelationModeChange?: (mode: BloodRelationMode) => void
  onOpenGridSettings?: () => void
  onDownloadImage?: () => void
  onPrint?: () => void
  onExportPDF?: () => void
  onOpenRelationshipPath?: () => void
  onOpenSuggestions?: () => void
  onOpenDuplicates?: () => void
  onOpenMigrationMap?: () => void
  onOpenTimeline?: () => void
  onOpenDescendancyList?: () => void
  hasPersonSelected?: boolean
  onOpenStatistics?: () => void
  onOpenAllPeople?: () => void
  onOpenTreeOverview?: () => void
  onOpenMemories?: () => void
  onOpenDailyShare?: () => void
  onOpenInvite?: () => void
  onOpenSources?: () => void
  onOpenActivityFeed?: () => void
  onOpenBookmarks?: () => void
  onOpenTreeManager?: () => void
  onOpenTemples?: () => void
  onOpenFamily?: () => void
  onOpenProfile?: () => void
  onOpenTreeSettings?: () => void
  pendingEditCount?: number
  onOpenPendingEdits?: () => void
  onOpenFeedback?: () => void
  onOpenSettings?: () => void
  onOpenHelp?: () => void
  onClose: () => void
}

type AccordionId = 'heritage' | 'community' | 'tree-tools' | 'account' | 'support' | null

export function MobileDrawerContent(props: MobileDrawerContentProps) {
  const {
    context, treeName,
    layoutMode, onLayoutModeChange,
    onOpenGridSettings, onDownloadImage, onPrint, onExportPDF,
    onOpenRelationshipPath, onOpenSuggestions, onOpenDuplicates,
    onOpenMigrationMap, onOpenTimeline, onOpenDescendancyList, hasPersonSelected, onOpenStatistics,
    onOpenAllPeople, onOpenTreeOverview, onOpenMemories, onOpenDailyShare,
    onOpenInvite, onOpenSources,
    onOpenActivityFeed, onOpenBookmarks,
    onOpenTreeManager, onOpenTemples, onOpenFamily, onOpenProfile, onOpenTreeSettings,
    pendingEditCount, onOpenPendingEdits,
    onOpenFeedback, onOpenSettings, onOpenHelp,
    onClose,
  } = props

  const { user, signOut } = useAuthStore()
  const navigate = useNavigate()
  const [openAccordion, setOpenAccordion] = useState<AccordionId>(null)

  const fullName = user?.fullName || 'User'
  const email = user?.email || ''
  const initials = fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  const handleSignOut = async () => {
    onClose()
    await signOut()
  }

  const act = (fn?: () => void) => fn ? () => { fn(); onClose() } : undefined

  const isCanvas = context === 'tree-canvas'
  const isTreeLoaded = context === 'tree-loaded' || context === 'tree-canvas'

  const toggle = (id: AccordionId) => setOpenAccordion(prev => prev === id ? null : id)

  return (
    <div className="pb-8 bg-[#F2EFE9] dark:bg-[#000000]" style={{ minHeight: '100%' }}>
      {/* Profile card */}
      <div className="px-4 pt-5 pb-3">
        <button
          onClick={act(onOpenProfile)}
          className="ios-card p-4 flex items-center gap-3.5 w-full"
          disabled={!onOpenProfile}
        >
          <div className="w-[52px] h-[52px] rounded-full bg-gradient-to-br from-[#2F3E8F] to-[#4B2C5E] flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-[18px] font-bold text-white">{initials}</span>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[17px] font-semibold text-[#3D2E1F] dark:text-[#F3F2F1] truncate">{fullName}</p>
            <p className="text-[13px] text-[#8B7355] dark:text-[#8d8d93] truncate">{email}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[#C7C7CC] dark:text-[#48484A] flex-shrink-0" strokeWidth={2.5} />
        </button>
      </div>

      {/* Quick actions row */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-4 gap-2">
          <QuickChip icon={UserPlus} label="Invite" color="#2F3E8F" onClick={act(onOpenInvite)} />
          <QuickChip icon={Gem} label="Today" color="#C2A46D" onClick={act(onOpenDailyShare)} />
          <QuickChip icon={Download} label="Export" color="#2F3E8F" onClick={act(onDownloadImage || onExportPDF)} />
          <QuickChip icon={Settings} label="Settings" color="#8B7355" onClick={act(onOpenSettings || onOpenTreeSettings)} />
        </div>
      </div>

      {/* Dashboard-only primary destinations */}
      {context === 'dashboard' && (
        <div className="mx-4 ios-card mb-2">
          <IOSRow icon={TreesIcon} label="My Trees" action={act(onOpenTreeManager)} />
          {onOpenFamily && (<><div className="ios-separator" /><IOSRow icon={Users} label="Family" action={act(onOpenFamily)} /></>)}
          {onOpenDailyShare && (<><div className="ios-separator" /><IOSRow icon={Newspaper} label="Daily Share" action={act(onOpenDailyShare)} /></>)}
        </div>
      )}

      {/* Accordion groups */}
      <div className="px-4 space-y-2">
        {/* Heritage */}
        <AccordionSection
          id="heritage"
          label="Heritage"
          description="Gotra, festivals, sacred places"
          open={openAccordion === 'heritage'}
          onToggle={() => toggle('heritage')}
        >
          <IOSRow icon={Globe}    label="Gotra & Lineage" action={act(onOpenTemples)} />
          <div className="ios-separator" />
          <IOSRow icon={Calendar} label="Festivals"       action={act(onOpenTemples)} />
          <div className="ios-separator" />
          <IOSRow icon={MapPin}   label="Sacred Places"   action={act(onOpenTemples)} />
          <div className="ios-separator" />
          <IOSRow icon={Building2} label="Temples"        action={act(onOpenTemples)} />
          {onOpenMigrationMap && (<><div className="ios-separator" /><IOSRow icon={MapIcon} label="Migration" action={act(onOpenMigrationMap)} /></>)}
        </AccordionSection>

        {/* Community
        <AccordionSection
          id="community"
          label="Community"
          description="Daily share, collaborators"
          open={openAccordion === 'community'}
          onToggle={() => toggle('community')}
        >
          {onOpenDailyShare && (<><IOSRow icon={Newspaper} label="Daily Share" action={act(onOpenDailyShare)} /><div className="ios-separator" /></>)}
          <IOSRow icon={UserPlus} label="Invite Collaborator" action={act(onOpenInvite)} />
          {onOpenSources && (<><div className="ios-separator" /><IOSRow icon={BookOpen} label="Sources & Evidence" action={act(onOpenSources)} /></>)}
        </AccordionSection>
        */}

        {/* Tree tools — canvas + tree-loaded */}
        {isTreeLoaded && (
          <AccordionSection
            id="tree-tools"
            label="Tree tools"
            description={treeName || 'Canvas, analysis, export'}
            open={openAccordion === 'tree-tools'}
            onToggle={() => toggle('tree-tools')}
          >
            {onOpenAllPeople && (<><IOSRow icon={Users} label="All People" action={act(onOpenAllPeople)} /><div className="ios-separator" /></>)}
            {onOpenTreeOverview && (<><IOSRow icon={Eye} label="Tree Overview" action={act(onOpenTreeOverview)} /><div className="ios-separator" /></>)}
            {onOpenMemories && (<><IOSRow icon={BookOpen} label="Memories" action={act(onOpenMemories)} /><div className="ios-separator" /></>)}
            {isCanvas && layoutMode && onLayoutModeChange && (
              <>
                <IOSRow icon={LayoutGrid} label="Grid Settings" action={act(onOpenGridSettings)} />
                <div className="ios-separator" />
                <IOSRow icon={LayoutGrid} label={`Layout: ${layoutLabel(layoutMode)}`} action={() => { /* open full picker */ onLayoutModeChange(layoutMode === 'tree' ? 'ancestry-pedigree' : 'tree'); onClose() }} />
                <div className="ios-separator" />
              </>
            )}
            {isCanvas && onOpenRelationshipPath && (<><IOSRow icon={Route} label="Relationship Path" action={act(onOpenRelationshipPath)} /><div className="ios-separator" /></>)}
            {isCanvas && onOpenSuggestions && (<><IOSRow icon={Lightbulb} label="Smart Suggestions" action={act(onOpenSuggestions)} /><div className="ios-separator" /></>)}
            {isCanvas && onOpenDuplicates && (<><IOSRow icon={Merge} label="Duplicate Detection" action={act(onOpenDuplicates)} /><div className="ios-separator" /></>)}
            {isCanvas && onOpenTimeline && (<><IOSRow icon={Clock} label="Timeline" action={act(onOpenTimeline)} /><div className="ios-separator" /></>)}
            {isCanvas && onOpenDescendancyList && (<><IOSRow icon={List} label="Descendancy List" action={act(onOpenDescendancyList)} disabled={!hasPersonSelected} subtitle={!hasPersonSelected ? 'Select a person first' : undefined} /><div className="ios-separator" /></>)}
            {isCanvas && onOpenStatistics && (<><IOSRow icon={BarChart3} label="Statistics" action={act(onOpenStatistics)} /><div className="ios-separator" /></>)}
            {onOpenActivityFeed && (<><IOSRow icon={Activity} label="Activity Feed" action={act(onOpenActivityFeed)} /><div className="ios-separator" /></>)}
            {onOpenBookmarks && (<><IOSRow icon={Bookmark} label="Bookmarks" action={act(onOpenBookmarks)} /><div className="ios-separator" /></>)}
            {onDownloadImage && (<><IOSRow icon={Download} label="Download Image" action={act(onDownloadImage)} /><div className="ios-separator" /></>)}
            {onPrint && (<><IOSRow icon={Printer} label="Print" action={act(onPrint)} /><div className="ios-separator" /></>)}
            {onExportPDF && <IOSRow icon={FileText} label="Export PDF" action={act(onExportPDF)} />}
          </AccordionSection>
        )}

        {/* Account */}
        <AccordionSection
          id="account"
          label="Account"
          description="Profile, settings, preferences"
          open={openAccordion === 'account'}
          onToggle={() => toggle('account')}
        >
          {onOpenProfile && (<><IOSRow icon={User} label="Profile" action={act(onOpenProfile)} /><div className="ios-separator" /></>)}
          {onOpenTemples && (<><IOSRow icon={Landmark} label="Your Identity" action={act(onOpenTemples)} /><div className="ios-separator" /></>)}
          {onOpenMemories && (<><IOSRow icon={ImageIcon} label="Memories" action={act(onOpenMemories)} /><div className="ios-separator" /></>)}
          {isTreeLoaded && onOpenTreeSettings && (<><IOSRow icon={Settings} label="Tree Settings" action={act(onOpenTreeSettings)} /><div className="ios-separator" /></>)}
          {onOpenSettings && (<><IOSRow icon={Settings} label="Settings" action={act(onOpenSettings)} /><div className="ios-separator" /></>)}
          {(pendingEditCount ?? 0) > 0 && onOpenPendingEdits && (
            <>
              <IOSRow icon={Clock} label="Pending Edits" action={act(onOpenPendingEdits)} badge={String(pendingEditCount)} />
              <div className="ios-separator" />
            </>
          )}
        </AccordionSection>

        {/* Support */}
        <AccordionSection
          id="support"
          label="Support"
          description="Help, send feedback"
          open={openAccordion === 'support'}
          onToggle={() => toggle('support')}
        >
          {onOpenHelp && (<><IOSRow icon={HelpCircle} label="Help" action={act(onOpenHelp)} /><div className="ios-separator" /></>)}
          {onOpenFeedback && <IOSRow icon={MessageSquareText} label="Send Feedback" action={act(onOpenFeedback)} />}
        </AccordionSection>
      </div>

      {/* Sign Out */}
      <div className="mx-4 mt-6 ios-card">
        <button onClick={handleSignOut} className="ios-list-row w-full justify-center min-h-[48px]">
          <LogOut className="w-[18px] h-[18px] text-[#FF3B30] mr-2" strokeWidth={1.8} />
          <span className="text-[15px] font-medium text-[#FF3B30]">Sign Out</span>
        </button>
      </div>

      <div className="h-8" />
    </div>
  )
}

function layoutLabel(mode: LayoutMode): string {
  switch (mode) {
    case 'tree':              return 'Vertical'
    case 'ancestry-pedigree': return 'Horizontal'
    case 'fan':               return 'Fan'
    default:                  return 'Vertical'

  }
}

function QuickChip({
  icon: Icon, label, color, onClick,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; style?: React.CSSProperties }>
  label: string
  color: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="ios-card flex flex-col items-center justify-center gap-1.5 py-3 px-2 disabled:opacity-40 disabled:pointer-events-none min-h-[72px] active:scale-[0.97] transition-transform"
    >
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} style={{ color }} />
      </div>
      <span className="text-[11px] font-semibold text-[#3D2E1F] dark:text-[#F3F2F1]">{label}</span>
    </button>
  )
}

function AccordionSection({
  id, label, description, open, onToggle, children,
}: {
  id: string
  label: string
  description?: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="ios-card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`accordion-panel-${id}`}
        className="w-full flex items-center gap-3 px-4 py-3 min-h-[48px] active:bg-black/[0.03] dark:active:bg-white/[0.05] transition-colors"
      >
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[15px] font-semibold text-[#3D2E1F] dark:text-[#F3F2F1]">{label}</p>
          {description && (
            <p className="text-[12px] text-[#8B7355]/80 dark:text-[#8d8d93] mt-0.5 truncate">{description}</p>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[#8B7355] dark:text-[#8d8d93] flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>
      {open && (
        <div id={`accordion-panel-${id}`} className="border-t border-[#E2DBCE]/60 dark:border-[#2a2a2a]">
          {children}
        </div>
      )}
    </div>
  )
}

function IOSRow({
  icon: Icon, label, action, disabled, subtitle, badge,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; style?: React.CSSProperties }>
  label: string
  action?: () => void
  disabled?: boolean
  subtitle?: string
  badge?: string
}) {
  return (
    <button
      onClick={action}
      disabled={disabled || !action}
      className="ios-list-row w-full disabled:opacity-40 disabled:pointer-events-none min-h-[48px]"
    >
      <div className="w-[30px] h-[30px] rounded-[7px] flex items-center justify-center flex-shrink-0 bg-[#2F3E8F]/[0.08] dark:bg-[#5A6BFF]/[0.12]">
        <Icon className="w-4 h-4 text-[#2F3E8F] dark:text-[#7B8FD4]" strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <span className="text-[15px] text-[#3D2E1F] dark:text-[#F3F2F1]">{label}</span>
        {subtitle && <p className="text-[11px] text-[#8B7355]/70 dark:text-[#8d8d93] mt-0.5">{subtitle}</p>}
      </div>
      {badge && (
        <span className="min-w-[20px] h-5 bg-[#FF3B30] rounded-full flex items-center justify-center px-1.5">
          <span className="text-[11px] font-bold text-white">{badge}</span>
        </span>
      )}
      <ChevronRight className="w-[14px] h-[14px] text-[#C7C7CC] dark:text-[#48484A] flex-shrink-0" strokeWidth={2.5} />
    </button>
  )
}
