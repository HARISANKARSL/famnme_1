/**
 * ConversationalWizard — One-question-at-a-time onboarding flow.
 *
 * Replaces the accordion-based CreateTreeWizard for first-time users.
 * Feels conversational ("What's your name?") rather than form-like.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Dialog,
  ResponsiveDialogContent as DialogContent,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { DateInput } from '@/components/ui/DateInput'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, ChevronLeft, Plus, X, Check, User, Gem } from 'lucide-react'
import * as neo4jAPI from '@/services/neo4jDataService'
import { TreeCreationCelebration } from '@/components/onboarding/TreeCreationCelebration'
import { validateTextField, VALIDATION_LIMITS } from '@/utils/validation'
import { useFormValidation } from '@/hooks/useFormValidation'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Gender = 'male' | 'female' | 'other'

interface FamilyEntry {
  firstName: string
  lastName: string
  gender: Gender
}

type QuestionStep =
  | 'your-name'
  | 'tree-name'
  | 'gender'
  | 'birth-date'
  | 'spouse'
  | 'father'
  | 'mother'
  | 'paternal-gp'
  | 'maternal-gp'
  | 'children'
  | 'siblings'
  | 'review'
  | 'creating'
  | 'success'

interface WizardState {
  currentStep: QuestionStep
  direction: 'forward' | 'backward'
  treeName: string
  firstName: string
  lastName: string
  gender: Gender | ''
  birthDate: string
  spouse: FamilyEntry | null
  father: FamilyEntry | null
  mother: FamilyEntry | null
  paternalGrandfather: FamilyEntry | null
  paternalGrandmother: FamilyEntry | null
  maternalGrandfather: FamilyEntry | null
  maternalGrandmother: FamilyEntry | null
  children: FamilyEntry[]
  siblings: FamilyEntry[]
}

interface ConversationalWizardProps {
  open: boolean
  onClose: () => void
  onComplete: (treeId: string, action?: 'add-memory' | 'explore') => void
  userId: string
}

// ---------------------------------------------------------------------------
// Step ordering helpers
// ---------------------------------------------------------------------------

const ALL_STEPS: QuestionStep[] = [
  'your-name', 'tree-name', 'gender', 'birth-date',
  'spouse', 'father', 'mother', 'paternal-gp', 'maternal-gp',
  'children', 'siblings', 'review', 'creating', 'success',
]

function getApplicableSteps(state: WizardState): QuestionStep[] {
  return ALL_STEPS.filter(step => {
    if (step === 'paternal-gp') return !!state.father
    if (step === 'maternal-gp') return !!state.mother
    return true
  })
}

function getNextStep(state: WizardState): QuestionStep | null {
  const steps = getApplicableSteps(state)
  const idx = steps.indexOf(state.currentStep)
  return idx < steps.length - 1 ? steps[idx + 1] : null
}

function getPrevStep(state: WizardState): QuestionStep | null {
  const steps = getApplicableSteps(state)
  const idx = steps.indexOf(state.currentStep)
  return idx > 0 ? steps[idx - 1] : null
}

function getProgress(state: WizardState): number {
  const steps = getApplicableSteps(state)
  const idx = steps.indexOf(state.currentStep)
  // Don't count creating/success in denominator
  const total = steps.indexOf('review') + 1
  return Math.min(1, (idx + 1) / total)
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function GenderCard({ value, selected, onClick, label }: {
  value: Gender; selected: boolean; onClick: () => void; label: string
}) {
  const colors: Record<Gender, { bg: string; border: string; text: string }> = {
    male: { bg: 'bg-sky-50 dark:bg-sky-955/30', border: 'border-sky-400 dark:border-sky-500', text: 'text-sky-700 dark:text-sky-400' },
    female: { bg: 'bg-pink-50 dark:bg-pink-955/30', border: 'border-pink-400 dark:border-pink-500', text: 'text-pink-700 dark:text-pink-400' },
    other: { bg: 'bg-violet-50 dark:bg-violet-955/30', border: 'border-violet-400 dark:border-violet-500', text: 'text-violet-700 dark:text-violet-400' },
  }
  const c = colors[value]
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 min-w-0 py-3.5 px-2.5 sm:px-4 rounded-xl border-2 font-medium text-sm transition-all active:scale-95 flex items-center justify-center gap-1
        ${selected ? `${c.bg} ${c.border} ${c.text}` : 'bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-800 text-stone-600 dark:text-zinc-400 hover:border-stone-300 dark:hover:border-zinc-700'}`}
    >
      <span className="truncate">{label}</span>
      {selected && <Check className="w-4 h-4 shrink-0" />}
    </button>
  )
}

function EntryChip({ entry, onRemove }: { entry: FamilyEntry; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 dark:bg-zinc-800 rounded-full text-sm text-stone-700 dark:text-zinc-300">
      <User className="w-3.5 h-3.5 text-stone-400 dark:text-zinc-555" />
      {entry.firstName} {entry.lastName}
      <button type="button" onClick={onRemove} className="p-0.5 rounded-full hover:bg-stone-200 dark:hover:bg-zinc-700 transition-colors">
        <X className="w-3 h-3 text-stone-500 dark:text-zinc-400" />
      </button>
    </span>
  )
}

function MultiEntryForm({
  entries,
  onAdd,
  onRemove,
  defaultLastName,
  noun,
}: {
  entries: FamilyEntry[]
  onAdd: (e: FamilyEntry) => void
  onRemove: (i: number) => void
  defaultLastName: string
  noun: string
}) {
  const [showForm, setShowForm] = useState(entries.length === 0)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState(defaultLastName)
  const [gender, setGender] = useState<Gender>('male')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showForm) inputRef.current?.focus()
  }, [showForm])

  const {
    errors: validationErrors,
    validateField,
    sanitizeInput,
  } = useFormValidation();

  const config = {
    firstName: { required: false, type: 'name' as const, label: 'First Name' },
    lastName: { required: false, type: 'name' as const, label: 'Last Name' },
  };

  const isInvalid = !firstName.trim() || 
                    firstName.length > 50 || 
                    lastName.length > 50 || 
                    Object.keys(validationErrors).some(k => ['firstName', 'lastName'].includes(k));

  const handleAdd = () => {
    const requiredConfig = {
      firstName: { required: true, type: 'name' as const, label: 'First Name' },
      lastName: { required: false, type: 'name' as const, label: 'Last Name' },
    };
    const fError = validateField('firstName', firstName, requiredConfig.firstName);
    const lError = validateField('lastName', lastName, requiredConfig.lastName);
    
    if (fError || lError || isInvalid) return;

    onAdd({ firstName: firstName.trim(), lastName: lastName.trim(), gender })
    setFirstName('')
    setLastName(defaultLastName)
    setGender('male')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div className="space-y-3">
      {entries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {entries.map((e, i) => (
            <EntryChip key={`${e.firstName}-${i}`} entry={e} onRemove={() => onRemove(i)} />
          ))}
        </div>
      )}
      {showForm ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="First name"
              value={firstName}
              onChange={e => {
                const val = sanitizeInput(e.target.value)
                setFirstName(val)
                validateField('firstName', val, config.firstName)
              }}
              className="h-11 md:h-10 text-base md:text-sm flex-1"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              error={validationErrors.firstName}
              showCharCount
              charLimit={50}
            />
            <Input
              placeholder="Last name"
              value={lastName}
              onChange={e => {
                const val = sanitizeInput(e.target.value)
                setLastName(val)
                validateField('lastName', val, config.lastName)
              }}
              className="h-11 md:h-10 text-base md:text-sm flex-1"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              error={validationErrors.lastName}
              showCharCount
              charLimit={50}
            />
          </div>
          <div className="flex gap-2">
            {(['male', 'female', 'other'] as Gender[]).map(g => (
              <GenderCard key={g} value={g} selected={gender === g} onClick={() => setGender(g)} label={g === 'male' ? 'Male' : g === 'female' ? 'Female' : 'Other'} />
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleAdd} disabled={isInvalid}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#2F3E8F] dark:bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-[#3B4DA6] dark:hover:bg-blue-700 disabled:opacity-40 active:scale-95 transition-all">
              <Plus className="w-4 h-4" /> Add {noun}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-sm text-[#2F3E8F] dark:text-[#8CA0FF] hover:text-[#2F3E8F] dark:hover:text-[#A5B4FC] font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add another {noun}
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inline Edit Row (used in Review Step)
// ---------------------------------------------------------------------------
function InlineEditRow({ label, name, onSave }: { label: string, name: string, onSave: (first: string, last: string) => void }) {
  const [isEditing, setIsEditing] = useState(false)
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleEdit = () => {
    const parts = name.split(' ')
    setFirst(parts[0] || '')
    setLast(parts.slice(1).join(' ') || '')
    setIsEditing(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const {
    errors: validationErrors,
    validateField,
    sanitizeInput,
  } = useFormValidation();

  const config = {
    firstName: { required: true, type: 'name' as const, label: 'First Name' },
    lastName: { required: false, type: 'name' as const, label: 'Last Name' },
  };

  const isInvalid = !first.trim() || 
                    first.length > 50 || 
                    last.length > 50 || 
                    Object.keys(validationErrors).some(k => ['firstName', 'lastName'].includes(k));

  const handleSave = () => {
    if (!isInvalid) {
      onSave(first.trim(), last.trim())
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <div className="py-2 px-3 rounded-xl bg-stone-50 dark:bg-zinc-900/50 border border-stone-200 dark:border-zinc-800">
        <span className="text-[11px] font-medium text-stone-400 dark:text-zinc-555 uppercase tracking-wider block mb-1.5">{label}</span>
        <div className="flex gap-2">
          <Input 
            ref={inputRef}
            placeholder="First name"
            value={first}
            onChange={e => {
              const val = sanitizeInput(e.target.value)
              setFirst(val)
              validateField('firstName', val, config.firstName)
            }}
            className="h-9 text-sm flex-1 bg-white dark:bg-zinc-950"
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            error={validationErrors.firstName}
            showCharCount
            charLimit={50}
          />
          <Input 
            placeholder="Last name"
            value={last}
            onChange={e => {
              const val = sanitizeInput(e.target.value)
              setLast(val)
              validateField('lastName', val, config.lastName)
            }}
            className="h-9 text-sm flex-1 bg-white dark:bg-zinc-950"
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            error={validationErrors.lastName}
            showCharCount
            charLimit={50}
          />
          <button type="button" onClick={handleSave} disabled={isInvalid} className="px-3 bg-[#2F3E8F] dark:bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-[#3B4DA6] dark:hover:bg-blue-700 disabled:opacity-50">
            Save
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-stone-50 dark:bg-zinc-900/50 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors">
      <div>
        <span className="text-[11px] font-medium text-stone-400 dark:text-zinc-555 uppercase tracking-wider block mb-0.5">{label}</span>
        <p className="text-sm font-semibold text-stone-800 dark:text-zinc-200">{name}</p>
      </div>
      <button type="button" onClick={handleEdit} className="text-xs text-[#2F3E8F] dark:text-[#8CA0FF] hover:text-[#3B4DA6] dark:hover:text-[#A5B4FC] font-semibold px-2 py-1 bg-white dark:bg-zinc-800 rounded-md border border-stone-200 dark:border-zinc-700 shadow-sm active:scale-95 transition-all">
        Edit
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ConversationalWizard({ open, onClose, onComplete, userId }: ConversationalWizardProps) {
  const { toast } = useToast()

  const initialState: WizardState = {
    currentStep: 'your-name',
    direction: 'forward',
    treeName: '',
    firstName: '',
    lastName: '',
    gender: '',
    birthDate: '',
    spouse: null,
    father: null,
    mother: null,
    paternalGrandfather: null,
    paternalGrandmother: null,
    maternalGrandfather: null,
    maternalGrandmother: null,
    children: [],
    siblings: [],
  }

  const [state, setState] = useState<WizardState>(initialState)
  const [loading, setLoading] = useState(false)
  const [creatingMessage, setCreatingMessage] = useState('')
  const [createdTreeId, setCreatedTreeId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Temp form fields for spouse/father/mother/gp steps
  const [tempFirstName, setTempFirstName] = useState('')
  const [tempLastName, setTempLastName] = useState('')
  // Second person fields for grandparent steps
  const [temp2FirstName, setTemp2FirstName] = useState('')
  const [temp2LastName, setTemp2LastName] = useState('')

  const {
    errors: validationErrors,
    validateField,
    validateStep,
    sanitizeInput,
    resetValidation,
    clearError,
  } = useFormValidation();

  const stepYourNameConfig = {
    firstName: { required: true, type: 'name' as const, label: 'First Name' },
    lastName: { required: false, type: 'name' as const, label: 'Last Name' },
  };

  const stepTreeNameConfig = {
    treeName: { required: true, type: 'tree_name' as const, label: 'Tree Name' },
  };

  const stepTempConfig = {
    tempFirstName: { required: true, type: 'name' as const, label: 'First Name' },
    tempLastName: { required: false, type: 'name' as const, label: 'Last Name' },
  };

  const stepTemp2Config = {
    temp2FirstName: { required: true, type: 'name' as const, label: 'First Name' },
    temp2LastName: { required: false, type: 'name' as const, label: 'Last Name' },
  };

  const stepGrandparentConfig = {
    tempFirstName: { required: true, type: 'name' as const, label: 'First Name' },
    tempLastName: { required: false, type: 'name' as const, label: 'Last Name' },
  };

  const stepGrandparent2Config = {
    temp2FirstName: { required: true, type: 'name' as const, label: 'First Name' },
    temp2LastName: { required: false, type: 'name' as const, label: 'Last Name' },
  };

  // Validation selectors using hook state
  const isYourNameInvalid = !state.firstName.trim() || 
                            state.firstName.length > 50 || 
                            state.lastName.length > 50 || 
                            Object.keys(validationErrors).some(k => ['firstName', 'lastName'].includes(k));

  const isTreeNameInvalid = !state.treeName.trim() || 
                            state.treeName.length > 50 || 
                            Object.keys(validationErrors).some(k => ['treeName'].includes(k));

  const isTempInvalid = !tempFirstName.trim() || 
                        tempFirstName.length > 50 || 
                        tempLastName.length > 50 || 
                        Object.keys(validationErrors).some(k => ['tempFirstName', 'tempLastName'].includes(k));

  const isTemp2Invalid = !temp2FirstName.trim() || 
                         temp2FirstName.length > 50 || 
                         temp2LastName.length > 50 || 
                         Object.keys(validationErrors).some(k => ['temp2FirstName', 'temp2LastName'].includes(k));

  const isGrandparentStepInvalid = (() => {
    const hasGrandfather = !!tempFirstName.trim();
    const hasGrandmother = !!temp2FirstName.trim();
    if (!hasGrandfather && !hasGrandmother) return true;

    if (hasGrandfather) {
      if (tempFirstName.length > 50) return true;
      if (tempLastName.length > 50) return true;
      if (validationErrors.tempFirstName || validationErrors.tempLastName) return true;
    } else if (tempLastName.trim()) {
      return true;
    }

    if (hasGrandmother) {
      if (temp2FirstName.length > 50) return true;
      if (temp2LastName.length > 50) return true;
      if (validationErrors.temp2FirstName || validationErrors.temp2LastName) return true;
    } else if (temp2LastName.trim()) {
      return true;
    }

    return false;
  })();

  useEffect(() => {
    if (['paternal-gp', 'maternal-gp'].includes(state.currentStep)) {
      if (!tempFirstName.trim() && !tempLastName.trim()) {
        clearError('tempFirstName');
        clearError('tempLastName');
      }
    }
  }, [tempFirstName, tempLastName, state.currentStep, clearError]);

  useEffect(() => {
    if (['paternal-gp', 'maternal-gp'].includes(state.currentStep)) {
      if (!temp2FirstName.trim() && !temp2LastName.trim()) {
        clearError('temp2FirstName');
        clearError('temp2LastName');
      }
    }
  }, [temp2FirstName, temp2LastName, state.currentStep, clearError]);

  const resetTempFields = useCallback(() => {
    setTempFirstName('')
    setTempLastName('')
    setTemp2FirstName('')
    setTemp2LastName('')
  }, [])

  // Pre-populate temp fields when navigating back to a step
  useEffect(() => {
    const s = state.currentStep
    if (s === 'spouse' && state.spouse) {
      setTempFirstName(state.spouse.firstName)
      setTempLastName(state.spouse.lastName)
    } else if (s === 'father') {
      setTempFirstName(state.father?.firstName || '')
      setTempLastName(state.father ? state.father.lastName : state.lastName)
    } else if (s === 'mother') {
      setTempFirstName(state.mother?.firstName || '')
      setTempLastName(state.mother?.lastName || '')
    } else if (s === 'paternal-gp') {
      setTempFirstName(state.paternalGrandfather?.firstName || '')
      setTempLastName(state.paternalGrandfather ? state.paternalGrandfather.lastName : state.lastName)
      setTemp2FirstName(state.paternalGrandmother?.firstName || '')
      setTemp2LastName(state.paternalGrandmother?.lastName || '')
    } else if (s === 'maternal-gp') {
      setTempFirstName(state.maternalGrandfather?.firstName || '')
      setTempLastName(state.maternalGrandfather?.lastName || '')
      setTemp2FirstName(state.maternalGrandmother?.firstName || '')
      setTemp2LastName(state.maternalGrandmother?.lastName || '')
    } else {
      // Don't reset — only reset when going to a step with no existing data
      if (!['your-name', 'tree-name', 'gender', 'birth-date', 'children', 'siblings', 'review', 'creating', 'success'].includes(s)) {
        resetTempFields()
      }
    }
  }, [state.currentStep]) // eslint-disable-line react-hooks/exhaustive-deps

  const goForward = useCallback(() => {
    // Run validation before proceeding
    const currentStep = state.currentStep;
    if (currentStep === 'your-name') {
      const isValid = validateStep(
        { firstName: state.firstName, lastName: state.lastName },
        stepYourNameConfig
      );
      if (!isValid) return;
    } else if (currentStep === 'tree-name') {
      const isValid = validateStep(
        { treeName: state.treeName },
        stepTreeNameConfig
      );
      if (!isValid) return;
    } else if (['spouse', 'father', 'mother'].includes(currentStep)) {
      if (tempFirstName.trim() || tempLastName.trim()) {
        const isValid = validateStep(
          { tempFirstName, tempLastName },
          stepTempConfig
        );
        if (!isValid) return;
      }
    } else if (['paternal-gp', 'maternal-gp'].includes(currentStep)) {
      if (tempFirstName.trim() || tempLastName.trim() || temp2FirstName.trim() || temp2LastName.trim()) {
        let isValid = true;
        if (tempFirstName.trim() || tempLastName.trim()) {
          isValid = validateStep(
            { tempFirstName, tempLastName },
            stepGrandparentConfig
          ) && isValid;
        }
        if (temp2FirstName.trim() || temp2LastName.trim()) {
          isValid = validateStep(
            { temp2FirstName, temp2LastName },
            stepGrandparent2Config
          ) && isValid;
        }
        if (!isValid) return;
      }
    }

    const next = getNextStep(state)
    if (next) setState(prev => ({ ...prev, currentStep: next, direction: 'forward' }))
  }, [state, tempFirstName, tempLastName, temp2FirstName, temp2LastName, validateStep])

  const goBack = useCallback(() => {
    const prev = getPrevStep(state)
    if (prev) setState(s => ({ ...s, currentStep: prev, direction: 'backward' }))
  }, [state])

  const goToStep = useCallback((step: QuestionStep) => {
    const steps = getApplicableSteps(state)
    const curIdx = steps.indexOf(state.currentStep)
    const targetIdx = steps.indexOf(step)
    setState(prev => ({
      ...prev,
      currentStep: step,
      direction: targetIdx < curIdx ? 'backward' : 'forward',
    }))
  }, [state])

  // Save current step data before advancing
  const saveAndContinue = useCallback(() => {
    const s = state.currentStep

    if (s === 'spouse') {
      if (tempFirstName.trim() || tempLastName.trim()) {
        const isValid = validateStep(
          { tempFirstName, tempLastName },
          stepTempConfig
        );
        if (!isValid) return;
      }
      if (isTempInvalid) return
      const entry = tempFirstName.trim()
        ? { firstName: tempFirstName.trim(), lastName: tempLastName.trim(), gender: (state.gender === 'female' ? 'male' : 'female') as Gender }
        : null
      setState(prev => ({ ...prev, spouse: entry }))
      resetTempFields()
    } else if (s === 'father') {
      if (tempFirstName.trim() || tempLastName.trim()) {
        const isValid = validateStep(
          { tempFirstName, tempLastName },
          stepTempConfig
        );
        if (!isValid) return;
      }
      if (isTempInvalid) return
      const entry = tempFirstName.trim()
        ? { firstName: tempFirstName.trim(), lastName: tempLastName.trim() || state.lastName, gender: 'male' as Gender }
        : null
      setState(prev => ({ ...prev, father: entry }))
      resetTempFields()
    } else if (s === 'mother') {
      if (tempFirstName.trim() || tempLastName.trim()) {
        const isValid = validateStep(
          { tempFirstName, tempLastName },
          stepTempConfig
        );
        if (!isValid) return;
      }
      if (isTempInvalid) return
      const entry = tempFirstName.trim()
        ? { firstName: tempFirstName.trim(), lastName: tempLastName.trim(), gender: 'female' as Gender }
        : null
      setState(prev => ({ ...prev, mother: entry }))
      resetTempFields()
    } else if (s === 'paternal-gp') {
      let isValid = true;
      if (tempFirstName.trim() || tempLastName.trim()) {
        isValid = validateStep(
          { tempFirstName, tempLastName },
          stepGrandparentConfig
        ) && isValid;
      }
      if (temp2FirstName.trim() || temp2LastName.trim()) {
        isValid = validateStep(
          { temp2FirstName, temp2LastName },
          stepGrandparent2Config
        ) && isValid;
      }
      if (!isValid) return;
      if (isGrandparentStepInvalid) return;
      const gf = tempFirstName.trim()
        ? { firstName: tempFirstName.trim(), lastName: tempLastName.trim() || state.lastName, gender: 'male' as Gender }
        : null
      const gm = temp2FirstName.trim()
        ? { firstName: temp2FirstName.trim(), lastName: temp2LastName.trim(), gender: 'female' as Gender }
        : null
      setState(prev => ({ ...prev, paternalGrandfather: gf, paternalGrandmother: gm }))
      resetTempFields()
    } else if (s === 'maternal-gp') {
      let isValid = true;
      if (tempFirstName.trim() || tempLastName.trim()) {
        isValid = validateStep(
          { tempFirstName, tempLastName },
          stepGrandparentConfig
        ) && isValid;
      }
      if (temp2FirstName.trim() || temp2LastName.trim()) {
        isValid = validateStep(
          { temp2FirstName, temp2LastName },
          stepGrandparent2Config
        ) && isValid;
      }
      if (!isValid) return;
      if (isGrandparentStepInvalid) return;
      const gf = tempFirstName.trim()
        ? { firstName: tempFirstName.trim(), lastName: tempLastName.trim(), gender: 'male' as Gender }
        : null
      const gm = temp2FirstName.trim()
        ? { firstName: temp2FirstName.trim(), lastName: temp2LastName.trim(), gender: 'female' as Gender }
        : null
      setState(prev => ({ ...prev, maternalGrandfather: gf, maternalGrandmother: gm }))
      resetTempFields()
    }

    goForward()
  }, [state, tempFirstName, tempLastName, temp2FirstName, temp2LastName, goForward, resetTempFields, validateStep, isTempInvalid, isTemp2Invalid, isGrandparentStepInvalid])

  const skipStep = useCallback(() => {
    const s = state.currentStep
    resetValidation()
    resetTempFields()
    
    setState(prev => {
      const tempState = { ...prev }
      if (s === 'spouse') tempState.spouse = null
      else if (s === 'father') {
        tempState.father = null
        tempState.paternalGrandfather = null
        tempState.paternalGrandmother = null
      }
      else if (s === 'mother') {
        tempState.mother = null
        tempState.maternalGrandfather = null
        tempState.maternalGrandmother = null
      }
      else if (s === 'paternal-gp') {
        tempState.paternalGrandfather = null
        tempState.paternalGrandmother = null
      }
      else if (s === 'maternal-gp') {
        tempState.maternalGrandfather = null
        tempState.maternalGrandmother = null
      }
      
      const next = getNextStep(tempState)
      if (next) {
        return {
          ...tempState,
          currentStep: next,
          direction: 'forward'
        }
      }
      return tempState
    })
  }, [state.currentStep, resetTempFields, resetValidation])

  // -------------------------------------------------------------------------
  // Submission
  // -------------------------------------------------------------------------

  const handleSubmit = async () => {
    setState(prev => ({ ...prev, currentStep: 'creating', direction: 'forward' }))
    setLoading(true)

    let createdTreeIdForCleanup: string | null = null
    try {
      // 1. Create tree
      setCreatingMessage('Creating your family tree...')
      const tree = await neo4jAPI.createTree(state.treeName, userId, '')
      const treeId = tree.treeId
      createdTreeIdForCleanup = treeId

      // 2. Create home person (Root)
      setCreatingMessage('Adding you to the tree...')
      const homePerson = await neo4jAPI.createRootPerson(treeId, {
        firstName: state.firstName,
        lastName: state.lastName,
        gender: state.gender as Gender,
        birthDate: state.birthDate || undefined,
        isHomePerson: true,
        isLiving: true,
      })
      const homeId = homePerson.personId

      // 3. Prepare family members for Quick Add API
      const relatives: any[] = []
      const mapEntry = (entry: FamilyEntry, type: string) => ({
        type,
        firstName: entry.firstName,
        lastName: entry.lastName,
        gender: entry.gender,
      })

      if (state.father) relatives.push(mapEntry(state.father, 'father'))
      if (state.mother) relatives.push(mapEntry(state.mother, 'mother'))
      if (state.spouse) relatives.push(mapEntry(state.spouse, 'spouse'))
      if (state.paternalGrandfather) relatives.push(mapEntry(state.paternalGrandfather, 'paternal_grandfather'))
      if (state.paternalGrandmother) relatives.push(mapEntry(state.paternalGrandmother, 'paternal_grandmother'))
      if (state.maternalGrandfather) relatives.push(mapEntry(state.maternalGrandfather, 'maternal_grandfather'))
      if (state.maternalGrandmother) relatives.push(mapEntry(state.maternalGrandmother, 'maternal_grandmother'))

      // Children
      state.children.forEach(child => {
        if (child.firstName.trim()) {
          relatives.push(mapEntry(child, child.gender === 'male' ? 'son' : child.gender === 'female' ? 'daughter' : 'child'))
        }
      })

      // Siblings
      state.siblings.forEach(sibling => {
        if (sibling.firstName.trim()) {
          relatives.push(mapEntry(sibling, sibling.gender === 'male' ? 'brother' : sibling.gender === 'female' ? 'sister' : 'sibling'))
        }
      })

      // 4. Submit all relatives in one batch
      if (relatives.length > 0) {
        setCreatingMessage('Adding your family members...')
        await neo4jAPI.quickAddRelatives(treeId, homeId, relatives)
      }

      setCreatedTreeId(treeId)
      setCreatingMessage('')
      setState(prev => ({ ...prev, currentStep: 'success', direction: 'forward' }))
    } catch (error: unknown) {
      // Clean up the orphan tree if it was created but person creation failed
      if (createdTreeIdForCleanup) {
        neo4jAPI.deleteTree(createdTreeIdForCleanup).catch(err =>
          console.error('Failed to clean up orphan tree:', err)
        )
      }
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
        variant: 'destructive',
      })
      // Go back to review so they can retry
      setState(prev => ({ ...prev, currentStep: 'review', direction: 'backward' }))
    } finally {
      setLoading(false)
    }
  }

  const handleFinish = () => {
    if (createdTreeId) {
      const id = createdTreeId
      setState(initialState)
      setCreatedTreeId(null)
      onComplete(id)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && !loading) {
      setState(initialState)
      setCreatedTreeId(null)
      resetTempFields()
      onClose()
    }
  }

  // Count family members for review
  const memberCount = [
    state.spouse, state.father, state.mother,
    state.paternalGrandfather, state.paternalGrandmother,
    state.maternalGrandfather, state.maternalGrandmother,
  ].filter(Boolean).length + state.children.length + state.siblings.length

  // Focus first input on step change
  const firstInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const timer = setTimeout(() => firstInputRef.current?.focus(), 350)
    return () => clearTimeout(timer)
  }, [state.currentStep])

  // -------------------------------------------------------------------------
  // Step renderers
  // -------------------------------------------------------------------------

  const renderStep = () => {
    const step = state.currentStep

    // --- Your Name ---
    if (step === 'your-name') {
      return (
        <StepContainer question="What's your name?" subtitle="Let's start with the basics.">
          <div className="flex gap-3">
            <Input
              ref={firstInputRef}
              placeholder="First name"
              value={state.firstName}
              onChange={e => {
                const val = sanitizeInput(e.target.value)
                setState(prev => ({ ...prev, firstName: val }))
                validateField('firstName', val, stepYourNameConfig.firstName)
              }}
              className="h-12 md:h-11 text-base md:text-sm flex-1"
              onKeyDown={e => e.key === 'Enter' && state.firstName.trim() && !isYourNameInvalid && goForward()}
              error={validationErrors.firstName}
              showCharCount
              charLimit={50}
            />
            <Input
              placeholder="Last name"
              value={state.lastName}
              onChange={e => {
                const val = sanitizeInput(e.target.value)
                setState(prev => ({ ...prev, lastName: val }))
                validateField('lastName', val, stepYourNameConfig.lastName)
              }}
              className="h-12 md:h-11 text-base md:text-sm flex-1"
              onKeyDown={e => e.key === 'Enter' && state.firstName.trim() && !isYourNameInvalid && goForward()}
              error={validationErrors.lastName}
              showCharCount
              charLimit={50}
            />
          </div>
          <div className="pt-2">
            <ContinueButton onClick={goForward} disabled={!state.firstName.trim() || isYourNameInvalid} />
          </div>
        </StepContainer>
      )
    }

    // --- Tree Name ---
    if (step === 'tree-name') {
      const suggested = `${state.lastName} Family`
      return (
        <StepContainer question="What would you like to call your family story?" subtitle="You can always change this later.">
          <Input
            ref={firstInputRef}
            placeholder={suggested}
            value={state.treeName}
            onChange={e => {
              const val = sanitizeInput(e.target.value)
              setState(prev => ({ ...prev, treeName: val }))
              validateField('treeName', val, stepTreeNameConfig.treeName)
            }}
            className="h-12 md:h-11 text-base md:text-sm"
            onKeyDown={e => e.key === 'Enter' && (state.treeName.trim() || suggested) && !isTreeNameInvalid && goForward()}
            error={validationErrors.treeName}
            showCharCount
            charLimit={50}
          />
          {!state.treeName.trim() && (
            <button
              type="button"
              onClick={() => {
                setState(prev => ({ ...prev, treeName: suggested }))
                validateField('treeName', suggested, stepTreeNameConfig.treeName)
              }}
              className="text-sm text-[#2F3E8F] dark:text-[#8CA0FF] hover:text-[#2F3E8F] dark:hover:text-[#A5B4FC] font-medium transition-colors"
            >
              Use &ldquo;{suggested}&rdquo;
            </button>
          )}
          <div className="pt-2">
            <ContinueButton
              onClick={() => {
                if (!state.treeName.trim()) {
                  setState(prev => ({ ...prev, treeName: suggested }))
                  validateField('treeName', suggested, stepTreeNameConfig.treeName)
                }
                goForward()
              }}
              disabled={isTreeNameInvalid}
            />
          </div>
        </StepContainer>
      )
    }

    // --- Gender ---
    if (step === 'gender') {
      return (
        <StepContainer question="How would you like to be identified?">
          <div className="flex gap-2 sm:gap-3">
            <GenderCard value="male" selected={state.gender === 'male'} onClick={() => setState(prev => ({ ...prev, gender: 'male' }))} label="Male" />
            <GenderCard value="female" selected={state.gender === 'female'} onClick={() => setState(prev => ({ ...prev, gender: 'female' }))} label="Female" />
            <GenderCard value="other" selected={state.gender === 'other'} onClick={() => setState(prev => ({ ...prev, gender: 'other' }))} label="Other" />
          </div>
          <div className="pt-2">
            <ContinueButton onClick={goForward} disabled={!state.gender} />
          </div>
        </StepContainer>
      )
    }

    // --- Birth Date ---
    if (step === 'birth-date') {
      return (
        <StepContainer question="When were you born?" subtitle="This helps build your timeline.">
          <div>
            <label className="block text-xs font-medium text-stone-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Birth Date</label>
            <DateInput
              value={state.birthDate}
              onChange={e => setState(prev => ({ ...prev, birthDate: e.target.value }))}
              max={new Date().toISOString().split('T')[0]}
              className="h-12 md:h-11 text-base md:text-sm"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
            <ContinueButton onClick={goForward} />
            <SkipButton onClick={skipStep} />
          </div>
        </StepContainer>
      )
    }

    // --- Spouse ---
    if (step === 'spouse') {
      return (
        <StepContainer question="Are you married or have a partner?" subtitle="We'll add them to your tree.">
          <div className="flex gap-3">
            <Input
              ref={firstInputRef}
              placeholder="First name"
              value={tempFirstName}
              onChange={e => {
                const val = sanitizeInput(e.target.value)
                setTempFirstName(val)
                validateField('tempFirstName', val, stepTempConfig.tempFirstName)
              }}
              className="h-12 md:h-11 text-base md:text-sm flex-1"
              onKeyDown={e => e.key === 'Enter' && tempFirstName.trim() && !isTempInvalid && saveAndContinue()}
              error={validationErrors.tempFirstName}
              showCharCount
              charLimit={50}
            />
            <Input
              placeholder="Last name"
              value={tempLastName}
              onChange={e => {
                const val = sanitizeInput(e.target.value)
                setTempLastName(val)
                validateField('tempLastName', val, stepTempConfig.tempLastName)
              }}
              className="h-12 md:h-11 text-base md:text-sm flex-1"
              onKeyDown={e => e.key === 'Enter' && tempFirstName.trim() && !isTempInvalid && saveAndContinue()}
              error={validationErrors.tempLastName}
              showCharCount
              charLimit={50}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
            <ContinueButton onClick={saveAndContinue} disabled={!tempFirstName.trim() || isTempInvalid} />
            <SkipButton onClick={skipStep} label="Skip now" />
          </div>
        </StepContainer>
      )
    }

    // --- Father ---
    if (step === 'father') {
      return (
        <StepContainer question="What's your father's name?">
          <div className="flex gap-3">
            <Input
              ref={firstInputRef}
              placeholder="First name"
              value={tempFirstName}
              onChange={e => {
                const val = sanitizeInput(e.target.value)
                setTempFirstName(val)
                validateField('tempFirstName', val, stepTempConfig.tempFirstName)
              }}
              className="h-12 md:h-11 text-base md:text-sm flex-1"
              onKeyDown={e => e.key === 'Enter' && tempFirstName.trim() && !isTempInvalid && saveAndContinue()}
              error={validationErrors.tempFirstName}
              showCharCount
              charLimit={50}
            />
            <Input
              placeholder="Last name"
              value={tempLastName}
              onChange={e => {
                const val = sanitizeInput(e.target.value)
                setTempLastName(val)
                validateField('tempLastName', val, stepTempConfig.tempLastName)
              }}
              className="h-12 md:h-11 text-base md:text-sm flex-1"
              onKeyDown={e => e.key === 'Enter' && tempFirstName.trim() && !isTempInvalid && saveAndContinue()}
              error={validationErrors.tempLastName}
              showCharCount
              charLimit={50}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
            <ContinueButton onClick={saveAndContinue} disabled={!tempFirstName.trim() || isTempInvalid} />
            <SkipButton onClick={skipStep} />
          </div>
        </StepContainer>
      )
    }

    // --- Mother ---
    if (step === 'mother') {
      return (
        <StepContainer question="What's your mother's name?">
          <div className="flex gap-3">
            <Input
              ref={firstInputRef}
              placeholder="First name"
              value={tempFirstName}
              onChange={e => {
                const val = sanitizeInput(e.target.value)
                setTempFirstName(val)
                validateField('tempFirstName', val, stepTempConfig.tempFirstName)
              }}
              className="h-12 md:h-11 text-base md:text-sm flex-1"
              onKeyDown={e => e.key === 'Enter' && tempFirstName.trim() && !isTempInvalid && saveAndContinue()}
              error={validationErrors.tempFirstName}
              showCharCount
              charLimit={50}
            />
            <Input
              placeholder="Last name"
              value={tempLastName}
              onChange={e => {
                const val = sanitizeInput(e.target.value)
                setTempLastName(val)
                validateField('tempLastName', val, stepTempConfig.tempLastName)
              }}
              className="h-12 md:h-11 text-base md:text-sm flex-1"
              onKeyDown={e => e.key === 'Enter' && tempFirstName.trim() && !isTempInvalid && saveAndContinue()}
              error={validationErrors.tempLastName}
              showCharCount
              charLimit={50}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
            <ContinueButton onClick={saveAndContinue} disabled={!tempFirstName.trim() || isTempInvalid} />
            <SkipButton onClick={skipStep} />
          </div>
        </StepContainer>
      )
    }

    // --- Paternal Grandparents ---
    if (step === 'paternal-gp') {
      return (
        <StepContainer question="Do you know your father's parents?" subtitle={`${state.father?.firstName || 'Your father'}'s parents`}>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-stone-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Grandfather</p>
              <div className="flex gap-3">
                <Input
                  ref={firstInputRef}
                  placeholder="First name"
                  value={tempFirstName}
                  onChange={e => {
                    const val = sanitizeInput(e.target.value)
                    setTempFirstName(val)
                    validateField('tempFirstName', val, stepGrandparentConfig.tempFirstName)
                  }}
                  className="h-12 md:h-11 text-base md:text-sm flex-1"
                  error={validationErrors.tempFirstName}
                  showCharCount
                  charLimit={50}
                />
                <Input
                  placeholder="Last name"
                  value={tempLastName}
                  onChange={e => {
                    const val = sanitizeInput(e.target.value)
                    setTempLastName(val)
                    validateField('tempLastName', val, stepGrandparentConfig.tempLastName)
                  }}
                  className="h-12 md:h-11 text-base md:text-sm flex-1"
                  error={validationErrors.tempLastName}
                  showCharCount
                  charLimit={50}
                />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-stone-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Grandmother</p>
              <div className="flex gap-3">
                <Input
                  placeholder="First name"
                  value={temp2FirstName}
                  onChange={e => {
                    const val = sanitizeInput(e.target.value)
                    setTemp2FirstName(val)
                    validateField('temp2FirstName', val, stepGrandparent2Config.temp2FirstName)
                  }}
                  className="h-12 md:h-11 text-base md:text-sm flex-1"
                  error={validationErrors.temp2FirstName}
                  showCharCount
                  charLimit={50}
                />
                <Input
                  placeholder="Last name"
                  value={temp2LastName}
                  onChange={e => {
                    const val = sanitizeInput(e.target.value)
                    setTemp2LastName(val)
                    validateField('temp2LastName', val, stepGrandparent2Config.temp2LastName)
                  }}
                  className="h-12 md:h-11 text-base md:text-sm flex-1"
                  error={validationErrors.temp2LastName}
                  showCharCount
                  charLimit={50}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
            <ContinueButton onClick={saveAndContinue} disabled={isGrandparentStepInvalid} />
            <SkipButton onClick={skipStep} />
          </div>
        </StepContainer>
      )
    }

    // --- Maternal Grandparents ---
    if (step === 'maternal-gp') {
      return (
        <StepContainer question="Do you know your mother's parents?" subtitle={`${state.mother?.firstName || 'Your mother'}'s parents`}>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-stone-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Grandfather</p>
              <div className="flex gap-3">
                <Input
                  ref={firstInputRef}
                  placeholder="First name"
                  value={tempFirstName}
                  onChange={e => {
                    const val = sanitizeInput(e.target.value)
                    setTempFirstName(val)
                    validateField('tempFirstName', val, stepGrandparentConfig.tempFirstName)
                  }}
                  className="h-12 md:h-11 text-base md:text-sm flex-1"
                  error={validationErrors.tempFirstName}
                  showCharCount
                  charLimit={50}
                />
                <Input
                  placeholder="Last name"
                  value={tempLastName}
                  onChange={e => {
                    const val = sanitizeInput(e.target.value)
                    setTempLastName(val)
                    validateField('tempLastName', val, stepGrandparentConfig.tempLastName)
                  }}
                  className="h-12 md:h-11 text-base md:text-sm flex-1"
                  error={validationErrors.tempLastName}
                  showCharCount
                  charLimit={50}
                />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-stone-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Grandmother</p>
              <div className="flex gap-3">
                <Input
                  placeholder="First name"
                  value={temp2FirstName}
                  onChange={e => {
                    const val = sanitizeInput(e.target.value)
                    setTemp2FirstName(val)
                    validateField('temp2FirstName', val, stepGrandparent2Config.temp2FirstName)
                  }}
                  className="h-12 md:h-11 text-base md:text-sm flex-1"
                  error={validationErrors.temp2FirstName}
                  showCharCount
                  charLimit={50}
                />
                <Input
                  placeholder="Last name"
                  value={temp2LastName}
                  onChange={e => {
                    const val = sanitizeInput(e.target.value)
                    setTemp2LastName(val)
                    validateField('temp2LastName', val, stepGrandparent2Config.temp2LastName)
                  }}
                  className="h-12 md:h-11 text-base md:text-sm flex-1"
                  error={validationErrors.temp2LastName}
                  showCharCount
                  charLimit={50}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
            <ContinueButton onClick={saveAndContinue} disabled={isGrandparentStepInvalid} />
            <SkipButton onClick={skipStep} />
          </div>
        </StepContainer>
      )
    }

    // --- Children ---
    if (step === 'children') {
      return (
        <StepContainer question="Do you have any children?">
          <MultiEntryForm
            entries={state.children}
            onAdd={entry => setState(prev => ({ ...prev, children: [...prev.children, entry] }))}
            onRemove={i => setState(prev => ({ ...prev, children: prev.children.filter((_, idx) => idx !== i) }))}
            defaultLastName={state.lastName}
            noun="child"
          />
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
            {state.children.length > 0 ? (
              <ContinueButton onClick={goForward} label="Continue" />
            ) : (
              <SkipButton onClick={goForward} label="Skip" />
            )}
          </div>
        </StepContainer>
      )
    }

    // --- Siblings ---
    if (step === 'siblings') {
      return (
        <StepContainer question="Do you have any brothers or sisters?">
          <MultiEntryForm
            entries={state.siblings}
            onAdd={entry => setState(prev => ({ ...prev, siblings: [...prev.siblings, entry] }))}
            onRemove={i => setState(prev => ({ ...prev, siblings: prev.siblings.filter((_, idx) => idx !== i) }))}
            defaultLastName={state.lastName}
            noun="sibling"
          />
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
            {state.siblings.length > 0 ? (
              <ContinueButton onClick={goForward} label="Continue" />
            ) : (
              <SkipButton onClick={goForward} label="Skip" />
            )}
          </div>
        </StepContainer>
      )
    }

    // --- Review ---
    if (step === 'review') {
      const rows: Array<{ label: string; name: string; onSave: (f: string, l: string) => void }> = []
      
      rows.push({
        label: 'You',
        name: `${state.firstName} ${state.lastName}`,
        onSave: (f, l) => setState(prev => ({ ...prev, firstName: f, lastName: l }))
      })
      if (state.spouse) rows.push({
        label: 'Spouse',
        name: `${state.spouse.firstName} ${state.spouse.lastName}`,
        onSave: (f, l) => setState(prev => ({ ...prev, spouse: { ...prev.spouse!, firstName: f, lastName: l } }))
      })
      if (state.father) rows.push({
        label: 'Father',
        name: `${state.father.firstName} ${state.father.lastName}`,
        onSave: (f, l) => setState(prev => ({ ...prev, father: { ...prev.father!, firstName: f, lastName: l } }))
      })
      if (state.mother) rows.push({
        label: 'Mother',
        name: `${state.mother.firstName} ${state.mother.lastName}`,
        onSave: (f, l) => setState(prev => ({ ...prev, mother: { ...prev.mother!, firstName: f, lastName: l } }))
      })
      if (state.paternalGrandfather) rows.push({
        label: 'Paternal Grandfather',
        name: `${state.paternalGrandfather.firstName} ${state.paternalGrandfather.lastName}`,
        onSave: (f, l) => setState(prev => ({ ...prev, paternalGrandfather: { ...prev.paternalGrandfather!, firstName: f, lastName: l } }))
      })
      if (state.paternalGrandmother) rows.push({
        label: 'Paternal Grandmother',
        name: `${state.paternalGrandmother.firstName} ${state.paternalGrandmother.lastName}`,
        onSave: (f, l) => setState(prev => ({ ...prev, paternalGrandmother: { ...prev.paternalGrandmother!, firstName: f, lastName: l } }))
      })
      if (state.maternalGrandfather) rows.push({
        label: 'Maternal Grandfather',
        name: `${state.maternalGrandfather.firstName} ${state.maternalGrandfather.lastName}`,
        onSave: (f, l) => setState(prev => ({ ...prev, maternalGrandfather: { ...prev.maternalGrandfather!, firstName: f, lastName: l } }))
      })
      if (state.maternalGrandmother) rows.push({
        label: 'Maternal Grandmother',
        name: `${state.maternalGrandmother.firstName} ${state.maternalGrandmother.lastName}`,
        onSave: (f, l) => setState(prev => ({ ...prev, maternalGrandmother: { ...prev.maternalGrandmother!, firstName: f, lastName: l } }))
      })
      state.children.forEach((c, i) => rows.push({
        label: `Child ${i + 1}`,
        name: `${c.firstName} ${c.lastName}`,
        onSave: (f, l) => setState(prev => {
          const next = [...prev.children]
          next[i] = { ...next[i], firstName: f, lastName: l }
          return { ...prev, children: next }
        })
      }))
      state.siblings.forEach((s, i) => rows.push({
        label: `Sibling ${i + 1}`,
        name: `${s.firstName} ${s.lastName}`,
        onSave: (f, l) => setState(prev => {
          const next = [...prev.siblings]
          next[i] = { ...next[i], firstName: f, lastName: l }
          return { ...prev, siblings: next }
        })
      }))

      return (
        <StepContainer question="Here's your family so far" subtitle={`${rows.length} member${rows.length !== 1 ? 's' : ''} in your tree`}>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1 pb-1">
            {rows.map((row, i) => (
              <InlineEditRow key={`${row.label}-${i}`} label={row.label} name={row.name} onSave={row.onSave} />
            ))}
          </div>
          <div className="pt-4 space-y-3">
            <button type="button" onClick={handleSubmit}
              className="w-full py-3.5 bg-[#2F3E8F] text-white font-semibold rounded-xl hover:bg-[#3B4DA6] active:scale-[0.98] transition-all text-sm">
              Looks good — create my story
            </button>
            <button type="button" onClick={goBack} className="w-full text-sm text-stone-500 hover:text-stone-700 transition-colors">
              Go back
            </button>
          </div>
        </StepContainer>
      )
    }

    // --- Creating ---
    if (step === 'creating') {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-955/20 flex items-center justify-center mb-6">
            <Loader2 className="w-8 h-8 text-[#2F3E8F] dark:text-[#8CA0FF] animate-spin" />
          </div>
          <h2 className="text-lg font-bold text-stone-800 dark:text-zinc-100 mb-2">Weaving your family story...</h2>
          <p className="text-sm text-stone-500 dark:text-zinc-400 animate-pulse">{creatingMessage}</p>
        </div>
      )
    }

    // --- Success ---
    if (step === 'success') {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/20 flex items-center justify-center mb-6">
            <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-lg font-bold text-stone-800 dark:text-zinc-100 mb-2">{state.treeName || 'Your family tree'} is ready!</h2>
          <p className="text-sm text-stone-500 dark:text-zinc-400 mb-8">
            {memberCount > 0
              ? `We added you and ${memberCount} family member${memberCount !== 1 ? 's' : ''}. You can always add more later.`
              : 'Your tree is set up. Start adding family members from the canvas.'}
          </p>
          <button type="button" onClick={handleFinish}
            className="px-8 py-3.5 bg-[#2F3E8F] dark:bg-blue-600 text-white font-semibold rounded-xl hover:bg-[#3B4DA6] dark:hover:bg-blue-700 active:scale-95 transition-all text-sm">
            <Gem className="w-4 h-4 inline-block mr-2" />
            Start exploring
          </button>
        </div>
      )
    }

    return null
  }

  const showBackButton = !['your-name', 'creating', 'success'].includes(state.currentStep)
  const showProgress = !['creating', 'success'].includes(state.currentStep)

  // A12: replace the small success checkmark with a cinematic celebration overlay
  if (open && state.currentStep === 'success') {
    return (
      <TreeCreationCelebration
        homePersonName={state.yourName || 'you'}
        treeName={state.treeName}
        memberCount={1 + memberCount}
        onAddMemory={() => {
          if (createdTreeId) {
            const id = createdTreeId
            setState(initialState)
            setCreatedTreeId(null)
            onComplete(id, 'add-memory')
          }
        }}
        onInvite={() => handleFinish()}
        onExplore={() => {
          if (createdTreeId) {
            const id = createdTreeId
            setState(initialState)
            setCreatedTreeId(null)
            onComplete(id, 'explore')
          }
        }}
        onSkip={() => handleFinish()}
      />
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex flex-col p-0 gap-0 overflow-hidden max-h-[100dvh] sm:max-h-[92vh] sm:max-w-lg max-sm:left-0 max-sm:right-0 max-sm:bottom-0 max-sm:top-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:w-full max-sm:max-w-none max-sm:h-[100dvh] bg-gradient-to-b from-blue-50/40 to-white dark:from-zinc-900 dark:to-zinc-950 dark:border-zinc-800 [&>button.absolute]:hidden"
      >
        {/* Progress bar */}
        {showProgress && (
          <div className="h-1 bg-stone-100 dark:bg-zinc-800 shrink-0">
            <div
              className="h-full bg-[#2F3E8F] dark:bg-blue-500 transition-all duration-300 ease-out rounded-r-full"
              style={{ width: `${getProgress(state) * 100}%` }}
            />
          </div>
        )}

        {/* Header with back button */}
        <div className="shrink-0 px-4 pt-4 pb-2 flex items-center justify-between">
          {showBackButton ? (
            <button type="button" onClick={goBack} className="flex items-center gap-1 text-sm text-stone-500 dark:text-zinc-400 hover:text-stone-700 dark:hover:text-zinc-200 transition-colors p-1 -ml-1 rounded-lg">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <div />
          )}
          {!['creating', 'success'].includes(state.currentStep) && (
            <button type="button" onClick={() => handleOpenChange(false)} className="p-1.5 rounded-lg text-stone-400 dark:text-zinc-500 hover:text-stone-600 dark:hover:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Step content with animation */}
        <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 pb-8">
          <div
            key={state.currentStep}
            className={state.direction === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left'}
          >
            {renderStep()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Shared step layout
// ---------------------------------------------------------------------------

function StepContainer({ question, subtitle, children }: {
  question: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="pt-4 sm:pt-8 space-y-5">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-stone-800 dark:text-zinc-100 leading-tight">{question}</h2>
        {subtitle && <p className="text-sm text-stone-500 dark:text-zinc-400 mt-1.5">{subtitle}</p>}
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  )
}

function ContinueButton({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full sm:w-auto px-6 py-3 min-h-[44px] bg-[#2F3E8F] dark:bg-blue-600 text-white font-semibold rounded-xl hover:bg-[#3B4DA6] dark:hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all text-sm"
    >
      {label || 'Continue'}
    </button>
  )
}

function SkipButton({ onClick, label }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-3 min-h-[44px] text-sm text-stone-500 dark:text-zinc-400 hover:text-stone-700 dark:hover:text-zinc-200 font-medium transition-colors"
    >
      {label || 'Skip'}
    </button>
  )
}
