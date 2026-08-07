/**
 * UnionBasedTreeCanvas - Main Family Tree Canvas Component
 *
 * Renders family tree using Union-based model with ELK.js layout.
 * Replaces React Flow with custom absolute positioning.
 *
 * Features:
 * - Load windowed subgraph from Neo4j
 * - Calculate layout using ELK.js
 * - Render PersonCard components
 * - Render UnionEdgeGroup components
 * - Pan and zoom controls
 * - Click to focus person
 *
 * @see references/family-tree_ancestry.md
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Trees, ZoomIn, ZoomOut, Maximize2, SlidersHorizontal, Home, Map as MapIcon, X, Download, Printer, FileText, FileJson } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';


import { PersonCard } from './PersonCard';
import { PlaceholderCard } from './PlaceholderCard';
import { CollapseBubble as _CollapseBubble } from './CollapseBubble';
import { FocusPersonBreadcrumb } from './FocusPersonBreadcrumb';
import { PersonMenu } from './PersonMenu';
import { UnionEdgeGroup } from './UnionEdgeGroup';
import { GridOverlay } from './GridOverlay';
import { FamilySearch } from './FamilySearch';
import { AdvancedSearchSidebar } from './AdvancedSearchSidebar';
import { GridSettingsModal } from './GridSettingsModal';
import { FanChart } from './FanChart';
import { Minimap } from './Minimap';
import { NodePreviewCard } from './NodePreviewCard';
import { useNodePreview } from '@/hooks/useNodePreview';
import { getParents } from '@/services/graphTraversalHelpers';
import { NodeDisplayPreferencesModal } from '@/components/modals/NodeDisplayPreferencesModal';
import { PREVIEW_FIELD_REGISTRY } from '@/constants/previewFieldRegistry';
import { useTreeStore, type LayoutMode } from '@/store/treeStore';
import { calculateFamilyTreeLayout, clearLayoutCache, normalizeSingleParentUnions, type Position } from '@/services/elkLayoutService';
import { augmentWithGhostSpouses } from '@/services/treeAugmentationService';
import { fetchTreeWindow, clearAllTreeCaches, getTreeNodeDisplayPreferences, type TreeWindowData, type FamilyComponent, filterTreeDataByComponent, exportGedcom, exportCsv } from '@/services/neo4jDataService';

import { detectAllCollapsibleGroups } from '@/services/collapseDetectionService';
import { filterCollapsedSubtrees, filterByBloodRelationsWithExpansions } from '@/services/subtreeFilterService';
import { getPaternalSideIds, getMaternalSideIds } from '@/services/ancestrySideFilter';
// detectBloodRelations import removed (unused)
import {
  isInLaw,
  detectFocusLineage,
  type PerNodeCollapseState,
  type CollapsedBubble as CollapsedBubbleType,
} from '@/services/progressiveDisclosureService';
import {
  applyVamshavaliExpansions,
  getVamshavaliExpandInfo,
  computeExpansionPathTo,
} from '@/services/vamshavaliService';
import type { VamshavaliExpansionState, VamshavaliVisibleSet, VamshavaliExpandDirection } from '@/types';
import {
  createInitialNavigation,
  navigateToFocus,
  navigateHome,
  getBreadcrumbs,
  type FocusNavigationState,
} from '@/services/focusNavigationService';
import { computeRelationshipLabels, type RelationshipLabelEntry } from '@/services/relationshipLabelService';
import { getKinshipPatterns, getGroupLabels, type GroupLabelSet } from '@/data/kinship';
import { LAYOUT_CONSTANTS } from '@/constants/layoutConstants';
import {
  getBreakpoint,
  debounce,
  type ResponsiveBreakpoint,
} from '@/constants/responsiveLayoutConstants';
import type {
  Union,
  CollapsedGroup,
  PlaceholderNode,
  BloodRelationMode,
  ExpansionContext,
  ExpansionMetadata,
} from '@/types';

// ─── Guardian Edge ────────────────────────────────────────────────────────────
const GUARDIAN_COLOR = '#60a5fa';   // Amber-400 — visually distinct from bio edges
const GUARDIAN_DASH = '8,4';

const GUARDIAN_LABEL: Record<string, string> = {
  'adoption': 'adopted',
  'step-parent': 'step',
  'foster': 'foster',
  'legal-guardian': 'guardian',
};

interface GuardianEdgeProps {
  guardianPos: Position;
  childPos: Position;
  guardianType?: 'adoption' | 'step-parent' | 'foster' | 'legal-guardian' | 'informal-caregiver';
}

function GuardianEdge({ guardianPos, childPos, guardianType }: GuardianEdgeProps) {
  const pw = LAYOUT_CONSTANTS.PERSON_WIDTH;
  const ph = LAYOUT_CONSTANTS.PERSON_HEIGHT;

  // Anchor points
  const x1 = guardianPos.x + pw / 2;   // bottom-centre of guardian card
  const y1 = guardianPos.y + ph;
  const x2 = childPos.x + pw / 2;   // top-centre of child card
  const y2 = childPos.y;

  const isSameRow = Math.abs(guardianPos.y - childPos.y) <= 10;

  let pathD: string;
  let labelX: number;
  let labelY: number;

  if (!isSameRow) {
    // Different generations: orthogonal path (↓ → ↓)
    const midY = (y1 + y2) / 2;
    pathD = `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
    labelX = (x1 + x2) / 2;
    labelY = midY - 6;
  } else {
    // Same generation (e.g. step-parent): cubic bezier arc below row
    const cy = y1 + ph / 2 + 60;
    pathD = `M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`;
    labelX = (x1 + x2) / 2;
    labelY = cy - 6;
  }

  const label = guardianType ? (GUARDIAN_LABEL[guardianType] ?? guardianType) : 'guardian';

  return (
    <g data-edge-type="guardian" data-guardian-type={guardianType}>
      <path
        d={pathD}
        stroke={GUARDIAN_COLOR}
        strokeWidth={2}
        strokeDasharray={GUARDIAN_DASH}
        fill="none"
      />
      {/* Label pill */}
      <rect x={labelX - 24} y={labelY - 8} width={48} height={16} rx={4}
        fill="#1a1a2e" stroke={GUARDIAN_COLOR} strokeWidth={1} opacity={0.9} />
      <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="central"
        fontSize={10} fill={GUARDIAN_COLOR} fontWeight="600" letterSpacing="0.02em">
        {label}
      </text>
    </g>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Collect all descendant person and union IDs below the given collapsed unions.
 * Used to hide entire subtrees when a chevron is collapsed.
 */
function collectDescendants(
  data: TreeWindowData,
  collapsedUnionIds: Set<string>
): Set<string> {
  const hidden = new Set<string>();
  if (collapsedUnionIds.size === 0) return hidden;

  const hiddenPersons = new Set<string>();
  const hiddenUnions = new Set<string>();

  // Helper to check if a person should be hidden when their spouse/parent connection is hidden
  const shouldHidePerson = (personId: string): boolean => {
    // Check if they have any parent unions that are NOT hidden/collapsed
    const parentUnions = data.relationships
      .filter(r => r.type === 'HAS_CHILD' && r.toId === personId)
      .map(r => r.fromId);
    
    const hasVisibleParentUnion = parentUnions.some(uid => !collapsedUnionIds.has(uid) && !hiddenUnions.has(uid));
    if (hasVisibleParentUnion) return false;

    // Check if they have any spouse unions that are NOT hidden/collapsed
    const spouseUnions = data.relationships
      .filter(r => r.type === 'PARTNER_IN' && r.fromId === personId)
      .map(r => r.toId);
    
    const hasVisibleSpouseUnion = spouseUnions.some(uid => !collapsedUnionIds.has(uid) && !hiddenUnions.has(uid));
    if (hasVisibleSpouseUnion) return false;

    return true;
  };

  const collectDescendantsOfPerson = (personId: string) => {
    if (hiddenPersons.has(personId)) return;
    hiddenPersons.add(personId);

    // Find unions this person is partner in
    const unions = data.relationships
      .filter(r => r.type === 'PARTNER_IN' && r.fromId === personId)
      .map(r => r.toId);

    for (const unionId of unions) {
      if (hiddenUnions.has(unionId)) continue;
      hiddenUnions.add(unionId);

      // Find children of this union
      const children = data.relationships
        .filter(r => r.type === 'HAS_CHILD' && r.fromId === unionId)
        .map(r => r.toId);
      for (const childId of children) {
        collectDescendantsOfPerson(childId);
      }

      // Find other partners (spouses) in this union
      const spouses = data.relationships
        .filter(r => r.type === 'PARTNER_IN' && r.toId === unionId && r.fromId !== personId)
        .map(r => r.fromId);
      for (const spouseId of spouses) {
        if (shouldHidePerson(spouseId)) {
          hiddenPersons.add(spouseId);
        }
      }
    }
  };

  // Start traversing from the children of each collapsed union
  for (const unionId of collapsedUnionIds) {
    const children = data.relationships
      .filter(r => r.type === 'HAS_CHILD' && r.fromId === unionId)
      .map(r => r.toId);

    for (const childId of children) {
      collectDescendantsOfPerson(childId);
    }
  }

  // Combine hidden persons and unions into the single returned Set
  hiddenPersons.forEach(id => hidden.add(id));
  hiddenUnions.forEach(id => hidden.add(id));

  return hidden;
}

export interface CanvasControls {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  download: () => void;
  /** Inject optimistic tree data directly — skips API fetch, triggers layout recalc */
  patchTreeData: (data: TreeWindowData) => void;
  /** Center viewport on a person and highlight with glow effect */
  focusOnPerson: (personId: string) => void;
}

// ============================================================================
// Tree Loading Screen — engaging messages while tree data loads
// ============================================================================

const LOADING_MESSAGES_GENERIC = [
  'Gathering family connections...',
  'Tracing ancestral bonds...',
  'Mapping generations of history...',
  'Weaving your family story...',
  'Discovering family patterns...',
];

