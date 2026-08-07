/**
 * UnionEdgeGroup Component - Renders edges for a single Union node
 *
 * CRITICAL: All edges must be ORTHOGONAL (only horizontal + vertical segments)
 * CRITICAL: All endpoints must connect EXACTLY at intersection points (no overlaps)
 * CRITICAL: T-junctions must be proper - vertical line terminates AT horizontal line
 *
 * Circuit-board principle: Lines meet at junctions, they don't cross through each other.
 *
 * For multiple children: Vertical from union terminates at bracket, forming T-junction
 * NOT a "+" overlap where lines cross through each other.
 *
 * @see references/family-tree_ancestry.md
 * @see references/layout-mathematics.md
 */

import { memo, useMemo } from 'react';
import { LAYOUT_CONSTANTS } from '@/constants/layoutConstants';
import { type Position } from '@/services/elkLayoutService';
import type { Person, Union } from '@/types';
import type { Relationship } from '@/services/elkLayoutService';
import type { RelationshipLabelEntry } from '@/services/relationshipLabelService';
import { transliterate } from '@/services/transliterationService';

// ============================================================================
// Marriage Pattern Styling
// ============================================================================

/**
 * Get marriage pattern visual style
 * Returns color, stroke pattern, and width for different marriage types
 */
function getMarriagePatternStyle(union: Union): {
  stroke: string;
  strokeDasharray?: string;
  strokeWidth: number;
} {
  const pattern = union.marriagePattern;

  switch (pattern) {
    case 'consanguineous':
      // Uncle-niece, aunt-nephew marriages
      return {
        stroke: '#c8bfb3',
        strokeDasharray: '8,4',
        strokeWidth: 2.5,
      };

    case 'polyandry':
    case 'polygyny':
      // Multiple marriages
      return {
        stroke: '#b5ad9f',
        strokeDasharray: '2,2',
        strokeWidth: 2,
      };

    case 'levirate':
    case 'sororate':
      // Widow/widower remarrying sibling-in-law
      return {
        stroke: '#c0b8ab',
        strokeDasharray: '10,5',
        strokeWidth: 2,
      };

    default:
      // Standard marriage - uniform gray
      return {
        stroke: LAYOUT_CONSTANTS.EDGE_COLOR,
        strokeDasharray: union.type === 'unknown' ? '5,5' : undefined,
        strokeWidth: 2,
      };
  }
}

/**
 * Get badge letter and tooltip for marriage pattern
 */
// getMarriagePatternBadge removed (currently unused, can be restored when badge rendering is needed)

// ============================================================================
// Helper Functions for Multiple Spouse Y-Offset Calculation
// ============================================================================

/**
 * Get all unions involving a specific person, sorted by unionId
 */
function getPersonUnions(
  personId: string,
  allUnions: Union[],
  relationships: Relationship[]
): Union[] {
  const unionIds = relationships
    .filter((r) => r.type === 'PARTNER_IN' && r.fromId === personId)
    .map((r) => r.toId);

  return allUnions
    .filter((u) => unionIds.includes(u.unionId))
    .sort((a, b) => a.unionId.localeCompare(b.unionId)); // Consistent ordering
}

/**
 * Get the index of a specific union among a person's unions
 * Returns -1 if not found
 */
function getUnionIndex(
  personId: string,
  currentUnionId: string,
  allUnions: Union[],
  relationships: Relationship[]
): number {
  const personUnions = getPersonUnions(personId, allUnions, relationships);
  return personUnions.findIndex((u) => u.unionId === currentUnionId);
}

/**
 * Calculate the Y position for a spouse line, accounting for multiple spouses
 */
function calculateSpouseLineY(
  person1Id: string,
  person2Id: string,
  person1Pos: Position,
  unionId: string,
  allUnions: Union[],
  relationships: Relationship[],
  personHeight: number = LAYOUT_CONSTANTS.PERSON_HEIGHT
): number {
  // Base Y position (center of person card)
  const baseY = person1Pos.y + personHeight / 2;

  // Find which person has multiple unions (if any)
  const person1Unions = getPersonUnions(person1Id, allUnions, relationships);
  const person2Unions = getPersonUnions(person2Id, allUnions, relationships);

  let unionIndex = 0;

  if (person1Unions.length > 1) {
    // Person 1 has multiple spouses - use their union index
    unionIndex = getUnionIndex(person1Id, unionId, allUnions, relationships);
  } else if (person2Unions.length > 1) {
    // Person 2 has multiple spouses - use their union index
    unionIndex = getUnionIndex(person2Id, unionId, allUnions, relationships);
  }

  // Apply offset if this is not the first spouse
  if (unionIndex > 0) {
    return baseY + (unionIndex * LAYOUT_CONSTANTS.SPOUSE_LINE_Y_OFFSET);
  }

  return baseY;
}

/**
 * Compute the rank of this union among all same-row unions that have children.
 * Rank 0 = leftmost, rank 1 = next, etc.
 * Used to stagger bracket/junction Y positions so they don't overlap.
 */
/**
 * Unified Edge Y Registry — assigns a GLOBALLY unique Y coordinate for
 * each union's horizontal branch segment within a generation gap.
 *
 * All unions in the same row share a SINGLE reference frame (parentBottomY
 * → minChildY). Each ranked union gets an evenly-distributed Y within the
 * usable zone (15%–50% of gap). This guarantees NO horizontal overlaps.
 */
interface EdgeYRegistry {
  reservedY: number;   // The absolute Y for this union's horizontal segment
  rank: number;        // Left-to-right rank among same-row unions
  total: number;       // Total unions with children in this row
}

function computeEdgeYRegistry(
  currentUnionId: string,
  positions: Map<string, Position>,
  allUnions: Union[],
  relationships: Relationship[],
  personHeight: number
): EdgeYRegistry {
  const currentUnionPos = positions.get(currentUnionId);
  if (!currentUnionPos) return { reservedY: 0, rank: 0, total: 1 };

  const Y_TOLERANCE = 10;

  // All unions with children in same row
  const unionsWithChildren = allUnions.filter(u =>
    relationships.some(r => r.type === 'HAS_CHILD' && r.fromId === u.unionId)
  );

  const sameRowUnions = unionsWithChildren.filter(u => {
    const uPos = positions.get(u.unionId);
    return uPos && Math.abs(uPos.y - currentUnionPos.y) <= Y_TOLERANCE;
  });

  sameRowUnions.sort((a, b) =>
    positions.get(a.unionId)!.x - positions.get(b.unionId)!.x
  );

  const rank = sameRowUnions.findIndex(u => u.unionId === currentUnionId);
  const total = sameRowUnions.length;
  const safeRank = rank === -1 ? 0 : rank;

  // GLOBAL reference frame: use the generation Y (same for all unions in row)
  // unionPos.y = personY + personHeight/2 - unionHeight, so the actual card bottom
  // is at unionPos.y + personHeight/2 + unionHeight.  Add clearance below the card.
  const parentBottomY = currentUnionPos.y + personHeight / 2 + LAYOUT_CONSTANTS.UNION_HEIGHT + 8;

  // Find the minimum child Y across ALL same-row unions' children
  let minChildY = Infinity;
  for (const u of sameRowUnions) {
    const childRels = relationships.filter(r => r.type === 'HAS_CHILD' && r.fromId === u.unionId);
    for (const cr of childRels) {
      const childPos = positions.get(cr.toId);
      if (childPos) minChildY = Math.min(minChildY, childPos.y);
    }
  }
  if (minChildY === Infinity) minChildY = parentBottomY + 200;

  const totalGap = minChildY - parentBottomY;

  // Guard against zero/negative gap (e.g. hidden spouses causing layout mismatch)
  if (totalGap <= 0) {
    return { reservedY: parentBottomY + 20, rank: safeRank, total };
  }

  // Usable zone: 8% to 72% of gap from parent bottom
  // Wide zone ensures overlapping brackets (e.g. cross-marriages) are clearly separated
  const zoneTop = parentBottomY + totalGap * 0.08;
  const zoneBottom = parentBottomY + totalGap * 0.72;
  const zoneHeight = zoneBottom - zoneTop;

  // Evenly distribute ranks: rank 0 at top, rank N-1 at bottom of zone
  // Enforce minimum 35px separation between adjacent brackets so
  // overlapping horizontal spans (e.g. cross-marriages) remain visually distinct
  const MIN_BRACKET_SEP = 35;
  const step = total > 1 ? Math.max(MIN_BRACKET_SEP, zoneHeight / (total - 1)) : 0;
  let reservedY = Math.min(zoneTop + safeRank * step, minChildY - 8);

  // Guard against NaN/Infinity from degenerate layout
  if (!Number.isFinite(reservedY)) {
    reservedY = parentBottomY + 20;
  }

  return { reservedY, rank: safeRank, total };
}

