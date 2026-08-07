/**
 * Tests for Relationship Resolver
 *
 * Validates Indian kinship term resolution for various family structures.
 */

import { resolveRelationship, type RelationshipResolverInput } from '../relationshipResolver';
import { lookupKinshipTerm } from '@/data/indianKinshipTerms';
import type { Person, Union } from '@/types';
import type { Relationship } from '../elkLayoutService';

// ============================================================================
// Test Data - Indian Family Structure
// ============================================================================

/**
 * Test family representing typical North Indian joint family:
 *
 * Generation 1:
 *   Dada (Grandfather) ♂ — Union1 — Dadi (Grandmother) ♀
 *
 * Generation 2:
 *   Tau (Elder Uncle) ♂ — Union2 — Tai (Aunt) ♀
 *   |
 *   Father ♂ — Union3 — Mother ♀
 *   |
 *   Chacha (Younger Uncle) ♂ — Union4 — Chachi (Aunt) ♀
 *
 * Generation 3:
 *   From Tau: Tauji's Son (Elder Male Cousin)
 *   From Father: Me (Reference Person), Younger Brother
 *   From Chacha: Chachera Bhai (Paternal Male Cousin)
 */

function createTestFamily(): RelationshipResolverInput {
  const persons: Person[] = [
    // Generation 1 - Grandparents
    {
      personId: 'dada',
      firstName: 'Ramesh',
      lastName: 'Kumar',
      gender: 'male',
      isLiving: false,
      isHomePerson: false,
      createdBy: 'test',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      personId: 'dadi',
      firstName: 'Savita',
      lastName: 'Kumar',
      gender: 'female',
      isLiving: false,
      isHomePerson: false,
      createdBy: 'test',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },

    // Generation 2 - Parents and Uncles
    {
      personId: 'tau',
      firstName: 'Vijay',
      lastName: 'Kumar',
      gender: 'male',
      isLiving: true,
      isHomePerson: false,
      elderStatus: 'elder',
      createdBy: 'test',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      personId: 'father',
      firstName: 'Rajesh',
      lastName: 'Kumar',
      gender: 'male',
      isLiving: true,
      isHomePerson: false,
      createdBy: 'test',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      personId: 'mother',
      firstName: 'Priya',
      lastName: 'Kumar',
      gender: 'female',
      isLiving: true,
      isHomePerson: false,
      createdBy: 'test',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      personId: 'chacha',
      firstName: 'Suresh',
      lastName: 'Kumar',
      gender: 'male',
      isLiving: true,
      isHomePerson: false,
      elderStatus: 'younger',
      createdBy: 'test',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },

    // Generation 3 - Cousins and Me
    {
      personId: 'me',
      firstName: 'Amit',
      lastName: 'Kumar',
      gender: 'male',
      isLiving: true,
      isHomePerson: true,
      birthDate: '1995-06-15',
      createdBy: 'test',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      personId: 'younger-brother',
      firstName: 'Rohit',
      lastName: 'Kumar',
      gender: 'male',
      isLiving: true,
      isHomePerson: false,
      birthDate: '1998-03-20',
      elderStatus: 'younger',
      createdBy: 'test',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      personId: 'chachera-bhai',
      firstName: 'Deepak',
      lastName: 'Kumar',
      gender: 'male',
      isLiving: true,
      isHomePerson: false,
      createdBy: 'test',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ];

  const unions: Union[] = [
    { unionId: 'union1', type: 'marriage', createdAt: '2024-01-01' }, // Dada + Dadi
    { unionId: 'union2', type: 'marriage', createdAt: '2024-01-01' }, // Tau + Tai
    { unionId: 'union3', type: 'marriage', createdAt: '2024-01-01' }, // Father + Mother
    { unionId: 'union4', type: 'marriage', createdAt: '2024-01-01' }, // Chacha + Chachi
  ];

  const relationships: Relationship[] = [
    // Generation 1 couple
    { fromId: 'dada', toId: 'union1', type: 'PARTNER_IN' },
    { fromId: 'dadi', toId: 'union1', type: 'PARTNER_IN' },

    // Generation 1 -> Generation 2
    { fromId: 'union1', toId: 'tau', type: 'HAS_CHILD' },
    { fromId: 'union1', toId: 'father', type: 'HAS_CHILD' },
    { fromId: 'union1', toId: 'chacha', type: 'HAS_CHILD' },

    // Generation 2 couples
    { fromId: 'tau', toId: 'union2', type: 'PARTNER_IN' },
    { fromId: 'father', toId: 'union3', type: 'PARTNER_IN' },
    { fromId: 'mother', toId: 'union3', type: 'PARTNER_IN' },
    { fromId: 'chacha', toId: 'union4', type: 'PARTNER_IN' },

    // Generation 2 -> Generation 3
    { fromId: 'union3', toId: 'me', type: 'HAS_CHILD' },
    { fromId: 'union3', toId: 'younger-brother', type: 'HAS_CHILD' },
    { fromId: 'union4', toId: 'chachera-bhai', type: 'HAS_CHILD' },
  ];

  return { persons, unions, relationships };
}

// ============================================================================
// Tests
// ============================================================================

describe('Relationship Resolver', () => {
  const testFamily = createTestFamily();

  describe('Direct Relationships', () => {
    it('should identify father correctly', async () => {
      const result = await resolveRelationship('me', 'father', testFamily);

      expect(result.structural.relationship).toBe('parent');
      expect(result.structural.gender).toBe('male');
      expect(result.structural.lineage).toBe('paternal');
      expect(result.structural.degree).toBe(0);

      const kinship = lookupKinshipTerm(result.structural, 'hi-IN');
      expect(kinship.label).toBe('पिता');
      expect(kinship.englishLabel).toBe('Father');
      expect(kinship.confidence).toBe('high');
    });

    it('should identify mother correctly', async () => {
      const result = await resolveRelationship('me', 'mother', testFamily);

      expect(result.structural.relationship).toBe('parent');
      expect(result.structural.gender).toBe('female');
      expect(result.structural.lineage).toBe('maternal');

      const kinship = lookupKinshipTerm(result.structural, 'hi-IN');
      expect(kinship.label).toBe('माँ');
      expect(kinship.confidence).toBe('high');
    });

    it('should identify younger brother with elder status', async () => {
      const result = await resolveRelationship('me', 'younger-brother', testFamily);

      expect(result.structural.relationship).toBe('sibling');
      expect(result.structural.gender).toBe('male');
      expect(result.structural.elderStatus).toBe('younger');

      const kinship = lookupKinshipTerm(result.structural, 'hi-IN');
      expect(kinship.label).toBe('छोटा भाई');
      expect(kinship.englishLabel).toBe('Younger brother');
    });
  });

  describe('Grandparents', () => {
    it('should identify paternal grandfather (dada)', async () => {
      const result = await resolveRelationship('me', 'dada', testFamily);

      expect(result.structural.relationship).toBe('grandparent');
      expect(result.structural.gender).toBe('male');
      expect(result.structural.lineage).toBe('paternal');

      const kinship = lookupKinshipTerm(result.structural, 'hi-IN');
      expect(kinship.label).toBe('दादा');
      expect(kinship.englishLabel).toBe('Paternal grandfather');
    });

    it('should identify paternal grandmother (dadi)', async () => {
      const result = await resolveRelationship('me', 'dadi', testFamily);

      expect(result.structural.relationship).toBe('grandparent');
      expect(result.structural.gender).toBe('female');
      expect(result.structural.lineage).toBe('paternal');

      const kinship = lookupKinshipTerm(result.structural, 'hi-IN');
      expect(kinship.label).toBe('दादी');
      expect(kinship.englishLabel).toBe('Paternal grandmother');
    });
  });

  describe('Uncles (Father\'s Side)', () => {
    it('should identify elder uncle (tau)', async () => {
      const result = await resolveRelationship('me', 'tau', testFamily);

      expect(result.structural.relationship).toBe('uncle');
      expect(result.structural.lineage).toBe('paternal');
      expect(result.structural.elderStatus).toBe('elder');

      const kinship = lookupKinshipTerm(result.structural, 'hi-IN');
      expect(kinship.label).toBe('ताऊ');
      expect(kinship.englishLabel).toBe("Father's elder brother");
    });

    it('should identify younger uncle (chacha)', async () => {
      const result = await resolveRelationship('me', 'chacha', testFamily);

      expect(result.structural.relationship).toBe('uncle');
      expect(result.structural.lineage).toBe('paternal');
      expect(result.structural.elderStatus).toBe('younger');

      const kinship = lookupKinshipTerm(result.structural, 'hi-IN');
      expect(kinship.label).toBe('चाचा');
      expect(kinship.englishLabel).toBe("Father's younger brother");
    });
  });

  describe('Cousins (Paternal)', () => {
    it('should identify chachera bhai (paternal male cousin)', async () => {
      const result = await resolveRelationship('me', 'chachera-bhai', testFamily);

      expect(result.structural.relationship).toBe('cousin');
      expect(result.structural.degree).toBe(1); // First cousin
      expect(result.structural.removed).toBe(0); // Same generation
      expect(result.structural.lineage).toBe('paternal');
      expect(result.structural.gender).toBe('male');

      const kinship = lookupKinshipTerm(result.structural, 'hi-IN');
      expect(kinship.label).toBe('चचेरा भाई');
      expect(kinship.englishLabel).toBe('Paternal cousin (male)');
      expect(kinship.confidence).toBe('high');
    });
  });

  describe('Common Ancestor Detection', () => {
    it('should find lowest common ancestor for cousins', async () => {
      const result = await resolveRelationship('me', 'chachera-bhai', testFamily);

      expect(result.commonAncestor).not.toBeNull();
      // LCA should be grandfather or grandmother
      expect(['dada', 'dadi']).toContain(result.commonAncestor?.personId);
    });

    it('should calculate correct path length', async () => {
      const result = await resolveRelationship('me', 'chachera-bhai', testFamily);

      // Me -> Father -> Dada = 2 steps
      // Chachera Bhai -> Chacha -> Dada = 2 steps
      // Total = 4 steps
      expect(result.pathLength).toBe(4);
    });
  });

  describe('No Relationship', () => {
    it('should return "none" for unrelated persons', async () => {
      // Add an unrelated person
      const unrelatedFamily = {
        ...testFamily,
        persons: [
          ...testFamily.persons,
          {
            personId: 'stranger',
            firstName: 'Stranger',
            lastName: 'Person',
            gender: 'male' as const,
            isLiving: true,
            isHomePerson: false,
            createdBy: 'test',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
        ],
      };

      const result = await resolveRelationship('me', 'stranger', unrelatedFamily);

      expect(result.structural.relationship).toBe('none');
      expect(result.commonAncestor).toBeNull();
    });
  });
});

// ============================================================================
// Manual Test Runner
// ============================================================================

async function manualTest() {
  console.log('🧪 Running Relationship Resolver Manual Test\n');

  const testFamily = createTestFamily();

  const tests = [
    { from: 'me', to: 'father', expected: 'पिता (Father)' },
    { from: 'me', to: 'mother', expected: 'माँ (Mother)' },
    { from: 'me', to: 'dada', expected: 'दादा (Paternal grandfather)' },
    { from: 'me', to: 'tau', expected: 'ताऊ (Elder uncle)' },
    { from: 'me', to: 'chacha', expected: 'चाचा (Younger uncle)' },
    { from: 'me', to: 'chachera-bhai', expected: 'चचेरा भाई (Paternal male cousin)' },
    { from: 'me', to: 'younger-brother', expected: 'छोटा भाई (Younger brother)' },
  ];

  for (const test of tests) {
    try {
      const result = await resolveRelationship(test.from, test.to, testFamily);
      const kinship = lookupKinshipTerm(result.structural, 'hi-IN');

      console.log(`✅ ${test.to}:`);
      console.log(`   Structural: ${result.structural.relationship}`);
      console.log(`   Kinship: ${kinship.label} (${kinship.englishLabel})`);
      console.log(`   Confidence: ${kinship.confidence}`);
      console.log(`   Lineage: ${result.structural.lineage}`);
      console.log('');
    } catch (error) {
      console.error(`❌ ${test.to}:`, error);
    }
  }

  console.log('✅ Manual tests complete!');
}

// Run manual test if executed directly
if (require.main === module) {
  manualTest().catch(console.error);
}
