/**
 * PredictionDetail — Redesigned cosmic prediction experience.
 *
 * Three-tab interactive layout:
 *   1. Today's Insights — Daily reading with energy, career, money, health, action guide
 *   2. Birth Chart — Vedic chart SVG + planetary positions table
 *   3. Life Profile — Personality, career aptitude, marriage, doshas, yogas
 *
 * Design: Celestial theme with the FamilyAConnect palette (indigo/gold/purple/ivory).
 */

import { useState, useCallback, type ReactNode } from 'react'
import {
  ArrowLeft, Download, Trash2, MoonStar, ChevronDown, ChevronUp,
  Star, Briefcase, Wallet, Heart, Activity, Target, Clover, Sun, Quote,
  Share2, MessageCircle, Mail, Save, Loader2, Check,
  Gem, Shield, AlertTriangle, User, Eye,
} from 'lucide-react'
import { BirthChartDisplay } from './BirthChartDisplay'
import { PlanetaryTable } from './PlanetaryTable'

// ── Types ──

interface PersonalSnapshot {
  birthStar: string
  zodiacSign: string
  luckyNumber: string
  luckyColor: string
  luckyDay: string
  dominantTrait: string
}

interface EnergySection { energyLevel: string; moodTrend: string; outcomeBias: string; explanation: string }
interface CareerSection { progressDirection: string; focus: string; avoid: string; microTiming: string }
interface MoneySection { moneyFlow: string; riskLevel: string; spendingAdvice: string; investmentAdvice: string }
interface SocialSection { interactionTone: string; advice: string }
interface HealthSection { physicalEnergy: string; mentalState: string; suggestion: string }
interface ActionGuide { whatWorks: string; whatToAvoid: string; powerMove: string }
interface LuckyElements { color: string; colorAdvice: string; number: string; numberAdvice: string }
interface TomorrowPreview { overallTrend: string; opportunity: string; caution: string }

export interface AstrologyPrediction {
  personalHook: string
  personalSnapshot: PersonalSnapshot
  todayEnergy: EnergySection
  careerWork: CareerSection
  moneyFinance: MoneySection
  socialRelationships: SocialSection
  healthEnergy: HealthSection
  personalActionGuide: ActionGuide
  luckyElements: LuckyElements
  tomorrowPreview: TomorrowPreview
  emotionalClosing: string
  affirmation: string
  vedicData?: {
    planets: Array<{
      planet: string; sign: string; signLord: string; nakshatra: string
      nakshatraPada: number; degree: number; house: number
      isRetrograde: boolean; isExalted: boolean; isDebilitated: boolean
      navamshaSign: string
    }>
    ascendantSign: string
    moonSign: string
    sunSign: string
    birthNakshatra: string
    birthNakshatraPada: number
    dashas: Array<{ level: string; planet: string; startDate: string; endDate: string; isCurrent: boolean }>
    horoscopePredictions: string[]
    chartSvg: string | null
    chartStyle: string
  }
  horoscopeProfile?: {
    personality: { lagnaTraits: string; moonTraits: string; combinedSummary: string }
    strengths: string[]
    challenges: string[]
    career: { suitableFields: string[]; workStyle: string; careerAdvice: string }
    marriage: { romanticNature: string; partnerTraits: string[]; manglikStatus: string; marriageOutlook: string }
    finance: { moneyNature: string; wealthPotential: string; financialAdvice: string }
    health: { constitution: string; vulnerabilities: string; healthAdvice: string }
    doshas: Array<{ name: string; present: boolean; severity: string; description: string; remedy: string }>
    keyYogas: Array<{ name: string; effect: string }>
    lifeThemes: string[]
    currentPhase: string
  }
}

interface PredictionDetailProps {
  prediction: AstrologyPrediction
  personName: string
  dateOfBirth: string
  timeOfBirth: string | null
  placeOfBirth: string | null
  gender: string
  predictionDate: string
  isSaved?: boolean
  onBack: () => void
  onDelete: () => void
  onSave?: () => Promise<void>
}

// ── Shared UI Primitives ──

function statusColor(value: string): string {
  const v = value.toLowerCase()
  if (['high', 'favorable', 'confident', 'growth', 'inflow', 'supportive', 'harmonious', 'focused', 'calm', 'low risk'].some(k => v.includes(k)))
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
  if (['challenging', 'sensitive', 'outflow', 'conflicting', 'overthinking', 'high risk'].some(k => v.includes(k)))
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  return 'bg-[#2F3E8F]/[0.08] text-[#2F3E8F] dark:bg-[#7B8FD4]/[0.15] dark:text-[#7B8FD4]'
}

