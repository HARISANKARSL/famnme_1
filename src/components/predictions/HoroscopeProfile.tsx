/**
 * HoroscopeProfile — Comprehensive Vedic horoscope personality & life analysis.
 *
 * Displays: Personality, strengths/challenges, career, marriage, finance,
 * health, doshas, yogas, and life themes — the key areas both North and
 * South Indian astrology traditions focus on.
 */

import { useState } from 'react'
import {
  User, Briefcase, Heart, Wallet, Activity, AlertTriangle,
  Gem, Target, ChevronDown, ChevronUp, Shield, Star,
} from 'lucide-react'

interface HoroscopeProfileData {
  personality: {
    lagnaTraits: string
    moonTraits: string
    combinedSummary: string
  }
  strengths: string[]
  challenges: string[]
  career: {
    suitableFields: string[]
    workStyle: string
    careerAdvice: string
  }
  marriage: {
    romanticNature: string
    partnerTraits: string[]
    manglikStatus: string
    marriageOutlook: string
  }
  finance: {
    moneyNature: string
    wealthPotential: string
    financialAdvice: string
  }
  health: {
    constitution: string
    vulnerabilities: string
    healthAdvice: string
  }
  doshas: Array<{
    name: string
    present: boolean
    severity: string
    description: string
    remedy: string
  }>
  keyYogas: Array<{
    name: string
    effect: string
  }>
  lifeThemes: string[]
  currentPhase: string
}

interface HoroscopeProfileProps {
  profile: HoroscopeProfileData
}

// ── Collapsible Section ──

function ProfileSection({ icon: Icon, title, defaultOpen = false, accentColor, children }: {
  icon: typeof Star; title: string; defaultOpen?: boolean; accentColor?: string; children: React.ReactNode
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
      {open && <div className="px-4 pb-4 space-y-3 animate-fade-in">{children}</div>}
    </div>
  )
}

function Chip({ text, variant = 'default' }: { text: string; variant?: 'default' | 'success' | 'warning' }) {
  const colors = {
    default: 'bg-[#2F3E8F]/[0.08] text-[#2F3E8F] dark:bg-[#5A6BFF]/[0.15] dark:text-[#7B8FD4]',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  }
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-medium ${colors[variant]}`}>
      {text}
    </span>
  )
}

/**
 * Parse a traits string that may be:
 * - Comma-separated: "Disciplined, Pragmatic, Ambitious"
 * - PascalCase concatenated: "DisciplinedPragmaticAmbitiousPatient"
 * - Newline-separated, bullet-separated, etc.
 * Returns an array of individual traits.
 */
function parseTraits(text: string): string[] {
  if (!text) return []

  // If it contains commas, split by comma
  if (text.includes(',')) {
    return text.split(',').map(t => t.trim()).filter(Boolean)
  }

  // If it contains newlines or bullet points
  if (text.includes('\n') || text.includes('•') || text.includes('-')) {
    return text.split(/[\n•\-]+/).map(t => t.trim()).filter(Boolean)
  }

  // Try to split PascalCase: "DisciplinedPragmaticAmbitiousPatient" → ["Disciplined", "Pragmatic", ...]
  // Insert space before each uppercase letter that follows a lowercase letter
  const spaced = text.replace(/([a-z])([A-Z])/g, '$1, $2')
  if (spaced !== text) {
    return spaced.split(',').map(t => t.trim()).filter(Boolean)
  }

  // Also handle hyphenated words like "Service-oriented" inside PascalCase
  const spacedWithHyphen = text.replace(/([a-z])([A-Z])/g, '$1, $2').replace(/([a-z])-([a-z])/gi, '$1-$2')
  if (spacedWithHyphen.includes(',')) {
    return spacedWithHyphen.split(',').map(t => t.trim()).filter(Boolean)
  }

  // Fallback: return as single item
  return [text]
}

function TraitChips({ text, variant }: { text: string; variant?: 'indigo' | 'purple' }) {
  const traits = parseTraits(text)
  const colors = variant === 'purple'
    ? 'bg-[#4B2C5E]/[0.08] text-[#4B2C5E] dark:bg-[#D4B8E8]/[0.15] dark:text-[#D4B8E8]'
    : 'bg-[#2F3E8F]/[0.08] text-[#2F3E8F] dark:bg-[#5A6BFF]/[0.15] dark:text-[#7B8FD4]'

  if (traits.length <= 1) {
    // Single string — render as paragraph
    return <p className="text-[12px] text-[#3D2E1F] dark:text-[#D4D0CC] leading-relaxed">{text}</p>
  }

  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {traits.map((trait) => (
        <span key={trait} className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${colors}`}>
          {trait}
        </span>
      ))}
    </div>
  )
}

