/**
 * Indian Kinship Terms Mapping Table
 *
 * Maps structural relationships to culturally-appropriate Indian kinship terms.
 * Supports Hindi terms with distinctions for paternal/maternal lineage and gender.
 *
 * Key Features:
 * - Paternal vs Maternal lineage (chachera vs mausera)
 * - Elder vs Younger distinction (bhaiya vs younger brother)
 * - Gender-specific terms
 * - Multi-language support (currently Hindi, extensible to Tamil, Telugu, etc.)
 *
 * @see references/new file-ancestry.md - Indian kinship system explanation
 */

import type { StructuralRelationship } from '@/services/relationshipResolver';

// ============================================================================
// Types
// ============================================================================

export interface KinshipTerm {
  label: string;           // Display label (e.g., "चचेरा भाई")
  englishLabel: string;    // English translation
  romanization?: string;   // Romanized pronunciation (e.g., "chachera bhai")
  confidence: 'high' | 'medium' | 'low';
  description?: string;    // Additional context
}

export interface KinshipPattern {
  match: Partial<StructuralRelationship>;
  term: KinshipTerm;
}

// ============================================================================
// Hindi Kinship Terms (Indian North)
// ============================================================================

export const HINDI_KINSHIP_TERMS: KinshipPattern[] = [
  // ==============================
  // Direct Family (Nuclear)
  // ==============================

  {
    match: {
      relationship: 'parent',
      lineage: 'paternal',
      gender: 'male',
    },
    term: {
      label: 'पिता',
      englishLabel: 'Father',
      romanization: 'pita',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'parent',
      lineage: 'maternal',
      gender: 'female',
    },
    term: {
      label: 'माता',
      englishLabel: 'Mother',
      romanization: 'mata',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'child',
      gender: 'male',
    },
    term: {
      label: 'बेटा',
      englishLabel: 'Son',
      romanization: 'beta',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'child',
      gender: 'female',
    },
    term: {
      label: 'बेटी',
      englishLabel: 'Daughter',
      romanization: 'beti',
      confidence: 'high',
    },
  },

  // ==============================
  // Siblings
  // ==============================

  {
    match: {
      relationship: 'sibling',
      gender: 'male',
      elderStatus: 'elder',
    },
    term: {
      label: 'भाई',
      englishLabel: 'Elder Brother',
      romanization: 'bhaiya',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'sibling',
      gender: 'male',
      elderStatus: 'younger',
    },
    term: {
      label: 'छोटा भाई',
      englishLabel: 'Younger Brother',
      romanization: 'chhota bhai',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'sibling',
      gender: 'female',
      elderStatus: 'elder',
    },
    term: {
      label: 'दीदी',
      englishLabel: 'Elder Sister',
      romanization: 'didi',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'sibling',
      gender: 'female',
      elderStatus: 'younger',
    },
    term: {
      label: 'छोटी बहन',
      englishLabel: 'Younger Sister',
      romanization: 'chhoti bahan',
      confidence: 'high',
    },
  },

  // ==============================
  // Paternal Uncles & Aunts
  // ==============================

  {
    match: {
      relationship: 'uncle',
      lineage: 'paternal',
      elderStatus: 'elder',
    },
    term: {
      label: 'ताऊ',
      englishLabel: "Father's Elder Brother",
      romanization: 'tau',
      confidence: 'high',
      description: "Paternal uncle (father's elder brother)",
    },
  },

  {
    match: {
      relationship: 'uncle',
      lineage: 'paternal',
      elderStatus: 'younger',
    },
    term: {
      label: 'चाचा',
      englishLabel: "Father's Younger Brother",
      romanization: 'chacha',
      confidence: 'high',
      description: "Paternal uncle (father's younger brother)",
    },
  },

  {
    match: {
      relationship: 'aunt',
      lineage: 'paternal',
    },
    term: {
      label: 'बुआ',
      englishLabel: "Father's Sister",
      romanization: 'bua',
      confidence: 'high',
      description: "Paternal aunt (father's sister)",
    },
  },

  // Spouses of paternal uncles/aunts
  {
    match: {
      relationship: 'uncle',
      lineage: 'paternal',
      // Wife of tau
    },
    term: {
      label: 'ताई',
      englishLabel: "Father's Elder Brother's Wife",
      romanization: 'tai',
      confidence: 'medium',
    },
  },

  {
    match: {
      relationship: 'uncle',
      lineage: 'paternal',
      // Wife of chacha
    },
    term: {
      label: 'चाची',
      englishLabel: "Father's Younger Brother's Wife",
      romanization: 'chachi',
      confidence: 'medium',
    },
  },

  // ==============================
  // Maternal Uncles & Aunts
  // ==============================

  {
    match: {
      relationship: 'uncle',
      lineage: 'maternal',
      gender: 'male',
    },
    term: {
      label: 'मामा',
      englishLabel: "Mother's Brother",
      romanization: 'mama',
      confidence: 'high',
      description: "Maternal uncle (mother's brother)",
    },
  },

  {
    match: {
      relationship: 'aunt',
      lineage: 'maternal',
      gender: 'female',
    },
    term: {
      label: 'मौसी',
      englishLabel: "Mother's Sister",
      romanization: 'mausi',
      confidence: 'high',
      description: "Maternal aunt (mother's sister)",
    },
  },

  // Spouses of maternal uncles/aunts
  {
    match: {
      relationship: 'aunt',
      lineage: 'maternal',
      // Wife of mama
    },
    term: {
      label: 'मामी',
      englishLabel: "Mother's Brother's Wife",
      romanization: 'mami',
      confidence: 'medium',
    },
  },

  // ==============================
  // Paternal Cousins (Chachera/Phuphera)
  // ==============================

  {
    match: {
      relationship: 'cousin',
      degree: 1,
      removed: 0,
      lineage: 'paternal',
      gender: 'male',
    },
    term: {
      label: 'चचेरा भाई',
      englishLabel: 'Paternal Cousin (Male)',
      romanization: 'chachera bhai',
      confidence: 'high',
      description: "Son of father's brother",
    },
  },

  {
    match: {
      relationship: 'cousin',
      degree: 1,
      removed: 0,
      lineage: 'paternal',
      gender: 'female',
    },
    term: {
      label: 'चचेरी बहन',
      englishLabel: 'Paternal Cousin (Female)',
      romanization: 'chacheri bahan',
      confidence: 'high',
      description: "Daughter of father's brother",
    },
  },

  // Father's sister's children (Phuphera)
  {
    match: {
      relationship: 'cousin',
      degree: 1,
      removed: 0,
      lineage: 'paternal',
      gender: 'male',
      // From father's sister
    },
    term: {
      label: 'फूफेरा भाई',
      englishLabel: "Father's Sister's Son",
      romanization: 'phuphera bhai',
      confidence: 'medium',
      description: "Son of father's sister",
    },
  },

  {
    match: {
      relationship: 'cousin',
      degree: 1,
      removed: 0,
      lineage: 'paternal',
      gender: 'female',
      // From father's sister
    },
    term: {
      label: 'फूफेरी बहन',
      englishLabel: "Father's Sister's Daughter",
      romanization: 'phupheri bahan',
      confidence: 'medium',
      description: "Daughter of father's sister",
    },
  },

  // ==============================
  // Maternal Cousins (Mausera/Mamere)
  // ==============================

  {
    match: {
      relationship: 'cousin',
      degree: 1,
      removed: 0,
      lineage: 'maternal',
      gender: 'male',
    },
    term: {
      label: 'ममेरा भाई',
      englishLabel: 'Maternal Cousin (Male)',
      romanization: 'mausera bhai',
      confidence: 'high',
      description: "Son of mother's sibling",
    },
  },

  {
    match: {
      relationship: 'cousin',
      degree: 1,
      removed: 0,
      lineage: 'maternal',
      gender: 'female',
    },
    term: {
      label: 'ममेरी बहन',
      englishLabel: 'Maternal Cousin (Female)',
      romanization: 'mauseri bahan',
      confidence: 'high',
      description: "Daughter of mother's sibling",
    },
  },

  // ==============================
  // Grandparents
  // ==============================

  {
    match: {
      relationship: 'grandparent',
      lineage: 'paternal',
      gender: 'male',
    },
    term: {
      label: 'दादा',
      englishLabel: 'Paternal Grandfather',
      romanization: 'dada',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'grandparent',
      lineage: 'paternal',
      gender: 'female',
    },
    term: {
      label: 'दादी',
      englishLabel: 'Paternal Grandmother',
      romanization: 'dadi',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'grandparent',
      lineage: 'maternal',
      gender: 'male',
    },
    term: {
      label: 'नाना',
      englishLabel: 'Maternal Grandfather',
      romanization: 'nana',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'grandparent',
      lineage: 'maternal',
      gender: 'female',
    },
    term: {
      label: 'नानी',
      englishLabel: 'Maternal Grandmother',
      romanization: 'nani',
      confidence: 'high',
    },
  },

  // ==============================
  // Grandchildren
  // ==============================

  {
    match: {
      relationship: 'grandchild',
      gender: 'male',
    },
    term: {
      label: 'पोता',
      englishLabel: 'Grandson',
      romanization: 'pota',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'grandchild',
      gender: 'female',
    },
    term: {
      label: 'पोती',
      englishLabel: 'Granddaughter',
      romanization: 'poti',
      confidence: 'high',
    },
  },

  // ==============================
  // Nephews & Nieces
  // ==============================

  {
    match: {
      relationship: 'nephew',
      gender: 'male',
    },
    term: {
      label: 'भतीजा',
      englishLabel: "Brother's Son",
      romanization: 'bhatija',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'niece',
      gender: 'female',
    },
    term: {
      label: 'भतीजी',
      englishLabel: "Brother's Daughter",
      romanization: 'bhatiji',
      confidence: 'high',
    },
  },

  // ==============================
  // Spouse
  // ==============================

  {
    match: {
      relationship: 'spouse',
      gender: 'male',
    },
    term: {
      label: 'पति',
      englishLabel: 'Husband',
      romanization: 'pati',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'spouse',
      gender: 'female',
    },
    term: {
      label: 'पत्नी',
      englishLabel: 'Wife',
      romanization: 'patni',
      confidence: 'high',
    },
  },

  // ==============================
  // Second Cousins & Higher Degrees
  // ==============================

  {
    match: {
      relationship: 'cousin',
      degree: 2,
      removed: 0,
      gender: 'male',
    },
    term: {
      label: 'दूर के चचेरे भाई',
      englishLabel: 'Second Cousin (Male)',
      romanization: 'door ke chachere bhai',
      confidence: 'low',
      description: "Distant paternal cousin",
    },
  },

  {
    match: {
      relationship: 'cousin',
      degree: 2,
      removed: 0,
      gender: 'female',
    },
    term: {
      label: 'दूर की चचेरी बहन',
      englishLabel: 'Second Cousin (Female)',
      romanization: 'door ki chacheri bahan',
      confidence: 'low',
      description: "Distant paternal cousin",
    },
  },

  // ==============================
  // Guardian / Step-Parent Terms
  // ==============================

  {
    match: {
      relationship: 'step-parent',
      gender: 'male',
    },
    term: {
      label: 'सौतेले पिता',
      englishLabel: 'Step-Father',
      romanization: 'sautele pita',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'step-parent',
      gender: 'female',
    },
    term: {
      label: 'सौतेली माता',
      englishLabel: 'Step-Mother',
      romanization: 'sauteli mata',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'step-child',
      gender: 'male',
    },
    term: {
      label: 'सौतेला बेटा',
      englishLabel: 'Step-Son',
      romanization: 'sautela beta',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'step-child',
      gender: 'female',
    },
    term: {
      label: 'सौतेली बेटी',
      englishLabel: 'Step-Daughter',
      romanization: 'sauteli beti',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'adoptive-parent',
      gender: 'male',
    },
    term: {
      label: 'दत्तक पिता',
      englishLabel: 'Adoptive Father',
      romanization: 'dattak pita',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'adoptive-parent',
      gender: 'female',
    },
    term: {
      label: 'दत्तक माता',
      englishLabel: 'Adoptive Mother',
      romanization: 'dattak mata',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'adopted-child',
      gender: 'male',
    },
    term: {
      label: 'दत्तक पुत्र',
      englishLabel: 'Adopted Son',
      romanization: 'dattak putra',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'adopted-child',
      gender: 'female',
    },
    term: {
      label: 'दत्तक पुत्री',
      englishLabel: 'Adopted Daughter',
      romanization: 'dattak putri',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'foster-parent',
      gender: 'male',
    },
    term: {
      label: 'पालक पिता',
      englishLabel: 'Foster Father',
      romanization: 'palak pita',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'foster-parent',
      gender: 'female',
    },
    term: {
      label: 'पालक माता',
      englishLabel: 'Foster Mother',
      romanization: 'palak mata',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'guardian',
      gender: 'male',
    },
    term: {
      label: 'अभिभावक',
      englishLabel: 'Guardian (Male)',
      romanization: 'abhivhavak',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'guardian',
      gender: 'female',
    },
    term: {
      label: 'अभिभाविका',
      englishLabel: 'Guardian (Female)',
      romanization: 'abhivhavika',
      confidence: 'high',
    },
  },

  // ==============================
  // Non-Binary / Gender-Neutral Terms (English only, as Hindi lacks equivalents)
  // ==============================

  {
    match: {
      relationship: 'parent',
      gender: 'other',
    },
    term: {
      label: 'Parent',
      englishLabel: 'Parent',
      confidence: 'medium',
      description: 'Gender-neutral parent term',
    },
  },

  {
    match: {
      relationship: 'child',
      gender: 'other',
    },
    term: {
      label: 'Child',
      englishLabel: 'Child',
      confidence: 'medium',
      description: 'Gender-neutral child term',
    },
  },

  {
    match: {
      relationship: 'sibling',
      gender: 'other',
    },
    term: {
      label: 'Sibling',
      englishLabel: 'Sibling',
      confidence: 'medium',
      description: 'Gender-neutral sibling term',
    },
  },

  {
    match: {
      relationship: 'grandparent',
      gender: 'other',
    },
    term: {
      label: 'Grandparent',
      englishLabel: 'Grandparent',
      confidence: 'medium',
      description: 'Gender-neutral grandparent term',
    },
  },

  {
    match: {
      relationship: 'grandchild',
      gender: 'other',
    },
    term: {
      label: 'Grandchild',
      englishLabel: 'Grandchild',
      confidence: 'medium',
      description: 'Gender-neutral grandchild term',
    },
  },

  {
    match: {
      relationship: 'spouse',
      gender: 'other',
    },
    term: {
      label: 'Spouse',
      englishLabel: 'Spouse',
      confidence: 'medium',
      description: 'Gender-neutral spouse term',
    },
  },

  {
    match: {
      relationship: 'step-parent',
      gender: 'other',
    },
    term: {
      label: 'Step-Parent',
      englishLabel: 'Step-Parent',
      confidence: 'medium',
      description: 'Gender-neutral step-parent term',
    },
  },

  {
    match: {
      relationship: 'step-child',
      gender: 'other',
    },
    term: {
      label: 'Step-Child',
      englishLabel: 'Step-Child',
      confidence: 'medium',
      description: 'Gender-neutral step-child term',
    },
  },

  {
    match: {
      relationship: 'guardian',
      gender: 'other',
    },
    term: {
      label: 'Guardian',
      englishLabel: 'Guardian',
      confidence: 'medium',
      description: 'Gender-neutral guardian term',
    },
  },
];

