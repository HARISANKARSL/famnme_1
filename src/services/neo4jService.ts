/**
 * Neo4j Family Tree Service via Supabase Edge Functions
 * 
 * Replaces direct Neo4j Cypher querying with secure REST calls 
 * to the `family-tree` Supabase Edge Function to connect to AuraDB.
 */

import { getAuthToken } from '../lib/auth';
import { API_BASE_URL } from '../config/api';

// ============================================================================
// Type Definitions
// ============================================================================

export interface Person {
  personId: string;
  firstName: string;
  lastName: string;
  maidenName?: string;
  middleName?: string;
  gender: 'male' | 'female' | 'other';
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  isLiving: boolean;
  isHomePerson: boolean;
  biography?: string;
  occupation?: string;
  nationality?: string;
  ethnicity?: string;
  profilePhotoUrl?: string;
  // Indian cultural fields
  gotra?: string;
  caste?: string;
  religion?: string;
  nativePlace?: string;
  nativeLanguage?: string;
  elderStatus?: 'elder' | 'younger';
  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Union {
  unionId: string;
  type: 'marriage' | 'partnership' | 'unknown';
  startDate?: string;
  endDate?: string;
  marriagePlace?: string;
  notes?: string;
  // Indian cultural fields
  ceremonyType?: 'arranged' | 'love' | 'inter-caste' | 'inter-religion';
  dowryNotes?: string;
  livingArrangement?: 'joint' | 'nuclear';
}

export interface FamilyTree {
  treeId: string;
  treeName: string;
  description?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Relationship {
  id?: string;
  fromId: string;
  toId: string;
  type: 'PARTNER_IN' | 'HAS_CHILD' | 'GUARDIAN_OF' | 'MEMBER_OF';
  properties?: Record<string, any>;
}

export interface TreeWindowData {
  persons: Person[];
  unions: Union[];
  relationships: Relationship[];
  trees: FamilyTree[];
}

export interface PersonInput {
  firstName: string;
  lastName: string;
  gender: 'male' | 'female' | 'other';
  birthDate?: string;
  birthPlace?: string;
  isLiving?: boolean;
  maidenName?: string;
  middleName?: string;
  deathDate?: string;
  deathPlace?: string;
  biography?: string;
  occupation?: string;
  nationality?: string;
  ethnicity?: string;
  profilePhotoUrl?: string;
  gotra?: string;
  caste?: string;
  religion?: string;
  nativePlace?: string;
  nativeLanguage?: string;
  elderStatus?: 'elder' | 'younger';
}

export interface UnionInput {
  type?: 'marriage' | 'partnership' | 'unknown';
  startDate?: string;
  endDate?: string;
  marriagePlace?: string;
  notes?: string;
  ceremonyType?: 'arranged' | 'love' | 'inter-caste' | 'inter-religion';
  dowryNotes?: string;
  livingArrangement?: 'joint' | 'nuclear';
}

// ============================================================================
// Internal Helper for Edge Functions API
// ============================================================================

async function fetchEdgeFunction(path: string, options: RequestInit = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error('You must be logged in to access the family tree.');
  }

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const errorData = await res.json();
      errorMsg = errorData.error || errorData.message || errorMsg;
    } catch {
      errorMsg = await res.text() || errorMsg;
    }
    throw new Error(errorMsg);
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return null;
  }

  return res.json();
}

// ============================================================================
// Neo4j Family Tree Service Class
// ============================================================================

export class Neo4jFamilyTreeService {
  constructor() { }

  // ==========================================================================
  // Core CRUD Operations - Person
  // ==========================================================================

