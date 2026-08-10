/**
 * Story Parse API Service
 *
 * Client for the AI-powered story capture endpoints.
 */

import { API_BASE_URL, AI_BASE_URL } from '@/config/api';
import { treeApiCalls } from '@/api/apicalls';
import { getAuthToken } from '@/lib/auth';
import { trackEvent } from '@/services/firebase/analytics.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoryEntity {
  tempId: string;
  firstName: string;
  lastName?: string;
  maidenName?: string;
  gender: 'male' | 'female' | 'other' | 'unknown';
  role?: string;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  occupation?: string;
  education?: string;
  isLiving?: boolean;
  religion?: string;
  nativePlace?: string;
  nativeLanguage?: string;
  gotra?: string;
  caste?: string;
  confidence: number;
  note?: string;
}

export interface StoryRelationship {
  fromTempId: string;
  toTempId: string;
  type: 'parent_child' | 'spouse';
}

export interface NewStoryParseResponse {
  applyMode: boolean;
  suggestedTreeNames: string[];
  summary: string;
  extracted: {
    rootPerson: string;
    people: Array<{
      tempId: string;
      firstName: string;
      lastName?: string;
      gender: string;
      place?: string;
      occupation?: string;
      education?: string;
      note?: string;
    }>;
    relationships: Array<{
      type: string;
      subject: string;
      object: string;
    }>;
    placeholders: string[];
    unresolved: any[];
    followUpQuestions: string[];
  };
}

