/**
 * Fan Chart Service – Ancestry-style upper semi-circle layout
 *
 * Uses ahnentafel numbering to position ancestors in a 180° fan.
 * Father on left, mother on right. Empty slots rendered as dashed outlines.
 */

import type { Person, Union } from '@/types';
import type { Relationship } from './elkLayoutService';
import { filterToAncestors } from './pedigreeLayoutService';

export interface FanSegment {
  personId: string | null;
  person: Person | null;
  generation: number;
  ahnentafel: number;
  startAngle: number;       // degrees, 0 = top center
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  quadrant: number;          // 0=FF, 1=FM, 2=MF, 3=MM
  lineage: 'paternal' | 'maternal';
  isEmpty: boolean;
  label: string;
  cx: number;
  cy: number;
  midAngle: number;
}

export interface FanChartData {
  segments: FanSegment[];
  maxGeneration: number;
  totalAncestors: number;
  centerX: number;
  centerY: number;
  maxRadius: number;
  centerRadius: number;
  homePerson: Person | null;
}

export const MAX_GENERATIONS = 10;
const GAP_ANGLE = 1.2;

/**
 * Build ahnentafel map: ahnentafel number → Person
 * 1=self, 2=father, 3=mother, 4=FF, 5=FM, 6=MF, 7=MM, ...
 */
export function buildAhnentafelMap(
  homePersonId: string,
  persons: Person[],
  _unions: Union[],
  relationships: Relationship[],
  maxGen: number
): Map<number, Person> {
  const personMap = new Map(
    persons
      .filter(p => {
        if (!p.personId) return false;
        const isProxy = (p as any).isProxy || p.personId.includes('_proxy_') || p.personId.startsWith('ghost-spouse-');
        const isDeleted = (p as any).isDeleted;
        return !isProxy && !isDeleted;
      })
      .map(p => [p.personId, p])
  );
  const ahnMap = new Map<number, Person>();

  const homePerson = personMap.get(homePersonId);
  if (!homePerson) return ahnMap;

  ahnMap.set(1, homePerson);

  const queue: Array<[string, number]> = [[homePersonId, 1]];

  while (queue.length > 0) {
    const [personId, ahn] = queue.shift()!;
    const gen = Math.floor(Math.log2(ahn));
    if (gen >= maxGen) continue;

    const parentUnionIds = relationships
      .filter(r => r.type === 'HAS_CHILD' && r.toId === personId)
      .map(r => r.fromId);

    for (const unionId of parentUnionIds) {
      const parentIds = relationships
        .filter(r => r.type === 'PARTNER_IN' && r.toId === unionId)
        .map(r => r.fromId);

      for (const parentId of parentIds) {
        const parent = personMap.get(parentId);
        if (!parent) continue;

        const isFather = parent.gender === 'male';
        const parentAhn = isFather ? ahn * 2 : ahn * 2 + 1;

        if (!ahnMap.has(parentAhn)) {
          ahnMap.set(parentAhn, parent);
          queue.push([parentId, parentAhn]);
        }
      }
    }
  }

  return ahnMap;
}

/**
 * Polar to SVG cartesian. 0° = top, positive = clockwise.
 */
function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = angleDeg * (Math.PI / 180);
  return {
    x: cx + r * Math.sin(rad),
    y: cy - r * Math.cos(rad),
  };
}

/**
 * Calculate fan chart segments for the semicircle
 */
