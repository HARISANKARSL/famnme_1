/**
 * Neo4j Data Service - Frontend service for fetching tree data via REST API
 *
 * This service calls the backend Express server which proxies requests to Neo4j.
 * Browsers cannot connect directly to Neo4j's Bolt protocol.
 *
 * @see ../server/index.js for the backend API implementation
 */

import type { Person, Union, TreeMetadata, ValidationConfig } from '@/types';
import type { Relationship } from '@/services/elkLayoutService';
import { getAuthToken } from '@/lib/auth';
import { API_BASE_URL, AI_BASE_URL } from '@/config/api';
import { treeApiCalls, aiApiCalls } from '@/api/apicalls';




// ============================================================================
// Tree Window Cache
// ============================================================================

interface CacheEntry {
  data: TreeWindowData;
  timestamp: number;
  hash: string; // Quick content hash to detect changes
}

const treeWindowCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 300_000; // 5 minutes TTL (mutations call invalidateTreeCache)

/**
 * Export tree as GEDCOM file
 */
export async function exportGedcom(treeId: string, treeName: string): Promise<void> {
  try {
    const blob = await treeApiCalls.exportGedcom(treeId);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${treeName || 'family_tree'}.ged`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export GEDCOM:', error);
    throw error;
  }
}

/**
 * Export tree as CSV file
 */
export async function exportCsv(treeId: string, treeName: string): Promise<void> {
  try {
    const blob = await treeApiCalls.exportCsv(treeId);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${treeName || 'family_tree'}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export CSV:', error);
    throw error;
  }
}


// Request deduplication: prevent duplicate in-flight requests for the same key
const inflightRequests = new Map<string, Promise<TreeWindowData>>();

function computeTreeHash(data: TreeWindowData): string {
  // Fast hash: count + IDs concatenated
  const pIds = data.persons.map(p => p.personId).sort().join(',');
  const uIds = data.unions.map(u => u.unionId).sort().join(',');
  const rCount = data.relationships.length;
  return `${data.persons.length}:${data.unions.length}:${rCount}:${pIds.slice(0, 100)}:${uIds.slice(0, 100)}`;
}

function getCacheKey(treeId: string, focusPersonId?: string): string {
  return `${treeId}:${focusPersonId || 'home'}`;
}

/** Invalidate cache for a tree (call after mutations) */
export function invalidateTreeCache(treeId: string): void {
  for (const key of treeWindowCache.keys()) {
    if (key.startsWith(`${treeId}:`)) {
      treeWindowCache.delete(key);
    }
  }
  // Also clear inflight requests for this tree to prevent stale dedup hits
  for (const key of inflightRequests.keys()) {
    if (key.startsWith(`${treeId}:`)) {
      inflightRequests.delete(key);
    }
  }
}

/** Clear ALL caches — tree window + inflight requests + user trees. Call before forced reload. */
export function clearAllTreeCaches(): void {
  treeWindowCache.clear();
  inflightRequests.clear();
  _getUserTreesCache.clear();
  _getUserTreesInFlight.clear();
  console.log('[neo4jDataService] All caches cleared');
}

/**
 * Authenticated fetch wrapper.
 * Reads the JWT from localStorage.
 */
async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

// Re-export TreeMetadata for convenience
export type { TreeMetadata };

export interface TreeWindowData {
  persons: Person[];
  unions: Union[];
  relationships: Relationship[];
  trees?: Array<{ treeId: string; treeName: string; ownerId: string }>;
  userRole?: string;
  claimedPersonId?: string | null;
}

export interface FamilyComponent {
  personIds: Set<string>;
  unionIds: Set<string>;
}

export interface ComponentMap {
  [representativeId: string]: FamilyComponent;
}

/**
 * Fetch tree window data from backend API
 *
 * @param treeId - Family tree ID
 * @param focusPersonId - Person to center the view on (if null, uses home person)
 * @param ancestorDepth - How many generations up to fetch
 * @param descendantDepth - How many generations down to fetch
 */
export async function fetchTreeWindow(
  treeId: string,
  focusPersonId?: string,
  ancestorDepth: number = 99,
  descendantDepth: number = 99,
  options?: { skipCache?: boolean }
): Promise<TreeWindowData> {
  const cacheKey = getCacheKey(treeId, focusPersonId);

  // Check cache first (unless explicitly skipped)
  if (!options?.skipCache) {
    const cached = treeWindowCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
      console.log('Cache HIT for tree window:', cacheKey);
      return cached.data;
    }
  }

  // Deduplicate: if same request is already in-flight, return existing promise
  const existingRequest = inflightRequests.get(cacheKey);
  if (existingRequest) {
    console.log('Dedup HIT for tree window:', cacheKey);
    return existingRequest;
  }

  const request = (async () => {
    try {
      const t0 = performance.now();

      const params: any = {
        ancestorDepth,
        descendantDepth,
      };
      if (focusPersonId) params.focusPersonId = focusPersonId;

      const data: TreeWindowData = await treeApiCalls.getWindow(treeId, params);


      // For contributors, the backend returns claimedPersonId — swap isHomePerson
      // to the claimed node so the tree renders from their perspective
      if (data.claimedPersonId && data.persons.some(p => p.personId === data.claimedPersonId)) {
        data.persons = data.persons.map(p => ({
          ...p,
          isHomePerson: p.personId === data.claimedPersonId,
        }));
      }

      const elapsed = Math.round(performance.now() - t0);
      console.log(`Fetched tree window in ${elapsed}ms:`, {
        persons: data.persons.length,
        unions: data.unions.length,
        relationships: data.relationships.length,
      });

      // Store in cache
      treeWindowCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        hash: computeTreeHash(data),
      });

      return data;
    } catch (error) {
      console.error('Failed to fetch tree window:', error);
      throw error;
    } finally {
      inflightRequests.delete(cacheKey);
    }
  })();

  inflightRequests.set(cacheKey, request);
  return request;
}

/**
 * Delete a family tree
 */

/**
 * Create a new person in the database
 */
export async function createPerson(
  treeId: string,
  personData: Omit<Person, 'personId' | 'createdAt' | 'updatedAt'>
): Promise<Person> {
  const response = await apiFetch(`${API_BASE_URL}/person`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ treeId, person: personData }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create person: ${response.statusText}`);
  }

  invalidateTreeCache(treeId);
  return response.json();
}