export interface UnionEdgeGroupProps {
  union: Union;
  positions: Map<string, Position>;
  persons: Person[];
  allUnions: Union[];
  relationships: Relationship[];
  relationshipLabels: Map<string, RelationshipLabelEntry>;
  homePersonName: string;
  homePersonId: string;
  onCollapseGroup?: (groupId: string) => void;
  onExpandGroup?: (groupId: string) => void;
  collapsedGroups?: Map<string, import('@/types').CollapsedGroup>;
  availableGroups?: import('@/types').CollapsedGroup[];
  collapsedUnionIds?: Set<string>;
  onToggleUnionCollapse?: (unionId: string) => void;
  /** Person/union IDs hidden by union collapse — edges to these should not render */
  hiddenByCollapse?: Set<string>;
  personWidth?: number;
  personHeight?: number;
  // Locale-aware group labels (optional, falls back to hardcoded Hindi)
  childrenGroupLabels?: Record<string, { localized: string; english: string }>;
  parentPairLabels?: Record<string, { localized: string; english: string }>;
  // Locale code for label display (e.g. 'en', 'hi-IN')
  locale?: string;
  // Relationship path highlighting
  highlightedPersonIds?: Set<string>;
  // Missing generation warnings (parent-child age gap > 55 years)
  missingGenerationWarnings?: Array<{ parentId: string; childId: string; ageGap: number }>;
}

