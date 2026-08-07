export type FamilyTree = {
  id: string
  user_id: string
  tree_name: string
  description: string | null
  created_at: string
  updated_at: string
}

export type FamilyMember = {
  id: string
  tree_id: string
  first_name: string
  middle_name: string | null
  last_name: string | null
  maiden_name: string | null
  display_name: string | null
  gender: string | null
  date_of_birth: string | null
  date_of_birth_approx: boolean
  place_of_birth: string | null
  is_deceased: boolean
  date_of_death: string | null
  place_of_death: string | null
  burial_location: string | null
  memorial_note: string | null
  marital_status: string | null
  occupation: string | null
  nationality: string | null
  ethnicity: string | null
  biography: string | null
  personal_notes: string | null
  profile_photo_url: string | null
  relationship_to_primary: string
  position_x: number
  position_y: number
  is_primary_user: boolean
  visibility: string
  created_at: string
  updated_at: string
  created_by: string | null
}

export type Relationship = {
  id: string
  tree_id: string
  from_member_id: string
  to_member_id: string
  relationship_type: string
  marriage_date: string | null
  marriage_location: string | null
  divorce_date: string | null
  created_at: string
}

/** @deprecated Use the Neo4j-based LifeEvent type below instead */
export type LegacyLifeEvent = {
  id: string
  member_id: string
  event_type: string
  event_date: string | null
  date_precision: string
  description: string | null
  location: string | null
  created_at: string
  updated_at: string
}

export type Attachment = {
  attachmentId: string
  personId: string
  treeId: string
  fileName: string
  originalName: string
  mimeType: string
  fileSize: number
  filePath: string
  caption: string | null
  uploadedBy: string
  uploadedAt: string
}

export type ChangeLog = {
  changeLogId: string
  entityType: 'Person'
  entityId: string
  treeId: string
  action: 'create' | 'update' | 'delete' | 'revert'
  before: string | null
  after: string | null
  actorId: string
  timestamp: string
  personName?: string
  dataSource?: 'user-input' | 'ai-inference' | 'gedcom-import' | 'ocr-extraction'
}

export type PendingEdit = {
  editId: string
  treeId: string
  entityType: 'Person'
  entityId: string
  action: 'update' | 'create' | 'delete'
  proposedChanges: string
  currentState: string | null
  status: 'pending' | 'approved' | 'rejected'
  proposedBy: string
  proposedAt: string
  reviewedAt: string | null
  rejectionReason: string | null
  personName?: string
}

export const RELATIONSHIP_TYPES = {
  IMMEDIATE: {
    MOTHER: 'Mother',
    FATHER: 'Father',
    SPOUSE: 'Spouse/Partner',
    SON: 'Son',
    DAUGHTER: 'Daughter',
    CHILD: 'Child (non-binary)',
    BROTHER: 'Brother',
    SISTER: 'Sister',
    SIBLING: 'Sibling (non-binary)',
  },
  EXTENDED: {
    GRANDMOTHER_MATERNAL: 'Grandmother (maternal)',
    GRANDMOTHER_PATERNAL: 'Grandmother (paternal)',
    GRANDFATHER_MATERNAL: 'Grandfather (maternal)',
    GRANDFATHER_PATERNAL: 'Grandfather (paternal)',
    AUNT_MATERNAL: 'Aunt (maternal)',
    AUNT_PATERNAL: 'Aunt (paternal)',
    UNCLE_MATERNAL: 'Uncle (maternal)',
    UNCLE_PATERNAL: 'Uncle (paternal)',
    NEPHEW: 'Nephew',
    NIECE: 'Niece',
    GRANDSON: 'Grandson',
    GRANDDAUGHTER: 'Granddaughter',
    GRANDCHILD: 'Grandchild (non-binary)',
  },
  OTHER: {
    COUSIN: 'Cousin',
    STEP_PARENT: 'Step-parent',
    STEP_SIBLING: 'Step-sibling',
    HALF_SIBLING: 'Half-sibling',
    IN_LAW: 'In-law',
    FATHER_IN_LAW: 'Father-in-law',
    MOTHER_IN_LAW: 'Mother-in-law',
    BROTHER_IN_LAW: 'Brother-in-law',
    SISTER_IN_LAW: 'Sister-in-law',
    SON_IN_LAW: 'Son-in-law',
    DAUGHTER_IN_LAW: 'Daughter-in-law',
  },
} as const

export const MARITAL_STATUS = [
  'Single',
  'Married',
  'Divorced',
  'Widowed',
  'Separated',
  'Domestic Partnership',
  'Prefer not to say',
] as const

export const EVENT_TYPES = [
  // General
  'Education',
  'Career',
  'Military Service',
  'Achievement',
  'Move/Relocation',
  // Hindu ceremonies
  'Namkaran (Naming)',
  'Annaprashana (First Rice)',
  'Mundan (First Haircut)',
  'Upanayana (Thread Ceremony)',
  'Vidyarambham (Education Initiation)',
  'Engagement',
  'Haldi',
  'Mehndi',
  'Vivah (Wedding)',
  'Grihapravesh (Housewarming)',
  'Vanaprastha (Retirement)',
  'Antim Sanskar (Last Rites)',
  // Islamic ceremonies
  'Aqiqah',
  'Bismillah',
  'Nikah',
  'Walima',
  // Sikh ceremonies
  'Dastar Bandhi (Turban Tying)',
  'Anand Karaj (Wedding)',
  // Christian ceremonies
  'Baptism',
  'Confirmation',
  'First Communion',
  // General life events
  'Retirement',
  'Immigration',
  'Naturalization',
  'Other',
] as const

