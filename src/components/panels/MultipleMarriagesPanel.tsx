/**
 * MultipleMarriagesPanel - Display panel for person with multiple marriages
 *
 * Shows all marriages/unions chronologically with children from each.
 * Common in Indian families due to widowhood remarriage, divorce, etc.
 *
 * Features:
 * - Chronological marriage list
 * - Children grouped by each union
 * - Marriage metadata (dates, type, status)
 * - Visual separation between unions
 * - Cultural context (arranged, love, inter-caste, etc.)
 *
 * @see references/new file-ancestry.md - Multiple marriage patterns
 */

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Heart, Users } from 'lucide-react';
import type { Person, Union } from '@/types';
import type { Relationship } from '@/services/elkLayoutService';

// ============================================================================
// Types
// ============================================================================

export interface MultipleMarriagesPanelProps {
  /** The person with multiple marriages */
  person: Person;

  /** All persons (for finding spouses and children) */
  persons: Person[];

  /** All unions */
  unions: Union[];

  /** All relationships */
  relationships: Relationship[];

  /** Callback when person/union is clicked */
  onPersonClick?: (personId: string) => void;
  onUnionClick?: (unionId: string) => void;
}

interface MarriageInfo {
  union: Union;
  spouse: Person | null;
  children: Person[];
  startYear?: number;
  endYear?: number;
  isActive: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function MultipleMarriagesPanel({
  person,
  persons,
  unions,
  relationships,
  onPersonClick,
  onUnionClick,
}: MultipleMarriagesPanelProps) {
  // ============================================================================
  // Extract Marriage Information
  // ============================================================================

  const marriages = useMemo(() => {
    // Find all unions for this person
    const personUnionIds = relationships
      .filter((r) => r.type === 'PARTNER_IN' && r.fromId === person.personId)
      .map((r) => r.toId);

    const marriageList: MarriageInfo[] = [];

    for (const unionId of personUnionIds) {
      const union = unions.find((u) => u.unionId === unionId);
      if (!union) continue;

      // Find spouse
      const spouseId = relationships.find(
        (r) => r.type === 'PARTNER_IN' && r.toId === unionId && r.fromId !== person.personId
      )?.fromId;

      const spouse = spouseId ? persons.find((p) => p.personId === spouseId) || null : null;

      // Find children
      const childIds = relationships
        .filter((r) => r.type === 'HAS_CHILD' && r.fromId === unionId)
        .map((r) => r.toId);

      const children = persons.filter((p) => childIds.includes(p.personId));

      // Calculate years
      const startYear = union.startDate ? new Date(union.startDate).getFullYear() : undefined;
      const endYear = union.endDate ? new Date(union.endDate).getFullYear() : undefined;
      const isActive = !union.endDate || endYear === undefined;

      marriageList.push({
        union,
        spouse,
        children,
        startYear,
        endYear,
        isActive,
      });
    }

    // Sort by start date (oldest first)
    marriageList.sort((a, b) => {
      if (!a.startYear && !b.startYear) return 0;
      if (!a.startYear) return 1;
      if (!b.startYear) return -1;
      return a.startYear - b.startYear;
    });

    return marriageList;
  }, [person, persons, unions, relationships]);

  // ============================================================================
  // Render
  // ============================================================================

  if (marriages.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-gray-500 text-center">No marriages found</p>
      </Card>
    );
  }

  if (marriages.length === 1) {
    return null; // Don't show panel for single marriage
  }

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Marriages ({marriages.length})
        </h3>
        <p className="text-sm text-gray-600">
          Multiple unions for {person.firstName} {person.lastName}
        </p>
      </div>

      {/* Marriage List */}
      <div className="space-y-6">
        {marriages.map((marriage, index) => (
          <MarriageCard
            key={marriage.union.unionId}
            marriage={marriage}
            index={index}
            totalMarriages={marriages.length}
            onPersonClick={onPersonClick}
            onUnionClick={onUnionClick}
          />
        ))}
      </div>
    </Card>
  );
}