export const UnionEdgeGroup = memo(function UnionEdgeGroup({
  union,
  positions,
  persons,
  allUnions,
  relationships,
  relationshipLabels,
  homePersonName,
  homePersonId,
  onCollapseGroup,
  onExpandGroup,
  collapsedGroups,
  availableGroups,
  collapsedUnionIds,
  onToggleUnionCollapse,
  hiddenByCollapse,
  personWidth: pw = LAYOUT_CONSTANTS.PERSON_WIDTH,
  personHeight: ph = LAYOUT_CONSTANTS.PERSON_HEIGHT,
  childrenGroupLabels: childrenGroupLabelsProp,
  parentPairLabels: parentPairLabelsProp,
  locale = 'en',
  highlightedPersonIds: _highlightedPersonIds,
  missingGenerationWarnings,
}: UnionEdgeGroupProps) {
  // Use prop labels if provided and non-empty, fall back to hardcoded defaults
  const effectiveChildrenGroupLabels =
    childrenGroupLabelsProp && Object.keys(childrenGroupLabelsProp).length > 0
      ? childrenGroupLabelsProp
      : CHILDREN_GROUP_LABELS_DEFAULT;
  const effectiveParentPairLabels =
    parentPairLabelsProp && Object.keys(parentPairLabelsProp).length > 0
      ? parentPairLabelsProp
      : PARENT_PAIR_LABELS_DEFAULT;
  const unionPos = positions.get(union.unionId);
  if (!unionPos) {
    console.warn(`Union ${union.unionId} has no position`);
    return null;
  }

  // Memoize partner/child lookups to avoid O(r) scans on every render
  const partnerIds = useMemo(() =>
    relationships
      .filter((r) => r.type === 'PARTNER_IN' && r.toId === union.unionId)
      .map((r) => r.fromId),
    [relationships, union.unionId]
  );

  const childIds = useMemo(() =>
    relationships
      .filter((r) => r.type === 'HAS_CHILD' && r.fromId === union.unionId)
      .map((r) => r.toId),
    [relationships, union.unionId]
  );

  // Memoize edge Y registry (expensive: scans all unions in same row)
  const { reservedY: edgeReservedY, rank: bracketRank, total: totalBracketsInGenRow } = useMemo(() =>
    computeEdgeYRegistry(union.unionId, positions, allUnions, relationships, ph),
    [union.unionId, positions, allUnions, relationships, ph]
  );

  // Distinct hue per union — each union in a generation row gets a unique color
  // so branches from different marriages are easily traceable.
  const BRANCH_PALETTE = [
    '#5B7FA5', // steel blue
    '#7A6DAB', // muted purple
    '#4A9E8F', // teal
    '#2F3E8F', // warm amber
    '#8E6B47', // brown
    '#6B8E5A', // olive green
    '#A85C7B', // mauve
    '#5A8EA6', // ocean blue
    '#9B7D4E', // gold
    '#7B5E8E', // plum
    '#4E8E7B', // jade
    '#A6745A', // sienna
  ];
  const unionColor = BRANCH_PALETTE[bracketRank % BRANCH_PALETTE.length];

  const partners = partnerIds
    .map((id) => ({ id, pos: positions.get(id), person: persons.find((p) => p.personId === id) }))
    .filter((p) => p.pos && p.person) as Array<{
    id: string;
    pos: Position;
    person: Person;
  }>;

  const children = childIds
    .filter((id) => !hiddenByCollapse?.has(id))  // Hide children collapsed by chevron
    .map((id) => ({ id, pos: positions.get(id), person: persons.find((p) => p.personId === id) }))
    .filter((c) => c.pos && c.person) as Array<{
    id: string;
    pos: Position;
    person: Person;
  }>;

  // Determine the T-junction anchor from which children branch.
  // For two partners: the junction sits EXACTLY on the spouse line at its midpoint,
  // so the child branch forms a proper T with the horizontal spouse line.
  // For a single parent: the branch starts from the bottom-center of the parent card.
  let unionBottomAnchor: Position;

  if (partners.length === 2) {
    // Identify left and right partners by X position
    const leftP = partners[0].pos.x <= partners[1].pos.x ? partners[0] : partners[1];
    const rightP = partners[0].pos.x <= partners[1].pos.x ? partners[1] : partners[0];

    // Y: exactly on the spouse line (center of the person cards)
    const spouseLineY = calculateSpouseLineY(
      partners[0].id,
      partners[1].id,
      partners[0].pos,
      union.unionId,
      allUnions,
      relationships,
      ph
    );

    // X: midpoint of the horizontal spouse line segment
    // (from right-edge of left card to left-edge of right card)
    const x1 = leftP.pos.x + pw;
    const x2 = rightP.pos.x;

    unionBottomAnchor = { x: (x1 + x2) / 2, y: spouseLineY };
  } else if (partners.length === 1) {
    // Single parent: branch from the bottom-center of the parent card
    const p = partners[0];
    unionBottomAnchor = {
      x: p.pos.x + pw / 2,
      y: p.pos.y + ph,
    };
  } else {
    // No visible partners: fall back to union node bottom-center
    unionBottomAnchor = {
      x: unionPos.x + LAYOUT_CONSTANTS.UNION_WIDTH / 2,
      y: unionPos.y + LAYOUT_CONSTANTS.UNION_HEIGHT,
    };
  }

  return (
    <g className="union-edge-group" data-union-id={union.unionId}>
      {/* Spouse Line (horizontal between partners) */}
      {partners.length === 2 && (
        <SpouseLine
          partner1Pos={partners[0].pos}
          partner2Pos={partners[1].pos}
          partner1Id={partners[0].id}
          partner2Id={partners[1].id}
          union={union}
          allUnions={allUnions}
          relationships={relationships}
          persons={persons}
          color={unionColor}
          personWidth={pw}
          personHeight={ph}
        />
      )}

      {/* Children Edges (STRICT ORTHOGONAL ROUTING WITH PROPER T-JUNCTIONS) */}
      {children.length > 0 && (
        <ChildrenEdges
          unionBottomAnchor={unionBottomAnchor}
          children={children}
          unionType={union.type}
          unionId={union.unionId}
          color={unionColor}
          bracketRank={bracketRank}
          totalBracketsInGenRow={totalBracketsInGenRow}
          edgeReservedY={edgeReservedY}
          relationshipLabels={relationshipLabels}
          homePersonName={homePersonName}
          homePersonId={homePersonId}
          partnerIds={partnerIds}
          onCollapseGroup={onCollapseGroup}
          onExpandGroup={onExpandGroup}
          collapsedGroups={collapsedGroups}
          availableGroups={availableGroups}
          collapsedUnionIds={collapsedUnionIds}
          onToggleUnionCollapse={onToggleUnionCollapse}
          personWidth={pw}
          personHeight={ph}
          effectiveChildrenGroupLabels={effectiveChildrenGroupLabels}
          effectiveParentPairLabels={effectiveParentPairLabels}
          locale={locale}
        />
      )}

      {/* Missing generation warning indicators (orange triangles on edges with age gap > 55) */}
      {missingGenerationWarnings && missingGenerationWarnings.length > 0 && children.map(child => {
        const warning = missingGenerationWarnings.find(w => w.childId === child.id);
        if (!warning) return null;
        const childTopX = child.pos.x + (pw || LAYOUT_CONSTANTS.PERSON_WIDTH) / 2;
        const childTopY = child.pos.y;
        const indicatorY = childTopY - 18;
        return (
          <g key={`mgw-${child.id}`} className="missing-generation-warning">
            <polygon
              points={`${childTopX - 8},${indicatorY + 14} ${childTopX},${indicatorY} ${childTopX + 8},${indicatorY + 14}`}
              fill="#2F3E8F"
              stroke="white"
              strokeWidth={1}
              opacity={0.9}
            />
            <text x={childTopX} y={indicatorY + 11} textAnchor="middle" fontSize={9} fill="white" fontWeight="bold">!</text>
            <title>{warning.ageGap}-year age gap — possible missing generation</title>
          </g>
        );
      })}

      {/* Fallback chevron when union is collapsed and all children are hidden */}
      {children.length === 0 && collapsedUnionIds?.has(union.unionId) && onToggleUnionCollapse && (
        <ChevronButton
          x={unionBottomAnchor.x}
          y={unionBottomAnchor.y + ph / 2 + LAYOUT_CONSTANTS.CHEVRON_BUTTON_RADIUS + 4}
          direction="down"
          onClick={() => onToggleUnionCollapse(union.unionId)}
        />
      )}
    </g>
  );
});

// ============================================================================
// Chevron Expand/Collapse Button (SVG sub-component)
// ============================================================================

interface ChevronButtonProps {
  x: number;
  y: number;
  direction: 'up' | 'down';
  onClick: () => void;
}

function ChevronButton({ x, y, direction, onClick }: ChevronButtonProps) {
  const r = LAYOUT_CONSTANTS.CHEVRON_BUTTON_RADIUS;
  // Chevron path: small "V" or "^" inside the circle
  const chevronPath = direction === 'up'
    ? `M ${-5} ${2.5} L ${0} ${-2.5} L ${5} ${2.5}`   // ^ shape
    : `M ${-5} ${-2.5} L ${0} ${2.5} L ${5} ${-2.5}`;  // v shape

  return (
    <g
      className="chevron-button"
      transform={`translate(${x}, ${y})`}
      style={{ pointerEvents: 'all', cursor: 'pointer' }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* Drop shadow */}
      <circle
        r={r}
        fill="rgba(0,0,0,0.15)"
        transform="translate(0, 1)"
      />
      <circle
        r={r}
        fill="#767676"
      />
      <path
        d={chevronPath}
        stroke="white"
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <title>{direction === 'up' ? 'Collapse group' : 'Expand group'}</title>
    </g>
  );
}

// ============================================================================
// Edge Relationship Label (Pill-style SVG label)
// ============================================================================

interface EdgeRelationshipLabelProps {
  x: number;
  y: number;
  label: string;
  color: string;
}

function EdgeRelationshipLabel({ x: _x, y: _y, label: _label }: EdgeRelationshipLabelProps) {
  // Relationship labels are hidden for now
  return null;

  // Truncate very long labels (increased limit for Hindi+English group labels)
  const displayLabel = _label.length > 50 ? _label.slice(0, 48) + '…' : _label;

  // Estimate pill width (6px per char for mixed Hindi/Latin text + padding)
  const pillWidth = Math.max(displayLabel.length * 6 + 24, 48);
  const pillHeight = 22;

  return (
    <g className="edge-relationship-label" transform={`translate(${_x}, ${_y})`}>
      {/* Drop shadow */}
      <rect
        x={-pillWidth / 2 + 1}
        y={-pillHeight / 2 + 1}
        width={pillWidth}
        height={pillHeight}
        rx={11}
        fill="rgba(0,0,0,0.25)"
      />
      <rect
        x={-pillWidth / 2}
        y={-pillHeight / 2}
        width={pillWidth}
        height={pillHeight}
        rx={11}
        fill="#1a1a2e"
        stroke={LAYOUT_CONSTANTS.EDGE_COLOR}
        strokeWidth={1}
        opacity={0.95}
      />
      <text
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fill="#e5e7eb"
        fontWeight="600"
        letterSpacing="0.02em"
      >
        {displayLabel}
      </text>
    </g>
  );
}

