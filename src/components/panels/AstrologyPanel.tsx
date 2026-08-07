/**
 * AstrologyPanel — Full-featured astrology prediction panel.
 *
 * Features: Family member autocomplete, auto-fill, save to DB, share via WhatsApp/Email.
 * Opens as a right-side slide-in panel (desktop) or full-screen overlay (mobile).
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useResponsive } from '@/hooks/useResponsive'
import { API_BASE_URL } from '@/config/api'
import type { Person } from '@/types'
import { fetchTreeWindow } from '@/services/neo4jDataService'
import {
  savePrediction as savePredictionApi,
} from '@/services/predictionApiService'
import {
  X, MoonStar, ChevronDown, ChevronUp, Star, Briefcase, Wallet,
  Heart, Activity, Target, Clover, Sun, Quote, Loader2,
  Download, RotateCcw, User, Calendar, Clock, MapPin,
  Save, Share2, MessageCircle, Mail, Check, UserCheck,
} from 'lucide-react'

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

interface AstrologyPrediction {
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
}

interface FormData {
  fullName: string
  dateOfBirth: string
  timeOfBirth: string
  placeOfBirth: string
  gender: string
}

interface AstrologyPanelProps {
  onClose: () => void
  persons?: Person[]
  treeId?: string
}

// ── Status badge colors ──

function statusColor(value: string): string {
  const v = value.toLowerCase()
  if (['high', 'favorable', 'confident', 'growth', 'inflow', 'supportive', 'harmonious', 'focused', 'calm', 'low risk'].some(k => v.includes(k))) {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
  }
  if (['challenging', 'sensitive', 'outflow', 'conflicting', 'overthinking', 'high risk'].some(k => v.includes(k))) {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  }
  return 'bg-[#2F3E8F]/[0.08] text-[#2F3E8F] dark:bg-[#7B8FD4]/[0.15] dark:text-[#7B8FD4]'
}

// ── Loading messages ──

const LOADING_MESSAGES = [
  'Reading your cosmic energy...',
  'Aligning the stars for you...',
  'Consulting the celestial chart...',
  'Preparing your personalized insights...',
]

// ── Collapsible Section ──

function Section({ icon: Icon, title, defaultOpen = false, children }: {
  icon: typeof Star; title: string; defaultOpen?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-[#E2DBCE]/60 dark:border-[#333] rounded-xl overflow-hidden transition-all duration-200">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#2F3E8F]/[0.03] dark:hover:bg-white/[0.03] transition-colors">
        <Icon className="w-[18px] h-[18px] text-[#4B2C5E] dark:text-[#D4B8E8] shrink-0" strokeWidth={1.8} />
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
      <span className="opacity-60">{label}:</span>
      {value}
    </span>
  )
}

// ── Main component ──

export function AstrologyPanel({ onClose, persons, treeId }: AstrologyPanelProps) {
  const { isMobile } = useResponsive()
  const { user, token } = useAuthStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const [state, setState] = useState<'form' | 'loading' | 'results' | 'error'>('form')
  const [prediction, setPrediction] = useState<AstrologyPrediction | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0])
  const [form, setForm] = useState<FormData>({
    fullName: user?.fullName || '',
    dateOfBirth: '',
    timeOfBirth: '',
    placeOfBirth: '',
    gender: '',
  })

  // ── Fallback persons (if not passed via props) ──
  const [fallbackPersons, setFallbackPersons] = useState<Person[]>([])
  const availablePersons = persons && persons.length > 0 ? persons : fallbackPersons

  useEffect(() => {
    if (persons && persons.length > 0) return
    if (!treeId) return
    fetchTreeWindow(treeId).then(data => {
      if (data.persons.length > 0) setFallbackPersons(data.persons)
    }).catch(() => {/* silent */})
  }, [treeId, persons])

  // ── Autocomplete state ──
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [highlightedIdx, setHighlightedIdx] = useState(-1)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // ── Save & Share state ──
  const [isSaved, setIsSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  // ── Filter persons ──
  const filteredPersons = useMemo(() => {
    if (!availablePersons.length || !form.fullName || form.fullName.length < 1) return []
    if (selectedPerson) return []
    const q = form.fullName.toLowerCase()
    return availablePersons
      .filter(p => !p.isDeleted)
      .filter(p => {
        const full = `${p.firstName} ${p.lastName}`.toLowerCase()
        return full.includes(q) || p.firstName.toLowerCase().includes(q) || p.lastName.toLowerCase().includes(q)
      })
      .slice(0, 8)
  }, [availablePersons, form.fullName, selectedPerson])

  // ── Close suggestions on outside click ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          nameInputRef.current && !nameInputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Select person from autocomplete ──
  const handleSelectPerson = useCallback((person: Person) => {
    setSelectedPerson(person)
    setShowSuggestions(false)
    setHighlightedIdx(-1)
    setForm({
      fullName: `${person.firstName} ${person.lastName}`.trim(),
      dateOfBirth: person.birthDate || '',
      timeOfBirth: '',
      placeOfBirth: person.birthPlace || '',
      gender: person.gender || '',
    })
  }, [])

  const handleClearPerson = useCallback(() => {
    setSelectedPerson(null)
    setForm(prev => ({ ...prev, fullName: '' }))
    setTimeout(() => nameInputRef.current?.focus(), 50)
  }, [])

  // Cycle loading messages
  useEffect(() => {
    if (state !== 'loading') return
    let idx = 0
    const interval = setInterval(() => {
      idx = (idx + 1) % LOADING_MESSAGES.length
      setLoadingMsg(LOADING_MESSAGES[idx])
    }, 2500)
    return () => clearInterval(interval)
  }, [state])

  // Scroll to top when results arrive
  useEffect(() => {
    if (state === 'results' && scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [state])

  const updateField = useCallback((field: keyof FormData, value: string) => {
    if (field === 'fullName') {
      setSelectedPerson(null)
      setShowSuggestions(true)
      setHighlightedIdx(-1)
    }
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!form.fullName || !form.dateOfBirth || !form.gender) return

    setState('loading')
    setErrorMsg('')
    setIsSaved(false)
    setSaveSuccess(false)

    try {
      const res = await fetch(`${API_BASE_URL}/astrology/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fullName: form.fullName,
          dateOfBirth: form.dateOfBirth,
          timeOfBirth: form.timeOfBirth || undefined,
          placeOfBirth: form.placeOfBirth || undefined,
          gender: form.gender,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Server error' }))
        throw new Error((data as { error?: string }).error || 'Failed to generate prediction')
      }

      const data = await res.json() as { prediction: AstrologyPrediction }
      setPrediction(data.prediction)
      setState('results')

      // Auto-save to backend (non-blocking)
      try {
        await savePredictionApi({
          personName: form.fullName,
          dateOfBirth: form.dateOfBirth,
          timeOfBirth: form.timeOfBirth || undefined,
          placeOfBirth: form.placeOfBirth || undefined,
          gender: form.gender,
          zodiacSign: data.prediction.personalSnapshot?.zodiacSign || '',
          birthStar: data.prediction.personalSnapshot?.birthStar || '',
          predictionData: JSON.stringify(data.prediction),
        })
        setIsSaved(true)
      } catch {
        // Auto-save failed — user can save manually
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setState('error')
    }
  }, [form, token])

  const handleNewPrediction = useCallback(() => {
    setState('form')
    setPrediction(null)
    setIsSaved(false)
    setSaveSuccess(false)
    setShowShareMenu(false)
  }, [])

  // ── Save prediction manually ──
  const handleSave = useCallback(async () => {
    if (!prediction || isSaving || isSaved) return
    setIsSaving(true)
    try {
      await savePredictionApi({
        personName: form.fullName,
        dateOfBirth: form.dateOfBirth,
        timeOfBirth: form.timeOfBirth || undefined,
        placeOfBirth: form.placeOfBirth || undefined,
        gender: form.gender,
        zodiacSign: prediction.personalSnapshot?.zodiacSign || '',
        birthStar: prediction.personalSnapshot?.birthStar || '',
        predictionData: JSON.stringify(prediction),
      })
      setIsSaved(true)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      // silent
    } finally {
      setIsSaving(false)
    }
  }, [prediction, form, isSaving, isSaved])

  // ── Share handlers ──
  const userDetails = { fullName: form.fullName, dateOfBirth: form.dateOfBirth, timeOfBirth: form.timeOfBirth, placeOfBirth: form.placeOfBirth, gender: form.gender }

  const handleShareWhatsApp = useCallback(async () => {
    if (!prediction) return
    setIsSharing(true)
    try {
      const { generateAstrologyPDFFile } = await import('@/services/astrologyPdfService')
      const file = await generateAstrologyPDFFile(prediction, userDetails)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `Cosmic Prediction for ${form.fullName}`, text: `Check out ${form.fullName}'s cosmic prediction from FamNMe!`, files: [file] })
      } else {
        const text = encodeURIComponent(`\u2728 Cosmic Prediction for ${form.fullName}\n\n\ud83c\udf1f Zodiac: ${prediction.personalSnapshot.zodiacSign}\n\u2b50 Birth Star: ${prediction.personalSnapshot.birthStar}\n\ud83d\udd2e Energy: ${prediction.todayEnergy.energyLevel}\n\n"${prediction.personalHook}"\n\n\u2014 Generated via FamNMe | familyaconnect.com`)
        window.open(`https://wa.me/?text=${text}`, '_blank')
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') console.error('Share failed:', err.message)
    } finally { setIsSharing(false); setShowShareMenu(false) }
  }, [prediction, form.fullName, userDetails])

  const handleShareEmail = useCallback(async () => {
    if (!prediction) return
    setIsSharing(true)
    try {
      const { generateAstrologyPDFFile } = await import('@/services/astrologyPdfService')
      const file = await generateAstrologyPDFFile(prediction, userDetails)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `Cosmic Prediction for ${form.fullName}`, text: `Here's ${form.fullName}'s cosmic prediction from FamNMe.`, files: [file] })
      } else {
        const subject = encodeURIComponent(`Cosmic Prediction for ${form.fullName}`)
        const body = encodeURIComponent(`Hi,\n\nHere's ${form.fullName}'s cosmic prediction:\n\nZodiac: ${prediction.personalSnapshot.zodiacSign}\nBirth Star: ${prediction.personalSnapshot.birthStar}\n\n"${prediction.personalHook}"\n\nPlease find the full report attached as a PDF.\n\n\u2014 Generated via FamNMe | familyaconnect.com`)
        window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
        const url = URL.createObjectURL(file)
        const a = document.createElement('a')
        a.href = url; a.download = file.name; a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') console.error('Email share failed:', err.message)
    } finally { setIsSharing(false); setShowShareMenu(false) }
  }, [prediction, form.fullName, userDetails])

  const handleDownloadPdf = useCallback(async () => {
    if (!prediction) return
    try {
      const { exportAstrologyPDF } = await import('@/services/astrologyPdfService')
      await exportAstrologyPDF(prediction, userDetails)
    } catch (err: unknown) {
      console.error('PDF export failed:', err instanceof Error ? err.message : String(err))
    }
  }, [prediction, userDetails])

  const isFormValid = form.fullName && form.dateOfBirth && form.gender

  // ── Panel shell ──
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40" onClick={onClose} />

      {/* Panel */}
      <div
        className={`
          fixed z-50 flex flex-col bg-[#F8F6F1] dark:bg-[#1A1A1A]
          ${isMobile
            ? 'inset-0'
            : 'right-0 top-0 bottom-0 w-[450px] border-l border-[#E2DBCE]/60 dark:border-[#2A2A2A] shadow-2xl'
          }
          animate-fade-in
        `}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 px-5 py-4 border-b border-[#E2DBCE]/60 dark:border-[#333]">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4B2C5E] to-[#2F3E8F] flex items-center justify-center shadow-sm">
            <MoonStar className="w-[18px] h-[18px] text-[#C2A46D]" strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[16px] font-bold text-[#3D2E1F] dark:text-[#F3F2F1]">
              Cosmic Insights
            </h2>
            <p className="text-[11px] text-[#8B7355] dark:text-[#A19F9D]">
              {state === 'results' ? (isSaved ? 'Saved to your predictions' : 'Your personalized prediction') : 'Powerful daily predictions'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#2F3E8F]/[0.06] dark:hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5 text-[#8B7355] dark:text-[#666]" />
          </button>
        </div>

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">

          {/* ═══ FORM STATE ═══ */}
          {state === 'form' && (
            <div className="p-5 space-y-5 animate-fade-in">
              {/* Intro */}
              <div className="rounded-xl bg-gradient-to-br from-[#4B2C5E]/[0.06] to-[#C2A46D]/[0.08] dark:from-[#4B2C5E]/[0.12] dark:to-[#C2A46D]/[0.10] p-4 ring-1 ring-[#4B2C5E]/[0.08] dark:ring-[#4B2C5E]/[0.15]">
                <p className="text-[13px] text-[#3D2E1F]/80 dark:text-[#D4D0CC]/80 leading-relaxed">
                  Enter your birth details to receive a personalized daily prediction covering career, finances, relationships, health, and more — crafted with emotional intelligence and cultural depth.
                </p>
              </div>

              {/* Form fields */}
              <div className="space-y-4">
                {/* Full Name with autocomplete */}
                <div className="relative">
                  <label className="flex items-center gap-1.5 text-[13px] font-medium text-[#3D2E1F] dark:text-[#D4D0CC] mb-1.5">
                    <User className="w-3.5 h-3.5 text-[#8B7355]" />
                    Full Name <span className="text-red-400">*</span>
                  </label>

                  {selectedPerson ? (
                    <div className="flex items-center gap-2 h-11 md:h-9 px-3 rounded-lg border border-[#2F3E8F]/20 dark:border-[#4B2C5E]/30 bg-[#2F3E8F]/[0.04] dark:bg-[#4B2C5E]/[0.08]">
                      {selectedPerson.profilePhotoUrl ? (
                        <img src={selectedPerson.profilePhotoUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[#2F3E8F]/10 dark:bg-[#7B8FD4]/20 flex items-center justify-center">
                          <UserCheck className="w-3.5 h-3.5 text-[#2F3E8F] dark:text-[#7B8FD4]" />
                        </div>
                      )}
                      <span className="flex-1 text-base md:text-[13px] font-medium text-[#3D2E1F] dark:text-[#F3F2F1] truncate">
                        {selectedPerson.firstName} {selectedPerson.lastName}
                      </span>
                      <span className="text-[10px] text-[#2F3E8F] dark:text-[#7B8FD4] bg-[#2F3E8F]/[0.08] dark:bg-[#7B8FD4]/[0.12] px-1.5 py-0.5 rounded-full font-medium">From tree</span>
                      <button onClick={handleClearPerson} className="p-0.5 rounded hover:bg-[#2F3E8F]/[0.08] dark:hover:bg-white/[0.08] transition-colors" aria-label="Clear selection">
                        <X className="w-4 h-4 text-[#8B7355] dark:text-[#666]" />
                      </button>
                    </div>
                  ) : (
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={form.fullName}
                      onChange={e => updateField('fullName', e.target.value)}
                      onFocus={() => { if (filteredPersons.length > 0) setShowSuggestions(true) }}
                      onKeyDown={e => {
                        if (!showSuggestions || filteredPersons.length === 0) return
                        if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIdx(prev => Math.min(prev + 1, filteredPersons.length - 1)) }
                        else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIdx(prev => Math.max(prev - 1, 0)) }
                        else if (e.key === 'Enter' && highlightedIdx >= 0) { e.preventDefault(); handleSelectPerson(filteredPersons[highlightedIdx]) }
                        else if (e.key === 'Escape') { setShowSuggestions(false) }
                      }}
                      placeholder={availablePersons.length > 0 ? 'Type a family member\u2019s name...' : 'Enter your full name'}
                      autoComplete="off"
                      className="w-full h-11 md:h-9 px-3 rounded-lg border border-[#E2DBCE] dark:border-[#333] bg-white dark:bg-[#242424] text-base md:text-[13px] text-[#3D2E1F] dark:text-[#F3F2F1] placeholder:text-[#8B7355]/40 focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/30 transition-shadow"
                    />
                  )}

                  {/* Autocomplete dropdown */}
                  {showSuggestions && filteredPersons.length > 0 && !selectedPerson && (
                    <div ref={suggestionsRef} className="absolute z-20 left-0 right-0 top-full mt-1 bg-white dark:bg-[#242424] rounded-xl border border-[#E2DBCE]/60 dark:border-[#333] shadow-xl overflow-hidden max-h-[240px] overflow-y-auto">
                      <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-[#8B7355] dark:text-[#A19F9D] font-semibold border-b border-[#E2DBCE]/40 dark:border-[#333]">Family members</div>
                      {filteredPersons.map((person, idx) => (
                        <button
                          key={person.personId}
                          onClick={() => handleSelectPerson(person)}
                          onMouseEnter={() => setHighlightedIdx(idx)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${idx === highlightedIdx ? 'bg-[#2F3E8F]/[0.06] dark:bg-[#7B8FD4]/[0.10]' : 'hover:bg-[#F6F2EA] dark:hover:bg-[#2A2A2A]'}`}
                        >
                          {person.profilePhotoUrl ? (
                            <img src={person.profilePhotoUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#2F3E8F]/[0.08] dark:bg-[#7B8FD4]/[0.15] flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-[#2F3E8F] dark:text-[#7B8FD4]" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-[#3D2E1F] dark:text-[#F3F2F1] truncate">{person.firstName} {person.lastName}</p>
                            <div className="flex items-center gap-2 text-[11px] text-[#8B7355] dark:text-[#A19F9D]">
                              {person.birthDate && <span>b. {new Date(person.birthDate).getFullYear()}</span>}
                              {person.occupation && <span className="truncate">{person.occupation}</span>}
                              {!person.birthDate && !person.occupation && person.gender && <span className="capitalize">{person.gender}</span>}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="flex items-center gap-1.5 text-[13px] font-medium text-[#3D2E1F] dark:text-[#D4D0CC] mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#8B7355]" />
                    Date of Birth <span className="text-red-400">*</span>
                  </label>
                  <input type="date" value={form.dateOfBirth} onChange={e => updateField('dateOfBirth', e.target.value)}
                    className="w-full h-11 md:h-9 px-3 rounded-lg border border-[#E2DBCE] dark:border-[#333] bg-white dark:bg-[#242424] text-base md:text-[13px] text-[#3D2E1F] dark:text-[#F3F2F1] focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/30 transition-shadow" />
                </div>

                {/* Time of Birth */}
                <div>
                  <label className="flex items-center gap-1.5 text-[13px] font-medium text-[#3D2E1F] dark:text-[#D4D0CC] mb-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#8B7355]" />
                    Time of Birth <span className="text-[11px] font-normal text-[#8B7355]/60">(enhances accuracy)</span>
                  </label>
                  <input type="time" value={form.timeOfBirth} onChange={e => updateField('timeOfBirth', e.target.value)}
                    className="w-full h-11 md:h-9 px-3 rounded-lg border border-[#E2DBCE] dark:border-[#333] bg-white dark:bg-[#242424] text-base md:text-[13px] text-[#3D2E1F] dark:text-[#F3F2F1] focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/30 transition-shadow" />
                </div>

                {/* Place of Birth */}
                <div>
                  <label className="flex items-center gap-1.5 text-[13px] font-medium text-[#3D2E1F] dark:text-[#D4D0CC] mb-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#8B7355]" />
                    Place of Birth <span className="text-[11px] font-normal text-[#8B7355]/60">(optional)</span>
                  </label>
                  <input type="text" value={form.placeOfBirth} onChange={e => updateField('placeOfBirth', e.target.value)} placeholder="e.g., Mumbai, India"
                    className="w-full h-11 md:h-9 px-3 rounded-lg border border-[#E2DBCE] dark:border-[#333] bg-white dark:bg-[#242424] text-base md:text-[13px] text-[#3D2E1F] dark:text-[#F3F2F1] placeholder:text-[#8B7355]/40 focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/30 transition-shadow" />
                </div>

                {/* Gender */}
                <div>
                  <label className="flex items-center gap-1.5 text-[13px] font-medium text-[#3D2E1F] dark:text-[#D4D0CC] mb-1.5">
                    <User className="w-3.5 h-3.5 text-[#8B7355]" />
                    Gender <span className="text-red-400">*</span>
                  </label>
                  <select value={form.gender} onChange={e => updateField('gender', e.target.value)}
                    className="w-full h-11 md:h-9 px-3 rounded-lg border border-[#E2DBCE] dark:border-[#333] bg-white dark:bg-[#242424] text-base md:text-[13px] text-[#3D2E1F] dark:text-[#F3F2F1] focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/30 transition-shadow appearance-none"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath d=\'M3 5l3 3 3-3\' fill=\'none\' stroke=\'%238B7355\' stroke-width=\'1.5\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Submit */}
              <button type="button" onClick={handleSubmit} disabled={!isFormValid}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3 px-4 bg-gradient-to-r from-[#4B2C5E] to-[#2F3E8F] hover:from-[#5C3670] hover:to-[#3A4DA0] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[14px] font-semibold shadow-md hover:shadow-lg transition-all duration-200 ease-out active:scale-[0.98]">
                <MoonStar className="w-4.5 h-4.5" strokeWidth={2} />
                Get My Prediction
              </button>
            </div>
          )}

          {/* ═══ LOADING STATE ═══ */}
          {state === 'loading' && (
            <div className="flex-1 flex flex-col items-center justify-center py-24 px-6 animate-fade-in">
              <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 rounded-full border-2 border-[#4B2C5E]/20 dark:border-[#4B2C5E]/30" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#4B2C5E] dark:border-t-[#D4B8E8] animate-spin" />
                <div className="absolute inset-3 rounded-full bg-gradient-to-br from-[#4B2C5E]/[0.08] to-[#C2A46D]/[0.08] dark:from-[#4B2C5E]/[0.15] dark:to-[#C2A46D]/[0.15] flex items-center justify-center">
                  <MoonStar className="w-6 h-6 text-[#4B2C5E] dark:text-[#D4B8E8]" strokeWidth={1.5} />
                </div>
              </div>
              <p className="text-[14px] font-medium text-[#3D2E1F] dark:text-[#F3F2F1] mb-1.5">{loadingMsg}</p>
              <p className="text-[12px] text-[#8B7355] dark:text-[#A19F9D]">This may take a few moments</p>
            </div>
          )}

          {/* ═══ ERROR STATE ═══ */}
          {state === 'error' && (
            <div className="flex-1 flex flex-col items-center justify-center py-24 px-6 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
                <X className="w-7 h-7 text-red-400" />
              </div>
              <p className="text-[14px] font-medium text-[#3D2E1F] dark:text-[#F3F2F1] mb-1.5 text-center">Unable to generate prediction</p>
              <p className="text-[13px] text-[#8B7355] dark:text-[#A19F9D] text-center mb-5 max-w-[280px]">{errorMsg}</p>
              <button type="button" onClick={() => setState('form')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2F3E8F] hover:bg-[#3A4DA0] text-white text-[13px] font-semibold transition-colors">
                <RotateCcw className="w-4 h-4" /> Try Again
              </button>
            </div>
          )}

          {/* ═══ RESULTS STATE ═══ */}
          {state === 'results' && prediction && (
            <div className="p-5 space-y-3 animate-fade-in">
              {/* Personal Hook */}
              <div className="rounded-xl bg-gradient-to-br from-[#4B2C5E]/[0.06] to-[#C2A46D]/[0.10] dark:from-[#4B2C5E]/[0.15] dark:to-[#C2A46D]/[0.12] p-4 ring-1 ring-[#C2A46D]/[0.15] dark:ring-[#C2A46D]/[0.20]">
                <p className="text-[14px] text-[#3D2E1F] dark:text-[#F3F2F1] leading-relaxed italic">&ldquo;{prediction.personalHook}&rdquo;</p>
              </div>

              {/* Personal Snapshot */}
              <Section icon={Star} title="Personal Snapshot" defaultOpen>
                <div className="grid grid-cols-2 gap-2.5">
                  {[['Birth Star', prediction.personalSnapshot.birthStar], ['Zodiac', prediction.personalSnapshot.zodiacSign], ['Lucky Number', prediction.personalSnapshot.luckyNumber], ['Lucky Color', prediction.personalSnapshot.luckyColor], ['Lucky Day', prediction.personalSnapshot.luckyDay]].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-white dark:bg-[#242424] p-2.5 ring-1 ring-[#E2DBCE]/40 dark:ring-[#333]">
                      <p className="text-[10px] uppercase tracking-wider text-[#8B7355] dark:text-[#A19F9D] mb-0.5">{label}</p>
                      <p className="text-[13px] font-semibold text-[#3D2E1F] dark:text-[#F3F2F1]">{value}</p>
                    </div>
                  ))}
                  <div className="col-span-2 rounded-lg bg-gradient-to-r from-[#4B2C5E]/[0.06] to-transparent dark:from-[#4B2C5E]/[0.12] p-2.5 ring-1 ring-[#4B2C5E]/[0.08] dark:ring-[#4B2C5E]/[0.15]">
                    <p className="text-[10px] uppercase tracking-wider text-[#8B7355] dark:text-[#A19F9D] mb-0.5">Dominant Trait Today</p>
                    <p className="text-[13px] font-semibold text-[#4B2C5E] dark:text-[#D4B8E8]">{prediction.personalSnapshot.dominantTrait}</p>
                  </div>
                </div>
              </Section>

              <Section icon={Sun} title="Today's Energy" defaultOpen>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Badge label="Energy" value={prediction.todayEnergy.energyLevel} />
                  <Badge label="Mood" value={prediction.todayEnergy.moodTrend} />
                  <Badge label="Outcome" value={prediction.todayEnergy.outcomeBias} />
                </div>
                <p className="text-[13px] text-[#3D2E1F]/80 dark:text-[#D4D0CC]/80 leading-relaxed">{prediction.todayEnergy.explanation}</p>
              </Section>

              <Section icon={Briefcase} title="Career & Work">
                <div className="flex flex-wrap gap-1.5 mb-3"><Badge label="Direction" value={prediction.careerWork.progressDirection} /></div>
                <div className="space-y-2.5">
                  <div><p className="text-[11px] font-semibold text-[#2F3E8F] dark:text-[#7B8FD4] uppercase tracking-wider mb-0.5">Focus On</p><p className="text-[13px] text-[#3D2E1F]/80 dark:text-[#D4D0CC]/80 leading-relaxed">{prediction.careerWork.focus}</p></div>
                  <div><p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-0.5">Avoid</p><p className="text-[13px] text-[#3D2E1F]/80 dark:text-[#D4D0CC]/80 leading-relaxed">{prediction.careerWork.avoid}</p></div>
                  <div className="rounded-lg bg-[#2F3E8F]/[0.04] dark:bg-[#7B8FD4]/[0.08] p-2.5"><p className="text-[11px] font-semibold text-[#2F3E8F] dark:text-[#7B8FD4] uppercase tracking-wider mb-0.5">Best Timing</p><p className="text-[13px] text-[#3D2E1F]/80 dark:text-[#D4D0CC]/80">{prediction.careerWork.microTiming}</p></div>
                </div>
              </Section>

              <Section icon={Wallet} title="Money & Finance">
                <div className="flex flex-wrap gap-1.5 mb-3"><Badge label="Flow" value={prediction.moneyFinance.moneyFlow} /><Badge label="Risk" value={prediction.moneyFinance.riskLevel} /></div>
                <div className="space-y-2"><p className="text-[13px] text-[#3D2E1F]/80 dark:text-[#D4D0CC]/80 leading-relaxed">{prediction.moneyFinance.spendingAdvice}</p><p className="text-[13px] text-[#3D2E1F]/80 dark:text-[#D4D0CC]/80 leading-relaxed">{prediction.moneyFinance.investmentAdvice}</p></div>
              </Section>

              <Section icon={Heart} title="Relationships & Social">
                <div className="flex flex-wrap gap-1.5 mb-3"><Badge label="Tone" value={prediction.socialRelationships.interactionTone} /></div>
                <p className="text-[13px] text-[#3D2E1F]/80 dark:text-[#D4D0CC]/80 leading-relaxed">{prediction.socialRelationships.advice}</p>
              </Section>

              <Section icon={Activity} title="Health & Energy">
                <div className="flex flex-wrap gap-1.5 mb-3"><Badge label="Physical" value={prediction.healthEnergy.physicalEnergy} /><Badge label="Mental" value={prediction.healthEnergy.mentalState} /></div>
                <p className="text-[13px] text-[#3D2E1F]/80 dark:text-[#D4D0CC]/80 leading-relaxed">{prediction.healthEnergy.suggestion}</p>
              </Section>

              <Section icon={Target} title="Personal Action Guide" defaultOpen>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2"><span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-[10px]">+</span><p className="text-[13px] text-[#3D2E1F]/80 dark:text-[#D4D0CC]/80 leading-relaxed">{prediction.personalActionGuide.whatWorks}</p></div>
                  <div className="flex items-start gap-2"><span className="shrink-0 w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-[10px]">!</span><p className="text-[13px] text-[#3D2E1F]/80 dark:text-[#D4D0CC]/80 leading-relaxed">{prediction.personalActionGuide.whatToAvoid}</p></div>
                  <div className="rounded-lg bg-gradient-to-r from-[#4B2C5E]/[0.06] to-[#2F3E8F]/[0.04] dark:from-[#4B2C5E]/[0.12] dark:to-[#2F3E8F]/[0.08] p-3 ring-1 ring-[#4B2C5E]/[0.08] dark:ring-[#4B2C5E]/[0.15]"><p className="text-[11px] font-bold text-[#4B2C5E] dark:text-[#D4B8E8] uppercase tracking-wider mb-1">Power Move</p><p className="text-[13px] font-medium text-[#3D2E1F] dark:text-[#F3F2F1] leading-relaxed">{prediction.personalActionGuide.powerMove}</p></div>
                </div>
              </Section>

              <Section icon={Clover} title="Lucky Elements">
                <div className="space-y-2.5">
                  <div className="rounded-lg bg-white dark:bg-[#242424] p-3 ring-1 ring-[#E2DBCE]/40 dark:ring-[#333]"><div className="flex items-center gap-2 mb-1"><div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#C2A46D] to-[#4B2C5E]" /><p className="text-[13px] font-semibold text-[#3D2E1F] dark:text-[#F3F2F1]">{prediction.luckyElements.color}</p></div><p className="text-[12px] text-[#8B7355] dark:text-[#A19F9D] leading-relaxed">{prediction.luckyElements.colorAdvice}</p></div>
                  <div className="rounded-lg bg-white dark:bg-[#242424] p-3 ring-1 ring-[#E2DBCE]/40 dark:ring-[#333]"><p className="text-[18px] font-bold text-[#2F3E8F] dark:text-[#7B8FD4] mb-0.5">{prediction.luckyElements.number}</p><p className="text-[12px] text-[#8B7355] dark:text-[#A19F9D] leading-relaxed">{prediction.luckyElements.numberAdvice}</p></div>
                </div>
              </Section>

              <Section icon={Sun} title="Tomorrow Preview">
                <div className="space-y-2">
                  <p className="text-[13px] text-[#3D2E1F]/80 dark:text-[#D4D0CC]/80 leading-relaxed">{prediction.tomorrowPreview.overallTrend}</p>
                  <div className="flex items-start gap-2"><span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-[10px]">+</span><p className="text-[13px] text-[#3D2E1F]/80 dark:text-[#D4D0CC]/80 leading-relaxed">{prediction.tomorrowPreview.opportunity}</p></div>
                  <div className="flex items-start gap-2"><span className="shrink-0 w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-[10px]">!</span><p className="text-[13px] text-[#3D2E1F]/80 dark:text-[#D4D0CC]/80 leading-relaxed">{prediction.tomorrowPreview.caution}</p></div>
                </div>
              </Section>

              {/* Emotional Closing */}
              <div className="rounded-xl bg-gradient-to-br from-[#C2A46D]/[0.10] to-[#4B2C5E]/[0.06] dark:from-[#C2A46D]/[0.15] dark:to-[#4B2C5E]/[0.10] p-4 ring-1 ring-[#C2A46D]/[0.15] dark:ring-[#C2A46D]/[0.20]">
                <Quote className="w-5 h-5 text-[#C2A46D] mb-2" strokeWidth={1.5} />
                <p className="text-[14px] text-[#3D2E1F] dark:text-[#F3F2F1] leading-relaxed italic mb-3">{prediction.emotionalClosing}</p>
                <div className="h-px bg-[#C2A46D]/20 my-3" />
                <p className="text-[12px] font-semibold text-[#4B2C5E] dark:text-[#D4B8E8] uppercase tracking-wider mb-1">Today&apos;s Affirmation</p>
                <p className="text-[13px] text-[#3D2E1F]/80 dark:text-[#D4D0CC]/80 italic">&ldquo;{prediction.affirmation}&rdquo;</p>
              </div>

              {/* Action buttons */}
              <div className="space-y-2.5 pt-2 pb-4">
                <div className="flex gap-2.5">
                  {/* Save */}
                  {!isSaved && (
                    <button type="button" onClick={handleSave} disabled={isSaving || saveSuccess}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#4B2C5E] to-[#2F3E8F] hover:from-[#5C3670] hover:to-[#3A4DA0] disabled:opacity-60 text-white text-[13px] font-semibold shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.98]">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                      {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Prediction'}
                    </button>
                  )}

                  {/* Download PDF */}
                  <button type="button" onClick={handleDownloadPdf}
                    className={`${!isSaved ? '' : 'flex-1'} flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-[#E2DBCE] dark:border-[#333] hover:bg-[#2F3E8F]/[0.04] dark:hover:bg-white/[0.04] text-[13px] font-semibold text-[#3D2E1F] dark:text-[#D4D0CC] transition-colors`}>
                    <Download className="w-4 h-4" /> Download PDF
                  </button>

                  {/* Share */}
                  <div className="relative">
                    <button type="button" onClick={() => setShowShareMenu(!showShareMenu)} disabled={isSharing}
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-[#E2DBCE] dark:border-[#333] hover:bg-[#2F3E8F]/[0.04] dark:hover:bg-white/[0.04] text-[13px] font-semibold text-[#3D2E1F] dark:text-[#D4D0CC] transition-colors">
                      {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />} Share
                    </button>
                    {showShareMenu && (
                      <div className="absolute right-0 bottom-full mb-2 w-52 bg-white dark:bg-[#242424] rounded-xl border border-[#E2DBCE]/60 dark:border-[#333] shadow-xl z-20 overflow-hidden animate-fade-in">
                        <button onClick={handleShareWhatsApp} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#F6F2EA] dark:hover:bg-[#2A2A2A] transition-colors">
                          <div className="w-8 h-8 rounded-full bg-[#25D366]/10 flex items-center justify-center"><MessageCircle className="w-4 h-4 text-[#25D366]" /></div>
                          <div><p className="text-[13px] font-medium text-[#3D2E1F] dark:text-[#F3F2F1]">WhatsApp</p><p className="text-[10px] text-[#8B7355] dark:text-[#A19F9D]">Share prediction PDF</p></div>
                        </button>
                        <div className="h-px bg-[#E2DBCE]/40 dark:bg-[#333]" />
                        <button onClick={handleShareEmail} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#F6F2EA] dark:hover:bg-[#2A2A2A] transition-colors">
                          <div className="w-8 h-8 rounded-full bg-[#2F3E8F]/10 flex items-center justify-center"><Mail className="w-4 h-4 text-[#2F3E8F]" /></div>
                          <div><p className="text-[13px] font-medium text-[#3D2E1F] dark:text-[#F3F2F1]">Email</p><p className="text-[10px] text-[#8B7355] dark:text-[#A19F9D]">Send with PDF attached</p></div>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* New prediction (secondary) */}
                <button type="button" onClick={handleNewPrediction}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#E2DBCE]/60 dark:border-[#333] hover:bg-[#2F3E8F]/[0.04] dark:hover:bg-white/[0.04] text-[12px] font-medium text-[#8B7355] dark:text-[#A19F9D] transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" /> New Prediction
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
