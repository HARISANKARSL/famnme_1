/**
 * PredictionsPage — Full predictions experience with list, form, and detail views.
 *
 * Accessible from the Celebrate Culture hub.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useResponsive } from '@/hooks/useResponsive'
import { API_BASE_URL } from '@/config/api'
import type { Person } from '@/types'
import { updatePerson, fetchTreeWindow } from '@/services/neo4jDataService'
import {
  ArrowLeft, MoonStar, Plus, Loader2, User, Calendar, Clock, MapPin,
  RotateCcw, Gem, Check, X, UserCheck,
} from 'lucide-react'
import {
  fetchPredictions,
  savePrediction as savePredictionApi,
  deletePrediction as deletePredictionApi,
  type SavedPrediction,
} from '@/services/predictionApiService'
import { PredictionCard, parsePredictionData } from '@/components/predictions/PredictionCard'
import { PredictionDetail, type AstrologyPrediction } from '@/components/predictions/PredictionDetail'

// ── Loading messages ──

const LOADING_MESSAGES = [
  'Reading your cosmic energy...',
  'Aligning the stars for you...',
  'Consulting the celestial chart...',
  'Preparing your personalized insights...',
]

// ── Form data ──

interface FormData {
  fullName: string
  dateOfBirth: string
  timeOfBirth: string
  placeOfBirth: string
  gender: string
  chartStyle: 'south_indian' | 'north_indian'
}

interface PredictionsPageProps {
  onBack: () => void
  treeId?: string
  persons?: Person[]
  /** Start directly in the "new prediction" form */
  startNew?: boolean
}