/**
 * Build a formatted label string from a RelationshipLabelEntry.
 * Shows only one language based on the selected locale.
 * English locale → English label only.
 * Other locales → localized label only.
 */
function formatEdgeLabel(entry: RelationshipLabelEntry | undefined, locale: string = 'en'): string {
  if (!entry) return '';
  if (entry.structuralType === 'self') return '';

  if (locale === 'en') {
    return entry.englishLabel;
  }

  const locLabel = entry.localizedLabel || entry.hindiLabel;
  // If localized and English are the same (no translation available), show English
  if (!locLabel || locLabel === entry.englishLabel) {
    return entry.englishLabel;
  }

  return locLabel;
}

// ============================================================================
// Group Label Dictionaries (Indian Kinship)
// ============================================================================

/**
 * Dictionary: Given the parents' relationship to the home person,
 * what should the children's group be called?
 *
 * Key format: "{structuralType}" or "{structuralType}.{lineage}"
 * More specific keys (with lineage) take priority over generic ones.
 */
const CHILDREN_GROUP_LABELS_DEFAULT: Record<string, { localized: string; english: string }> = {
  'self':                   { localized: 'बच्चे',                  english: 'Children' },
  'parent':                 { localized: 'भाई-बहन',                english: 'Siblings' },
  'grandparent.paternal':   { localized: 'पिता & चाचा-बुआ',       english: 'Father & Paternal Uncles/Aunts' },
  'grandparent.maternal':   { localized: 'माता & मामा-मौसी',       english: 'Mother & Maternal Uncles/Aunts' },
  'grandparent':            { localized: 'माता-पिता की पीढ़ी',      english: "Parents' Generation" },
  'uncle.paternal':         { localized: 'चचेरे भाई-बहन',         english: 'Paternal Cousins' },
  'aunt.paternal':          { localized: 'फुफेरे भाई-बहन',        english: "Father's Sister's Children" },
  'uncle.maternal':         { localized: 'ममेरे भाई-बहन',         english: 'Maternal Cousins' },
  'aunt.maternal':          { localized: 'मौसेरे भाई-बहन',        english: "Mother's Sister's Children" },
  'uncle':                  { localized: 'भतीजे-भतीजी',           english: 'Cousins' },
  'aunt':                   { localized: 'भतीजे-भतीजी',           english: 'Cousins' },
  'sibling':                { localized: 'भतीजे-भतीजी',           english: 'Nephews & Nieces' },
  'child':                  { localized: 'पोते-पोती',             english: 'Grandchildren' },
  'grandchild':             { localized: 'परपोते-परपोती',          english: 'Great-Grandchildren' },
  'cousin.paternal':        { localized: 'चचेरे भाई के बच्चे',    english: "Paternal Cousin's Children" },
  'cousin.maternal':        { localized: 'ममेरे भाई के बच्चे',    english: "Maternal Cousin's Children" },
  'cousin':                 { localized: 'भाई के बच्चे',          english: "Cousin's Children" },
  'nephew':                 { localized: 'भतीजे के बच्चे',        english: "Nephew's Children" },
  'niece':                  { localized: 'भतीजी के बच्चे',        english: "Niece's Children" },
};

/**
 * Dictionary: Labels for the parent couple on the vertical stem.
 * Key format same as above.
 */
const PARENT_PAIR_LABELS_DEFAULT: Record<string, { localized: string; english: string }> = {
  'self':                   { localized: '',                       english: '' },
  'parent':                 { localized: 'माता-पिता',             english: 'Parents' },
  'grandparent.paternal':   { localized: 'दादा-दादी',             english: 'Paternal Grandparents' },
  'grandparent.maternal':   { localized: 'नाना-नानी',             english: 'Maternal Grandparents' },
  'grandparent':            { localized: 'दादा/नाना',             english: 'Grandparents' },
  'uncle.paternal':         { localized: 'चाचा-चाची',             english: 'Paternal Uncle & Wife' },
  'aunt.paternal':          { localized: 'बुआ-फूफा',              english: 'Paternal Aunt & Husband' },
  'uncle.maternal':         { localized: 'मामा-मामी',             english: 'Maternal Uncle & Wife' },
  'aunt.maternal':          { localized: 'मौसी-मौसा',             english: 'Maternal Aunt & Husband' },
  'sibling':                { localized: 'भाई/बहन',               english: 'Sibling & Spouse' },
  'child':                  { localized: 'बेटा/बेटी',             english: 'Son/Daughter & Spouse' },
  'cousin.paternal':        { localized: 'चचेरे भाई',             english: 'Paternal Cousin & Spouse' },
  'cousin.maternal':        { localized: 'ममेरे भाई',             english: 'Maternal Cousin & Spouse' },
  'cousin':                 { localized: 'भाई',                   english: 'Cousin & Spouse' },
  'nephew':                 { localized: 'भतीजा',                 english: 'Nephew & Spouse' },
  'niece':                  { localized: 'भतीजी',                 english: 'Niece & Spouse' },
  'grandchild':             { localized: 'पोता/पोती',             english: 'Grandchild & Spouse' },
};

// ============================================================================
// Group Label Helpers (Ancestry.com style with Indian Kinship)
// ============================================================================

/**
 * Find the "primary" parent in a union — the blood-related one whose
 * structuralType best describes the group. Prefers non-spouse, non-self.
 */
function findPrimaryParentLabel(
  partnerIds: string[],
  relationshipLabels: Map<string, RelationshipLabelEntry>
): RelationshipLabelEntry | null {
  const partnerLabels = partnerIds
    .map(id => relationshipLabels.get(id))
    .filter((e): e is RelationshipLabelEntry => !!e);

  if (partnerLabels.length === 0) return null;

  // Prefer the partner whose type is NOT 'spouse' (blood relation)
  // If both are meaningful (e.g., both grandparents), pick the first one
  const bloodRelated = partnerLabels.find(e =>
    e.structuralType !== 'spouse' && e.structuralType !== 'self' && e.structuralType !== 'none'
  );

  return bloodRelated || partnerLabels[0];
}

/**
 * Look up a label from a dictionary, trying specific key first then generic.
 */
function lookupLabel(
  dict: Record<string, { localized: string; english: string }>,
  entry: RelationshipLabelEntry
): { localized: string; english: string } | null {
  const specificKey = `${entry.structuralType}.${entry.lineage}`;
  const genericKey = entry.structuralType;

  return dict[specificKey] || dict[genericKey] || null;
}

/**
 * Format a group label for display in a single language.
 * English locale → "Name's English".
 * Other locales → "Name के Localized" (or falls back to English).
 */
function formatGroupLabel(
  name: string,
  label: { localized: string; english: string },
  locale: string = 'en'
): string {
  if (locale === 'en' || !label.localized || label.localized === label.english) {
    return `${name}'s ${label.english}`;
  }
  const localizedName = transliterate(name, locale);
  return `${localizedName} के ${label.localized}`;
}

/**
 * Compute a group-level label for a children bracket.
 * Strategy: derive the label from the PARENTS' relationship to the home person.
 */
