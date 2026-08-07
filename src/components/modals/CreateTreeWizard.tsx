import { useState, useEffect } from 'react';
import {
  Dialog,
  ResponsiveDialogContent as DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/DateInput';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ChevronLeft, ChevronDown, ChevronRight, Check, TreesIcon, Users, X, Plus } from 'lucide-react';
import * as neo4jAPI from '@/services/neo4jDataService';
import { TreeCreationCelebration } from '@/components/onboarding/TreeCreationCelebration';
import { aiApiCalls } from '@/api/apicalls';
import { validateTextField, validateDescriptionField, VALIDATION_LIMITS } from '@/utils/validation';
import { useFormValidation } from '@/hooks/useFormValidation';

interface CreateTreeWizardProps {
  open: boolean;
  onClose: (treeId?: string) => void;
  onComplete: (treeId: string, action?: 'add-memory' | 'explore') => void;
  userId: string;
  initialTreeId?: string;
  initialTreeName?: string;
}


type Step = 'tree-details' | 'home-person' | 'family-members' | 'success';

const STEPS = [
  { id: 'tree-details', label: 'Tree Details' },
  { id: 'home-person', label: 'Your Info' },
  { id: 'family-members', label: 'Family' },
  { id: 'success', label: 'Done' },
];

type Gender = 'male' | 'female' | 'other';

interface FamilyEntry {
  firstName: string;
  lastName: string;
  gender: Gender;
  added: boolean;
}

const emptyEntry = (gender: Gender = 'male', lastName = ''): FamilyEntry => ({
  firstName: '',
  lastName,
  gender,
  added: false,
});

function AccordionSection({
  title,
  summary,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  summary: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div>
          <span className="text-sm font-medium text-gray-900">{title}</span>
          {!isOpen && <span className="ml-2 text-xs text-gray-500">{summary}</span>}
        </div>
        {isOpen ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
      </button>
      {isOpen && <div className="p-3 space-y-3 bg-white">{children}</div>}
    </div>
  );
}

function EntryRow({
  entry,
  onChange,
  onRemove,
  genderLocked,
}: {
  entry: FamilyEntry;
  onChange: (e: FamilyEntry) => void;
  onRemove: () => void;
  genderLocked?: boolean;
}) {
  const {
    errors: validationErrors,
    validateField,
    sanitizeInput,
  } = useFormValidation();

  const config = {
    firstName: { required: false, type: 'name' as const, label: 'First Name' },
    lastName: { required: false, type: 'name' as const, label: 'Last Name' },
  };

  useEffect(() => {
    if (entry.firstName) {
      validateField('firstName', entry.firstName, config.firstName);
    }
    if (entry.lastName) {
      validateField('lastName', entry.lastName, config.lastName);
    }
  }, []);

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-50 border border-gray-200/80 rounded-lg w-full">
      {/* First Name & Last Name row */}
      <div className="flex flex-col sm:flex-row gap-4 w-full">
        <div className="flex-1">
          <Input
            placeholder="First name"
            value={entry.firstName}
            onChange={(e) => {
              const val = sanitizeInput(e.target.value);
              onChange({ ...entry, firstName: val });
              validateField('firstName', val, config.firstName);
            }}
            className="h-10 md:h-9 text-sm"
            error={validationErrors.firstName}
            showCharCount
            charLimit={50}
          />
        </div>
        <div className="flex-1">
          <Input
            placeholder="Last name"
            value={entry.lastName}
            onChange={(e) => {
              const val = sanitizeInput(e.target.value);
              onChange({ ...entry, lastName: val });
              validateField('lastName', val, config.lastName);
            }}
            className="h-10 md:h-9 text-sm"
            error={validationErrors.lastName}
            showCharCount
            charLimit={50}
          />
        </div>
      </div>

      {/* Gender select and Remove button row */}
      <div className="flex items-center gap-3 w-full">
        <div className="flex-1 sm:flex-initial sm:w-48">
          <Select
            value={entry.gender}
            onValueChange={(v) => onChange({ ...entry, gender: v as Gender })}
            disabled={genderLocked}
          >
            <SelectTrigger className="h-10 md:h-9 text-sm w-full bg-white dark:bg-transparent">
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="p-2 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors shrink-0 ml-auto"
          title="Remove"
        >
          <X className="h-5 w-5 sm:h-4 sm:w-4" />
        </button>
      </div>
    </div>
  );
}

function ProgressBar({ currentStep }: { currentStep: Step }) {
  const stepIndex = STEPS.findIndex(s => s.id === currentStep);
  return (
    <div className="flex items-center w-full mt-3 gap-2">
      {STEPS.map((step, index) => (
        <div key={step.id} className={`flex items-center ${index < STEPS.length - 1 ? 'flex-1' : 'shrink-0'}`}>
          <div className={`flex items-center justify-center shrink-0 w-7 h-7 rounded-full text-xs font-semibold transition-colors ${index < stepIndex
            ? 'bg-sky-600 text-white'
            : index === stepIndex
              ? 'bg-sky-600 text-white ring-2 ring-sky-200'
              : 'bg-gray-200 text-gray-500'
            }`}>
            {index < stepIndex ? <Check className="w-3.5 h-3.5" /> : index + 1}
          </div>
          <span className={`ml-1.5 text-xs font-medium hidden sm:block shrink-0 ${index === stepIndex ? 'text-gray-900' : 'text-gray-400'
            }`}>
            {step.label}
          </span>
          {index < STEPS.length - 1 && (
            <div className={`ml-2 h-px flex-1 ${index < stepIndex ? 'bg-sky-600' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// Abandoned-wizard draft (Phase 3 / A10)
const DRAFT_KEY = 'createTreeWizard.draft';
const DRAFT_VERSION = 1;
interface WizardDraft {
  v: number;
  savedAt: string;
  step: string;
  treeData: { treeName: string; description: string };
  personData: { firstName: string; lastName: string; gender: string; birthDate: string; birthPlace: string };
  spouse: FamilyEntry | null;
  father: FamilyEntry | null;
  mother: FamilyEntry | null;
  paternalGrandfather: FamilyEntry | null;
  paternalGrandmother: FamilyEntry | null;
  maternalGrandfather: FamilyEntry | null;
  maternalGrandmother: FamilyEntry | null;
  children: FamilyEntry[];
  siblings: FamilyEntry[];
  createdTreeId?: string | null;
  createdHomePersonId?: string | null;
}
function loadDraft(): WizardDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WizardDraft;
    if (parsed.v !== DRAFT_VERSION) return null;
    // Must have some meaningful progress to offer restore
    const hasContent =
      parsed.treeData?.treeName ||
      parsed.personData?.firstName ||
      parsed.spouse || parsed.father || parsed.mother ||
      (parsed.children?.length ?? 0) > 0 || (parsed.siblings?.length ?? 0) > 0;
    return hasContent ? parsed : null;
  } catch { return null }
}
function clearDraft() { try { localStorage.removeItem(DRAFT_KEY) } catch { /* noop */ } }

export function CreateTreeWizard({ open, onClose, onComplete, userId, initialTreeId, initialTreeName }: CreateTreeWizardProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('tree-details');
  const [showRestoreBanner, setShowRestoreBanner] = useState(false);
  const [createdTreeId, setCreatedTreeId] = useState<string | null>(null);
  const [createdHomePersonId, setCreatedHomePersonId] = useState<string | null>(null);
  const [createdPersonName, setCreatedPersonName] = useState('');
  const [familyMembersAdded, setFamilyMembersAdded] = useState(0);

  const [treeData, setTreeData] = useState({
    treeName: initialTreeName || '',
    description: '',
  });

  const {
    errors: validationErrors,
    validateField,
    validateStep,
    sanitizeInput,
  } = useFormValidation();

  const step1Config = {
    treeName: { required: true, type: 'tree_name' as const, label: 'Tree Name' },
    description: { type: 'description' as const, label: 'Description' },
  };

  const isStep1Invalid = !treeData.treeName.trim() || 
                         treeData.treeName.length > 50 || 
                         treeData.description.length > 300 || 
                         Object.keys(validationErrors).some(k => ['treeName', 'description'].includes(k));

  // Handle initial tree injection
  useEffect(() => {
    if (open && initialTreeId) {
      setCreatedTreeId(initialTreeId);
      if (initialTreeName) {
        setTreeData(prev => ({ ...prev, treeName: initialTreeName }));
      }
      setStep('home-person');
    } else if (open && !initialTreeId) {
      // Reset to first step if no initialTreeId and we just opened
      // (unless we have a draft, but restoreDraft will handle that)
      setStep('tree-details');
    }
  }, [open, initialTreeId, initialTreeName]);

  const [personData, setPersonData] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    birthDate: '',
    birthPlace: '',
  });

  const step2Config = {
    firstName: { required: true, type: 'name' as const, label: 'First Name' },
    lastName: { required: true, type: 'name' as const, label: 'Last Name' },
  };

  const isStep2Invalid = !personData.firstName.trim() || 
                         !personData.lastName.trim() || 
                         personData.firstName.length > 50 || 
                         personData.lastName.length > 50 || 
                         Object.keys(validationErrors).some(k => ['firstName', 'lastName'].includes(k));

  const [hasManuallySelectedGender, setHasManuallySelectedGender] = useState(false);

  // Debounced API call to identify gender by first name
  useEffect(() => {
    const name = (personData.firstName || '').trim();
    if (!name || name.length < 2 || hasManuallySelectedGender) {
      return;
    }

    const handler = setTimeout(async () => {
      try {
        const res = await aiApiCalls.identifyGender(name);
        let extractedGender: 'male' | 'female' | 'other' | null = null;
        if (res) {
          if (typeof res.gender === 'string') {
            extractedGender = res.gender.toLowerCase() as any;
          } else if (res.data && typeof res.data.gender === 'string') {
            extractedGender = res.data.gender.toLowerCase() as any;
          } else if (typeof res.suggestedGender === 'string') {
            extractedGender = res.suggestedGender.toLowerCase() as any;
          } else if (res.data && typeof res.data.suggestedGender === 'string') {
            extractedGender = res.data.suggestedGender.toLowerCase() as any;
          }
        }

        if (extractedGender === 'male' || extractedGender === 'female' || extractedGender === 'other') {
          setPersonData(prev => ({ ...prev, gender: extractedGender }));
        }
      } catch (err) {
        console.error('Failed to identify gender:', err);
      }
    }, 600); // 600ms debounce

    return () => clearTimeout(handler);
  }, [personData.firstName, hasManuallySelectedGender]);

  // Family members state
  const [spouse, setSpouse] = useState<FamilyEntry | null>(null);
  const [father, setFather] = useState<FamilyEntry | null>(null);
  const [mother, setMother] = useState<FamilyEntry | null>(null);
  const [paternalGrandfather, setPaternalGrandfather] = useState<FamilyEntry | null>(null);
  const [paternalGrandmother, setPaternalGrandmother] = useState<FamilyEntry | null>(null);
  const [maternalGrandfather, setMaternalGrandfather] = useState<FamilyEntry | null>(null);
  const [maternalGrandmother, setMaternalGrandmother] = useState<FamilyEntry | null>(null);
  const [children, setChildren] = useState<FamilyEntry[]>([]);
  const [siblings, setSiblings] = useState<FamilyEntry[]>([]);

  // Accordion open state
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const toggleSection = (key: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const oppositeGender = (g: string): Gender => g === 'male' ? 'female' : g === 'female' ? 'male' : 'other';

  // On open: check for draft. On close with progress: persist. On success: clear.
  useEffect(() => {
    if (!open) return;
    const draft = loadDraft();
    if (draft) setShowRestoreBanner(true);
  }, [open]);

  // Auto-save on every meaningful change
  useEffect(() => {
    if (!open) return;
    if (step === 'success') return;
    // Skip save if nothing worth saving
    const meaningful =
      !!treeData.treeName || !!personData.firstName ||
      !!spouse || !!father || !!mother ||
      children.length > 0 || siblings.length > 0 ||
      !!createdTreeId || !!createdHomePersonId;
    if (!meaningful) return;
    const draft: WizardDraft = {
      v: DRAFT_VERSION,
      savedAt: new Date().toISOString(),
      step,
      treeData,
      personData,
      spouse, father, mother,
      paternalGrandfather, paternalGrandmother,
      maternalGrandfather, maternalGrandmother,
      children, siblings,
      createdTreeId,
      createdHomePersonId,
    };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)) } catch { /* noop */ }
  }, [open, step, treeData, personData, spouse, father, mother, paternalGrandfather, paternalGrandmother, maternalGrandfather, maternalGrandmother, children, siblings, createdTreeId, createdHomePersonId]);

  const restoreDraft = () => {
    const d = loadDraft();
    if (!d) { setShowRestoreBanner(false); return }
    setTreeData(d.treeData);
    setPersonData(d.personData);
    setSpouse(d.spouse);
    setFather(d.father);
    setMother(d.mother);
    setPaternalGrandfather(d.paternalGrandfather);
    setPaternalGrandmother(d.paternalGrandmother);
    setMaternalGrandfather(d.maternalGrandfather);
    setMaternalGrandmother(d.maternalGrandmother);
    setChildren(d.children);
    setSiblings(d.siblings);
    if (d.createdTreeId) {
      setCreatedTreeId(d.createdTreeId);
    }
    if (d.createdHomePersonId) {
      setCreatedHomePersonId(d.createdHomePersonId);
    }
    if (d.step === 'tree-details' || d.step === 'home-person' || d.step === 'family-members' || d.step === 'success') {
      setStep(d.step as Step);
    }
    setShowRestoreBanner(false);
  };
  const dismissDraft = () => { clearDraft(); setShowRestoreBanner(false) };

  const resetForm = () => {
    setTreeData({ treeName: '', description: '' });
    setPersonData({ firstName: '', lastName: '', gender: '', birthDate: '', birthPlace: '' });
    setHasManuallySelectedGender(false);
    setStep('tree-details');
    setCreatedTreeId(null);
    setCreatedHomePersonId(null);
    setCreatedPersonName('');
    setFamilyMembersAdded(0);
    setSpouse(null);
    setFather(null);
    setMother(null);
    setPaternalGrandfather(null);
    setPaternalGrandmother(null);
    setMaternalGrandfather(null);
    setMaternalGrandmother(null);
    setChildren([]);
    setSiblings([]);
    setOpenSections(new Set());
  };

  const handleBack = () => {
    if (step === 'home-person') {
      setStep('tree-details');
    } else if (step === 'family-members') {
      setStep('home-person');
    }
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = validateStep(
      { treeName: treeData.treeName, description: treeData.description },
      step1Config
    );
    if (!isValid || isStep1Invalid) return;
    if (step === 'tree-details') {
      setLoading(true);
      try {
        if (createdTreeId) {
          await neo4jAPI.editTree(
            createdTreeId,
            treeData.treeName,
            treeData.description || undefined
          );
        } else {
          const tree = await neo4jAPI.createTree(
            treeData.treeName,
            userId,
            treeData.description || undefined
          );
          setCreatedTreeId(tree.treeId);
        }
        setStep('home-person');
      } catch (error: unknown) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to save tree. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
  };


  // Step 2 submit: create tree + home person, then go to family step
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = validateStep(
      { firstName: personData.firstName, lastName: personData.lastName },
      step2Config
    );
    if (!isValid || isStep2Invalid) return;
    if (!createdTreeId) {
      toast({
        title: 'Error',
        description: 'Tree was not created correctly. Please go back and try again.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      if (createdHomePersonId) {
        await neo4jAPI.updatePerson(
          createdHomePersonId,
          {
            firstName: personData.firstName,
            lastName: personData.lastName,
            gender: personData.gender as Gender,
            birthDate: personData.birthDate || undefined,
            birthPlace: personData.birthPlace || undefined,
            isHomePerson: true,
            isLiving: true,
          },
          createdTreeId
        );
      } else {
        const homePerson = await neo4jAPI.createRootPerson(createdTreeId, {
          firstName: personData.firstName,
          lastName: personData.lastName,
          gender: personData.gender as Gender,
          birthDate: personData.birthDate || undefined,
          birthPlace: personData.birthPlace || undefined,
          isHomePerson: true,
          isLiving: true,
        });
        setCreatedHomePersonId(homePerson.personId);
      }

      setCreatedPersonName(`${personData.firstName} ${personData.lastName}`.trim());
      setStep('family-members');
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add your info to the tree. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };


  // Step 3 submit: create all family members using the quick-create API
  const isValidName = (name: string) => {
    const val = name || '';
    if (!val) return true;
    if (/^\s/.test(val)) return false;
    if (!/[a-zA-Z0-9\u00C0-\u00FF\u0100-\u017F]/.test(val)) return false;
    if (!/[a-zA-Z0-9\u00C0-\u00FF\u0100-\u017F]/.test(val[0])) return false;
    if (!/^[a-zA-Z\s]*$/.test(val)) return false;
    if (val.length > 50) return false;
    return true;
  };

  const isFamilyInvalid =
    (spouse && (!isValidName(spouse.firstName) || !isValidName(spouse.lastName))) ||
    (father && (!isValidName(father.firstName) || !isValidName(father.lastName))) ||
    (mother && (!isValidName(mother.firstName) || !isValidName(mother.lastName))) ||
    (paternalGrandfather && (!isValidName(paternalGrandfather.firstName) || !isValidName(paternalGrandfather.lastName))) ||
    (paternalGrandmother && (!isValidName(paternalGrandmother.firstName) || !isValidName(paternalGrandmother.lastName))) ||
    (maternalGrandfather && (!isValidName(maternalGrandfather.firstName) || !isValidName(maternalGrandfather.lastName))) ||
    (maternalGrandmother && (!isValidName(maternalGrandmother.firstName) || !isValidName(maternalGrandmother.lastName))) ||
    children.some(c => !isValidName(c.firstName) || !isValidName(c.lastName)) ||
    siblings.some(s => !isValidName(s.firstName) || !isValidName(s.lastName));

  const handleFamilySubmit = async () => {
    if (isFamilyInvalid) return;
    if (!createdTreeId || !createdHomePersonId) return;
    setLoading(true);

    try {
      const relatives: any[] = [];

      // Helper to map FamilyEntry to API relative structure
      const mapEntry = (entry: FamilyEntry, type: string) => ({
        type,
        firstName: entry.firstName,
        lastName: entry.lastName,
        gender: entry.gender,
      });

      // 1. Father
      if (father && father.firstName.trim()) {
        relatives.push(mapEntry(father, 'father'));
      }

      // 2. Mother
      if (mother && mother.firstName.trim()) {
        relatives.push(mapEntry(mother, 'mother'));
      }

      // 3. Spouse
      if (spouse && spouse.firstName.trim()) {
        relatives.push(mapEntry(spouse, 'spouse'));
      }

      // 4. Paternal grandparents
      if (paternalGrandfather && paternalGrandfather.firstName.trim()) {
        relatives.push(mapEntry(paternalGrandfather, 'paternal_grandfather'));
      }
      if (paternalGrandmother && paternalGrandmother.firstName.trim()) {
        relatives.push(mapEntry(paternalGrandmother, 'paternal_grandmother'));
      }

      // 5. Maternal grandparents
      if (maternalGrandfather && maternalGrandfather.firstName.trim()) {
        relatives.push(mapEntry(maternalGrandfather, 'maternal_grandfather'));
      }
      if (maternalGrandmother && maternalGrandmother.firstName.trim()) {
        relatives.push(mapEntry(maternalGrandmother, 'maternal_grandmother'));
      }

      // 6. Children
      children.forEach((child) => {
        if (child.firstName.trim()) {
          relatives.push(mapEntry(child, child.gender === 'male' ? 'son' : child.gender === 'female' ? 'daughter' : 'child'));
        }
      });

      // 7. Siblings
      siblings.forEach((sibling) => {
        if (sibling.firstName.trim()) {
          relatives.push(mapEntry(sibling, sibling.gender === 'male' ? 'brother' : sibling.gender === 'female' ? 'sister' : 'sibling'));
        }
      });

      if (relatives.length > 0) {
        await neo4jAPI.quickAddRelatives(createdTreeId, createdHomePersonId, relatives);
      }

      setFamilyMembersAdded(relatives.length);
      clearDraft();
      setStep('success');
    } catch (error: unknown) {
      toast({
        title: 'Error adding family members',
        description: error instanceof Error ? error.message : 'Some family members may not have been added.',
        variant: 'destructive',
      });
      // Still go to success — partial creation is fine
      setFamilyMembersAdded(0);
      clearDraft();
      setStep('success');
    } finally {
      setLoading(false);
    }
  };


  const handleFinish = () => {
    if (createdTreeId) {
      const treeId = createdTreeId;
      resetForm();
      onComplete(treeId);
    }
  };

  const handleClose = () => {
    const treeId = createdTreeId;
    clearDraft();
    resetForm();
    onClose(treeId || undefined);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && !loading) {
      handleClose();
    }
  };


  const getSummary = (entry: FamilyEntry | null): string => {
    if (!entry || !entry.firstName.trim()) return 'Not added yet';
    return `${entry.firstName} ${entry.lastName}`.trim();
  };

  // A12: show the cinematic celebration instead of the cramped modal when success.
  if (open && step === 'success') {
    const memberCount = 1 + (familyMembersAdded || 0);
    return (
      <TreeCreationCelebration
        homePersonName={createdPersonName || 'you'}
        treeName={treeData.treeName}
        memberCount={memberCount}
        onAddMemory={() => {
          if (createdTreeId) {
            const treeId = createdTreeId;
            resetForm();
            onComplete(treeId, 'add-memory');
          }
        }}
        onInvite={() => handleFinish()}
        onExplore={() => {
          if (createdTreeId) {
            const treeId = createdTreeId;
            resetForm();
            onComplete(treeId, 'explore');
          }
        }}
        onSkip={() => handleFinish()}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex flex-col p-0 gap-0 overflow-hidden max-h-[92dvh] sm:max-w-lg sm:max-h-[88vh] max-sm:left-0 max-sm:right-0 max-sm:bottom-0 max-sm:top-auto max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:w-full max-sm:max-w-none">

        {/* Sticky header */}
        <div className="shrink-0 px-4 pt-5 pb-3 sm:px-6 sm:pt-6 border-b border-gray-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TreesIcon className="w-5 h-5 text-sky-600" />
              {step === 'tree-details' && 'Create Your Family Tree'}
              {step === 'home-person' && 'Add Yourself to the Tree'}
              {step === 'family-members' && 'Add Your Family'}
              {step === 'success' && 'Your Tree is Ready!'}
            </DialogTitle>
          </DialogHeader>
          <ProgressBar currentStep={step} />
        </div>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">

          {/* Abandoned-draft banner (Phase 3 / A10) */}
          {/* {showRestoreBanner && step !== 'success' && (
            <div className="mb-4 rounded-xl border border-[#C2A46D]/60 bg-[#C2A46D]/[0.08] dark:bg-[#C2A46D]/[0.12] px-4 py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#3D2E1F] dark:text-[#F3F2F1]">Pick up where you left off?</p>
                <p className="text-[12px] text-[#5B5449] dark:text-[#B8B8B8] mt-0.5">
                  We saved your progress from last time. Restore it or start fresh.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={dismissDraft}
                  className="text-[12px] font-medium text-[#5B5449] dark:text-[#888] hover:text-[#3D2E1F] dark:hover:text-[#F3F2F1] px-2 py-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                >
                  Start fresh
                </button>
                <button
                  type="button"
                  onClick={restoreDraft}
                  className="text-[12px] font-semibold text-white bg-[#2F3E8F] hover:brightness-110 px-3 py-1.5 rounded-lg"
                >
                  Restore
                </button>
              </div>
            </div>
          )} */}

          {/* Step 1: Tree Details */}
          {step === 'tree-details' && (
            <form id="step1-form" onSubmit={handleNext} className="space-y-4">
              <p className="text-sm text-gray-500">
                Give your family tree a name. You can always rename it later.
              </p>
              <div className="space-y-2">
                <Label htmlFor="treeName">Tree Name *</Label>
                <Input
                  id="treeName"
                  value={treeData.treeName}
                  onChange={(e) => {
                    const val = sanitizeInput(e.target.value);
                    setTreeData({ ...treeData, treeName: val });
                    validateField('treeName', val, step1Config.treeName);
                  }}
                  placeholder="e.g., Kumar Family Tree"
                  required
                  autoFocus
                  error={validationErrors.treeName}
                  showCharCount
                  charLimit={50}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={treeData.description}
                  onChange={(e) => {
                    const val = sanitizeInput(e.target.value);
                    setTreeData({ ...treeData, description: val });
                    validateField('description', val, step1Config.description);
                  }}
                  placeholder="e.g., Our extended family from Delhi, India..."
                  rows={2}
                  error={validationErrors.description}
                  showCharCount
                  charLimit={300}
                />
              </div>
            </form>
          )}

          {/* Step 2: Home Person */}
          {step === 'home-person' && (
            <form id="step2-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-sm text-sky-800">
                Start with yourself — you'll be able to add family members in the next step.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={personData.firstName}
                    onChange={(e) => {
                      const val = sanitizeInput(e.target.value);
                      setPersonData({ ...personData, firstName: val });
                      validateField('firstName', val, step2Config.firstName);
                    }}
                    placeholder="First name"
                    required
                    autoFocus
                    error={validationErrors.firstName}
                    showCharCount
                    charLimit={50}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={personData.lastName}
                    onChange={(e) => {
                      const val = sanitizeInput(e.target.value);
                      setPersonData({ ...personData, lastName: val });
                      validateField('lastName', val, step2Config.lastName);
                    }}
                    placeholder="Last name"
                    required
                    error={validationErrors.lastName}
                    showCharCount
                    charLimit={50}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select
                  value={personData.gender}
                  onValueChange={(value) => {
                    setHasManuallySelectedGender(true);
                    setPersonData({ ...personData, gender: value });
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthDate">Birth Date (optional)</Label>
                <DateInput
                  id="birthDate"
                  value={personData.birthDate}
                  onChange={(e) => setPersonData({ ...personData, birthDate: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </form>
          )}

          {/* Step 3: Add Your Family */}
          {step === 'family-members' && (
            <div className="space-y-3 pb-1">
              <p className="text-sm text-gray-500">
                Quickly add family members. All sections are optional — you can always add more later.
              </p>

              {/* Spouse */}
              <AccordionSection
                title="Spouse"
                summary={getSummary(spouse)}
                isOpen={openSections.has('spouse')}
                onToggle={() => toggleSection('spouse')}
              >
                {spouse ? (
                  <EntryRow
                    entry={spouse}
                    onChange={setSpouse}
                    onRemove={() => setSpouse(null)}
                  />
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={() => setSpouse(emptyEntry(oppositeGender(personData.gender)))}>
                    <Plus className="h-3 w-3 mr-1" /> Add Spouse
                  </Button>
                )}
              </AccordionSection>

              {/* Father */}
              <AccordionSection
                title="Father"
                summary={getSummary(father)}
                isOpen={openSections.has('father')}
                onToggle={() => toggleSection('father')}
              >
                {father ? (
                  <EntryRow entry={father} onChange={setFather} onRemove={() => setFather(null)} genderLocked />
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={() => setFather(emptyEntry('male', personData.lastName))}>
                    <Plus className="h-3 w-3 mr-1" /> Add Father
                  </Button>
                )}
              </AccordionSection>

              {/* Mother */}
              <AccordionSection
                title="Mother"
                summary={getSummary(mother)}
                isOpen={openSections.has('mother')}
                onToggle={() => toggleSection('mother')}
              >
                {mother ? (
                  <EntryRow entry={mother} onChange={setMother} onRemove={() => setMother(null)} genderLocked />
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={() => setMother(emptyEntry('female'))}>
                    <Plus className="h-3 w-3 mr-1" /> Add Mother
                  </Button>
                )}
              </AccordionSection>

              {/* Paternal Grandfather */}
              <AccordionSection
                title="Paternal Grandfather"
                summary={father ? getSummary(paternalGrandfather) : 'Add father first'}
                isOpen={openSections.has('pgf')}
                onToggle={() => toggleSection('pgf')}
              >
                {!father ? (
                  <p className="text-xs text-gray-400">Add a father first to enable this section.</p>
                ) : paternalGrandfather ? (
                  <EntryRow entry={paternalGrandfather} onChange={setPaternalGrandfather} onRemove={() => setPaternalGrandfather(null)} genderLocked />
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={() => setPaternalGrandfather(emptyEntry('male', personData.lastName))}>
                    <Plus className="h-3 w-3 mr-1" /> Add Paternal Grandfather
                  </Button>
                )}
              </AccordionSection>

              {/* Paternal Grandmother */}
              <AccordionSection
                title="Paternal Grandmother"
                summary={father ? getSummary(paternalGrandmother) : 'Add father first'}
                isOpen={openSections.has('pgm')}
                onToggle={() => toggleSection('pgm')}
              >
                {!father ? (
                  <p className="text-xs text-gray-400">Add a father first to enable this section.</p>
                ) : paternalGrandmother ? (
                  <EntryRow entry={paternalGrandmother} onChange={setPaternalGrandmother} onRemove={() => setPaternalGrandmother(null)} genderLocked />
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={() => setPaternalGrandmother(emptyEntry('female'))}>
                    <Plus className="h-3 w-3 mr-1" /> Add Paternal Grandmother
                  </Button>
                )}
              </AccordionSection>

              {/* Maternal Grandfather */}
              <AccordionSection
                title="Maternal Grandfather"
                summary={mother ? getSummary(maternalGrandfather) : 'Add mother first'}
                isOpen={openSections.has('mgf')}
                onToggle={() => toggleSection('mgf')}
              >
                {!mother ? (
                  <p className="text-xs text-gray-400">Add a mother first to enable this section.</p>
                ) : maternalGrandfather ? (
                  <EntryRow entry={maternalGrandfather} onChange={setMaternalGrandfather} onRemove={() => setMaternalGrandfather(null)} genderLocked />
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={() => setMaternalGrandfather(emptyEntry('male'))}>
                    <Plus className="h-3 w-3 mr-1" /> Add Maternal Grandfather
                  </Button>
                )}
              </AccordionSection>

              {/* Maternal Grandmother */}
              <AccordionSection
                title="Maternal Grandmother"
                summary={mother ? getSummary(maternalGrandmother) : 'Add mother first'}
                isOpen={openSections.has('mgm')}
                onToggle={() => toggleSection('mgm')}
              >
                {!mother ? (
                  <p className="text-xs text-gray-400">Add a mother first to enable this section.</p>
                ) : maternalGrandmother ? (
                  <EntryRow entry={maternalGrandmother} onChange={setMaternalGrandmother} onRemove={() => setMaternalGrandmother(null)} genderLocked />
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={() => setMaternalGrandmother(emptyEntry('female'))}>
                    <Plus className="h-3 w-3 mr-1" /> Add Maternal Grandmother
                  </Button>
                )}
              </AccordionSection>

              {/* Children */}
              <AccordionSection
                title="Children"
                summary={children.length > 0 ? `${children.length} added` : 'Not added yet'}
                isOpen={openSections.has('children')}
                onToggle={() => toggleSection('children')}
              >
                {children.map((child, i) => (
                  <EntryRow
                    key={i}
                    entry={child}
                    onChange={(updated) => {
                      const next = [...children];
                      next[i] = updated;
                      setChildren(next);
                    }}
                    onRemove={() => setChildren(children.filter((_, j) => j !== i))}
                  />
                ))}
                {children.length < 5 && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setChildren([...children, emptyEntry('male', personData.lastName)])}>
                    <Plus className="h-3 w-3 mr-1" /> Add Child
                  </Button>
                )}
              </AccordionSection>

              {/* Siblings */}
              <AccordionSection
                title="Siblings"
                summary={(!father && !mother) ? 'Add father or mother first' : (siblings.length > 0 ? `${siblings.length} added` : 'Not added yet')}
                isOpen={openSections.has('siblings')}
                onToggle={() => toggleSection('siblings')}
              >
                {!father && !mother ? (
                  <p className="text-xs text-gray-400">Add a father or mother first to enable this section.</p>
                ) : (
                  <>
                    {siblings.map((sib, i) => (
                      <EntryRow
                        key={i}
                        entry={sib}
                        onChange={(updated) => {
                          const next = [...siblings];
                          next[i] = updated;
                          setSiblings(next);
                        }}
                        onRemove={() => setSiblings(siblings.filter((_, j) => j !== i))}
                      />
                    ))}
                    {siblings.length < 5 && (
                      <Button type="button" variant="outline" size="sm" onClick={() => setSiblings([...siblings, emptyEntry('male', personData.lastName)])}>
                        <Plus className="h-3 w-3 mr-1" /> Add Sibling
                      </Button>
                    )}
                  </>
                )}
              </AccordionSection>

            </div>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
            <div className="space-y-5 text-center">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {treeData.treeName} is ready!
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {createdPersonName} has been added as the starting person.
                  {familyMembersAdded > 0 && (
                    <> {familyMembersAdded} family member{familyMembersAdded > 1 ? 's were' : ' was'} also added.</>
                  )}
                </p>
              </div>

              <div className="bg-[#E8EDFF] border border-[#2F3E8F]/30 rounded-lg p-4 text-left">
                <p className="text-sm font-medium text-blue-900 mb-2">What to do next:</p>
                <ul className="text-sm text-blue-800 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-[#2F3E8F]">1.</span>
                    Right-click on any card to add more relatives or edit details
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-[#2F3E8F]">2.</span>
                    Double-click any card to edit their details
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-[#2F3E8F]">3.</span>
                    Use the tree selector (top-left icon) to create more trees
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>{/* end scrollable body */}

        {/* Sticky footer */}
        <div className="shrink-0 px-4 pb-5 pt-3 sm:px-6 sm:pb-6 border-t border-gray-100">
          {step === 'tree-details' && (
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" form="step1-form" className="flex-1 bg-sky-600 hover:bg-sky-700" disabled={isStep1Invalid}>
                Next →
              </Button>
            </div>
          )}

          {step === 'home-person' && (
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleBack} className="flex-1" disabled={loading}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button type="submit" form="step2-form" className="flex-1 bg-sky-600 hover:bg-sky-700" disabled={loading || !personData.gender || isStep2Invalid}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Next →
              </Button>
            </div>
          )}

          {step === 'family-members' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleBack} className="flex-1" disabled={loading}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <Button type="button" onClick={handleFamilySubmit} className="flex-1 bg-sky-600 hover:bg-sky-700" disabled={loading || isFamilyInvalid}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Family
                </Button>
              </div>
              <button
                type="button"
                onClick={() => { setFamilyMembersAdded(0); setStep('success'); }}
                className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-1"
                disabled={loading}
              >
                Skip this step →
              </button>
            </div>
          )}

          {step === 'success' && (
            <Button onClick={handleFinish} className="w-full bg-sky-600 hover:bg-sky-700">
              <Users className="w-4 h-4 mr-2" />
              Start Building My Tree
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