/**
 * Create a root person for a tree
 */
export async function createRootPerson(
  treeId: string,
  personData: Partial<Person>
): Promise<Person> {
  const data = await treeApiCalls.createRoot(treeId, personData);
  invalidateTreeCache(treeId);
  return data;

}


/**
 * Get a person by ID
 */
export async function getPerson(personId: string): Promise<Person> {
  return await treeApiCalls.getPerson(personId);
}

/**
 * Update an existing person
 */

export async function updatePerson(
  personId: string,
  updates: Partial<Person>,
  treeId?: string
): Promise<Person> {
  const data = await treeApiCalls.updatePerson(personId, updates);

  if (treeId) {
    invalidateTreeCache(treeId);
  } else {
    clearAllTreeCaches();
  }
  return data;
}

/**
 * Update a person's profile photo
 */
export async function updatePersonPhoto(
  personId: string,
  image: File,
  treeId?: string
): Promise<any> {
  const data = await treeApiCalls.updatePersonPhoto(personId, image);
  if (treeId) {
    invalidateTreeCache(treeId);
  } else {
    clearAllTreeCaches();
  }
  return data;
}



/**
 * Update per-field privacy settings for a person
 */
export async function updateFieldPrivacy(
  personId: string,
  fieldPrivacy: Record<string, 'public' | 'family-only' | 'private'>,
  treeId?: string
): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/person/${personId}/field-privacy`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fieldPrivacy }),
  });

  if (!response.ok) {
    throw new Error('Failed to update field privacy');
  }

  if (treeId) {
    invalidateTreeCache(treeId);
  }
}

/**
 * Delete a person
 */
export async function deletePerson(personId: string, treeId?: string, _reason?: string): Promise<void> {
  await treeApiCalls.deletePerson(personId);

  if (treeId) {
    invalidateTreeCache(treeId);
  } else {
    clearAllTreeCaches();
  }
}


/**
 * Activate a ghost placeholder node (flip isDeleted to false after new person data is saved)
 */
export async function activateGhostNode(personId: string, treeId?: string): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/person/${personId}/activate`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Failed to activate ghost node: ${response.statusText}`);
  }

  if (treeId) {
    invalidateTreeCache(treeId);
  } else {
    clearAllTreeCaches();
  }
}

/**
 * Create a union between two people
 */
export async function createUnion(
  treeId: string,
  partner1Id: string,
  partner2Id: string,
  unionData: Omit<Union, 'unionId'>
): Promise<Union> {
  const response = await apiFetch(`${API_BASE_URL}/union`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ treeId, partner1Id, partner2Id, union: unionData }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create union: ${response.statusText}`);
  }

  invalidateTreeCache(treeId);
  return response.json();
}

/**
 * Create union between two existing people
 */
export async function createUnionBetweenExisting(
  treeId: string,
  person1Id: string,
  person2Id: string,
  unionData: Partial<Union>
): Promise<Union> {
  const response = await apiFetch(`${API_BASE_URL}/tree/explore-roots/person/spouse/between-existing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      treeId,
      personId: person1Id,
      spouseId: person2Id,
      unionData,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || errorData.message || `Failed to create union: ${response.statusText}`);
  }

  invalidateTreeCache(treeId);
  const data = await response.json();
  return data.data || data;
}

/**
 * Add a spouse to a person
 */
export async function addSpouse(
  personId: string,
  spouseData: Partial<Person>,
  unionData: any,
  treeId: string
): Promise<any> {
  const data = await treeApiCalls.addSpouse(personId, spouseData, unionData);
  invalidateTreeCache(treeId);
  return data;
}

/**
 * Add a child to a union
 */

export async function addChildToUnion(
  treeId: string,
  unionId: string | null,
  childData: Partial<Person>,
  parentChildType: string = 'biological',
  parentId?: string
): Promise<Person> {
  const data = await treeApiCalls.addChild(unionId, treeId, childData, parentChildType, parentId);
  invalidateTreeCache(treeId);
  return data;
}


/**
 * Add a parent to an existing person
 * @param childId - ID of the child
 * @param parentData - Data for the new parent
 * @param marriedToExistingParent - If true, adds to existing union (married); if false, creates separate union (not married). Default: true
 */
export async function addParent(
  childId: string,
  parentData: Partial<Person>,
  marriedToExistingParent: boolean = true,
  treeId?: string
): Promise<{ parent: Person; unionId: string }> {
  const data = await treeApiCalls.addParent(childId, parentData, marriedToExistingParent);
  if (treeId) {
    invalidateTreeCache(treeId);
  } else {
    clearAllTreeCaches();
  }
  return data;
}


/**
 * Get a person's current parents
 */
export async function getPersonParents(personId: string): Promise<{ parents: Person[]; unionId: string | null }> {
  const response = await apiFetch(`${API_BASE_URL}/person/${personId}/parents`);
  if (!response.ok) {
    throw new Error(`Failed to fetch parents: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Reassign a person's parents to different people in the tree
 */
export async function reassignParents(
  personId: string,
  fatherId: string | null,
  motherId: string | null,
  treeId?: string
): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/person/${personId}/parents`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fatherId, motherId }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Failed to reassign parents: ${response.statusText}`);
  }
  if (treeId) {
    invalidateTreeCache(treeId);
  } else {
    clearAllTreeCaches();
  }
}