export interface StoryParseResponse {
  entities: StoryEntity[];
  relationships: StoryRelationship[];
  followUpQuestions: string[];
  clarificationQuestions: string[];
  suggestedTreeName: string;
  summary?: string;
  rawExtraction?: any;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken() || localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Parse a narrative text into structured family entities and relationships.
 */
export async function parseNarrative(narrative: string): Promise<StoryParseResponse> {
  const aiBase = (AI_BASE_URL).replace(/\/$/, '');
  const res = await fetch(`${aiBase}/ai/tree-builder/onboarding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ narrative }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Failed to parse story' })) as { error?: string };
    throw new Error(data.error || `Parse failed (${res.status})`);
  }

  const raw: NewStoryParseResponse = await res.json();
  return mapAIResponse(raw);
}

export function mapAIResponse(raw: any): StoryParseResponse {
  if (!raw || !raw.extracted || !Array.isArray(raw.extracted.people)) {
    throw new Error('Failed to process. Please retry.');
  }

  const rootPerson = raw.extracted.rootPerson || '';
  const people = raw.extracted.people || [];
  const relationshipsList = Array.isArray(raw.extracted.relationships) ? raw.extracted.relationships : [];
  const unresolved = Array.isArray(raw.extracted.unresolved) ? raw.extracted.unresolved : [];

  // Map new API structure to existing StoryParseResponse
  const entities: StoryEntity[] = people.map((p: any) => ({
    tempId: p.tempId || null,
    firstName: p.firstName || '',
    lastName: p.lastName || '',
    gender: (p.gender === 'male' || p.gender === 'female' || p.gender === 'other' || p.gender === 'unknown') ? p.gender : 'unknown',
    birthDate: p.birthDate || null,
    birthPlace: p.birthPlace || p.place || null,
    deathDate: p.deathDate || null,
    deathPlace: p.deathPlace || null,
    occupation: p.occupation || null,
    education: p.education || null,
    isLiving: p.isLiving !== undefined ? p.isLiving : true,
    religion: p.religion || null,
    nativePlace: p.nativePlace || null,
    nativeLanguage: p.nativeLanguage || null,
    gotra: p.gotra || null,
    caste: p.caste || null,
    note: p.note || '',
    confidence: 100, // Default confidence
    role: p.tempId === rootPerson ? 'self' : undefined,
  }));

  unresolved.forEach((u, index) => {
    entities.push({
      tempId: u.tempId || `unresolved-${index + 1}`,
      firstName: u.person || 'Unknown',
      gender: 'unknown',
      confidence: 50,
      note: `Needs clarification: ${u.knownRelation || 'unknown relation'}. ${u.missingLinks?.join(' ') || ''}`,
    });
  });

  // Infer roles if possible for MiniTreePreview
  if (rootPerson) {
    const rootId = rootPerson;

    // 1. Spouses of Root
    relationshipsList.forEach(rel => {
      if (rel.type === 'spouse_of') {
        const spouseId = rel.subject === rootId ? rel.object : (rel.object === rootId ? rel.subject : null);
        if (spouseId) {
          const entity = entities.find(e => e.tempId === spouseId);
          if (entity) entity.role = 'spouse';
        }
      }
    });

    // 2. Parents and Children of Root
    relationshipsList.forEach(rel => {
      if (rel.type === 'child_of') {
        if (rel.subject === rootId) {
          // Object is parent of root
          const parentId = rel.object;
          const entity = entities.find(e => e.tempId === parentId);
          if (entity) {
            entity.role = entity.gender === 'female' ? 'mother' : 'father';
          }
        } else if (rel.object === rootId) {
          // Subject is child of root
          const childId = rel.subject;
          const entity = entities.find(e => e.tempId === childId);
          if (entity) {
            entity.role = entity.gender === 'female' ? 'daughter' : 'son';
          }
        }
      }
    });

    // 3. Siblings and Grandparents
    const rootParents = relationshipsList
      .filter(rel => rel.type === 'child_of' && rel.subject === rootId)
      .map(rel => rel.object);

    relationshipsList.forEach(rel => {
      if (rel.type === 'child_of') {
        // Sibling: has same parent as root
        if (rel.subject !== rootId && rootParents.includes(rel.object)) {
          const entity = entities.find(e => e.tempId === rel.subject);
          if (entity && !entity.role) {
            entity.role = entity.gender === 'female' ? 'sister' : 'brother';
          }
        }

        // Grandparent: is parent of a root's parent
        if (rootParents.includes(rel.subject)) {
          const grandparentId = rel.object;
          const entity = entities.find(e => e.tempId === grandparentId);
          if (entity && !entity.role) {
            entity.role = entity.gender === 'female' ? 'grandmother' : 'grandfather';
          }
        }
      }
    });
  }

  const relationships: StoryRelationship[] = relationshipsList.map(rel => ({
    fromTempId: rel.subject,
    toTempId: rel.object,
    type: rel.type === 'spouse_of' ? 'spouse' : 'parent_child',
  }));

  return {
    entities,
    relationships,
    followUpQuestions: raw.extracted.followUpQuestions || [],
    clarificationQuestions: raw.extracted.followUpQuestions || [],
    suggestedTreeName: raw.suggestedTreeNames?.[0] || 'My Family Tree',
    summary: raw.summary,
    rawExtraction: raw,
  };
}

export interface MaterializeResponse {
  treeId: string;
}

/**
 * Create a family tree from confirmed entities and relationships.
 */
export async function materializeTree(
  treeName: string,
  entities: StoryEntity[],
  relationships: StoryRelationship[],
  summary?: string | null
): Promise<MaterializeResponse> {
  // Old implementation (commented out as requested):
  // const res = await fetch(`${API_BASE_URL}/story-materialize`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  //   body: JSON.stringify({ treeName, entities, relationships }),
  // });

  const rootPersonId = entities.find(e => e.role === 'self')?.tempId || entities[0]?.tempId || 'p1';

  const payload = {
    applyMode: false,
    suggestedTreeName: treeName,
    summary: summary || "",
    rootPerson: rootPersonId,
    people: entities.map(e => ({
      tempId: e.tempId,
      firstName: e.firstName,
      lastName: e.lastName || "",
      gender: e.gender,
      birthDate: e.birthDate || null,
      birthPlace: e.birthPlace || null,
      deathDate: e.deathDate || null,
      deathPlace: e.deathPlace || null,
      occupation: e.occupation || null,
      education: e.education || null,
      isLiving: e.isLiving !== undefined ? e.isLiving : true,
      religion: e.religion || null,
      nativePlace: e.nativePlace || null,
      nativeLanguage: e.nativeLanguage || null,
      gotra: e.gotra || null,
      caste: e.caste || null,
      note: e.note || ""
    })),
    relationships: relationships.map(r => ({
      type: r.type === 'spouse' ? 'spouse_of' : 'child_of',
      subject: r.fromTempId,
      object: r.toTempId
    }))
  };

  try {
    const data = await treeApiCalls.aiOnboarding(payload);
    trackEvent('family_created', { family_size: entities.length });
    relationships.forEach(r => {
      trackEvent('relationship_added', { relation_type: r.type || 'relative' });
    });
    return data as MaterializeResponse;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || 'Materialize failed');
  }
}
