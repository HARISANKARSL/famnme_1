import { useEffect, useState, useCallback, useRef, lazy, Suspense, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Sidebar, type FamilyRoot } from '@/components/layout/Sidebar'
import { useTheme } from '@/contexts/ThemeContext'
import { TopBar } from '@/components/layout/TopBar'
import { UnionBasedTreeCanvas } from '@/components/canvas/UnionBasedTreeCanvas'
import { useTreeStore } from '@/store/treeStore'
import { recordView as recordSessionView, getLastViewedPerson } from '@/services/sessionContinuityService'
import { usePanelStore } from '@/store/panelStore'
import { PanelHost } from '@/components/layout/PanelHost'
import type { PanelHostCallbacks } from '@/components/layout/PanelHost'
import { SpotlightSearch } from '@/components/ui/SpotlightSearch'
import type { SiblingFormData } from '@/components/modals/AddSiblingModal'
import type { SpouseFormData, UnionFormData } from '@/components/modals/AddSpouseModal'
import type { ParentOption } from '@/components/modals/RelativeSidePicker'
import type { DuplicatePair } from '@/services/neo4jDataService'
import * as pendingEditAPI from '@/services/pendingEditService'
import { useToast } from '@/components/ui/use-toast'
import { BottomNav } from '@/components/layout/BottomNav'
import { MobileTopBar } from '@/components/layout/MobileTopBar'
import { MobileDrawer } from '@/components/ui/MobileDrawer'
import { Loader2 } from 'lucide-react'
import { MobileDrawerContent } from '@/components/layout/MobileDrawerContent'
import { useChatStore } from '@/store/chatStore'
import type { Person, Union, TreeMetadata, TreeRole, ValidationConfig, BloodRelationMode, ExtendedRelationship } from '@/types'
import type { CanvasControls } from '@/components/canvas/UnionBasedTreeCanvas'
import * as neo4jAPI from '@/services/neo4jDataService'
import type { TreeWindowData, ComponentMap } from '@/services/neo4jDataService'
import { computeFamilyRoots } from '@/services/neo4jDataService'
// Relationship type from elkLayoutService removed (unused)
import { getPersonSpouses, getPersonUnions, getPersonChildren } from '@/utils/unionHelpers'
import { resolveBackendUrl } from '@/config/api'
import { DashboardHomePage } from '@/pages/DashboardHomePage'
import { useStreak } from '@/hooks/useStreak'
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay'
import { useTutorialStore } from '@/store/tutorialStore'
import { useContributorStore } from '@/store/contributorStore'
import { acceptInvitation as acceptInvitationAPI } from '@/services/collaborationApiService'
// import { fetchMemoryCounts } from '@/services/memoriesApiService'
import { getTreeTempleLinks, getTreeTempleMemoryCounts } from '@/services/templeLinkApiService'

// Direct imports — relationship modals (small, frequently used, must open instantly)
import { RelationshipSelectionPanel } from '@/components/modals/RelationshipSelectionPanel'
import { AddRelativeModalNeo4j } from '@/components/modals/AddRelativeModalNeo4j'
import { AddSpouseModal } from '@/components/modals/AddSpouseModal'
import { MarryExistingPersonModal } from '@/components/modals/MarryExistingPersonModal'
import { AddSiblingModal } from '@/components/modals/AddSiblingModal'
import { RelativeSidePicker } from '@/components/modals/RelativeSidePicker'
import { MultipleMarriagePrompt } from '@/components/modals/MultipleMarriagePrompt'
import { SelectUnionModal } from '@/components/modals/SelectUnionModal'
import { MoveChildrenPrompt } from '@/components/modals/MoveChildrenPrompt'
import { DeletePersonConfirmDialog } from '@/components/modals/DeletePersonConfirmDialog'
import { SetHomePersonModal } from '@/components/modals/SetHomePersonModal'

// Lazy-loaded panels and modals (larger components, loaded on demand)
const AncestryPedigreeCanvas = lazy(() => import('@/components/canvas/AncestryPedigreeCanvas').then(m => ({ default: m.AncestryPedigreeCanvas })))
const CreateTreeWizard = lazy(() => import('@/components/modals/CreateTreeWizard').then(m => ({ default: m.CreateTreeWizard })))
const StoryCaptureExperience = lazy(() => import('@/components/onboarding/StoryCaptureExperience').then(m => ({ default: m.StoryCaptureExperience })))
const WelcomePathSelection = lazy(() => import('@/components/onboarding/WelcomePathSelection').then(m => ({ default: m.WelcomePathSelection })))
const ConversationalWizard = lazy(() => import('@/components/onboarding/ConversationalWizard').then(m => ({ default: m.ConversationalWizard })))
const QuickAddWizard = lazy(() => import('@/components/modals/QuickAddWizard').then(m => ({ default: m.QuickAddWizard })))
const RenameTreeDialog = lazy(() => import('@/components/modals/RenameTreeDialog').then(m => ({ default: m.RenameTreeDialog })))
const DuplicateTreeDialog = lazy(() => import('@/components/modals/DuplicateTreeDialog').then(m => ({ default: m.DuplicateTreeDialog })))
const DeleteTreeConfirmDialog = lazy(() => import('@/components/modals/DeleteTreeConfirmDialog').then(m => ({ default: m.DeleteTreeConfirmDialog })))
const EditPersonModal = lazy(() => import('@/components/modals/EditPersonModal').then(m => ({ default: m.EditPersonModal })))
const InviteToClaimModal = lazy(() => import('@/components/modals/InviteToClaimModal').then(m => ({ default: m.InviteToClaimModal })))
const DraftCRBanner = lazy(() => import('@/components/ui/DraftCRBanner').then(m => ({ default: m.DraftCRBanner })))
const DraftReviewSheet = lazy(() => import('@/components/modals/DraftReviewSheet').then(m => ({ default: m.DraftReviewSheet })))
const TreeSettingsModal = lazy(() => import('@/components/modals/TreeSettingsModal').then(m => ({ default: m.TreeSettingsModal })))
// Panels moved to PanelHost — only keep modals and pages that aren't panels
const SmartSuggestion = lazy(() => import('@/components/ui/SmartSuggestion').then(m => ({ default: m.SmartSuggestion })))
const RelationshipPathModal = lazy(() => import('@/components/modals/RelationshipPathModal').then(m => ({ default: m.RelationshipPathModal })))
const MergePersonsModal = lazy(() => import('@/components/modals/MergePersonsModal').then(m => ({ default: m.MergePersonsModal })))
const WebViewSearchBar = lazy(() => import('@/components/canvas/WebViewSearchBar').then(m => ({ default: m.WebViewSearchBar })))
const AddSourceModal = lazy(() => import('@/components/modals/AddSourceModal').then(m => ({ default: m.AddSourceModal })))
const InviteCollaboratorModal = lazy(() => import('@/components/modals/InviteCollaboratorModal').then(m => ({ default: m.InviteCollaboratorModal })))
const CreateMemoryModal = lazy(() => import('@/components/modals/CreateMemoryModal').then(m => ({ default: m.CreateMemoryModal })))
const MemoriesPage = lazy(() => import('@/pages/MemoriesPage').then(m => ({ default: m.MemoriesPage })))
const ManageTagsModal = lazy(() => import('@/components/modals/ManageTagsModal').then(m => ({ default: m.ManageTagsModal })))
const FeedbackModal = lazy(() => import('@/components/modals/FeedbackModal').then(m => ({ default: m.FeedbackModal })))
const TreeOverviewPage = lazy(() => import('@/pages/TreeOverviewPage'))
const InstitutionsHomePage = lazy(() => import('@/pages/institutions/InstitutionsHomePage').then(m => ({ default: m.InstitutionsHomePage })))
const CelebrateCultureHub = lazy(() => import('@/pages/CelebrateCultureHub').then(m => ({ default: m.CelebrateCultureHub })))
const PredictionsPage = lazy(() => import('@/pages/PredictionsPage').then(m => ({ default: m.PredictionsPage })))
const AncestralIdentityPage = lazy(() => import('@/pages/ancestral/AncestralIdentityPage').then(m => ({ default: m.AncestralIdentityPage })))
const LanguagePreferenceModal = lazy(() => import('@/components/modals/LanguagePreferenceModal').then(m => ({ default: m.LanguagePreferenceModal })))
const PersonProfilePage = lazy(() => import('@/pages/PersonProfilePage'))
const DiscoverPage = lazy(() => import('@/pages/DiscoverPage').then(m => ({ default: m.DiscoverPage })))
const PreserveMyFamilyHub = lazy(() => import('@/pages/PreserveMyFamilyHub').then(m => ({ default: m.PreserveMyFamilyHub })))
const FamilyHub = lazy(() => import('@/pages/FamilyHub').then(m => ({ default: m.FamilyHub })))
const RelationshipPathPage = lazy(() => import('@/pages/RelationshipPathPage').then(m => ({ default: m.RelationshipPathPage })))
const MigrationMapPanel = lazy(() => import('@/components/panels/MigrationMapPanel').then(m => ({ default: m.MigrationMapPanel })))
const SuggestionsPanel = lazy(() => import('@/components/panels/SuggestionsPanel').then(m => ({ default: m.SuggestionsPanel })))
const DuplicateDetectionPanel = lazy(() => import('@/components/panels/DuplicateDetectionPanel').then(m => ({ default: m.DuplicateDetectionPanel })))