// ============================================================================
// Lookup Function
// ============================================================================

/**
 * Find the best matching kinship term for a structural relationship.
 *
 * @param structural - The calculated structural relationship
 * @param patterns - Optional patterns array to search (defaults to HINDI_KINSHIP_TERMS)
 * @returns The matching kinship term or null if no match
 */
export function lookupKinshipTerm(
  structural: StructuralRelationship,
  patterns?: KinshipPattern[]
): KinshipTerm | null {
  const patternsToSearch = patterns || HINDI_KINSHIP_TERMS;

  // Find matching patterns
  const matches = patternsToSearch.filter(pattern =>
    matchesPattern(structural, pattern.match)
  );

  if (matches.length === 0) {
    return null;
  }

  // Return the most specific match (highest number of matching fields)
  const bestMatch = matches.reduce((best, current) => {
    const bestScore = countMatchingFields(structural, best.match);
    const currentScore = countMatchingFields(structural, current.match);
    return currentScore > bestScore ? current : best;
  });

  return bestMatch.term;
}

/**
 * Check if structural relationship matches the pattern
 */
function matchesPattern(
  structural: StructuralRelationship,
  pattern: Partial<StructuralRelationship>
): boolean {
  for (const key in pattern) {
    const patternValue = pattern[key as keyof StructuralRelationship];
    const structuralValue = structural[key as keyof StructuralRelationship];

    if (patternValue !== undefined && patternValue !== structuralValue) {
      return false;
    }
  }
  return true;
}

