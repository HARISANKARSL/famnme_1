/**
 * Relationship Label Service
 *
 * Batch-computes relationship labels for all persons relative to the home person.
 * Labels include localized kinship terms and English translations for display on edges.
 * Supports multiple Indian languages via the kinship registry.
 *
 * @see relationshipResolver.ts - structural relationship computation
 * @see indianKinshipTerms.ts - kinship term lookup
 * @see data/kinship/ - multi-language kinship patterns
 */

import { resolveRelationship, type RelationshipResolverInput } from './relationshipResolver';
import { lookupKinshipTerm, getFallbackTerm } from '@/data/indianKinshipTerms';
import type { KinshipPattern } from '@/data/kinship';

// ============================================================================
// Types
// ============================================================================

export interface RelationshipLabelEntry {
  englishLabel: string;
  /** @deprecated Use localizedLabel instead */
  hindiLabel: string;
  localizedLabel: string;
  structuralType: string;
  lineage: 'paternal' | 'maternal' | 'mixed' | 'direct';
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Compute relationship labels for all persons relative to the home person.
 *
 * @param homePersonId - The ID of the home/primary person
 * @param data - Family tree data (persons, unions, relationships)
 * @param patterns - Optional locale-specific kinship patterns (defaults to Hindi)
 * @returns Map of personId -> RelationshipLabelEntry
 */
export async function computeRelationshipLabels(
  homePersonId: string,
  data: RelationshipResolverInput,
  patterns?: KinshipPattern[]
): Promise<Map<string, RelationshipLabelEntry>> {
  const labels = new Map<string, RelationshipLabelEntry>();

  // Home person gets "Self"
  labels.set(homePersonId, {
    englishLabel: 'Self',
    hindiLabel: 'स्वयं',
    localizedLabel: 'स्वयं',
    structuralType: 'self',
    lineage: 'direct',
  });

  // Resolve all other persons in parallel
  const otherPersons = data.persons.filter(
    (p) => p.personId !== homePersonId && !p.personId.startsWith('placeholder-')
  );

  const results = await Promise.allSettled(
    otherPersons.map(async (person) => {
      const resolved = await resolveRelationship(homePersonId, person.personId, data);
      return { person, resolved };
    })
  );

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;

    const { person, resolved } = result.value;
    const { structural } = resolved;

    // Skip unrelated persons
    if (structural.relationship === 'none') continue;

    // Look up kinship term using provided patterns (or default Hindi)
    const kinshipTerm = lookupKinshipTerm(structural, patterns);
    const englishLabel = kinshipTerm?.englishLabel || getFallbackTerm(structural);
    const localizedLabel = kinshipTerm?.label || englishLabel;

    labels.set(person.personId, {
      englishLabel,
      hindiLabel: localizedLabel, // backward compat
      localizedLabel,
      structuralType: structural.relationship,
      lineage: structural.lineage,
    });
  }

  return labels;
}