// ============================================================================
// Neo4j Union-Based Model Types
// ============================================================================

/**
 * Person node from Neo4j (Union-based model)
 */
export type Person = {
  personId: string
  firstName: string
  lastName: string
  maidenName?: string | null
  middleName?: string | null
  gender: 'male' | 'female' | 'other'
  birthDate?: string | null
  birthDateApprox?: boolean  // True if birth date is approximate
  birthPlace?: string | null
  deathDate?: string | null
  deathPlace?: string | null
  isLiving: boolean
  isHomePerson: boolean
  biography?: string | null
  biographyReferences?: Array<{
    personId?: string;
    displayName: string;
  }> | null
  occupation?: string | null
  education?: string | null
  nationality?: string | null
  ethnicity?: string | null
  profilePhotoUrl?: string | null
  photoThumbUrl?: string | null
  photoUrl?: string | null


  // Multiple birth support (twins, triplets, etc.)
  multipleBirth?: 'none' | 'twin' | 'triplet' | 'quadruplet' | 'other' | null
  birthOrder?: number | null  // Order among siblings (1 = firstborn, 2 = second, etc.)
  // Indian cultural fields
  gotra?: string | null
  caste?: string | null
  religion?: string | null
  nativePlace?: string | null
  nativeLanguage?: string | null
  elderStatus?: 'elder' | 'younger' | null
  // Date qualifiers (Phase 1.2)
  birthDateQualifier?: 'exact' | 'about' | 'before' | 'after' | 'between' | null
  birthDateEnd?: string | null  // For date ranges
  deathDateQualifier?: 'exact' | 'about' | 'before' | 'after' | 'between' | null
  deathDateEnd?: string | null  // For date ranges
  // DNA data (Phase 6.3)
  yDnaHaplogroup?: string | null
  mtDnaHaplogroup?: string | null
  dnaTestingCompany?: string | null
  dnaTestDate?: string | null
  dnaEthnicityEstimates?: string | null
  dnaKitNumber?: string | null
  // Per-field privacy
  fieldPrivacy?: Record<string, 'public' | 'family-only' | 'private'> | null

  // Soft delete support
  isDeleted?: boolean
  deletedAt?: string | null
  deletedBy?: string | null
  deletionReason?: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

/**
 * Union node from Neo4j (virtual marriage/partnership node)
 */
export type Union = {
  unionId: string
  type: 'marriage' | 'partnership' | 'unknown'
  startDate?: string | null
  endDate?: string | null
  endReason?: string | null
  marriagePlace?: string | null
  notes?: string | null
  // Single parent type distinction
  biologicalParentType?: 'both-known' | 'father-unknown' | 'mother-unknown' | 'sperm-donor' | 'egg-donor' | 'surrogate' | null
  // Indian cultural fields
  ceremonyType?: 'arranged' | 'love' | 'inter-caste' | 'inter-religion' | null
  dowryNotes?: string | null
  livingArrangement?: 'joint' | 'nuclear' | null
  // Non-standard marriage patterns support
  marriagePattern?: 'standard' | 'levirate' | 'sororate' | 'polyandry' | 'polygyny' | 'consanguineous' | null
  precedingUnionId?: string | null  // For levirate/sororate - links to previous marriage
  culturalContext?: string | null   // e.g., "Tamil Brahmin tradition", "Toda tribal custom"
  validationOverrides?: string[] | null  // Codes of validation errors/warnings that were overridden
  // Tree navigation references
  husbandTreeId?: string | null  // Tree ID for husband's family tree
  wifeTreeId?: string | null     // Tree ID for wife's family tree
  // Soft delete support
  isDeleted?: boolean
  deletedAt?: string | null
  deletedBy?: string | null
  deletionReason?: string | null
  createdAt?: string
}

/**
 * Validation configuration for family trees
 */
export type ValidationConfig = {
  consanguinityLevel: 'strict' | 'moderate' | 'permissive'
  allowPolyandry: boolean
  allowPolygyny: boolean
  allowUncleNieceMarriage: boolean
  allowAuntNephewMarriage: boolean
  culturalTradition?: string | null
}

/**
 * Tree metadata for multi-tree functionality
 */
export type TreeMetadata = {
  treeId: string
  treeName: string
  description: string | null
  ownerId: string
  createdAt: string
  updatedAt: string
  personCount: number
  validationConfig?: ValidationConfig | null
  userRole?: string  // 'owner' | 'co-owner' | 'controller' | 'contributor' — from getUserTrees
}

/**
 * Guardian relationship for adoption, step-parent, foster care
 */
export type GuardianRelationship = {
  guardianId: string
  childId: string
  guardianType: 'adoption' | 'step-parent' | 'foster' | 'legal-guardian' | 'informal-caregiver'
  startDate?: string | null
  endDate?: string | null  // For temporary guardianship (foster care, etc.)
  isLegalGuardian: boolean
  courtOrderRef?: string | null  // Legal document reference
  notes?: string | null
}

/**
 * Extended relationship type including guardian properties
 */
export type ExtendedRelationship = {
  fromId: string
  toId: string
  type: 'PARTNER_IN' | 'HAS_CHILD' | 'GUARDIAN_OF' | 'MEMBER_OF'
  // Additional properties for HAS_CHILD relationships
  parentChildType?: 'biological' | 'adopted' | 'step' | 'unknown' | null
  // Additional properties for GUARDIAN_OF relationships
  guardianType?: 'adoption' | 'step-parent' | 'foster' | 'legal-guardian' | 'informal-caregiver'
  startDate?: string | null
  endDate?: string | null
  isLegalGuardian?: boolean
  courtOrderRef?: string | null
  notes?: string | null
}

// ============================================================================
// Progressive Disclosure Types (Ancestry.com-style per-node collapse)
// ============================================================================

/**
 * Per-node collapse state for progressive disclosure
 */
export type PerNodeCollapseState = {
  parentsHidden: boolean;
  siblingsHidden: boolean;
  childrenHidden: boolean;
};

/**
 * Collapsed bubble displayed when a group is hidden
 */
export type CollapsedBubble = {
  bubbleId: string;
  type: 'parents' | 'siblings' | 'children';
  anchorPersonId: string;
  hiddenPersonIds: string[];
  count: number;
  label: string;
  placement: 'top' | 'side' | 'bottom';
};

// ============================================================================
// Vamshavali Layout Mode Types (Progressive Disclosure Tree)
// ============================================================================

/** Direction a user can expand from a person card */
export type VamshavaliExpandDirection = 'parents' | 'siblings' | 'children';

/** Tracks which directions each person has been expanded in Vamshavali mode */
export type VamshavaliExpansionState = {
  expansions: Map<string, Set<VamshavaliExpandDirection>>;
};

/** Computed visibility result for Vamshavali mode */
export type VamshavaliVisibleSet = {
  visiblePersonIds: Set<string>;
  visibleUnionIds: Set<string>;
};

/** Expand info for a single person (powers the expand pill buttons) */
export type VamshavaliExpandInfo = {
  hasHiddenParents: boolean;
  hiddenParentCount: number;
  hasHiddenSiblings: boolean;
  hiddenSiblingCount: number;
  hasHiddenChildren: boolean;
  hiddenChildrenCount: number;
  hasVisibleParents: boolean;
  hasVisibleSiblings: boolean;
  hasVisibleChildren: boolean;
};

// ============================================================================
// Node Concatenation/Collapsing Types (Ancestry.com-style)
// ============================================================================

/**
 * Type of collapsed group
 */
export type CollapsedGroupType =
  | 'siblings'       // Same-generation siblings from same parents
  | 'descendants'    // Linear chain of descendants
  | 'ancestors'      // Repeated ancestor pattern
  | 'extended'       // Generic extended family group

/**
 * Metadata about a collapsed group of people
 * This is visual aggregation only - nodes remain separate in data model
 */
export type CollapsedGroup = {
  // Identification
  groupId: string              // Unique ID for this collapsed group
  anchorPersonId: string       // The visible placeholder person ID

  // Hidden members
  hiddenPersonIds: string[]    // People hidden by this collapse
  hiddenUnionIds: string[]     // Unions hidden by this collapse

  // Classification
  groupType: CollapsedGroupType

  // Display
  count: number                // Number of hidden people (for badge)
  label: string                // e.g., "+3 siblings", "+2 generations"

  // Layout preservation
  generationRange: [number, number]  // [min, max] generations of hidden nodes
  preserveGeneration: number         // Which generation to render placeholder in

  // Expansion
  isExpanded: boolean          // Currently expanded or collapsed

  // Safety validation
  hasComplexMarriages: boolean // True if group contains non-standard marriages
  canCollapse: boolean         // True if safe to collapse
}

/**
 * Placeholder node for collapsed groups
 * Rendered in place of hidden nodes with count badge
 */
export type PlaceholderNode = {
  personId: string           // Synthetic ID (e.g., "placeholder-siblings-123")
  type: 'placeholder'
  collapsedGroup: CollapsedGroup

  // Position (calculated by layout)
  x: number
  y: number

  // Interaction
  onExpand: () => void
}

/**
 * Tree window data (main data structure for tree rendering)
 */
export type TreeWindowData = {
  persons: Person[]
  unions: Union[]
  relationships: ExtendedRelationship[]
}

// ============================================================================
// Blood Relations Filtering Types
// ============================================================================

/**
 * Blood relation display mode
 */
export type BloodRelationMode = 'all' | 'blood-only'

/**
 * Context for an expanded non-blood relation's family
 */
export interface ExpansionContext {
  // Person whose family is expanded (e.g., sister's husband)
  anchorPersonId: string

  // Their blood relations to show
  expandedBloodRelations: Set<string>

  // Their unions involved
  expandedUnionIds: Set<string>

  // Recursion depth (limit to 3)
  depth: number

  // Label for debugging/UI
  label: string // e.g., "Mary's Husband (Tom)'s Family"
}

/**
 * Metadata about expandable non-blood persons
 */
export interface ExpansionMetadata {
  personId: string
  isExpandable: boolean
  familyMemberCount: number // Number of blood relations they have
  spouseOfPersonId?: string // The blood relation they're married to
}

// ============================================================================
// Alternate Name Types (Phase 1.1)
// ============================================================================

export type AlternateName = {
  nameId: string
  personId: string
  type: 'maiden' | 'married' | 'religious' | 'nickname' | 'patronymic' | 'birth' | 'alias'
  firstName: string
  lastName: string
  prefix?: string | null
  suffix?: string | null
  title?: string | null
  startDate?: string | null
  endDate?: string | null
}

export type AlternateNameInput = Omit<AlternateName, 'nameId' | 'personId'>

// ============================================================================
// Life Event Types (Phase 1.3)
// ============================================================================

export type LifeEvent = {
  eventId: string
  personId: string
  treeId: string
  eventType: string
  title?: string | null
  eventDate?: string | null
  eventDateQualifier?: 'exact' | 'about' | 'before' | 'after' | 'between' | null
  eventEndDate?: string | null
  location?: string | null
  description?: string | null
  notes?: string | null
  sortOrder?: number | any | null
  editable?: boolean
  deletable?: boolean
  derived?: boolean
  sourceType?: string
  sourceId?: string
  endDate?: string | null
  endReason?: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type LifeEventInput = Omit<LifeEvent, 'eventId' | 'personId' | 'treeId' | 'createdBy' | 'createdAt' | 'updatedAt'>

// ============================================================================
// Custom Fact Types (Phase 1.4)
// ============================================================================

export type CustomFact = {
  factId: string
  personId: string
  treeId: string
  factType: string
  factValue: string
  factDate?: string | null
  factDateQualifier?: 'exact' | 'about' | 'before' | 'after' | 'between' | null
  notes?: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type CustomFactInput = Omit<CustomFact, 'factId' | 'personId' | 'treeId' | 'createdBy' | 'createdAt' | 'updatedAt'>

// ============================================================================
// Bookmark Types (Phase 1.6)
// ============================================================================

export type Bookmark = {
  userId: string
  personId: string
  treeId: string
  createdAt: string
}

export type BookmarkedPerson = Bookmark & {
  person: Person
}

// ============================================================================
// Date Qualifier Type (Phase 1.2)
// ============================================================================

export type DateQualifier = 'exact' | 'about' | 'before' | 'after' | 'between'

// ============================================================================
// Collaboration & Privacy Types (Phase 4)
// ============================================================================

export type TreeRole = 'owner' | 'co-owner' | 'controller' | 'contributor'

export type TreeAccess = {
  userId: string
  treeId: string
  role: TreeRole
  invitedBy: string
  invitedAt: string
  acceptedAt?: string | null
  email?: string | null
}

export type TreeInvitation = {
  invitationId: string
  treeId: string
  treeName: string
  email: string
  role: TreeRole
  invitedBy: string
  invitedByName?: string | null
  invitedAt: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  expiresAt: string
  targetPersonId?: string | null
  targetPersonName?: string | null
  targetPersonPhoto?: string | null
  inviteToken?: string | null
  personalMessage?: string | null
}

export type AppNotification = {
  notificationId: string
  userId: string
  type: 'person_updated' | 'person_added' | 'person_deleted' | 'invitation' | 'edit_approved' | 'edit_rejected' | 'suggestion' | 'birthday' | 'anniversary' | 'death_anniversary' | 'share_comment' | 'claim_requested' | 'claim_approved' | 'claim_rejected' | 'cr_submitted' | 'cr_approved' | 'cr_rejected' | 'cr_comment' | 'cr_auto_merged'
  title: string
  message: string
  treeId?: string | null
  entityId?: string | null
  isRead: boolean
  createdAt: string
}

export type PersonVisibility = 'public' | 'family-only' | 'private'

// ============================================================================
// Invite, Claim & Contribute Types (GitHub-Style Collaboration)
// ============================================================================

export type PersonClaim = {
  claimId: string
  userId: string
  personId: string
  treeId: string
  status: 'pending' | 'approved' | 'rejected' | 'revoked'
  invitationId?: string | null
  requestedAt: string
  reviewedBy?: string | null
  reviewedAt?: string | null
  scopeOverride?: { mode: 'full' } | null
}

export type ChangeType = 'edit_person' | 'add_person' | 'add_union' | 'add_relationship' | 'delete_person' | 'edit_union'
export type CRStatus = 'draft' | 'open' | 'merged' | 'closed' | 'withdrawn'

export type ChangeRequest = {
  crId: string
  treeId: string
  title?: string | null
  description?: string | null
  status: CRStatus
  submittedBy: string
  submittedAt?: string | null
  reviewedBy?: string | null
  reviewedAt?: string | null
  mergedAt?: string | null
  autoMerged: boolean
  itemCount: number
  createdAt: string
  updatedAt: string
  items?: ChangeItem[]
  comments?: ChangeComment[]
  submitterName?: string | null
  submitterEmail?: string | null
}

export type FieldChange = {
  old: unknown
  new: unknown
}

export type ChangeItem = {
  itemId: string
  crId: string
  sortOrder: number
  changeType: ChangeType
  targetEntityId?: string | null
  targetEntityType?: string | null
  fieldChanges?: Record<string, FieldChange> | null
  newEntityData?: Record<string, unknown> | null
  unionData?: Record<string, unknown> | null
  relationshipData?: Record<string, unknown> | null
  entitySnapshot?: Record<string, unknown> | null
  status: 'pending' | 'approved' | 'rejected'
  reviewerNote?: string | null
  createdAt: string
}

export type ChangeComment = {
  commentId: string
  crId: string
  itemId?: string | null
  userId: string
  text: string
  createdAt: string
  userName?: string | null
}

export type AutoMergeRuleType = 'own_photo_change' | 'own_privacy_change' | 'empty_field_fill'

export type AutoMergeRule = {
  ruleId: string
  treeId: string
  ruleType: AutoMergeRuleType
  isEnabled: boolean
  createdBy: string
  createdAt: string
}

// ============================================================================
// Source & Evidence Types (Phase 3)
// ============================================================================

export type Source = {
  sourceId: string
  treeId: string
  title: string
  author?: string | null
  publisher?: string | null
  url?: string | null
  fileUrl?: string | null
  previewUrl?: string | null
  fileName?: string | null
  fileMimeType?: string | null
  type: 'document' | 'photo' | 'certificate' | 'census' | 'newspaper' | 'book' | 'website' | 'oral' | 'other'
  repositoryName?: string | null
  notes?: string | null
  citationCount?: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type SourceInput = Omit<Source, 'sourceId' | 'treeId' | 'createdBy' | 'createdAt' | 'updatedAt'>

export type SourceCitation = {
  citationId: string
  sourceId: string
  personId: string
  factType: 'birth' | 'death' | 'marriage' | 'name' | 'residence' | 'occupation' | 'general'
  page?: string | null
  detail?: string | null
  confidence: 'high' | 'medium' | 'low'
  notes?: string | null
  sourceTitle?: string
  fileUrl?: string | null
  fileName?: string | null
  fileMimeType?: string | null
  source?: Source
  createdBy: string
  createdAt: string
}

export type SourceCitationInput = Omit<SourceCitation, 'citationId' | 'createdBy' | 'createdAt' | 'sourceTitle'>

export type AlertNote = {
  noteId: string
  personId: string
  treeId: string
  message: string
  severity: 'info' | 'warning' | 'error'
  isResolved: boolean
  createdBy: string
  createdAt: string
  resolvedAt?: string | null
  resolvedBy?: string | null
}

export type DataQualityScore = {
  personId: string
  score: number
  completeness: number
  sourceCoverage: number
  details: {
    hasBirthDate: boolean
    hasBirthPlace: boolean
    hasDeathInfo: boolean
    hasParents: boolean
    hasPhoto: boolean
    hasSources: boolean
    hasEvents: boolean
    sourceCount: number
  }
}

// ============================================================================
// Social & DNA Types (Phase 6)
// ============================================================================

export type SocialLinkType = 'godparent' | 'mentor' | 'guru' | 'employer' | 'neighbor' | 'friend' | 'guardian-spiritual' | 'teacher' | 'business-partner' | 'other'

export type SocialLink = {
  linkId: string
  fromPersonId: string
  toPersonId: string
  type: SocialLinkType
  label?: string | null
  startDate?: string | null
  endDate?: string | null
  notes?: string | null
  createdBy: string
  createdAt: string
}

// ============================================================================
// Place Types (Phase 7)
// ============================================================================

export type Place = {
  placeId: string
  standardName: string
  historicalNames: string[]
  lat?: number | null
  lng?: number | null
  country?: string | null
  state?: string | null
  district?: string | null
  type?: 'city' | 'town' | 'village' | 'district' | 'state' | 'country' | 'region' | null
  createdAt: string
  updatedAt: string
}

// ============================================================================
// Memory Types (Phase 8)
// ============================================================================

export type MemoryType = 'photo' | 'video' | 'audio' | 'text'
export type MemoryPrivacy = 'private' | 'close_family' | 'tree' | 'public'
export type MemoryStatus = 'draft' | 'publish'

export type MemoryFile = {
  _id: string
  fileName?: string
  fileUrl?: string
  fileType?: string
  key?: string
  fileSize?: number
  thumbnailUrl?: string
  thumbnailKey?: string
  signedUrl?: string
  thumbnailSignedUrl?: string
  textContent?: string | null
}

export type MemoryPerson = {
  _id?: string
  id: string
  name: string
  firstName?: string
  lastName?: string
  profilePhotoUrl?: string | null
  image?: string | null
}


export type Memory = {
  _id: string         // Primary ID from new backend
  memoryId: string    // Legacy ID compatibility
  treeId: string
  createdBy?: string
  ownerId?: string     // From new backend
  title: string
  description?: string | null
  memoryType: MemoryType
  type?: string       // "post", "album", etc.
  category?: string | null
  mediaUrl?: string | null
  thumbnailUrl?: string | null
  mimeType?: string | null
  textContent?: string | null
  textdata?: string | boolean | null
  contentBlocks?: string | null
  dateTaken?: string | null
  placeTaken?: string | null
  place?: string | null
  templeId?: string | null
  privacy?: MemoryPrivacy
  status: MemoryStatus | string
  isArchived: boolean
  deletedAt?: string | null
  files?: MemoryFile[] // New multifile support
  taggedPeople?: MemoryPerson[] // New tagged structure
  taggedPersons?: Array<{ personId: string; firstName: string; lastName: string; profilePhotoUrl?: string | null }>
  likeCount?: number
  isLikedByMe?: boolean
  createdAt: string
  updatedAt: string
  // NLP-derived fields (populated by background NLP pipeline)
  keywords?: string[]
  sentiment?: 'positive' | 'negative' | 'neutral'
  sentimentScore?: number
  emotionTags?: string[]
  suggestedCategory?: string
  qualityScore?: number
  extractedPlaces?: string[]
  extractedPeople?: string[]
  nlpProcessedAt?: string
  // AI ceremony detection fields
  aiCeremonyName?: string | null
  aiCeremonyConfidence?: string | null
  // Temple-linked fields (populated when AT_TEMPLE relationship exists)
  templeFestival?: string | null
  // Set by backend for contributors — memory tagged to claimed node but created by someone else
  isSharedMemory?: boolean
}

export type MemoryInput = {
  title: string
  description?: string
  memoryType: MemoryType
  category?: string
  mediaUrl?: string
  thumbnailUrl?: string
  mimeType?: string
  textContent?: string
  contentBlocks?: string
  dateTaken?: string
  placeTaken?: string
  privacy?: MemoryPrivacy
  status?: MemoryStatus
  taggedPersonIds?: string[]
  albumId?: string
}

// ============================================================================
// Interview Types
// ============================================================================

export type Interview = {
  interviewId: string
  treeId: string
  templateId: string
  templateTitle: string
  intervieweeName?: string
  intervieweePersonId?: string
  intervieweePhotoUrl?: string
  aiNarrative?: string
  answerCount?: number
  coverPhotoUrl?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type InterviewAnswer = {
  answerId: string
  interviewId: string
  questionId: string
  questionText: string
  answerText: string
  audioUrl?: string
  audioMimeType?: string
  photoUrl?: string
  photoThumbnailUrl?: string
  sortOrder: number
}

// ============================================================================
// Temple Link Types (Phase 9 - Religious Services)
// ============================================================================

export type TempleConnectionType =
  | 'kula_devata'
  | 'birth_temple'
  | 'ceremony_location'
  | 'ancestral'
  | 'regular_visit'
  | 'pilgrimage'

// Simplified chip tags shown in the new Institutions UI. Zero, one, or many
// may be attached to a TempleLink. `family_main` is the legacy alias for
// connectionType='kula_devata' (keeps the Heritage Summary Strip working).
export type TempleTag =
  | 'family_main'
  | 'birth'
  | 'ceremony'
  | 'ancestral'
  | 'regular'
  | 'pilgrimage'

export type TempleLink = {
  templeLinkId: string
  templeId: string            // References in-memory temple registry
  treeId: string
  connectionType: TempleConnectionType
  tags?: TempleTag[]
  isUserSpecified: boolean
  notes?: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type TempleLinkWithPerson = TempleLink & {
  personId: string
  personFirstName: string
  personLastName: string
}

export type TempleLinkInput = {
  templeId: string
  connectionType?: TempleConnectionType
  tags?: TempleTag[]
  notes?: string
  isDynamic?: boolean
}

// ============================================================================
// Dynamic Temple Types (Phase 10 — Google Maps Integration)
// ============================================================================

/**
 * A sacred place sourced from Google Maps (not in local in-memory DB).
 * After enrichment, this mirrors what's stored in Neo4j DynamicTemple nodes.
 */
export type DynamicTemple = {
  dynamicTempleId?: string
  placeId: string                   // Google Maps place_id — unique key
  name: string
  formattedAddress: string
  lat: number
  lng: number
  religion: 'Hindu' | 'Christian' | 'Islam' | 'Unknown'
  type: 'temple' | 'church' | 'mosque' | 'sacred_place'
  category?: string
  googleRating?: number
  website?: string
  openingHours?: string             // JSON-serialized Google Maps periods array
  photoUrl?: string                 // S3 CDN URL
  aiRituals?: string                // Gemini-generated rituals/practices
  aiSignificance?: string           // Gemini-generated historical/miracles/specialties
  aiVisitorTips?: string            // Gemini-generated visitor tips
  aiHowToReach?: string             // Gemini-generated directions / how to reach
  aiServiceTimings?: string         // JSON-serialized ServiceTimings object
  aiEnrichedAt?: string             // ISO timestamp — set once AI enrichment is done
  isAIEnriched: boolean
}

export type ServiceTimingEntry = {
  name: string
  time: string
  days: string
}

export type SeasonalTiming = {
  name: string
  period: string
  timings: string
}

export type SpecialDayTiming = {
  name: string
  timing: string
}

export type ServiceTimings = {
  regular: ServiceTimingEntry[]
  seasonal?: SeasonalTiming[]
  specialDays?: SpecialDayTiming[]
}

/**
 * Quick suggestion from Google Maps search (before full enrichment).
 */
export type PlaceSuggestion = {
  placeId: string
  name: string
  formattedAddress: string
  lat: number
  lng: number
  rating?: number
  types: string[]
}

/**
 * Union type for search bar results — either a local DB temple or a Google Maps result.
 */
export type SacredPlaceResult =
  | { source: 'local'; temple: import('@/data/temples/types').Temple }
  | { source: 'maps'; place: PlaceSuggestion }

// ============================================================================
// Album Types (Phase 8.2)
// ============================================================================

export type Album = {
  albumId: string
  treeId: string
  name: string
  description?: string | null
  coverImageUrl?: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  itemCount?: number
  memoryIds?: Memory[]
}

export type AlbumInput = {
  name: string
  description?: string
  coverImageUrl?: string
}

// ============================================================================
// Story Types (Phase 8.6)
// ============================================================================

export type Story = {
  storyId: string
  treeId: string
  title: string
  createdBy: string
  authorName: string
  personName?: string | null
  authorAvatarUrl?: string | null
  isPublished: boolean
  slideCount?: number
  coverUrl?: string | null
  createdAt: string
  updatedAt: string
}

export type StorySlide = {
  slideId: string
  storyId: string
  sortOrder: number
  mediaUrl?: string | null
  thumbnailUrl?: string | null
  captionText?: string | null
  captionPosition?: 'top' | 'center' | 'bottom'
  duration?: number
}

export type StoryInput = {
  title: string
  isPublished?: boolean
}

export type StorySlideInput = {
  mediaUrl?: string
  thumbnailUrl?: string
  captionText?: string
  captionPosition?: 'top' | 'center' | 'bottom'
  duration?: number
  memoryId?: string
}

// Celebrate Culture — Institution Types

export interface Pagination {
  total: number
  page: number
  limit: number
  totalPages?: number
}

/**
 * Tag values as accepted by the API (Postman source of truth).
 * Used in POST /institutions/my and PUT /institutions/my/:id/tag
 */
export type InstitutionTag = 'Regular' | 'Ancestral' | 'Pilgrimage' | 'Community'

export type InstitutionType =
  | 'temple'
  | 'church'
  | 'mosque'
  | 'gurudwara'
  | 'monastery'
  | 'other'

  export interface UpdateInstitutionTagPayload {
  tag: InstitutionTag;
  family_main: boolean;
}

export interface UpdateInstitutionTagResponse {
  success: boolean;
  message: string;
  data: {
    institutionId: string;
    tag: InstitutionTag;
    family_main: boolean;
  };
}

export type MemoryVisibility = 'everyone_in_tree' | 'only_me' | 'close_family'

export type InstitutionMediaType = 'photo' | 'video'

export interface InstitutionLocation {
  address: string
  locationText: string
  country: string
  lat: number | null
  lng: number | null
  googleMapsUrl: string | null
}

export interface RegularService {
  name: string
  time: string
  frequency: string
}

export interface SeasonalChange {
  name: string
  description: string
  applicability: string
}

export interface SpecialDay {
  name: string
  description: string
}

export interface InstitutionServiceTiming {
  regularServices: RegularService[]
  seasonalChanges: SeasonalChange[]
  specialDays: SpecialDay[]
}

export interface VisitInfo {
  serviceTiming: InstitutionServiceTiming
  visitorTips: string
  howToReach: string
}

/** Lightweight card — returned by GET /institutions */
export interface Institution {
  _id: string;

  institutionId?: string;

  name: string;
  title?: string;

  religion: string;

  type: InstitutionType;

  tag?: InstitutionTag;

  deity?: string;

  location: InstitutionLocation;

  thumbnail: string;

  overview: string;

  addedAt?: string;

  family_main?: boolean;
}

/** Full detail — returned by GET /institutions/:id */
export interface InstitutionDetail extends Institution {
  images: string[]
  significance: string
  ritualsAndPractices: string
  history: string
  uniqueFeatures: string[]
  notableEvents: string[]
  isAiGenerated: boolean
  visitInfo: VisitInfo
  /** Only present when uuid header is sent */
  isInMyList?: boolean
  /** Only present when uuid header is sent and institution is saved */
  myTag?: InstitutionTag
}

/** My-list item — returned by GET /institutions/my */
export interface UserInstitution {
  _id: string;

  institutionId: string;

  uuid?: string;

  title: string;

  thumbnail: string;

  location: string;

  religion: string;

  tag: InstitutionTag;

  addedAt?: string;

  createdAt?: string;

  updatedAt?: string;

  family_main?: boolean;
}

/**
 * Memory returned by GET /institutions/:id/memories.
 *
 * The API returns `_id` as the primary identifier; `memoryId` is included as
 * an alias because several pages (InstitutionDetailPage MemoryCard,
 * SacredPlacesPage RecentMemories) key on `memory.memoryId`.
 */
export interface InstitutionMemory {
  /** Primary DB identifier */
  _id: string
  /**
   * Alias for _id — returned by the API so pages can use either field.
   * Used as the key in MemoryCard and RecentMemoryItem.
   */
  memoryId?: string
  institutionId: string
  userId: string
  title: string
  description?: string
  mediaUrls: string[]
  mediaType: InstitutionMediaType
  festival?: string
  ritual?: string
  /**
   * Date string in dd-mm-yyyy format (as sent to / received from the API).
   * Used for display in MemoryCard via `new Date(memory.date).toLocaleDateString()`.
   */
  date: string
  taggedPeople?: { name: string; id: string; _id?: string }[]
  visibility: MemoryVisibility
  createdAt: string
  /**
   * Pre-computed thumbnail URL returned by the API.
   * Used in MemoryCard and RecentMemories instead of mediaUrls[0].
   */
  thumbnailUrl?: string
  files?: any[]
}

/**
 * Response envelope for GET /institutions/:id/memories.
 * InstitutionDetailPage destructures `res.data.memories`.
 */
export interface InstitutionMemoriesResponse {
  memories: InstitutionMemory[]
  pagination?: Pagination
}

/**
 * Family member tagged at an institution.
 * Returned by GET /institutions/:id/members.
 *
 * Fixed to match the fields accessed in InstitutionDetailPage:
 *   m.memberId, m.personId, m.firstName, m.lastName,
 *   m.profilePhotoUrl, m.visitDate
 */
export interface InstitutionMember {
  /** Primary identifier (used as React key and for DELETE requests) */
  memberId: string
  /**
   * Alternate identifier — some responses return personId instead of memberId.
   * Pages use `m.memberId ?? m.personId` as the key.
   */
  personId?: string
  firstName: string
  lastName: string
  /** Avatar URL; may be absent — page falls back to initials */
  profilePhotoUrl?: string
  /** ISO date string of the most recent tagged visit */
  visitDate?: string
  /** Legacy fields retained for backward compatibility */
  relation?: string
  visitCount?: number
  lastVisited?: string
}

/**
 * Payload for POST /institutions/my (Add Institution to My List).
 * `tag` must match the InstitutionTag union (Regular | Ancestral | Pilgrimage | Community).
 */
export interface AddToMyListPayload {
  institutionId: string;
}

/**
 * Payload for POST /institutions/:id/members (Tag a Family Member).
 * Date is in dd-mm-yyyy format per the Postman collection.
 */
export interface TagMemberPayload {
  memberId: string
  /** dd-mm-yyyy */
  visitDate?: string
}

/**
 * Payload for POST /institutions/:id/members/:memberId (Update Tagged Member).
 */
export interface UpdateTaggedMemberPayload {
  /** dd-mm-yyyy */
  visitDate?: string
  notes?: string
}

/**
 * Payload for POST /institutions/:id/memories (Add Memory).
 *
 * Festivals: Diwali | Holi | Navaratri | Pongal | Ugadi | Ganesh Chaturthi
 * Rituals:   Darshan | Abhisheka | Archana | Havan | Aarti | Prasad
 * Date:      dd-mm-yyyy
 */
export interface CreateMemoryPayload {
  title: string
  description?: string
  mediaKeys?: string[]
  mediaUrls?: string[]
  mediaType?: InstitutionMediaType
  festival?: string
  ritual?: string
  /** dd-mm-yyyy */
  date?: string
  taggedMembers?: string[]
  visibility?: MemoryVisibility
}

/**
 * Query params accepted by GET /institutions.
 * Used in getInstitutions() service call across InstitutionSearchPage
 * and SacredPlacesPage (nearby fetch).
 */
export interface GetInstitutionsParams {
  q?: string
  religion?: string
  type?: string
  filter?: 'popular' | 'near_me'
  lat?: number
  lng?: number
  page?: number
  limit?: number
}

/**
 * Response envelope for GET /institutions.
 */
export interface GetInstitutionsResponse {
  institutions: Institution[]
  pagination?: Pagination
}

export const LENS_TYPES = [
  "Hindu",
  "Christian",
  "Islam",
  "Sikh",
  "Buddhist",
  "Jain",
  "All",
] as const;

export type LensType = (typeof LENS_TYPES)[number];

// ─────────────────────────────────────────────────────────────
// Journey Search Types
// ─────────────────────────────────────────────────────────────

export interface JourneySearchPayload {
  query: string;
  lat?: number;
  lng?: number;
  page?: number;
  limit?: number;
  skip?: number;
}

export interface JourneySearchTemple {
  templeId: string;
  thumbnail: string;
  title: string;
  religion: string;
  location: string;
}

export type JourneySearchResponse = JourneySearchTemple[];

// ─────────────────────────────────────────────────────────────
// Journey Weave Types
// ─────────────────────────────────────────────────────────────

export interface JourneyWeaveCoordinates {
  lat: number;
  lng: number;
}

export interface JourneyWeaveCreatePayload {
  userId: string;
  religion: string;
  coordinates: JourneyWeaveCoordinates;
}

export interface JourneyWeaveTemple {
  templeName: string;
  description: string;
  place: string;
}

export interface JourneyWeaveInfo {
  planningDays: string;
  favourableTime: string;
}

export interface JourneyWeaveResponse {
  temples: JourneyWeaveTemple[];
  weaver: JourneyWeaveInfo;
}

// ─────────────────────────────────────────────────────────────
// Journey Temple Details
// ─────────────────────────────────────────────────────────────

export interface TempleDetailsPayload {
  userId: string;
  templeId: string;
}

export interface TempleSource {
  title: string;
  url: string;
}

export interface TempleAbout {
  significance: string;
  historicalBackground: string;
  culturalContext: string;
  legendsAndBeliefs: string;
  ritualsAndPractices: string;
  story: string;
  architecture: string;
  scriptureMentions: string;

  sources: TempleSource[];
}

export interface TempleTimings {
  open: string;
  close: string;
  notes: string;
}

export interface TempleVisit {
  timings: TempleTimings;

  bestTimeToVisit: string;

  peakDays: string[];

  darshanInfo: string;

  dressCode: string;

  travelTips: string[];

  nearbyPlaces: string[];
}

export interface TempleDetailsResponse {
  templeId: string;

  about: TempleAbout;

  visit: TempleVisit;

  thumbnail: string;

  mapUrl?: string;
}