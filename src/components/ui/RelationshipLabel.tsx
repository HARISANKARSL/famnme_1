/**
 * RelationshipLabel Component
 *
 * Displays the relationship between two people using Indian kinship terms.
 * Shows Hindi labels for relationships like "chachera bhai", "mausera bhai", etc.
 *
 * Usage:
 * - In PersonCard to show relationship to focus person
 * - In MemberDetailPanel to show relationship context
 * - In relationship selection UI
 *
 * @see services/relationshipResolver.ts
 * @see data/indianKinshipTerms.ts
 */

import { useEffect, useState } from 'react';
import { resolveRelationship, type ResolvedRelationship } from '@/services/relationshipResolver';
import { lookupKinshipTerm, getFallbackTerm, type KinshipTerm } from '@/data/indianKinshipTerms';
import type { Person, Union } from '@/types';
import type { Relationship } from '@/services/elkLayoutService';

// ============================================================================
// Types
// ============================================================================

export interface RelationshipLabelProps {
  /** The person whose relationship we want to display */
  person: Person;

  /** The reference person (e.g., focus person or logged-in user) */
  relativeToPerson: Person;

  /** All persons in the tree (needed for relationship calculation) */
  persons: Person[];

  /** All unions in the tree */
  unions: Union[];

  /** All relationships in the tree */
  relationships: Relationship[];

  /** Locale for kinship terms (default: 'hi-IN') */
  locale?: string;

  /** Display format */
  format?: 'full' | 'compact' | 'badge';

  /** Show confidence indicator for low-confidence matches */
  showConfidence?: boolean;

  /** Custom className */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function RelationshipLabel({
  person,
  relativeToPerson,
  persons,
  unions,
  relationships,
  locale = 'hi-IN',
  format = 'compact',
  showConfidence = true,
  className = '',
}: RelationshipLabelProps) {
  const [resolved, setResolved] = useState<ResolvedRelationship | null>(null);
  const [kinshipTerm, setKinshipTerm] = useState<KinshipTerm | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calculateRelationship = async () => {
      try {
        setLoading(true);

        // Don't show relationship to self
        if (person.personId === relativeToPerson.personId) {
          setResolved(null);
          setKinshipTerm(null);
          return;
        }

        // Resolve structural relationship
        const result = await resolveRelationship(
          relativeToPerson.personId,
          person.personId,
          { persons, unions, relationships }
        );

        setResolved(result);

        // Lookup Indian kinship term
        const term = lookupKinshipTerm(result.structural);
        setKinshipTerm(term);
      } catch (error) {
        console.error('Failed to resolve relationship:', error);
        setResolved(null);
        setKinshipTerm(null);
      } finally {
        setLoading(false);
      }
    };

    calculateRelationship();
  }, [person.personId, relativeToPerson.personId, persons, unions, relationships, locale]);

  // ============================================================================
  // Render
  // ============================================================================

  if (loading) {
    return null; // Don't show loading state for relationships
  }

  if (!resolved || resolved.structural.relationship === 'none') {
    return null; // Not related
  }

  // Get display text
  const displayLabel = kinshipTerm?.label || getFallbackTerm(resolved.structural);
  const englishLabel = kinshipTerm?.englishLabel || getFallbackTerm(resolved.structural);
  const confidence = kinshipTerm?.confidence || 'low';

  // Format-specific rendering
  if (format === 'full') {
    return (
      <div className={`relationship-label-full ${className}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-primary">
            {displayLabel}
          </span>
          {showConfidence && confidence !== 'high' && (
            <span className="text-xs text-gray-400" title="Low confidence match">
              (?)
            </span>
          )}
        </div>
        <div className="text-sm text-gray-600 mt-1">
          {englishLabel}
        </div>
        {kinshipTerm?.description && (
          <div className="text-xs text-gray-400 mt-1">
            {kinshipTerm.description}
          </div>
        )}
      </div>
    );
  }

  if (format === 'badge') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary ${className}`}
        title={englishLabel}
      >
        {displayLabel}
        {showConfidence && confidence !== 'high' && (
          <span className="text-gray-400">(?)</span>
        )}
      </span>
    );
  }

  // Compact format (default)
  return (
    <span
      className={`relationship-label-compact text-sm text-gray-600 ${className}`}
      title={`${englishLabel}${kinshipTerm?.description ? ` - ${kinshipTerm.description}` : ''}`}
    >
      {displayLabel}
      {showConfidence && confidence !== 'high' && (
        <span className="text-gray-400 ml-1">(?)</span>
      )}
    </span>
  );
}

// ============================================================================
// Lineage Badge Component
// ============================================================================

/**
 * Shows lineage indicator (paternal/maternal) as a visual badge
 */
export function LineageBadge({
  lineage,
  className = '',
}: {
  lineage: 'paternal' | 'maternal' | 'mixed' | 'direct';
  className?: string;
}) {
  if (lineage === 'direct' || lineage === 'mixed') {
    return null;
  }

  const colors = {
    paternal: 'bg-blue-100 text-[#2F3E8F]',
    maternal: 'bg-pink-100 text-pink-700',
  };

  const labels = {
    paternal: 'पिता पक्ष (Father\'s side)',
    maternal: 'माता पक्ष (Mother\'s side)',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[lineage]} ${className}`}
      title={labels[lineage]}
    >
      {lineage === 'paternal' ? 'पिता पक्ष' : 'माता पक्ष'}
    </span>
  );
}

// ============================================================================
// Elder/Younger Badge Component
// ============================================================================

/**
 * Shows elder/younger status for same-generation relationships
 */
export function ElderYoungerBadge({
  elderStatus,
  className = '',
}: {
  elderStatus: 'elder' | 'younger' | null;
  className?: string;
}) {
  if (!elderStatus) {
    return null;
  }

  const colors = {
    elder: 'bg-blue-100 text-[#2F3E8F]',
    younger: 'bg-green-100 text-green-700',
  };

  const labels = {
    elder: 'बड़ा (Elder)',
    younger: 'छोटा (Younger)',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[elderStatus]} ${className}`}
      title={labels[elderStatus]}
    >
      {elderStatus === 'elder' ? 'बड़ा' : 'छोटा'}
    </span>
  );
}