/**
 * Add a sibling to an existing person
 * @param treeId - Family tree ID
 * @param referencePersonId - ID of the person to add sibling to
 * @param siblingData - Data for the new sibling
 * @param relationshipType - Type of sibling relationship (same-parents, same-mother, same-father, unknown-parents)
 */
export async function addSibling(
  treeId: string,
  referencePersonId: string,
  siblingData: Partial<Person>,
  parentChildType: string = 'biological'
): Promise<Person> {
  const data = await treeApiCalls.addSibling(referencePersonId, siblingData, parentChildType);
  invalidateTreeCache(treeId);
  return data;
}

/**
 * Quick add multiple relatives to a person in a single call
 */
export async function quickAddRelatives(
  treeId: string,
  personId: string,
  relatives: any[]
): Promise<any> {
  const data = await treeApiCalls.quickCreate(personId, relatives);
  invalidateTreeCache(treeId);
  return data;
}



// ============================================================================
// Guardian Operations
// ============================================================================

/**
 * Add an existing person as guardian to a child
 */
export async function addGuardian(
  treeId: string,
  guardianId: string,
  childId: string,
  guardian: {
    guardianType: 'adoption' | 'step-parent' | 'foster' | 'legal-guardian';
    startDate?: string | null;
    endDate?: string | null;
    isLegalGuardian: boolean;
    courtOrderRef?: string | null;
    notes?: string | null;
  }
): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/tree/${treeId}/guardian`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guardianId, childId, guardian }),
  });

  if (!response.ok) {
    throw new Error('Failed to add guardian');
  }

  invalidateTreeCache(treeId);
}

/**
 * Create a new person as guardian to a child
 */
export async function createGuardian(
  treeId: string,
  childId: string,
  guardianData: Omit<import('@/types').Person, 'personId' | 'createdAt' | 'updatedAt'>,
  guardian: {
    guardianType: 'adoption' | 'step-parent' | 'foster' | 'legal-guardian';
    startDate?: string | null;
    endDate?: string | null;
    isLegalGuardian: boolean;
    courtOrderRef?: string | null;
    notes?: string | null;
  }
): Promise<import('@/types').Person> {
  const response = await apiFetch(`${API_BASE_URL}/tree/${treeId}/guardian/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ childId, guardianData, guardian }),
  });

  if (!response.ok) {
    throw new Error('Failed to create guardian');
  }

  invalidateTreeCache(treeId);
  return response.json();
}

/**
 * Remove a guardian relationship
 */
export async function removeGuardian(guardianId: string, childId: string, treeId?: string): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/guardian/${guardianId}/child/${childId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to remove guardian');
  }

  if (treeId) invalidateTreeCache(treeId);
}

/**
 * Get all guardians for a person
 */
export async function getGuardians(personId: string): Promise<Array<{
  guardian: import('@/types').Person;
  relationship: {
    guardianType: string;
    startDate?: string | null;
    endDate?: string | null;
    isLegalGuardian?: boolean;
    courtOrderRef?: string | null;
    notes?: string | null;
  };
}>> {
  const response = await apiFetch(`${API_BASE_URL}/person/${personId}/guardians`);

  if (!response.ok) {
    throw new Error('Failed to fetch guardians');
  }

  return response.json();
}

/**
 * Update a union's properties
 */
