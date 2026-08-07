/**
 * GenerationTierLabel — Ancestry-style italic label above each generation row
 * e.g. "Abhilash's parents", "Abhilash's grandparents"
 */

import { LAYOUT_CONSTANTS } from '@/constants/layoutConstants';
import type { Position } from '@/services/elkLayoutService';
import type { RelationshipLabelEntry } from '@/services/relationshipLabelService';
import type { Person } from '@/types';

export interface GenerationTier {
  label: string;
  centerX: number;
  y: number; // placed above the row
}

/**
 * Derive generation tier labels from person positions and relationship labels.
 *
 * Groups persons by their Y coordinate (generation row), determines the
 * dominant structural type per row, and generates a label.
 */
export function computeGenerationTiers(
  persons: Person[],
  positions: Map<string, Position>,
  relationshipLabels: Map<string, RelationshipLabelEntry>,
  focusPersonName: string,
  _personHeight: number = LAYOUT_CONSTANTS.PERSON_HEIGHT,
): GenerationTier[] {
  if (persons.length === 0 || positions.size === 0) return [];

  // Group persons by Y coordinate (within a tolerance of 20px = same generation)
  const yTolerance = 20;
  const rows: { y: number; persons: { person: Person; pos: Position }[] }[] = [];

  for (const person of persons) {
    const pos = positions.get(person.personId);
    if (!pos) continue;
    // Skip placeholders
    if (person.personId.startsWith('placeholder-')) continue;

    let found = false;
    for (const row of rows) {
      if (Math.abs(row.y - pos.y) < yTolerance) {
        row.persons.push({ person, pos });
        found = true;
        break;
      }
    }
    if (!found) {
      rows.push({ y: pos.y, persons: [{ person, pos }] });
    }
  }

  // Sort rows by Y (top to bottom)
  rows.sort((a, b) => a.y - b.y);

  const tiers: GenerationTier[] = [];

  for (const row of rows) {
    // Determine the dominant structural type in this row
    const typeCounts = new Map<string, number>();
    for (const { person } of row.persons) {
      const label = relationshipLabels.get(person.personId);
      if (label) {
        const type = label.structuralType;
        typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
      }
    }

    // Find the most common structural type
    let dominantType = '';
    let maxCount = 0;
    for (const [type, count] of typeCounts) {
      if (count > maxCount) {
        dominantType = type;
        maxCount = count;
      }
    }

    // Generate label based on structural type
    const tierLabel = getTierLabel(dominantType, focusPersonName);
    if (!tierLabel) continue;

    // Calculate horizontal center and Y position (above the row)
    const minX = Math.min(...row.persons.map(p => p.pos.x));
    const maxX = Math.max(...row.persons.map(p => p.pos.x)) + LAYOUT_CONSTANTS.PERSON_WIDTH;
    const centerX = (minX + maxX) / 2;

    tiers.push({
      label: tierLabel,
      centerX,
      y: row.y - 28, // 28px above the top of the row
    });
  }

  return tiers;
}

function getTierLabel(structuralType: string, name: string): string | null {
  const firstName = name.split(' ')[0];

  switch (structuralType) {
    case 'self':
      return `${firstName}`;
    case 'father':
    case 'mother':
    case 'parent':
      return `${firstName}'s parents`;
    case 'grandfather':
    case 'grandmother':
    case 'grandparent':
      return `${firstName}'s grandparents`;
    case 'great-grandparent':
    case 'great-grandfather':
    case 'great-grandmother':
      return `${firstName}'s great-grandparents`;
    case 'son':
    case 'daughter':
    case 'child':
      return `${firstName}'s children`;
    case 'grandson':
    case 'granddaughter':
    case 'grandchild':
      return `${firstName}'s grandchildren`;
    case 'brother':
    case 'sister':
    case 'sibling':
      return `${firstName}'s siblings`;
    case 'uncle':
    case 'aunt':
      return `${firstName}'s uncles & aunts`;
    case 'cousin':
      return `${firstName}'s cousins`;
    case 'nephew':
    case 'niece':
      return `${firstName}'s nephews & nieces`;
    case 'spouse':
    case 'husband':
    case 'wife':
      return null; // Spouses are on the same row as the person
    default:
      return null; // Don't show label for unknown types
  }
}

/**
 * Render generation tier labels as absolutely positioned divs
 */
export function GenerationTierLabels({ tiers }: { tiers: GenerationTier[] }) {
  if (tiers.length === 0) return null;

  return (
    <>
      {tiers.map((tier, i) => (
        <div
          key={i}
          className="generation-tier-label absolute"
          style={{
            left: tier.centerX,
            top: tier.y,
            transform: 'translateX(-50%)',
          }}
        >
          {tier.label}
        </div>
      ))}
    </>
  );
}