export function PredictionsPage({ onBack, treeId, persons, startNew }: PredictionsPageProps) {
  const { isMobile } = useResponsive()
  const { user, token } = useAuthStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // ── View state ──
  const [view, setView] = useState<'list' | 'new' | 'loading' | 'detail'>(startNew ? 'new' : 'list')
  const [predictions, setPredictions] = useState<SavedPrediction[]>([])
  const [selectedPrediction, setSelectedPrediction] = useState<SavedPrediction | null>(null)
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0])
  const [errorMsg, setErrorMsg] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // ── Fallback persons if not provided via props ──
  const [fallbackPersons, setFallbackPersons] = useState<Person[]>([])
  const availablePersons = persons && persons.length > 0 ? persons : fallbackPersons

  useEffect(() => {
    if (persons && persons.length > 0) return // Already have persons from props
    if (!treeId) return
    fetchTreeWindow(treeId).then(data => {
      if (data.persons.length > 0) setFallbackPersons(data.persons)
    }).catch((err: unknown) => {
      console.warn('[PredictionsPage] Failed to load persons:', err instanceof Error ? err.message : String(err))
    })
  }, [treeId, persons])

  // ── Autocomplete state ──
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [highlightedIdx, setHighlightedIdx] = useState(-1)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // ── "Update person node" prompt state ──
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, string>>({})
  const [isSavingUpdate, setIsSavingUpdate] = useState(false)

  // ── Form state ──
  const [form, setForm] = useState<FormData>({
    fullName: user?.fullName || '',
    dateOfBirth: '',
    timeOfBirth: '',
    placeOfBirth: '',
    gender: '',
    chartStyle: 'south_indian',
  })

  // ── Filter persons by name ──
  const filteredPersons = useMemo(() => {
    if (!availablePersons.length || !form.fullName || form.fullName.length < 1) return []
    if (selectedPerson) return [] // Don't show suggestions after selection
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

  // ── Select a person from autocomplete ──
  const handleSelectPerson = useCallback((person: Person) => {
    setSelectedPerson(person)
    setShowSuggestions(false)
    setHighlightedIdx(-1)
    const fullName = `${person.firstName} ${person.lastName}`.trim()
    setForm({
      fullName,
      dateOfBirth: person.birthDate || '',
      timeOfBirth: '',
      placeOfBirth: person.birthPlace || '',
      gender: person.gender || '',
    })
  }, [])

  // ── Clear person selection ──
  const handleClearPerson = useCallback(() => {
    setSelectedPerson(null)
    setForm(prev => ({ ...prev, fullName: '' }))
    setTimeout(() => nameInputRef.current?.focus(), 50)
  }, [])

  // ── Load predictions on mount ──
  useEffect(() => {
    loadPredictions()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadPredictions = useCallback(async () => {
    setIsLoadingList(true)
    try {
      const result = await fetchPredictions(50, 0)
      setPredictions(result.predictions)
    } catch {
      // silent — show empty state
    } finally {
      setIsLoadingList(false)
    }
  }, [])

  // ── Cycle loading messages ──
  useEffect(() => {
    if (view !== 'loading') return
    let idx = 0
    const interval = setInterval(() => {
      idx = (idx + 1) % LOADING_MESSAGES.length
      setLoadingMsg(LOADING_MESSAGES[idx])
    }, 2500)
    return () => clearInterval(interval)
  }, [view])

  // ── Scroll to top on view change ──
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [view, selectedPrediction])

  const updateField = useCallback((field: keyof FormData, value: string) => {
    if (field === 'fullName') {
      // Typing in name field clears selected person and opens suggestions
      setSelectedPerson(null)
      setShowSuggestions(true)
      setHighlightedIdx(-1)
    }
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  // ── Generate prediction ──
  const handleGenerate = useCallback(async () => {
    if (!form.fullName || !form.dateOfBirth || !form.gender) return

    setView('loading')
    setErrorMsg('')

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
          chartStyle: form.chartStyle,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Server error' }))
        throw new Error((data as { error?: string }).error || 'Failed to generate prediction')
      }

      const data = await res.json() as { prediction: AstrologyPrediction }
      const prediction = data.prediction

      // Auto-save to backend (non-blocking — show result even if save fails)
      // Strip chartSvg before saving — it's ~160KB and causes payload-too-large errors.
      // The chart can be re-fetched from VedAstro when viewing the detail.
      const predictionToSave = { ...prediction }
      if (predictionToSave.vedicData) {
        predictionToSave.vedicData = { ...predictionToSave.vedicData, chartSvg: null }
      }
      let saved: SavedPrediction | null = null
      try {
        saved = await savePredictionApi({
          personName: form.fullName,
          dateOfBirth: form.dateOfBirth,
          timeOfBirth: form.timeOfBirth || undefined,
          placeOfBirth: form.placeOfBirth || undefined,
          gender: form.gender,
          zodiacSign: prediction.personalSnapshot?.zodiacSign || '',
          birthStar: prediction.personalSnapshot?.birthStar || '',
          predictionData: JSON.stringify(predictionToSave),
        })
        setPredictions(prev => [saved!, ...prev])
      } catch (err) {
        console.error('[Predictions] Save failed:', err instanceof Error ? err.message : String(err))
      }

      // Show detail — use saved record if available, otherwise create a transient one
      const detailRecord: SavedPrediction = saved ?? {
        predictionId: `temp-${Date.now()}`,
        userId: '',
        personName: form.fullName,
        dateOfBirth: form.dateOfBirth,
        timeOfBirth: form.timeOfBirth || null,
        placeOfBirth: form.placeOfBirth || null,
        gender: form.gender,
        zodiacSign: prediction.personalSnapshot?.zodiacSign || '',
        birthStar: prediction.personalSnapshot?.birthStar || '',
        predictionDate: new Date().toISOString().slice(0, 10),
        predictionData: JSON.stringify(prediction),
        createdAt: new Date().toISOString(),
      }
      setSelectedPrediction(detailRecord)
      setView('detail')

      // Check if user entered new details for a selected person
      if (selectedPerson) {
        const updates: Record<string, string> = {}
        if (form.dateOfBirth && !selectedPerson.birthDate) {
          updates.birthDate = form.dateOfBirth
        }
        if (form.placeOfBirth && !selectedPerson.birthPlace) {
          updates.birthPlace = form.placeOfBirth
        }
        if (form.gender && !selectedPerson.gender) {
          updates.gender = form.gender
        }
        if (Object.keys(updates).length > 0) {
          setPendingUpdates(updates)
          setShowUpdatePrompt(true)
        }
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setView('new')
    }
  }, [form, token])

  // ── Delete prediction ──
  const handleDelete = useCallback(async (predictionId: string) => {
    try {
      await deletePredictionApi(predictionId)
      setPredictions(prev => prev.filter(p => p.predictionId !== predictionId))
      if (selectedPrediction?.predictionId === predictionId) {
        setSelectedPrediction(null)
        setView('list')
      }
      setDeleteConfirmId(null)
    } catch {
      // silent
    }
  }, [selectedPrediction])

  // ── Save new details to person's tree node ──
  const handleSaveToPersonNode = useCallback(async () => {
    if (!selectedPerson || Object.keys(pendingUpdates).length === 0) return
    setIsSavingUpdate(true)
    try {
      await updatePerson(selectedPerson.personId, pendingUpdates as Partial<Person>, treeId)
      setShowUpdatePrompt(false)
      setPendingUpdates({})
    } catch {
      // silent — don't block the prediction experience
    } finally {
      setIsSavingUpdate(false)
    }
  }, [selectedPerson, pendingUpdates, treeId])

  // ── Open detail view ──
  const openDetail = useCallback((saved: SavedPrediction) => {
    setSelectedPrediction(saved)
    setView('detail')
  }, [])

  const isFormValid = form.fullName && form.dateOfBirth && form.gender

  return (
    <div className="absolute inset-0 z-40 bg-[#F6F2EA] dark:bg-[#141414] flex flex-col">
      {/* ── Header ── */}
      <div className="shrink-0 h-14 flex items-center gap-3 px-4 md:px-6 border-b border-[#E2DBCE]/60 dark:border-[#2A2A2A] bg-white/80 dark:bg-[#1A1A1A]/80 backdrop-blur-sm">
        <button
          onClick={view === 'list' ? onBack : () => setView('list')}
          className="p-1.5 -ml-1.5 rounded-lg hover:bg-[#2F3E8F]/[0.06] dark:hover:bg-white/[0.06] transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-[#3D2E1F] dark:text-[#D4D0CC]" />
        </button>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2F3E8F] to-[#4B2C5E] flex items-center justify-center">
          <MoonStar className="w-4 h-4 text-[#C2A46D]" strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[16px] font-bold text-[#3D2E1F] dark:text-[#F3F2F1]">
            Cosmic Predictions
          </h1>
          <p className="text-[11px] text-[#8B7355] dark:text-[#A19F9D]">
            {view === 'new' ? 'New prediction' : view === 'detail' ? 'Prediction details' : `${predictions.length} saved`}
          </p>
        </div>
        {view === 'list' && (
          <button
            onClick={() => { setErrorMsg(''); setView('new') }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#4B2C5E] to-[#2F3E8F] hover:from-[#5C3670] hover:to-[#3A4DA0] text-white text-[12px] font-semibold shadow-sm transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            {isMobile ? 'New' : 'New Prediction'}
          </button>
        )}
      </div>

      {/* ── Content ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full px-4 md:px-6 py-5">

          {/* ═══ LIST VIEW ═══ */}
          {view === 'list' && (
            <>
              {isLoadingList ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-[#2F3E8F]" />
                </div>
              ) : predictions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2F3E8F]/[0.08] to-[#4B2C5E]/[0.08] dark:from-[#2F3E8F]/[0.15] dark:to-[#4B2C5E]/[0.15] flex items-center justify-center mb-5">
                    <Gem className="w-9 h-9 text-[#4B2C5E] dark:text-[#D4B8E8]" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-[16px] font-bold text-[#3D2E1F] dark:text-[#F3F2F1] mb-2">
                    No predictions yet
                  </h3>
                  <p className="text-[13px] text-[#8B7355] dark:text-[#A19F9D] max-w-[280px] mb-6 leading-relaxed">
                    Generate your first cosmic prediction to receive personalized insights about career, relationships, health, and more.
                  </p>
                  <button
                    onClick={() => setView('new')}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#4B2C5E] to-[#2F3E8F] hover:from-[#5C3670] hover:to-[#3A4DA0] text-white text-[14px] font-semibold shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                  >
                    <MoonStar className="w-4.5 h-4.5" strokeWidth={2} />
                    Get My First Prediction
                  </button>
                </div>
              ) : (
                <div className="space-y-3 animate-fade-in">
                  {predictions.map(saved => {
                    const parsed = parsePredictionData(saved.predictionData)
                    return (
                      <div key={saved.predictionId} className="relative">
                        <PredictionCard
                          predictionId={saved.predictionId}
                          personName={saved.personName}
                          predictionDate={saved.predictionDate}
                          zodiacSign={saved.zodiacSign}
                          birthStar={saved.birthStar}
                          energyLevel={parsed?.todayEnergy?.energyLevel || ''}
                          personalHook={parsed?.personalHook || ''}
                          onClick={() => openDetail(saved)}
                          onDelete={(e) => { e.stopPropagation(); setDeleteConfirmId(saved.predictionId) }}
                        />
                        {/* Delete confirmation */}
                        {deleteConfirmId === saved.predictionId && (
                          <div className="absolute inset-0 z-10 rounded-xl bg-white/95 dark:bg-[#1E1E1E]/95 backdrop-blur-sm flex items-center justify-center gap-3 animate-fade-in">
                            <span className="text-[13px] text-[#3D2E1F] dark:text-[#D4D0CC]">Delete this prediction?</span>
                            <button
                              onClick={() => handleDelete(saved.predictionId)}
                              className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-[12px] font-semibold hover:bg-red-600 transition-colors"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-3 py-1.5 rounded-lg border border-[#E2DBCE] dark:border-[#333] text-[12px] font-semibold text-[#3D2E1F] dark:text-[#D4D0CC] hover:bg-[#F6F2EA] dark:hover:bg-[#242424] transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* ═══ NEW PREDICTION FORM ═══ */}
          {view === 'new' && (
            <div className="space-y-5 animate-fade-in">
              {/* Intro */}
              <div className="rounded-xl bg-gradient-to-br from-[#4B2C5E]/[0.06] to-[#C2A46D]/[0.08] dark:from-[#4B2C5E]/[0.12] dark:to-[#C2A46D]/[0.10] p-4 ring-1 ring-[#4B2C5E]/[0.08] dark:ring-[#4B2C5E]/[0.15]">
                <p className="text-[13px] text-[#3D2E1F]/80 dark:text-[#D4D0CC]/80 leading-relaxed">
                  Enter your birth details to receive a personalized daily prediction covering career, finances, relationships, health, and more — crafted with emotional intelligence and cultural depth.
                </p>
              </div>

              {errorMsg && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/10 p-3 ring-1 ring-red-200 dark:ring-red-900/30">
                  <p className="text-[13px] text-red-600 dark:text-red-400">{errorMsg}</p>
                </div>
              )}

              {/* Form fields */}
              <div className="space-y-4">
                {/* Full Name with autocomplete */}
                <div className="relative">
                  <label className="flex items-center gap-1.5 text-[13px] font-medium text-[#3D2E1F] dark:text-[#D4D0CC] mb-1.5">
                    <User className="w-3.5 h-3.5 text-[#8B7355]" />
                    Full Name <span className="text-red-400">*</span>
                  </label>

                  {/* Selected person chip */}
                  {selectedPerson ? (
                    <div className="flex items-center gap-2 h-11 md:h-9 px-3 rounded-lg border border-[#2F3E8F]/20 dark:border-[#4B2C5E]/30 bg-[#2F3E8F]/[0.04] dark:bg-[#4B2C5E]/[0.08]">
                      {selectedPerson.profilePhotoUrl ? (
                        <img
                          src={selectedPerson.profilePhotoUrl}
                          alt=""
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[#2F3E8F]/10 dark:bg-[#7B8FD4]/20 flex items-center justify-center">
                          <UserCheck className="w-3.5 h-3.5 text-[#2F3E8F] dark:text-[#7B8FD4]" />
                        </div>
                      )}
                      <span className="flex-1 text-base md:text-[13px] font-medium text-[#3D2E1F] dark:text-[#F3F2F1] truncate">
                        {selectedPerson.firstName} {selectedPerson.lastName}
                      </span>
                      <span className="text-[10px] text-[#2F3E8F] dark:text-[#7B8FD4] bg-[#2F3E8F]/[0.08] dark:bg-[#7B8FD4]/[0.12] px-1.5 py-0.5 rounded-full font-medium">
                        From tree
                      </span>
                      <button
                        onClick={handleClearPerson}
                        className="p-0.5 rounded hover:bg-[#2F3E8F]/[0.08] dark:hover:bg-white/[0.08] transition-colors"
                        aria-label="Clear selection"
                      >
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
                        if (e.key === 'ArrowDown') {
                          e.preventDefault()
                          setHighlightedIdx(prev => Math.min(prev + 1, filteredPersons.length - 1))
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault()
                          setHighlightedIdx(prev => Math.max(prev - 1, 0))
                        } else if (e.key === 'Enter' && highlightedIdx >= 0) {
                          e.preventDefault()
                          handleSelectPerson(filteredPersons[highlightedIdx])
                        } else if (e.key === 'Escape') {
                          setShowSuggestions(false)
                        }
                      }}
                      placeholder={availablePersons.length > 0 ? 'Type a family member\u2019s name...' : 'Enter full name'}
                      autoComplete="off"
                      className="w-full h-11 md:h-9 px-3 rounded-lg border border-[#E2DBCE] dark:border-[#333] bg-white dark:bg-[#242424] text-base md:text-[13px] text-[#3D2E1F] dark:text-[#F3F2F1] placeholder:text-[#8B7355]/40 focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/30 transition-shadow"
                    />
                  )}

                  {/* Autocomplete dropdown */}
                  {showSuggestions && filteredPersons.length > 0 && !selectedPerson && (
                    <div
                      ref={suggestionsRef}
                      className="absolute z-20 left-0 right-0 top-full mt-1 bg-white dark:bg-[#242424] rounded-xl border border-[#E2DBCE]/60 dark:border-[#333] shadow-xl overflow-hidden max-h-[280px] overflow-y-auto"
                    >
                      <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-[#8B7355] dark:text-[#A19F9D] font-semibold border-b border-[#E2DBCE]/40 dark:border-[#333]">
                        Family members
                      </div>
                      {filteredPersons.map((person, idx) => (
                        <button
                          key={person.personId}
                          onClick={() => handleSelectPerson(person)}
                          onMouseEnter={() => setHighlightedIdx(idx)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                            idx === highlightedIdx
                              ? 'bg-[#2F3E8F]/[0.06] dark:bg-[#7B8FD4]/[0.10]'
                              : 'hover:bg-[#F6F2EA] dark:hover:bg-[#2A2A2A]'
                          }`}
                        >
                          {person.profilePhotoUrl ? (
                            <img
                              src={person.profilePhotoUrl}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#2F3E8F]/[0.08] dark:bg-[#7B8FD4]/[0.15] flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-[#2F3E8F] dark:text-[#7B8FD4]" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-[#3D2E1F] dark:text-[#F3F2F1] truncate">
                              {person.firstName} {person.lastName}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-[#8B7355] dark:text-[#A19F9D]">
                              {person.birthDate && (
                                <span>b. {new Date(person.birthDate).getFullYear()}</span>
                              )}
                              {person.occupation && (
                                <span className="truncate">{person.occupation}</span>
                              )}
                              {!person.birthDate && !person.occupation && person.gender && (
                                <span className="capitalize">{person.gender}</span>
                              )}
                            </div>
                          </div>
                          {person.isHomePerson && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#C2A46D]/[0.15] text-[#8B7355] dark:text-[#C2A46D] font-semibold shrink-0">
                              Home
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-[13px] font-medium text-[#3D2E1F] dark:text-[#D4D0CC] mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#8B7355]" />
                    Date of Birth <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={e => updateField('dateOfBirth', e.target.value)}
                    className="w-full h-11 md:h-9 px-3 rounded-lg border border-[#E2DBCE] dark:border-[#333] bg-white dark:bg-[#242424] text-base md:text-[13px] text-[#3D2E1F] dark:text-[#F3F2F1] focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/30 transition-shadow"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-[13px] font-medium text-[#3D2E1F] dark:text-[#D4D0CC] mb-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#8B7355]" />
                    Time of Birth
                    <span className="text-[11px] font-normal text-[#8B7355]/60">(enhances accuracy)</span>
                  </label>
                  <input
                    type="time"
                    value={form.timeOfBirth}
                    onChange={e => updateField('timeOfBirth', e.target.value)}
                    className="w-full h-11 md:h-9 px-3 rounded-lg border border-[#E2DBCE] dark:border-[#333] bg-white dark:bg-[#242424] text-base md:text-[13px] text-[#3D2E1F] dark:text-[#F3F2F1] focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/30 transition-shadow"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-[13px] font-medium text-[#3D2E1F] dark:text-[#D4D0CC] mb-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#8B7355]" />
                    Place of Birth
                    <span className="text-[11px] font-normal text-[#8B7355]/60">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.placeOfBirth}
                    onChange={e => updateField('placeOfBirth', e.target.value)}
                    placeholder="e.g., Mumbai, India"
                    className="w-full h-11 md:h-9 px-3 rounded-lg border border-[#E2DBCE] dark:border-[#333] bg-white dark:bg-[#242424] text-base md:text-[13px] text-[#3D2E1F] dark:text-[#F3F2F1] placeholder:text-[#8B7355]/40 focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/30 transition-shadow"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-[13px] font-medium text-[#3D2E1F] dark:text-[#D4D0CC] mb-1.5">
                    <User className="w-3.5 h-3.5 text-[#8B7355]" />
                    Gender <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={form.gender}
                    onChange={e => updateField('gender', e.target.value)}
                    className="w-full h-11 md:h-9 px-3 rounded-lg border border-[#E2DBCE] dark:border-[#333] bg-white dark:bg-[#242424] text-base md:text-[13px] text-[#3D2E1F] dark:text-[#F3F2F1] focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/30 transition-shadow appearance-none"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath d=\'M3 5l3 3 3-3\' fill=\'none\' stroke=\'%238B7355\' stroke-width=\'1.5\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Chart Style Selector */}
              <div>
                <label className="flex items-center gap-1.5 text-[13px] font-medium text-[#3D2E1F] dark:text-[#D4D0CC] mb-1.5">
                  <MoonStar className="w-3.5 h-3.5 text-[#8B7355]" />
                  Chart Style
                </label>
                <div className="flex rounded-lg overflow-hidden border border-[#E2DBCE] dark:border-[#333]">
                  <button
                    type="button"
                    onClick={() => updateField('chartStyle', 'south_indian')}
                    className={`flex-1 py-2 text-[13px] font-medium transition-colors ${
                      form.chartStyle === 'south_indian'
                        ? 'bg-[#2F3E8F] text-white dark:bg-[#5A6BFF]'
                        : 'bg-white dark:bg-[#242424] text-[#8B7355] dark:text-gray-400 hover:bg-[#F6F2EA] dark:hover:bg-[#2A2A2A]'
                    }`}
                  >
                    South Indian
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField('chartStyle', 'north_indian')}
                    className={`flex-1 py-2 text-[13px] font-medium transition-colors ${
                      form.chartStyle === 'north_indian'
                        ? 'bg-[#2F3E8F] text-white dark:bg-[#5A6BFF]'
                        : 'bg-white dark:bg-[#242424] text-[#8B7355] dark:text-gray-400 hover:bg-[#F6F2EA] dark:hover:bg-[#2A2A2A]'
                    }`}
                  >
                    North Indian
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!isFormValid}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3 px-4 bg-gradient-to-r from-[#4B2C5E] to-[#2F3E8F] hover:from-[#5C3670] hover:to-[#3A4DA0] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[14px] font-semibold shadow-md hover:shadow-lg transition-all duration-200 ease-out active:scale-[0.98]"
              >
                <MoonStar className="w-4.5 h-4.5" strokeWidth={2} />
                Get My Prediction
              </button>
            </div>
          )}

          {/* ═══ LOADING STATE ═══ */}
          {view === 'loading' && (
            <div className="flex flex-col items-center justify-center py-24 px-6 animate-fade-in">
              <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 rounded-full border-2 border-[#4B2C5E]/20 dark:border-[#4B2C5E]/30" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#4B2C5E] dark:border-t-[#D4B8E8] animate-spin" />
                <div className="absolute inset-3 rounded-full bg-gradient-to-br from-[#4B2C5E]/[0.08] to-[#C2A46D]/[0.08] dark:from-[#4B2C5E]/[0.15] dark:to-[#C2A46D]/[0.15] flex items-center justify-center">
                  <MoonStar className="w-6 h-6 text-[#4B2C5E] dark:text-[#D4B8E8]" strokeWidth={1.5} />
                </div>
              </div>
              <p className="text-[14px] font-medium text-[#3D2E1F] dark:text-[#F3F2F1] mb-1.5">
                {loadingMsg}
              </p>
              <p className="text-[12px] text-[#8B7355] dark:text-[#A19F9D]">
                This may take a few moments
              </p>
            </div>
          )}

          {/* ═══ DETAIL VIEW ═══ */}
          {view === 'detail' && selectedPrediction && (() => {
            const parsed = parsePredictionData(selectedPrediction.predictionData)
            if (!parsed) return (
              <div className="text-center py-20">
                <p className="text-[14px] text-[#8B7355]">Unable to load prediction data</p>
                <button onClick={() => setView('list')} className="mt-3 text-[13px] text-[#2F3E8F] hover:underline">
                  <RotateCcw className="w-4 h-4 inline mr-1" />
                  Back to list
                </button>
              </div>
            )
            return (
              <>
                {/* Update person prompt */}
                {showUpdatePrompt && selectedPerson && Object.keys(pendingUpdates).length > 0 && (
                  <div className="mb-4 rounded-xl bg-[#2F3E8F]/[0.05] dark:bg-[#7B8FD4]/[0.08] p-4 ring-1 ring-[#2F3E8F]/[0.12] dark:ring-[#7B8FD4]/[0.15] animate-fade-in">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#2F3E8F]/[0.10] dark:bg-[#7B8FD4]/[0.15] flex items-center justify-center shrink-0 mt-0.5">
                        <UserCheck className="w-4 h-4 text-[#2F3E8F] dark:text-[#7B8FD4]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[#3D2E1F] dark:text-[#F3F2F1] mb-1">
                          Update {selectedPerson.firstName}&apos;s profile?
                        </p>
                        <p className="text-[12px] text-[#8B7355] dark:text-[#A19F9D] mb-2.5 leading-relaxed">
                          You entered details not yet in the family tree. Save them to {selectedPerson.firstName}&apos;s node?
                        </p>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {pendingUpdates.birthDate && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              <Calendar className="w-3 h-3" />
                              Date of Birth: {(() => {
                                try {
                                  const d = new Date(pendingUpdates.birthDate);
                                  if (isNaN(d.getTime())) return pendingUpdates.birthDate;
                                  const dd = String(d.getDate()).padStart(2, '0');
                                  const mm = String(d.getMonth() + 1).padStart(2, '0');
                                  const yy = String(d.getFullYear()).slice(-2);
                                  return `${dd}-${mm}-${yy}`;
                                } catch {
                                  return pendingUpdates.birthDate;
                                }
                              })()}
                            </span>
                          )}
                          {pendingUpdates.birthPlace && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              <MapPin className="w-3 h-3" />
                              Birth Place: {pendingUpdates.birthPlace}
                            </span>
                          )}
                          {pendingUpdates.gender && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              <User className="w-3 h-3" />
                              Gender: {pendingUpdates.gender}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveToPersonNode}
                            disabled={isSavingUpdate}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2F3E8F] hover:bg-[#3A4DA0] text-white text-[12px] font-semibold transition-colors disabled:opacity-50"
                          >
                            {isSavingUpdate ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            Yes, update profile
                          </button>
                          <button
                            onClick={() => { setShowUpdatePrompt(false); setPendingUpdates({}) }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2DBCE] dark:border-[#333] text-[12px] font-semibold text-[#3D2E1F] dark:text-[#D4D0CC] hover:bg-[#F6F2EA] dark:hover:bg-[#242424] transition-colors"
                          >
                            No thanks
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <PredictionDetail
                  prediction={parsed}
                  personName={selectedPrediction.personName}
                  dateOfBirth={selectedPrediction.dateOfBirth}
                  timeOfBirth={selectedPrediction.timeOfBirth}
                  placeOfBirth={selectedPrediction.placeOfBirth}
                  gender={selectedPrediction.gender}
                  predictionDate={selectedPrediction.predictionDate}
                  isSaved={!selectedPrediction.predictionId.startsWith('temp-')}
                  onBack={() => { setView('list'); setShowUpdatePrompt(false); setPendingUpdates({}) }}
                  onDelete={() => handleDelete(selectedPrediction.predictionId)}
                  onSave={selectedPrediction.predictionId.startsWith('temp-') ? async () => {
                    const saved = await savePredictionApi({
                      personName: selectedPrediction.personName,
                      dateOfBirth: selectedPrediction.dateOfBirth,
                      timeOfBirth: selectedPrediction.timeOfBirth || undefined,
                      placeOfBirth: selectedPrediction.placeOfBirth || undefined,
                      gender: selectedPrediction.gender,
                      zodiacSign: selectedPrediction.zodiacSign,
                      birthStar: selectedPrediction.birthStar,
                      predictionData: selectedPrediction.predictionData,
                    })
                    setPredictions(prev => [saved, ...prev])
                    setSelectedPrediction(saved)
                  } : undefined}
                />
              </>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