export function calculateFanChart(
  homePersonId: string,
  persons: Person[],
  unions: Union[],
  relationships: Relationship[],
  svgWidth: number = 900,
  svgHeight: number = 600
): FanChartData {
  const filtered = filterToAncestors(homePersonId, persons, unions, relationships);
  const ahnMap = buildAhnentafelMap(
    homePersonId, filtered.persons, filtered.unions, filtered.relationships, MAX_GENERATIONS
  );

  const segments: FanSegment[] = [];
  let totalAncestors = 0;

  // Find max gen with data
  let maxGenWithData = 0;
  for (const [ahn] of ahnMap) {
    if (ahn >= 2) {
      const g = Math.floor(Math.log2(ahn));
      if (g > maxGenWithData) maxGenWithData = g;
    }
  }

  const displayGens = Math.max(3, Math.min(maxGenWithData + 1, MAX_GENERATIONS));
  const isLargeTree = displayGens > 3;

  const centerX = 0;
  const centerY = 0;

  // Dynamically set fan angle based on generation depth
  let totalAngle = 180;
  if (isLargeTree) {
    if (displayGens === 4) totalAngle = 240;
    else if (displayGens === 5) totalAngle = 300;
    else totalAngle = 360;
  }

  // Dynamically increase the radius based on generation count to prevent compression
  const baseRadius = 120;
  const ringThickness = isLargeTree ? 100 : 75;
  const maxRadius = baseRadius + displayGens * ringThickness;
  const centerRadius = baseRadius;
  const totalRadiusRange = maxRadius - centerRadius;

  // Helper to calculate inner/outer radius for a given generation.
  // For large trees (displayGens > 3), outer rings are made wider to give more space.
  const getRingRadii = (gen: number) => {
    if (!isLargeTree) {
      const ringWidth = totalRadiusRange / displayGens;
      const inner = centerRadius + (gen - 1) * ringWidth;
      const outer = centerRadius + gen * ringWidth;
      return { inner, outer };
    } else {
      let sumOfWeights = 0;
      for (let g = 1; g <= displayGens; g++) {
        sumOfWeights += 1.0 + (g - 1) * 0.25;
      }
      
      let currentRadius = centerRadius;
      for (let g = 1; g < gen; g++) {
        const weight = 1.0 + (g - 1) * 0.25;
        currentRadius += totalRadiusRange * weight / sumOfWeights;
      }
      
      const genWeight = 1.0 + (gen - 1) * 0.25;
      const inner = currentRadius;
      const outer = currentRadius + totalRadiusRange * genWeight / sumOfWeights;
      return { inner, outer };
    }
  };

  for (let gen = 1; gen <= displayGens; gen++) {
    const totalSlots = Math.pow(2, gen); // 2, 4, 8, 16, 32
    const { inner: innerRadius, outer: outerRadius } = getRingRadii(gen);

    // Dynamic gap angle to avoid excessive segment shrinkage in outer generations
    const gapAngle = isLargeTree
      ? (gen <= 2 ? 1.0 : gen === 3 ? 0.6 : gen === 4 ? 0.3 : 0.1)
      : GAP_ANGLE;
    const totalGap = totalSlots * gapAngle;
    const availableAngle = totalAngle - totalGap;
    const slotAngle = availableAngle / totalSlots;

    for (let slot = 0; slot < totalSlots; slot++) {
      const ahn = Math.pow(2, gen) + slot;
      const person = ahnMap.get(ahn) || null;

      const startAngle = -totalAngle / 2 + slot * (slotAngle + gapAngle);
      const endAngle = startAngle + slotAngle;

      // Lineage: left half = paternal, right half = maternal
      const lineage: 'paternal' | 'maternal' = slot < totalSlots / 2 ? 'paternal' : 'maternal';

      // Quadrant: which grandparent line (for coloring)
      let quadrant: number;
      if (gen === 1) {
        quadrant = slot === 0 ? 0 : 3; // father=green, mother=peach
      } else {
        const slotsPerQuadrant = totalSlots / 4;
        quadrant = Math.min(3, Math.floor(slot / slotsPerQuadrant));
      }

      // Label for empty slots
      let emptyLabel = '';
      if (!person) {
        const parentAhn = Math.floor(ahn / 2);
        const isFatherSlot = ahn % 2 === 0;
        if (ahnMap.has(parentAhn)) {
          emptyLabel = isFatherSlot ? 'Add father' : 'Add mother';
        }
      } else {
        totalAncestors++;
      }

      const midAngle = (startAngle + endAngle) / 2;
      const midRadius = (innerRadius + outerRadius) / 2;
      const { x: cx, y: cy } = polarToXY(centerX, centerY, midRadius, midAngle);

      segments.push({
        personId: person?.personId || null,
        person,
        generation: gen,
        ahnentafel: ahn,
        startAngle,
        endAngle,
        innerRadius,
        outerRadius,
        quadrant,
        lineage,
        isEmpty: !person,
        label: person
          ? `${person.firstName}${person.lastName ? ' ' + person.lastName : ''}`
          : emptyLabel,
        cx,
        cy,
        midAngle,
      });
    }
  }

  return {
    segments,
    maxGeneration: displayGens,
    totalAncestors,
    centerX,
    centerY,
    maxRadius,
    centerRadius,
    homePerson: ahnMap.get(1) || null,
  };
}

/**
 * Convert polar arc to SVG path.
 * 0° = top, positive = clockwise. Fan opens upward.
 */
export function arcToPath(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngleDeg: number,
  endAngleDeg: number
): string {
  const so = polarToXY(cx, cy, outerRadius, startAngleDeg);
  const eo = polarToXY(cx, cy, outerRadius, endAngleDeg);
  const ei = polarToXY(cx, cy, innerRadius, endAngleDeg);
  const si = polarToXY(cx, cy, innerRadius, startAngleDeg);

  const largeArc = (endAngleDeg - startAngleDeg) > 180 ? 1 : 0;

  return [
    `M ${so.x} ${so.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${eo.x} ${eo.y}`,
    `L ${ei.x} ${ei.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${si.x} ${si.y}`,
    'Z',
  ].join(' ');
}