export async function updateUnion(
  unionId: string,
  updates: Partial<Union>,
  treeId?: string
): Promise<Union> {
  const response = await apiFetch(`${API_BASE_URL}/union/${unionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(`Failed to update union: ${response.statusText}`);
  }

  if (treeId) {
    invalidateTreeCache(treeId);
  } else {
    clearAllTreeCaches();
  }
  return response.json();
}

/**
 * Move children from one union to another
 * Used when adding a spouse to someone who already has children in a single-parent union
 */
export async function moveChildrenToUnion(
  fromUnionId: string,
  toUnionId: string,
  childIds: string[] = [],
  treeId?: string
): Promise<{ movedCount: number }> {
  // Use the new API call
  const data = await treeApiCalls.moveChildren(treeId || 'current-tree', fromUnionId, toUnionId, childIds);
  
  if (treeId) {
    invalidateTreeCache(treeId);
  } else {
    clearAllTreeCaches();
  }
  
  return data;
}

/**
 * Compute family roots and connected components from already-loaded tree data.
 * Pure synchronous function — no network calls.
 */
export function computeFamilyRoots(treeData: TreeWindowData): {
  roots: Array<{
    personId: string
    firstName: string
    lastName: string
    isHomePerson: boolean
    componentSize: number
  }>;
  componentMap: ComponentMap;
} {
    // Build adjacency map for connected components detection
    // Include both persons AND unions in the graph
    const adjacency = new Map<string, Set<string>>();

    // Initialize adjacency map for all persons
    treeData.persons.forEach(p => {
      adjacency.set(p.personId, new Set());
    });

    // Initialize adjacency map for all unions
    treeData.unions.forEach(u => {
      adjacency.set(u.unionId, new Set());
    });

    // Add edges based on relationships (both directions for connectivity)
    // Relationships connect: Person ↔ Union ↔ Person
    treeData.relationships.forEach(rel => {
      if (!adjacency.has(rel.fromId)) adjacency.set(rel.fromId, new Set());
      if (!adjacency.has(rel.toId)) adjacency.set(rel.toId, new Set());

      adjacency.get(rel.fromId)?.add(rel.toId);
      adjacency.get(rel.toId)?.add(rel.fromId);
    });

    // Find connected components using BFS
    const visited = new Set<string>();
    const components: string[][] = [];

    for (const personId of adjacency.keys()) {
      if (visited.has(personId)) continue;

      // BFS to find all connected people
      const component: string[] = [];
      const queue = [personId];
      visited.add(personId);

      while (queue.length > 0) {
        const current = queue.shift()!;
        component.push(current);

        const neighbors = adjacency.get(current) || new Set();
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }

      components.push(component);
    }

    // For each component, find the representative (root person with no parents)
    const childRelationships = treeData.relationships.filter(r => r.type === 'HAS_CHILD');
    const peopleWithParents = new Set(childRelationships.map(r => r.toId));

    // Build component map and representatives
    const componentMap: ComponentMap = {};
    const familyRepresentatives = components.map(component => {
      // Separate person IDs and union IDs
      const personIds = component.filter(id =>
        treeData.persons.some(p => p.personId === id)
      );
      const unionIds = component.filter(id =>
        treeData.unions.some(u => u.unionId === id)
      );

      // Find all roots in this component (people with no parents)
      const roots = personIds
        .map(personId => treeData.persons.find(p => p.personId === personId)!)
        .filter(p => p && !peopleWithParents.has(p.personId));

      // Sort roots: home person first, then male before female (for family names), then alphabetically
      roots.sort((a, b) => {
        if (a.isHomePerson && !b.isHomePerson) return -1;
        if (!a.isHomePerson && b.isHomePerson) return 1;

        // Prefer male roots for family naming (traditional family tree convention)
        const aIsMale = a.gender?.toLowerCase() === 'male';
        const bIsMale = b.gender?.toLowerCase() === 'male';
        if (aIsMale && !bIsMale) return -1;
        if (!aIsMale && bIsMale) return 1;

        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      });

      // Get the representative (first root or first person)
      const representative = roots.length > 0
        ? roots[0]
        : treeData.persons.find(p => p.personId === personIds[0])!;

      // Store component membership
      if (representative) {
        componentMap[representative.personId] = {
          personIds: new Set(personIds),
          unionIds: new Set(unionIds),
        };
      }

      return representative;
    }).filter(p => p !== undefined);

    // Sort representatives: component containing the home person first, then alphabetically.
    // A representative may not be the home person themselves (e.g. the home person has parents
    // so someone else is the component root), so we check the component membership too.
    const homePersonId = treeData.persons.find(p => p.isHomePerson)?.personId;
    familyRepresentatives.sort((a, b) => {
      const aHasHome = a.isHomePerson || (homePersonId ? componentMap[a.personId]?.personIds.has(homePersonId) : false);
      const bHasHome = b.isHomePerson || (homePersonId ? componentMap[b.personId]?.personIds.has(homePersonId) : false);
      if (aHasHome && !bHasHome) return -1;
      if (!aHasHome && bHasHome) return 1;

      // Deprioritize single-person (orphan) components; larger families first
      const aSize = componentMap[a.personId]?.personIds.size ?? 0;
      const bSize = componentMap[b.personId]?.personIds.size ?? 0;
      if (aSize > 1 && bSize <= 1) return -1;
      if (aSize <= 1 && bSize > 1) return 1;
      if (aSize !== bSize) return bSize - aSize;

      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    });

    return {
      roots: familyRepresentatives.map(p => ({
        personId: p.personId,
        firstName: p.firstName,
        lastName: p.lastName,
        isHomePerson: p.isHomePerson || false,
        componentSize: componentMap[p.personId]?.personIds.size ?? 1,
      })),
      componentMap,
    };
}

/**
 * Get list of connected family trees with component membership (fetches tree data).
 * Prefer computeFamilyRoots() when tree data is already available.
 */
export async function getFamilyRoots(treeId: string): Promise<{
  roots: Array<{
    personId: string
    firstName: string
    lastName: string
    isHomePerson: boolean
  }>;
  componentMap: ComponentMap;
}> {
  try {
    const treeData = await fetchTreeWindow(treeId);
    return computeFamilyRoots(treeData);
  } catch (error) {
    console.error('Failed to get family roots:', error);
    return { roots: [], componentMap: {} };
  }
}

// ============================================================================
// Multi-Tree Management Operations
// ============================================================================

/**
 * Get all trees for a user.
 *
 * Concurrent and near-duplicate calls share a single in-flight Promise and a
 * short-lived result cache so page loads that trigger getUserTrees from
 * multiple components (AppShell, DashboardPage, MigrationMapPage, etc.)
 * collapse to one network request.
 */
const _getUserTreesCache = new Map<string, { at: number; data: TreeMetadata[] }>();
const _getUserTreesInFlight = new Map<string, Promise<TreeMetadata[]>>();
const GET_USER_TREES_TTL_MS = 30_000;

export async function getUserTrees(userId: string, forceRefresh: boolean = false): Promise<TreeMetadata[]> {
  if (forceRefresh) {
    _getUserTreesCache.delete(userId);
    _getUserTreesInFlight.delete(userId);
  }

  const cached = _getUserTreesCache.get(userId);
  if (!forceRefresh && cached && Date.now() - cached.at < GET_USER_TREES_TTL_MS) {
    return cached.data;
  }
  const inFlight = _getUserTreesInFlight.get(userId);
  if (inFlight) return inFlight;

  const promise = (async () => {
    try {
      const data = await treeApiCalls.list();
      _getUserTreesCache.set(userId, { at: Date.now(), data });
      return data;

    } finally {
      _getUserTreesInFlight.delete(userId);
    }
  })();
  _getUserTreesInFlight.set(userId, promise);
  return promise;
}

/** Clear the cache — call after tree create/delete/rename so the next fetch hits the server. */
export function invalidateUserTreesCache(userId?: string) {
  if (userId) {
    _getUserTreesCache.delete(userId);
    _getUserTreesInFlight.delete(userId);
  } else {
    _getUserTreesCache.clear();
    _getUserTreesInFlight.clear();
  }
}

/**
 * Create a new family tree
 */
export async function createTree(
  treeName: string,
  ownerId: string,
  description?: string
): Promise<{ treeId: string; treeName: string }> {
  return treeApiCalls.create(treeName, description);
}

/**
 * Edit an existing family tree
 */
export async function editTree(
  treeId: string,
  treeName: string,
  description?: string
): Promise<{ success: boolean; data: any }> {
  const data = await treeApiCalls.editTreeDescription(treeId, treeName, description || '');
  clearAllTreeCaches();
  return data;
}

/**
 * Rename a tree
 */


/**
 * Duplicate a tree
 */
export async function duplicateTree(
  treeId: string,
  newTreeName: string,
  _ownerId?: string
): Promise<TreeMetadata> {
  try {
    const duplicated = await treeApiCalls.duplicateTree(treeId, newTreeName);
    return duplicated;
  } catch (error) {
    console.error('Failed to duplicate tree:', error);
    throw error;
  }
}


/**
 * Rename a tree
 */
export async function renameTree(treeId: string, newTreeName: string): Promise<any> {
  const result = await treeApiCalls.renameTree(treeId, newTreeName);
  clearAllTreeCaches();
  return result;
}

/**
 * Delete a tree
/**
 * Delete a tree
 */
export async function deleteTree(treeId: string): Promise<any> {
  const result = await treeApiCalls.deleteTree(treeId);
  clearAllTreeCaches();
  return result;
}

/**
 * Set a tree as default
 */
export async function setDefaultTree(treeId: string): Promise<any> {
  const result = await treeApiCalls.setDefaultTree(treeId);
  clearAllTreeCaches();
  return result;
}

/**
 * Get validation configuration for a tree
 */
export async function getTreeValidationConfig(treeId: string): Promise<ValidationConfig> {
  const response = await apiFetch(`${API_BASE_URL}/tree/${treeId}/validation-config`);

  if (!response.ok) {
    throw new Error(`Failed to get validation config: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Update validation configuration for a tree
 */
export async function updateTreeValidationConfig(
  treeId: string,
  config: Partial<ValidationConfig>
): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/tree/${treeId}/validation-config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    throw new Error(`Failed to update validation config: ${response.statusText}`);
  }
}

