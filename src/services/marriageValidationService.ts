/**
 * Marriage Validation Service
 *
 * Validates marriages according to Indian cultural rules and biological constraints.
 *
 * Validations:
 * 1. Gotra Rule (Hindu tradition) - Same gotra marriage prohibited
 * 2. Consanguinity Rules - Close blood relatives cannot marry
 * 3. Gender Compatibility (optional, for traditional validation)
 * 4. Living Status - Cannot marry deceased persons
 * 5. Existing Marriage Check - Detect if already married
 *
 * @see references/new file-ancestry.md - Marriage rules
 */

import type { Person, Union, ValidationConfig } from '@/types';
import type { Relationship } from './elkLayoutService';
import { resolveRelationship, type RelationshipResolverInput } from './relationshipResolver';

// ============================================================================
// Types
// ============================================================================

export interface MarriageValidationResult {
  valid: boolean;
  errors: MarriageValidationError[];
  warnings: MarriageValidationWarning[];
}

export interface MarriageValidationError {
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface MarriageValidationWarning {
  code: string;
  message: string;
  canOverride: boolean;
  requiresMarriagePattern?: boolean;  // Requires selecting marriage pattern
  requiresJustification?: boolean;    // Requires cultural context explanation
}

export interface MarriageValidationInput {
  person1: Person;
  person2: Person;
  allPersons: Person[];
  unions: Union[];
  relationships: Relationship[];
  enforceGotraRule?: boolean;  // Default: true for Hindu, false for others
  validationConfig?: ValidationConfig;  // Tree-level validation configuration
}

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Validate a proposed marriage between two people
 */
export async function validateMarriage(
  input: MarriageValidationInput
): Promise<MarriageValidationResult> {
  const { person1, person2, allPersons, unions, relationships, enforceGotraRule, validationConfig } = input;
  const errors: MarriageValidationError[] = [];
  const warnings: MarriageValidationWarning[] = [];

  // Default to strict validation if no config provided
  const config: ValidationConfig = validationConfig || {
    consanguinityLevel: 'strict',
    allowPolyandry: false,
    allowPolygyny: false,
    allowUncleNieceMarriage: false,
    allowAuntNephewMarriage: false,
  };

  // ============================================================================
  // 1. Basic Checks
  // ============================================================================

  // Cannot marry self
  if (person1.personId === person2.personId) {
    errors.push({
      code: 'SAME_PERSON',
      message: 'Cannot marry the same person',
      severity: 'error',
    });
  }

  // Deceased person marriage - warning only (for historical/genealogical records)
  if (!person1.isLiving) {
    warnings.push({
      code: 'PERSON1_DECEASED',
      message: `${person1.firstName} ${person1.lastName} is deceased (historical record)`,
      canOverride: true,
    });
  }

  if (!person2.isLiving) {
    warnings.push({
      code: 'PERSON2_DECEASED',
      message: `${person2.firstName} ${person2.lastName} is deceased (historical record)`,
      canOverride: true,
    });
  }

  // ============================================================================
  // 2. Existing Marriage Check
  // ============================================================================

  const existingUnions1 = getActiveUnions(person1.personId, unions, relationships);
  const existingUnions2 = getActiveUnions(person2.personId, unions, relationships);

  if (existingUnions1.length > 0) {
    const allowMultiple = (person1.gender === 'female' && config.allowPolyandry) ||
                          (person1.gender === 'male' && config.allowPolygyny);

    if (!allowMultiple) {
      warnings.push({
        code: 'PERSON1_ALREADY_MARRIED',
        message: `${person1.firstName} already has ${existingUnions1.length} active marriage(s)`,
        canOverride: false,
      });
    } else {
      warnings.push({
        code: 'CONCURRENT_MARRIAGE',
        message: `This will be an additional marriage for ${person1.firstName}`,
        canOverride: true,
        requiresMarriagePattern: true,
      });
    }
  }

  if (existingUnions2.length > 0) {
    const allowMultiple = (person2.gender === 'female' && config.allowPolyandry) ||
                          (person2.gender === 'male' && config.allowPolygyny);

    if (!allowMultiple) {
      warnings.push({
        code: 'PERSON2_ALREADY_MARRIED',
        message: `${person2.firstName} already has ${existingUnions2.length} active marriage(s)`,
        canOverride: false,
      });
    } else {
      warnings.push({
        code: 'CONCURRENT_MARRIAGE',
        message: `This will be an additional marriage for ${person2.firstName}`,
        canOverride: true,
        requiresMarriagePattern: true,
      });
    }
  }

  // ============================================================================
  // 3. Consanguinity Check (Blood Relation) - Configurable
  // ============================================================================

  try {
    const relationshipData: RelationshipResolverInput = {
      persons: allPersons,
      unions,
      relationships,
    };

    const resolved = await resolveRelationship(person1.personId, person2.personId, relationshipData);

    // Check if too closely related based on consanguinity level
    const { relationship, degree } = resolved.structural;

    // Strict mode (default): block uncle-niece, parent-child, sibling, grandparent
    if (config.consanguinityLevel === 'strict') {
      const prohibited = ['parent', 'child', 'sibling', 'grandparent', 'grandchild'];

      // Add uncle/niece unless explicitly allowed
      if (!config.allowUncleNieceMarriage && !config.allowAuntNephewMarriage) {
        prohibited.push('uncle', 'aunt', 'nephew', 'niece');
      } else {
        // Check specific gender combinations
        if (!config.allowUncleNieceMarriage && ['uncle', 'niece'].includes(relationship)) {
          prohibited.push(relationship);
        }
        if (!config.allowAuntNephewMarriage && ['aunt', 'nephew'].includes(relationship)) {
          prohibited.push(relationship);
        }
      }

      if (prohibited.includes(relationship)) {
        errors.push({
          code: 'TOO_CLOSELY_RELATED',
          message: `These two people are ${relationship}s — marriage between close relatives is not allowed`,
          severity: 'error',
        });
      }
    }

    // Moderate mode: uncle-niece allowed with cultural justification
    else if (config.consanguinityLevel === 'moderate') {
      const prohibited = ['parent', 'child', 'sibling', 'grandparent', 'grandchild'];

      if (prohibited.includes(relationship)) {
        errors.push({
          code: 'TOO_CLOSELY_RELATED',
          message: `These two people are ${relationship}s — too closely related`,
          severity: 'error',
        });
      } else if (['uncle', 'aunt', 'nephew', 'niece'].includes(relationship)) {
        warnings.push({
          code: 'CONSANGUINEOUS_MARRIAGE',
          message: `These two people are ${relationship} and ${['uncle', 'aunt'].includes(relationship) ? 'niece/nephew' : 'uncle/aunt'} — this type of marriage needs cultural context`,
          canOverride: true,
          requiresMarriagePattern: true,
          requiresJustification: true,
        });
      }
    }

    // Permissive mode: only block immediate family (for historical records)
    else if (config.consanguinityLevel === 'permissive') {
      const prohibited = ['parent', 'child', 'sibling'];

      if (prohibited.includes(relationship)) {
        errors.push({
          code: 'TOO_CLOSELY_RELATED',
          message: `These two people are ${relationship}s — too closely related`,
          severity: 'error',
        });
      } else if (['uncle', 'aunt', 'nephew', 'niece', 'grandparent', 'grandchild'].includes(relationship)) {
        warnings.push({
          code: 'CONSANGUINEOUS_MARRIAGE',
          message: `These two people are related (${relationship}) — please add historical context`,
          canOverride: true,
          requiresMarriagePattern: true,
          requiresJustification: true,
        });
      }
    }

    // First cousins - warning (some cultures allow, some don't)
    if (relationship === 'cousin' && degree === 1 && resolved.structural.removed === 0) {
      warnings.push({
        code: 'FIRST_COUSIN_MARRIAGE',
        message: 'First cousins — some traditions permit this, others don\'t',
        canOverride: true,
      });
    }
  } catch (error) {
    console.warn('Could not resolve relationship for validation:', error);
  }

  // ============================================================================
  // 4. Gotra Rule (Hindu Tradition)
  // ============================================================================

  const shouldEnforceGotra =
    enforceGotraRule ??
    (person1.religion === 'Hindu' || person2.religion === 'Hindu');

  if (shouldEnforceGotra && person1.gotra && person2.gotra) {
    if (person1.gotra.toLowerCase() === person2.gotra.toLowerCase()) {
      errors.push({
        code: 'SAME_GOTRA',
        message: `Same gotra (${person1.gotra}) — traditionally not permitted in Hindu culture`,
        severity: 'error',
      });
    }
  }

  // ============================================================================
  // 5. Inter-Caste/Inter-Religion Warnings
  // ============================================================================

  if (person1.religion && person2.religion && person1.religion !== person2.religion) {
    warnings.push({
      code: 'INTER_RELIGION_MARRIAGE',
      message: `Different religions (${person1.religion} and ${person2.religion}) — informational only`,
      canOverride: true,
    });
  }

  if (person1.caste && person2.caste && person1.caste !== person2.caste) {
    warnings.push({
      code: 'INTER_CASTE_MARRIAGE',
      message: `Different castes (${person1.caste} and ${person2.caste}) — informational only`,
      canOverride: true,
    });
  }

  // ============================================================================
  // Return Result
  // ============================================================================

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get active (non-ended) marriage unions for a person
 * Only returns marriage/partnership unions (excludes parent-child unions)
 */
function getActiveUnions(
  personId: string,
  unions: Union[],
  relationships: Relationship[]
): Union[] {
  const unionIds = relationships
    .filter((r) => r.type === 'PARTNER_IN' && r.fromId === personId)
    .map((r) => r.toId);

  return unions.filter(
    (u) =>
      unionIds.includes(u.unionId) &&
      (u.type === 'marriage' || u.type === 'partnership') &&
      (!u.endDate || new Date(u.endDate) > new Date())
  );
}

/**
 * Check if two persons are already married to each other
 */
export function areAlreadyMarried(
  person1Id: string,
  person2Id: string,
  relationships: Relationship[]
): boolean {
  // Find unions that include both persons
  const person1Unions = relationships
    .filter((r) => r.type === 'PARTNER_IN' && r.fromId === person1Id)
    .map((r) => r.toId);

  const person2Unions = relationships
    .filter((r) => r.type === 'PARTNER_IN' && r.fromId === person2Id)
    .map((r) => r.toId);

  // Check for intersection
  return person1Unions.some((unionId) => person2Unions.includes(unionId));
}

/**
 * Get all marriages for a person
 */
export function getPersonMarriages(
  personId: string,
  unions: Union[],
  relationships: Relationship[]
): Union[] {
  const unionIds = relationships
    .filter((r) => r.type === 'PARTNER_IN' && r.fromId === personId)
    .map((r) => r.toId);

  return unions.filter((u) => unionIds.includes(u.unionId));
}

/**
 * Check if person has multiple marriages
 */
export function hasMultipleMarriages(
  personId: string,
  unions: Union[],
  relationships: Relationship[]
): boolean {
  const marriages = getPersonMarriages(personId, unions, relationships);
  return marriages.length > 1;
}