  async createPerson(treeId: string, personData: PersonInput): Promise<Person> {
    const payload = { ...personData, treeId };
    return fetchEdgeFunction('/person', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updatePerson(personId: string, updates: Partial<PersonInput>): Promise<Person> {
    return fetchEdgeFunction(`/person/${personId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deletePerson(personId: string): Promise<void> {
    await fetchEdgeFunction(`/person/${personId}`, { method: 'DELETE' });
  }

  // ==========================================================================
  // Core CRUD Operations - Union
  // ==========================================================================

  async createUnion(
    partner1Id: string,
    partner2Id: string | null,
    unionData: UnionInput = {}
  ): Promise<Union> {
    return fetchEdgeFunction('/union', {
      method: 'POST',
      body: JSON.stringify({ partner1Id, partner2Id, ...unionData })
    });
  }

  async addChildToUnion(unionId: string, childData: PersonInput): Promise<Person> {
    return fetchEdgeFunction(`/union/${unionId}/child`, {
      method: 'POST',
      body: JSON.stringify(childData)
    });
  }

  // ==========================================================================
  // Core CRUD Operations - Family Tree
  // ==========================================================================

  async createTree(treeName: string, description?: string): Promise<FamilyTree> {
    return fetchEdgeFunction('/tree', {
      method: 'POST',
      body: JSON.stringify({ treeName, description })
    });
  }

  async getTree(treeId: string): Promise<FamilyTree | null> {
    try {
      return await fetchEdgeFunction(`/tree/${treeId}`, { method: 'GET' });
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes('not found')) return null;
      throw e;
    }
  }

  async getUserTrees(): Promise<FamilyTree[]> {
    const token = getAuthToken();
    if (!token) return [];

    // Decode userId from JWT payload (base64 middle segment)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.userId;
      if (!userId) return [];
      return fetchEdgeFunction(`/user/${userId}/trees`, { method: 'GET' });
    } catch {
      return [];
    }
  }

  // ==========================================================================
  // Windowed Queries (Performance Critical)
  // ==========================================================================

  async getTreeWindow(
    focusPersonId: string,
    ancestorDepth: number = 3,
    descendantDepth: number = 3
  ): Promise<TreeWindowData> {
    // We need to fetch treeId first to build the URL properly 
    // Wait, the edge function signature is GET /tree/:id/window 
    // Since treeId is required we should get it using home person or a separate query, 
    // or we fetch the specific person's treeId.
    const treeIdRes = await this.getTreeIdForPerson(focusPersonId);
    if (!treeIdRes) throw new Error("Could not find tree for person.");

    const params = new URLSearchParams({
      focusPersonId,
      ancestorDepth: ancestorDepth.toString(),
      descendantDepth: descendantDepth.toString()
    });

    const url = `/tree/${treeIdRes}/window?${params.toString()}`;
    const data = await fetchEdgeFunction(url, { method: 'GET' });

    // Polyfill "trees" array that used to be returned
    const trees = [await this.getTree(treeIdRes)].filter(Boolean) as FamilyTree[];
    return { ...data, trees };
  }

  private async getTreeIdForPerson(personId: string): Promise<string | null> {
    try {
      const p = await fetchEdgeFunction(`/person/${personId}`, { method: 'GET' });
      return p.treeId || null;
    } catch {
      return null;
    }
  }

  async expandUnion(_unionId: string, _depth: number = 1): Promise<TreeWindowData> {
    // Currently unsupported by direct Edge Function mapping. 
    // Ideally requires a `/union/:id/expand` endpoint.
    return { persons: [], unions: [], relationships: [], trees: [] };
  }

  // ==========================================================================
  // Parent Operations
  // ==========================================================================

  async addParent(childId: string, parentData: PersonInput): Promise<Person> {
    return fetchEdgeFunction(`/person/${childId}/parent`, {
      method: 'POST',
      body: JSON.stringify(parentData)
    });
  }

  // ==========================================================================
  // Sibling Operations (Indian Context Support)
  // ==========================================================================

  async addSibling(
    referencePersonId: string,
    siblingData: PersonInput,
    parentChoice: 'FULL' | 'MATERNAL_HALF' | 'PATERNAL_HALF' | 'UNKNOWN'
  ): Promise<Person> {
    return fetchEdgeFunction(`/sibling`, {
      method: 'POST',
      body: JSON.stringify({ referencePersonId, parentChoice, ...siblingData })
    });
  }

}

// Export singleton instance
export const neo4jService = new Neo4jFamilyTreeService();