export function DashboardPage() {
  const navigate = useNavigate()
  const { setTheme, resolvedTheme } = useTheme()
  const { toast } = useToast()
  const { user } = useAuthStore()
  const userId = user?.id || 'demo-user-001'
  const { currentStreak: streakDays } = useStreak(user?.id)
  const isWebView = localStorage.getItem('webview_mode') === '1'
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Hash-based view persistence — survive page refreshes
  // ---------------------------------------------------------------------------
  const initialHash = window.location.hash.replace('#', '')
  const initialView = (() => {
    if (initialHash === 'tree') return 'tree'
    if (initialHash === 'memories') return 'memories'
    if (initialHash === 'allpeople') return 'allpeople'
    if (initialHash === 'treeoverview') return 'treeoverview'
    if (initialHash === 'temples') return 'temples'
    if (initialHash === 'culture' || initialHash.startsWith('culture/')) return initialHash
    if (initialHash === 'family' || initialHash.startsWith('family/')) return initialHash
    if (initialHash.startsWith('person/')) return 'person'
    return 'home'
  })()
  const initialPersonId = initialHash.startsWith('person/') ? initialHash.split('/')[1] : null

  // State for multi-tree management
  // currentTreeId = the active tree (defines the ENTIRE experience — dashboard, canvas, memories, etc.)
  // When the user switches trees, everything updates to that tree's perspective.
  const [currentTreeId, setCurrentTreeId] = useState<string | null>(null)
  const [userTrees, setUserTrees] = useState<TreeMetadata[]>([])
  // Unified panel manager — replaces individual panel useState booleans
  const openPanel = usePanelStore(s => s.openPanel)
  const closePanelStore = usePanelStore(s => s.closePanel)
  const activePanelId = usePanelStore(s => s.activePanel)

  // showTreeManagementPanel — now managed by panelStore
  const [showCreateTreeWizard, setShowCreateTreeWizard] = useState(initialHash === 'create-tree')
  const [wizardInitialTreeId, setWizardInitialTreeId] = useState<string | undefined>(undefined)
  const [wizardInitialTreeName, setWizardInitialTreeName] = useState<string | undefined>(undefined)
  const [showDashboardHome, setShowDashboardHome] = useState(initialView === 'home')
  const [skipEmptyCheck, setSkipEmptyCheck] = useState(false) // Skip empty check after wizard
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false)
  const [showStoryCapture, setShowStoryCapture] = useState(false)
  // A8: Welcome + path selection for first-time users
  const [showWelcomePath, setShowWelcomePath] = useState(false)
  const [showConversationalWizard, setShowConversationalWizard] = useState(false)

  // State for feedback modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)

  // State for language preference modal (shown when user has no feed preferences)
  const [showLanguagePrefModal, setShowLanguagePrefModal] = useState(false)
  const [currentFeedPrefs, setCurrentFeedPrefs] = useState<{ langs: string[]; mode: 'strict' | 'soft' }>({ langs: ['en'], mode: 'soft' })

  // Spotlight Search (Cmd+K)
  const [showSpotlight, setShowSpotlight] = useState(false)

  // Discover page (mobile)
  const [showDiscover, setShowDiscover] = useState(false)

  // State for tree management dialogs
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
  const [selectedTreeForAction, setSelectedTreeForAction] = useState<TreeMetadata | null>(null)
  const [showSetHomePersonModal, setShowSetHomePersonModal] = useState(false)
  const [importedTreeIdForHomePerson, setImportedTreeIdForHomePerson] = useState<string | null>(null)
  const [homePersonCandidates, setHomePersonCandidates] = useState<any[] | null>(null)
  const [isImportingGedcom, setIsImportingGedcom] = useState(false)

  // State for family selection
  const [, setFamilies] = useState<FamilyRoot[]>([])
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null)
  const [componentMap, setComponentMap] = useState<ComponentMap>({})

  // State for relationship selection flow
  const [showRelationshipSelector, setShowRelationshipSelector] = useState(false)
  const [relationshipContext, setRelationshipContext] = useState<'parent' | 'sibling' | null>(null)
  const [selectedRelationship, setSelectedRelationship] = useState<'father' | 'mother' | 'brother' | 'sister' | 'spouse' | 'son' | 'daughter' | null>(null)
  const [memberForAddRelative, setMemberForAddRelative] = useState<{ id: string, name: string, position?: { x: number; y: number } } | null>(null)

  // State for Neo4j add relative modal
  const [showAddRelativeNeo4j, setShowAddRelativeNeo4j] = useState(false)
  const [neo4jRelativeContext, setNeo4jRelativeContext] = useState<{
    person: Person;
    relationship: 'father' | 'mother' | 'son' | 'daughter' | 'parent' | 'child';
    selectedUnionId?: string; // Optional: for pre-selected union when adding child
    replaceGhostPersonId?: string; // Optional: ID of ghost/deleted node to replace
  } | null>(null)

  // State for Neo4j add spouse modal
  const [showAddSpouseNeo4j, setShowAddSpouseNeo4j] = useState(false)
  const [spouseReferencePersonNeo4j, setSpouseReferencePersonNeo4j] = useState<Person | null>(null)

  // State for marry existing person modal
  const [showMarryExistingModal, setShowMarryExistingModal] = useState(false)
  const [personToMarry, setPersonToMarry] = useState<Person | null>(null)

  // State for Neo4j add sibling modal
  const [showAddSiblingModal, setShowAddSiblingModal] = useState(false)
  const [siblingReferencePersonNeo4j, setSiblingReferencePersonNeo4j] = useState<Person | null>(null)

  // State for relative side picker (grandparent / uncle-aunt / cousin)
  const [showRelativeSidePicker, setShowRelativeSidePicker] = useState(false)
  const [relativeSidePickerContext, setRelativeSidePickerContext] = useState<{
    mode: 'grandparent' | 'uncle-aunt' | 'cousin';
    originalPerson: Person;
    parents: ParentOption[];
    unclesAunts: Array<{ person: Person; side: 'paternal' | 'maternal' }>;
  } | null>(null)

  // State for multiple marriage prompt
  const [showMultipleMarriagePrompt, setShowMultipleMarriagePrompt] = useState(false)
  const [multipleMarriageContext, setMultipleMarriageContext] = useState<{
    person: Person;
    existingSpouses: Array<{ spouse: Person; union: Union }>;
  } | null>(null)

  // State for Neo4j tree data (used for union-based checks)
  const [treeData, setTreeData] = useState<TreeWindowData | null>(null)
  const [treeReloadKey, setTreeReloadKey] = useState(0)
  const [treeKey, setTreeKey] = useState(0)
  console.log("treedata", treeData)
  // State for select union modal (when adding child)
  const [showSelectUnionModal, setShowSelectUnionModal] = useState(false)
  const [selectUnionContext, setSelectUnionContext] = useState<{
    person: Person;
    unions: Array<{ union: Union; spouse: Person | null }>;
  } | null>(null)

  // State for smart suggestions
  const [showSmartSuggestion, setShowSmartSuggestion] = useState(false)
  const [smartSuggestionData, setSmartSuggestionData] = useState<{
    message: string;
    actionLabel: string;
    onAction: () => void;
    icon: 'user' | 'heart' | 'baby' | 'users';
  } | null>(null)

  // State for move children prompt
  const [showMoveChildrenPrompt, setShowMoveChildrenPrompt] = useState(false)
  const [moveChildrenContext, setMoveChildrenContext] = useState<{
    referencePerson: Person;
    newSpouse: Person;
    existingChildren: Person[];
    singleParentUnion: Union;
    newMarriageUnion: Union;
  } | null>(null)

  // State for delete person confirmation
  const [showDeletePersonDialog, setShowDeletePersonDialog] = useState(false)
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null)

  // State for edit person modal
  const [showEditPersonModal, setShowEditPersonModal] = useState(false)
  const [personToEdit, setPersonToEdit] = useState<Person | null>(null)
  const [ghostToReplace, setGhostToReplace] = useState<Person | null>(null)
  const [ghostParentChooseChildId, setGhostParentChooseChildId] = useState<string | null>(null)

  // State for invite-to-claim modal and draft review
  const [showInviteToClaimModal, setShowInviteToClaimModal] = useState(false)
  const [showDraftReview, setShowDraftReview] = useState(false)
  const [inviteToClaimPerson, setInviteToClaimPerson] = useState<Person | null>(null)

  // State for quick add wizard
  const [showQuickAddWizard, setShowQuickAddWizard] = useState(false)
  const [quickAddPerson, setQuickAddPerson] = useState<Person | null>(null)

  // State for tree settings modal
  const [showTreeSettingsModal, setShowTreeSettingsModal] = useState(false)

  // State for mobile bottom nav
  const [bottomNavActiveTab, setBottomNavActiveTab] = useState<'home' | 'canvas' | 'memories' | 'discover'>('home')
  const [searchFocusTrigger, setSearchFocusTrigger] = useState(0)
  const [resetViewTrigger] = useState(0)
  // showProfilePanel, showAddRelativePanel — now managed by panelStore
  const [addRelativePerson, setAddRelativePerson] = useState<Person | null>(null)
  const [currentValidationConfig, setCurrentValidationConfig] = useState<ValidationConfig | null>(null)

  // Phase 2: History, Activity, Pending Edits, Media Gallery panels — now managed by panelStore
  const [pendingEditCount, setPendingEditCount] = useState(0)
  // showMediaGallery — now managed by panelStore

  // Phase 3: Relationship Path Finder (stays as modal)
  const [showRelationshipPathModal, setShowRelationshipPathModal] = useState(false)
  const [, setHighlightedPathPersonIds] = useState<string[]>([])

  // Suggestions, Bookmarks, DuplicateDetection — now managed by panelStore
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [selectedDuplicatePair, setSelectedDuplicatePair] = useState<DuplicatePair | null>(null)

  // MigrationMap, Timeline, Source, Descendancy, DNA — now managed by panelStore
  const [showAddSourceModal, setShowAddSourceModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)

  // Phase 8: Memories & Stories
  const [showCreateMemoryModal, setShowCreateMemoryModal] = useState(false)
  const [memoryContextPersonId, setMemoryContextPersonId] = useState<string | null>(null)
  const [showMemoriesPanel, setShowMemoriesPanel] = useState(initialView === 'memories')
  const [memoriesPanelPersonId, setMemoriesPanelPersonId] = useState<string | null>(null)
  const [memoriesPanelPersonName, setMemoriesPanelPersonName] = useState('')
  const [, setMemoriesRefreshKey] = useState(0)
  const [memoryCounts, setMemoryCounts] = useState<Record<string, number>>({})

  // AllPeople — now managed by panelStore
  const [, setAllPeopleFilter] = useState<{
    isLiving?: boolean; filterMarried?: boolean; sort?: string; order?: string; gender?: string;
  }>({})

  // Heritage Summary Strip data (F13)
  const [heritageKulaDevataName, setHeritageKulaDevataName] = useState<string | null>(null)
  const [heritageTempleMemoryCount, setHeritageTempleMemoryCount] = useState(0)

  // Manage Tags Modal
  const [showManageTagsModal, setShowManageTagsModal] = useState(false)
  const [manageTagsPersonId, setManageTagsPersonId] = useState<string | null>(null)
  const [manageTagsCurrentTags, setManageTagsCurrentTags] = useState<string[]>([])

  // LifeStory — now managed by panelStore

  // Tree Overview
  const [showTreeOverview, setShowTreeOverview] = useState(initialView === 'treeoverview')

  // Your Identity (hub, Sacred Institutions, Cosmic Predictions, Ancestral Identity)
  const [showTemples, setShowTemples] = useState(initialView === 'temples' || initialView === 'culture' || initialView?.startsWith('culture/'))
  const [cultureSubView, setCultureSubView] = useState<'hub' | 'institutions' | 'predictions' | 'ancestral'>(
    initialView === 'temples' || initialView === 'culture/institutions' ? 'institutions'
      : initialView === 'culture/predictions' ? 'predictions'
        : initialView === 'culture/ancestral' ? 'ancestral'
          : 'hub'
  )

  // Preserve My Family Hub
  const [preserveSubView, setPreserveSubView] = useState<'hub' | 'gallery' | 'stories' | 'albums' | 'interviews'>(
    initialView === 'memories' ? 'gallery' : 'hub'
  )

  // Family Hub
  const [showFamily, setShowFamily] = useState(initialView === 'family' || initialView?.startsWith('family/'))
  const [familySubView, setFamilySubView] = useState<'hub' | 'trees' | 'migration' | 'pathfinder' | 'suggestions' | 'duplicates'>(
    initialView === 'family/migration' ? 'migration'
      : initialView === 'family/pathfinder' ? 'pathfinder'
        : initialView === 'family/suggestions' ? 'suggestions'
          : initialView === 'family/duplicates' ? 'duplicates'
            : 'hub'
  )

  // Daily Share
  const [showDailyShare, setShowDailyShare] = useState(initialView === 'dailyshare')

  // Comments — now managed by panelStore

  // Person Profile Page
  const [showPersonProfile, setShowPersonProfile] = useState(initialView === 'person')
  const [profilePersonId, setProfilePersonId] = useState<string | null>(initialPersonId)

  // Canvas controls (exposed via onCanvasControlsReady callback)
  const canvasControlsRef = useRef<CanvasControls | null>(null)

  // Lifted blood relation mode state
  const [bloodRelationMode, setBloodRelationMode] = useState<BloodRelationMode>('all')

  // Grid settings modal (controlled from TopBar/Sidebar, rendered inside canvas)
  const [showGridSettingsModal, setShowGridSettingsModal] = useState(false)

  // Mobile drawer state
  const [showMobileDrawer, setShowMobileDrawer] = useState(false)

  // Layout mode from store (for TopBar dropdown)
  const layoutMode = useTreeStore(s => s.layoutMode)
  const setLayoutMode = useTreeStore(s => s.setLayoutMode)

  // Stable refs so handleTreeDataLoaded never needs these in its deps
  const selectedFamilyIdRef = useRef(selectedFamilyId);
  selectedFamilyIdRef.current = selectedFamilyId;
  const currentTreeIdRef = useRef(currentTreeId);
  currentTreeIdRef.current = currentTreeId;

  // ---------------------------------------------------------------------------
  // Hash sync — keep URL hash in sync with current view for refresh persistence
  // ---------------------------------------------------------------------------
  const lastPushedHashRef = useRef(window.location.hash.replace('#', ''))

  useEffect(() => {
    let hash = ''
    if (showPersonProfile && profilePersonId) {
      hash = `person/${profilePersonId}`
    } else if (showMemoriesPanel) {
      hash = 'memories'
    } else if (usePanelStore.getState().activePanel === 'all-people') {
      hash = 'allpeople'
    } else if (showTreeOverview) {
      hash = 'treeoverview'
    } else if (showTemples) {
      hash = cultureSubView === 'institutions' ? 'culture/institutions'
        : cultureSubView === 'predictions' ? 'culture/predictions'
          : cultureSubView === 'ancestral' ? 'culture/ancestral'
            : 'culture'
    } else if (showFamily) {
      hash = familySubView === 'migration' ? 'family/migration'
        : familySubView === 'pathfinder' ? 'family/pathfinder'
          : familySubView === 'suggestions' ? 'family/suggestions'
            : familySubView === 'duplicates' ? 'family/duplicates'
              : 'family'
    } else if (!showDashboardHome) {
      hash = 'tree'
    }
    const newUrl = hash ? `${window.location.pathname}${window.location.search}#${hash}` : `${window.location.pathname}${window.location.search}`
    // Use pushState for major view changes so back button navigates within app
    if (hash !== lastPushedHashRef.current) {
      window.history.pushState(null, '', newUrl)
      lastPushedHashRef.current = hash
    }
  }, [showDashboardHome, showMemoriesPanel, showTreeOverview, showTemples, cultureSubView, showFamily, familySubView, showPersonProfile, profilePersonId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Popstate listener — restore view when user presses back/forward button
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.replace('#', '')
      lastPushedHashRef.current = hash
      // Reset all views first
      setShowDashboardHome(false)
      setShowMemoriesPanel(false)
      setMemoriesPanelPersonId(null)
      setShowTreeOverview(false)
      setShowTemples(false)
      setShowFamily(false)
      setFamilySubView('hub')
      setShowPersonProfile(false)
      setProfilePersonId(null)
      // Activate the target view
      if (hash === 'memories') {
        setShowMemoriesPanel(true)
      } else if (hash === 'treeoverview') {
        setShowTreeOverview(true)
      } else if (hash === 'temples' || hash === 'culture/institutions') {
        setShowTemples(true)
        setCultureSubView('institutions')
      } else if (hash === 'culture/predictions/new' || hash === 'culture/predictions') {
        setShowTemples(true)
        setCultureSubView('predictions')
      } else if (hash === 'culture/ancestral') {
        setShowTemples(true)
        setCultureSubView('ancestral')
      } else if (hash === 'culture') {
        setShowTemples(true)
        setCultureSubView('hub')
      } else if (hash === 'family') {
        setShowFamily(true)
        setFamilySubView('hub')
      } else if (hash === 'family/migration') {
        setShowFamily(true)
        setFamilySubView('migration')
      } else if (hash === 'family/pathfinder') {
        setShowFamily(true)
        setFamilySubView('pathfinder')
      } else if (hash === 'family/suggestions') {
        setShowFamily(true)
        setFamilySubView('suggestions')
      } else if (hash === 'family/duplicates') {
        setShowFamily(true)
        setFamilySubView('duplicates')
      } else if (hash.startsWith('person/')) {
        setShowPersonProfile(true)
        setProfilePersonId(hash.split('/')[1] || null)
      } else if (hash === 'tree' || hash === '') {
        // Default to tree view (canvas)
      } else if (hash === 'home' || !hash) {
        setShowDashboardHome(true)
      } else if (hash === 'create-tree') {
        setShowCreateTreeWizard(true)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Called by UnionBasedTreeCanvas after each data load.
  // Computes family roots from already-loaded data — no extra API call.
  const handleTreeDataLoaded = useCallback((data: TreeWindowData) => {
    // For contributors, swap isHomePerson to their claimed node (their perspective)
    const claimedId = data.claimedPersonId
    if (claimedId && data.persons.some(p => p.personId === claimedId)) {
      data.persons = data.persons.map(p => ({
        ...p,
        isHomePerson: p.personId === claimedId,
      }))
    }

    setTreeData(data);

    // If the tree is not empty but has no home person, force home person selection modal
    const hasHomePerson = data.persons.some(p => p.isHomePerson);
    if (data.persons.length > 0 && !hasHomePerson) {
      const activeTreeId = currentTreeIdRef.current || data.trees?.[0]?.treeId || null;
      if (activeTreeId) {
        setImportedTreeIdForHomePerson(activeTreeId);
        setHomePersonCandidates(null);
        setShowSetHomePersonModal(true);
      }
    }

    const { roots, componentMap: compMap } = computeFamilyRoots(data);
    const familyRoots: FamilyRoot[] = roots.map(r => ({
      personId: r.personId,
      name: `${r.firstName}${r.lastName ? ' ' + r.lastName : ''}`,
      initials: `${r.firstName?.[0] || ''}${r.lastName?.[0] || ''}`.toUpperCase() || '?',
    }));
    setFamilies(familyRoots);
    setComponentMap(compMap);
    // Auto-select first family on initial load — prefer the user's last-viewed
    // person (6.10) when one is on file; otherwise fall back to the first root.
    if (familyRoots.length > 0 && !selectedFamilyIdRef.current) {
      const tid = currentTreeIdRef.current
      const lastViewed = tid ? getLastViewedPerson(tid) : null
      const lastViewedExists = lastViewed
        && data.persons.some((p: { personId: string }) => p.personId === lastViewed.personId)
      setSelectedFamilyId(lastViewedExists ? lastViewed!.personId : familyRoots[0].personId);
    }
    // Load memory counts for canvas badges
    // const tid = currentTreeIdRef.current || data.trees?.[0]?.treeId;
    // if (tid) {
    //   fetchMemoryCounts(tid).then(setMemoryCounts).catch(() => { });
    // }
    // Set contributor context from backend role info
    const role = (data.userRole || 'owner') as TreeRole
    useContributorStore.getState().setContributorContext(
      role,
      data.claimedPersonId ?? null,
      null, // ownerName — resolved as "the tree owner" in UI fallback
      currentTreeIdRef.current
    )
  }, []); // stable — reads selectedFamilyId via ref

  // Open panels based on initial URL hash
  useEffect(() => {
    if (initialView === 'allpeople') openPanel('all-people')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear tree cache on mount to ensure fresh role/perspective data
  useEffect(() => { neo4jAPI.clearAllTreeCaches() }, [])

  // ─── Sync chat store context with current tree/route/focus person ────────
  const setChatContext = useChatStore(s => s.setContext)
  const setChatFocusPerson = useChatStore(s => s.setFocusPerson)

  useEffect(() => {
    const syncRoute = () => {
      const route = window.location.hash.replace('#', '') || 'home'
      const treeName = userTrees.find(t => t.treeId === currentTreeId)?.treeName ?? null
      setChatContext(route, currentTreeId, treeName)
    }
    syncRoute()
    // Also sync on hash changes (sub-page navigation within dashboard)
    window.addEventListener('hashchange', syncRoute)
    return () => window.removeEventListener('hashchange', syncRoute)
  }, [currentTreeId, userTrees, setChatContext])

  useEffect(() => {
    if (selectedMemberId && treeData) {
      const p = treeData.persons.find(q => q.personId === selectedMemberId)
      const name = p ? `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || null : null
      setChatFocusPerson(selectedMemberId, name)
    } else {
      setChatFocusPerson(null, null)
    }
  }, [selectedMemberId, treeData, setChatFocusPerson])

  // Load user trees on mount — also handle ?invitation= query param
  useEffect(() => {
    const loadUserTrees = async () => {
      // Check for invitation query param
      const params = new URLSearchParams(window.location.search)
      const invitationId = params.get('invitation')

      // If there's an invitation, accept it first
      if (invitationId) {
        try {
          const result = await acceptInvitationAPI(invitationId)
          toast({ title: 'Invitation accepted', description: `You now have access to "${result.treeName}"` })
          // Clean up the URL
          window.history.replaceState({}, '', window.location.pathname)
          // Load trees and navigate to the invited tree
          const trees = await neo4jAPI.getUserTrees(userId)
          setUserTrees(trees)
          setCurrentTreeId(result.treeId)
          return
        } catch (err: unknown) {
          console.error('Failed to accept invitation:', err)
          toast({ title: 'Invitation error', description: err instanceof Error ? err.message : 'Could not accept invitation', variant: 'destructive' })
          // Clean up the URL and continue with normal load
          window.history.replaceState({}, '', window.location.pathname)
        }
      }

      try {
        const trees = await neo4jAPI.getUserTrees(userId)
        setUserTrees(trees)

        if (trees.length === 0) {
          // First-time user — A8: show welcome + path selection before any wizard
          setIsFirstTimeUser(true)
          setShowWelcomePath(true)
        } else {
          // Store default tree ID in localStorage
          const defaultTree = trees.find((t: any) => t.isDefault === true) || trees[0]
          if (defaultTree) {
            try { localStorage.setItem('defaultTreeId', defaultTree.treeId) } catch { /* noop */ }
          }
          // Prioritize the query param, then default tree.
          const targetTreeId = params.get('treeId')
          let treeToLoad = defaultTree || trees[0]

          if (targetTreeId) {
            const found = trees.find(t => t.treeId === targetTreeId)
            if (found) treeToLoad = found
          }

          setCurrentTreeId(treeToLoad.treeId)
        }
      } catch (error) {
        console.error('Failed to load user trees:', error)
        // If error, assume no trees — show dashboard home with tutorial
        setIsFirstTimeUser(true)
      }
    }
    loadUserTrees()
  }, [])

  // ─── Phase 2: Tree Data Background Load ──────────────────────────────────
  // Fetches tree data even if canvas isn't rendered (e.g. from Dashboard Home)
  // to ensure persons list is available for memories and other modals.
  useEffect(() => {
    if (currentTreeId && !treeData) {
      console.log('[DashboardPage] Loading tree data in background for ID:', currentTreeId);
      neo4jAPI.fetchTreeWindow(currentTreeId).then(handleTreeDataLoaded).catch(err => {
        console.error('[DashboardPage] Background tree load failed:', err);
      });
    }
  }, [currentTreeId, treeData, handleTreeDataLoaded]);

  // Check if user has set feed language preferences — prompt if not
  useEffect(() => {
    const hasBeenAsked = localStorage.getItem('feed_lang_pref_set')
    if (hasBeenAsked) return

    void (async () => {
      try {
        const { fetchFeedPreferences } = await import('@/services/dailyShareApiService')
        const prefs = await fetchFeedPreferences()
        // If preferences exist and were explicitly set (not just default), skip prompt
        if (prefs && prefs.preferredLanguages && prefs.preferredLanguages.length > 0) {
          // Check if it's the auto-created default (just ['en'] with 'soft') or user-set
          // We show the modal for first-time — the flag gets set once they save
          if (localStorage.getItem('feed_lang_pref_set')) return
        }
        // Show the language preference modal after a short delay (let dashboard settle)
        setTimeout(() => setShowLanguagePrefModal(true), 1500)
      } catch {
        // API might not have the new endpoint yet — skip silently
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load pending edit count when tree changes
  useEffect(() => {
    if (!currentTreeId) { setPendingEditCount(0); return }
    pendingEditAPI.getPendingEditCount(currentTreeId).then(setPendingEditCount).catch(() => setPendingEditCount(0))
  }, [currentTreeId, treeReloadKey])

  // Load heritage data for Heritage Summary Strip (F13)
  useEffect(() => {
    if (!currentTreeId) { setHeritageKulaDevataName(null); setHeritageTempleMemoryCount(0); return }
    getTreeTempleLinks(currentTreeId)
      .then(async links => {
        const kulaLink = links.find(l => l.connectionType === 'kula_devata')
        if (kulaLink) {
          const { getTempleById } = await import('@/data/temples')
          const temple = getTempleById(kulaLink.templeId)
          setHeritageKulaDevataName(temple?.name ?? null)
        } else {
          setHeritageKulaDevataName(null)
        }
      })
      .catch(() => setHeritageKulaDevataName(null))
    getTreeTempleMemoryCounts(currentTreeId)
      .then(counts => setHeritageTempleMemoryCount(Object.values(counts).reduce((s, n) => s + n, 0)))
      .catch(() => setHeritageTempleMemoryCount(0))
  }, [currentTreeId])

  // Reset skip flag when currentTreeId changes (cleanup)
  useEffect(() => {
    if (!currentTreeId) return

    // Skip check if we just created a tree via wizard (which already creates home person)
    if (skipEmptyCheck) {
      setSkipEmptyCheck(false) // Reset flag for next time
    }
  }, [currentTreeId, skipEmptyCheck])

  // Spotlight Search keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSpotlight(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Spotlight action handler for non-panel actions
  const handleSpotlightAction = useCallback((action: { actionKey?: string }) => {
    if (!action.actionKey) return
    switch (action.actionKey) {
      case 'go-home':
        if (isFirstTimeUser) {
          setShowCreateTreeWizard(true)
        } else {
          setShowDashboardHome(true)
        }
        break
      case 'go-tree':
        if (isFirstTimeUser) setShowCreateTreeWizard(true)
        else setShowDashboardHome(false)
        break
      case 'tree-overview':
        setShowTreeOverview(true)
        break
      case 'relationship-path':
        setShowRelationshipPathModal(true)
        break
      case 'tree-settings':
        if (currentTreeId) handleOpenTreeSettings()
        break
      case 'toggle-theme': {
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
        break
      }
      case 'invite':
        setShowInviteModal(true)
        break
      case 'voice':
        // Voice assistant removed — functionality moved to AI chatbot
        break
      case 'sign-out':
        useAuthStore.getState().signOut()
        break
      case 'open-memories':
        setMemoriesPanelPersonId(null)
        setMemoriesPanelPersonName('')
        setShowMemoriesPanel(true)
        break
      default:
        // Person context actions (add-parent, add-spouse, edit, etc.)
        if (selectedMemberId) {
          handlePersonContextAction(selectedMemberId, action.actionKey)
        }
        break
    }
  }, [currentTreeId, isFirstTimeUser, selectedMemberId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Helper to trigger tree reload — increments reloadTrigger on canvas.
  // Family roots are recomputed automatically via onTreeDataLoaded after the canvas reload.
  const triggerTreeReload = useCallback((reason: string) => {
    console.log('[DashboardPage] Triggering tree reload:', reason);
    // Clear stale component map so the canvas loads UNFILTERED data.
    // handleTreeDataLoaded will recompute components from fresh data.
    setComponentMap({});
    setTreeReloadKey(prev => prev + 1);
    // Force canvas remount to guarantee fresh state — changing treeKey unmounts
    // and remounts the canvas component, clearing all internal caches and state.
    setTreeKey(prev => prev + 1);
  }, []);

  // ─── Listen for tree mutations from AI chatbot ──────────────────────────
  useEffect(() => {
    const handler = () => {
      neo4jAPI.clearAllTreeCaches()
      triggerTreeReload('AI chatbot mutation')
    }
    window.addEventListener('familytree:mutated', handler)
    return () => window.removeEventListener('familytree:mutated', handler)
  }, [triggerTreeReload])

  // Optimistic update: patch local treeData and inject into canvas immediately,
  // then trigger a background reload for server reconciliation.
  // Uses functional updater to avoid stale closure issues with rapid updates.
  const applyOptimisticUpdate = useCallback((
    patchFn: (current: TreeWindowData) => TreeWindowData,
    reason: string
  ) => {
    setTreeData(prev => {
      if (!prev) return prev;
      const patched = patchFn(prev);
      // Inject into canvas directly (skips API fetch, triggers layout recalc)
      canvasControlsRef.current?.patchTreeData(patched);
      return patched;
    });
    // Background reconciliation — fetches authoritative data from server
    triggerTreeReload(reason);
  }, [triggerTreeReload]);

  // Handler for tree switching
  const handleTreeSwitch = async (newTreeId: string) => {
    try {
      // Clear contributor draft and context — will be re-set when new tree data loads
      useContributorStore.getState().clearDraft()
      useContributorStore.getState().setContributorContext(null, null, null, null)

      // Invalidate tree cache so fresh data (with correct isHomePerson) loads
      neo4jAPI.invalidateTreeCache(newTreeId)

      // Update current tree ID
      setCurrentTreeId(newTreeId)

      // Save to localStorage for persistence
      localStorage.setItem('lastUsedTreeId', newTreeId)

      // Clear current tree state
      setTreeData(null)
      setFamilies([])
      setSelectedFamilyId(null)
      setSelectedMemberId(null)

      // Close tree management panel
      closePanelStore()

      // Reset onboarding/capture views
      setShowStoryCapture(false)
      setShowCreateTreeWizard(false)

      // Increment treeKey to force full remount on tree switch (resets pan/zoom)
      setTreeKey(prev => prev + 1)

      // Trigger tree reload (family roots will be loaded by useEffect)
      triggerTreeReload('Tree switched')
    } catch (error) {
      console.error('Failed to switch tree:', error)
    }
  }

  // Handler for tree wizard completion
  const handleTreeCreated = async (newTreeId: string, action?: 'add-memory' | 'explore') => {
    setShowCreateTreeWizard(false)
    setIsFirstTimeUser(false)
    setWizardInitialTreeId(undefined)
    setWizardInitialTreeName(undefined)

    // Reload user trees with forceRefresh = true
    // Reload user trees
    const trees = await neo4jAPI.getUserTrees(userId, true)
    setUserTrees(trees)

    // Set flag to skip empty tree check (wizard already created home person)
    setSkipEmptyCheck(true)

    // Switch to new tree
    await handleTreeSwitch(newTreeId)

    // Notify LanguagePreferenceGuard that a tree has been created successfully
    window.dispatchEvent(new Event('tree-created'))
    
    if (action === 'add-memory') {
      setShowDashboardHome(false)
      setShowMemoriesPanel(true)
      setPreserveSubView('hub')
      window.location.hash = 'memories'
    } else {
      setShowDashboardHome(false)
      setShowMemoriesPanel(false)
      window.location.hash = 'tree'
    }
  }

  // Handler for navigating to a different tree via navigation icons
  const handleNavigateToTree = useCallback(async (newTreeId: string) => {
    if (newTreeId === currentTreeId) {
      console.log('Already viewing this tree')
      return
    }

    // Check if tree exists in user's trees
    const targetTree = userTrees.find(t => t.treeId === newTreeId)
    if (!targetTree) {
      toast({
        title: 'Tree Not Found',
        description: 'The linked family tree could not be found. You may not have access to it.',
        variant: 'destructive',
      })
      return
    }

    // Switch to new tree
    console.log(`Navigating to tree: ${targetTree.treeName}`)
    await handleTreeSwitch(newTreeId)
  }, [currentTreeId, userTrees, handleTreeSwitch, toast])

  // Tree management handlers (rename, delete, duplicate)
  const handleRenameTree = useCallback(async (treeId: string) => {
    const tree = userTrees.find(t => t.treeId === treeId)
    if (!tree) return

    setSelectedTreeForAction(tree)
    setShowRenameDialog(true)
  }, [userTrees])

  const handleConfirmRename = useCallback(async (newName: string) => {
    if (!selectedTreeForAction) return

    try {
      await neo4jAPI.renameTree(selectedTreeForAction.treeId, newName)

      // Reload user trees
      const trees = await neo4jAPI.getUserTrees(userId, true)
      setUserTrees(trees)

      toast({
        title: 'Success',
        description: `Tree renamed to "${newName}"`,
      })
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to rename tree',
        variant: 'destructive',
      })
    }
  }, [selectedTreeForAction, userId, toast])

  const handleDeleteTree = useCallback(async (treeId: string) => {
    const tree = userTrees.find(t => t.treeId === treeId)
    if (!tree) return

    setSelectedTreeForAction(tree)
    setShowDeleteDialog(true)
  }, [userTrees])

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedTreeForAction) return

    const treeId = selectedTreeForAction.treeId
    const isOnlyTree = userTrees.length === 1
    const isDeletingCurrentTree = treeId === currentTreeId

    try {
      await neo4jAPI.deleteTree(treeId)

      // Reload user trees
      const trees = await neo4jAPI.getUserTrees(userId, true)
      setUserTrees(trees)

      toast({
        title: 'Success',
        description: 'Tree deleted successfully',
      })

      // Handle post-deletion logic
      if (isOnlyTree) {
        // Last tree deleted — return to first-time-user state
        setCurrentTreeId(null)
        setIsFirstTimeUser(true)
        setShowDashboardHome(true)
      } else if (isDeletingCurrentTree) {
        // Deleted current tree - switch to first remaining tree
        if (trees.length > 0) {
          await handleTreeSwitch(trees[0].treeId)
        }
      }
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete tree',
        variant: 'destructive',
      })
    }
  }, [selectedTreeForAction, userTrees, currentTreeId, userId, handleTreeSwitch, toast])

  const handleDuplicateTree = useCallback(async (treeId: string) => {
    const tree = userTrees.find(t => t.treeId === treeId)
    if (!tree) return

    setSelectedTreeForAction(tree)
    setShowDuplicateDialog(true)
  }, [userTrees])

  const handleConfirmDuplicate = useCallback(async (newName: string) => {
    if (!selectedTreeForAction) return

    try {
      const duplicated = await neo4jAPI.duplicateTree(
        selectedTreeForAction.treeId,
        newName,
        userId
      )

      // Reload user trees
      const trees = await neo4jAPI.getUserTrees(userId, true)
      setUserTrees(trees)

      toast({
        title: 'Success',
        description: `Tree duplicated as "${newName}"`,
      })

      // Optionally switch to the new tree
      await handleTreeSwitch(duplicated.treeId)
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to duplicate tree',
        variant: 'destructive',
      })
    }
  }, [selectedTreeForAction, userId, handleTreeSwitch, toast])

  // GEDCOM/CSV Export handlers
  const handleExportGedcom = async (treeId: string) => {
    const tree = userTrees.find(t => t.treeId === treeId)
    if (!tree) return

    try {
      await neo4jAPI.exportGedcom(treeId, tree.treeName)
      toast({ title: 'Export complete', description: 'GEDCOM file downloaded successfully.' })
    } catch (error: unknown) {
      toast({ title: 'Export failed', description: error instanceof Error ? error.message : 'Export failed', variant: 'destructive' })
    }
  }

  const handleExportCsv = async (treeId: string) => {
    const tree = userTrees.find(t => t.treeId === treeId)
    if (!tree) return

    try {
      await neo4jAPI.exportCsv(treeId, tree.treeName)
      toast({ title: 'Export complete', description: 'CSV file downloaded successfully.' })
    } catch (error: unknown) {
      toast({ title: 'Export failed', description: error instanceof Error ? error.message : 'Export failed', variant: 'destructive' })
    }
  }

  const handleImportGedcom = async (file: File, treeName: string) => {
    setIsImportingGedcom(true)
    try {
      const result = await neo4jAPI.importGedcom(file, treeName)

      // Reload user trees
      const trees = await neo4jAPI.getUserTrees(userId, true)
      setUserTrees(trees)

      toast({
        title: 'Import successful',
        description: `Imported ${result.stats.individualsImported} individuals and ${result.stats.familiesImported} families.`,
      })

      // Show home person selection modal
      const importedTreeId = (result.tree?.treeId || result.treeId || result.data?.tree?.treeId) as string | undefined;
      if (importedTreeId) {
        setImportedTreeIdForHomePerson(importedTreeId)
        setHomePersonCandidates(result.candidates || null)
        setShowSetHomePersonModal(true)
      }
    } catch (error: unknown) {
      toast({ title: 'Import failed', description: error instanceof Error ? error.message : 'Import failed', variant: 'destructive' })
    } finally {
      setIsImportingGedcom(false)
    }
  }

  // Handlers for tree settings
  const handleOpenTreeSettings = async () => {
    if (!currentTreeId) return

    try {
      // Load current validation config
      const config = await neo4jAPI.getTreeValidationConfig(currentTreeId)
      setCurrentValidationConfig(config)
      setShowTreeSettingsModal(true)
    } catch (error: unknown) {
      console.error('Failed to load tree settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load tree settings',
        variant: 'destructive',
      })
    }
  }

  const handleSaveTreeSettings = async (config: ValidationConfig) => {
    if (!currentTreeId) return

    try {
      await neo4jAPI.updateTreeValidationConfig(currentTreeId, config)
      setCurrentValidationConfig(config)

      toast({
        title: 'Success',
        description: 'Tree validation settings updated successfully',
      })
    } catch (error: unknown) {
      console.error('Failed to save tree settings:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save tree settings',
        variant: 'destructive',
      })
      throw error // Re-throw to keep modal open on error
    }
  }

  // Handlers for relationship selection flow
  const handleSelectRelationship = async (relationship: 'father' | 'mother' | 'brother' | 'sister') => {
    setSelectedRelationship(relationship)
    setShowRelationshipSelector(false)

    // Route to appropriate Neo4j modal
    if (treeData && memberForAddRelative) {
      const person = treeData.persons.find(p => p.personId === memberForAddRelative.id)
      if (person) {
        // Handle ghost parent choose flow
        if (ghostParentChooseChildId === person.personId && (relationship === 'father' || relationship === 'mother')) {
          setGhostParentChooseChildId(null) // clear

          const existingParents = getPersonParents(person.personId)
          let ghostParent;
          if (relationship === 'father') {
            ghostParent = existingParents.find(p =>
              p.person.isDeleted &&
              (p.side === 'father' || p.person.gender === 'male' || p.person.gender !== 'female')
            )
          } else {
            ghostParent = existingParents.find(p =>
              p.person.isDeleted &&
              (p.side === 'mother' || p.person.gender === 'female' || p.person.gender !== 'male')
            )
          }

          if (ghostParent) {
            // call the existing edit API for the corresponding ghost parent
            neo4jAPI.activateGhostNode(ghostParent.person.personId, currentTreeId ?? undefined)
              .then(() => {
                triggerTreeReload('Ghost activated')
              })
              .catch(err => {
                console.error('Failed to activate ghost parent:', err)
              })

            // and open the add/edit UI
            setNeo4jRelativeContext({
              person: person,
              relationship: relationship as 'father' | 'mother',
              replaceGhostPersonId: ghostParent.person.personId,
            })
            setShowAddRelativeNeo4j(true)
          }
          return
        }

        // Handle sibling relationships
        if (relationship === 'brother' || relationship === 'sister') {
          setSiblingReferencePersonNeo4j(person)
          setShowAddSiblingModal(true)
          return
        }

        // Handle parent relationships
        if (relationship === 'father' || relationship === 'mother') {
          setNeo4jRelativeContext({
            person,
            relationship: relationship as 'father' | 'mother' | 'son' | 'daughter'
          })
          setShowAddRelativeNeo4j(true)
          return
        }
      }
    }
    // Clean up if we didn't match the condition
    setGhostParentChooseChildId(null)
  }

  // Handler for adding spouse (Neo4j)
  const handleAddSpouseNeo4j = async (
    spouseData: SpouseFormData,
    unionData: UnionFormData
  ) => {
    if (!spouseReferencePersonNeo4j || !treeData) {
      throw new Error('Missing reference person or tree data')
    }

    try {
      const treeId = currentTreeId || 'tree-001' // Fallback for safety

      // Use the new single addSpouse API call
      const { spouse: newSpouse, union: newMarriageUnion } = await neo4jAPI.addSpouse(
        spouseReferencePersonNeo4j.personId,
        spouseData,
        {
          type: unionData.type || 'marriage',
          startDate: unionData.startDate,
          endDate: unionData.endDate,
          ceremonyType: unionData.ceremonyType,
          marriagePlace: unionData.marriagePlace,
          livingArrangement: unionData.livingArrangement,
          notes: unionData.notes,
          marriagePattern: unionData.marriagePattern,
          culturalContext: unionData.culturalContext,
          validationOverrides: unionData.validationOverrides,
        },
        treeId
      );


      // 3. Check if reference person has existing children in single-parent unions
      const personUnions = getPersonUnions(
        spouseReferencePersonNeo4j.personId,
        treeData.unions,
        treeData.relationships
      )

      // Find single-parent unions: where other partner is either soft-deleted or never existed
      const singleParentUnions = personUnions.filter(union => {
        const partners = treeData.relationships
          .filter(r => r.type === 'PARTNER_IN' && r.toId === union.unionId)
          .map(r => treeData.persons.find(p => p.personId === r.fromId))
          .filter((p): p is Person => p !== undefined)

        const activeOtherPartners = partners.filter(
          p => p.personId !== spouseReferencePersonNeo4j.personId && !p.isDeleted
        )
        return activeOtherPartners.length === 0
      })

      for (const singleParentUnion of singleParentUnions) {
        // Find children of this single-parent union
        const childrenInUnion = treeData.relationships
          .filter(r => r.type === 'HAS_CHILD' && r.fromId === singleParentUnion.unionId)
          .map(r => treeData.persons.find(p => p.personId === r.toId))
          .filter((p): p is Person => p !== undefined && !p.isDeleted)

        if (childrenInUnion.length > 0) {
          // Found children in single-parent union, show prompt
          setMoveChildrenContext({
            referencePerson: spouseReferencePersonNeo4j,
            newSpouse,
            existingChildren: childrenInUnion,
            singleParentUnion,
            newMarriageUnion,
          })
          setShowMoveChildrenPrompt(true)

          // Close the AddSpouseModal so MoveChildrenPrompt is visible
          setShowAddSpouseNeo4j(false)
          return
        }
      }

      // 4. No children to move — apply optimistic update
      applyOptimisticUpdate((current) => ({
        ...current,
        persons: [...current.persons, newSpouse],
        unions: [...current.unions, newMarriageUnion],
        relationships: [
          ...current.relationships,
          { fromId: spouseReferencePersonNeo4j.personId, toId: newMarriageUnion.unionId, type: 'PARTNER_IN' },
          { fromId: newSpouse.personId, toId: newMarriageUnion.unionId, type: 'PARTNER_IN' },
        ],
      }), 'Spouse added');
    } catch (error) {
      console.error('Failed to add spouse:', error)
      throw error
    }
  }

  // Handler for marrying existing person
  const handleMarryExisting = async (spouseId: string, unionData: UnionFormData) => {
    if (!personToMarry || !treeData || !currentTreeId) {
      throw new Error('Missing required data for creating marriage')
    }

    try {
      // Create union between two existing people
      const newMarriageUnion = await neo4jAPI.createUnionBetweenExisting(
        currentTreeId,
        personToMarry.personId,
        spouseId,
        {
          type: unionData.type || 'marriage',
          startDate: unionData.startDate,
          marriagePlace: unionData.marriagePlace,
          ceremonyType: unionData.ceremonyType,
          livingArrangement: unionData.livingArrangement,
          notes: unionData.notes,
          marriagePattern: unionData.marriagePattern,
          culturalContext: unionData.culturalContext,
          precedingUnionId: unionData.precedingUnionId,
          validationOverrides: unionData.validationOverrides,
        }
      )

      // Check both persons for single-parent unions with children
      const personsToCheck = [
        { personId: personToMarry.personId, person: personToMarry, spouseId },
        { personId: spouseId, person: treeData.persons.find(p => p.personId === spouseId), spouseId: personToMarry.personId },
      ]

      for (const { personId, person, spouseId: otherPersonId } of personsToCheck) {
        if (!person) continue
        const personUnions = getPersonUnions(personId, treeData.unions, treeData.relationships)
        const singleParentUnions = personUnions.filter(union => {
          const partners = treeData.relationships
            .filter(r => r.type === 'PARTNER_IN' && r.toId === union.unionId)
            .map(r => treeData.persons.find(p => p.personId === r.fromId))
            .filter((p): p is Person => p !== undefined)

          const activeOtherPartners = partners.filter(
            p => p.personId !== personId && !p.isDeleted
          )
          return activeOtherPartners.length === 0
        })

        for (const singleParentUnion of singleParentUnions) {
          const childrenInUnion = treeData.relationships
            .filter(r => r.type === 'HAS_CHILD' && r.fromId === singleParentUnion.unionId)
            .map(r => treeData.persons.find(p => p.personId === r.toId))
            .filter((p): p is Person => p !== undefined && !p.isDeleted)

          if (childrenInUnion.length > 0) {
            const spousePerson = treeData.persons.find(p => p.personId === otherPersonId)
            if (person && spousePerson) {
              setMoveChildrenContext({
                referencePerson: person,
                newSpouse: spousePerson,
                existingChildren: childrenInUnion,
                singleParentUnion,
                newMarriageUnion,
              })
              setShowMoveChildrenPrompt(true)
              // Close MarryExistingPersonModal so prompt is visible
              setShowMarryExistingModal(false)
              return
            }
          }
        }
      }

      applyOptimisticUpdate((current) => ({
        ...current,
        unions: [...current.unions, newMarriageUnion],
        relationships: [
          ...current.relationships,
          { fromId: personToMarry.personId, toId: newMarriageUnion.unionId, type: 'PARTNER_IN' },
          { fromId: spouseId, toId: newMarriageUnion.unionId, type: 'PARTNER_IN' },
        ],
      }), 'Marriage created');
    } catch (error) {
      console.error('Failed to create marriage:', error)
      throw error
    }
  }

  // Handler for "marry existing person" from AddSpouseModal
  const handleAddSpouseMarryExisting = async (spouseId: string, unionData: UnionFormData) => {
    if (!spouseReferencePersonNeo4j || !treeData || !currentTreeId) {
      throw new Error('Missing required data for creating marriage')
    }

    try {
      const newMarriageUnion = await neo4jAPI.createUnionBetweenExisting(
        currentTreeId,
        spouseReferencePersonNeo4j.personId,
        spouseId,
        {
          type: unionData.type || 'marriage',
          startDate: unionData.startDate,
          marriagePlace: unionData.marriagePlace,
          ceremonyType: unionData.ceremonyType,
          livingArrangement: unionData.livingArrangement,
          notes: unionData.notes,
          marriagePattern: unionData.marriagePattern,
          culturalContext: unionData.culturalContext,
          precedingUnionId: unionData.precedingUnionId,
          validationOverrides: unionData.validationOverrides,
        }
      )

      // Check both persons for single-parent unions with children
      const personsToCheck = [
        { personId: spouseReferencePersonNeo4j.personId, person: spouseReferencePersonNeo4j, otherPersonId: spouseId },
        { personId: spouseId, person: treeData.persons.find(p => p.personId === spouseId), otherPersonId: spouseReferencePersonNeo4j.personId },
      ]

      for (const { personId, person, otherPersonId } of personsToCheck) {
        if (!person) continue
        const personUnions = getPersonUnions(personId, treeData.unions, treeData.relationships)
        const singleParentUnions = personUnions.filter(union => {
          const partners = treeData.relationships
            .filter(r => r.type === 'PARTNER_IN' && r.toId === union.unionId)
            .map(r => treeData.persons.find(p => p.personId === r.fromId))
            .filter((p): p is Person => p !== undefined)

          const activeOtherPartners = partners.filter(
            p => p.personId !== personId && !p.isDeleted
          )
          return activeOtherPartners.length === 0
        })

        for (const singleParentUnion of singleParentUnions) {
          const childrenInUnion = treeData.relationships
            .filter(r => r.type === 'HAS_CHILD' && r.fromId === singleParentUnion.unionId)
            .map(r => treeData.persons.find(p => p.personId === r.toId))
            .filter((p): p is Person => p !== undefined && !p.isDeleted)

          if (childrenInUnion.length > 0) {
            const spousePerson = treeData.persons.find(p => p.personId === otherPersonId)
            if (person && spousePerson) {
              setMoveChildrenContext({
                referencePerson: person,
                newSpouse: spousePerson,
                existingChildren: childrenInUnion,
                singleParentUnion,
                newMarriageUnion,
              })
              setShowMoveChildrenPrompt(true)
              // Close AddSpouseModal so prompt is visible
              setShowAddSpouseNeo4j(false)
              return
            }
          }
        }
      }

      applyOptimisticUpdate((current) => ({
        ...current,
        unions: [...current.unions, newMarriageUnion],
        relationships: [
          ...current.relationships,
          { fromId: spouseReferencePersonNeo4j.personId, toId: newMarriageUnion.unionId, type: 'PARTNER_IN' },
          { fromId: spouseId, toId: newMarriageUnion.unionId, type: 'PARTNER_IN' },
        ],
      }), 'Marriage created (via AddSpouse)');
    } catch (error) {
      console.error('Failed to create marriage:', error)
      throw error
    }
  }

  // Handler for move children prompt decision
  const handleMoveChildrenDecision = async (selectedChildIds: string[] | null) => {
    if (!moveChildrenContext) return

    setShowMoveChildrenPrompt(false)
    const ctx = moveChildrenContext
    setMoveChildrenContext(null)

    if (selectedChildIds && selectedChildIds.length > 0) {
      try {
        const { singleParentUnion, newMarriageUnion } = ctx
        const result = await neo4jAPI.moveChildrenToUnion(
          singleParentUnion.unionId,
          newMarriageUnion.unionId,
          selectedChildIds,
          currentTreeId || undefined
        )
        // Find movedCount safely
        const movedCount = (result && typeof result === 'object' && 'movedCount' in result)
          ? (result as any).movedCount
          : (result && typeof result === 'object' && 'data' in result && (result as any).data && typeof (result as any).data === 'object' && 'movedCount' in (result as any).data)
            ? (result as any).data.movedCount
            : selectedChildIds.length;

        console.log(`Moved ${movedCount} children to new marriage union`)
        toast({
          title: 'Success',
          description: `${movedCount} ${movedCount === 1 ? 'child' : 'children'} moved successfully.`,
        })
        triggerTreeReload('Children moved to new union')
      } catch (error) {
        console.error('Failed to move children:', error)
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to move children',
          variant: 'destructive',
        })
        triggerTreeReload('Mutation completed')
      }
    } else {
      // Skip selected or no children chosen: simply close the popup without making any API call.
      // But still reload the tree to show the newly created spouse
      triggerTreeReload('Spouse added')
    }
  }

  // Handler for GEDCOM import trigger from empty canvas
  const handleImportGedcomClick = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ged';
    input.onchange = async (e: any) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Reuse existing handleImportGedcom (which takes file and treeName)
        const treeName = userTrees.find(t => t.treeId === currentTreeId)?.treeName || 'Imported Tree';
        await handleImportGedcom(file, treeName);
      }
    };
    input.click();
  };

  const handleCreateRoot = () => {
    if (currentTreeId) {
      setWizardInitialTreeId(currentTreeId);
      const treeName = userTrees.find(t => t.treeId === currentTreeId)?.treeName;
      setWizardInitialTreeName(treeName);
    } else {
      setWizardInitialTreeId(undefined);
      setWizardInitialTreeName(undefined);
    }
    setShowCreateTreeWizard(true);
  };

  // Handler for adding sibling (Neo4j)
  const handleAddSiblingNeo4j = async (siblingData: SiblingFormData) => {
    if (!siblingReferencePersonNeo4j || !treeData) {
      throw new Error('Missing reference person or tree data')
    }

    try {
      const treeId = currentTreeId || 'tree-001' // Fallback for safety

      // Call API to add sibling
      const newSibling = await neo4jAPI.addSibling(
        treeId,
        siblingReferencePersonNeo4j.personId,
        {
          firstName: siblingData.firstName,
          lastName: siblingData.lastName,
          middleName: siblingData.middleName,
          maidenName: siblingData.maidenName,
          gender: siblingData.gender,
          birthDate: siblingData.birthDate,
          birthPlace: siblingData.birthPlace,
          isLiving: siblingData.isLiving,
          deathDate: siblingData.deathDate,
          deathPlace: siblingData.deathPlace,
          occupation: siblingData.occupation,
          education: siblingData.education,
          biography: siblingData.biography,
          isHomePerson: false,
          createdBy: userId,
          // Cultural metadata
          gotra: siblingData.gotra,
          caste: siblingData.caste,
          religion: siblingData.religion,
          nativePlace: siblingData.nativePlace,
          nativeLanguage: siblingData.nativeLanguage,
          elderStatus: siblingData.elderStatus,
        },
        siblingData.parentRelationship
      )

      // Optimistic: find ref person's parent union and add sibling + HAS_CHILD relationship
      const refPersonId = siblingReferencePersonNeo4j.personId;
      applyOptimisticUpdate((current) => {
        const parentChildRel = current.relationships.find(
          r => r.type === 'HAS_CHILD' && r.toId === refPersonId
        );
        if (!parentChildRel) return current; // No parent union — background reload will fix
        return {
          ...current,
          persons: [...current.persons, newSibling],
          relationships: [
            ...current.relationships,
            { fromId: parentChildRel.fromId, toId: newSibling.personId, type: 'HAS_CHILD' as const },
          ],
        };
      }, 'Sibling added');
    } catch (error) {
      console.error('Failed to add sibling:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add sibling',
        variant: 'destructive',
      })
      throw error
    }
  }

  // Helper: find parents of a person from treeData
  const getPersonParents = (personId: string): ParentOption[] => {
    if (!treeData) return []
    const parentUnionIds = treeData.relationships
      .filter(r => r.type === 'HAS_CHILD' && r.toId === personId)
      .map(r => r.fromId)
    const parents: ParentOption[] = []
    for (const unionId of parentUnionIds) {
      const partnerIds = treeData.relationships
        .filter(r => r.type === 'PARTNER_IN' && r.toId === unionId)
        .map(r => r.fromId)
      for (const partnerId of partnerIds) {
        const p = treeData.persons.find(x => x.personId === partnerId)
        if (p) {
          parents.push({ person: p, side: p.gender === 'male' ? 'father' : 'mother' })
        }
      }
    }
    return parents
  }

  // Helper: find uncles/aunts of a person (siblings of their parents)
  const getPersonUnclesAunts = (personId: string): Array<{ person: Person; side: 'paternal' | 'maternal' }> => {
    if (!treeData) return []
    const parents = getPersonParents(personId)
    const result: Array<{ person: Person; side: 'paternal' | 'maternal' }> = []
    const seen = new Set<string>()
    for (const { person: parent, side } of parents) {
      // Find grandparent unions (parent's parent unions)
      const gpUnionIds = treeData.relationships
        .filter(r => r.type === 'HAS_CHILD' && r.toId === parent.personId)
        .map(r => r.fromId)
      // Siblings of parent = other children of those unions
      const siblingIds = treeData.relationships
        .filter(r => r.type === 'HAS_CHILD' && gpUnionIds.includes(r.fromId) && r.toId !== parent.personId)
        .map(r => r.toId)
      for (const sibId of siblingIds) {
        if (!seen.has(sibId)) {
          seen.add(sibId)
          const sib = treeData.persons.find(x => x.personId === sibId)
          if (sib) {
            result.push({ person: sib, side: side === 'father' ? 'paternal' : 'maternal' })
          }
        }
      }
    }
    return result
  }

  // Handler for opening the AddRelativePanel via + button
  const handleOpenAddRelativePanel = useCallback((personId: string) => {
    const person = treeData?.persons.find(p => p.personId === personId)
    if (person) {
      setAddRelativePerson(person)
      openPanel('add-relative', { personId })
    }
  }, [treeData])

  // Handler for context menu actions
  const handlePersonContextAction = (personId: string, action: string) => {
    // View Profile action
    if (action === 'view-profile') {
      setProfilePersonId(personId)
      setShowPersonProfile(true)
      return
    }
    // Panel-based actions — routed through unified panel manager
    if (action === 'view-history') {
      const person = treeData?.persons.find(p => p.personId === personId)
      openPanel('history', { personId, personName: person ? `${person.firstName} ${person.lastName || ''}`.trim() : 'Unknown' })
      return
    }
    if (action === 'media-gallery') {
      const person = treeData?.persons.find(p => p.personId === personId)
      openPanel('media-gallery', { personId, personName: person ? `${person.firstName} ${person.lastName || ''}`.trim() : 'Unknown' })
      return
    }
    if (action === 'add-memory') {
      setMemoryContextPersonId(personId)
      setShowCreateMemoryModal(true)
      return
    }
    if (action === 'manage-tags') {
      const person = treeData?.persons.find(p => p.personId === personId)
      setManageTagsPersonId(personId)
      setManageTagsCurrentTags((person as unknown as { tags?: string[] })?.tags || [])
      setShowManageTagsModal(true)
      return
    }
    if (action === 'view-life-story') {
      openPanel('life-story', { personId })
      return
    }
    if (action === 'view-comments') {
      const person = treeData?.persons.find(p => p.personId === personId)
      openPanel('comments', { personId, personName: person ? `${person.firstName} ${person.lastName || ''}`.trim() : '' })
      return
    }
    // For Neo4j model, use treeData
    if (treeData) {
      const person = treeData.persons.find(p => p.personId === personId)
      if (!person) return

      const displayName = `${person.firstName} ${person.lastName || ''}`.trim()

      switch (action) {
        case 'add-parent-from-drawer': {
          // Check if there are deleted parent placeholders (isDeleted === true)
          const existingParents = getPersonParents(person.personId)
          const deletedParents = existingParents.filter(p => p.person.isDeleted)

          if (deletedParents.length > 0) {
            if (deletedParents.length === 1) {
              // Directly open the corresponding add/edit form for that parent
              handleGhostNodeAdd(deletedParents[0].person)
            } else {
              // Both father and mother placeholders exist
              // First display the Father / Mother selection dialog (same as the normal Add Parent flow)
              setGhostParentChooseChildId(person.personId)
              setRelationshipContext('parent')
              setMemberForAddRelative({ id: person.personId, name: displayName })
              setShowRelationshipSelector(true)
            }
            break
          }

          // Check existing parents before showing selector
          const hasFather = existingParents.some(p => p.side === 'father')
          const hasMother = existingParents.some(p => p.side === 'mother')

          if (hasFather && hasMother) {
            toast({
              title: 'Both parents exist',
              description: `${person.firstName} already has both parents. Use "Edit Details" to change parents.`,
            })
            break
          }

          if (hasFather && !hasMother) {
            // Only mother is missing — skip the selector, go directly to add mother
            setNeo4jRelativeContext({ person, relationship: 'mother' })
            setShowAddRelativeNeo4j(true)
            break
          }

          if (!hasFather && hasMother) {
            // Only father is missing — skip the selector, go directly to add father
            setNeo4jRelativeContext({ person, relationship: 'father' })
            setShowAddRelativeNeo4j(true)
            break
          }

          // No parents — show the Father/Mother selector
          setRelationshipContext('parent')
          setMemberForAddRelative({ id: person.personId, name: displayName })
          setShowRelationshipSelector(true)
          break
        }
        case 'add-parent': {
          // Check if there is any deleted parent placeholder (isDeleted === true)
          const existingParents = getPersonParents(person.personId)
          const deletedParent = existingParents.find(p => p.person.isDeleted)

          if (deletedParent) {
            handleGhostNodeAdd(deletedParent.person)
            break
          }

          // Check existing parents before showing selector
          const hasFather = existingParents.some(p => p.side === 'father')
          const hasMother = existingParents.some(p => p.side === 'mother')

          if (hasFather && hasMother) {
            toast({
              title: 'Both parents exist',
              description: `${person.firstName} already has both parents. Use "Edit Details" to change parents.`,
            })
            break
          }

          if (hasFather && !hasMother) {
            // Only mother is missing — skip the selector, go directly to add mother
            setNeo4jRelativeContext({ person, relationship: 'mother' })
            setShowAddRelativeNeo4j(true)
            break
          }

          if (!hasFather && hasMother) {
            // Only father is missing — skip the selector, go directly to add father
            setNeo4jRelativeContext({ person, relationship: 'father' })
            setShowAddRelativeNeo4j(true)
            break
          }

          // No parents — show the Father/Mother selector
          setRelationshipContext('parent')
          setMemberForAddRelative({ id: person.personId, name: displayName })
          setShowRelationshipSelector(true)
          break
        }
        case 'add-father': {
          const existingParents = getPersonParents(person.personId)
          const deletedFather = existingParents.find(p =>
            p.person.isDeleted &&
            (p.side === 'father' || p.person.gender === 'male' || p.person.gender !== 'female')
          )
          if (deletedFather) {
            handleGhostNodeAdd(deletedFather.person)
          } else {
            setNeo4jRelativeContext({ person, relationship: 'father' })
            setShowAddRelativeNeo4j(true)
          }
          break
        }
        case 'add-mother': {
          const existingParents = getPersonParents(person.personId)
          const deletedMother = existingParents.find(p =>
            p.person.isDeleted &&
            (p.side === 'mother' || p.person.gender === 'female' || p.person.gender !== 'male')
          )
          if (deletedMother) {
            handleGhostNodeAdd(deletedMother.person)
          } else {
            setNeo4jRelativeContext({ person, relationship: 'mother' })
            setShowAddRelativeNeo4j(true)
          }
          break
        }
        case 'add-spouse':
          // Check for existing spouses
          const existingSpouses = getPersonSpouses(
            person.personId,
            treeData.persons,
            treeData.unions,
            treeData.relationships
          )

          if (existingSpouses.length > 0) {
            // Person already has spouse(s), show prompt
            setMultipleMarriageContext({
              person,
              existingSpouses,
            })
            setShowMultipleMarriagePrompt(true)
          } else {
            // No existing spouse, proceed directly to Neo4j add spouse form
            setSpouseReferencePersonNeo4j(person)
            setShowAddSpouseNeo4j(true)
          }
          break
        case 'marry-existing':
          // Open MarryExistingPersonModal
          setPersonToMarry(person)
          setShowMarryExistingModal(true)
          break
        case 'add-child':
          // Check if person has multiple marriage unions (not parent-child unions)
          const personUnions = getPersonUnions(
            person.personId,
            treeData.unions,
            treeData.relationships
          )
          const marriageUnions = personUnions.filter(u => u.type === 'marriage' || u.type === 'partnership')

          if (marriageUnions.length > 1) {
            // Person has multiple marriages, need to select which one
            const unionsWithSpouses = marriageUnions.map(union => {
              // Find the other partner in this union
              const partnersInUnion = treeData.relationships
                .filter(r => r.type === 'PARTNER_IN' && r.toId === union.unionId)
                .map(r => r.fromId)
              const spouseId = partnersInUnion.find(id => id !== person.personId)
              const spouse = spouseId ? treeData.persons.find(p => p.personId === spouseId) || null : null

              return { union, spouse }
            })

            setSelectUnionContext({
              person,
              unions: unionsWithSpouses,
            })
            setShowSelectUnionModal(true)
          } else {
            // Single or no union, open Neo4j modal directly to add child (default to son)
            setNeo4jRelativeContext({
              person,
              relationship: 'son' // User can change gender in the form
            })
            setShowAddRelativeNeo4j(true)
          }
          break
        case 'add-sibling':
          setRelationshipContext('sibling')
          setMemberForAddRelative({ id: person.personId, name: displayName })
          setShowRelationshipSelector(true)
          break
        case 'add-grandparent': {
          const gpParents = getPersonParents(person.personId)
          if (gpParents.length === 0) {
            toast({ title: 'No parents found', description: `${person.firstName} has no parents in the tree. Add a parent first.` })
          } else if (gpParents.length === 1) {
            // Only one parent — go directly to add-parent modal for that parent
            setNeo4jRelativeContext({
              person: gpParents[0].person,
              relationship: gpParents[0].side === 'father' ? 'father' : 'mother',
            })
            setShowAddRelativeNeo4j(true)
          } else {
            setRelativeSidePickerContext({ mode: 'grandparent', originalPerson: person, parents: gpParents, unclesAunts: [] })
            setShowRelativeSidePicker(true)
          }
          break
        }
        case 'add-uncle-aunt': {
          const uaParents = getPersonParents(person.personId)
          if (uaParents.length === 0) {
            toast({ title: 'No parents found', description: `${person.firstName} has no parents in the tree. Add a parent first.` })
          } else if (uaParents.length === 1) {
            setSiblingReferencePersonNeo4j(uaParents[0].person)
            setShowAddSiblingModal(true)
          } else {
            setRelativeSidePickerContext({ mode: 'uncle-aunt', originalPerson: person, parents: uaParents, unclesAunts: [] })
            setShowRelativeSidePicker(true)
          }
          break
        }
        case 'add-cousin': {
          const cousinsUnclesAunts = getPersonUnclesAunts(person.personId)
          if (cousinsUnclesAunts.length === 0) {
            toast({ title: 'No uncles/aunts found', description: `No uncles or aunts found for ${person.firstName}. Add an uncle or aunt first.` })
          } else if (cousinsUnclesAunts.length === 1) {
            setNeo4jRelativeContext({ person: cousinsUnclesAunts[0].person, relationship: 'son' })
            setShowAddRelativeNeo4j(true)
          } else {
            setRelativeSidePickerContext({ mode: 'cousin', originalPerson: person, parents: [], unclesAunts: cousinsUnclesAunts })
            setShowRelativeSidePicker(true)
          }
          break
        }
        case 'quick-add':
          setQuickAddPerson(person)
          setShowQuickAddWizard(true)
          break
        case 'edit':
          // Open edit person modal
          setPersonToEdit(person)
          setShowEditPersonModal(true)
          break
        case 'delete':
          // Show confirmation dialog
          setPersonToDelete(person)
          setShowDeletePersonDialog(true)
          break
        case 'ghost-add':
          handleGhostNodeAdd(person)
          break
        case 'invite-to-claim':
          setInviteToClaimPerson(person)
          setShowInviteToClaimModal(true)
          break
      }
    }
  }

  // Handler for double-click on person card
  const handlePersonDoubleClick = (personId: string) => {
    if (!treeData) return
    // Open Person Profile page on double-click
    setProfilePersonId(personId)
    setShowPersonProfile(true)
  }

  // Handler for multiple marriage prompt decision
  const handleMultipleMarriageDecision = (
    decision: 'add-second' | 'replace' | 'cancel',
    replaceUnionId?: string
  ) => {
    if (decision === 'cancel') {
      setShowMultipleMarriagePrompt(false)
      setMultipleMarriageContext(null)
      return
    }

    if (!multipleMarriageContext) return

    const { person } = multipleMarriageContext
    if (decision === 'add-second') {
      // Proceed to add second spouse using Neo4j modal
      setShowMultipleMarriagePrompt(false)
      setSpouseReferencePersonNeo4j(person)
      setShowAddSpouseNeo4j(true)
      setMultipleMarriageContext(null)
    } else if (decision === 'replace' && replaceUnionId) {
      // TODO: Implement replace spouse logic
      // This would involve:
      // 1. Remove old spouse from union
      // 2. Open form to add new spouse to existing union
      console.log('Replace spouse in union:', replaceUnionId)
      setShowMultipleMarriagePrompt(false)
      setMultipleMarriageContext(null)
    }
  }

  // Handler for union selection (when adding child)
  const handleUnionSelect = (unionId: string) => {
    if (!selectUnionContext) return

    const { person } = selectUnionContext

    // Proceed to add child with selected union using Neo4j modal
    setShowSelectUnionModal(false)
    setNeo4jRelativeContext({
      person,
      relationship: 'son', // User can change gender in form
      selectedUnionId: unionId // Pass the selected union ID
    })
    setShowAddRelativeNeo4j(true)
    setSelectUnionContext(null)
  }

  // Handler for deleting a person
  const handleDeletePerson = async () => {
    if (!personToDelete || !treeData) return

    try {
      const deletedId = personToDelete.personId;
      await neo4jAPI.deletePerson(deletedId, currentTreeId ?? undefined)


      // Check if person has descendants or a spouse — ghost needed if either exists
      const children = getPersonChildren(
        deletedId, treeData.persons, treeData.unions, treeData.relationships
      )
      const spouses = getPersonSpouses(
        deletedId, treeData.persons, treeData.unions, treeData.relationships
      )
      const needsGhost = children.length > 0 || spouses.length > 0

      if (needsGhost) {
        // Ghost the node — wipe all personal data, preserve structure
        applyOptimisticUpdate((current) => ({
          ...current,
          persons: current.persons.map(p =>
            p.personId === deletedId
              ? {
                ...p,
                isDeleted: true,
                deletedAt: new Date().toISOString(),
                firstName: '',
                lastName: '',
                maidenName: null,
                middleName: null,
                birthDate: null,
                birthDateApprox: false,
                birthPlace: null,
                deathDate: null,
                deathPlace: null,
                biography: null,
                occupation: null,
                education: null,
                nationality: null,
                ethnicity: null,
                profilePhotoUrl: null,
                gotra: null,
                caste: null,
                religion: null,
                nativePlace: null,
                nativeLanguage: null,
                elderStatus: null,
                deletedBy: null,
                deletionReason: null,
              }
              : p
          ),
        }), 'Person deleted (ghosted)');
      } else {
        // Full remove — no descendants to preserve
        applyOptimisticUpdate((current) => {
          const personUnionIds = new Set(
            current.relationships
              .filter(r => r.type === 'PARTNER_IN' && r.fromId === deletedId)
              .map(r => r.toId)
          );
          const unionsToRemove = new Set<string>();
          for (const unionId of personUnionIds) {
            const otherPartners = current.relationships.filter(
              r => r.type === 'PARTNER_IN' && r.toId === unionId && r.fromId !== deletedId
            );
            if (otherPartners.length === 0) unionsToRemove.add(unionId);
          }
          return {
            ...current,
            persons: current.persons.filter(p => p.personId !== deletedId),
            unions: current.unions.filter(u => !unionsToRemove.has(u.unionId)),
            relationships: current.relationships.filter(r =>
              r.fromId !== deletedId && r.toId !== deletedId &&
              !unionsToRemove.has(r.fromId) && !unionsToRemove.has(r.toId)
            ),
          };
        }, 'Person deleted (removed)');
      }

      // On success, close the dialog and if we were in profile view, close that too
      setShowDeletePersonDialog(false)
      setPersonToDelete(null)
      if (showPersonProfile) {
        setShowPersonProfile(false)
        setProfilePersonId(null)
      }
    } catch (error) {
      console.error('Failed to delete person:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete person',
        variant: 'destructive',
      })
    }
  }

  // Handler for adding a new person in place of a ghost (deleted) node
  const handleGhostNodeAdd = async (ghostPerson: Person) => {
    if (!treeData) return

    try {
      // Determine relationship context for the ghost node
      const children = getPersonChildren(ghostPerson.personId, treeData.persons, treeData.unions, treeData.relationships)
      const spouses = getPersonSpouses(ghostPerson.personId, treeData.persons, treeData.unions, treeData.relationships)

      // If it is a backend-persisted parent placeholder (deleted in DB, has children, and not a frontend-injected ghost spouse)
      if (ghostPerson.isDeleted && children.length > 0 && !ghostPerson.personId.startsWith('ghost-spouse-')) {
        const rel = ghostPerson.gender === 'female' ? 'mother' : ghostPerson.gender === 'male' ? 'father' : 'parent';
        setNeo4jRelativeContext({
          person: children[0],
          relationship: rel,
          replaceGhostPersonId: ghostPerson.personId,
        })
        setShowAddRelativeNeo4j(true)
        return
      }

      // Build relationship hint for modal header context
      let relationshipHint = ''
      if (children.length > 0) {
        const childName = `${children[0].firstName || ''} ${children[0].lastName || ''}`.trim()
        if (childName) {
          relationshipHint = ghostPerson.gender === 'female'
            ? `Mother of ${childName}`
            : ghostPerson.gender === 'male'
              ? `Father of ${childName}`
              : `Parent of ${childName}`
          if (children.length > 1) relationshipHint += ` and ${children.length - 1} more`
        }
      } else if (spouses.length > 0) {
        const sp = spouses[0].spouse
        const spouseName = `${sp.firstName || ''} ${sp.lastName || ''}`.trim()
        if (spouseName) {
          relationshipHint = `Spouse of ${spouseName}`
        }
      }

      // If another ghost-add is in progress, clear it
      if (ghostToReplace) {
        setGhostToReplace(null)
      }

      // Store reference — activateGhostNode is deferred until user actually saves
      setGhostToReplace(ghostPerson)
      setPersonToEdit({
        ...ghostPerson,
        firstName: '',
        lastName: '',
        maidenName: null,
        middleName: null,
        birthDate: null,
        birthDateApprox: false,
        birthPlace: null,
        deathDate: null,
        deathPlace: null,
        biography: null,
        occupation: null,
        education: null,
        nationality: null,
        ethnicity: null,
        profilePhotoUrl: null,
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
      })
      setShowEditPersonModal(true)
    } catch (error) {
      console.error('Failed to add person in ghost slot:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add person',
        variant: 'destructive',
      })
    }
  }

  // Handler: user picked a parent side in RelativeSidePicker
  const handleRelativeSidePickerSelectParent = (parentOption: ParentOption) => {
    if (!relativeSidePickerContext) return
    const { mode } = relativeSidePickerContext

    if (mode === 'grandparent') {
      setNeo4jRelativeContext({
        person: parentOption.person,
        relationship: parentOption.side === 'father' ? 'father' : 'mother',
      })
      setShowAddRelativeNeo4j(true)
    } else if (mode === 'uncle-aunt') {
      setSiblingReferencePersonNeo4j(parentOption.person)
      setShowAddSiblingModal(true)
    }

    setRelativeSidePickerContext(null)
  }

  // Handler: user picked an uncle/aunt in RelativeSidePicker (cousin mode)
  const handleRelativeSidePickerSelectUncleAunt = (uncleAunt: Person) => {
    setNeo4jRelativeContext({ person: uncleAunt, relationship: 'son' })
    setShowAddRelativeNeo4j(true)
    setRelativeSidePickerContext(null)
  }

  const lazySuspense = <div className="p-4 text-center"><Loader2 className="w-6 h-6 mx-auto text-gray-400 animate-spin" /></div>

  // Auto-launch tutorials ONLY for first-time users (no trees yet).
  // Existing users who already have tree data skip the tutorial entirely.
  const tutorialStore = useTutorialStore()
  useEffect(() => {
    if (isFirstTimeUser && tutorialStore.shouldAutoLaunch('dashboard') && !tutorialStore.isActive) {
      const timer = setTimeout(() => tutorialStore.startTutorial('dashboard'), 1000)
      return () => clearTimeout(timer)
    }
    // Mark tutorials as complete for existing users so they never auto-launch
    if (treeData && !isFirstTimeUser) {
      if (tutorialStore.shouldAutoLaunch('dashboard')) {
        localStorage.setItem('dashboard-tutorial-completed', new Date().toISOString())
      }
      if (tutorialStore.shouldAutoLaunch('tree')) {
        localStorage.setItem('tree-tutorial-completed', new Date().toISOString())
      }
    }
  }, [treeData, isFirstTimeUser]) // eslint-disable-line react-hooks/exhaustive-deps

  // True only when the tree canvas is the active view (not Home, Daily Share, or Story Capture pages)
  const isTreeView = !!currentTreeId && !showDashboardHome && !showDailyShare && !showStoryCapture

  // Reset every top-level view + dismiss any open side panel.
  // Each sidebar nav handler calls this *before* opening its target so
  // navigating from one section to another (e.g., All People → Memories)
  // works regardless of what was previously visible.
  const resetMainViews = useCallback(() => {
    setShowDashboardHome(false)
    setShowDailyShare(false)
    setShowMemoriesPanel(false)
    setShowTemples(false)
    setShowFamily(false)
    setShowTreeOverview(false)
    setCultureSubView('hub')
    setFamilySubView('hub')
    setShowStoryCapture(false)
    closePanelStore()
  }, [closePanelStore])

  // PanelHost callbacks — stable references for the unified panel manager
  const panelHostCallbacks: PanelHostCallbacks = useMemo(() => ({
    onPersonContextAction: handlePersonContextAction,
    onSelectTree: handleTreeSwitch,
    onCreateTree: () => setShowCreateTreeWizard(true),
    onRenameTree: (treeId) => handleRenameTree(treeId),
    onDeleteTree: (treeId) => handleDeleteTree(treeId),
    onDuplicateTree: (treeId) => handleDuplicateTree(treeId),
    onSettingsTree: handleOpenTreeSettings,
    onExportGedcom: (treeId) => handleExportGedcom(treeId),
    onExportCsv: (treeId) => handleExportCsv(treeId),
    onImportGedcom: handleImportGedcom,
    onTreeReload: triggerTreeReload,
    onNavigateToPerson: (personId: string) => {
      setSelectedMemberId(personId)
      setSelectedFamilyId(personId)
    },
    onEditPerson: (personId: string) => handlePersonContextAction(personId, 'edit'),
    onSelectDuplicatePair: (pair: DuplicatePair) => {
      setSelectedDuplicatePair(pair)
      setShowMergeModal(true)
    },
    onEditApplied: () => {
      triggerTreeReload('Edit applied')
      if (currentTreeId) {
        pendingEditAPI.getPendingEditCount(currentTreeId).then(setPendingEditCount).catch(() => { })
      }
    },
    onOpenSettings: currentTreeId ? handleOpenTreeSettings : undefined,
    onTellStory: () => {
      closePanelStore()
      setShowStoryCapture(true)
    },
  }), [
    currentTreeId,
    treeData,
    selectedMemberId,
    closePanelStore,
    userTrees,
    handleRenameTree,
    handleDeleteTree,
    handleDuplicateTree,
    handleTreeSwitch,
    handleOpenTreeSettings,
    handleExportGedcom,
    handleExportCsv,
    handleImportGedcom,
    triggerTreeReload,
    handlePersonContextAction,
  ])

  // Context for the mobile drawer menu
  const drawerContext: 'dashboard' | 'tree-loaded' | 'tree-canvas' = isTreeView
    ? 'tree-canvas'
    : currentTreeId
      ? 'tree-loaded'
      : 'dashboard'

  return (
    <Suspense fallback={lazySuspense}>
      <div className="flex h-screen overflow-hidden" style={{ height: 'calc(var(--app-vh, 1vh) * 100)' }}>
        {/* Tutorial Overlay */}
        {/* <TutorialOverlay /> */}

        {/* Spotlight Search (Cmd+K / Ctrl+K) */}
        <SpotlightSearch
          open={showSpotlight}
          onClose={() => setShowSpotlight(false)}
          selectedPersonId={selectedMemberId}
          onAction={handleSpotlightAction}
          persons={treeData?.persons}
          onPersonSelect={(personId) => {
            setShowDashboardHome(false)
            setSelectedMemberId(personId)
            setSelectedFamilyId(personId)
            // Use canvas focusOnPerson for smooth scroll + glow effect
            setTimeout(() => canvasControlsRef.current?.focusOnPerson(personId), 100)
          }}
        />

        {/* Left Sidebar — hidden in WebView mode */}
        {!isWebView && (
          <Sidebar
            currentTreeName={userTrees.find(t => t.treeId === currentTreeId)?.treeName || 'Family Tree'}
            homePersonPhotoUrl={(() => {
              // For contributors on shared trees, use their claimed node's photo
              const claimedId = useContributorStore.getState().myClaimedPersonId
              if (claimedId && treeData) {
                const claimed = treeData.persons.find(p => p.personId === claimedId)
                if (claimed?.profilePhotoUrl) return resolveBackendUrl(claimed.profilePhotoUrl)
              }
              // Fallback: tree's home person photo, then user avatar
              const hp = treeData?.persons.find(p => p.isHomePerson)
              if (hp?.profilePhotoUrl) return resolveBackendUrl(hp.profilePhotoUrl)
              return user?.avatarUrl ? resolveBackendUrl(user.avatarUrl) : null
            })()}
            activeView={showDashboardHome ? 'home' : 'tree'}
            showDailyShare={showDailyShare}
            showMemories={showMemoriesPanel}
            showTemples={showTemples}
            showFamily={showFamily}
            showAllPeople={activePanelId === 'all-people'}
            showOverview={showTreeOverview}
            onGoHome={() => {
              resetMainViews()
              if (isFirstTimeUser) {
                setShowCreateTreeWizard(true)
              } else {
                setShowDashboardHome(true)
              }
            }}
            onGoTree={() => {
              resetMainViews()
              if (isFirstTimeUser) {
                setShowCreateTreeWizard(true)
              } else {
                setShowFamily(true)
              }
            }}
            onOpenTreeManager={() => { resetMainViews(); openPanel('tree-management') }}
            onOpenActivityFeed={currentTreeId ? () => { resetMainViews(); openPanel('activity') } : undefined}
            onOpenGridSettings={() => setShowGridSettingsModal(true)}
            onOpenBookmarks={() => { resetMainViews(); openPanel('bookmarks') }}
            onOpenAllPeople={currentTreeId ? () => { resetMainViews(); openPanel('all-people') } : undefined}
            onOpenOverview={currentTreeId ? () => { resetMainViews(); setShowTreeOverview(true) } : undefined}
            onOpenTemples={() => { resetMainViews(); setShowTemples(true); setCultureSubView('hub') }}
            /* Daily Share is now in the dashboard feed — no standalone page */
            onOpenMemories={currentTreeId ? () => {
              resetMainViews()
              setMemoriesPanelPersonId(null)
              setMemoriesPanelPersonName('')
              setPreserveSubView('hub')
              setShowMemoriesPanel(true)
            } : undefined}
            onOpenFeedback={() => setShowFeedbackModal(true)}
            isTreeLoaded={!!currentTreeId}
            onOpenMigrationMap={currentTreeId ? () => { resetMainViews(); openPanel('migration-map') } : undefined}
            onOpenHeritage={() => {
              navigate('/heritage')
            }}

            onOpenFestivals={() => {
              navigate('/heritage/festivals')
            }}

            onOpenSacred={() => {
              navigate('/heritage/sacred')
            }}
            // onOpenFestivals={currentTreeId ? () => {
            //   const base = window.location.pathname.startsWith('/FC-familytree') ? '/FC-familytree' : ''
            //   window.location.href = `${base}/heritage/festivals`
            // } : undefined}
            // onOpenSacred={currentTreeId ? () => {
            //   const base = window.location.pathname.startsWith('/FC-familytree') ? '/FC-familytree' : ''
            //   window.location.href = `${base}/heritage/sacred`
            // } : undefined}
            onOpenTimeline={currentTreeId ? () => { resetMainViews(); openPanel('timeline') } : undefined}
            onOpenStatistics={currentTreeId ? () => { resetMainViews(); openPanel('dna') } : undefined}
            onOpenRelationshipPath={currentTreeId ? () => setShowRelationshipPathModal(true) : undefined}
            onOpenSuggestions={currentTreeId ? () => { resetMainViews(); openPanel('suggestions') } : undefined}
            onOpenDuplicateDetection={currentTreeId ? () => { resetMainViews(); openPanel('duplicate-detection') } : undefined}
            onOpenDescendancyList={currentTreeId && selectedMemberId ? () => { resetMainViews(); openPanel('descendancy', { personId: selectedMemberId }) } : undefined}
            onOpenInviteCollaborator={currentTreeId ? () => setShowInviteModal(true) : undefined}
            onOpenSources={currentTreeId ? () => { resetMainViews(); openPanel('source') } : undefined}
            onOpenHelp={() => {
              const base = window.location.pathname.startsWith('/FC-familytree') ? '/FC-familytree' : ''
              window.location.href = `${base}/help`
            }}
            onOpenTodayOnTree={() => {
              const base = window.location.pathname.startsWith('/FC-familytree') ? '/FC-familytree' : ''
              window.location.href = `${base}/today`
            }}
            onOpenSettings={() => navigate('/settings?tab=account')}
          />
        )}

        {/* Main Content Area */}
        <div className="relative flex flex-col flex-1 overflow-hidden">
          {/* Mobile Top Bar — visible only on mobile */}
          {!isWebView && (
            <MobileTopBar
              treeName={userTrees.find(t => t.treeId === currentTreeId)?.treeName || 'Family Tree'}
              onSearchOpen={() => setShowSpotlight(true)}
              isCompact={!showDashboardHome}
              greeting={showDashboardHome ? `${(() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' })()}, ${user?.fullName?.split(' ')[0] || 'there'}` : undefined}
              subtitle={showDashboardHome ? (() => {
                try {
                  const d = new Date();
                  const weekday = d.toLocaleDateString(undefined, { weekday: 'long' });
                  const dd = String(d.getDate()).padStart(2, '0');
                  const mm = String(d.getMonth() + 1).padStart(2, '0');
                  const yy = String(d.getFullYear()).slice(-2);
                  return `${weekday}, ${dd}-${mm}-${yy}`;
                } catch {
                  return new Date().toLocaleDateString();
                }
              })() : undefined}
              avatarUrl={(() => {
                const claimedId = useContributorStore.getState().myClaimedPersonId
                if (claimedId && treeData) {
                  const claimed = treeData.persons.find(p => p.personId === claimedId)
                  if (claimed?.profilePhotoUrl) return resolveBackendUrl(claimed.profilePhotoUrl)
                }
                const hp = treeData?.persons.find(p => p.isHomePerson)
                if (hp?.profilePhotoUrl) return resolveBackendUrl(hp.profilePhotoUrl)
                return user?.avatarUrl ? resolveBackendUrl(user.avatarUrl) : null
              })()}
              userInitials={user?.fullName?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || ''}
              onAvatarPress={(() => { const hp = treeData?.persons.find(p => p.isHomePerson); if (!hp || !currentTreeId) return undefined; return () => { setProfilePersonId(hp.personId); setShowPersonProfile(true) } })()}
            />
          )}

          {/* Top Bar — hidden on mobile, hidden in WebView mode */}
          {!isWebView && (
            <div className="hidden md:block">
              <TopBar
                treeName={userTrees.find(t => t.treeId === currentTreeId)?.treeName || 'Family Tree'}
                onOpenSettings={currentTreeId ? handleOpenTreeSettings : undefined}
                pendingEditCount={pendingEditCount}
                onOpenPendingEdits={() => openPanel('pending-edits')}
                // View menu
                onZoomIn={currentTreeId ? () => canvasControlsRef.current?.zoomIn() : undefined}
                onZoomOut={currentTreeId ? () => canvasControlsRef.current?.zoomOut() : undefined}
                onResetView={currentTreeId ? () => canvasControlsRef.current?.resetView() : undefined}
                onDownload={currentTreeId ? () => canvasControlsRef.current?.download() : undefined}
                layoutMode={layoutMode}
                onLayoutModeChange={currentTreeId ? setLayoutMode : undefined}
                onOpenGridSettings={currentTreeId ? () => setShowGridSettingsModal(true) : undefined}
                // Paternal / maternal side filter
                // Blood relation mode & family stats
                bloodRelationMode={bloodRelationMode}
                onBloodRelationModeChange={setBloodRelationMode}
                persons={treeData?.persons}
                unions={treeData?.unions}
                relationships={treeData?.relationships as ExtendedRelationship[] | undefined}
                // Tools menu
                onOpenRelationshipPath={currentTreeId ? () => setShowRelationshipPathModal(true) : undefined}
                onOpenSuggestions={currentTreeId ? () => openPanel('suggestions') : undefined}
                onOpenDuplicateDetection={currentTreeId ? () => openPanel('duplicate-detection') : undefined}
                onOpenMigrationMap={currentTreeId ? () => openPanel('migration-map') : undefined}
                onOpenTimeline={currentTreeId ? () => openPanel('timeline') : undefined}
                onOpenSources={currentTreeId ? () => openPanel('source') : undefined}
                onOpenDescendancyList={currentTreeId && selectedMemberId ? () => {
                  openPanel('descendancy', { personId: selectedMemberId })
                } : undefined}
                onOpenInviteCollaborator={currentTreeId ? () => setShowInviteModal(true) : undefined}
                onOpenCollaboration={currentTreeId ? () => setShowInviteModal(true) : undefined}
                onOpenManageCollaborators={currentTreeId ? () => setShowInviteModal(true) : undefined}
                onOpenAllPeople={currentTreeId ? () => openPanel('all-people') : undefined}
                onOpenOverview={currentTreeId ? () => setShowTreeOverview(true) : undefined}
                onOpenActivityFeed={currentTreeId ? () => openPanel('activity') : undefined}
                onOpenBookmarks={() => openPanel('bookmarks')}
                onOpenMemories={currentTreeId ? () => {
                  setMemoriesPanelPersonId(null)
                  setMemoriesPanelPersonName('')
                  setShowMemoriesPanel(true)
                } : undefined}
                isTreeView={isTreeView}
                streakDays={streakDays}
                onOpenSpotlight={() => setShowSpotlight(true)}
                onOpenFeedPreferences={async () => {
                  try {
                    const { fetchFeedPreferences } = await import('@/services/dailyShareApiService')
                    const prefs = await fetchFeedPreferences()
                    setCurrentFeedPrefs({ langs: prefs.preferredLanguages, mode: prefs.languageMode })
                  } catch { /* use defaults */ }
                  setShowLanguagePrefModal(true)
                }}
                onOpenProfile={(() => {
                  const hp = treeData?.persons.find(p => p.isHomePerson)
                  if (!hp || !currentTreeId) return undefined
                  return () => { setProfilePersonId(hp.personId); setShowPersonProfile(true) }
                })()}
              />
            </div>
          )}

          {/* Canvas Area */}
          <div className="relative flex flex-col flex-1 min-h-0">
            {/* Floating search bar — WebView mode only (regular mobile uses FamilySearch inside canvas) */}
            {isWebView && (
              <WebViewSearchBar
                onSearch={() => setSearchFocusTrigger(prev => prev + 1)}
              />
            )}
            {/* Story Capture Experience for AI-powered tree building */}
            {showStoryCapture && (
              <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>}>
                <StoryCaptureExperience
                  userId={user?.id || ''}
                  onComplete={(treeId) => {
                    setShowStoryCapture(false)
                    handleTreeCreated(treeId)
                  }}
                  onFallbackToWizard={() => {
                    setShowStoryCapture(false)
                    setShowCreateTreeWizard(true)
                  }}
                  onBack={() => {
                    setShowStoryCapture(false)
                    if (userTrees && userTrees.length > 0) {
                      setShowWelcomePath(false)
                    } else {
                      setShowWelcomePath(true)
                    }
                  }}
                />
              </Suspense>
            )}
            {showStoryCapture ? null : !showStoryCapture && showDashboardHome && (isFirstTimeUser || (currentTreeId && treeData)) ? (
              <DashboardHomePage
                treeId={currentTreeId || ''}
                treeName={userTrees.find(t => t.treeId === currentTreeId)?.treeName || 'My Family Tree'}
                persons={treeData?.persons || []}
                unions={treeData?.unions || []}
                relationships={treeData?.relationships || []}
                currentUserId={userId}
                currentUserName={user?.fullName || 'User'}
                currentUserAvatar={(() => {
                  // Use claimed node's photo for contributors, else user avatar
                  const claimedId = useContributorStore.getState().myClaimedPersonId
                  if (claimedId && treeData) {
                    const claimed = treeData.persons.find(p => p.personId === claimedId)
                    if (claimed?.profilePhotoUrl) return claimed.profilePhotoUrl
                  }
                  return user?.avatarUrl ?? null
                })()}
                onNavigateToTree={() => {
                  if (isFirstTimeUser) {
                    setShowCreateTreeWizard(true)
                  } else {
                    setShowDashboardHome(false)
                  }
                }}
                isWizardActive={showWelcomePath || showConversationalWizard || showCreateTreeWizard || showStoryCapture}
                onStartStoryCapture={isFirstTimeUser ? () => setShowStoryCapture(true) : undefined}
                onOpenProfile={(personId) => {
                  setSelectedMemberId(personId)
                  setShowDashboardHome(false)
                  if (currentTreeId) {
                    const p = treeData?.persons.find(x => x.personId === personId)
                    recordSessionView({
                      kind: 'profile',
                      treeId: currentTreeId,
                      personId,
                      personName: p ? `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() : undefined,
                    })
                  }
                }}
                onOpenMemories={() => {
                  setMemoriesPanelPersonId(null)
                  setMemoriesPanelPersonName('')
                  setShowMemoriesPanel(true)
                }}
                onOpenActivityFeed={() => openPanel('activity')}
                onOpenMigrationMap={() => { setShowDashboardHome(false); setTimeout(() => openPanel('migration-map'), 100) }}
                onInviteFamily={() => setShowInviteModal(true)}
                onOpenAllPeople={currentTreeId ? (filter) => {
                  setAllPeopleFilter(filter || {})
                  openPanel('all-people', { initialFilter: filter || {} })
                } : undefined}
                treeStatistics={treeData?.persons ? (() => {
                  const persons = treeData.persons
                  function topN(getter: (p: (typeof persons)[0]) => string | null | undefined, n: number) {
                    const counts = new Map<string, number>()
                    for (const p of persons) { const v = getter(p); if (v) counts.set(v, (counts.get(v) || 0) + 1) }
                    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, c]) => ({ gotra: k, place: k, count: c }))
                  }
                  const gotras = topN(p => p.gotra, 3)
                  const places = topN(p => p.birthPlace, 3)
                  return {
                    topGotras: gotras.map(g => ({ gotra: g.gotra, count: g.count })),
                    topBirthPlaces: places.map(p => ({ place: p.place, count: p.count })),
                  }
                })() : undefined}
                kulaDevataName={heritageKulaDevataName}
                templeMemoryCount={heritageTempleMemoryCount}
                onOpenTemples={() => { setShowTemples(true); setCultureSubView('hub'); setShowDashboardHome(false) }}
                onOpenDailyShare={() => { /* Feed is on dashboard — scroll to top */ setShowDashboardHome(true) }}
              />
            ) : currentTreeId ? (
              layoutMode === 'ancestry-pedigree' ? (
                <AncestryPedigreeCanvas
                  key={`ancestry-${treeKey}`}
                  treeId={currentTreeId}
                  reloadTrigger={treeReloadKey}
                  focusPersonId={undefined}
                  onPersonClick={(personId) => {
                    setSelectedMemberId(personId)
                  }}
                  onPersonContextAction={handlePersonContextAction}
                  onTreeDataLoaded={handleTreeDataLoaded}
                  treeName={userTrees.find(t => t.treeId === currentTreeId)?.treeName}
                  onOpenAddRelativePanel={handleOpenAddRelativePanel}
                  onImportGedcom={handleImportGedcomClick}
                  onCreateRoot={handleCreateRoot}
                />

              ) : (
                <UnionBasedTreeCanvas
                  key={treeKey}
                  treeId={currentTreeId}
                  reloadTrigger={treeReloadKey}
                  focusPersonId={selectedFamilyId || undefined}
                  familyComponent={selectedFamilyId ? componentMap[selectedFamilyId] : undefined}
                  onPersonClick={(personId) => {
                    setSelectedMemberId(personId)
                    if (currentTreeId) {
                      const p = treeData?.persons.find(x => x.personId === personId)
                      recordSessionView({
                        kind: 'tree',
                        treeId: currentTreeId,
                        personId,
                        personName: p ? `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() : undefined,
                      })
                    }
                  }}
                  onPersonDoubleClick={handlePersonDoubleClick}
                  onPersonContextAction={handlePersonContextAction}
                  onTreeDataLoaded={handleTreeDataLoaded}
                  onNavigateToTree={handleNavigateToTree}
                  onOpenAddRelativePanel={handleOpenAddRelativePanel}
                  onInviteFamily={currentTreeId ? () => setShowInviteModal(true) : undefined}
                  onViewMemories={(personId, personName) => {
                    setMemoriesPanelPersonId(personId)
                    setMemoriesPanelPersonName(personName)
                    setShowMemoriesPanel(true)
                  }}
                  memoryCounts={memoryCounts}
                  searchFocusTrigger={searchFocusTrigger}
                  resetViewTrigger={resetViewTrigger}
                  bloodRelationMode={bloodRelationMode}
                  onBloodRelationModeChange={setBloodRelationMode}
                  onCanvasControlsReady={(controls) => { canvasControlsRef.current = controls }}
                  showGridSettingsModal={showGridSettingsModal}
                  onCloseGridSettingsModal={() => setShowGridSettingsModal(false)}
                  treeName={userTrees.find(t => t.treeId === currentTreeId)?.treeName}
                  lastKnownMemberCount={treeData?.persons.filter(p => p.firstName && p.firstName.trim() !== '' && !p.isProxy && !p.personId.includes('_proxy_')).length}
                  onImportGedcom={handleImportGedcomClick}
                  onCreateRoot={handleCreateRoot}
                />
              )
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            )}
          </div>

          {/* Daily Share is now integrated into the Dashboard Home feed */}

          {/* Phase 8: Preserve My Family — Hub or Memories Page */}
          {showMemoriesPanel && currentTreeId && (
            <>
              {preserveSubView === 'hub' && !memoriesPanelPersonId && (
                <Suspense fallback={<div className="absolute inset-0 z-40 bg-[#F2EFE9] dark:bg-[#000] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#C2A46D]" /></div>}>
                  <PreserveMyFamilyHub
                    onClose={() => { setShowMemoriesPanel(false); setPreserveSubView('hub'); }}
                    onOpenGallery={() => setPreserveSubView('gallery')}
                    onOpenStories={() => setPreserveSubView('stories')}
                    onOpenAlbums={() => setPreserveSubView('albums')}
                    onOpenInterviews={() => setPreserveSubView('interviews')}
                    onOpenSlideshow={() => setPreserveSubView('slideshow')}
                    onOpenMemoryBook={() => setPreserveSubView('memorybook')}
                    onAddMemory={() => {
                      console.log('Triggering onAddMemory from Hub');
                      setMemoryContextPersonId(null);
                      setShowCreateMemoryModal(true);
                    }}
                    treeId={currentTreeId || undefined}
                    isTreeLoaded={!!currentTreeId}
                    memoryCounts={memoryCounts}
                    albumCount={memoryCounts?.albums || 0}
                    storyCount={memoryCounts?.stories || 0}
                  />
                </Suspense>
              )}
              {(preserveSubView !== 'hub' || memoriesPanelPersonId) && (
                <MemoriesPage
                  key={preserveSubView}
                  treeId={currentTreeId || ''}
                  personId={memoriesPanelPersonId}
                  personName={memoriesPanelPersonName}
                  persons={(treeData?.persons || []).map(p => ({ personId: p.personId, firstName: p.firstName, lastName: p.lastName, profilePhotoUrl: p.photoThumbUrl || p.profilePhotoUrl }))}
                  currentUserId={userId}
                  currentUserName={user?.fullName || 'User'}
                  onClose={() => {
                    if (memoriesPanelPersonId) {
                      setShowMemoriesPanel(false); setMemoriesPanelPersonId(null);
                    } else {
                      setPreserveSubView('hub');
                    }
                  }}
                  initialViewMode={
                    preserveSubView === 'stories' ? 'stories'
                      : preserveSubView === 'albums' ? 'albums'
                        : preserveSubView === 'interviews' ? 'interviews'
                          : undefined
                  }
                  initialShowSlideshow={preserveSubView === 'slideshow'}
                  initialShowMemoryBook={preserveSubView === 'memorybook'}
                />
              )}
            </>
          )}

          {/* Your Identity — Hub, Sacred Institutions, Cosmic Predictions, or Ancestral Identity */}
          {showTemples && (
            <Suspense fallback={<div className="absolute inset-0 z-40 bg-[#F9FAFB] dark:bg-[#1E1E1E] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#2F3E8F]" /></div>}>
              {cultureSubView === 'hub' && (
                <CelebrateCultureHub
                  onClose={() => { setShowTemples(false); setCultureSubView('hub') }}
                  onOpenPredictions={() => setCultureSubView('predictions')}
                  onOpenAncestralIdentity={() => setCultureSubView('ancestral')}
                  treeId={currentTreeId || undefined}
                />
              )}
              {cultureSubView === 'institutions' && (
                <InstitutionsHomePage
                  persons={treeData?.persons}
                  unions={treeData?.unions}
                  treeId={currentTreeId || undefined}
                  onClose={() => setCultureSubView('hub')}
                />
              )}
              {cultureSubView === 'predictions' && (
                <PredictionsPage
                  onBack={() => setCultureSubView('hub')}
                  treeId={currentTreeId || undefined}
                  persons={treeData?.persons}
                  startNew={window.location.hash.replace('#', '') === 'culture/predictions/new'}
                />
              )}
              {cultureSubView === 'ancestral' && (
                <AncestralIdentityPage
                  onBack={() => setCultureSubView('hub')}
                  treeId={currentTreeId || undefined}
                  persons={treeData?.persons}
                />
              )}
            </Suspense>
          )}

          {/* Family Hub — Hub, Migration Map, Pathfinder, Suggestions, Duplicates */}
          {showFamily && familySubView !== 'trees' && (
            <Suspense fallback={<div className="absolute inset-0 z-40 bg-[#F6F2EA] dark:bg-[#141414] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#2F3E8F]" /></div>}>
              {familySubView === 'hub' && (
                <FamilyHub
                  onClose={() => { setShowFamily(false); setFamilySubView('hub'); setShowDashboardHome(true) }}
                  onOpenTrees={() => { setShowFamily(false); setFamilySubView('hub'); setShowDashboardHome(false); setShowStoryCapture(false); }}
                  onOpenMigration={() => setFamilySubView('migration')}
                  onOpenPathfinder={() => setFamilySubView('pathfinder')}
                  onOpenSuggestions={() => setFamilySubView('suggestions')}
                  onOpenDuplicates={() => setFamilySubView('duplicates')}
                  treeId={currentTreeId || undefined}
                  isTreeLoaded={!!currentTreeId}
                  treeName={userTrees.find(t => t.treeId === currentTreeId)?.treeName}
                  persons={treeData?.persons}
                  memberCount={treeData?.persons.filter(p => p.firstName && p.firstName.trim() !== '' && !p.isProxy && !p.personId.includes('_proxy_')).length}
                />
              )}
              {familySubView === 'migration' && currentTreeId && (
                <MigrationMapPanel
                  treeId={currentTreeId}
                  isOpen={true}
                  onClose={() => setFamilySubView('hub')}
                  variant="fullpage"
                />
              )}
              {familySubView === 'pathfinder' && currentTreeId && treeData && (
                <RelationshipPathPage
                  persons={treeData.persons}
                  unions={treeData.unions}
                  relationships={treeData.relationships}
                  treeId={currentTreeId}
                  onBack={() => setFamilySubView('hub')}
                  onPathFound={(_ids) => {
                    // Path found — could highlight on canvas in the future
                  }}
                />
              )}
              {familySubView === 'suggestions' && currentTreeId && (() => {
                const defaultTreeId = localStorage.getItem('defaultTreeId') || userTrees[0]?.treeId || currentTreeId;
                const defaultTreeName = userTrees.find(t => t.treeId === defaultTreeId)?.treeName || 'Family Tree';
                return (
                  <SuggestionsPanel
                    treeId={defaultTreeId}
                    treeName={defaultTreeName}
                    isOpen={true}
                    onClose={() => setFamilySubView('hub')}
                    variant="fullpage"
                  />
                );
              })()}
              {familySubView === 'duplicates' && currentTreeId && (
                <DuplicateDetectionPanel
                  treeId={currentTreeId}
                  isOpen={true}
                  onClose={() => setFamilySubView('hub')}
                  onSelectPair={(pair) => {
                    setSelectedDuplicatePair(pair)
                    setShowMergeModal(true)
                  }}
                  variant="fullpage"
                />
              )}
            </Suspense>
          )}
        </div>

        {/* Mobile Drawer — context-aware menu */}
        <MobileDrawer open={showMobileDrawer} onClose={() => setShowMobileDrawer(false)}>
          <MobileDrawerContent
            context={drawerContext}
            treeName={userTrees.find(t => t.treeId === currentTreeId)?.treeName}
            layoutMode={layoutMode}
            onLayoutModeChange={(mode) => { setLayoutMode(mode); setShowDashboardHome(false) }}
            bloodRelationMode={bloodRelationMode}
            onBloodRelationModeChange={setBloodRelationMode}
            onOpenGridSettings={() => setShowGridSettingsModal(true)}
            onDownloadImage={() => canvasControlsRef.current?.download()}
            onPrint={() => window.print()}
            onExportPDF={() => canvasControlsRef.current?.download()}
            onOpenRelationshipPath={() => setShowRelationshipPathModal(true)}
            onOpenSuggestions={() => openPanel('suggestions')}
            onOpenDuplicates={() => openPanel('duplicate-detection')}
            onOpenMigrationMap={() => openPanel('migration-map')}
            onOpenTimeline={() => openPanel('timeline')}
            onOpenDescendancyList={selectedMemberId ? () => openPanel('descendancy', { personId: selectedMemberId }) : undefined}
            hasPersonSelected={!!selectedMemberId}
            onOpenStatistics={() => openPanel('dna')}
            onOpenAllPeople={() => openPanel('all-people')}
            onOpenTreeOverview={() => setShowTreeOverview(true)}
            onOpenMemories={() => { setMemoriesPanelPersonId(null); setMemoriesPanelPersonName(''); setShowMemoriesPanel(true) }}
            onOpenDailyShare={currentTreeId ? () => { setShowDashboardHome(true) } : undefined}
            onOpenInvite={() => setShowInviteModal(true)}
            onOpenSources={() => openPanel('source')}
            onOpenActivityFeed={() => openPanel('activity')}
            onOpenBookmarks={() => openPanel('bookmarks')}
            onOpenTreeManager={() => openPanel('tree-management')}
            onOpenTemples={() => { setShowTemples(true); setCultureSubView('hub') }}
            onOpenFamily={() => { setShowFamily(true); setFamilySubView('hub'); setShowDashboardHome(false) }}
            onOpenProfile={() => openPanel('profile')}
            onOpenTreeSettings={currentTreeId ? handleOpenTreeSettings : undefined}
            onOpenSettings={() => navigate('/settings?tab=account')}
            pendingEditCount={pendingEditCount}
            onOpenPendingEdits={() => openPanel('pending-edits')}
            onOpenFeedback={() => setShowFeedbackModal(true)}
            onClose={() => setShowMobileDrawer(false)}
          />
        </MobileDrawer>

        {/* Mobile Bottom Navigation — hidden on md+ */}
        {!isWebView && (
          <BottomNav
            activeTab={bottomNavActiveTab}
            onGoHome={() => {
              if (isFirstTimeUser) {
                setShowCreateTreeWizard(true)
              } else {
                setBottomNavActiveTab('home')
                setShowDashboardHome(true)
              }
            }}
            onFocusCanvas={() => {
              if (isFirstTimeUser) {
                setShowCreateTreeWizard(true)
              } else {
                setBottomNavActiveTab('canvas')
                setShowDashboardHome(false)
                setShowFamily(true)
                setFamilySubView('hub')
              }
            }}
            onOpenMemories={currentTreeId ? () => {
              setBottomNavActiveTab('memories')
              setMemoriesPanelPersonId(null)
              setMemoriesPanelPersonName('')
              setShowMemoriesPanel(true)
            } : undefined}
            onOpenDiscover={currentTreeId ? () => {
              setBottomNavActiveTab('discover')
              setShowDiscover(true)
            } : undefined}
            onOpenDrawer={() => setShowMobileDrawer(true)}
            selectedPersonId={selectedMemberId}
            onAddParent={() => selectedMemberId && handlePersonContextAction(selectedMemberId, 'add-parent')}
            onAddSpouse={() => selectedMemberId && handlePersonContextAction(selectedMemberId, 'add-spouse')}
            onAddChild={() => selectedMemberId && handlePersonContextAction(selectedMemberId, 'add-child')}
            onAddSibling={() => selectedMemberId && handlePersonContextAction(selectedMemberId, 'add-sibling')}
            onAddMemory={currentTreeId ? () => setShowCreateMemoryModal(true) : undefined}
            onNavigateToTree={() => {
              if (isFirstTimeUser) {
                setShowCreateTreeWizard(true)
              } else {
                setShowDashboardHome(false)
                setBottomNavActiveTab('canvas')
              }
            }}
          />
        )}

        {/* Relationship Selection Panel */}
        {showRelationshipSelector && memberForAddRelative && relationshipContext && (
          <RelationshipSelectionPanel
            memberName={memberForAddRelative.name}
            context={relationshipContext}
            onClose={() => {
              setShowRelationshipSelector(false)
              setRelationshipContext(null)
            }}
            onSelectRelationship={handleSelectRelationship}
          />
        )}

        {/* Add Relative Modal (Neo4j) */}
        {showAddRelativeNeo4j && neo4jRelativeContext && treeData && (
          <AddRelativeModalNeo4j
            open={showAddRelativeNeo4j}
            onClose={() => {
              setShowAddRelativeNeo4j(false)
              setNeo4jRelativeContext(null)
              setMemberForAddRelative(null)
              setSelectedRelationship(null)
            }}
            treeId={currentTreeId || ''}
            referencePerson={neo4jRelativeContext.person}
            relationship={neo4jRelativeContext.relationship}
            selectedUnionId={neo4jRelativeContext.selectedUnionId}
            replaceGhostPersonId={neo4jRelativeContext.replaceGhostPersonId}
            treeData={treeData}
            onSuccess={() => {
              triggerTreeReload('Mutation completed')
            }}
          />
        )}

        {/* Add Spouse Modal (Neo4j) */}
        {showAddSpouseNeo4j && spouseReferencePersonNeo4j && treeData && (
          <AddSpouseModal
            open={showAddSpouseNeo4j}
            onClose={() => {
              setShowAddSpouseNeo4j(false)
              setSpouseReferencePersonNeo4j(null)
              setMemberForAddRelative(null)
              setSelectedRelationship(null)
            }}
            referencePerson={spouseReferencePersonNeo4j}
            allPersons={treeData.persons}
            unions={treeData.unions}
            relationships={treeData.relationships}
            onSubmit={handleAddSpouseNeo4j}
            onMarryExisting={handleAddSpouseMarryExisting}
            treeId={currentTreeId || undefined}
            userTrees={userTrees}
          />
        )}

        {/* Marry Existing Person Modal */}
        {showMarryExistingModal && personToMarry && treeData && currentTreeId && (
          <MarryExistingPersonModal
            open={showMarryExistingModal}
            onClose={() => {
              setShowMarryExistingModal(false)
              setPersonToMarry(null)
            }}
            referencePerson={personToMarry}
            allPersons={treeData.persons}
            unions={treeData.unions}
            relationships={treeData.relationships}
            onSubmit={handleMarryExisting}
            treeId={currentTreeId}
          />
        )}

        {/* Add Sibling Modal (Neo4j) */}
        {showAddSiblingModal && siblingReferencePersonNeo4j && (
          <AddSiblingModal
            open={showAddSiblingModal}
            onClose={() => {
              setShowAddSiblingModal(false)
              setSiblingReferencePersonNeo4j(null)
              setMemberForAddRelative(null)
              setSelectedRelationship(null)
              setRelationshipContext(null)
            }}
            referencePerson={siblingReferencePersonNeo4j}
            defaultGender={selectedRelationship === 'sister' ? 'female' : 'male'}
            onSubmit={handleAddSiblingNeo4j}
          />
        )}

        {/* Relative Side Picker (grandparent / uncle-aunt / cousin) */}
        {relativeSidePickerContext && (
          <RelativeSidePicker
            open={showRelativeSidePicker}
            onClose={() => {
              setShowRelativeSidePicker(false)
              setRelativeSidePickerContext(null)
            }}
            mode={relativeSidePickerContext.mode}
            originalPerson={relativeSidePickerContext.originalPerson}
            parents={relativeSidePickerContext.parents}
            unclesAunts={relativeSidePickerContext.unclesAunts}
            onSelectParent={handleRelativeSidePickerSelectParent}
            onSelectUncleAunt={handleRelativeSidePickerSelectUncleAunt}
          />
        )}

        {/* Multiple Marriage Prompt */}
        {multipleMarriageContext && (
          <MultipleMarriagePrompt
            open={showMultipleMarriagePrompt}
            onClose={() => {
              setShowMultipleMarriagePrompt(false)
              setMultipleMarriageContext(null)
            }}
            referencePerson={multipleMarriageContext.person}
            existingSpouses={multipleMarriageContext.existingSpouses}
            onDecision={handleMultipleMarriageDecision}
          />
        )}

        {/* Select Union Modal (for adding child to person with multiple marriages) */}
        {selectUnionContext && treeData && (
          <SelectUnionModal
            open={showSelectUnionModal}
            onClose={() => {
              setShowSelectUnionModal(false)
              setSelectUnionContext(null)
            }}
            referencePerson={selectUnionContext.person}
            unions={selectUnionContext.unions}
            allPersons={treeData.persons}
            relationships={treeData.relationships}
            onSelect={handleUnionSelect}
          />
        )}

        {/* Move Children Prompt */}
        {moveChildrenContext && (
          <MoveChildrenPrompt
            isOpen={showMoveChildrenPrompt}
            onClose={() => handleMoveChildrenDecision(null)}
            onConfirm={(selectedChildIds) => handleMoveChildrenDecision(selectedChildIds)}
            referencePerson={moveChildrenContext.referencePerson}
            newSpouse={moveChildrenContext.newSpouse}
            existingChildren={moveChildrenContext.existingChildren}
            singleParentUnion={moveChildrenContext.singleParentUnion}
          />
        )}

        {/* Delete Person Confirmation Dialog */}
        {showDeletePersonDialog && personToDelete && (
          <DeletePersonConfirmDialog
            open={showDeletePersonDialog}
            onClose={() => {
              setShowDeletePersonDialog(false)
              setPersonToDelete(null)
            }}
            onConfirm={handleDeletePerson}
            person={personToDelete}
          />
        )}

        {/* Edit Person Modal */}
        {showEditPersonModal && personToEdit && (
          <EditPersonModal
            open={showEditPersonModal}
            onClose={() => {
              const wasGhostAdd = !!ghostToReplace
              if (ghostToReplace) {
                // No rollback needed — activateGhostNode was deferred until save
                setGhostToReplace(null)
              }
              setShowEditPersonModal(false)
              setPersonToEdit(null)
              // Re-render tree to fix canvas viewport after panel close
              if (wasGhostAdd) {
                triggerTreeReload('Ghost add cancelled')
              }
            }}
            person={personToEdit}
            treeId={currentTreeId ?? undefined}
            treePersons={treeData?.persons.filter(p => !p.isDeleted)}
            onSuccess={async () => {
              if (ghostToReplace) {
                // Activate the ghost node (flip isDeleted=false) since user committed the edit
                try {
                  await neo4jAPI.activateGhostNode(ghostToReplace.personId, currentTreeId ?? undefined)
                } catch (err) {
                  console.error('Failed to activate ghost after save:', err)
                }
                setGhostToReplace(null)
              }
              triggerTreeReload('Mutation completed')
            }}
          />
        )}

        {/* Invite to Claim Modal */}
        {showInviteToClaimModal && inviteToClaimPerson && currentTreeId && (
          <Suspense fallback={null}>
            <InviteToClaimModal
              open={showInviteToClaimModal}
              onClose={() => { setShowInviteToClaimModal(false); setInviteToClaimPerson(null) }}
              treeId={currentTreeId}
              person={inviteToClaimPerson}
            />
          </Suspense>
        )}

        {/* Draft CR Banner + Review Sheet — for contributors with pending draft changes */}
        <Suspense fallback={null}>
          <DraftCRBanner onOpenReview={() => setShowDraftReview(true)} />
        </Suspense>
        {showDraftReview && (
          <Suspense fallback={null}>
            <DraftReviewSheet open={showDraftReview} onClose={() => setShowDraftReview(false)} />
          </Suspense>
        )}

        {/* Quick Add Wizard */}
        {showQuickAddWizard && quickAddPerson && currentTreeId && treeData && (
          <QuickAddWizard
            open={showQuickAddWizard}
            onClose={() => {
              setShowQuickAddWizard(false)
              setQuickAddPerson(null)
            }}
            person={quickAddPerson}
            treeId={currentTreeId}
            existingData={{
              hasParents: treeData.relationships.some(
                r => r.type === 'HAS_CHILD' && r.toId === quickAddPerson.personId
              ),
              hasSpouse: treeData.unions.some(u =>
                u.type === 'marriage' &&
                treeData.relationships.some(
                  r => r.type === 'PARTNER_IN' && r.fromId === quickAddPerson.personId && r.toId === u.unionId
                )
              ),
              spouseUnionId: treeData.unions.find(u =>
                (u.type === 'marriage' || u.type === 'partnership') &&
                treeData.relationships.some(
                  r => r.type === 'PARTNER_IN' && r.fromId === quickAddPerson.personId && r.toId === u.unionId
                )
              )?.unionId,
            }}
            spouses={(() => {
              // Find all unions where this person is a partner
              const personUnions = treeData.unions.filter(u =>
                (u.type === 'marriage' || u.type === 'partnership') &&
                treeData.relationships.some(
                  r => r.type === 'PARTNER_IN' && r.fromId === quickAddPerson.personId && r.toId === u.unionId
                )
              );

              const spousesList: Person[] = [];
              personUnions.forEach(union => {
                const partnerIds = treeData.relationships
                  .filter(r => r.type === 'PARTNER_IN' && r.toId === union.unionId)
                  .map(r => r.fromId);
                const spouseId = partnerIds.find(id => id !== quickAddPerson.personId);
                if (spouseId) {
                  const spouse = treeData.persons.find(p => p.personId === spouseId);
                  if (spouse) {
                    spousesList.push(spouse);
                  }
                }
              });
              return spousesList;
            })()}
            onSuccess={() => {
              setShowQuickAddWizard(false)
              setQuickAddPerson(null)
              triggerTreeReload('Mutation completed')
            }}
            userId={userId}
          />
        )}

        {/* Smart Suggestion (contextual next steps) */}
        {smartSuggestionData && (
          <SmartSuggestion
            show={showSmartSuggestion}
            message={smartSuggestionData.message}
            actionLabel={smartSuggestionData.actionLabel}
            onAction={smartSuggestionData.onAction}
            onDismiss={() => {
              setShowSmartSuggestion(false)
              setSmartSuggestionData(null)
            }}
            icon={smartSuggestionData.icon}
          />
        )}

        {/* Unified Panel Host — renders all side panels via panelStore */}
        <PanelHost
          currentTreeId={currentTreeId}
          treeData={treeData}
          userTrees={userTrees}
          selectedMemberId={selectedMemberId}
          addRelativePerson={addRelativePerson}
          currentValidationConfig={currentValidationConfig}
          callbacks={panelHostCallbacks}
          isWebView={isWebView}
        />

        {/* A8 — Welcome + path selection (first-time users) */}
        {showWelcomePath && (
          <Suspense fallback={null}>
            <WelcomePathSelection
              userName={(user?.fullName || 'there').split(' ')[0]}
              onConversational={() => { setShowWelcomePath(false); setShowConversationalWizard(true) }}
              onStructured={() => { setShowWelcomePath(false); setShowCreateTreeWizard(true) }}
              onStoryCapture={() => { setShowWelcomePath(false); setShowStoryCapture(true) }}
              onSkip={isFirstTimeUser ? undefined : () => setShowWelcomePath(false)}
            />
          </Suspense>
        )}

        {/* Create Tree Wizard */}
        <CreateTreeWizard
          open={showCreateTreeWizard}
          onClose={(treeId) => {
            setWizardInitialTreeId(undefined)
            setWizardInitialTreeName(undefined)
            if (treeId) {
              handleTreeCreated(treeId)
            } else {
              setShowCreateTreeWizard(false)
              if (isFirstTimeUser) setShowWelcomePath(true)
            }
          }}
          onComplete={handleTreeCreated}
          userId={userId}
          initialTreeId={wizardInitialTreeId}
          initialTreeName={wizardInitialTreeName}
        />


        {/* Conversational Wizard (A8 alt path) */}
        {showConversationalWizard && (
          <Suspense fallback={null}>
            <ConversationalWizard
              open={showConversationalWizard}
              onClose={() => {
                setShowConversationalWizard(false)
                if (isFirstTimeUser) setShowWelcomePath(true)
              }}
              onComplete={(treeId, action) => {
                setShowConversationalWizard(false)
                handleTreeCreated(treeId, action)
              }}
              userId={userId}
            />
          </Suspense>
        )}

        {/* Rename Tree Dialog */}
        {showRenameDialog && selectedTreeForAction && (
          <RenameTreeDialog
            open={showRenameDialog}
            onClose={() => {
              setShowRenameDialog(false)
              setSelectedTreeForAction(null)
            }}
            onConfirm={handleConfirmRename}
            tree={selectedTreeForAction}
          />
        )}

        {/* Delete Tree Confirmation Dialog */}
        {showDeleteDialog && selectedTreeForAction && (
          <DeleteTreeConfirmDialog
            open={showDeleteDialog}
            onClose={() => {
              setShowDeleteDialog(false)
              setSelectedTreeForAction(null)
            }}
            onConfirm={handleConfirmDelete}
            tree={selectedTreeForAction}
            isOnlyTree={userTrees.length === 1}
            isCurrentTree={selectedTreeForAction?.treeId === currentTreeId}
          />
        )}

        {/* Duplicate Tree Dialog */}
        {showDuplicateDialog && selectedTreeForAction && (
          <DuplicateTreeDialog
            open={showDuplicateDialog}
            onClose={() => {
              setShowDuplicateDialog(false)
              setSelectedTreeForAction(null)
            }}
            onConfirm={handleConfirmDuplicate}
            tree={selectedTreeForAction}
          />
        )}

        {/* Tree Settings Modal */}
        <TreeSettingsModal
          open={showTreeSettingsModal}
          onClose={() => setShowTreeSettingsModal(false)}
          onSave={handleSaveTreeSettings}
          currentConfig={currentValidationConfig}
          treeId={currentTreeId || ''}
        />

        {/* Panels (History, Activity, PendingEdits, MediaGallery, Suggestions, Bookmarks,
           DuplicateDetection, MigrationMap, Timeline, Source, Descendancy, DNA, AllPeople,
           LifeStory, Comments) are now rendered by PanelHost above */}

        {/* Phase 3: Relationship Path Finder Modal (stays as modal, not panel) */}
        {showRelationshipPathModal && treeData && currentTreeId && (
          <RelationshipPathModal
            open={showRelationshipPathModal}
            onClose={() => {
              setShowRelationshipPathModal(false)
              setHighlightedPathPersonIds([])
            }}
            persons={treeData.persons}
            unions={treeData.unions}
            relationships={treeData.relationships}
            treeId={currentTreeId}
            onPathFound={(personIds) => setHighlightedPathPersonIds(personIds)}
            onClearPath={() => setHighlightedPathPersonIds([])}
          />
        )}

        {/* Phase 3: Merge Persons Modal */}
        {showMergeModal && selectedDuplicatePair && currentTreeId && (
          <MergePersonsModal
            open={showMergeModal}
            onClose={() => {
              setShowMergeModal(false)
              setSelectedDuplicatePair(null)
            }}
            pair={selectedDuplicatePair}
            treeId={currentTreeId}
            onMerged={() => {
              resetMainViews();
              triggerTreeReload('Persons merged');
              toast({
                title: 'Merge successful',
                description: 'The duplicate persons have been merged successfully.',
                variant: 'success'
              });
            }}
          />
        )}

        {/* Migration Map, Timeline, Source panels — now in PanelHost */}

        {/* Phase 3: Add Source Modal */}
        {currentTreeId && (
          <AddSourceModal
            treeId={currentTreeId}
            open={showAddSourceModal}
            onClose={() => setShowAddSourceModal(false)}
          />
        )}

        {/* Descendancy, DNA panels — now in PanelHost */}

        {/* Phase 4: Invite Collaborator Modal */}
        {currentTreeId && (
          <InviteCollaboratorModal
            treeId={currentTreeId}
            open={showInviteModal}
            onClose={() => setShowInviteModal(false)}
          />
        )}

        {/* Phase 8: Create Memory Modal */}
        {showCreateMemoryModal && currentTreeId && (
          <CreateMemoryModal
            open={showCreateMemoryModal}
            onClose={() => { setShowCreateMemoryModal(false); setMemoryContextPersonId(null); }}
            treeId={currentTreeId}
            persons={(treeData?.persons || []).map(p => ({ personId: p.personId, firstName: p.firstName, lastName: p.lastName, profilePhotoUrl: p.photoThumbUrl || p.profilePhotoUrl }))}
            preSelectedPersonId={memoryContextPersonId}
            onCreated={() => {
              setShowCreateMemoryModal(false)
              setMemoryContextPersonId(null)
              setShowMemoriesPanel(true)
              setMemoriesRefreshKey(k => k + 1)
              // if (currentTreeId) fetchMemoryCounts(currentTreeId).then(setMemoryCounts).catch(() => { })
            }}
          />
        )}

        {/* AllPeople, LifeStory panels — now in PanelHost */}

        {/* Discover Page (mobile) */}
        {showDiscover && currentTreeId && (
          <DiscoverPage
            onClose={() => { setShowDiscover(false); setBottomNavActiveTab('canvas') }}
            onOpenMigrationMap={() => openPanel('migration-map')}
            onOpenTimeline={() => openPanel('timeline')}
            onOpenStatistics={() => openPanel('dna')}
            onOpenMemories={() => {
              setMemoriesPanelPersonId(null)
              setMemoriesPanelPersonName('')
              setShowMemoriesPanel(true)
            }}
            onOpenPathfinder={() => setShowRelationshipPathModal(true)}
            onOpenSuggestions={() => openPanel('suggestions')}
            onOpenDuplicates={() => openPanel('duplicate-detection')}
            onOpenDescendancy={selectedMemberId ? () => openPanel('descendancy', { personId: selectedMemberId }) : undefined}
          />
        )}

        {/* Tree Overview */}
        {showTreeOverview && currentTreeId && treeData && (
          <TreeOverviewPage
            treeId={currentTreeId}
            treeName={userTrees.find(t => t.treeId === currentTreeId)?.treeName || 'Family Tree'}
            description={userTrees.find(t => t.treeId === currentTreeId)?.description}
            persons={treeData.persons}
            unions={treeData.unions}
            relationships={treeData.relationships}
            onClose={() => setShowTreeOverview(false)}
            onPersonClick={(personId) => {
              setShowTreeOverview(false)
              setSelectedMemberId(personId)
              setSelectedFamilyId(personId)
            }}
            onOpenAllPeople={() => { setShowTreeOverview(false); openPanel('all-people'); }}
            onOpenMemories={() => { setShowTreeOverview(false); setShowMemoriesPanel(true); }}
            onInviteCollaborator={() => { setShowTreeOverview(false); setShowInviteModal(true); }}
            onDescriptionUpdated={async () => {
              try {
                const trees = await neo4jAPI.getUserTrees(userId, true)
                setUserTrees(trees)
              } catch (err) {
                console.error('Failed to reload user trees after updating description:', err)
              }
            }}
          />
        )}

        {/* Person Profile Page */}
        {showPersonProfile && profilePersonId && currentTreeId && treeData && (
          <PersonProfilePage
            personId={profilePersonId}
            treeId={currentTreeId}
            persons={treeData.persons}
            unions={treeData.unions}
            relationships={treeData.relationships as ExtendedRelationship[]}
            onClose={() => { setShowPersonProfile(false); setProfilePersonId(null); }}
            onPersonNavigate={(pid) => { setProfilePersonId(pid); }}
            onEditPerson={(person) => { setPersonToEdit(person); setShowEditPersonModal(true); }}
            onDeletePerson={(person) => { setPersonToDelete(person); setShowDeletePersonDialog(true); }}
            onAddRelative={(pid, action) => handlePersonContextAction(pid, action as Parameters<typeof handlePersonContextAction>[1])}
            onViewInTree={(pid) => { setShowPersonProfile(false); setProfilePersonId(null); setSelectedMemberId(pid); setSelectedFamilyId(pid); }}
            onTreeReload={() => triggerTreeReload('Profile updated')}
            onManageTags={(pid) => {
              const person = treeData.persons.find(p => p.personId === pid);
              setManageTagsPersonId(pid);
              setManageTagsCurrentTags((person as unknown as { tags?: string[] })?.tags || []);
              setShowManageTagsModal(true);
            }}

            onCreateMemory={(pid) => { setMemoryContextPersonId(pid); setShowCreateMemoryModal(true); }}
          />
        )}

        {/* Comments panel — now in PanelHost */}

        {/* Feedback Modal */}
        {showFeedbackModal && (
          <FeedbackModal
            open={showFeedbackModal}
            onClose={() => setShowFeedbackModal(false)}
          />
        )}

        {/* Language Preference Modal — shown once for new users */}
        {showLanguagePrefModal && (
          <LanguagePreferenceModal
            open={showLanguagePrefModal}
            initialLanguages={currentFeedPrefs.langs}
            initialMode={currentFeedPrefs.mode}
            onClose={() => {
              setShowLanguagePrefModal(false)
              localStorage.setItem('feed_lang_pref_set', '1')
            }}
            onSave={async (langs, mode) => {
              try {
                const { updateFeedPreferences } = await import('@/services/dailyShareApiService')
                await updateFeedPreferences({ preferredLanguages: langs, languageMode: mode })
                setCurrentFeedPrefs({ langs, mode })
                localStorage.setItem('feed_lang_pref_set', '1')
                sessionStorage.setItem('preferredLanguages', JSON.stringify(langs))
                setShowLanguagePrefModal(false)
              } catch (err) {
                console.error('Failed to save language preferences:', err)
                sessionStorage.removeItem('preferredLanguages')
                toast({
                  title: 'Error saving preferences',
                  description: 'Failed to save language preferences on server. Please try again.',
                  variant: 'destructive',
                })
              }
            }}
          />
        )}

        {/* Manage Tags Modal */}
        {manageTagsPersonId && currentTreeId && (
          <ManageTagsModal
            isOpen={showManageTagsModal}
            onClose={() => { setShowManageTagsModal(false); setManageTagsPersonId(null); }}
            personId={manageTagsPersonId}
            treeId={currentTreeId}
            currentTags={manageTagsCurrentTags}
            onTagsUpdated={() => {
              triggerTreeReload('Tags updated')
            }}
          />
        )}

        {/* Import GEDCOM Loader */}
        {isImportingGedcom && (
          <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-8 flex flex-col items-center max-w-sm w-[90%] shadow-2xl border border-[#E2DBCE]/60 dark:border-[#2a2a2a]">
              <Loader2 className="w-10 h-10 animate-spin text-[#2F3E8F] dark:text-[#8CA0FF] mb-4" />
              <h3 className="text-lg font-semibold text-[#3D2E1F] dark:text-[#F3F2F1] text-center mb-2">Importing your tree</h3>
              <p className="text-sm text-center text-[#8B7355] dark:text-[#888]">
                This may take a minute for large GEDCOM files. We're assembling your family network...
              </p>
            </div>
          </div>
        )}

        {/* Set Home Person Modal */}
        {showSetHomePersonModal && importedTreeIdForHomePerson && (
          <SetHomePersonModal
            open={showSetHomePersonModal}
            treeId={importedTreeIdForHomePerson}
            candidates={homePersonCandidates || undefined}
            onClose={async () => {
              const treeId = importedTreeIdForHomePerson;
              setShowSetHomePersonModal(false);
              setImportedTreeIdForHomePerson(null);
              setHomePersonCandidates(null);
              await handleTreeSwitch(treeId);
            }}
            onSuccess={async (personId) => {
              const treeId = importedTreeIdForHomePerson;
              setShowSetHomePersonModal(false);
              setImportedTreeIdForHomePerson(null);
              setHomePersonCandidates(null);
              await handleTreeSwitch(treeId);
            }}
          />
        )}

        {/* Chat assistant context sync — chatbot is rendered globally in App.tsx */}
      </div>
    </Suspense>
  )
}