/**
 * Node Display Preferences
 */
export interface NodeDisplayPreferences {
  fields: string[];
}

export async function getTreeNodeDisplayPreferences(treeId: string): Promise<{ fields: string[] }> {
  return await treeApiCalls.getNodeDisplayPreferences(treeId);
}

export async function updateTreeNodeDisplayPreferences(
  treeId: string,
  prefs: { fields: string[] }
): Promise<void> {
  await treeApiCalls.updateNodeDisplayPreferences(treeId, prefs.fields);
}

// ============================================================================
// Import/Export Operations
// ============================================================================

/**
 * Import a GEDCOM file and create a new tree
 */
export async function importGedcom(
  file: File,
  treeName?: string,
  treeId?: string
): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  if (treeId) {
    formData.append('treeId', treeId);
  } else if (treeName) {
    formData.append('treeName', treeName);
  }

  const result = await treeApiCalls.importGedcom(formData);
  clearAllTreeCaches();
  return result;
}

/**
 * Set the home person for a tree
 */
export async function setHomePerson(
  treeId: string,
  personId: string
): Promise<any> {
  return treeApiCalls.setHomePerson(treeId, personId);
}



/**
 * Filter tree data to only include members of a specific family component
 */
// ============================================================================
// Phase 3: Relationship Path Finder
// ============================================================================

export interface StepLabel {
  fromPersonId: string;
  toPersonId: string;
  label: string;
}

export interface DerivedRelationship {
  relationship: string;
  label: string;
  description: string;
  lineage: string;
  degree: number;
  removed: number;
  gender: string;
  elderStatus?: 'elder' | 'younger' | null;
  guardianType?: string;
}

export interface RelationshipPathResult {
  path: Person[];
  personIds: string[];
  pathNodes: Array<{ id: string; type: 'Person' | 'Union'; data: Record<string, unknown> }>;
  pathEdges: Array<{ fromId: string; toId: string; type: string }>;
  derivedRelationship?: DerivedRelationship | null;
  stepLabels?: StepLabel[];
}