export function HoroscopeProfile({ profile }: HoroscopeProfileProps) {
  return (
    <div className="space-y-2.5">
      {/* Section Header */}
      <div className="flex items-center gap-2 px-1">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4B2C5E] to-[#2F3E8F] flex items-center justify-center">
          <Star className="w-3.5 h-3.5 text-[#C2A46D]" strokeWidth={2} />
        </div>
        <h2 className="text-[16px] font-bold text-[#3D2E1F] dark:text-[#F3F2F1] font-['Playfair_Display',Georgia,serif]">
          Horoscope Profile
        </h2>
      </div>

      {/* Personality & Character */}
      <ProfileSection icon={User} title="Personality & Character" defaultOpen>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div className="rounded-lg bg-[#2F3E8F]/[0.04] dark:bg-[#5A6BFF]/[0.08] p-3 ring-1 ring-[#2F3E8F]/[0.08] dark:ring-[#5A6BFF]/[0.15]">
              <p className="text-[10px] uppercase tracking-wider text-[#2F3E8F] dark:text-[#7B8FD4] font-semibold mb-1">Lagna (Outer Self)</p>
              <TraitChips text={profile.personality.lagnaTraits} variant="indigo" />
            </div>
            <div className="rounded-lg bg-[#4B2C5E]/[0.04] dark:bg-[#D4B8E8]/[0.08] p-3 ring-1 ring-[#4B2C5E]/[0.08] dark:ring-[#D4B8E8]/[0.15]">
              <p className="text-[10px] uppercase tracking-wider text-[#4B2C5E] dark:text-[#D4B8E8] font-semibold mb-1">Moon Sign (Inner Self)</p>
              <TraitChips text={profile.personality.moonTraits} variant="purple" />
            </div>
          </div>
          <p className="text-[13px] text-[#3D2E1F] dark:text-[#F3F2F1] leading-relaxed italic border-l-2 border-[#C2A46D]/40 pl-3">
            {profile.personality.combinedSummary}
          </p>
        </div>
      </ProfileSection>

      {/* Strengths & Challenges */}
      <ProfileSection icon={Target} title="Strengths & Challenges" defaultOpen>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold mb-2">Natural Strengths</p>
            <div className="space-y-1.5">
              {profile.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-[12px] text-[#3D2E1F] dark:text-[#D4D0CC]">
                  <span className="text-emerald-500 mt-0.5">+</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold mb-2">Growth Areas</p>
            <div className="space-y-1.5">
              {profile.challenges.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-[12px] text-[#3D2E1F] dark:text-[#D4D0CC]">
                  <span className="text-amber-500 mt-0.5">~</span>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ProfileSection>

      {/* Career & Profession */}
      <ProfileSection icon={Briefcase} title="Career & Profession">
        <div className="space-y-2.5">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#8B7355] dark:text-gray-400 font-semibold mb-1.5">Suitable Fields</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.career.suitableFields.map((f) => (
                <Chip key={f} text={f} />
              ))}
            </div>
          </div>
          <p className="text-[12px] text-[#3D2E1F] dark:text-[#D4D0CC] leading-relaxed">{profile.career.workStyle}</p>
          <div className="rounded-lg bg-[#C2A46D]/[0.08] dark:bg-[#C2A46D]/[0.12] p-2.5 ring-1 ring-[#C2A46D]/[0.15]">
            <p className="text-[11px] text-[#5C4A2E] dark:text-[#C2A46D] font-medium">{profile.career.careerAdvice}</p>
          </div>
        </div>
      </ProfileSection>

      {/* Marriage & Relationships */}
      <ProfileSection icon={Heart} title="Marriage & Relationships" accentColor="text-rose-500 dark:text-rose-400">
        <div className="space-y-2.5">
          <p className="text-[12px] text-[#3D2E1F] dark:text-[#D4D0CC] leading-relaxed">{profile.marriage.romanticNature}</p>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#8B7355] dark:text-gray-400 font-semibold mb-1.5">Ideal Partner Traits</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.marriage.partnerTraits.map((t) => (
                <Chip key={t} text={t} />
              ))}
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-[#F6F2EA] dark:bg-[#242424] p-2.5 ring-1 ring-[#E2DBCE]/40 dark:ring-[#333]">
            <Shield className="w-3.5 h-3.5 text-[#2F3E8F] dark:text-[#7B8FD4] mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] font-semibold text-[#2F3E8F] dark:text-[#7B8FD4]">Manglik Status: {profile.marriage.manglikStatus}</p>
              <p className="text-[11px] text-[#3D2E1F] dark:text-[#D4D0CC] mt-0.5">{profile.marriage.marriageOutlook}</p>
            </div>
          </div>
        </div>
      </ProfileSection>

      {/* Financial Outlook */}
      <ProfileSection icon={Wallet} title="Financial Outlook" accentColor="text-[#C2A46D] dark:text-[#C2A46D]">
        <div className="space-y-2">
          <p className="text-[12px] text-[#3D2E1F] dark:text-[#D4D0CC] leading-relaxed">{profile.finance.moneyNature}</p>
          <p className="text-[12px] text-[#3D2E1F] dark:text-[#D4D0CC] leading-relaxed">{profile.finance.wealthPotential}</p>
          <div className="rounded-lg bg-[#C2A46D]/[0.08] dark:bg-[#C2A46D]/[0.12] p-2.5 ring-1 ring-[#C2A46D]/[0.15]">
            <p className="text-[11px] text-[#5C4A2E] dark:text-[#C2A46D] font-medium">{profile.finance.financialAdvice}</p>
          </div>
        </div>
      </ProfileSection>

      {/* Health */}
      <ProfileSection icon={Activity} title="Health & Vitality" accentColor="text-emerald-600 dark:text-emerald-400">
        <div className="space-y-2">
          <p className="text-[12px] text-[#3D2E1F] dark:text-[#D4D0CC] leading-relaxed">{profile.health.constitution}</p>
          <p className="text-[12px] text-[#3D2E1F] dark:text-[#D4D0CC] leading-relaxed">{profile.health.vulnerabilities}</p>
          <p className="text-[12px] text-emerald-700 dark:text-emerald-400 font-medium">{profile.health.healthAdvice}</p>
        </div>
      </ProfileSection>

      {/* Doshas */}
      {profile.doshas.length > 0 && (
        <ProfileSection icon={AlertTriangle} title="Doshas (Planetary Afflictions)" accentColor="text-amber-600 dark:text-amber-400">
          <div className="space-y-2.5">
            {profile.doshas.map((d, i) => (
              <div key={i} className={`rounded-lg p-3 ring-1 ${
                d.present
                  ? 'bg-amber-50 dark:bg-amber-900/10 ring-amber-200/40 dark:ring-amber-700/30'
                  : 'bg-emerald-50 dark:bg-emerald-900/10 ring-emerald-200/40 dark:ring-emerald-700/30'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[12px] font-semibold ${d.present ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                    {d.name}
                  </span>
                  <Chip
                    text={d.present ? d.severity : 'Not Present'}
                    variant={d.present ? 'warning' : 'success'}
                  />
                </div>
                <p className="text-[11px] text-[#3D2E1F] dark:text-[#D4D0CC] leading-relaxed">{d.description}</p>
                {d.present && d.remedy && (
                  <p className="text-[11px] text-[#2F3E8F] dark:text-[#7B8FD4] mt-1 font-medium">Remedy: {d.remedy}</p>
                )}
              </div>
            ))}
          </div>
        </ProfileSection>
      )}

      {/* Key Yogas */}
      {profile.keyYogas.length > 0 && (
        <ProfileSection icon={Gem} title="Auspicious Yogas" accentColor="text-[#C2A46D] dark:text-[#C2A46D]">
          <div className="space-y-2">
            {profile.keyYogas.map((y, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#C2A46D]/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Gem className="w-2.5 h-2.5 text-[#C2A46D]" />
                </span>
                <div>
                  <p className="text-[12px] font-semibold text-[#3D2E1F] dark:text-[#F3F2F1]">{y.name}</p>
                  <p className="text-[11px] text-[#8B7355] dark:text-[#A19F9D]">{y.effect}</p>
                </div>
              </div>
            ))}
          </div>
        </ProfileSection>
      )}

      {/* Life Themes & Current Phase */}
      <ProfileSection icon={Star} title="Life Themes & Current Phase">
        <div className="space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#8B7355] dark:text-gray-400 font-semibold mb-1.5">Major Life Themes</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.lifeThemes.map((t) => (
                <Chip key={t} text={t} />
              ))}
            </div>
          </div>
          <div className="rounded-lg bg-gradient-to-br from-[#4B2C5E]/[0.06] to-[#C2A46D]/[0.08] dark:from-[#4B2C5E]/[0.15] dark:to-[#C2A46D]/[0.12] p-3 ring-1 ring-[#C2A46D]/[0.15]">
            <p className="text-[10px] uppercase tracking-wider text-[#4B2C5E] dark:text-[#D4B8E8] font-semibold mb-1">Current Dasha Phase</p>
            <p className="text-[12px] text-[#3D2E1F] dark:text-[#F3F2F1] leading-relaxed">{profile.currentPhase}</p>
          </div>
        </div>
      </ProfileSection>
    </div>
  )
}