function TreeLoadingScreen({ treeName, memberCount }: { treeName?: string; memberCount?: number }) {
  const [msgIndex, setMsgIndex] = useState(0);

  // Build personalized messages when data is available
  const messages = useMemo(() => {
    const msgs = [...LOADING_MESSAGES_GENERIC];
    if (treeName) {
      msgs.unshift(`Building the ${treeName}...`);
    }
    if (memberCount && memberCount > 5) {
      msgs.splice(2, 0, `Connecting ${memberCount} family members...`);
    }
    return msgs;
  }, [treeName, memberCount]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex(i => (i + 1) % messages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-5">
      {/* Animated tree icon */}
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2F3E8F]/10 to-[#C2A46D]/10 flex items-center justify-center">
          <Trees className="w-8 h-8 text-[#2F3E8F] animate-pulse" />
        </div>
        {/* Orbiting dot */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
          <div className="w-2 h-2 rounded-full bg-[#C2A46D] absolute -top-1 left-1/2 -translate-x-1/2" />
        </div>
      </div>

      {/* Cycling message with fade transition */}
      <div className="text-center min-h-[48px] flex flex-col items-center justify-center">
        <p
          key={msgIndex}
          className="text-sm font-medium text-[#3D2E1F] dark:text-[#f5f5f5] animate-fade-in"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {messages[msgIndex]}
        </p>
        {/* Progress dots */}
        <div className="flex gap-1.5 mt-3">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[#2F3E8F]/40 animate-pulse"
              style={{ animationDelay: `${i * 300}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export interface UnionBasedTreeCanvasProps {
  treeId: string;
  focusPersonId?: string;
  familyComponent?: FamilyComponent; // Filter tree to only show this component
  onPersonClick?: (personId: string) => void;
  onPersonDoubleClick?: (personId: string) => void;
  onPersonContextAction?: (personId: string, action: 'add-parent' | 'add-spouse' | 'marry-existing' | 'add-child' | 'add-sibling' | 'add-grandparent' | 'add-uncle-aunt' | 'add-cousin' | 'add-guardian' | 'end-marriage' | 'quick-add' | 'edit' | 'delete' | 'view-history' | 'media-gallery' | 'add-memory' | 'manage-tags' | 'view-life-story' | 'view-comments' | 'view-profile' | 'ghost-add' | 'invite-to-claim') => void;
  onTreeDataLoaded?: (data: TreeWindowData) => void;
  onNavigateToTree?: (treeId: string) => void;
  onOpenAddRelativePanel?: (personId: string) => void;
  onImportGedcom?: () => void;
  onCreateRoot?: () => void;
  onInviteFamily?: () => void;
  onViewMemories?: (personId: string, personName: string) => void;
  memoryCounts?: Record<string, number>;
  reloadTrigger?: number;
  searchFocusTrigger?: number;
  resetViewTrigger?: number;
  // Lifted state: blood relation mode
  bloodRelationMode?: BloodRelationMode;
  onBloodRelationModeChange?: (mode: BloodRelationMode) => void;
  onSideFilterChange?: (side: import('@/services/ancestrySideFilter').SideFilter) => void;
  // Paternal / maternal side filter
  sideFilter?: import('@/services/ancestrySideFilter').SideFilter;
  // Split-view: paternal left / maternal right, shared persons duplicated
  splitView?: boolean;
  // Expose canvas controls to parent
  onCanvasControlsReady?: (controls: CanvasControls) => void;
  // Grid settings modal trigger
  showGridSettingsModal?: boolean;
  onCloseGridSettingsModal?: () => void;
  // Loading screen personalization
  treeName?: string;
  lastKnownMemberCount?: number;
  // Public read-only view — disables edit affordances (add, context menu, voice).
  readOnly?: boolean;
  // Highlight a specific person with a gold pulse ring (used on public invite view).
  highlightPersonId?: string;
  // Inject pre-fetched tree data instead of calling the auth-protected tree-window endpoint.
  // When provided, internal fetching via fetchTreeWindow is skipped.
  externalTreeData?: TreeWindowData | null;
  // Custom layout breakpoint for custom size/spacing configurations
  customBreakpoint?: ResponsiveBreakpoint;
  // Override the tree layout mode (e.g. force vertical tree in previews)
  overrideLayoutMode?: LayoutMode;
}

type TreeData = TreeWindowData;

// Persistent zoom cache to preserve zoom level across tree switching/remounts
let lastKnownZoom: number | null = null;

export function UnionBasedTreeCanvas({
  treeId,
  focusPersonId,
  familyComponent,
  onPersonClick,
  onPersonDoubleClick,
  onPersonContextAction,
  onTreeDataLoaded,
  onNavigateToTree,
  onOpenAddRelativePanel,
  onInviteFamily: _onInviteFamily,
  onImportGedcom,
  onCreateRoot,
  onViewMemories,
  memoryCounts,
  reloadTrigger,
  searchFocusTrigger,
  resetViewTrigger,
  bloodRelationMode: bloodRelationModeProp,
  onBloodRelationModeChange: _onBRMChange,
  onSideFilterChange,
  sideFilter = 'all',
  splitView = false,
  onCanvasControlsReady,
  showGridSettingsModal: showGridSettingsModalProp,
  onCloseGridSettingsModal,
  treeName,
  lastKnownMemberCount,
  readOnly = false,
  highlightPersonId,
  externalTreeData,
  customBreakpoint,
  overrideLayoutMode,
}: UnionBasedTreeCanvasProps) {
  const { toast } = useToast();
  // State

  const [treeData, setTreeData] = useState<TreeData | null>(null);
  const [positions, setPositions] = useState<Map<string, Position>>(new Map());
  const [bounds, setBounds] = useState({ width: 0, height: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 });
  // Split-view: extra positions for duplicated nodes (key = `${personId}__paternal` or `__maternal`)
  const [splitPositions, setSplitPositions] = useState<Map<string, Position>>(new Map());
  const [splitPersonIds, setSplitPersonIds] = useState<Set<string>>(new Set());
  // IDs of persons/unions hidden by union collapse (chevron arrows) — used for render-layer hiding only
  const [hiddenByCollapse, setHiddenByCollapse] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Responsive layout state
  const [currentBreakpoint, setCurrentBreakpoint] = useState<ResponsiveBreakpoint>(
    customBreakpoint || getBreakpoint(window.innerWidth)
  );

  useEffect(() => {
    if (customBreakpoint) {
      setCurrentBreakpoint(customBreakpoint);
    }
  }, [customBreakpoint]);

  // Canvas transformation state
  const [zoom, setZoom] = useState<number>(() => lastKnownZoom ?? LAYOUT_CONSTANTS.DEFAULT_ZOOM);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  const lastCenteredPersonIdRef = useRef<string | null>(null);
  const lastCenteredTreeIdRef = useRef<string | null>(null);

  useEffect(() => {
    lastKnownZoom = zoom;
  }, [zoom]);

  // Grid overlay state (development tool - off by default)
  const [showGridOverlay, setShowGridOverlay] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showGenerationLines, setShowGenerationLines] = useState(true);
  const [showAnchorPoints, setShowAnchorPoints] = useState(true);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [showNodeCenters, setShowNodeCenters] = useState(false);
  const [showSnapGuides, setShowSnapGuides] = useState(false);
  const [showGridSettingsModalInternal, setShowGridSettingsModalInternal] = useState(false);
  const showGridSettingsModal = showGridSettingsModalProp ?? showGridSettingsModalInternal;
  const setShowGridSettingsModal = onCloseGridSettingsModal
    ? (v: boolean) => { if (!v) onCloseGridSettingsModal(); }
    : setShowGridSettingsModalInternal;

  // Node preview (hover/tap)
  const isTouchDevice = 'ontouchstart' in window;
  const previewFields = useTreeStore(s => s.previewFields);
  const setPreviewFields = useTreeStore(s => s.setPreviewFields);

  // Load node display preferences from server
  useEffect(() => {
    if (!treeId) return;
    // Skip in read-only/public view: endpoint requires auth and would 401.
    if (readOnly) return;
    (async () => {
      try {
        const prefs = await getTreeNodeDisplayPreferences(treeId);
        if (prefs?.fields?.length > 0) {
          const normalized = prefs.fields
            .map((f: string) => {
              if (f === 'birthDate' || f === 'birth_date') return 'dateOfBirth';
              if (f === 'deathDate' || f === 'death_date' || f === 'date_of_death') return 'dateOfDeath';
              if (f === 'birth_place') return 'birthPlace';
              if (f === 'death_place') return 'deathPlace';
              if (f === 'native_place') return 'nativePlace';
              if (f === 'native_language') return 'nativeLanguage';
              if (f === 'relationshipLabel') return 'relationship';
              return f;
            })
            .filter((f: string) => PREVIEW_FIELD_REGISTRY.some(reg => reg.key === f));
          setPreviewFields(normalized);
        }
      } catch {
        // Silently fall back to localStorage/default preferences
      }
    })();
  }, [treeId, setPreviewFields, readOnly]);

  const {
    previewPersonId,
    previewPosition,
    handleMouseEnter: handlePreviewMouseEnter,
    handleMouseLeave: handlePreviewMouseLeave,
    handlePreviewMouseEnter: handlePreviewCardMouseEnter,
    handlePreviewMouseLeave: handlePreviewCardMouseLeave,
    handleTap: _handlePreviewTap,
    dismissPreview,
  } = useNodePreview({ isTouchDevice, isPanning });

  // Node display preferences modal
  const [showDisplayPreferences, setShowDisplayPreferences] = useState(false);

  // Voice assistant
  // Minimap visibility
  const [showMinimap, setShowMinimap] = useState(true);

  // Collapsing state
  const [collapsedGroups, setCollapsedGroups] = useState<Map<string, CollapsedGroup>>(new Map());
  const [availableGroups, setAvailableGroups] = useState<CollapsedGroup[]>([]);
  const [placeholderNodes, setPlaceholderNodes] = useState<PlaceholderNode[]>([]);

  // Union-level collapse state (chevron arrows on edges)
  const [collapsedUnionIds, setCollapsedUnionIds] = useState<Set<string>>(new Set());

  // Spouse toggle state: union IDs that are hidden via the spouse toggle popup
  const [hiddenSpouseUnionIds, setHiddenSpouseUnionIds] = useState<Set<string>>(new Set());

  // Blood relation filtering state (controlled or uncontrolled)
  const [bloodRelationModeInternal] = useState<BloodRelationMode>('all');
  const bloodRelationMode = bloodRelationModeProp ?? bloodRelationModeInternal;
  const [expansionContexts, setExpansionContexts] = useState<Map<string, ExpansionContext>>(new Map());
  const [expandablePersons, setExpandablePersons] = useState<Map<string, ExpansionMetadata>>(new Map());
  const [visiblePersonIds, setVisiblePersonIds] = useState<Set<string>>(new Set());

  // Touch gesture state — all refs for synchronous access in native listeners
  const touchStateRef = useRef({
    isPinching: false,
    isPanning: false,
    initialPinchDistance: 0,
    initialZoom: 1,
    initialPan: { x: 0, y: 0 },
    pinchCenter: { x: 0, y: 0 },
    lastPos: { x: 0, y: 0 },
    movedDist: 0,
    startedOnCard: false,
    // Double-tap detection
    lastTapTime: 0,
    lastTapX: 0,
    lastTapY: 0,
    // Momentum panning
    velocityX: 0,
    velocityY: 0,
    lastMoveTime: 0,
  });
  const momentumRafRef = useRef<number | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Anchor ref for collapse/expand pan correction — stores the screen-space
  // position of a reference node so we can restore it after ELK re-layout.
  const collapseAnchorRef = useRef<{
    personId: string;
    /** Screen-space position: panOffset + nodePos * zoom */
    screenX: number;
    screenY: number;
    zoom: number;
  } | null>(null);

  // Keep live refs so native touch listeners can read current values
  const panOffsetRef = useRef(panOffset);
  panOffsetRef.current = panOffset;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // Refs to break dependency-array cascade:
  // familyComponent changing (due to componentMap re-creating) must NOT re-trigger loadTreeData.
  // onTreeDataLoaded must always call the latest handler from DashboardPage.
  const familyComponentRef = useRef(familyComponent);
  familyComponentRef.current = familyComponent;
  const onTreeDataLoadedRef = useRef(onTreeDataLoaded);
  onTreeDataLoadedRef.current = onTreeDataLoaded;

  // Track previously known person IDs to detect newly added persons.
  // On full page reload (window.location.reload), hydrate from sessionStorage
  // so we can still detect the newly added person.
  const prevPersonIdsRef = useRef<Set<string>>((() => {
    const saved = sessionStorage.getItem(`tree-${treeId}-prevPersonIds`);
    if (saved) {
      sessionStorage.removeItem(`tree-${treeId}-prevPersonIds`); // one-shot
      try {
        return new Set<string>(JSON.parse(saved));
      } catch { /* ignore */ }
    }
    return new Set<string>();
  })());

  // Recently added person highlight state
  const [recentlyAddedPersonId, setRecentlyAddedPersonId] = useState<string | null>(null);

  // Search highlight state (person found via search bar)
  const [searchHighlightPersonId, setSearchHighlightPersonId] = useState<string | null>(null);
  const searchHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingFocusPersonId, setPendingFocusPersonId] = useState<string | null>(null);

  // Advanced Search state
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [advancedSearchMatches, setAdvancedSearchMatches] = useState<string[] | null>(null);
  
  const advancedSearchMatchSet = useMemo(() => {
    if (!advancedSearchMatches) return null;
    return new Set(advancedSearchMatches);
  }, [advancedSearchMatches]);

  // Relationship labels state (precomputed for all persons relative to home person)
  const [relationshipLabels, setRelationshipLabels] = useState<Map<string, RelationshipLabelEntry>>(new Map());
  const [localeGroupLabels, setLocaleGroupLabels] = useState<GroupLabelSet | null>(null);
  const locale = useTreeStore(s => s.locale);

  // Layout mode from store (supports prop override)
  const storeLayoutMode = useTreeStore(s => s.layoutMode);
  const layoutMode = overrideLayoutMode || storeLayoutMode;
  // setLayoutMode available via useTreeStore if needed

  // Relationship path highlighting state
  const [highlightedPath] = useState<Set<string>>(new Set());

  // Progressive disclosure state
  const [perNodeCollapse, setPerNodeCollapse] = useState<Map<string, PerNodeCollapseState>>(new Map());
  const [disclosureVisibleIds, setDisclosureVisibleIds] = useState<Set<string> | null>(null);
  const [, setDisclosureVisibleUnionIds] = useState<Set<string> | null>(null);
  const [collapseBubbles, setCollapseBubbles] = useState<CollapsedBubbleType[]>([]);
  const [focusNavigation, setFocusNavigation] = useState<FocusNavigationState>({ history: [], currentIndex: -1 });
  const [virtualFocusId, setVirtualFocusId] = useState<string | null>(null);

  // Store collapse state per focus person for preservation across focus changes
  const collapseStatePerFocusRef = useRef<Map<string | null, Map<string, PerNodeCollapseState>>>(new Map());

  // ── Vamshavali mode state ──
  const [vamshavaliExpansions, setVamshavaliExpansions] = useState<VamshavaliExpansionState>({ expansions: new Map() });
  const [vamshavaliVisible, setVamshavaliVisible] = useState<VamshavaliVisibleSet | null>(null);
  const vamshavaliPrevVisibleRef = useRef<Set<string>>(new Set());
  const [vamshavaliNewNodeIds, setVamshavaliNewNodeIds] = useState<Set<string>>(new Set());

  // ── Vamshavali: recompute visible set when expansions or data change ──
  useEffect(() => {
    if (layoutMode !== 'vamshavali' || !treeData) {
      if (vamshavaliVisible) setVamshavaliVisible(null);
      return;
    }
    const homePersonId = treeData.persons.find(p => p.isHomePerson)?.personId;
    if (!homePersonId) return;

    const visible = applyVamshavaliExpansions(homePersonId, treeData, vamshavaliExpansions);

    // Track newly appeared nodes for animation
    const newIds = new Set<string>();
    for (const id of visible.visiblePersonIds) {
      if (!vamshavaliPrevVisibleRef.current.has(id)) newIds.add(id);
    }
    vamshavaliPrevVisibleRef.current = visible.visiblePersonIds;
    setVamshavaliNewNodeIds(newIds);
    // Clear animation class after animation completes
    if (newIds.size > 0) {
      setTimeout(() => setVamshavaliNewNodeIds(new Set()), 300);
    }

    setVamshavaliVisible(visible);
  }, [layoutMode, treeData, vamshavaliExpansions]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Vamshavali: reset state when switching away, force re-center when entering ──
  const prevLayoutModeRef = useRef(layoutMode);
  useEffect(() => {
    if (layoutMode !== 'vamshavali') {
      setVamshavaliExpansions({ expansions: new Map() });
      vamshavaliPrevVisibleRef.current = new Set();
    }
    // Force re-center when entering or leaving Vamshavali mode
    if (prevLayoutModeRef.current !== layoutMode) {
      setPanOffset({ x: 0, y: 0 });
      prevLayoutModeRef.current = layoutMode;
    }
  }, [layoutMode]);

  // Track previous layout state for incremental layout optimization
  // (Incremental layout refs removed — full recalc is fast enough at 4ms)

  // ============================================================================
  // Load Tree Data
  // ============================================================================

  // Counter to prevent stale API responses from overwriting newer data
  const loadCounterRef = useRef(0);

  const loadTreeData = useCallback(async () => {
    const thisLoad = ++loadCounterRef.current;
    try {
      console.log('[UnionBasedTreeCanvas] Loading tree data...', { treeId, focusPersonId, loadId: thisLoad });
      setLoading(true);
      setError(null);

      let treeWindowData = externalTreeData
        ? { ...externalTreeData }
        : await fetchTreeWindow(treeId, focusPersonId);

      // Ignore stale response if a newer load was started
      if (thisLoad !== loadCounterRef.current) {
        console.log('[UnionBasedTreeCanvas] Ignoring stale response', { loadId: thisLoad, current: loadCounterRef.current });
        return;
      }

      // Notify parent with UNFILTERED data first — so DashboardPage can recompute
      // the component map with all persons (including newly added ones).
      onTreeDataLoadedRef.current?.(treeWindowData);

      // Filter to only show the selected family component.
      // Re-read ref AFTER notifying parent, since parent may have updated it.
      const currentFamilyComponent = familyComponentRef.current;
      if (currentFamilyComponent) {
        const filtered = filterTreeDataByComponent(treeWindowData, currentFamilyComponent);
        // Only apply filter if it produces non-empty results; otherwise show full tree
        if (filtered.persons.length > 0) {
          treeWindowData = filtered;
        }
      }

      // Merge duplicate single-parent unions so edge rendering and layout use
      // consistent, clean data.
      const { unions: normalizedUnions, relationships: normalizedRelationships } =
        normalizeSingleParentUnions(treeWindowData.unions, treeWindowData.relationships);
      treeWindowData = { ...treeWindowData, unions: normalizedUnions, relationships: normalizedRelationships };

      // Add ghost spouse nodes for single parents (vertical tree requirement)
      treeWindowData = augmentWithGhostSpouses(treeWindowData);

      setTreeData(treeWindowData);

    } catch (err) {
      if (thisLoad !== loadCounterRef.current) return; // ignore stale errors
      console.error('Failed to load tree data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tree');
    } finally {
      if (thisLoad === loadCounterRef.current) {
        setLoading(false);
      }
    }
  }, [treeId, focusPersonId, externalTreeData]); // familyComponent intentionally excluded — read via ref

  // Find this function in UnionBasedTreeCanvas.tsx (approx. Line 596)


  // Optimistic patch: inject tree data directly without API fetch.
  // Applies same normalization pipeline as loadTreeData.
  // Uses functional updater to snapshot prev person IDs from actual current state.
  const patchTreeData = useCallback((rawData: TreeWindowData) => {
    let data = { ...rawData };

    // Notify parent with UNFILTERED data first — so DashboardPage can recompute
    // the component map with all persons (including newly added ones).
    onTreeDataLoadedRef.current?.(data);

    // Apply family component filter if active (re-read ref after parent notification)
    const currentFamilyComponent = familyComponentRef.current;
    if (currentFamilyComponent) {
      const filtered = filterTreeDataByComponent(data, currentFamilyComponent);
      if (filtered.persons.length > 0) {
        data = filtered;
      }
    }

    // Normalize single-parent unions
    const { unions: normalizedUnions, relationships: normalizedRelationships } =
      normalizeSingleParentUnions(data.unions, data.relationships);
    data = { ...data, unions: normalizedUnions, relationships: normalizedRelationships };

    // Add ghost spouse nodes for single parents (vertical tree requirement)
    data = augmentWithGhostSpouses(data);

    // Use functional updater to snapshot prev person IDs from actual current state
    setTreeData(prev => {
      if (prev) {
        prevPersonIdsRef.current = new Set(prev.persons.map(p => p.personId));
      }
      return data;
    });
  }, []);

  useEffect(() => {
    loadTreeData();
  }, [loadTreeData]);

  // Watch reloadTrigger: when it changes (after initial mount), snapshot current
  // person IDs and reload without remounting (preserves pan/zoom).
  const isFirstReloadTrigger = useRef(true);
  useEffect(() => {
    if (reloadTrigger === undefined) return;
    if (isFirstReloadTrigger.current) {
      isFirstReloadTrigger.current = false;
      return; // Skip initial trigger — initial load already handled above
    }
    // Snapshot current person IDs so layout can detect the new one
    if (treeData) {
      prevPersonIdsRef.current = new Set(treeData.persons.map(p => p.personId));
    }
    // Force clear ALL caches before reload — data cache, layout cache, inflight requests
    clearAllTreeCaches();
    clearLayoutCache();
    loadTreeData();
  }, [reloadTrigger, loadTreeData]);

  // Watch searchFocusTrigger: when it increments, focus the search input
  const isFirstSearchTrigger = useRef(true);
  useEffect(() => {
    if (searchFocusTrigger === undefined) return;
    if (isFirstSearchTrigger.current) {
      isFirstSearchTrigger.current = false;
      return;
    }
    searchInputRef.current?.focus();
  }, [searchFocusTrigger]);

  // ============================================================================
  // Session Storage for Expansion State
  // ============================================================================

  // Load expansion state from session storage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(`tree-${treeId}-expansions`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Convert array back to Map, and Set objects
        const contexts = new Map<string, ExpansionContext>(
          parsed.map((entry: [string, { expandedBloodRelations: string[]; expandedUnionIds: string[] }]) => [
            entry[0],
            {
              ...entry[1],
              expandedBloodRelations: new Set(entry[1].expandedBloodRelations),
              expandedUnionIds: new Set(entry[1].expandedUnionIds)
            }
          ])
        );
        setExpansionContexts(contexts);
      } catch (err) {
        console.error('[UnionBasedTreeCanvas] Failed to load expansion state:', err);
      }
    }
  }, [treeId]);

  // Save expansion state to session storage on change
  useEffect(() => {
    // Serialize Map and Set objects for storage
    const serialized = JSON.stringify(
      Array.from(expansionContexts.entries()).map(([key, value]) => [
        key,
        {
          ...value,
          expandedBloodRelations: Array.from(value.expandedBloodRelations),
          expandedUnionIds: Array.from(value.expandedUnionIds)
        }
      ])
    );
    sessionStorage.setItem(`tree-${treeId}-expansions`, serialized);
  }, [expansionContexts, treeId]);

  // ============================================================================
  // Export GEDCOM
  // ============================================================================

  const handleExportGedcom = async () => {
    try {
      await exportGedcom(treeId, treeName || 'family_tree');
      toast({
        title: 'Export successful',
        description: 'Your family tree has been exported as a GEDCOM file.',
        variant: 'success',
      });

    } catch (err) {
      toast({
        title: 'Export failed',
        description: 'An error occurred while exporting your family tree.',
        variant: 'destructive',
      });
    }
  };

  const handleExportCsv = async () => {
    try {
      await exportCsv(treeId, treeName || 'family_tree');
      toast({
        title: 'Export successful',
        description: 'Your family tree has been exported as a CSV file.',
        variant: 'success',
      });

    } catch (err) {
      toast({
        title: 'Export failed',
        description: 'An error occurred while exporting your family tree.',
        variant: 'destructive',
      });
    }
  };

  const handlePrintPdf = async () => {
    if (!canvasRef.current || !treeData) return;

    try {
      setIsExporting(true);
      setExportProgress(0);

      toast({
        title: 'Starting Multi-page Export',
        description: 'Generating tiled capture. Skipping empty sections...',
      });

      // 1. Save original view state to restore later
      const originalZoom = zoom;
      const originalPan = panOffset;
      const originalShowGrid = showGrid;
      const originalShowMinimap = showMinimap;

      // 2. Prepare for export: hide UI and set zoom for optimal density
      // 0.6 zoom fits approx 10 nodes horizontally on a 1200px tile
      const exportZoom = 0.6;
      setShowGrid(false);
      setShowMinimap(false);
      setZoom(exportZoom);

      // 3. Define tile size (A4-ish at high res)
      const tileW = 1200;
      const tileH = 1600;

      // 4. Calculate world-space bounds
      const padding = 100;
      const minX = bounds.minX - padding;
      const minY = bounds.minY - padding;
      const maxX = bounds.maxX + padding;
      const maxY = bounds.maxY + padding;

      const totalWidth = maxX - minX;
      const totalHeight = maxY - minY;

      // Calculate how much world space each tile covers at the export zoom
      const worldTileW = tileW / exportZoom;
      const worldTileH = tileH / exportZoom;

      const cols = Math.ceil(totalWidth / worldTileW);
      const rows = Math.ceil(totalHeight / worldTileH);

      // 5. Pre-filter tiles to find only those with content
      const validTiles: Array<{ r: number, c: number, x: number, y: number }> = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = minX + c * worldTileW;
          const y = minY + r * worldTileH;

          // Check if any person node is within this tile's world-space rectangle
          const hasNodes = treeData.persons.some(p => {
            const pos = positions.get(p.personId);
            if (!pos) return false;
            return pos.x >= x - 50 && pos.x <= x + worldTileW + 50 &&
              pos.y >= y - 50 && pos.y <= y + worldTileH + 50;
          });

          if (hasNodes) {
            validTiles.push({ r, c, x, y });
          }
        }
      }

      const totalPages = validTiles.length;
      if (totalPages === 0) {
        throw new Error('No content found to export');
      }

      console.log(`[Export] Tiling tree: ${totalWidth}x${totalHeight} -> ${totalPages} non-empty pages (out of ${rows * cols} potential)`);

      const pdf = new jsPDF({
        orientation: tileW > tileH ? 'landscape' : 'portrait',
        unit: 'px',
        format: [tileW, tileH]
      });

      // 6. Iterate through the valid tiles and capture
      for (let i = 0; i < validTiles.length; i++) {
        const { x, y } = validTiles[i];

        // Pan to the specific tile top-left in world space
        // ScreenPos = (WorldPos - x) * Zoom
        // To put WorldPos x at ScreenPos 0: PanOffset = -x * Zoom
        setPanOffset({ x: -x * exportZoom, y: -y * exportZoom });

        // Wait for React to render the new position and for any animations to settle
        await new Promise(res => setTimeout(res, 400));

        const dataUrl = await toPng(canvasRef.current, {
          backgroundColor: document.documentElement.classList.contains('dark') ? '#000000' : '#F2EFE9',
          width: tileW,
          height: tileH,
          quality: 1,
          pixelRatio: 1.5,
          style: {
            width: `${tileW}px`,
            height: `${tileH}px`,
          },
          filter: (node) => {
            if (node instanceof HTMLElement) {
              if (node.classList.contains('no-export')) return false;
              if (node.getAttribute('data-tutorial')) return false;
            }
            return true;
          }
        });

        // Add to PDF
        if (i > 0) {
          pdf.addPage([tileW, tileH], tileW > tileH ? 'landscape' : 'portrait');
        }
        pdf.addImage(dataUrl, 'PNG', 0, 0, tileW, tileH, undefined, 'FAST');

        setExportProgress(Math.round(((i + 1) / totalPages) * 100));
      }

      // 7. Save and clean up
      pdf.save(`${treeName || 'family_tree'}_full.pdf`);

      setZoom(originalZoom);
      setPanOffset(originalPan);
      setShowGrid(originalShowGrid);
      setShowMinimap(originalShowMinimap);
      setIsExporting(false);

      toast({
        title: 'Export Successful',
        description: `Captured ${totalPages} pages of your family tree.`,
        variant: 'success',
      });

    } catch (err) {
      console.error('[Export] Tiled PDF export failed:', err);
      setIsExporting(false);
      toast({
        title: 'Export failed',
        description: 'An error occurred during multi-page capture.',
        variant: 'destructive',
      });
    }
  };


  // ============================================================================
  // Responsive Layout: Handle Window Resize
  // ============================================================================

  useEffect(() => {
    if (customBreakpoint) return; // Skip resize if using a fixed custom breakpoint
    const handleResize = debounce(() => {
      const newBreakpoint = getBreakpoint(window.innerWidth);

      // Only update if breakpoint actually changed (not just window size)
      if (
        newBreakpoint.minWidth !== currentBreakpoint.minWidth ||
        newBreakpoint.personWidth !== currentBreakpoint.personWidth
      ) {
        console.log('[UnionBasedTreeCanvas] Breakpoint changed:', {
          from: currentBreakpoint.minWidth,
          to: newBreakpoint.minWidth,
          viewportWidth: window.innerWidth,
        });
        setCurrentBreakpoint(newBreakpoint);

        // Layout will recalculate automatically via the layout useEffect
        // which depends on currentBreakpoint
      }
    }, 300); // 300ms debounce to prevent excessive recalculations

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [currentBreakpoint, customBreakpoint]);

  // ============================================================================
  // Detect Collapsible Groups
  // ============================================================================

  useEffect(() => {
    if (!treeData) return;

    // Defer non-critical detection to avoid blocking initial render
    const timeoutId = setTimeout(() => {
      console.log('[UnionBasedTreeCanvas] Detecting collapsible groups (deferred)...');
      const groups = detectAllCollapsibleGroups(
        treeData.persons,
        treeData.unions,
        treeData.relationships
      );
      console.log('[UnionBasedTreeCanvas] Found collapsible groups:', groups.length);
      setAvailableGroups(groups);
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [treeData]);

  // ============================================================================
  // Compute Relationship Labels
  // ============================================================================

  useEffect(() => {
    if (!treeData) return;

    const homePerson = treeData.persons.find(p => p.isHomePerson);
    if (!homePerson) return;

    // Defer relationship label computation — not needed for initial render.
    // Use 500ms delay + requestIdleCallback so labels compute AFTER the tree
    // is interactive, not competing with initial layout paint.
    const timeoutId = setTimeout(() => {
      const doCompute = () => {
        Promise.all([
          getKinshipPatterns(locale),
          getGroupLabels(locale),
        ]).then(([patterns, groupLabels]) => {
          setLocaleGroupLabels(groupLabels);
          return computeRelationshipLabels(homePerson.personId, {
            persons: treeData.persons,
            unions: treeData.unions,
            relationships: treeData.relationships,
          }, patterns);
        })
          .then(labels => {
            setRelationshipLabels(labels);
          })
          .catch(err => {
            console.error('[UnionBasedTreeCanvas] Failed to compute relationship labels:', err);
          });
      };
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(doCompute);
      } else {
        doCompute();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [treeData, locale]);

  // ============================================================================
  // Progressive Disclosure: Compute Visible Set
  // ============================================================================

  useEffect(() => {
    if (!treeData) return;

    const homePerson = treeData.persons.find(p => p.isHomePerson);
    if (!homePerson) return;

    // Initialize focus navigation on first load, or update if home person changed
    const currentHomeId = focusNavigation.history.length > 0 ? focusNavigation.history[0]?.personId : null;
    if (focusNavigation.currentIndex === -1 || currentHomeId !== homePerson.personId) {
      setFocusNavigation(createInitialNavigation(
        homePerson.personId,
        [homePerson.firstName, homePerson.lastName].filter(name => name && name !== 'undefined').join(' ')
      ));
    }

    // All persons and unions visible — no per-node progressive disclosure
    const allPersonIds = new Set(treeData.persons.map(p => p.personId));
    const allUnionIds = new Set(treeData.unions.map(u => u.unionId));

    setDisclosureVisibleIds(allPersonIds);
    setDisclosureVisibleUnionIds(allUnionIds);
    setCollapseBubbles([]);
  }, [treeData, virtualFocusId, perNodeCollapse]);

  // ============================================================================
  // Progressive Disclosure: Per-Node Toggle Handlers
  // ============================================================================

  // "View their tree" — re-center on an in-law person
  const handleViewTheirTree = useCallback((personId: string) => {
    if (!treeData) return;
    const person = treeData.persons.find(p => p.personId === personId);
    if (!person) return;

    // Save current collapse state before switching
    const currentFocusId = virtualFocusId;
    if (perNodeCollapse.size > 0) {
      collapseStatePerFocusRef.current.set(currentFocusId, new Map(perNodeCollapse));
    }

    setFocusNavigation(prev =>
      navigateToFocus(prev, personId, [person.firstName, person.lastName].filter(name => name && name !== 'undefined').join(' '))
    );
    setVirtualFocusId(personId);

    // Restore saved collapse state for target focus
    const savedState = collapseStatePerFocusRef.current.get(personId) || new Map();
    setPerNodeCollapse(savedState);
  }, [treeData, virtualFocusId, perNodeCollapse]);

  // Breadcrumb navigation handlers
  const handleBreadcrumbNavigate = useCallback((index: number) => {
    const entry = focusNavigation.history[index];
    if (!entry) return;

    // Save current collapse state before switching
    const currentFocusId = virtualFocusId;
    if (perNodeCollapse.size > 0) {
      collapseStatePerFocusRef.current.set(currentFocusId, new Map(perNodeCollapse));
    }

    setFocusNavigation(prev => {
      const newHistory = prev.history.slice(0, index + 1);
      return {
        history: newHistory,
        currentIndex: index
      };
    });
    const newFocusId = index === 0 ? null : entry.personId;
    setVirtualFocusId(newFocusId);

    // Restore saved collapse state for target focus
    const savedState = collapseStatePerFocusRef.current.get(newFocusId) || new Map();
    setPerNodeCollapse(savedState);
  }, [focusNavigation, virtualFocusId, perNodeCollapse]);

  // Spouse toggle handler — show/hide a union (and its spouse + children)
  const handleToggleSpouseVisibility = useCallback((unionId: string, visible: boolean) => {
    setHiddenSpouseUnionIds(prev => {
      const next = new Set(prev);
      if (visible) next.delete(unionId);
      else next.add(unionId);
      return next;
    });
  }, []);

  const handleBreadcrumbHome = useCallback(() => {
    // Save current collapse state before switching
    const currentFocusId = virtualFocusId;
    if (perNodeCollapse.size > 0) {
      collapseStatePerFocusRef.current.set(currentFocusId, new Map(perNodeCollapse));
    }

    setFocusNavigation(prev => {
      const newHistory = prev.history.slice(0, 1);
      return {
        history: newHistory,
        currentIndex: 0
      };
    });
    setVirtualFocusId(null);

    // Restore saved collapse state for home focus (null)
    const savedState = collapseStatePerFocusRef.current.get(null) || new Map();
    setPerNodeCollapse(savedState);
  }, [virtualFocusId, perNodeCollapse]);

  // ============================================================================
  // Session Storage for Progressive Disclosure
  // ============================================================================

  // Save per-node collapse state to session storage
  useEffect(() => {
    if (perNodeCollapse.size > 0) {
      const serialized = JSON.stringify(
        Array.from(perNodeCollapse.entries())
      );
      sessionStorage.setItem(`tree-${treeId}-perNodeCollapse`, serialized);
    } else {
      sessionStorage.removeItem(`tree-${treeId}-perNodeCollapse`);
    }
  }, [perNodeCollapse, treeId]);

  // Save focus navigation to session storage
  useEffect(() => {
    if (focusNavigation.currentIndex >= 0) {
      sessionStorage.setItem(
        `tree-${treeId}-focusNav`,
        JSON.stringify(focusNavigation)
      );
    }
  }, [focusNavigation, treeId]);

  // Load from session storage on mount
  useEffect(() => {
    // Load per-node collapse
    const savedCollapse = sessionStorage.getItem(`tree-${treeId}-perNodeCollapse`);
    if (savedCollapse) {
      try {
        const parsed = JSON.parse(savedCollapse);
        setPerNodeCollapse(new Map(parsed));
      } catch { /* ignore */ }
    }

    // Load focus navigation
    const savedNav = sessionStorage.getItem(`tree-${treeId}-focusNav`);
    if (savedNav) {
      try {
        const parsed = JSON.parse(savedNav);
        if (parsed && Array.isArray(parsed.history)) {
          parsed.history = parsed.history.map((h: any) => ({
            ...h,
            personName: h.personName ? h.personName.split(' ').filter((n: string) => n && n !== 'undefined').join(' ') : ''
          }));
        }
        setFocusNavigation(parsed);
        if (parsed.currentIndex > 0) {
          setVirtualFocusId(parsed.history[parsed.currentIndex]?.personId || null);
        }
      } catch { /* ignore */ }
    }
  }, [treeId]);

  // ============================================================================
  // Pre-built Relationship Lookup Maps (O(1) lookups instead of O(r) scans)
  // ============================================================================

  const { partnersByUnion, childrenByUnion, unionsByPerson } = useMemo(() => {
    const pbu = new Map<string, string[]>();
    const cbu = new Map<string, string[]>();
    const ubp = new Map<string, string[]>();
    if (!treeData) return { partnersByUnion: pbu, childrenByUnion: cbu, unionsByPerson: ubp };
    for (const r of treeData.relationships) {
      if (r.type === 'PARTNER_IN') {
        const list = pbu.get(r.toId);
        if (list) list.push(r.fromId); else pbu.set(r.toId, [r.fromId]);
        const ulist = ubp.get(r.fromId);
        if (ulist) ulist.push(r.toId); else ubp.set(r.fromId, [r.toId]);
      } else if (r.type === 'HAS_CHILD') {
        const list = cbu.get(r.fromId);
        if (list) list.push(r.toId); else cbu.set(r.fromId, [r.toId]);
      }
    }
    return { partnersByUnion: pbu, childrenByUnion: cbu, unionsByPerson: ubp };
  }, [treeData]);

  // ============================================================================
  // Ancestry-style Lineage Detection (must be BEFORE layout useEffect)
  // ============================================================================

  // Ancestry-style view filtering:
  // 1. lineageIds = focus person's birth-connected relatives (ancestors, descendants, siblings)
  // 2. directSpouseIds = persons married to a lineage member but not in lineage themselves
  // 3. spouseAncestorIds = parents/ancestors of spouses — HIDDEN from main view,
  //    only visible when navigating to the spouse's own family view via parent nav icons
  //
  // Main view shows: lineageIds ∪ directSpouseIds
  // Parent nav icons appear on: directSpouseIds
  // Hidden from main view: everyone else (spouseAncestorIds, etc.)
  const { lineageIds, directSpouseIds, spousesWithExpandedChildren } = useMemo(() => {
    const empty = { lineageIds: new Set<string>(), directSpouseIds: new Set<string>(), lineageViewHiddenIds: new Set<string>(), spousesWithExpandedChildren: new Set<string>() };
    if (!treeData) return empty;
    const focusId = virtualFocusId || treeData.persons.find(p => p.isHomePerson)?.personId;
    if (!focusId) return empty;

    const lineage = detectFocusLineage(focusId, treeData);

    // Find direct spouses: persons with PARTNER_IN to a lineage member, but not in lineage
    const spouses = new Set<string>();
    for (const r of treeData.relationships) {
      if (r.type === 'PARTNER_IN') {
        if (!lineage.has(r.fromId)) {
          const partnersInSameUnion = (partnersByUnion.get(r.toId) ?? []).filter(pid => pid !== r.fromId);
          if (partnersInSameUnion.some(pid => lineage.has(pid))) {
            spouses.add(r.fromId);
          }
        }
      }
    }

    // Everyone not in lineage and not a direct spouse → hidden from main view
    const hidden = new Set<string>();
    for (const p of treeData.persons) {
      if (!lineage.has(p.personId) && !spouses.has(p.personId)) {
        hidden.add(p.personId);
      }
    }

    // Spouses whose children were explicitly expanded via chevron click
    const expandedSpouses = new Set<string>();
    if (collapsedUnionIds.size > 0) {
      for (const spouseId of spouses) {
        const spouseUnionIds = unionsByPerson.get(spouseId) ?? [];
        for (const uid of spouseUnionIds) {
          const children = childrenByUnion.get(uid);
          if (children && children.length > 0 && !collapsedUnionIds.has(uid)) {
            expandedSpouses.add(spouseId);
          }
        }
      }
    }

    return { lineageIds: lineage, directSpouseIds: spouses, lineageViewHiddenIds: hidden, spousesWithExpandedChildren: expandedSpouses };
  }, [treeData, virtualFocusId, collapsedUnionIds, partnersByUnion, unionsByPerson, childrenByUnion]);

  // ============================================================================
  // Recalculate Layout with Collapsing
  // ============================================================================

  // ============================================================================
  // Calculate Layout Once (for all nodes)
  // ============================================================================

  useEffect(() => {
    if (!treeData) return;
    // In Vamshavali mode, wait until the visible set is computed before layout
    if (layoutMode === 'vamshavali' && !vamshavaliVisible) return;

    const calculateInitialLayout = async () => {
      try {
        const layoutT0 = performance.now();
        console.log('[UnionBasedTreeCanvas] Calculating layout for all nodes...');

        // Apply collapse filtering for collapsible groups only (sibling chains)
        // NOTE: Union collapse (chevron arrows) is NOT applied to the layout.
        // All nodes remain in the layout graph to keep positions stable.
        // Collapsed descendants are hidden visually in the render layer,
        // not removed from layout. This prevents node displacement on collapse/expand.
        let { filteredData, placeholderNodes: newPlaceholders } =
          filterCollapsedSubtrees(treeData, collapsedGroups);

        // Compute hidden descendants for rendering (but NOT for layout)
        let collapsedDescendantIds = new Set<string>();
        if (collapsedUnionIds.size > 0) {
          collapsedDescendantIds = collectDescendants(filteredData, collapsedUnionIds);
        }

        // Store for render-layer hiding (NOT removed from layout data)
        setHiddenByCollapse(collapsedDescendantIds);

        setPlaceholderNodes(newPlaceholders);

        // Ancestry-style lineage filtering: when viewing a spouse's family tree
        // (via parent nav icon click), filter layout data to only include that
        // person's lineage + their direct spouses. This ensures the layout engine
        // calculates positions for only the visible nodes, with no gaps.
        // Ancestry-style lineage filtering: use the STABLE lineageIds + directSpouseIds
        // from the useMemo (computed once per virtualFocusId change), not a fresh
        // detectFocusLineage call which can oscillate due to normalization.
        if (lineageIds.size > 0) {
          const visibleIds = new Set([...lineageIds, ...directSpouseIds]);
          // Filter from treeData (full graph) to include all lineage members
          filteredData = {
            persons: treeData.persons.filter(p => visibleIds.has(p.personId)),
            unions: treeData.unions.filter(u => {
              const partners = treeData.relationships
                .filter(r => r.type === 'PARTNER_IN' && r.toId === u.unionId)
                .map(r => r.fromId);
              return partners.some(pid => visibleIds.has(pid));
            }),
            relationships: treeData.relationships.filter(r => {
              if (r.type === 'PARTNER_IN') return visibleIds.has(r.fromId);
              if (r.type === 'HAS_CHILD') return visibleIds.has(r.toId);
              return true;
            }),
          };
        }

        // Also remove chevron-collapsed descendants from layout data.
        // Unlike the previous render-layer hiding, this ensures the layout engine
        // recalculates positions without gaps when chevrons are toggled.
        if (collapsedUnionIds.size > 0) {
          const collapsedDescendantIds = collectDescendants(filteredData, collapsedUnionIds);
          if (collapsedDescendantIds.size > 0) {
            filteredData = {
              persons: filteredData.persons.filter(p => !collapsedDescendantIds.has(p.personId)),
              unions: filteredData.unions.filter(u => !collapsedDescendantIds.has(u.unionId)),
              relationships: filteredData.relationships.filter(r =>
                !collapsedDescendantIds.has(r.fromId) && !collapsedDescendantIds.has(r.toId)
              ),
            };
          }
        }

        // Remove spouses hidden via spouse toggle (multiple marriage toggle)
        if (hiddenSpouseUnionIds.size > 0) {
          // Collect persons to hide: spouses + all descendants of hidden unions
          const hiddenBySpouseToggle = new Set<string>();
          
          // Get all descendants (children, grandchildren, their spouses, their unions)
          const hiddenDescendants = collectDescendants(filteredData, hiddenSpouseUnionIds);
          hiddenDescendants.forEach(id => hiddenBySpouseToggle.add(id));

          for (const unionId of hiddenSpouseUnionIds) {
            // Find the spouse in this union (partner who is NOT a lineage member)
            const partners = filteredData.relationships
              .filter(r => r.type === 'PARTNER_IN' && r.toId === unionId)
              .map(r => r.fromId);
            for (const pid of partners) {
              // Check if this partner is a primary person with multiple marriages in the tree.
              // If they have multiple marriages/partnerships, they must never be hidden.
              const personUnionIds = unionsByPerson.get(pid) ?? [];
              const personUnions = personUnionIds
                .map(uid => treeData.unions.find(u => u.unionId === uid))
                .filter((u): u is Union => u !== undefined);
              const marriagesCount = personUnions.filter(u => u.type === 'marriage' || u.type === 'partnership').length;
              if (marriagesCount >= 2) {
                continue;
              }

              // Only hide if this person has no OTHER visible unions
              const allUnions = filteredData.relationships
                .filter(r => r.type === 'PARTNER_IN' && r.fromId === pid)
                .map(r => r.toId);
              const hasVisibleUnion = allUnions.some(uid => !hiddenSpouseUnionIds.has(uid));
              if (!hasVisibleUnion) hiddenBySpouseToggle.add(pid);
            }
          }
          if (hiddenBySpouseToggle.size > 0 || hiddenSpouseUnionIds.size > 0) {
            filteredData = {
              persons: filteredData.persons.filter(p => !hiddenBySpouseToggle.has(p.personId)),
              unions: filteredData.unions.filter(u => !hiddenSpouseUnionIds.has(u.unionId) && !hiddenBySpouseToggle.has(u.unionId)),
              relationships: filteredData.relationships.filter(r =>
                !hiddenBySpouseToggle.has(r.fromId) && !hiddenBySpouseToggle.has(r.toId) &&
                !hiddenSpouseUnionIds.has(r.toId) && !hiddenSpouseUnionIds.has(r.fromId)
              ),
            };
          }
        }

        // Apply paternal / maternal side filter
        if (sideFilter !== 'all') {
          const homePerson = filteredData.persons.find(p => p.isHomePerson);
          if (homePerson) {
            const sideIds = sideFilter === 'paternal'
              ? getPaternalSideIds(filteredData.persons, filteredData.unions, filteredData.relationships, homePerson)
              : getMaternalSideIds(filteredData.persons, filteredData.unions, filteredData.relationships, homePerson);

            filteredData = {
              persons: filteredData.persons.filter(p => sideIds.has(p.personId)),
              unions: filteredData.unions.filter(u => {
                const partners = filteredData.relationships.filter(r => r.type === 'PARTNER_IN' && r.toId === u.unionId);
                return partners.some(r => sideIds.has(r.fromId));
              }),
              relationships: filteredData.relationships.filter(r => {
                if (r.type === 'PARTNER_IN') return sideIds.has(r.fromId);
                if (r.type === 'HAS_CHILD') return sideIds.has(r.toId);
                return true;
              }),
            };
          }
        }

        // ── Vamshavali mode: filter to only visible persons/unions ──
        if (layoutMode === 'vamshavali' && vamshavaliVisible) {
          filteredData = {
            persons: filteredData.persons.filter(p => vamshavaliVisible.visiblePersonIds.has(p.personId)),
            unions: filteredData.unions.filter(u => vamshavaliVisible.visibleUnionIds.has(u.unionId)),
            relationships: filteredData.relationships.filter(r => {
              if (r.type === 'PARTNER_IN') return vamshavaliVisible.visiblePersonIds.has(r.fromId) && vamshavaliVisible.visibleUnionIds.has(r.toId);
              if (r.type === 'HAS_CHILD') return vamshavaliVisible.visibleUnionIds.has(r.fromId) && vamshavaliVisible.visiblePersonIds.has(r.toId);
              return vamshavaliVisible.visiblePersonIds.has(r.fromId) && vamshavaliVisible.visiblePersonIds.has(r.toId);
            }),
          };
        }

        // ── Undirected reachability BFS to prune disconnected/floating ancestor nodes ──
        if (filteredData.persons.length > 0) {
          const focusId = virtualFocusId || treeData.persons.find(p => p.isHomePerson)?.personId;
          let startPersonId = focusId;
          if (!startPersonId || !filteredData.persons.some(p => p.personId === startPersonId)) {
            const homePerson = filteredData.persons.find(p => p.isHomePerson);
            if (homePerson && filteredData.persons.some(p => p.personId === homePerson.personId)) {
              startPersonId = homePerson.personId;
            } else {
              startPersonId = filteredData.persons[0].personId;
            }
          }

          // Build adjacency structures for undirected graph search
          const personToUnions = new Map<string, Set<string>>();
          const unionToPersons = new Map<string, Set<string>>();

          for (const r of filteredData.relationships) {
            if (r.type === 'PARTNER_IN') {
              if (!personToUnions.has(r.fromId)) personToUnions.set(r.fromId, new Set());
              personToUnions.get(r.fromId)!.add(r.toId);

              if (!unionToPersons.has(r.toId)) unionToPersons.set(r.toId, new Set());
              unionToPersons.get(r.toId)!.add(r.fromId);
            } else if (r.type === 'HAS_CHILD') {
              if (!personToUnions.has(r.toId)) personToUnions.set(r.toId, new Set());
              personToUnions.get(r.toId)!.add(r.fromId);

              if (!unionToPersons.has(r.fromId)) unionToPersons.set(r.fromId, new Set());
              unionToPersons.get(r.fromId)!.add(r.toId);
            }
          }

          const visitedPersons = new Set<string>();
          const visitedUnions = new Set<string>();
          const queue: string[] = [];

          // Start BFS from focus person if visible
          const isFocusVisible = focusId && filteredData.persons.some(p => p.personId === focusId);
          if (isFocusVisible && focusId) {
            queue.push(focusId);
            visitedPersons.add(focusId);
          }

          // Add partners of collapsed unions to the start queue to prevent them from being pruned
          if (collapsedUnionIds.size > 0) {
            for (const unionId of collapsedUnionIds) {
              const partners = filteredData.relationships
                .filter(r => r.type === 'PARTNER_IN' && r.toId === unionId)
                .map(r => r.fromId);
              for (const pid of partners) {
                if (filteredData.persons.some(p => p.personId === pid) && !visitedPersons.has(pid)) {
                  queue.push(pid);
                  visitedPersons.add(pid);
                }
              }
            }
          }

          // Fallback to startPersonId only if no other start node was added
          if (queue.length === 0 && startPersonId) {
            queue.push(startPersonId);
            visitedPersons.add(startPersonId);
          }

          while (queue.length > 0) {
            const currentPerson = queue.shift()!;
            const connectedUnions = personToUnions.get(currentPerson) ?? new Set();

            for (const uid of connectedUnions) {
              if (!visitedUnions.has(uid)) {
                visitedUnions.add(uid);
                const connectedPersons = unionToPersons.get(uid) ?? new Set();
                for (const pid of connectedPersons) {
                  if (!visitedPersons.has(pid)) {
                    visitedPersons.add(pid);
                    queue.push(pid);
                  }
                }
              }
            }
          }

          const unreachablePersonIds = new Set<string>();
          const unreachableUnionIds = new Set<string>();

          for (const p of filteredData.persons) {
            if (!visitedPersons.has(p.personId)) unreachablePersonIds.add(p.personId);
          }
          for (const u of filteredData.unions) {
            if (!visitedUnions.has(u.unionId)) unreachableUnionIds.add(u.unionId);
          }

          if (unreachablePersonIds.size > 0 || unreachableUnionIds.size > 0) {
            console.log('[UnionBasedTreeCanvas] Pruning disconnected/floating nodes:', {
              persons: Array.from(unreachablePersonIds),
              unions: Array.from(unreachableUnionIds)
            });

            filteredData = {
              persons: filteredData.persons.filter(p => !unreachablePersonIds.has(p.personId)),
              unions: filteredData.unions.filter(u => !unreachableUnionIds.has(u.unionId)),
              relationships: filteredData.relationships.filter(r =>
                !unreachablePersonIds.has(r.fromId) && !unreachablePersonIds.has(r.toId) &&
                !unreachableUnionIds.has(r.fromId) && !unreachableUnionIds.has(r.toId)
              ),
            };

            // Add pruned nodes to hiddenByCollapse to ensure they don't render
            setHiddenByCollapse(prev => {
              const updated = new Set(prev);
              unreachablePersonIds.forEach(id => updated.add(id));
              unreachableUnionIds.forEach(id => updated.add(id));
              return updated;
            });
          }
        }

        // Calculate layout with visible nodes only
        // Using responsive breakpoint constants for mobile/tablet/desktop
        if (filteredData.persons.length > 0) {
          let layoutResult;
          const trueHomePerson = treeData?.persons.find(p => p.isHomePerson);
          const trueHomePersonId = trueHomePerson?.personId;
          const homePersonId = filteredData.persons.find(p => p.isHomePerson)?.personId || trueHomePersonId;

          if (layoutMode === 'pedigree' && homePersonId) {
            layoutResult = await calculateFamilyTreeLayout({
              persons: filteredData.persons,
              unions: filteredData.unions,
              relationships: filteredData.relationships,
              layoutConstants: currentBreakpoint,
              direction: 'RIGHT',
              homePersonId: trueHomePersonId,
            });
          } else if (layoutMode === 'descendant' && homePersonId) {
            layoutResult = await calculateFamilyTreeLayout({
              persons: filteredData.persons,
              unions: filteredData.unions,
              relationships: filteredData.relationships,
              layoutConstants: currentBreakpoint,
              homePersonId: trueHomePersonId,
            });
          } else {
            // Always do full layout — custom engine is fast enough (4ms for 56 nodes)
            // Incremental layout was an optimization for ELK (800ms+) that caused
            // bugs with node visibility after add/remove operations.
            layoutResult = await calculateFamilyTreeLayout({
              persons: filteredData.persons,
              unions: filteredData.unions,
              relationships: filteredData.relationships,
              layoutConstants: currentBreakpoint,
              homePersonId: trueHomePersonId,
            });
          }

          setPositions(layoutResult.positions);
          setBounds(layoutResult.bounds);

          // ── Split-view: compute dual-side layout with duplicate nodes ──
          if (splitView && treeData) {
            const homePerson = treeData.persons.find(p => p.isHomePerson);
            if (homePerson) {
              const paternalIds = getPaternalSideIds(treeData.persons, treeData.unions, treeData.relationships, homePerson);
              const maternalIds = getMaternalSideIds(treeData.persons, treeData.unions, treeData.relationships, homePerson);
              const shared = new Set<string>();
              for (const id of paternalIds) {
                if (maternalIds.has(id) && id !== homePerson.personId) shared.add(id);
              }
              setSplitPersonIds(shared);

              // Run paternal layout
              const pPersons = treeData.persons.filter(p => paternalIds.has(p.personId));
              const pResult = await calculateFamilyTreeLayout({
                persons: pPersons,
                unions: treeData.unions.filter(u => {
                  const ps = treeData.relationships.filter(r => r.type === 'PARTNER_IN' && r.toId === u.unionId);
                  return ps.some(r => paternalIds.has(r.fromId));
                }),
                relationships: treeData.relationships.filter(r =>
                  r.type === 'PARTNER_IN' ? paternalIds.has(r.fromId) : paternalIds.has(r.toId)
                ),
                layoutConstants: currentBreakpoint,
                homePersonId: trueHomePersonId,
              });

              // Run maternal layout
              const mPersons = treeData.persons.filter(p => maternalIds.has(p.personId));
              const mResult = await calculateFamilyTreeLayout({
                persons: mPersons,
                unions: treeData.unions.filter(u => {
                  const ps = treeData.relationships.filter(r => r.type === 'PARTNER_IN' && r.toId === u.unionId);
                  return ps.some(r => maternalIds.has(r.fromId));
                }),
                relationships: treeData.relationships.filter(r =>
                  r.type === 'PARTNER_IN' ? maternalIds.has(r.fromId) : maternalIds.has(r.toId)
                ),
                layoutConstants: currentBreakpoint,
                homePersonId: trueHomePersonId,
              });

              // Offset paternal to left, maternal to right with a gap between them
              const SPLIT_GAP = 200;
              const pWidth = pResult.bounds.maxX - pResult.bounds.minX + (currentBreakpoint?.personWidth ?? 180);
              const mOffsetX = pWidth + SPLIT_GAP;

              const mergedSplitPositions = new Map<string, Position>();
              for (const [pid, pos] of pResult.positions) {
                mergedSplitPositions.set(`${pid}__paternal`, { x: pos.x, y: pos.y });
              }
              for (const [pid, pos] of mResult.positions) {
                mergedSplitPositions.set(`${pid}__maternal`, { x: pos.x + mOffsetX, y: pos.y });
              }
              setSplitPositions(mergedSplitPositions);
            }
          } else {
            setSplitPositions(new Map());
            setSplitPersonIds(new Set());
          }

          // Pan correction: keep the anchor node at the same screen position
          // after collapse/expand re-layout.
          // screenPos = panOffset + nodePos * zoom  →  panOffset = screenPos - nodePos * zoom
          const hadCollapseAnchor = !!collapseAnchorRef.current;
          if (collapseAnchorRef.current) {
            const anchor = collapseAnchorRef.current;
            const newPos = layoutResult.positions.get(anchor.personId);
            if (newPos) {
              const correctedPan = {
                x: anchor.screenX - newPos.x * anchor.zoom,
                y: anchor.screenY - newPos.y * anchor.zoom,
              };
              setPanOffset(correctedPan);
              panOffsetRef.current = correctedPan;
            }
            collapseAnchorRef.current = null;
          }

          const layoutElapsed = Math.round(performance.now() - layoutT0);
          console.log(`[UnionBasedTreeCanvas] Layout calculated in ${layoutElapsed}ms:`, {
            totalPersons: filteredData.persons.length,
            placeholders: newPlaceholders.length,
            breakpoint: `${currentBreakpoint.minWidth}px+`,
            cardSize: `${currentBreakpoint.personWidth}x${currentBreakpoint.personHeight}`,
          });

          // Detect newly added person (only when reloading, not on initial load)
          // Skip when collapse/expand triggered the re-layout
          if (prevPersonIdsRef.current.size > 0 && !hadCollapseAnchor) {
            const newPersonId = filteredData.persons.find(
              p => !prevPersonIdsRef.current.has(p.personId)
            )?.personId;

            if (newPersonId && canvasRef.current) {
              const newPos = layoutResult.positions.get(newPersonId);
              if (newPos) {
                const canvasWidth = canvasRef.current.clientWidth;
                const canvasHeight = canvasRef.current.clientHeight;

                // Center the new node in the viewport at current zoom level
                setPanOffset({
                  x: canvasWidth / 2 - (newPos.x + currentBreakpoint.personWidth / 2) * zoom,
                  y: canvasHeight / 2 - (newPos.y + currentBreakpoint.personHeight / 2) * zoom,
                });

                // Highlight the new person for 3 seconds
                setRecentlyAddedPersonId(newPersonId);
                setTimeout(() => setRecentlyAddedPersonId(null), 3000);

                console.log('[UnionBasedTreeCanvas] Auto-scrolled to new person:', newPersonId);
              }
            }

            // Reset snapshot after processing
            prevPersonIdsRef.current = new Set();
          }

          // Center the view on the entry person (focus person or home person)
          // when switching trees or focus nodes, while preserving current zoom.
          const entryPersonId = virtualFocusId || filteredData.persons.find(p => p.isHomePerson)?.personId;
          const isTreeOrFocusSwitch =
            lastCenteredPersonIdRef.current !== entryPersonId ||
            lastCenteredTreeIdRef.current !== treeId;

          if (isTreeOrFocusSwitch && !hadCollapseAnchor) {
            const canvasWidth = canvasRef.current?.clientWidth || window.innerWidth - 280;
            const canvasHeight = canvasRef.current?.clientHeight || window.innerHeight - 100;

            let activeZoom = zoom;

            // If we don't have a preserved zoom yet, calculate the optimal zoom to fit tree bounds
            if (lastKnownZoom === null) {
              const viewportPadding = 100; // 100px padding on all sides
              const availableWidth = canvasWidth - (viewportPadding * 2);
              const availableHeight = canvasHeight - (viewportPadding * 2);

              const zoomX = availableWidth / layoutResult.bounds.width;
              const zoomY = availableHeight / layoutResult.bounds.height;

              const optimalZoom = Math.min(zoomX, zoomY, 1.0); // Cap at 1.0
              activeZoom = Math.max(optimalZoom, 0.3); // Minimum 0.3 for legibility
              setZoom(activeZoom);
              lastKnownZoom = activeZoom;
            }

            // Find position of the entry person
            const entryPersonPos = entryPersonId ? layoutResult.positions.get(entryPersonId) : null;

            if (entryPersonPos) {
              // Center entry person in viewport (accounting for zoom and responsive card size)
              const centerX = canvasWidth / 2 - (entryPersonPos.x + currentBreakpoint.personWidth / 2) * activeZoom;
              const centerY = canvasHeight / 2 - (entryPersonPos.y + currentBreakpoint.personHeight / 2) * activeZoom;
              setPanOffset({ x: centerX, y: centerY });
              lastCenteredPersonIdRef.current = entryPersonId || null;
              lastCenteredTreeIdRef.current = treeId;
            } else {
              // Fallback: center tree bounds (accounting for zoom)
              const centerX = canvasWidth / 2 - (layoutResult.bounds.width / 2) * activeZoom;
              const centerY = canvasHeight / 2 - (layoutResult.bounds.height / 2) * activeZoom;
              setPanOffset({ x: centerX, y: centerY });
              lastCenteredPersonIdRef.current = entryPersonId || null;
              lastCenteredTreeIdRef.current = treeId;
            }
          }
        }
      } catch (err) {
        console.error('Failed to calculate layout:', err);
      }
    };

    calculateInitialLayout();
  }, [treeData, treeId, collapsedGroups, collapsedUnionIds, currentBreakpoint, layoutMode, virtualFocusId, hiddenSpouseUnionIds, lineageIds, directSpouseIds, sideFilter, splitView, vamshavaliVisible, unionsByPerson]); // Layout recalculates on data/mode/focus/spouse-toggle/lineage/vamshavali changes

  // ============================================================================
  // Update Visible/Expandable Persons (without recalculating layout)
  // ============================================================================

  useEffect(() => {
    if (!treeData) return;

    console.log('[UnionBasedTreeCanvas] Updating visible persons...', {
      bloodRelationMode,
      expansionCount: expansionContexts.size
    });

    if (bloodRelationMode === 'blood-only') {
      const primaryPersonId = treeData.persons.find(p => p.isHomePerson)?.personId;

      if (primaryPersonId) {
        const { filteredData, expandablePersons: expandable } =
          filterByBloodRelationsWithExpansions(
            treeData,
            primaryPersonId,
            expansionContexts
          );

        setExpandablePersons(expandable);

        // Set visible person IDs
        const visible = new Set(filteredData.persons.map(p => p.personId));
        setVisiblePersonIds(visible);

        console.log('[UnionBasedTreeCanvas] Visible persons updated:', {
          visibleCount: visible.size,
          expandableCount: expandable.size,
          expandableIds: Array.from(expandable.keys())
        });
      }
    } else {
      // In "all" mode, show all persons
      const allIds = new Set(treeData.persons.map(p => p.personId));
      setVisiblePersonIds(allIds);
      setExpandablePersons(new Map());

      console.log('[UnionBasedTreeCanvas] Showing all persons:', allIds.size);
    }
  }, [treeData, bloodRelationMode, expansionContexts]);

  // Combined set of ALL hidden person IDs (collapse + blood-relation filter)
  // Used by UnionEdgeGroup to hide edges to invisible nodes
  const allHiddenPersonIds = useMemo(() => {
    const combined = new Set(hiddenByCollapse);
    if (bloodRelationMode === 'blood-only' && treeData) {
      treeData.persons.forEach(p => {
        if (!visiblePersonIds.has(p.personId)) combined.add(p.personId);
      });
    }
    return combined;
  }, [hiddenByCollapse, visiblePersonIds, bloodRelationMode, treeData]);

  // ============================================================================
  // Performance: Memoized render-layer computations
  // (Must be BEFORE any early returns to satisfy Rules of Hooks)
  // ============================================================================

  // Memoize visible unions list (avoids re-filtering on every render)
  const visibleUnions = useMemo(() => {
    if (!treeData) return [];
    return treeData.unions.filter(union => {
      if (allHiddenPersonIds.has(union.unionId)) return false;
      if (layoutMode === 'vamshavali' && vamshavaliVisible && !vamshavaliVisible.visibleUnionIds.has(union.unionId)) return false;
      if (bloodRelationMode === 'all') return true;
      const partners = partnersByUnion.get(union.unionId) ?? [];
      const children = childrenByUnion.get(union.unionId) ?? [];
      const allPartnersVisible = partners.every(p => visiblePersonIds.has(p));
      const hasVisibleChild = children.length === 0 || children.some(c => visiblePersonIds.has(c));
      return allPartnersVisible && hasVisibleChild;
    });
  }, [treeData, allHiddenPersonIds, bloodRelationMode, visiblePersonIds, partnersByUnion, childrenByUnion, layoutMode, vamshavaliVisible]);

  // Memoize visible persons list (avoids re-filtering on every render)
  const visiblePersonsList = useMemo(() => {
    if (!treeData) return [];
    return treeData.persons.filter(person => {
      if (allHiddenPersonIds.has(person.personId)) return false;
      if (layoutMode === 'vamshavali' && vamshavaliVisible && !vamshavaliVisible.visiblePersonIds.has(person.personId)) return false;
      if (bloodRelationMode === 'blood-only' && !visiblePersonIds.has(person.personId)) return false;
      return true;
    });
  }, [treeData, allHiddenPersonIds, bloodRelationMode, visiblePersonIds, layoutMode, vamshavaliVisible]);

  // Memoize spouse list map (avoids per-card inline computation)
  const spouseListMap = useMemo(() => {
    const map = new Map<string, Array<{ unionId: string; spouseName: string; gender: string; isVisible: boolean }> | undefined>();
    if (!treeData) return map;
    const personMap = new Map(treeData.persons.map(p => [p.personId, p]));
    for (const person of treeData.persons) {
      const personUnionIds = unionsByPerson.get(person.personId) ?? [];
      const personUnions = personUnionIds
        .map(uid => treeData.unions.find(u => u.unionId === uid))
        .filter((u): u is Union => u !== undefined);
      const marriages = personUnions.filter(u => u.type === 'marriage' || u.type === 'partnership');
      if (marriages.length < 2) { map.set(person.personId, undefined); continue; }
      const entries = marriages.map(u => {
        const partners = partnersByUnion.get(u.unionId) ?? [];
        const partnerId = partners.find(pid => pid !== person.personId);
        const spouse = partnerId ? personMap.get(partnerId) : null;
        return {
          unionId: u.unionId,
          spouseName: spouse ? `${spouse.firstName || ''} ${spouse.lastName || ''}`.trim() || 'Unknown' : 'Unknown',
          gender: spouse?.gender || 'other',
          isVisible: !hiddenSpouseUnionIds.has(u.unionId),
        };
      });
      map.set(person.personId, entries);
    }
    return map;
  }, [treeData, unionsByPerson, partnersByUnion, hiddenSpouseUnionIds]);

  // Memoize person unions map (avoids per-card getPersonUnions call)
  const personUnionsMap = useMemo(() => {
    const map = new Map<string, Union[]>();
    if (!treeData) return map;
    for (const person of treeData.persons) {
      const uids = unionsByPerson.get(person.personId) ?? [];
      const unions = uids
        .map(uid => treeData.unions.find(u => u.unionId === uid))
        .filter((u): u is Union => u !== undefined);
      map.set(person.personId, unions);
    }
    return map;
  }, [treeData, unionsByPerson]);

  // Memoize home person lookup (used in multiple render paths)
  const homePerson = useMemo(() => {
    return treeData?.persons.find(p => p.isHomePerson) ?? null;
  }, [treeData]);

  // Viewport culling: only render nodes visible in the current viewport
  const isInViewport = useCallback((pos: Position) => {
    if (isExporting) return true;
    const cw = canvasRef.current?.clientWidth ?? 1200;
    const ch = canvasRef.current?.clientHeight ?? 800;
    const viewLeft = -panOffset.x / zoom;
    const viewTop = -panOffset.y / zoom;
    const viewRight = viewLeft + cw / zoom;
    const viewBottom = viewTop + ch / zoom;
    const pw = currentBreakpoint?.personWidth ?? LAYOUT_CONSTANTS.PERSON_WIDTH;
    const ph = currentBreakpoint?.personHeight ?? LAYOUT_CONSTANTS.PERSON_HEIGHT;
    const margin = 300; // generous render buffer
    return pos.x + pw > viewLeft - margin &&
      pos.x < viewRight + margin &&
      pos.y + ph > viewTop - margin &&
      pos.y < viewBottom + margin;
  }, [panOffset, zoom, currentBreakpoint]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handlePersonClick = useCallback(
    (personId: string) => {
      dismissPreview();
      setSelectedPersonId(personId);
      onPersonClick?.(personId);
    },
    [onPersonClick, dismissPreview]
  );

  // Shared zoom helper: keeps the selected node (or tree center) pinned
  // at the center of the viewport while changing zoom level
  const zoomBy = useCallback((delta: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const canvasW = rect?.width ?? window.innerWidth;
    const canvasH = rect?.height ?? window.innerHeight;
    const pw = currentBreakpoint?.personWidth ?? LAYOUT_CONSTANTS.PERSON_WIDTH;
    const ph = currentBreakpoint?.personHeight ?? LAYOUT_CONSTANTS.PERSON_HEIGHT;

    // World-space focal point: selected node center or tree center
    let worldX: number;
    let worldY: number;
    const selectedPos = selectedPersonId ? positions.get(selectedPersonId) : null;
    if (selectedPos) {
      worldX = selectedPos.x + pw / 2;
      worldY = selectedPos.y + ph / 2;
    } else {
      worldX = (bounds.minX + bounds.maxX) / 2;
      worldY = (bounds.minY + bounds.maxY) / 2;
    }

    setZoom((prevZoom) => {
      const newZoom = Math.max(LAYOUT_CONSTANTS.MIN_ZOOM, Math.min(LAYOUT_CONSTANTS.MAX_ZOOM, prevZoom + delta));
      // Set pan so that the focal point is at the center of the viewport:
      // screenCenter = pan + worldPos * zoom  =>  pan = screenCenter - worldPos * zoom
      const newPan = {
        x: canvasW / 2 - worldX * newZoom,
        y: canvasH / 2 - worldY * newZoom,
      };
      setPanOffset(newPan);
      panOffsetRef.current = newPan;
      return newZoom;
    });
  }, [bounds, selectedPersonId, positions, currentBreakpoint]);

  // Pan & Zoom — zooms toward mouse cursor position (standard map behavior)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    dismissPreview();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentZoom = zoomRef.current;
    const currentPan = panOffsetRef.current;

    // Mouse position in screen space relative to canvas
    const mouseScreenX = e.clientX - rect.left;
    const mouseScreenY = e.clientY - rect.top;

    // Convert to world-space: screenPos = pan + worldPos * zoom
    const worldX = (mouseScreenX - currentPan.x) / currentZoom;
    const worldY = (mouseScreenY - currentPan.y) / currentZoom;

    const delta = -e.deltaY * 0.001;
    const newZoom = Math.max(LAYOUT_CONSTANTS.MIN_ZOOM, Math.min(LAYOUT_CONSTANTS.MAX_ZOOM, currentZoom + delta));

    // Keep the world point under the cursor at the same screen position:
    // mouseScreenPos = newPan + worldPos * newZoom  =>  newPan = mouseScreenPos - worldPos * newZoom
    const newPan = {
      x: mouseScreenX - worldX * newZoom,
      y: mouseScreenY - worldY * newZoom,
    };

    setZoom(newZoom);
    setPanOffset(newPan);
    panOffsetRef.current = newPan;
  }, [dismissPreview]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Enable panning on left mouse button, unless clicking on interactive elements
    if (e.button === 0) {
      const target = e.target as HTMLElement;

      // Don't pan if clicking on buttons, inputs, or person cards
      if (
        target.closest('button') ||
        target.closest('input') ||
        target.closest('.person-card') ||
        target.closest('.chevron-button')
      ) {
        return;
      }

      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
      e.preventDefault(); // Prevent text selection while dragging
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - lastMousePos.x;
        const dy = e.clientY - lastMousePos.y;
        setPanOffset((prev) => ({
          x: prev.x + dx,
          y: prev.y + dy,
        }));
        setLastMousePos({ x: e.clientX, y: e.clientY });
      }
    },
    [isPanning, lastMousePos]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleResetView = useCallback(() => {
    const targetZoom = 0.3; // Fixed 30% zoom level
    setZoom(targetZoom);

    // Center the view properly using bounds and the new zoom level
    if (canvasRef.current) {
      const canvasWidth = canvasRef.current.clientWidth;
      const canvasHeight = canvasRef.current.clientHeight;
      
      const treeCenterX = bounds.minX + bounds.width / 2;
      const treeCenterY = bounds.minY + bounds.height / 2;

      const centerX = canvasWidth / 2 - treeCenterX * targetZoom;
      const centerY = canvasHeight / 2 - treeCenterY * targetZoom;
      
      setPanOffset({ x: centerX, y: centerY });
    }
  }, [bounds]);

  // Watch resetViewTrigger: when it increments, reset the view.
  // Track the last-seen value so we only fire on actual changes (Strict Mode safe).
  const lastResetTriggerRef = useRef(resetViewTrigger);
  useEffect(() => {
    if (resetViewTrigger === undefined) return;
    if (resetViewTrigger === lastResetTriggerRef.current) return;
    lastResetTriggerRef.current = resetViewTrigger;
    handleResetView();
  }, [resetViewTrigger, handleResetView]);

  const handleZoomIn = useCallback(() => {
    zoomBy(0.2);
  }, [zoomBy]);

  const handleZoomOut = useCallback(() => {
    zoomBy(-0.2);
  }, [zoomBy]);

  /**
   * Smoothly zoom & pan the canvas to center on a specific person node
   * at a comfortable reading zoom level (at least 0.85).
   */
  const zoomToNode = useCallback((personId: string) => {
    const pos = positions.get(personId);
    if (!pos || !canvasRef.current) return;

    const targetZoom = Math.max(zoomRef.current, 0.85);
    const canvasWidth = canvasRef.current.clientWidth;
    const canvasHeight = canvasRef.current.clientHeight;
    const pw = currentBreakpoint.personWidth;
    const ph = currentBreakpoint.personHeight;

    // Target pan: center the node in the viewport, offset upward to leave room for the action menu
    const targetPanX = canvasWidth / 2 - (pos.x + pw / 2) * targetZoom;
    const targetPanY = canvasHeight / 2 - (pos.y + ph / 2) * targetZoom + 40;

    // Animate from current to target
    const startZoom = zoomRef.current;
    const startPanX = panOffsetRef.current.x;
    const startPanY = panOffsetRef.current.y;
    const duration = 350; // ms
    const startTime = performance.now();

    function step(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const ease = 1 - Math.pow(1 - t, 3);

      const curZoom = startZoom + (targetZoom - startZoom) * ease;
      const curPanX = startPanX + (targetPanX - startPanX) * ease;
      const curPanY = startPanY + (targetPanY - startPanY) * ease;

      setZoom(curZoom);
      setPanOffset({ x: curPanX, y: curPanY });

      if (t < 1) {
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  }, [positions, currentBreakpoint]);

  const handleDownload = useCallback(() => {
    // TODO: Implement tree download as image
    console.log('Download tree as image');
    alert('Download functionality will be implemented soon!');
  }, []);

  // Expose canvas controls to parent via callback
  // Use a ref for handlePersonFound since it's defined later in the component
  const handlePersonFoundRef = useRef<(personId: string) => void>(() => { });
  const onCanvasControlsReadyRef = useRef(onCanvasControlsReady);
  onCanvasControlsReadyRef.current = onCanvasControlsReady;
  useEffect(() => {
    onCanvasControlsReadyRef.current?.({
      zoomIn: handleZoomIn,
      zoomOut: handleZoomOut,
      resetView: handleResetView,
      download: handleDownload,
      patchTreeData,
      focusOnPerson: (personId: string) => handlePersonFoundRef.current(personId),
    });
  }, [handleZoomIn, handleZoomOut, handleResetView, handleDownload, patchTreeData]);

  // ============================================================================
  // Touch Gesture Handlers (Pinch-to-Zoom & Touch Pan)
  // ============================================================================

  /**
   * Native touch event listeners — attached directly to the canvas DOM element
   * so they fire reliably regardless of child component handlers (e.g. SimpleContextMenu).
   * Using refs for all mutable state ensures synchronous reads inside listeners.
   */
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const ts = touchStateRef;

    const getTouchDistance = (t: TouchList) => {
      const dx = t[0].clientX - t[1].clientX;
      const dy = t[0].clientY - t[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // --- Pinch start ---
        ts.current.isPanning = false;
        ts.current.isPinching = true;
        ts.current.initialPinchDistance = getTouchDistance(e.touches);
        ts.current.initialZoom = zoomRef.current;
        // Focal point relative to canvas element
        const rect = el.getBoundingClientRect();
        ts.current.pinchCenter = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top,
        };
        ts.current.initialPan = { ...panOffsetRef.current };
        setIsPanning(false);
      } else if (e.touches.length === 1) {
        // --- Single-finger pan start ---
        const target = e.target as HTMLElement;
        // Don't pan if touching buttons or inputs
        if (
          target.closest('button') ||
          target.closest('input') ||
          target.closest('.chevron-button')
        ) {
          return;
        }
        // Cancel any ongoing momentum animation
        if (momentumRafRef.current) {
          cancelAnimationFrame(momentumRafRef.current);
          momentumRafRef.current = null;
        }
        ts.current.isPanning = true;
        ts.current.startedOnCard = !!target.closest('.person-card');
        ts.current.movedDist = 0;
        ts.current.velocityX = 0;
        ts.current.velocityY = 0;
        ts.current.lastMoveTime = Date.now();
        ts.current.lastPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        setIsPanning(true);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && ts.current.isPinching && ts.current.initialPinchDistance > 0) {
        // --- Pinch move ---
        e.preventDefault();

        const currentDistance = getTouchDistance(e.touches);
        const scale = currentDistance / ts.current.initialPinchDistance;
        const newZoom = ts.current.initialZoom * scale;
        const clampedZoom = Math.max(
          LAYOUT_CONSTANTS.MIN_ZOOM,
          Math.min(LAYOUT_CONSTANTS.MAX_ZOOM, newZoom)
        );

        // Adjust pan so the pinch center stays fixed on screen
        const focal = ts.current.pinchCenter;
        const initPan = ts.current.initialPan;
        const zoomRatio = clampedZoom / ts.current.initialZoom;
        setPanOffset({
          x: focal.x - (focal.x - initPan.x) * zoomRatio,
          y: focal.y - (focal.y - initPan.y) * zoomRatio,
        });
        setZoom(clampedZoom);
      } else if (e.touches.length === 1 && ts.current.isPanning) {
        // --- Single-finger pan move ---
        e.preventDefault();

        const now = Date.now();
        const dx = e.touches[0].clientX - ts.current.lastPos.x;
        const dy = e.touches[0].clientY - ts.current.lastPos.y;
        const dt = now - ts.current.lastMoveTime;

        ts.current.movedDist += Math.abs(dx) + Math.abs(dy);
        ts.current.lastPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };

        // Track velocity for momentum (exponential smoothing)
        if (dt > 0) {
          const vx = dx / dt * 16; // normalize to ~60fps frame
          const vy = dy / dt * 16;
          ts.current.velocityX = vx * 0.6 + ts.current.velocityX * 0.4;
          ts.current.velocityY = vy * 0.6 + ts.current.velocityY * 0.4;
        }
        ts.current.lastMoveTime = now;

        setPanOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      // Suppress click if user dragged from a person card
      if (ts.current.startedOnCard && ts.current.movedDist > 10) {
        const suppressClick = (ev: Event) => { ev.stopPropagation(); ev.preventDefault(); };
        document.addEventListener('click', suppressClick, { capture: true, once: true });
        setTimeout(() => document.removeEventListener('click', suppressClick, { capture: true }), 300);
      }

      // --- Double-tap to zoom ---
      if (e.changedTouches.length === 1 && ts.current.movedDist < 10 && !ts.current.isPinching) {
        const now = Date.now();
        const tapX = e.changedTouches[0].clientX;
        const tapY = e.changedTouches[0].clientY;
        const timeDiff = now - ts.current.lastTapTime;
        const posDiff = Math.abs(tapX - ts.current.lastTapX) + Math.abs(tapY - ts.current.lastTapY);

        if (timeDiff < 300 && posDiff < 30) {
          // Double-tap detected — toggle zoom between 1.0 and 1.5
          const rect = el.getBoundingClientRect();
          const focalX = tapX - rect.left;
          const focalY = tapY - rect.top;
          const currentZoom = zoomRef.current;
          const targetZoom = currentZoom > 1.2 ? 1.0 : 1.5;
          const ratio = targetZoom / currentZoom;

          setPanOffset(prev => ({
            x: focalX - (focalX - prev.x) * ratio,
            y: focalY - (focalY - prev.y) * ratio,
          }));
          setZoom(targetZoom);
          ts.current.lastTapTime = 0; // reset so triple-tap doesn't trigger
        } else {
          ts.current.lastTapTime = now;
          ts.current.lastTapX = tapX;
          ts.current.lastTapY = tapY;
        }
      }

      // --- Momentum panning ---
      const wasPanning = ts.current.isPanning;
      const vx = ts.current.velocityX;
      const vy = ts.current.velocityY;

      ts.current.isPinching = false;
      ts.current.isPanning = false;
      ts.current.startedOnCard = false;
      ts.current.movedDist = 0;
      ts.current.initialPinchDistance = 0;
      setIsPanning(false);

      // Apply momentum if velocity is significant
      if (wasPanning && (Math.abs(vx) > 0.5 || Math.abs(vy) > 0.5)) {
        let mvx = vx;
        let mvy = vy;
        const friction = 0.95;

        const animateMomentum = () => {
          mvx *= friction;
          mvy *= friction;
          if (Math.abs(mvx) < 0.1 && Math.abs(mvy) < 0.1) {
            momentumRafRef.current = null;
            return;
          }
          setPanOffset(prev => ({ x: prev.x + mvx, y: prev.y + mvy }));
          momentumRafRef.current = requestAnimationFrame(animateMomentum);
        };
        momentumRafRef.current = requestAnimationFrame(animateMomentum);
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      if (momentumRafRef.current) {
        cancelAnimationFrame(momentumRafRef.current);
        momentumRafRef.current = null;
      }
    };
  }, [loading, treeData]); // Re-attach when canvas element mounts after loading


  // ============================================================================
  // Blood Relation Expansion Handlers
  // ============================================================================

  const handleToggleExpansion = useCallback((personId: string) => {
    setExpansionContexts(prev => {
      const next = new Map(prev);

      if (next.has(personId)) {
        // Collapse: remove expansion context
        console.log('[UnionBasedTreeCanvas] Collapsing branch for:', personId);
        next.delete(personId);
      } else {
        // Expand: reveal ONE LEVEL of this person's immediate relatives
        // This shows their parents, siblings, children, and spouses — NOT
        // the entire extended family tree. Users can expand further from there.
        console.log('[UnionBasedTreeCanvas] Expanding branch for:', personId);

        const person = treeData?.persons.find(p => p.personId === personId);
        if (!person || !treeData) return prev;

        const immediateRelatives = new Set<string>();
        immediateRelatives.add(personId);

        // Parents
        const parentUnionIds = treeData.relationships
          .filter(r => r.type === 'HAS_CHILD' && r.toId === personId)
          .map(r => r.fromId);
        for (const uid of parentUnionIds) {
          treeData.relationships
            .filter(r => r.type === 'PARTNER_IN' && r.toId === uid)
            .forEach(r => immediateRelatives.add(r.fromId));
        }

        // Siblings (share parent union)
        for (const uid of parentUnionIds) {
          treeData.relationships
            .filter(r => r.type === 'HAS_CHILD' && r.fromId === uid && r.toId !== personId)
            .forEach(r => immediateRelatives.add(r.toId));
        }

        // Children
        const personUnionIds = treeData.relationships
          .filter(r => r.type === 'PARTNER_IN' && r.fromId === personId)
          .map(r => r.toId);
        for (const uid of personUnionIds) {
          treeData.relationships
            .filter(r => r.type === 'HAS_CHILD' && r.fromId === uid)
            .forEach(r => immediateRelatives.add(r.toId));
        }

        // Spouses
        for (const uid of personUnionIds) {
          treeData.relationships
            .filter(r => r.type === 'PARTNER_IN' && r.toId === uid && r.fromId !== personId)
            .forEach(r => immediateRelatives.add(r.fromId));
        }

        // Find all unions involving these relatives
        const relatedUnionIds = new Set<string>();
        for (const pid of immediateRelatives) {
          treeData.relationships
            .filter(r => r.type === 'PARTNER_IN' && r.fromId === pid)
            .forEach(r => relatedUnionIds.add(r.toId));
        }

        next.set(personId, {
          anchorPersonId: personId,
          expandedBloodRelations: immediateRelatives,
          expandedUnionIds: relatedUnionIds,
          depth: 1,
          label: `${person.firstName}'s Family`
        });

        console.log('[UnionBasedTreeCanvas] Branch expanded:', {
          personId,
          relativesCount: immediateRelatives.size,
        });
      }

      return next;
    });
  }, [treeData, expandablePersons]);

  // ============================================================================
  // Collapse/Expand Handlers
  // ============================================================================

  const handleCollapseGroup = useCallback((groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Map(prev);
      const group = availableGroups.find(g => g.groupId === groupId);
      if (group) {
        next.set(groupId, { ...group, isExpanded: false });
      }
      return next;
    });
  }, [availableGroups]);

  const handleExpandGroup = useCallback((groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Map(prev);
      next.delete(groupId);
      return next;
    });
  }, []);

  // Union-level collapse toggle (chevron arrows on edges)
  const handleToggleUnionCollapse = useCallback((unionId: string) => {
    // Capture the screen-space position of a partner node before triggering re-layout
    // so we can restore it afterward (prevent tree from jumping).
    if (treeData) {
      const partnerRel = treeData.relationships.find(
        r => r.type === 'PARTNER_IN' && r.toId === unionId
      );
      const anchorPersonId = partnerRel?.fromId;
      if (anchorPersonId && positions.has(anchorPersonId)) {
        const nodePos = positions.get(anchorPersonId)!;
        const pan = panOffsetRef.current;
        collapseAnchorRef.current = {
          personId: anchorPersonId,
          screenX: pan.x + nodePos.x * zoom,
          screenY: pan.y + nodePos.y * zoom,
          zoom,
        };
      }
    }

    setCollapsedUnionIds(prev => {
      const next = new Set(prev);
      if (next.has(unionId)) next.delete(unionId);
      else next.add(unionId);
      return next;
    });
  }, [treeData, positions, zoom]);

  // ============================================================================
  // Vamshavali: Toggle expand/collapse per person per direction
  // ============================================================================

  const handleVamshavaliToggle = useCallback((personId: string, direction: VamshavaliExpandDirection) => {
    // Capture anchor for pan correction
    if (positions.has(personId)) {
      const nodePos = positions.get(personId)!;
      const pan = panOffsetRef.current;
      collapseAnchorRef.current = {
        personId,
        screenX: pan.x + nodePos.x * zoom,
        screenY: pan.y + nodePos.y * zoom,
        zoom,
      };
    }

    setVamshavaliExpansions(prev => {
      const next = new Map(prev.expansions);
      const current = next.get(personId);
      const dirs = current ? new Set(current) : new Set<VamshavaliExpandDirection>();
      if (dirs.has(direction)) dirs.delete(direction);
      else dirs.add(direction);
      if (dirs.size === 0) next.delete(personId);
      else next.set(personId, dirs);
      return { expansions: next };
    });
  }, [positions, zoom]);

  const handleVamshavaliReset = useCallback(() => {
    setVamshavaliExpansions({ expansions: new Map() });
    // Center on home person
    const homeId = treeData?.persons.find(p => p.isHomePerson)?.personId;
    if (homeId) {
      const homePos = positions.get(homeId);
      if (homePos && canvasRef.current) {
        const canvasWidth = canvasRef.current.clientWidth;
        const canvasHeight = canvasRef.current.clientHeight;
        setPanOffset({
          x: canvasWidth / 2 - (homePos.x + currentBreakpoint.personWidth / 2) * zoom,
          y: canvasHeight / 2 - (homePos.y + currentBreakpoint.personHeight / 2) * zoom,
        });
      }
    }
  }, [treeData, positions, zoom, currentBreakpoint.personWidth, currentBreakpoint.personHeight]);

  // ============================================================================
  // Search: Auto-expand and Focus
  // ============================================================================

  const handlePersonFound = useCallback((personId: string) => {
    if (!treeData) return;

    // 1. Check if person is already visible and positioned
    const pos = positions.get(personId);
    if (pos && canvasRef.current) {
      const canvasWidth = canvasRef.current.clientWidth;
      const canvasHeight = canvasRef.current.clientHeight;
      const targetZoom = zoom < 0.8 ? 1.0 : zoom;
      const cardW = currentBreakpoint.personWidth;
      const cardH = currentBreakpoint.personHeight;

      const newPanX = canvasWidth / 2 - (pos.x + cardW / 2) * targetZoom;
      const newPanY = canvasHeight / 2 - (pos.y + cardH / 2) * targetZoom;

      setZoom(targetZoom);
      setPanOffset({ x: newPanX, y: newPanY });
      setSelectedPersonId(personId);

      if (searchHighlightTimerRef.current) clearTimeout(searchHighlightTimerRef.current);
      setSearchHighlightPersonId(personId);
      searchHighlightTimerRef.current = setTimeout(() => {
        setSearchHighlightPersonId(null);
      }, 3000);
      return;
    }

    // 2. Person is hidden — detect WHY and expand
    const person = treeData.persons.find(p => p.personId === personId);
    if (!person) return;

    let expandedAnything = false;

    // A. Vamshavali Mode expansions
    if (layoutMode === 'vamshavali') {
      const homeId = treeData.persons.find(p => p.isHomePerson)?.personId;
      if (homeId) {
        const nextExpansions = computeExpansionPathTo(personId, homeId, treeData, vamshavaliExpansions);
        if (nextExpansions !== vamshavaliExpansions) {
          setVamshavaliExpansions(nextExpansions);
          expandedAnything = true;
        }
      }
    }

    // B. Ancestry Lineage Mode (virtual focus)
    if (!lineageIds.has(personId)) {
      handleViewTheirTree(personId);
      expandedAnything = true;
    }

    // C. Collapsed Groups (Siblings/Chains)
    for (const [groupId, group] of collapsedGroups) {
      if (!group.isExpanded && (group.anchorPersonId === personId || group.hiddenPersonIds.includes(personId))) {
        handleExpandGroup(groupId);
        expandedAnything = true;
      }
    }

    // D. Hidden Spouse Unions
    if (hiddenSpouseUnionIds.size > 0) {
      const spouseUnionIds = unionsByPerson.get(personId) ?? [];
      for (const uid of spouseUnionIds) {
        if (hiddenSpouseUnionIds.has(uid)) {
          handleToggleSpouseVisibility(uid, true);
          expandedAnything = true;
        }
      }
      // Also check if person is a child of a hidden spouse union
      const parentUnionId = treeData.relationships.find(r => r.type === 'HAS_CHILD' && r.toId === personId)?.fromId;
      if (parentUnionId && hiddenSpouseUnionIds.has(parentUnionId)) {
        handleToggleSpouseVisibility(parentUnionId, true);
        expandedAnything = true;
      }
    }

    // E. Collapsed Unions (Chevrons)
    if (collapsedUnionIds.size > 0) {
      // Collect descendants of all currently collapsed unions to see if target is one of them
      const hiddenDescendants = collectDescendants(treeData, collapsedUnionIds);
      if (hiddenDescendants.has(personId)) {
        // Find which specific union is hiding this person by checking their ancestry
        const parentUnionId = treeData.relationships.find(r => r.type === 'HAS_CHILD' && r.toId === personId)?.fromId;
        if (parentUnionId && collapsedUnionIds.has(parentUnionId)) {
          handleToggleUnionCollapse(parentUnionId);
          expandedAnything = true;
        } else {
          // If not direct child, expand all collapsed unions — brute force but effective for deep searches
          setCollapsedUnionIds(new Set());
          expandedAnything = true;
        }
      }
    }

    // F. Side Filter
    if (sideFilter !== 'all') {
      const homePerson = treeData.persons.find(p => p.isHomePerson);
      if (homePerson) {
        const sideIds = sideFilter === 'paternal'
          ? getPaternalSideIds(treeData.persons, treeData.unions, treeData.relationships, homePerson)
          : getMaternalSideIds(treeData.persons, treeData.unions, treeData.relationships, homePerson);

        if (!sideIds.has(personId)) {
          onSideFilterChange?.('all');
          expandedAnything = true;
        }
      }
    }

    // If we triggered any expansions, wait for the next layout to finish then focus
    if (expandedAnything) {
      setPendingFocusPersonId(personId);
    } else {
      // Fallback: even if we couldn't find an expansion path, try to center if they appeared
      setPendingFocusPersonId(personId);
    }
  }, [
    treeData, positions, zoom, currentBreakpoint, layoutMode, vamshavaliExpansions,
    lineageIds, handleViewTheirTree, collapsedGroups, handleExpandGroup,
    hiddenSpouseUnionIds, unionsByPerson, handleToggleSpouseVisibility,
    collapsedUnionIds, handleToggleUnionCollapse, sideFilter, onSideFilterChange, virtualFocusId
  ]);

  // Handle auto-focus after expansion re-layout
  useEffect(() => {
    if (pendingFocusPersonId && positions.has(pendingFocusPersonId)) {
      handlePersonFound(pendingFocusPersonId);
      setPendingFocusPersonId(null);
    }
  }, [pendingFocusPersonId, positions, handlePersonFound]);

  // Keep ref in sync so CanvasControls.focusOnPerson always calls the latest version
  handlePersonFoundRef.current = handlePersonFound;

  // ============================================================================
  // Render
  // ============================================================================

  const totalValidMembersCount = useMemo(() => {
    return treeData?.persons.filter(p => p.firstName && p.firstName.trim() !== '' && !p.isProxy && p.personId && !p.personId.includes('_proxy_')).length || 0;
  }, [treeData?.persons]);

  const visibleValidCount = useMemo(() => {
    if (!disclosureVisibleIds || !treeData) return 0;
    return treeData.persons.filter(p => disclosureVisibleIds.has(p.personId) && p.firstName && p.firstName.trim() !== '' && !p.isProxy && p.personId && !p.personId.includes('_proxy_')).length;
  }, [disclosureVisibleIds, treeData]);

  const vamshavaliVisibleValidCount = useMemo(() => {
    if (!vamshavaliVisible || !treeData) return 0;
    return treeData.persons.filter(p => vamshavaliVisible.visiblePersonIds.has(p.personId) && p.firstName && p.firstName.trim() !== '' && !p.isProxy && p.personId && !p.personId.includes('_proxy_')).length;
  }, [vamshavaliVisible, treeData]);

  if (loading) {
    return <TreeLoadingScreen treeName={treeName} memberCount={lastKnownMemberCount} />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!treeData || treeData.persons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-8 bg-[#F9F7F2]/30 dark:bg-transparent">
        <div className="relative group">
          <div className="absolute -inset-4 bg-[#2F3E8F]/5 dark:bg-[#7B8FD4]/10 rounded-full blur-xl group-hover:bg-[#2F3E8F]/10 dark:group-hover:bg-[#7B8FD4]/15 transition-all duration-500" />
          <Trees className="w-24 h-24 text-[#2F3E8F]/20 dark:text-[#7B8FD4]/30 relative z-10 animate-float" />
        </div>
        
        <div className="text-center space-y-2 relative z-10">
          <h2 className="text-3xl font-serif text-[#3D2E1F] dark:text-[#F3F2F1]">Your family tree is empty</h2>
          <p className="text-base text-[#6B7280] dark:text-[#9B9790] max-w-sm mx-auto">
            Start building your legacy today. You can add yourself as the root or import existing family data.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10">
          <Button
            onClick={onCreateRoot}
            className="h-12 px-8 bg-[#2F3E8F] hover:bg-[#1E2B6D] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
          >
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold">+</span>
            </div>
            <span className="font-medium">Start with yourself</span>
          </Button>

          <div className="text-[#8B7355] dark:text-slate-500 font-medium text-sm px-2">OR</div>

          <Button
            onClick={onImportGedcom}
            variant="outline"
            className="h-12 px-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-[#E2E8F0] dark:border-slate-800 text-[#2F3E8F] dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-full shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2"
          >
            <Download className="w-5 h-5 rotate-180" />
            <span className="font-medium">Import GEDCOM</span>
          </Button>
        </div>

        <div className="mt-8 p-4 bg-white/50 dark:bg-[#1E1E1E]/50 backdrop-blur-sm rounded-2xl border border-dashed border-[#E2E8F0] dark:border-slate-800 text-center max-w-xs">
          <p className="text-xs text-[#8B7355] dark:text-[#C2A46D]/90">
            Build a bridge between generations. Your history is just a click away.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full canvas-background">
      {/* Search Bar (Top Center) */}
      {layoutMode !== 'fan' && (
        <div className="no-export absolute top-3 left-1/2 -translate-x-1/2 z-10 w-[90%] max-w-xs" data-tutorial="tree-search">
          <FamilySearch
            ref={searchInputRef}
            persons={treeData?.persons || []}
            onPersonFound={handlePersonFound}
            treeId={treeId}
            onAdvancedSearchClick={() => setIsAdvancedSearchOpen(true)}
          />
        </div>
      )}

      <AdvancedSearchSidebar
        isOpen={isAdvancedSearchOpen}
        onClose={() => setIsAdvancedSearchOpen(false)}
        persons={treeData?.persons || []}
        onSearchResults={setAdvancedSearchMatches}
      />





      {/* Canvas */}
      <div
        ref={canvasRef}
        data-tutorial="tree-canvas"
        className={`absolute inset-0 overflow-hidden ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}${layoutMode === 'vamshavali' ? ' vamshavali-canvas' : ''} ${isExporting ? 'export-active' : ''}`}
        style={{ userSelect: isPanning ? 'none' : 'auto', touchAction: 'none' }}
        onWheelCapture={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Fan Chart Mode */}
        {layoutMode === 'fan' && treeData && (
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden" style={{ background: 'hsl(var(--background))' }}>
            <FanChart
              homePersonId={treeData.persons.find(p => p.isHomePerson)?.personId || ''}
              persons={treeData.persons}
              unions={treeData.unions}
              relationships={treeData.relationships}
              onPersonClick={handlePersonClick}
              onPersonContextAction={onPersonContextAction}
              width={canvasRef.current?.clientWidth || 900}
              height={canvasRef.current?.clientHeight || 700}
            />
          </div>
        )}

        {/* Transformed Container (hidden when fan chart is active) */}
        <div
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isPanning ? 'none' : 'transform 0.1s ease',
            display: layoutMode === 'fan' ? 'none' : 'block',
          }}
        >
          {/* SVG Layer for Edges — rendered BEHIND person cards (z-index: 1) */}
          <svg
            className="absolute top-0 left-0"
            width={Math.max(bounds.maxX + 500, 2000)}
            height={Math.max(bounds.maxY + 500, 2000)}
            style={{
              overflow: 'visible',
              zIndex: 1,
            }}
          >
            {visibleUnions.map((union) => (
              <UnionEdgeGroup
                key={union.unionId}
                union={union}
                positions={positions}
                persons={treeData.persons}
                allUnions={treeData.unions}
                relationships={treeData.relationships}
                relationshipLabels={relationshipLabels}
                homePersonName={homePerson?.firstName || ''}
                homePersonId={homePerson?.personId || ''}
                onCollapseGroup={handleCollapseGroup}
                onExpandGroup={handleExpandGroup}
                collapsedGroups={collapsedGroups}
                availableGroups={availableGroups}
                collapsedUnionIds={collapsedUnionIds}
                onToggleUnionCollapse={handleToggleUnionCollapse}
                hiddenByCollapse={allHiddenPersonIds}
                personWidth={currentBreakpoint.personWidth}
                personHeight={currentBreakpoint.personHeight}
                childrenGroupLabels={localeGroupLabels?.childrenGroupLabels}
                parentPairLabels={localeGroupLabels?.parentPairLabels}
                locale={locale}
                highlightedPersonIds={highlightedPath.size > 0 ? highlightedPath : undefined}
              />
            ))}

            {/* Guardian / Adoption Edges */}
            {treeData.relationships
              .filter((r) => r.type === 'GUARDIAN_OF')
              .filter((r) => !allHiddenPersonIds.has(r.fromId) && !allHiddenPersonIds.has(r.toId))
              .map((r) => {
                const guardianPos = positions.get(r.fromId);
                const childPos = positions.get(r.toId);
                if (!guardianPos || !childPos) return null;       // either node not visible
                // Respect blood-only filter
                if (bloodRelationMode !== 'all') {
                  if (!visiblePersonIds.has(r.fromId) || !visiblePersonIds.has(r.toId)) return null;
                }
                return (
                  <GuardianEdge
                    key={`guardian-${r.fromId}-${r.toId}`}
                    guardianPos={guardianPos}
                    childPos={childPos}
                    guardianType={r.guardianType}
                  />
                );
              })}
          </svg>

          {/* Grid Overlay (Development Tool) */}
          {showGridOverlay && (
            <GridOverlay
              positions={positions}
              persons={treeData.persons}
              unions={treeData.unions}
              bounds={bounds}
              showGrid={showGrid}
              showGenerationLines={showGenerationLines}
              showAnchorPoints={showAnchorPoints}
              showMeasurements={showMeasurements}
              showNodeCenters={showNodeCenters}
              showSnapGuides={showSnapGuides}
            />
          )}

          {/* Person Cards Layer — rendered ABOVE edge lines (z-index: 2) */}
          <div
            className="relative"
            style={{
              width: Math.max(bounds.maxX + 500, 2000),
              height: Math.max(bounds.maxY + 500, 2000),
              pointerEvents: 'none',
              zIndex: 2,
            }}
          >
            {visiblePersonsList.map((person) => {
              const pos = positions.get(person.personId);
              if (!pos || !isInViewport(pos)) return null;

              const personCardNode = (
                <PersonCard
                  person={person}
                  x={pos.x}
                  y={pos.y}
                  onClick={() => {
                    if (readOnly) {
                      handlePersonClick(person.personId);
                    } else if (person.personId.startsWith('ghost-spouse-')) {
                      const parts = person.personId.split('-for-');
                      const parentId = parts[parts.length - 1];
                      onPersonContextAction?.(parentId, 'add-spouse');
                    } else if (person.isDeleted) {
                      onPersonContextAction?.(person.personId, 'ghost-add');
                    } else {
                      handlePersonClick(person.personId);
                    }
                  }}
                  onDoubleClick={readOnly ? undefined : () => onPersonDoubleClick?.(person.personId)}
                  isSelected={selectedPersonId === person.personId}
                  isFocused={focusPersonId === person.personId}
                  isRecentlyAdded={recentlyAddedPersonId === person.personId}
                  isSearchHighlight={searchHighlightPersonId === person.personId}
                  hasAdvancedSearchActive={advancedSearchMatchSet !== null}
                  isAdvancedSearchMatch={advancedSearchMatchSet !== null && advancedSearchMatchSet.has(person.personId)}
                  isHighlighted={highlightedPath.has(person.personId)}
                  isInvitedHighlight={!!highlightPersonId && person.personId === highlightPersonId}
                  readOnly={readOnly}
                  onAddRelative={readOnly ? undefined : () => onOpenAddRelativePanel?.(person.personId)}
                  onInviteFamily={readOnly ? undefined : () => onPersonContextAction?.(person.personId, 'invite-to-claim')}
                  onViewMemories={!readOnly && onViewMemories ? () => onViewMemories(person.personId, `${person.firstName} ${person.lastName}`) : undefined}
                  onZoomToNode={() => zoomToNode(person.personId)}
                  onNavigateToTree={onNavigateToTree}
                  personUnions={personUnionsMap.get(person.personId) ?? []}
                  isExpandable={expandablePersons.has(person.personId)}
                  isExpanded={expansionContexts.has(person.personId)}
                  expansionMemberCount={expandablePersons.get(person.personId)?.familyMemberCount}
                  onToggleExpansion={() => handleToggleExpansion(person.personId)}
                  breakpoint={currentBreakpoint}
                  relationshipLabel={relationshipLabels.get(person.personId)}
                  isInLaw={disclosureVisibleIds ? isInLaw(person.personId, virtualFocusId || homePerson?.personId || '', treeData) : false}
                  onViewTheirTree={handleViewTheirTree}
                  showParentNavIcons={
                    directSpouseIds.has(person.personId) &&
                    !spousesWithExpandedChildren.has(person.personId) &&
                    getParents(person.personId, treeData.relationships).length > 0
                  }
                  spouseList={spouseListMap.get(person.personId)}
                  onToggleSpouseVisibility={readOnly ? undefined : handleToggleSpouseVisibility}
                  memoryCount={memoryCounts?.[person.personId] || 0}
                  onMouseEnter={(e) => handlePreviewMouseEnter(person.personId, e.currentTarget as HTMLElement)}
                  onMouseLeave={handlePreviewMouseLeave}
                  {...(layoutMode === 'vamshavali' && vamshavaliVisible && treeData ? (() => {
                    const expandInfo = getVamshavaliExpandInfo(person.personId, treeData, vamshavaliVisible.visiblePersonIds);
                    return {
                      showVamshavaliPills: true,
                      hasParents: expandInfo.hasHiddenParents || expandInfo.hasVisibleParents,
                      hasSiblings: expandInfo.hasHiddenSiblings || expandInfo.hasVisibleSiblings,
                      hasChildren: expandInfo.hasHiddenChildren || expandInfo.hasVisibleChildren,
                      parentsHidden: expandInfo.hasHiddenParents,
                      siblingsHidden: expandInfo.hasHiddenSiblings,
                      childrenHidden: expandInfo.hasHiddenChildren,
                      vamshavaliExpandInfo: expandInfo,
                      onToggleParents: () => handleVamshavaliToggle(person.personId, 'parents'),
                      onToggleSiblings: () => handleVamshavaliToggle(person.personId, 'siblings'),
                      onToggleChildren: () => handleVamshavaliToggle(person.personId, 'children'),
                      isVamshavaliNewNode: vamshavaliNewNodeIds.has(person.personId),
                    };
                  })() : {})}
                />
              );

              // Read-only view: skip the context menu wrapper entirely.
              if (readOnly) {
                return <div key={`person-${person.personId}`}>{personCardNode}</div>;
              }

              return (
                <PersonMenu
                  key={`ctx-${person.personId}`}
                  data-tutorial={person.isHomePerson ? 'person-card' : undefined}
                  person={person}
                  onAddParent={() => onPersonContextAction?.(person.personId, 'add-parent')}
                  onAddSpouse={() => onPersonContextAction?.(person.personId, 'add-spouse')}
                  onMarryExisting={() => onPersonContextAction?.(person.personId, 'marry-existing')}
                  onAddChild={() => onPersonContextAction?.(person.personId, 'add-child')}
                  onAddSibling={() => onPersonContextAction?.(person.personId, 'add-sibling')}
                  onAddGrandparent={() => onPersonContextAction?.(person.personId, 'add-grandparent')}
                  onAddUncleAunt={() => onPersonContextAction?.(person.personId, 'add-uncle-aunt')}
                  onAddCousin={() => onPersonContextAction?.(person.personId, 'add-cousin')}
                  onAddGuardian={() => onPersonContextAction?.(person.personId, 'add-guardian')}
                  onQuickAdd={() => onPersonContextAction?.(person.personId, 'quick-add')}
                  onEdit={() => onPersonContextAction?.(person.personId, 'edit')}
                  onViewRelationships={() => {
                    console.log('View relationships for', person.personId);
                  }}
                  onFocus={() => {
                    console.log('Focus on', person.personId);
                  }}
                  onViewHistory={() => onPersonContextAction?.(person.personId, 'view-history')}
                  onOpenGallery={() => onPersonContextAction?.(person.personId, 'media-gallery')}
                  onAddMemory={() => onPersonContextAction?.(person.personId, 'add-memory')}
                  onManageTags={() => onPersonContextAction?.(person.personId, 'manage-tags')}
                  onViewLifeStory={() => onPersonContextAction?.(person.personId, 'view-life-story')}
                  onViewComments={() => onPersonContextAction?.(person.personId, 'view-comments')}
                  onViewProfile={() => onPersonContextAction?.(person.personId, 'view-profile')}
                  onDelete={() => onPersonContextAction?.(person.personId, 'delete')}
                  onGhostAdd={() => {
                    if (person.personId.startsWith('ghost-spouse-')) {
                      const parts = person.personId.split('-for-');
                      const parentId = parts[parts.length - 1];
                      onPersonContextAction?.(parentId, 'add-spouse');
                    } else {
                      onPersonContextAction?.(person.personId, 'ghost-add');
                    }
                  }}

                  onOpenAddRelativePanel={() => onOpenAddRelativePanel?.(person.personId)}
                >
                  {personCardNode}
                </PersonMenu>
              );
            })}

            {/* Split-view: render duplicate nodes for shared persons */}
            {splitView && splitPositions.size > 0 && [...splitPositions.entries()].map(([key, pos]) => {
              const personId = key.replace('__paternal', '').replace('__maternal', '');
              if (!splitPersonIds.has(personId)) return null;
              const person = treeData.persons.find(p => p.personId === personId);
              if (!person) return null;
              return (
                <PersonCard
                  key={`split-${key}`}
                  person={person}
                  x={pos.x}
                  y={pos.y}
                  onClick={() => handlePersonClick(personId)}
                  isSelected={selectedPersonId === personId}
                  breakpoint={currentBreakpoint}
                  isDuplicate
                  isBrokenLineage={false}
                />
              );
            })}

            {/* Placeholder nodes for collapsed groups */}
            {placeholderNodes.map(placeholder => {
              const pos = positions.get(placeholder.personId);
              if (pos) {
                placeholder.x = pos.x;
                placeholder.y = pos.y;
              }

              return (
                <PlaceholderCard
                  key={placeholder.personId}
                  placeholder={placeholder}
                  onExpand={() => handleExpandGroup(placeholder.collapsedGroup.groupId)}
                  breakpoint={currentBreakpoint}
                />
              );
            })}

            {/* Collapsed Union Chevron Overlay — rendered ABOVE person cards so always clickable */}
            {collapsedUnionIds.size > 0 && treeData.unions
              .filter(u => collapsedUnionIds.has(u.unionId))
              .map(union => {
                // Find the union's bottom anchor point (between spouses)
                const pIds = partnersByUnion.get(union.unionId) ?? [];
                const partnerPositions = pIds
                  .map(id => positions.get(id))
                  .filter((p): p is Position => !!p);

                const pw = currentBreakpoint.personWidth;
                const ph = currentBreakpoint.personHeight;
                const r = 12; // CHEVRON_BUTTON_RADIUS

                if (partnerPositions.length > 0) {
                  const minX = Math.min(...partnerPositions.map(p => p.x));
                  const maxX = Math.max(...partnerPositions.map(p => p.x + pw));
                  const anchorX = (minX + maxX) / 2;
                  const anchorY = partnerPositions[0].y + ph + 20;

                  return (
                    <div
                      key={`collapse-chevron-${union.unionId}`}
                      className="no-export absolute flex items-center justify-center"
                      style={{
                        transform: `translate(${anchorX - r}px, ${anchorY - r}px)`,
                        width: r * 2,
                        height: r * 2,
                        borderRadius: '50%',
                        backgroundColor: '#767676',
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        zIndex: 50,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleUnionCollapse(union.unionId);
                      }}
                    >
                      <svg width={10} height={6} viewBox="-5 -3 10 6">
                        <path d="M -4 -2 L 0 2 L 4 -2" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                      </svg>
                    </div>
                  );
                } else {
                  // Ancestor collapse: render above the child card(s)
                  const childIds = childrenByUnion.get(union.unionId) ?? [];
                  const childPositions = childIds
                    .map(id => positions.get(id))
                    .filter((p): p is Position => !!p);
                  if (childPositions.length === 0) return null;

                  const minX = Math.min(...childPositions.map(p => p.x));
                  const maxX = Math.max(...childPositions.map(p => p.x + pw));
                  const anchorX = (minX + maxX) / 2;
                  // Position 20px above the child card top
                  const anchorY = childPositions[0].y - 20;

                  return (
                    <div
                      key={`collapse-chevron-${union.unionId}`}
                      className="no-export absolute flex items-center justify-center"
                      style={{
                        transform: `translate(${anchorX - r}px, ${anchorY - r}px)`,
                        width: r * 2,
                        height: r * 2,
                        borderRadius: '50%',
                        backgroundColor: '#767676',
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        zIndex: 50,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleUnionCollapse(union.unionId);
                      }}
                    >
                      <svg width={10} height={6} viewBox="-5 -3 10 6" style={{ transform: 'rotate(180deg)' }}>
                        <path d="M -4 -2 L 0 2 L 4 -2" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                      </svg>
                    </div>
                  );
                }
              })}

            {/* Generation Tier Labels (Ancestry-style) — hidden for now */}

          </div>
        </div>
      </div>

      {/* Focus Navigation Breadcrumb */}
      {focusNavigation.history.length >= 1 && (
        <div className="no-export absolute bottom-14 left-4 z-10" data-tutorial="home-breadcrumb">
          <FocusPersonBreadcrumb
            breadcrumbs={getBreadcrumbs(focusNavigation)}
            currentIndex={focusNavigation.currentIndex}
            onNavigateTo={handleBreadcrumbNavigate}
            onHome={handleBreadcrumbHome}
          />
        </div>
      )}

      {/* Minimap (bottom-right, above zoom controls) */}
      {showMinimap && treeData && layoutMode !== 'fan' && (

        <div className="no-export absolute bottom-[320px] right-4 z-10 hidden md:block" data-tutorial="minimap">
          <div className="relative">
            <Minimap
              persons={treeData.persons.filter(p => positions.has(p.personId))}
              positions={positions}
              bounds={bounds}
              panOffset={panOffset}
              zoom={zoom}
              canvasWidth={canvasRef.current?.clientWidth || 800}
              canvasHeight={canvasRef.current?.clientHeight || 600}
              onPan={setPanOffset}
              personWidth={currentBreakpoint.personWidth}
              personHeight={currentBreakpoint.personHeight}
            />
            <button
              onClick={() => setShowMinimap(false)}
              aria-label="Hide minimap"
              title="Hide minimap"
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 shadow-sm flex items-center justify-center text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-gray-900 dark:hover:text-zinc-100 transition-colors"
            >
              <X className="w-3 h-3" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}
      {!showMinimap && treeData && layoutMode !== 'fan' && (

        <button
          onClick={() => setShowMinimap(true)}
          aria-label="Show minimap"
          title="Show minimap"
          className="no-export absolute bottom-[320px] right-4 z-10 hidden md:flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-md rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-100 transition-colors"
        >
          <MapIcon className="w-3.5 h-3.5" />
          Minimap
        </button>
      )}

      {/* Vamshavali: "Back to My Family" floating button */}
      {layoutMode === 'vamshavali' && vamshavaliExpansions.expansions.size > 0 && (
        <button
          onClick={handleVamshavaliReset}
          className="no-export absolute left-4 z-10 flex items-center gap-2 bg-gradient-to-r from-[#2F3E8F] to-[#4B2C5E] text-white rounded-full px-4 py-2.5 text-xs font-semibold shadow-lg hover:shadow-xl hover:brightness-110 backdrop-blur-sm transition-all duration-300 vamshavali-appear"
          style={{ bottom: '56px' }}
          title="Back to my immediate family"
        >
          <Home className="w-4 h-4" />
          Back to My Family
        </button>
      )}

      {/* Canvas HUD (Phase 2 / C9) — consolidated bottom-right controls */}
      {layoutMode !== 'fan' && (
        <div
          role="group"
          aria-label="Canvas controls"
          className={`no-export absolute right-4 z-10 flex flex-col gap-1 bg-white/95 dark:bg-[#1E1E1E]/95 backdrop-blur-sm rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-1 transition-all duration-200 bottom-[72px]`}
          data-tutorial="zoom-controls"
        >
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4 text-gray-700 dark:text-gray-200" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4 text-gray-700 dark:text-gray-200" />
          </button>
          <div className="h-px bg-gray-200 dark:bg-gray-800 mx-1" />
          <button
            onClick={handleResetView}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
            title="Reset View"
          >
            <Maximize2 className="w-4 h-4 text-gray-700 dark:text-gray-200" />
          </button>
          <div className="text-[10px] text-center text-gray-400 dark:text-gray-500 px-1">
            {Math.round(zoom * 100)}%
          </div>
          <div className="h-px bg-gray-200 dark:bg-gray-800 mx-1" />
          <button
            onClick={() => setShowDisplayPreferences(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
            title="Node Display Settings"
          >
            <SlidersHorizontal className="w-4 h-4 text-gray-700 dark:text-gray-200" />
          </button>
          <div className="h-px bg-gray-200 dark:bg-gray-800 mx-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                disabled={isExporting}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors flex items-center justify-center disabled:opacity-70"
                title="Download Data"
              >
                {isExporting ? (
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="left" sideOffset={12} className="w-48 bg-white dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-800 p-1">
              <DropdownMenuItem
                onClick={handleExportCsv}
                disabled={isExporting}
                className="flex items-center gap-2 cursor-pointer focus:bg-[#F4F6F9] dark:focus:bg-slate-800 rounded-md px-3 py-2 text-sm text-slate-700 dark:text-slate-300"
              >
                <FileText className="w-4 h-4 text-[#2F3E8F] dark:text-[#8CA0FF]" />
                <span>Export CSV</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportGedcom}
                disabled={isExporting}
                className="flex items-center gap-2 cursor-pointer focus:bg-[#F4F6F9] dark:focus:bg-slate-800 rounded-md px-3 py-2 text-sm text-slate-700 dark:text-slate-300"
              >
                <FileJson className="w-4 h-4 text-[#2F3E8F] dark:text-[#8CA0FF]" />
                <span>Export GEDCOM</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}



      {/* Info Overlay */}
      {layoutMode !== 'fan' && (
        layoutMode === 'vamshavali' && vamshavaliVisible ? (
          <div className="no-export absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-[#2F3E8F]/8 backdrop-blur-sm px-4 py-1.5 rounded-full text-[11px] tracking-wide text-[#2F3E8F]/70 font-medium">
            {vamshavaliVisibleValidCount} of {totalValidMembersCount} members
          </div>
        ) : (
          <div className="no-export absolute bottom-4 left-4 z-10 bg-white/95 dark:bg-[#1E1E1E]/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md text-xs text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800">

            {disclosureVisibleIds ? (
              <div>
                Showing {visibleValidCount} of {totalValidMembersCount} members
                {collapseBubbles.length > 0 && (
                  <span className="text-[#2F3E8F] font-semibold ml-2">
                    • {collapseBubbles.reduce((sum, b) => sum + b.count, 0)} hidden
                  </span>
                )}
                {expandablePersons.size > 0 && bloodRelationMode === 'blood-only' && (
                  <span className="text-teal-600 font-semibold ml-2">
                    • {expandablePersons.size} expandable
                  </span>
                )}
              </div>
            ) : (
              <div>
                Showing all {totalValidMembersCount} members
              </div>
            )}
          </div>
        )
      )}

      {/* Grid Settings Modal */}
      <GridSettingsModal
        isOpen={showGridSettingsModal}
        onClose={() => setShowGridSettingsModal(false)}
        showGridOverlay={showGridOverlay}
        showGrid={showGrid}
        showGenerationLines={showGenerationLines}
        showAnchorPoints={showAnchorPoints}
        showMeasurements={showMeasurements}
        showNodeCenters={showNodeCenters}
        showSnapGuides={showSnapGuides}
        onToggleGridOverlay={setShowGridOverlay}
        onToggleGrid={setShowGrid}
        onToggleGenerationLines={setShowGenerationLines}
        onToggleAnchorPoints={setShowAnchorPoints}
        onToggleMeasurements={setShowMeasurements}
        onToggleNodeCenters={setShowNodeCenters}
        onToggleSnapGuides={setShowSnapGuides}
      />

      {/* Node Preview Card (hover/tap) */}
      {previewPersonId && previewPosition && treeData && (() => {
        const previewPerson = treeData.persons.find(p => p.personId === previewPersonId);
        if (!previewPerson) return null;
        return (
          <NodePreviewCard
            person={previewPerson}
            position={previewPosition}
            previewFields={previewFields}
            relationshipLabel={relationshipLabels.get(previewPersonId)}
            locale={locale}
            onClose={dismissPreview}
            onMouseEnter={handlePreviewCardMouseEnter}
            onMouseLeave={handlePreviewCardMouseLeave}
            isMobile={isTouchDevice}
          />
        );
      })()}

      {/* Node Display Preferences Modal */}
      <NodeDisplayPreferencesModal
        isOpen={showDisplayPreferences}
        onClose={() => setShowDisplayPreferences(false)}
        treeId={treeId}
      />

      {/* 6.10 — Persistent "Add person" FAB on mobile.
          Targets the focused person (or home / first person as fallback). */}
      {!readOnly && onOpenAddRelativePanel && isTouchDevice && (
        <button
          type="button"
          onClick={() => {
            const target = focusPersonId
              || treeData?.persons.find(p => p.isHomePerson)?.personId
              || treeData?.persons[0]?.personId;
            if (target) onOpenAddRelativePanel(target);
          }}
          className="md:hidden fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-[#2F3E8F] text-white shadow-[0_8px_24px_rgba(47,62,143,0.35)] flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Add person"
          title="Add person"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      )}
      {/* PDF Export Progress Overlay */}
      {isExporting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px] no-export">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full mx-4 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-300">
            <div className="relative w-24 h-24">
              {/* Spinning progress ring */}
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle className="text-slate-100 dark:text-slate-800" strokeWidth="6" stroke="currentColor" fill="transparent" r="42" cx="50" cy="50" />
                <circle className="text-[#2F3E8F] transition-all duration-500 ease-out" strokeWidth="6" strokeDasharray={263.9} strokeDashoffset={263.9 - (263.9 * exportProgress) / 100} strokeLinecap="round" stroke="currentColor" fill="transparent" r="42" cx="50" cy="50" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-bold text-2xl text-slate-800 dark:text-slate-100">{exportProgress}%</span>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Capturing Tree</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                We're generating a high-quality multi-page PDF.<br />
                Please wait while we capture each section.
              </p>
            </div>
            {/* Minimalist progress bar at bottom of card */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#2F3E8F] h-full transition-all duration-500"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