export async function fetchRelationshipPath(
  personAId: string,
  personBId: string,
  treeId: string
): Promise<RelationshipPathResult> {
  const url = `${API_BASE_URL}/relationship/${personAId}/${personBId}?treeId=${encodeURIComponent(treeId)}`;
  const response = await apiFetch(url);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

export interface CommonAncestor {
  personId: string;
  firstName: string;
  lastName: string;
  gender: string;
  connectionType: string;
}

export interface AllRelationshipPathsResult {
  primaryPath: RelationshipPathResult;
  alternatePaths: RelationshipPathResult[];
  commonAncestors: CommonAncestor[];
  pathCount: number;
}

// export async function fetchAllRelationshipPaths(
//   personAId: string,
//   personBId: string,
//   treeId: string
// ): Promise<AllRelationshipPathsResult> {
//   const url = `${API_BASE_URL}/relationship/${personAId}/${personBId}?treeId=${encodeURIComponent(treeId)}&allPaths=true`;
//   const response = await apiFetch(url);
//   if (!response.ok) throw new Error(`API error: ${response.status}`);
//   return response.json();
// }

/** Fetch AI-powered multi-language relationship explanation */
export interface RelationshipExplanation {
  nativeExplanation: string;
  englishExplanation: string;
  culturalNote: string;
}

export async function fetchRelationshipExplanation(
  personAId: string,
  personBId: string,
  treeId: string,
  lang?: string,
  kinshipTerm?: { label: string; romanization?: string; englishLabel: string },
): Promise<{ explanation: RelationshipExplanation | null; detectedLanguage: string }> {
  try {
    let url = `${API_BASE_URL}/relationship/${personAId}/${personBId}/ai-explanation?treeId=${encodeURIComponent(treeId)}`;
    if (lang) url += `&lang=${encodeURIComponent(lang)}`;
    if (kinshipTerm) url += `&kinshipTerm=${encodeURIComponent(JSON.stringify(kinshipTerm))}`;
    const response = await apiFetch(url);
    if (!response.ok) return { explanation: null, detectedLanguage: lang || 'en' };
    const data = await response.json();
    return { explanation: data.explanation, detectedLanguage: data.detectedLanguage || lang || 'en' };
  } catch {
    return { explanation: null, detectedLanguage: lang || 'en' };
  }
}

// ============================================================================
// Phase 3: Consanguinity Calculator
// ============================================================================

export interface ConsanguinityResult {
  coefficient: number;
  commonAncestors: Array<{
    personId: string;
    firstName: string;
    lastName: string;
    pathLengthA: number;
    pathLengthB: number;
    contribution: number;
  }>;
  riskLevel: 'none' | 'low' | 'moderate' | 'high';
  description: string;
}

export async function fetchConsanguinityCoefficient(
  personAId: string,
  personBId: string,
  treeId: string
): Promise<ConsanguinityResult> {
  const url = `${API_BASE_URL}/consanguinity/${personAId}/${personBId}?treeId=${encodeURIComponent(treeId)}`;
  const response = await apiFetch(url);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

// ============================================================================
// Phase 3: Smart Suggestions
// ============================================================================

export interface Suggestion {
  id: string;
  type: string;
  personId: string;
  personName: string;
  message: string;
  icon: string;
  priority: 'high' | 'medium' | 'low' | 'info';
  unlockImpact?: number;
  tier: 1 | 2 | 3;
}

export interface TierInfo {
  tier: 1 | 2 | 3;
  label: string;
  description: string;
  totalCount: number;
}

export interface SuggestionsResult {
  suggestions: Suggestion[];
  completenessPercent: number;
  totalPersons: number;
  tiers: TierInfo[];
  stats: Record<string, number>;
}

export async function fetchSuggestions(treeId: string): Promise<SuggestionsResult> {
  const url = `${API_BASE_URL}/tree/${treeId}/suggestions`;
  const response = await apiFetch(url);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

export interface DataQualityIssue {
  personId: string;
  personName: string;
  severity: 'error' | 'warning';
  category: string;
  message: string;
}

export async function fetchDataQualityIssues(treeId: string): Promise<{ issues: DataQualityIssue[]; errorCount: number; warningCount: number }> {
  const url = `${API_BASE_URL}/tree/${treeId}/data-quality/issues`;
  const response = await apiFetch(url);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

export async function checkExportReadiness(treeId: string): Promise<{ canExport: boolean; errorCount: number; errors: DataQualityIssue[] }> {
  const url = `${API_BASE_URL}/tree/${treeId}/data-quality/export-check`;
  const response = await apiFetch(url);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

// ============================================================================
// Tree Overview Hub — Statistics, Activity, Narrative
// ============================================================================

export interface TreeStatistics {
  personCount: number;
  generationCount: number;
  marriageCount: number;
  genderDistribution: { male: number; female: number; other: number };
  livingCount: number;
  deceasedCount: number;
  topSurnames: { name: string; count: number }[];
  topBirthPlaces: { place: string; count: number }[];
  topGotras: { gotra: string; count: number }[];
  oldestLivingPerson: { personId: string; firstName: string; lastName: string; birthDate: string } | null;
  averageAgeAtDeath: number | null;
}

export async function fetchTreeStatistics(treeId: string): Promise<TreeStatistics> {
  const url = `${API_BASE_URL}/tree/${treeId}/statistics`;
  const response = await apiFetch(url);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

export interface ChangeLogEntry {
  changeLogId: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  timestamp: string;
  personName?: string;
  before?: string;
  after?: string;
}

export async function fetchTreeActivityFeed(
  treeId: string,
  limit: number = 10,
): Promise<{ entries: ChangeLogEntry[]; total: number }> {
  const url = `${API_BASE_URL}/tree/${treeId}/activity?limit=${limit}`;
  const response = await apiFetch(url);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

export async function fetchFamilyNarrative(
  treeId: string,
): Promise<{ narrative: string; paragraphs: string[] }> {
  // Prefer AI-generated narrative, fall back to template
  try {
    const aiUrl = `${API_BASE_URL}/tree/${treeId}/ai-narrative`;
    const aiResponse = await apiFetch(aiUrl);
    if (aiResponse.ok) {
      const data = await aiResponse.json();
      if (data.source === 'ai' && data.narrative) return data;
    }
  } catch { /* fall through to template */ }
  const url = `${API_BASE_URL}/tree/${treeId}/reports/family-narrative`;
  const response = await apiFetch(url);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

export async function fetchAILifeStory(personId: string): Promise<string | null> {
  try {
    const url = `${API_BASE_URL}/person/${personId}/ai-life-story`;
    const response = await apiFetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return data.source === 'ai' ? data.story : null;
  } catch {
    return null;
  }
}

export async function fetchAIAncestorInsight(
  personId: string,
  generation: number,
  descendantCount: number,
): Promise<string | null> {
  try {
    const url = `${API_BASE_URL}/person/${personId}/ai-ancestor-insight`;
    const response = await apiFetch(url, {
      method: 'POST',
      body: JSON.stringify({ generation, descendantCount }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.source === 'ai' ? data.insight : null;
  } catch {
    return null;
  }
}

export interface MissingGenerationWarning {
  parentId: string;
  childId: string;
  ageGap: number;
}

export async function fetchMissingGenerationWarnings(treeId: string): Promise<MissingGenerationWarning[]> {
  const url = `${API_BASE_URL}/tree/${treeId}/missing-generation-warnings`;
  const response = await apiFetch(url);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

export async function fetchBrokenLineagePersonIds(treeId: string): Promise<string[]> {
  const url = `${API_BASE_URL}/tree/${treeId}/broken-lineage`;
  const response = await apiFetch(url);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  return data.personIds;
}

export async function fetchFatherGotra(unionId: string): Promise<string | null> {
  const url = `${API_BASE_URL}/union/${unionId}/father-gotra`;
  const response = await apiFetch(url);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  return data.gotra;
}

// ============================================================================
// Phase 3: Duplicate Detection & Merge
// ============================================================================

export interface DuplicatePersonInfo {
  personId: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  deathDate?: string;
  gender?: string;
  birthPlace?: string;
  maidenName?: string;
  profilePhotoUrl?: string;
}

export interface DuplicatePair {
  person1: DuplicatePersonInfo;
  person2: DuplicatePersonInfo;
  confidence: number;
  matchReasons: string[];
  matchCategory?: 'name' | 'structural' | 'biographical' | 'combined';
}

export async function fetchDuplicates(treeId: string): Promise<DuplicatePair[]> {
  return await aiApiCalls.getDuplicates(treeId);
}


export async function mergePersons(
  treeId: string,
  keepId: string,
  removeId: string,
  fieldSelections?: Record<string, 'keep' | 'remove'>
): Promise<{ keptPersonId: string; removedPersonId: string; relationshipsReassigned: number }> {
  const data = await treeApiCalls.mergePersons(treeId, { keepId, removeId, fieldSelections });
  invalidateTreeCache(treeId);
  return data;
}


// ============================================================================
// Phase 3: Tree Places (for Migration Map)
// ============================================================================

export interface PlaceEntry {
  personId: string;
  personName: string;
  place: string;
  placeType: 'birth' | 'death' | 'native';
}

export interface MigrationPerson {
  personId: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  birthPlace?: string | null;
  deathPlace?: string | null;
  nativePlace?: string | null;
  occupation?: string | null;
  gender: string;
  isLiving: boolean;
}

export async function fetchTreePlaces(treeId: string): Promise<{ places: PlaceEntry[]; relationships: Relationship[]; persons?: MigrationPerson[] }> {
  const url = `${API_BASE_URL}/tree/${treeId}/places`;
  const response = await apiFetch(url);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

// ============================================================================
// Existing utility functions
// ============================================================================

/**
 * Filter tree data to only show a specific connected component.
 * Used when the tree has multiple disconnected families.
 */
// ============================================================================
// Phase 8: Lazy Loading & Pagination
// ============================================================================

/**
 * Lazy-load full person details (for large trees where initial load only has basic data)
 */
export async function getPersonDetails(personId: string): Promise<Person | null> {
  try {
    return await treeApiCalls.getPerson(personId);
  } catch (error) {
    console.error(`Failed to fetch person details for ${personId}:`, error);
    return null;
  }
}


/**
 * Paginated tree window - loads persons in batches
 */
export async function getTreeWindowPaginated(
  treeId: string,
  focusPersonId?: string,
  page: number = 1,
  pageSize: number = 100
): Promise<TreeWindowData & { totalPersons: number; hasMore: boolean }> {
  const params = new URLSearchParams();
  if (focusPersonId) params.set('focusPersonId', focusPersonId);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));

  const res = await apiFetch(`${API_BASE_URL}/tree/${treeId}/window?${params}`);
  if (!res.ok) throw new Error('Failed to fetch tree window');
  return res.json();
}

// ============================================================================
// Phase 2: AI Features
// ============================================================================

/** AI-powered natural language search */
export async function smartSearch(
  treeId: string,
  query: string,
): Promise<{ persons: Person[]; source: string; cypher?: string } | null> {
  try {
    const url = `${API_BASE_URL}/tree/${treeId}/search/smart?q=${encodeURIComponent(query)}`;
    const response = await apiFetch(url);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

/** AI-generated relationship story between two persons */
export async function fetchRelationshipStory(
  personAId: string,
  personBId: string,
  treeId: string,
): Promise<string | null> {
  try {
    const url = `${API_BASE_URL}/relationship/${personAId}/${personBId}/ai-story?treeId=${treeId}`;
    const response = await apiFetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return data.story ?? null;
  } catch {
    return null;
  }
}

/** AI-generated cultural context explanation */
export async function fetchCulturalContext(
  field: string,
  value: string,
): Promise<string | null> {
  try {
    const url = `${API_BASE_URL}/cultural-context?field=${encodeURIComponent(field)}&value=${encodeURIComponent(value)}`;
    const response = await apiFetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return data.explanation ?? null;
  } catch {
    return null;
  }
}

/** AI-generated pattern insights */
export async function fetchPatternInsights(
  treeId: string,
): Promise<{ marriageAge: string | null; longevity: string | null; namingCycles: string | null } | null> {
  try {
    const url = `${API_BASE_URL}/tree/${treeId}/patterns/ai-insights`;
    const response = await apiFetch(url);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

/** AI-generated duplicate explanation */
export async function fetchDuplicateExplanation(
  treeId: string,
  personAId: string,
  personBId: string,
  confidence: number,
  signals: string[],
): Promise<string | null> {
  try {
    const url = `${API_BASE_URL}/tree/${treeId}/duplicates/ai-explanation?personAId=${personAId}&personBId=${personBId}&confidence=${confidence}&signals=${signals.join(',')}`;
    const response = await apiFetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return data.explanation ?? null;
  } catch {
    return null;
  }
}

// ============================================================================
// Phase 3: AI New Features
// ============================================================================

/** AI-powered image captioning (vision) */
export async function fetchImageCaption(
  treeId: string,
  imageBase64: string,
  mimeType: string,
  taggedPersons?: string[],
  dateTaken?: string,
  category?: string,
): Promise<{ description: string; suggestedTags: string[] } | null> {
  try {
    const url = `${API_BASE_URL}/tree/${treeId}/memories/ai-caption`;
    const response = await apiFetch(url, {
      method: 'POST',
      body: JSON.stringify({ imageBase64, mimeType, taggedPersons, dateTaken, category }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.caption ?? null;
  } catch {
    return null;
  }
}

/** AI-enhanced memory description */
export async function fetchEnhancedDescription(
  treeId: string,
  description: string,
  personNames?: string[],
  dateTaken?: string,
  category?: string,
): Promise<string | null> {
  try {
    const url = `${API_BASE_URL}/tree/${treeId}/memories/ai-enhance`;
    const response = await apiFetch(url, {
      method: 'POST',
      body: JSON.stringify({ description, personNames, dateTaken, category }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.enhanced ?? null;
  } catch {
    return null;
  }
}

/** AI-generated tribute for deceased person */
export async function fetchAITribute(personId: string): Promise<string | null> {
  try {
    const url = `${API_BASE_URL}/person/${personId}/ai-tribute`;
    const response = await apiFetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return data.tribute ?? null;
  } catch {
    return null;
  }
}

/** AI-generated migration story */
/** Batch geocode multiple places in a single request. Returns map of lowercase key → coords. */
export async function batchGeocodePlaces(places: string[]): Promise<Record<string, { lat: number; lon: number }>> {
  try {
    const url = `${API_BASE_URL}/geocode/batch`;
    const response = await apiFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ places }),
    });
    if (!response.ok) return {};
    const data = await response.json();
    return data.geocoded ?? {};
  } catch {
    return {};
  }
}

/** Fetch AI-generated migration insights for a tree. */
export interface MigrationInsights {
  summary: string;
  placeHighlights: Array<{ place: string; highlight: string }>;
  patterns: string[];
  timeline: Array<{ period: string; description: string }>;
}

export async function fetchMigrationInsights(treeId: string): Promise<MigrationInsights | null> {
  try {
    const url = `${API_BASE_URL}/tree/${treeId}/ai-migration-insights`;
    const response = await apiFetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return data.insights ?? null;
  } catch {
    return null;
  }
}

export async function fetchMigrationStory(treeId: string): Promise<string | null> {
  try {
    const url = `${API_BASE_URL}/tree/${treeId}/ai-migration-story`;
    const response = await apiFetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return data.story ?? null;
  } catch {
    return null;
  }
}

/** AI-generated family letter */
export async function fetchFamilyLetter(
  personId: string,
  authorName: string,
  dataGaps?: string[],
): Promise<string | null> {
  try {
    const url = `${API_BASE_URL}/person/${personId}/ai-letter`;
    const response = await apiFetch(url, {
      method: 'POST',
      body: JSON.stringify({ authorName, dataGaps }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.letter ?? null;
  } catch {
    return null;
  }
}

// ============================================================================
// AI-Enriched Suggestions (Data Quality Coach)
// ============================================================================

export async function fetchAIEnrichedSuggestions(
  treeId: string,
  limit: number = 5,
): Promise<SuggestionsResult | null> {
  try {
    const trees = await treeApiCalls.list();
    const defaultTree = trees?.find((t: any) => t.isDefault === true);
    if (!defaultTree || !defaultTree.treeId) {
      console.warn('[fetchAIEnrichedSuggestions] No default tree found. Skipping Smart Suggestions API call.');
      return null;
    }
    const dynamicTreeId = defaultTree.treeId;

    const url = `${AI_BASE_URL}/ai/smart-suggestions/${dynamicTreeId}?language=en&limit=${limit}`;
    const token = getAuthToken() || localStorage.getItem('auth_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(url, { headers });
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error('AI Suggestions Error:', error);
    return null;
  }
}

// ============================================================================
// AI Changelog Summary
// ============================================================================

export async function fetchChangelogSummary(
  treeId: string,
  days: number = 7,
): Promise<string | null> {
  try {
    const url = `${API_BASE_URL}/tree/${treeId}/changelog/ai-summary?days=${days}`;
    const response = await apiFetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return data.summary ?? null;
  } catch {
    return null;
  }
}

export function filterTreeDataByComponent(
  treeData: TreeWindowData,
  component: FamilyComponent
): TreeWindowData {
  // Filter persons
  const persons = treeData.persons.filter(p => component.personIds.has(p.personId));

  // Filter unions
  const unions = treeData.unions.filter(u => component.unionIds.has(u.unionId));

  // Filter relationships - only include if both endpoints are in the component
  const relationships = treeData.relationships.filter(r => {
    const fromInComponent = component.personIds.has(r.fromId) || component.unionIds.has(r.fromId);
    const toInComponent = component.personIds.has(r.toId) || component.unionIds.has(r.toId);
    return fromInComponent && toInComponent;
  });

  return {
    persons,
    unions,
    relationships,
    trees: treeData.trees,
  };
}

/**
 * Dismiss a smart suggestion via AI API
 */
export async function dismissAISuggestion(suggestionId: string): Promise<any> {
  const url = `${AI_BASE_URL}/ai/smart-suggestions/dismiss`;
  const token = getAuthToken() || localStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ suggestion_id: suggestionId }),
  });
  if (!response.ok) {
    throw new Error(`Failed to dismiss suggestion: ${response.statusText}`);
  }
  return response.json();
}