function computeGroupLabel(
  homePersonId: string,
  homePersonName: string,
  partnerIds: string[],
  childIds: string[],
  relationshipLabels: Map<string, RelationshipLabelEntry>,
  childrenLabels: Record<string, { localized: string; english: string }>,
  locale: string = 'en'
): string {
  if (!homePersonName || childIds.length === 0) return '';

  // If home person is one of the partners → these are their children
  if (partnerIds.includes(homePersonId)) {
    return formatGroupLabel(homePersonName, childrenLabels['self'], locale);
  }

  // If home person is one of the children → these are their siblings
  if (childIds.includes(homePersonId)) {
    return formatGroupLabel(homePersonName, childrenLabels['parent'], locale);
  }

  // Derive from parents' relationship to home person
  const primaryParent = findPrimaryParentLabel(partnerIds, relationshipLabels);
  if (!primaryParent) return '';
  if (primaryParent.structuralType === 'self') {
    return formatGroupLabel(homePersonName, childrenLabels['self'], locale);
  }
  if (primaryParent.structuralType === 'none') return '';

  const label = lookupLabel(childrenLabels, primaryParent);
  if (label) {
    return formatGroupLabel(homePersonName, label, locale);
  }

  // Fallback: use parent's own label to describe children generically
  if (locale === 'en') {
    return `${primaryParent.englishLabel}'s Children`;
  }
  const locLabel = primaryParent.localizedLabel || primaryParent.hindiLabel;
  if (!locLabel || locLabel === primaryParent.englishLabel) {
    return `${primaryParent.englishLabel}'s Children`;
  }
  return `${locLabel} के बच्चे`;
}

/**
 * Compute a label for the parent branch (vertical stem from union to bracket).
 * Strategy: derive from the PARENTS' relationship to the home person.
 */
function computeParentBranchLabel(
  homePersonId: string,
  homePersonName: string,
  partnerIds: string[],
  relationshipLabels: Map<string, RelationshipLabelEntry>,
  parentLabels: Record<string, { localized: string; english: string }>,
  locale: string = 'en'
): string {
  if (!homePersonName || partnerIds.length === 0) return '';

  // Don't label the home person's own union
  if (partnerIds.includes(homePersonId)) return '';

  const primaryParent = findPrimaryParentLabel(partnerIds, relationshipLabels);
  if (!primaryParent) return '';
  if (primaryParent.structuralType === 'self' || primaryParent.structuralType === 'none') return '';

  const label = lookupLabel(parentLabels, primaryParent);
  if (label) {
    if (locale === 'en' || !label.localized || label.localized === label.english) {
      return `${homePersonName}'s ${label.english}`;
    }
    const localizedName = transliterate(homePersonName, locale);
    return `${localizedName} के ${label.localized}`;
  }

  return '';
}

// ============================================================================
// Spouse Line (HORIZONTAL ONLY)
// ============================================================================

interface SpouseLineProps {
  partner1Pos: Position;
  partner2Pos: Position;
  partner1Id: string;
  partner2Id: string;
  union: Union;
  allUnions: Union[];
  relationships: Relationship[];
  persons: Person[];
  color: string;
  personWidth?: number;
  personHeight?: number;
}

function SpouseLine({
  partner1Pos,
  partner2Pos,
  partner1Id,
  partner2Id,
  union,
  allUnions,
  relationships,
  persons: _persons,
  color,
  personWidth: spPw = LAYOUT_CONSTANTS.PERSON_WIDTH,
  personHeight: spPh = LAYOUT_CONSTANTS.PERSON_HEIGHT,
}: SpouseLineProps) {
  // Check if either partner is a placeholder - don't render spouse line to/from placeholders
  const isPlaceholder1 = partner1Id.startsWith('placeholder-');
  const isPlaceholder2 = partner2Id.startsWith('placeholder-');

  if (isPlaceholder1 || isPlaceholder2) {
    return null;
  }

  // Calculate Y position with offset for multiple spouses
  const y = calculateSpouseLineY(
    partner1Id,
    partner2Id,
    partner1Pos,
    union.unionId,
    allUnions,
    relationships,
    spPh
  );

  // Determine which partner is on the left
  const leftPos = partner1Pos.x < partner2Pos.x ? partner1Pos : partner2Pos;
  const rightPos = partner1Pos.x < partner2Pos.x ? partner2Pos : partner1Pos;

  const x1 = leftPos.x + spPw; // Right edge of left card
  const x2 = rightPos.x; // Left edge of right card
  const midX = (x1 + x2) / 2;

  // Distinct color per union — spouse line and dot match the branch color
  const patternStyle = getMarriagePatternStyle(union);
  const lineColor = color;
  const dotColor = color;

  return (
    <g className="spouse-line-group">
      {/* Single spouse line — neutral gray (Ancestry style) */}
      <line
        className="spouse-edge"
        x1={x1}
        y1={y}
        x2={x2}
        y2={y}
        stroke={lineColor}
        strokeWidth={LAYOUT_CONSTANTS.EDGE_STROKE_WIDTH}
        strokeDasharray={patternStyle.strokeDasharray}
        data-edge-type="spouse"
        data-marriage-pattern={union.marriagePattern || 'standard'}
      />

      {/* Union dot at midpoint — orange-brown (Ancestry style) */}
      <circle
        cx={midX}
        cy={y}
        r={LAYOUT_CONSTANTS.SPOUSE_DOT_RADIUS}
        fill={dotColor}
        stroke="white"
        strokeWidth={1.5}
        data-edge-type="union-dot"
      />
    </g>
  );
}

// ============================================================================
// Children Edges (ORTHOGONAL ROUTING WITH PROPER T-JUNCTIONS)
// ============================================================================

interface ChildrenEdgesProps {
  unionBottomAnchor: Position;
  children: Array<{
    id: string;
    pos: Position;
    person: Person;
  }>;
  unionType: string;
  unionId: string;
  color: string;
  bracketRank: number;
  totalBracketsInGenRow: number;
  edgeReservedY: number;
  relationshipLabels: Map<string, RelationshipLabelEntry>;
  homePersonName: string;
  homePersonId: string;
  partnerIds: string[];
  onCollapseGroup?: (groupId: string) => void;
  onExpandGroup?: (groupId: string) => void;
  collapsedGroups?: Map<string, import('@/types').CollapsedGroup>;
  availableGroups?: import('@/types').CollapsedGroup[];
  collapsedUnionIds?: Set<string>;
  onToggleUnionCollapse?: (unionId: string) => void;
  personWidth?: number;
  personHeight?: number;
  effectiveChildrenGroupLabels: Record<string, { localized: string; english: string }>;
  effectiveParentPairLabels: Record<string, { localized: string; english: string }>;
  locale?: string;
}