function Section({ icon: Icon, title, defaultOpen = false, accentColor, children }: {
  icon: typeof Star; title: string; defaultOpen?: boolean; accentColor?: string; children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-[#E2DBCE]/60 dark:border-[#333] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#2F3E8F]/[0.03] dark:hover:bg-white/[0.03] transition-colors"
      >
        <Icon className={`w-[18px] h-[18px] shrink-0 ${accentColor || 'text-[#4B2C5E] dark:text-[#D4B8E8]'}`} strokeWidth={1.8} />
        <span className="flex-1 text-[14px] font-semibold text-[#3D2E1F] dark:text-[#F3F2F1]">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-[#8B7355] dark:text-[#666]" /> : <ChevronDown className="w-4 h-4 text-[#8B7355] dark:text-[#666]" />}
      </button>
      {open && <div className="px-4 pb-4 animate-fade-in">{children}</div>}
    </div>
  )
}

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusColor(value)}`}>
      <span className="opacity-60">{label}:</span> {value}
    </span>
  )
}

function Chip({ text, variant = 'default' }: { text: string; variant?: 'default' | 'success' | 'warning' | 'purple' | 'gold' }) {
  const colors: Record<string, string> = {
    default: 'bg-[#2F3E8F]/[0.08] text-[#2F3E8F] dark:bg-[#5A6BFF]/[0.15] dark:text-[#7B8FD4]',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    purple: 'bg-[#4B2C5E]/[0.08] text-[#4B2C5E] dark:bg-[#D4B8E8]/[0.15] dark:text-[#D4B8E8]',
    gold: 'bg-[#C2A46D]/[0.12] text-[#5C4A2E] dark:bg-[#C2A46D]/[0.15] dark:text-[#C2A46D]',
  }
  return <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-medium ${colors[variant]}`}>{text}</span>
}

/** Parse traits that may be PascalCase concatenated, comma-separated, an array, etc. */
function parseTraits(text: unknown): string[] {
  if (!text) return []
  // If AI returned an array instead of a string, handle it directly
  if (Array.isArray(text)) return text.map(t => String(t).trim()).filter(Boolean)
  const str = String(text)
  if (!str) return []
  if (str.includes(',')) return str.split(',').map(t => t.trim()).filter(Boolean)
  if (str.includes('\n') || str.includes('•')) return str.split(/[\n•]+/).map(t => t.trim()).filter(Boolean)
  const spaced = str.replace(/([a-z])([A-Z])/g, '$1, $2')
  if (spaced !== str) return spaced.split(',').map(t => t.trim()).filter(Boolean)
  return [str]
}

function TraitChips({ text, variant = 'default' }: { text: unknown; variant?: 'default' | 'purple' }) {
  const traits = parseTraits(text)
  if (traits.length <= 1) return <p className="text-[12px] text-[#3D2E1F] dark:text-[#D4D0CC] leading-relaxed">{String(text ?? '')}</p>
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {traits.map(t => <Chip key={t} text={t} variant={variant === 'purple' ? 'purple' : 'default'} />)}
    </div>
  )
}

// ── Tab definitions ──

type TabId = 'insights' | 'chart' | 'profile'

const TABS: Array<{ id: TabId; label: string; icon: typeof Star }> = [
  { id: 'insights', label: "Today's Insights", icon: Sun },
  { id: 'chart', label: 'Birth Chart', icon: Eye },
  { id: 'profile', label: 'Life Profile', icon: User },
]

// ── Main Component ──

