/**
 * Shared types for multi-language kinship term system
 */

import type { StructuralRelationship } from '@/services/relationshipResolver';

export interface KinshipTerm {
  label: string;           // Display label in native script
  englishLabel: string;    // English translation
  romanization?: string;   // Romanized pronunciation
  confidence: 'high' | 'medium' | 'low';
  description?: string;    // Additional context
}

export interface KinshipPattern {
  match: Partial<StructuralRelationship>;
  term: KinshipTerm;
}

/**
 * Group labels for edge rendering (children groups and parent pairs)
 */
export interface GroupLabelSet {
  childrenGroupLabels: Record<string, { localized: string; english: string }>;
  parentPairLabels: Record<string, { localized: string; english: string }>;
}

export interface LocaleConfig {
  code: string;
  name: string;          // English name
  nativeName: string;    // Name in native script
  patterns: KinshipPattern[];
  groupLabels: GroupLabelSet;
}