function ChildrenEdges({
  unionBottomAnchor, children, unionType: _unionType, unionId, color, bracketRank, totalBracketsInGenRow, edgeReservedY, relationshipLabels,
  homePersonName, homePersonId, partnerIds,
  onCollapseGroup, onExpandGroup, collapsedGroups, availableGroups,
  collapsedUnionIds, onToggleUnionCollapse,
  personWidth: cePw = LAYOUT_CONSTANTS.PERSON_WIDTH,
  personHeight: cePh = LAYOUT_CONSTANTS.PERSON_HEIGHT,
  effectiveChildrenGroupLabels, effectiveParentPairLabels,
  locale = 'en',
}: ChildrenEdgesProps) {
  if (children.length === 0) return null;

  // Sort children by x position (left to right)
  const sortedChildren = [...children].sort((a, b) => a.pos.x - b.pos.x);

  if (sortedChildren.length === 1) {
    // Single child: ORTHOGONAL path (vertical → horizontal → vertical)
    return (
      <SingleChildEdge
        unionBottomAnchor={unionBottomAnchor}
        child={sortedChildren[0]}
        color={color}
        bracketRank={bracketRank}
        totalBracketsInGenRow={totalBracketsInGenRow}
        edgeReservedY={edgeReservedY}
        relationshipLabels={relationshipLabels}
        unionId={unionId}
        collapsedUnionIds={collapsedUnionIds}
        onToggleUnionCollapse={onToggleUnionCollapse}
        personWidth={cePw}
        personHeight={cePh}
        locale={locale}
      />
    );
  }

  // Multiple children: bracket pattern with PROPER T-JUNCTION
  return (
    <MultipleChildrenEdges
      unionBottomAnchor={unionBottomAnchor}
      children={sortedChildren}
      color={color}
      bracketRank={bracketRank}
      totalBracketsInGenRow={totalBracketsInGenRow}
      edgeReservedY={edgeReservedY}
      relationshipLabels={relationshipLabels}
      homePersonName={homePersonName}
      homePersonId={homePersonId}
      partnerIds={partnerIds}
      unionId={unionId}
      onCollapseGroup={onCollapseGroup}
      onExpandGroup={onExpandGroup}
      collapsedGroups={collapsedGroups}
      availableGroups={availableGroups}
      collapsedUnionIds={collapsedUnionIds}
      onToggleUnionCollapse={onToggleUnionCollapse}
      personWidth={cePw}
      personHeight={cePh}
      effectiveChildrenGroupLabels={effectiveChildrenGroupLabels}
      effectiveParentPairLabels={effectiveParentPairLabels}
      locale={locale}
    />
  );
}

// ============================================================================
// Single Child Edge (ORTHOGONAL: V → H → V)
// ============================================================================

interface SingleChildEdgeProps {
  unionBottomAnchor: Position;
  child: {
    id: string;
    pos: Position;
    person: Person;
  };
  color: string;
  bracketRank: number;
  totalBracketsInGenRow: number;
  edgeReservedY: number;
  relationshipLabels: Map<string, RelationshipLabelEntry>;
  unionId: string;
  collapsedUnionIds?: Set<string>;
  onToggleUnionCollapse?: (unionId: string) => void;
  personWidth?: number;
  personHeight?: number;
  locale?: string;
}

function SingleChildEdge({
  unionBottomAnchor, child, color, bracketRank: _bracketRank, totalBracketsInGenRow: _totalBracketsInGenRow, edgeReservedY, relationshipLabels, unionId,
  collapsedUnionIds, onToggleUnionCollapse,
  personWidth: scPw = LAYOUT_CONSTANTS.PERSON_WIDTH,
  personHeight: scPh = LAYOUT_CONSTANTS.PERSON_HEIGHT,
  locale = 'en'
}: SingleChildEdgeProps) {
  const isPlaceholder = child.id.startsWith('placeholder-');
  const r = LAYOUT_CONSTANTS.EDGE_CORNER_RADIUS;

  const childTopAnchor = {
    x: child.pos.x + scPw / 2,
    y: child.pos.y,
  };

  const childLabel = formatEdgeLabel(relationshipLabels.get(child.id), locale);

  // Perfectly aligned vertically — simple straight vertical line
  if (Math.abs(unionBottomAnchor.x - childTopAnchor.x) < 1) {
    const stemVisibleTop = unionBottomAnchor.y + scPh / 2;
    const stemMidY = (stemVisibleTop + childTopAnchor.y) / 2;
    return (
      <g className="child-edge-vertical">
        <line
          className="child-edge"
          x1={unionBottomAnchor.x}
          y1={unionBottomAnchor.y}
          x2={childTopAnchor.x}
          y2={childTopAnchor.y}
          stroke={isPlaceholder ? '#CBD5E0' : color}
          strokeWidth={LAYOUT_CONSTANTS.EDGE_STROKE_WIDTH}
          strokeDasharray={isPlaceholder ? '4,4' : undefined}
          opacity={isPlaceholder ? 0.5 : 1}
          data-edge-type="child-single-vertical"
        />
        {childLabel && (
          <EdgeRelationshipLabel x={unionBottomAnchor.x + 8} y={stemMidY} label={childLabel} color={LAYOUT_CONSTANTS.EDGE_COLOR} />
        )}
        {onToggleUnionCollapse && (
          <ChevronButton x={unionBottomAnchor.x} y={unionBottomAnchor.y + scPh / 2 + LAYOUT_CONSTANTS.CHEVRON_BUTTON_RADIUS + 4} direction={collapsedUnionIds?.has(unionId) ? 'down' : 'up'} onClick={() => onToggleUnionCollapse(unionId)} />
        )}
      </g>
    );
  }

  // Orthogonal path with ROUNDED CORNERS: V → arc → H → arc → V
  // Junction Y from unified edge registry, but ensure minimum stem length
  // so curves have enough vertical space to render properly.
  const ux = unionBottomAnchor.x;
  const uy = unionBottomAnchor.y;
  const cx = childTopAnchor.x;
  const cy = childTopAnchor.y;

  // Minimum stem: the junction must be at least (cornerRadius * 2 + 4) below the union anchor
  // to allow a proper curve. Also must be at least that much above the child.
  const minStemFromParent = r * 2 + 4;
  const minStemToChild = r * 2 + 4;
  const maxJunctionY = cy - minStemToChild;
  const minJunctionY = uy + minStemFromParent;
  const junctionY = Math.max(minJunctionY, Math.min(edgeReservedY, maxJunctionY));

  const edgeStroke = isPlaceholder ? '#CBD5E0' : color;
  const edgeOpacity = isPlaceholder ? 0.5 : 1;
  const edgeDashArray = isPlaceholder ? '4,4' : undefined;

  const goingRight = cx > ux;

  // Clamp radius to available space — use safe minimums
  const availH = Math.abs(cx - ux);
  const availV1 = Math.abs(junctionY - uy);
  const availV2 = Math.abs(cy - junctionY);
  const cr = Math.max(2, Math.min(r, availH / 2, availV1 / 2, availV2 / 2));

  // SVG path with rounded corners at junctions
  // Sweep-flag rule: down→right uses sweep=0 (CCW), down→left uses sweep=1 (CW)
  // Second corner (horizontal→down): right→down uses sweep=1, left→down uses sweep=0
  const d = goingRight
    ? `M ${ux} ${uy} V ${junctionY - cr} a${cr},${cr} 0 0 0 ${cr},${cr} H ${cx - cr} a${cr},${cr} 0 0 1 ${cr},${cr} V ${cy}`
    : `M ${ux} ${uy} V ${junctionY - cr} a${cr},${cr} 0 0 1 ${-cr},${cr} H ${cx + cr} a${cr},${cr} 0 0 0 ${-cr},${cr} V ${cy}`;

  return (
    <g className="child-edge-orthogonal">
      <path
        d={d}
        stroke={edgeStroke}
        strokeWidth={LAYOUT_CONSTANTS.EDGE_STROKE_WIDTH}
        strokeDasharray={edgeDashArray}
        opacity={edgeOpacity}
        fill="none"
        data-edge-type="child-single-rounded"
      />
      {childLabel && (
        <EdgeRelationshipLabel x={ux + 8} y={(uy + scPh / 2 + junctionY) / 2} label={childLabel} color={LAYOUT_CONSTANTS.EDGE_COLOR} />
      )}
      {onToggleUnionCollapse && (() => {
        // Place chevron at bottom of parent card (Ancestry style: chevron on node, not on branch)
        const chevronY = uy + scPh / 2 + LAYOUT_CONSTANTS.CHEVRON_BUTTON_RADIUS + 4;
        return <ChevronButton x={ux} y={chevronY} direction={collapsedUnionIds?.has(unionId) ? 'down' : 'up'} onClick={() => onToggleUnionCollapse(unionId)} />;
      })()}
    </g>
  );
}

