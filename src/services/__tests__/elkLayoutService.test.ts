/**
 * Tests for ELK Layout Service
 *
 * Validates that the ELK layout engine produces correct positions
 * for various family tree scenarios.
 */

import { calculateFamilyTreeLayout } from '../elkLayoutService';
import type { Person, Union } from '@/types';
import type { Relationship } from '../elkLayoutService';

// ============================================================================
// Test Data
// ============================================================================

/**
 * Simple nuclear family:
 * John ♂ — Union1 — Jane ♀
 *           |
 *         Alice ♀
 */
const SIMPLE_FAMILY = {
  persons: [
    {
      personId: 'john',
      firstName: 'John',
      lastName: 'Doe',
      gender: 'male',
      isLiving: true,
      isHomePerson: false,
      createdBy: 'test',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      personId: 'jane',
      firstName: 'Jane',
      lastName: 'Doe',
      gender: 'female',
      isLiving: true,
      isHomePerson: false,
      createdBy: 'test',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      personId: 'alice',
      firstName: 'Alice',
      lastName: 'Doe',
      gender: 'female',
      isLiving: true,
      isHomePerson: true,
      createdBy: 'test',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ] as Person[],

  unions: [
    {
      unionId: 'union1',
      type: 'marriage' as const,
    },
  ] as Union[],

  relationships: [
    { fromId: 'john', toId: 'union1', type: 'PARTNER_IN' as const },
    { fromId: 'jane', toId: 'union1', type: 'PARTNER_IN' as const },
    { fromId: 'union1', toId: 'alice', type: 'HAS_CHILD' as const },
  ] as Relationship[],
};

/**
 * Three generations:
 * Grandpa ♂ — Union1 — Grandma ♀
 *               |
 *       +-------+-------+
 *       |               |
 *     Dad ♂ — Union2 — Mom ♀
 *               |
 *             Son ♂
 */
const THREE_GENERATIONS = {
  persons: [
    {
      personId: 'grandpa',
      firstName: 'Grandpa',
      lastName: 'Smith',
      gender: 'male',
      isLiving: false,
      isHomePerson: false,
      createdBy: 'test',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      personId: 'grandma',
      firstName: 'Grandma',
      lastName: 'Smith',
      gender: 'female',
      isLiving: false,
      isHomePerson: false,
      createdBy: 'test',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      personId: 'dad',
      firstName: 'Dad',
      lastName: 'Smith',
      gender: 'male',
      isLiving: true,
      isHomePerson: false,
      createdBy: 'test',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      personId: 'mom',
      firstName: 'Mom',
      lastName: 'Smith',
      gender: 'female',
      isLiving: true,
      isHomePerson: false,
      createdBy: 'test',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      personId: 'son',
      firstName: 'Son',
      lastName: 'Smith',
      gender: 'male',
      isLiving: true,
      isHomePerson: true,
      createdBy: 'test',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ] as Person[],

  unions: [
    {
      unionId: 'union1',
      type: 'marriage' as const,
    },
    {
      unionId: 'union2',
      type: 'marriage' as const,
    },
  ] as Union[],

  relationships: [
    // Grandparents
    { fromId: 'grandpa', toId: 'union1', type: 'PARTNER_IN' as const },
    { fromId: 'grandma', toId: 'union1', type: 'PARTNER_IN' as const },
    { fromId: 'union1', toId: 'dad', type: 'HAS_CHILD' as const },

    // Parents
    { fromId: 'dad', toId: 'union2', type: 'PARTNER_IN' as const },
    { fromId: 'mom', toId: 'union2', type: 'PARTNER_IN' as const },
    { fromId: 'union2', toId: 'son', type: 'HAS_CHILD' as const },
  ] as Relationship[],
};

// ============================================================================
// Tests
// ============================================================================

describe('ELK Layout Service', () => {
  describe('calculateFamilyTreeLayout', () => {
    it('should calculate positions for simple nuclear family', async () => {
      const result = await calculateFamilyTreeLayout(SIMPLE_FAMILY);

      // All nodes should have positions
      expect(result.positions.size).toBe(4); // 3 persons + 1 union
      expect(result.positions.has('john')).toBe(true);
      expect(result.positions.has('jane')).toBe(true);
      expect(result.positions.has('alice')).toBe(true);
      expect(result.positions.has('union1')).toBe(true);

      // Positions should be valid numbers
      const johnPos = result.positions.get('john')!;
      expect(johnPos.x).toBeGreaterThanOrEqual(0);
      expect(johnPos.y).toBeGreaterThanOrEqual(0);

      // Child should be below parents
      const alicePos = result.positions.get('alice')!;
      expect(alicePos.y).toBeGreaterThan(johnPos.y);
    });

    it('should calculate positions for three generations', async () => {
      const result = await calculateFamilyTreeLayout(THREE_GENERATIONS);

      // All nodes should have positions
      expect(result.positions.size).toBe(7); // 5 persons + 2 unions

      const grandpaPos = result.positions.get('grandpa')!;
      const dadPos = result.positions.get('dad')!;
      const sonPos = result.positions.get('son')!;

      // Verify generational ordering (Y increases down)
      expect(dadPos.y).toBeGreaterThan(grandpaPos.y);
      expect(sonPos.y).toBeGreaterThan(dadPos.y);
    });

    it('should calculate bounds correctly', async () => {
      const result = await calculateFamilyTreeLayout(SIMPLE_FAMILY);

      expect(result.bounds.width).toBeGreaterThan(0);
      expect(result.bounds.height).toBeGreaterThan(0);
      expect(result.bounds.minX).toBeLessThanOrEqual(result.bounds.maxX);
      expect(result.bounds.minY).toBeLessThanOrEqual(result.bounds.maxY);
    });

    it('should position spouses side-by-side', async () => {
      const result = await calculateFamilyTreeLayout(SIMPLE_FAMILY);

      const johnPos = result.positions.get('john')!;
      const janePos = result.positions.get('jane')!;

      // Spouses should be at approximately the same Y level
      const Y_TOLERANCE = 50; // Allow some vertical variation
      expect(Math.abs(johnPos.y - janePos.y)).toBeLessThan(Y_TOLERANCE);

      // Spouses should be horizontally separated
      expect(Math.abs(johnPos.x - janePos.x)).toBeGreaterThan(0);
    });

    it('should position union between spouses', async () => {
      const result = await calculateFamilyTreeLayout(SIMPLE_FAMILY);

      const johnPos = result.positions.get('john')!;
      const janePos = result.positions.get('jane')!;
      const unionPos = result.positions.get('union1')!;

      // Union X should be between spouses
      const leftX = Math.min(johnPos.x, janePos.x);
      const rightX = Math.max(johnPos.x, janePos.x);

      expect(unionPos.x).toBeGreaterThanOrEqual(leftX);
      expect(unionPos.x).toBeLessThanOrEqual(rightX + 180); // Allow for person width
    });

    it('should handle empty input', async () => {
      const result = await calculateFamilyTreeLayout({
        persons: [],
        unions: [],
        relationships: [],
      });

      expect(result.positions.size).toBe(0);
      expect(result.bounds.width).toBe(0);
      expect(result.bounds.height).toBe(0);
    });

    it('should handle single person', async () => {
      const result = await calculateFamilyTreeLayout({
        persons: [
          {
            personId: 'solo',
            firstName: 'Solo',
            lastName: 'Person',
            gender: 'male',
            isLiving: true,
            isHomePerson: true,
            createdBy: 'test',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          } as Person,
        ],
        unions: [],
        relationships: [],
      });

      expect(result.positions.size).toBe(1);
      expect(result.positions.has('solo')).toBe(true);
    });
  });
});

// ============================================================================
// Manual Test Runner (for development)
// ============================================================================

/**
 * Run this file directly to see layout output
 * Usage: npx tsx src/services/__tests__/elkLayoutService.test.ts
 */
async function manualTest() {
  console.log('🧪 Running ELK Layout Manual Test\n');

  console.log('📊 Test 1: Simple Nuclear Family');
  const result1 = await calculateFamilyTreeLayout(SIMPLE_FAMILY);
  console.log('Positions:', Object.fromEntries(result1.positions));
  console.log('Bounds:', result1.bounds);
  console.log('');

  console.log('📊 Test 2: Three Generations');
  const result2 = await calculateFamilyTreeLayout(THREE_GENERATIONS);
  console.log('Positions:', Object.fromEntries(result2.positions));
  console.log('Bounds:', result2.bounds);
  console.log('');

  console.log('✅ Manual tests complete!');
}

// Run manual test if executed directly
if (require.main === module) {
  manualTest().catch(console.error);
}