/**
 * Count how many fields match in the pattern
 */
function countMatchingFields(
  structural: StructuralRelationship,
  pattern: Partial<StructuralRelationship>
): number {
  let count = 0;
  for (const key in pattern) {
    if (pattern[key as keyof StructuralRelationship] === structural[key as keyof StructuralRelationship]) {
      count++;
    }
  }
  return count;
}

/**
 * Get fallback English term if no Indian term found
 * Supports gender-neutral terms for non-binary individuals
 */
export function getFallbackTerm(structural: StructuralRelationship): string {
  const rel = structural.relationship;
  const gender = structural.gender;

  // Gender-specific term helper
  const genderTerm = (male: string, female: string, neutral: string): string => {
    if (gender === 'male') return male;
    if (gender === 'female') return female;
    return neutral; // 'other' or undefined
  };

  const baseTerms: Record<string, string> = {
    // Core family
    parent: genderTerm('Father', 'Mother', 'Parent'),
    child: genderTerm('Son', 'Daughter', 'Child'),
    sibling: genderTerm('Brother', 'Sister', 'Sibling'),
    cousin: 'Cousin',
    uncle: 'Uncle',
    aunt: 'Aunt',
    nephew: 'Nephew',
    niece: 'Niece',
    grandparent: genderTerm('Grandfather', 'Grandmother', 'Grandparent'),
    grandchild: genderTerm('Grandson', 'Granddaughter', 'Grandchild'),
    spouse: genderTerm('Husband', 'Wife', 'Spouse'),

    // Guardian/Adoption relationships
    'step-parent': genderTerm('Step-Father', 'Step-Mother', 'Step-Parent'),
    'step-child': genderTerm('Step-Son', 'Step-Daughter', 'Step-Child'),
    'adoptive-parent': genderTerm('Adoptive Father', 'Adoptive Mother', 'Adoptive Parent'),
    'adopted-child': genderTerm('Adopted Son', 'Adopted Daughter', 'Adopted Child'),
    'foster-parent': genderTerm('Foster Father', 'Foster Mother', 'Foster Parent'),
    'foster-child': genderTerm('Foster Son', 'Foster Daughter', 'Foster Child'),
    guardian: 'Legal Guardian',
    ward: 'Ward',

    none: 'Not related',
  };

  let term = baseTerms[rel] || 'Relative';

  // Add degree/removed modifiers for cousins
  if (rel === 'cousin' && structural.degree > 0) {
    const degrees = ['First', 'Second', 'Third', 'Fourth', 'Fifth'];
    term = `${degrees[structural.degree - 1] || 'Distant'} ${term}`;

    if (structural.removed > 0) {
      term += ` (${structural.removed}x removed)`;
    }
  }

  return term;
}