// ============================================================================
// Multiple Children Edges (BRACKET PATTERN - PROPER T-JUNCTION)
// ============================================================================

interface MultipleChildrenEdgesProps {
  unionBottomAnchor: Position;
  children: Array<{
    id: string;
    pos: Position;
    person: Person;
  }>;
  color: string;
  bracketRank: number;
  totalBracketsInGenRow: number;
  edgeReservedY: number;
  relationshipLabels: Map<string, RelationshipLabelEntry>;
  homePersonName: string;
  homePersonId: string;
  partnerIds: string[];
  unionId: string;
  onCollapseGroup?: (groupId: string) => void;
  onExpandGroup?: (groupId: string) => void;
  collapsedGroups?: Map<string, import('@/types').CollapsedGroup>;
  availableGroups?: import('@/types').CollapsedGroup[];
  collapsedUnionIds?: Set<string>;
  onToggleUnionCollapse?: (unionId: string) => void;
  personWidth?: number;
  personHeight?: number;
  effectiveChildrenGroupLabels: Record<string, { localized: string; english: string }>;
  effectiveParentPairLabels: Record<string, { localized: string; english: string }>;
  locale?: string;
}

function MultipleChildrenEdges({
  unionBottomAnchor, children, color, bracketRank: _bracketRank, totalBracketsInGenRow: _totalBracketsInGenRow, edgeReservedY, relationshipLabels,
  homePersonName, homePersonId, partnerIds, unionId,
  onCollapseGroup: _onCollapseGroup, onExpandGroup: _onExpandGroup, collapsedGroups: _collapsedGroups, availableGroups: _availableGroups,
  collapsedUnionIds, onToggleUnionCollapse,
  personWidth: mcPw = LAYOUT_CONSTANTS.PERSON_WIDTH,
  personHeight: mcPh = LAYOUT_CONSTANTS.PERSON_HEIGHT,
  effectiveChildrenGroupLabels, effectiveParentPairLabels,
  locale = 'en',
}: MultipleChildrenEdgesProps) {
  const leftChild = children[0];
  const rightChild = children[children.length - 1];

  // Bracket Y from unified edge registry — globally unique, no overlaps.
  // Ensure minimum stem distance from union anchor so curves render properly.
  const childTopY = leftChild.pos.y;
  const bracketR = LAYOUT_CONSTANTS.EDGE_CORNER_RADIUS;
  const minBracketFromUnion = unionBottomAnchor.y + mcPh / 2 + bracketR * 2 + 4;
  const maxBracketY = childTopY - bracketR * 2 - 4;
  // Safety: ensure bracket stays between union anchor and child top
  const clampedMax = Math.max(minBracketFromUnion, maxBracketY);
  const bracketY = Math.max(minBracketFromUnion, Math.min(edgeReservedY, clampedMax));

  // Bracket X positions (at child TOP anchor centers)
  const leftBracketX = leftChild.pos.x + mcPw / 2;
  const rightBracketX = rightChild.pos.x + mcPw / 2;

  // Union X position
  const unionX = unionBottomAnchor.x;

  // Compute group label for the bracket
  const childIds = children.map(c => c.id);
  const groupLabel = computeGroupLabel(homePersonId, homePersonName, partnerIds, childIds, relationshipLabels, effectiveChildrenGroupLabels, locale);

  // Compute parent branch label (on vertical stem from union to bracket)
  const parentLabel = computeParentBranchLabel(homePersonId, homePersonName, partnerIds, relationshipLabels, effectiveParentPairLabels, locale);

  // Bracket midpoint for group label
  const bracketMidX = (leftBracketX + rightBracketX) / 2;

  // Parent branch label position: place at 30% down the visible stem (upper portion)
  // to avoid overlapping with the group label near the bracket.
  const stemVisibleTop = unionBottomAnchor.y + mcPh / 2;
  const groupLabelY = bracketY - 24;
  const PILL_HEIGHT = 22;
  const LABEL_GAP = 8;
  const MIN_CLEARANCE = PILL_HEIGHT + LABEL_GAP; // 30px center-to-center
  // Position at 30% of visible stem length from the top
  let stemMidY = stemVisibleTop + (bracketY - stemVisibleTop) * 0.3;
  // Ensure clearance from group label (if it exists)
  if (groupLabel) {
    const minY = groupLabelY - MIN_CLEARANCE;
    if (stemMidY > minY) stemMidY = minY;
  }
  // Don't place above the visible stem top
  const stemTopBound = stemVisibleTop + PILL_HEIGHT / 2 + 4;
  stemMidY = Math.max(stemMidY, stemTopBound);
  // If stem is too short and parent label would still overlap group label, hide it
  const canShowParentLabel = !groupLabel || (stemMidY <= groupLabelY - PILL_HEIGHT);

  const r = LAYOUT_CONSTANTS.EDGE_CORNER_RADIUS;

  // ── Helpers ──────────────────────────────────────────────────────────
  // Clamp radius so it never exceeds the available space
  function clampR(availH: number, availV: number): number {
    return Math.max(0, Math.min(r, availH, availV));
  }

  return (
    <>
      {/* ── 1. Union-to-bracket stem ──────────────────────────────── */}
      {(() => {
        // Route stem to the bracket center so it clearly joins the horizontal bar
        // BETWEEN the children, not at a child's position.
        const targetX = bracketMidX;
        const dx = targetX - unionX;

        if (Math.abs(dx) < 2) {
          // Union is directly above bracket center — straight vertical drop
          return (
            <line
              x1={unionX} y1={unionBottomAnchor.y}
              x2={unionX} y2={bracketY}
              stroke={color}
              strokeWidth={LAYOUT_CONSTANTS.EDGE_STROKE_WIDTH}
              data-edge-type="union-to-bracket-vertical"
            />
          );
        }

        // Z-shaped path: vertical down → horizontal to bracket center → vertical down into bracket
        // Place the horizontal segment in the gap BETWEEN parent cards and child cards.
        // Parent card bottom = unionBottomAnchor.y + personHeight/2 (since anchor is at card mid-height)
        // Add 8px clearance below the card.
        const parentCardBottom = unionBottomAnchor.y + mcPh / 2 + 8;
        const turnY = Math.max(parentCardBottom, bracketY - (bracketY - parentCardBottom) * 0.5);
        const cr1 = clampR(Math.abs(dx) / 2, (turnY - unionBottomAnchor.y) / 2);
        const cr2 = clampR(Math.abs(dx) / 2, (bracketY - turnY) / 2);
        const goRight = dx > 0;

        const d = goRight
          ? `M ${unionX} ${unionBottomAnchor.y}` +
            ` V ${turnY - cr1}` +
            ` a ${cr1},${cr1} 0 0 0 ${cr1},${cr1}` +
            ` H ${targetX - cr2}` +
            ` a ${cr2},${cr2} 0 0 1 ${cr2},${cr2}` +
            ` V ${bracketY}`
          : `M ${unionX} ${unionBottomAnchor.y}` +
            ` V ${turnY - cr1}` +
            ` a ${cr1},${cr1} 0 0 1 ${-cr1},${cr1}` +
            ` H ${targetX + cr2}` +
            ` a ${cr2},${cr2} 0 0 0 ${-cr2},${cr2}` +
            ` V ${bracketY}`;
        return (
          <path d={d} stroke={color} strokeWidth={LAYOUT_CONSTANTS.EDGE_STROKE_WIDTH} fill="none" data-edge-type="union-to-bracket-Z" />
        );
      })()}

      {/* ── 2. Bracket: ╭──╮ with overhang extensions ─────────── */}
      {/* Original bracket path (╭──╮) connects curves seamlessly to the bar.
          Overhang lines extend past the outermost children on each side so
          children connect from the MIDDLE of the bar, not the edge. */}
      {(() => {
        const leftCx = leftChild.pos.x + mcPw / 2;
        const rightCx = rightChild.pos.x + mcPw / 2;
        const leftTopY = leftChild.pos.y;
        const rightTopY = rightChild.pos.y;
        const leftStem = leftTopY - bracketY;
        const rightStem = rightTopY - bracketY;
        const bracketSpan = rightCx - leftCx;
        const crL = clampR(bracketSpan / 2, leftStem / 2);
        const crR = clampR(bracketSpan / 2, rightStem / 2);
        const isLeftPlaceholder = leftChild.id.startsWith('placeholder-');
        const isRightPlaceholder = rightChild.id.startsWith('placeholder-');

        // Main bracket path: left-stem ╭── horizontal ──╮ right-stem
        // Curves connect naturally to the bar with no separate overhang lines
        const mainPath =
          `M ${leftCx} ${leftTopY}` +
          ` V ${bracketY + crL}` +
          ` a ${crL},${crL} 0 0 1 ${crL},${-crL}` +
          ` H ${rightCx - crR}` +
          ` a ${crR},${crR} 0 0 1 ${crR},${crR}` +
          ` V ${rightTopY}`;

        if (isLeftPlaceholder && isRightPlaceholder) {
          return (
            <>
              <line x1={leftCx} y1={bracketY} x2={leftCx} y2={leftTopY}
                stroke="#CBD5E0" strokeWidth={LAYOUT_CONSTANTS.EDGE_STROKE_WIDTH}
                strokeDasharray="4,4" opacity={0.5} />
              <line x1={leftCx} y1={bracketY} x2={rightCx} y2={bracketY}
                stroke={color} strokeWidth={LAYOUT_CONSTANTS.EDGE_STROKE_WIDTH} />
              <line x1={rightCx} y1={bracketY} x2={rightCx} y2={rightTopY}
                stroke="#CBD5E0" strokeWidth={LAYOUT_CONSTANTS.EDGE_STROKE_WIDTH}
                strokeDasharray="4,4" opacity={0.5} />
            </>
          );
        }

        if (isLeftPlaceholder) {
          return (
            <>
              <line x1={leftCx} y1={bracketY} x2={leftCx} y2={leftTopY}
                stroke="#CBD5E0" strokeWidth={LAYOUT_CONSTANTS.EDGE_STROKE_WIDTH}
                strokeDasharray="4,4" opacity={0.5} />
              <path d={`M ${leftCx} ${bracketY} H ${rightCx - crR} a ${crR},${crR} 0 0 1 ${crR},${crR} V ${rightTopY}`}
                stroke={color} strokeWidth={LAYOUT_CONSTANTS.EDGE_STROKE_WIDTH} fill="none" />
            </>
          );
        }

        if (isRightPlaceholder) {
          return (
            <>
              <path d={`M ${leftCx} ${leftTopY} V ${bracketY + crL} a ${crL},${crL} 0 0 1 ${crL},${-crL} H ${rightCx}`}
                stroke={color} strokeWidth={LAYOUT_CONSTANTS.EDGE_STROKE_WIDTH} fill="none" />
              <line x1={rightCx} y1={bracketY} x2={rightCx} y2={rightTopY}
                stroke="#CBD5E0" strokeWidth={LAYOUT_CONSTANTS.EDGE_STROKE_WIDTH}
                strokeDasharray="4,4" opacity={0.5} />
            </>
          );
        }

        // Normal case: single continuous bracket path
        return (
          <path d={mainPath} stroke={color}
            strokeWidth={LAYOUT_CONSTANTS.EDGE_STROKE_WIDTH} fill="none"
            data-edge-type="bracket-continuous" />
        );
      })()}

      {/* ── 3. Middle children stems (straight vertical from bracket) ─ */}
      {children.slice(1, -1).map((child) => {
        const childCenterX = child.pos.x + mcPw / 2;
        const childTopY = child.pos.y;
        const isPlaceholder = child.id.startsWith('placeholder-');

        return (
          <g key={child.id} className="bracket-child-stem">
            <line
              x1={childCenterX} y1={bracketY}
              x2={childCenterX} y2={childTopY}
              stroke={isPlaceholder ? '#CBD5E0' : color}
              strokeWidth={LAYOUT_CONSTANTS.EDGE_STROKE_WIDTH}
              strokeDasharray={isPlaceholder ? '4,4' : undefined}
              opacity={isPlaceholder ? 0.5 : 1}
              data-edge-type="bracket-to-child"
            />
          </g>
        );
      })}

      {/* ── 4. Labels & controls ──────────────────────────────────── */}
      {groupLabel && (
        <EdgeRelationshipLabel x={bracketMidX} y={bracketY - 24} label={groupLabel} color={LAYOUT_CONSTANTS.EDGE_COLOR} />
      )}
      {parentLabel && canShowParentLabel && (
        <EdgeRelationshipLabel x={unionX + 8} y={stemMidY} label={parentLabel} color={LAYOUT_CONSTANTS.EDGE_COLOR} />
      )}
      {onToggleUnionCollapse && (() => {
        // Place chevron at bottom of parent card (Ancestry style: chevron on node, not on branch)
        const chevronY = unionBottomAnchor.y + mcPh / 2 + LAYOUT_CONSTANTS.CHEVRON_BUTTON_RADIUS + 4;
        return (
          <ChevronButton
            x={unionX}
            y={chevronY}
            direction={collapsedUnionIds?.has(unionId) ? 'down' : 'up'}
            onClick={() => onToggleUnionCollapse(unionId)}
          />
        );
      })()}
    </>
  );
}