// ============================================================================
// Marriage Card Component
// ============================================================================

interface MarriageCardProps {
  marriage: MarriageInfo;
  index: number;
  totalMarriages: number;
  onPersonClick?: (personId: string) => void;
  onUnionClick?: (unionId: string) => void;
}

function MarriageCard({
  marriage,
  index,
  totalMarriages,
  onPersonClick,
  onUnionClick: _onUnionClick,
}: MarriageCardProps) {
  const { union, spouse, children, startYear, endYear, isActive } = marriage;

  return (
    <div
      className={`border-l-4 pl-4 ${
        isActive ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50'
      } rounded-r-lg p-4`}
    >
      {/* Marriage Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-900">
            Marriage {index + 1} {index === 0 && totalMarriages > 1 && '(First)'}
            {index === totalMarriages - 1 && index > 0 && '(Current)'}
          </h4>
          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
            <Calendar className="h-4 w-4" />
            {startYear && (
              <span>
                {startYear} {endYear && `- ${endYear}`}
                {!endYear && isActive && '- Present'}
              </span>
            )}
            {!startYear && <span>Date unknown</span>}
          </div>
        </div>

        <Badge variant={isActive ? 'default' : 'secondary'}>
          {isActive ? 'Active' : 'Ended'}
        </Badge>
      </div>

      {/* Spouse */}
      {spouse && (
        <div
          className="mb-3 cursor-pointer hover:bg-white p-2 rounded transition-colors"
          onClick={() => onPersonClick?.(spouse.personId)}
        >
          <div className="flex items-center gap-2 text-sm">
            <Heart className="h-4 w-4 text-pink-500" />
            <span className="font-medium">
              {spouse.firstName} {spouse.lastName}
            </span>
            {spouse.isLiving === false && (
              <Badge variant="outline" className="text-xs">Deceased</Badge>
            )}
          </div>
        </div>
      )}

      {/* Union Type & Ceremony */}
      <div className="flex flex-wrap gap-2 mb-3">
        {union.type && union.type !== 'unknown' && (
          <Badge variant="outline" className="text-xs">
            {union.type === 'marriage' ? 'Marriage' : 'Partnership'}
          </Badge>
        )}

        {union.ceremonyType && (
          <Badge variant="outline" className="text-xs">
            {union.ceremonyType === 'arranged' && 'Arranged (व्यवस्थित)'}
            {union.ceremonyType === 'love' && 'Love (प्रेम विवाह)'}
            {union.ceremonyType === 'inter-caste' && 'Inter-caste'}
            {union.ceremonyType === 'inter-religion' && 'Inter-religion'}
          </Badge>
        )}

        {union.livingArrangement && (
          <Badge variant="outline" className="text-xs">
            {union.livingArrangement === 'joint' && 'Joint Family (संयुक्त परिवार)'}
            {union.livingArrangement === 'nuclear' && 'Nuclear Family'}
          </Badge>
        )}
      </div>

      {/* Children */}
      {children.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Users className="h-4 w-4" />
            <span className="font-medium">Children ({children.length})</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {children.map((child) => (
              <div
                key={child.personId}
                className="text-sm text-gray-700 hover:bg-white p-2 rounded cursor-pointer transition-colors"
                onClick={() => onPersonClick?.(child.personId)}
              >
                {child.firstName} {child.lastName}
                {child.isLiving === false && (
                  <span className="text-gray-400 ml-1">†</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {children.length === 0 && (
        <div className="text-xs text-gray-400 italic">No children from this union</div>
      )}

      {/* Marriage Place */}
      {union.marriagePlace && (
        <div className="text-xs text-gray-500 mt-2">
          📍 {union.marriagePlace}
        </div>
      )}

      {/* Notes */}
      {union.notes && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-600 italic">{union.notes}</p>
        </div>
      )}
    </div>
  );
}