export function PredictionDetail({
  prediction: p,
  personName,
  dateOfBirth,
  timeOfBirth,
  placeOfBirth,
  gender,
  predictionDate,
  isSaved,
  onBack,
  onDelete,
  onSave,
}: PredictionDetailProps) {
  const [activeTab, setActiveTab] = useState<TabId>('insights')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  const formattedDate = (() => {
    try {
      const d = new Date(predictionDate);
      if (isNaN(d.getTime())) return predictionDate;
      const weekday = d.toLocaleDateString('en-IN', { weekday: 'long' });
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = String(d.getFullYear()).slice(-2);
      return `${weekday}, ${dd}-${mm}-${yy}`;
    } catch {
      return predictionDate;
    }
  })();

  const userDetails = { fullName: personName, dateOfBirth, timeOfBirth: timeOfBirth || '', placeOfBirth: placeOfBirth || '', gender }

  const handleDownloadPdf = useCallback(async () => {
    try {
      const { exportAstrologyPDF } = await import('@/services/astrologyPdfService')
      await exportAstrologyPDF(p, userDetails)
    } catch (err: unknown) {
      console.error('PDF export failed:', err instanceof Error ? err.message : String(err))
    }
  }, [p, userDetails])

  const handleSave = useCallback(async () => {
    if (!onSave || isSaving) return
    setIsSaving(true)
    try { await onSave(); setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 3000) }
    catch { /* silent */ }
    finally { setIsSaving(false) }
  }, [onSave, isSaving])

  const handleShare = useCallback(async (method: 'whatsapp' | 'email') => {
    setIsSharing(true)
    try {
      const { generateAstrologyPDFFile } = await import('@/services/astrologyPdfService')
      const file = await generateAstrologyPDFFile(p, userDetails)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Cosmic Prediction for ${personName}`, text: `${personName}'s cosmic prediction from FamNMe!`, files: [file],
        })
      } else if (method === 'whatsapp') {
        const text = encodeURIComponent(`Cosmic Prediction for ${personName}\n\nZodiac: ${p.personalSnapshot.zodiacSign}\nBirth Star: ${p.personalSnapshot.birthStar}\n\n"${p.personalHook}"\n\n— FamNMe | familyaconnect.com`)
        window.open(`https://wa.me/?text=${text}`, '_blank')
      } else {
        const subject = encodeURIComponent(`Cosmic Prediction for ${personName}`)
        const body = encodeURIComponent(`Hi,\n\n${personName}'s cosmic prediction:\nZodiac: ${p.personalSnapshot.zodiacSign}\nBirth Star: ${p.personalSnapshot.birthStar}\n\n"${p.personalHook}"\n\n— FamNMe | familyaconnect.com`)
        window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
        const url = URL.createObjectURL(file); const a = document.createElement('a'); a.href = url; a.download = file.name; a.click(); URL.revokeObjectURL(url)
      }
    } catch (err: unknown) { if (err instanceof Error && err.name !== 'AbortError') console.error('Share failed:', err.message) }
    finally { setIsSharing(false); setShowShareMenu(false) }
  }, [p, personName, userDetails])

  const hp = p.horoscopeProfile
  const vd = p.vedicData

  return (
    <div className="animate-fade-in">
      {/* ═══ HERO HEADER ═══ */}
      <div className="relative -mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-4">
        <div className="bg-gradient-to-br from-[#1A1040] via-[#2F3E8F] to-[#4B2C5E] px-5 pt-4 pb-5 md:px-6">
          {/* Back button */}
          <button onClick={onBack} className="flex items-center gap-1.5 text-[12px] text-white/60 hover:text-white/90 transition-colors mb-3">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>

          {/* Person info + date */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
                <MoonStar className="w-6 h-6 text-[#C2A46D]" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-[18px] font-bold text-white font-['Playfair_Display',Georgia,serif]">{personName}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-[#C2A46D] font-medium">{p.personalSnapshot.zodiacSign}</span>
                  <span className="w-1 h-1 rounded-full bg-white/30" />
                  <span className="text-[11px] text-white/50">{p.personalSnapshot.birthStar}</span>
                  {vd && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-white/30" />
                      <span className="text-[11px] text-white/50">Lagna: {vd.ascendantSign}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Date */}
          <p className="text-[11px] text-white/40 mt-3">{formattedDate}</p>

          {/* Quick snapshot row */}
          <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-none">
            {[
              { label: 'Lucky Number', value: p.personalSnapshot.luckyNumber },
              { label: 'Lucky Color', value: p.personalSnapshot.luckyColor },
              { label: 'Lucky Day', value: p.personalSnapshot.luckyDay },
              { label: 'Today', value: p.personalSnapshot.dominantTrait },
            ].map(item => (
              <div key={item.label} className="shrink-0 px-3 py-2 rounded-xl bg-white/[0.07] backdrop-blur-sm ring-1 ring-white/[0.08]">
                <p className="text-[9px] uppercase tracking-wider text-white/40">{item.label}</p>
                <p className="text-[12px] font-semibold text-white/90 mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Personal hook banner */}
        <div className="mx-4 md:mx-6 -mt-3 relative z-10">
          <div className="rounded-xl bg-white dark:bg-[#1E1E1E] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] ring-1 ring-[#C2A46D]/15 dark:ring-[#C2A46D]/10">
            <p className="text-[13px] text-[#3D2E1F] dark:text-[#F3F2F1] leading-relaxed italic">
              &ldquo;{p.personalHook}&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* ═══ TABS ═══ */}
      <div className="flex gap-1 p-1 rounded-xl bg-[#F6F2EA]/80 dark:bg-[#1A1A1A] ring-1 ring-[#E2DBCE]/40 dark:ring-[#333] mb-4">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[12px] font-semibold transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white dark:bg-[#2A2A2A] text-[#2F3E8F] dark:text-[#7B8FD4] shadow-sm ring-1 ring-[#E2DBCE]/30 dark:ring-[#444]'
                : 'text-[#8B7355] dark:text-gray-500 hover:text-[#3D2E1F] dark:hover:text-gray-300'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" strokeWidth={2} />
            <span className="hidden md:inline">{tab.label}</span>
            <span className="md:hidden">{tab.label.split(' ').pop()}</span>
          </button>
        ))}
      </div>

      {/* ═══ TAB CONTENT ═══ */}
      <div className="space-y-3">
        {/* ─── TAB 1: TODAY'S INSIGHTS ─── */}
        {activeTab === 'insights' && (
          <>
            {/* Energy Overview */}
            <Section icon={Sun} title="Today's Energy" defaultOpen>
              <div className="flex flex-wrap gap-1.5 mb-3">
                <Badge label="Energy" value={p.todayEnergy.energyLevel} />
                <Badge label="Mood" value={p.todayEnergy.moodTrend} />
                <Badge label="Outcome" value={p.todayEnergy.outcomeBias} />
              </div>
              <p className="text-[13px] text-[#3D2E1F]/80 dark:text-[#D4D0CC]/80 leading-relaxed">{p.todayEnergy.explanation}</p>
            </Section>

            {/* Career */}
            <Section icon={Briefcase} title="Career & Work" defaultOpen>
              <Badge label="Direction" value={p.careerWork.progressDirection} />
              <div className="space-y-2.5 mt-3">
                <div><p className="text-[11px] font-semibold text-[#2F3E8F] dark:text-[#7B8FD4] uppercase tracking-wider mb-0.5">Focus On</p><p className="text-[13px] text-[#3D2E1F]/80 dark:text-[#D4D0CC]/80 leading-relaxed">{p.careerWork.focus}</p></div>
                <div><p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-0.5">Avoid</p><p className="text-[13px] text-[#3D2E1F]/80 dark:text-[#D4D0CC]/80 leading-relaxed">{p.careerWork.avoid}</p></div>
                <div className="rounded-lg bg-[#2F3E8F]/[0.04] dark:bg-[#7B8FD4]/[0.08] p-2.5">
                  <p className="text-[11px] font-semibold text-[#2F3E8F] dark:text-[#7B8FD4] uppercase tracking-wider mb-0.5">Best Timing</p>
                  <p className="text-[13px] text-[#3D2E1F]/80 dark:text-[#D4D0CC]/80">{p.careerWork.microTiming}</p>
                </div>
              </div>
            </Section>

            {/* Money */}
            <Section icon={Wallet} title="Money & Finance">
              <div className="flex flex-wrap gap-1.5 mb-3"><Badge label="Flow" value={p.moneyFinance.moneyFlow} /><Badge label="Risk" value={p.moneyFinance.riskLevel} /></div>
              <p className="text-[13px] text-[#3D2E1F]/80 dark:text-[#D4D0CC]/80 leading-relaxed mb-2">{p.moneyFinance.spendingAdvice}</p>
              <p className="text-[13px] text-[#3D2E1F]/80 dark:text-[#D4D0CC]/80 leading-relaxed">{p.moneyFinance.investmentAdvice}</p>
            </Section>

            {/* Relationships */}
            <Section icon={Heart} title="Relationships & Social" accentColor="text-rose-500 dark:text-rose-400">
              <Badge label="Tone" value={p.socialRelationships.interactionTone} />
              <p className="text-[13px] text-[#3D2E1F]/80 dark:text-[#D4D0CC]/80 leading-relaxed mt-3">{p.socialRelationships.advice}</p>
            </Section>

            {/* Health */}
            <Section icon={Activity} title="Health & Energy" accentColor="text-emerald-600 dark:text-emerald-400">
              <div className="flex flex-wrap gap-1.5 mb-3"><Badge label="Physical" value={p.healthEnergy.physicalEnergy} /><Badge label="Mental" value={p.healthEnergy.mentalState} /></div>
              <p className="text-[13px] text-[#3D2E1F]/80 dark:text-[#D4D0CC]/80 leading-relaxed">{p.healthEnergy.suggestion}</p>
            </Section>

            {/* Action Guide */}
            <Section icon={Target} title="Personal Action Guide" defaultOpen>
              <div className="space-y-2.5">
                <div className="flex items-start gap-2"><span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">+</span><p className="text-[13px] text-[#3D2E1F]/80 dark:text-[#D4D0CC]/80 leading-relaxed">{p.personalActionGuide.whatWorks}</p></div>
                <div className="flex items-start gap-2"><span className="shrink-0 w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-[10px] text-amber-700 dark:text-amber-400 font-bold">!</span><p className="text-[13px] text-[#3D2E1F]/80 dark:text-[#D4D0CC]/80 leading-relaxed">{p.personalActionGuide.whatToAvoid}</p></div>
                <div className="rounded-lg bg-gradient-to-r from-[#4B2C5E]/[0.06] to-[#2F3E8F]/[0.04] dark:from-[#4B2C5E]/[0.12] dark:to-[#2F3E8F]/[0.08] p-3 ring-1 ring-[#4B2C5E]/[0.08] dark:ring-[#4B2C5E]/[0.15]">
                  <p className="text-[11px] font-bold text-[#4B2C5E] dark:text-[#D4B8E8] uppercase tracking-wider mb-1">Power Move</p>
                  <p className="text-[13px] font-medium text-[#3D2E1F] dark:text-[#F3F2F1] leading-relaxed">{p.personalActionGuide.powerMove}</p>
                </div>
              </div>
            </Section>

            {/* Lucky Elements */}
            <Section icon={Clover} title="Lucky Elements" accentColor="text-[#C2A46D]">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-lg bg-white dark:bg-[#242424] p-3 ring-1 ring-[#E2DBCE]/40 dark:ring-[#333]">
                  <div className="flex items-center gap-2 mb-1"><div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#C2A46D] to-[#4B2C5E]" /><p className="text-[13px] font-semibold text-[#3D2E1F] dark:text-[#F3F2F1]">{p.luckyElements.color}</p></div>
                  <p className="text-[11px] text-[#8B7355] dark:text-[#A19F9D] leading-relaxed">{p.luckyElements.colorAdvice}</p>
                </div>
                <div className="rounded-lg bg-white dark:bg-[#242424] p-3 ring-1 ring-[#E2DBCE]/40 dark:ring-[#333]">
                  <p className="text-[18px] font-bold text-[#2F3E8F] dark:text-[#7B8FD4] mb-0.5">{p.luckyElements.number}</p>
                  <p className="text-[11px] text-[#8B7355] dark:text-[#A19F9D] leading-relaxed">{p.luckyElements.numberAdvice}</p>
                </div>
              </div>
            </Section>

            {/* Tomorrow Preview */}
            <Section icon={Sun} title="Tomorrow Preview">
              <p className="text-[13px] text-[#3D2E1F]/80 dark:text-[#D4D0CC]/80 leading-relaxed mb-2">{p.tomorrowPreview.overallTrend}</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2"><span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-[10px] text-emerald-700 font-bold">+</span><p className="text-[13px] text-[#3D2E1F]/80 dark:text-[#D4D0CC]/80 leading-relaxed">{p.tomorrowPreview.opportunity}</p></div>
                <div className="flex items-start gap-2"><span className="shrink-0 w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-[10px] text-amber-700 font-bold">!</span><p className="text-[13px] text-[#3D2E1F]/80 dark:text-[#D4D0CC]/80 leading-relaxed">{p.tomorrowPreview.caution}</p></div>
              </div>
            </Section>

            {/* Closing + Affirmation */}
            <div className="rounded-xl bg-gradient-to-br from-[#C2A46D]/[0.10] to-[#4B2C5E]/[0.06] dark:from-[#C2A46D]/[0.15] dark:to-[#4B2C5E]/[0.10] p-4 ring-1 ring-[#C2A46D]/[0.15] dark:ring-[#C2A46D]/[0.20]">
              <Quote className="w-5 h-5 text-[#C2A46D] mb-2" strokeWidth={1.5} />
              <p className="text-[14px] text-[#3D2E1F] dark:text-[#F3F2F1] leading-relaxed italic mb-3">{p.emotionalClosing}</p>
              <div className="h-px bg-[#C2A46D]/20 my-3" />
              <p className="text-[12px] font-semibold text-[#4B2C5E] dark:text-[#D4B8E8] uppercase tracking-wider mb-1">Today&apos;s Affirmation</p>
              <p className="text-[13px] text-[#3D2E1F]/80 dark:text-[#D4D0CC]/80 italic">&ldquo;{p.affirmation}&rdquo;</p>
            </div>
          </>
        )}

        {/* ─── TAB 2: BIRTH CHART ─── */}
        {activeTab === 'chart' && (
          <>
            {vd ? (
              <>
                <BirthChartDisplay planets={vd.planets} ascendantSign={vd.ascendantSign} chartStyle={vd.chartStyle} />
                <PlanetaryTable planets={vd.planets} ascendantSign={vd.ascendantSign} moonSign={vd.moonSign} birthNakshatra={vd.birthNakshatra} />
                {vd.horoscopePredictions.length > 0 && (
                  <Section icon={Star} title="Classical Vedic Predictions">
                    <ul className="space-y-1.5">{vd.horoscopePredictions.map((pred, i) => (
                      <li key={i} className="text-[12px] text-[#3D2E1F] dark:text-[#D4D0CC] leading-relaxed pl-3 border-l-2 border-[#C2A46D]/30 dark:border-[#8B7355]/30">{pred}</li>
                    ))}</ul>
                  </Section>
                )}
              </>
            ) : (
              <div className="text-center py-12 px-6">
                <div className="w-16 h-16 rounded-2xl bg-[#2F3E8F]/10 dark:bg-[#5A6BFF]/15 flex items-center justify-center mx-auto mb-4">
                  <Eye className="w-8 h-8 text-[#2F3E8F] dark:text-[#7B8FD4]" strokeWidth={1.5} />
                </div>
                <h3 className="text-[15px] font-semibold text-[#3D2E1F] dark:text-[#F3F2F1] mb-2">Birth Chart Not Available</h3>
                <p className="text-[12px] text-[#8B7355] dark:text-gray-500 max-w-[260px] mx-auto leading-relaxed">
                  Provide time and place of birth to generate an accurate Vedic birth chart with planetary positions.
                </p>
              </div>
            )}
          </>
        )}

        {/* ─── TAB 3: LIFE PROFILE ─── */}
        {activeTab === 'profile' && hp && (
          <>
            {/* Personality */}
            <Section icon={User} title="Personality & Character" defaultOpen>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-3">
                <div className="rounded-lg bg-[#2F3E8F]/[0.04] dark:bg-[#5A6BFF]/[0.08] p-3 ring-1 ring-[#2F3E8F]/[0.08] dark:ring-[#5A6BFF]/[0.15]">
                  <p className="text-[10px] uppercase tracking-wider text-[#2F3E8F] dark:text-[#7B8FD4] font-semibold mb-1">Lagna (Outer Self)</p>
                  <TraitChips text={hp.personality.lagnaTraits} variant="default" />
                </div>
                <div className="rounded-lg bg-[#4B2C5E]/[0.04] dark:bg-[#D4B8E8]/[0.08] p-3 ring-1 ring-[#4B2C5E]/[0.08] dark:ring-[#D4B8E8]/[0.15]">
                  <p className="text-[10px] uppercase tracking-wider text-[#4B2C5E] dark:text-[#D4B8E8] font-semibold mb-1">Moon Sign (Inner Self)</p>
                  <TraitChips text={hp.personality.moonTraits} variant="purple" />
                </div>
              </div>
              <p className="text-[13px] text-[#3D2E1F] dark:text-[#F3F2F1] leading-relaxed italic border-l-2 border-[#C2A46D]/40 pl-3">{hp.personality.combinedSummary}</p>
            </Section>

            {/* Strengths & Challenges */}
            <Section icon={Target} title="Strengths & Growth Areas" defaultOpen>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><p className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold mb-2">Strengths</p>
                  {hp.strengths.map((s, i) => <div key={i} className="flex items-start gap-2 mb-1.5 text-[12px] text-[#3D2E1F] dark:text-[#D4D0CC]"><span className="text-emerald-500 mt-0.5 font-bold">+</span><span>{s}</span></div>)}
                </div>
                <div><p className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold mb-2">Growth Areas</p>
                  {hp.challenges.map((c, i) => <div key={i} className="flex items-start gap-2 mb-1.5 text-[12px] text-[#3D2E1F] dark:text-[#D4D0CC]"><span className="text-amber-500 mt-0.5">~</span><span>{c}</span></div>)}
                </div>
              </div>
            </Section>

            {/* Career */}
            <Section icon={Briefcase} title="Career Aptitude">
              <div className="mb-2.5"><p className="text-[10px] uppercase tracking-wider text-[#8B7355] dark:text-gray-400 font-semibold mb-1.5">Suitable Fields</p>
                <div className="flex flex-wrap gap-1.5">{hp.career.suitableFields.map(f => <Chip key={f} text={f} />)}</div></div>
              <p className="text-[12px] text-[#3D2E1F] dark:text-[#D4D0CC] leading-relaxed mb-2">{hp.career.workStyle}</p>
              <div className="rounded-lg bg-[#C2A46D]/[0.08] dark:bg-[#C2A46D]/[0.12] p-2.5 ring-1 ring-[#C2A46D]/[0.15]">
                <p className="text-[11px] text-[#5C4A2E] dark:text-[#C2A46D] font-medium">{hp.career.careerAdvice}</p></div>
            </Section>

            {/* Marriage */}
            <Section icon={Heart} title="Marriage & Relationships" accentColor="text-rose-500 dark:text-rose-400">
              <p className="text-[12px] text-[#3D2E1F] dark:text-[#D4D0CC] leading-relaxed mb-2.5">{hp.marriage.romanticNature}</p>
              <div className="mb-2.5"><p className="text-[10px] uppercase tracking-wider text-[#8B7355] dark:text-gray-400 font-semibold mb-1.5">Ideal Partner Traits</p>
                <div className="flex flex-wrap gap-1.5">{hp.marriage.partnerTraits.map(t => <Chip key={t} text={t} variant="purple" />)}</div></div>
              <div className="flex items-start gap-2 rounded-lg bg-[#F6F2EA] dark:bg-[#242424] p-2.5 ring-1 ring-[#E2DBCE]/40 dark:ring-[#333]">
                <Shield className="w-3.5 h-3.5 text-[#2F3E8F] dark:text-[#7B8FD4] mt-0.5 shrink-0" />
                <div><p className="text-[11px] font-semibold text-[#2F3E8F] dark:text-[#7B8FD4]">Manglik: {hp.marriage.manglikStatus}</p>
                  <p className="text-[11px] text-[#3D2E1F] dark:text-[#D4D0CC] mt-0.5">{hp.marriage.marriageOutlook}</p></div>
              </div>
            </Section>

            {/* Finance */}
            <Section icon={Wallet} title="Financial Nature" accentColor="text-[#C2A46D]">
              <p className="text-[12px] text-[#3D2E1F] dark:text-[#D4D0CC] leading-relaxed mb-2">{hp.finance.moneyNature}</p>
              <p className="text-[12px] text-[#3D2E1F] dark:text-[#D4D0CC] leading-relaxed mb-2">{hp.finance.wealthPotential}</p>
              <div className="rounded-lg bg-[#C2A46D]/[0.08] dark:bg-[#C2A46D]/[0.12] p-2.5 ring-1 ring-[#C2A46D]/[0.15]">
                <p className="text-[11px] text-[#5C4A2E] dark:text-[#C2A46D] font-medium">{hp.finance.financialAdvice}</p></div>
            </Section>

            {/* Health */}
            <Section icon={Activity} title="Health & Constitution" accentColor="text-emerald-600 dark:text-emerald-400">
              <p className="text-[12px] text-[#3D2E1F] dark:text-[#D4D0CC] leading-relaxed mb-1">{hp.health.constitution}</p>
              <p className="text-[12px] text-[#3D2E1F] dark:text-[#D4D0CC] leading-relaxed mb-2">{hp.health.vulnerabilities}</p>
              <p className="text-[12px] text-emerald-700 dark:text-emerald-400 font-medium">{hp.health.healthAdvice}</p>
            </Section>

            {/* Doshas */}
            {hp.doshas.length > 0 && (
              <Section icon={AlertTriangle} title="Doshas" accentColor="text-amber-600 dark:text-amber-400">
                <div className="space-y-2.5">{hp.doshas.map((d, i) => (
                  <div key={i} className={`rounded-lg p-3 ring-1 ${d.present ? 'bg-amber-50 dark:bg-amber-900/10 ring-amber-200/40 dark:ring-amber-700/30' : 'bg-emerald-50 dark:bg-emerald-900/10 ring-emerald-200/40 dark:ring-emerald-700/30'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[12px] font-semibold ${d.present ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>{d.name}</span>
                      <Chip text={d.present ? d.severity : 'Not Present'} variant={d.present ? 'warning' : 'success'} />
                    </div>
                    <p className="text-[11px] text-[#3D2E1F] dark:text-[#D4D0CC] leading-relaxed">{d.description}</p>
                    {d.present && d.remedy && <p className="text-[11px] text-[#2F3E8F] dark:text-[#7B8FD4] mt-1 font-medium">Remedy: {d.remedy}</p>}
                  </div>
                ))}</div>
              </Section>
            )}

            {/* Yogas */}
            {hp.keyYogas.length > 0 && (
              <Section icon={Gem} title="Auspicious Yogas" accentColor="text-[#C2A46D]">
                <div className="space-y-2">{hp.keyYogas.map((y, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#C2A46D]/15 flex items-center justify-center shrink-0 mt-0.5"><Gem className="w-2.5 h-2.5 text-[#C2A46D]" /></span>
                    <div><p className="text-[12px] font-semibold text-[#3D2E1F] dark:text-[#F3F2F1]">{y.name}</p><p className="text-[11px] text-[#8B7355] dark:text-[#A19F9D]">{y.effect}</p></div>
                  </div>
                ))}</div>
              </Section>
            )}

            {/* Life Themes + Current Phase */}
            <Section icon={Star} title="Life Themes & Current Phase">
              <div className="mb-3"><p className="text-[10px] uppercase tracking-wider text-[#8B7355] dark:text-gray-400 font-semibold mb-1.5">Major Life Themes</p>
                <div className="flex flex-wrap gap-1.5">{hp.lifeThemes.map(t => <Chip key={t} text={t} variant="gold" />)}</div></div>
              <div className="rounded-lg bg-gradient-to-br from-[#4B2C5E]/[0.06] to-[#C2A46D]/[0.08] dark:from-[#4B2C5E]/[0.15] dark:to-[#C2A46D]/[0.12] p-3 ring-1 ring-[#C2A46D]/[0.15]">
                <p className="text-[10px] uppercase tracking-wider text-[#4B2C5E] dark:text-[#D4B8E8] font-semibold mb-1">Current Dasha Phase</p>
                <p className="text-[12px] text-[#3D2E1F] dark:text-[#F3F2F1] leading-relaxed">{hp.currentPhase}</p>
              </div>
            </Section>
          </>
        )}

        {activeTab === 'profile' && !hp && (
          <div className="text-center py-12 px-6">
            <div className="w-16 h-16 rounded-2xl bg-[#4B2C5E]/10 dark:bg-[#D4B8E8]/15 flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-[#4B2C5E] dark:text-[#D4B8E8]" strokeWidth={1.5} />
            </div>
            <h3 className="text-[15px] font-semibold text-[#3D2E1F] dark:text-[#F3F2F1] mb-2">Life Profile Not Available</h3>
            <p className="text-[12px] text-[#8B7355] dark:text-gray-500 max-w-[260px] mx-auto leading-relaxed">
              Generate a new prediction with time and place of birth for a detailed life profile analysis.
            </p>
          </div>
        )}
      </div>

      {/* ═══ ACTION BUTTONS ═══ */}
      <div className="space-y-3 pt-4 pb-4">
        <div className="flex gap-2.5">
          {onSave && !isSaved && (
            <button type="button" onClick={handleSave} disabled={isSaving || saveSuccess}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#4B2C5E] to-[#2F3E8F] hover:from-[#5C3670] hover:to-[#3A4DA0] disabled:opacity-60 text-white text-[13px] font-semibold shadow-md transition-all active:scale-[0.98]">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Prediction'}
            </button>
          )}
          <button type="button" onClick={handleDownloadPdf}
            className={`${onSave && !isSaved ? '' : 'flex-1'} flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-[#E2DBCE] dark:border-[#333] hover:bg-[#2F3E8F]/[0.04] dark:hover:bg-white/[0.04] text-[13px] font-semibold text-[#3D2E1F] dark:text-[#D4D0CC] transition-colors`}>
            <Download className="w-4 h-4" /> PDF
          </button>
          <div className="relative">
            <button type="button" onClick={() => setShowShareMenu(!showShareMenu)} disabled={isSharing}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-[#E2DBCE] dark:border-[#333] hover:bg-[#2F3E8F]/[0.04] dark:hover:bg-white/[0.04] text-[13px] font-semibold text-[#3D2E1F] dark:text-[#D4D0CC] transition-colors">
              {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />} Share
            </button>
            {showShareMenu && (
              <div className="absolute right-0 bottom-full mb-2 w-52 bg-white dark:bg-[#242424] rounded-xl border border-[#E2DBCE]/60 dark:border-[#333] shadow-xl z-20 overflow-hidden animate-fade-in">
                <button onClick={() => handleShare('whatsapp')} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#F6F2EA] dark:hover:bg-[#2A2A2A] transition-colors">
                  <div className="w-8 h-8 rounded-full bg-[#25D366]/10 flex items-center justify-center"><MessageCircle className="w-4 h-4 text-[#25D366]" /></div>
                  <div><p className="text-[13px] font-medium text-[#3D2E1F] dark:text-[#F3F2F1]">WhatsApp</p><p className="text-[10px] text-[#8B7355] dark:text-[#A19F9D]">Share prediction PDF</p></div>
                </button>
                <div className="h-px bg-[#E2DBCE]/40 dark:bg-[#333]" />
                <button onClick={() => handleShare('email')} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#F6F2EA] dark:hover:bg-[#2A2A2A] transition-colors">
                  <div className="w-8 h-8 rounded-full bg-[#2F3E8F]/10 flex items-center justify-center"><Mail className="w-4 h-4 text-[#2F3E8F]" /></div>
                  <div><p className="text-[13px] font-medium text-[#3D2E1F] dark:text-[#F3F2F1]">Email</p><p className="text-[10px] text-[#8B7355] dark:text-[#A19F9D]">Send with PDF</p></div>
                </button>
              </div>
            )}
          </div>
        </div>
        {isSaved && (
          <button type="button" onClick={onDelete} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200/60 dark:border-red-900/20 hover:bg-red-50 dark:hover:bg-red-900/10 text-[12px] font-medium text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Delete prediction
          </button>
        )}
      </div>
    </div>
  )
}
