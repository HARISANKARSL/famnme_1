/**
 * JointFamilyView - Display for Indian Joint Family Households
 *
 * Shows family members grouped by generation and household.
 * Common in Indian culture where multiple generations live together.
 *
 * Features:
 * - Generation-based grouping (Elders, Parents, Children)
 * - Household indicators
 * - Head of household highlighting
 * - Living arrangement display
 * - Cultural roles (बुजुर्ग, माता-पिता, बच्चे)
 *
 * @see references/new file-ancestry.md - Joint family structures
 */

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Person, Union } from '@/types';
import type { Relationship } from '@/services/elkLayoutService';

// ============================================================================
// Types
// ============================================================================

export interface JointFamilyViewProps {
  /** All persons in the household */
  persons: Person[];

  /** All unions (for determining relationships) */
  unions: Union[];

  /** All relationships */
  relationships: Relationship[];

  /** Optional: Head of household person ID */
  headOfHouseholdId?: string;

  /** Optional: Focus on specific household */
  householdId?: string;

  /** Callback when person is clicked */
  onPersonClick?: (personId: string) => void;
}

interface GenerationGroup {
  generation: 'grandparents' | 'parents' | 'children' | 'grandchildren';
  label: string;
  hindiLabel: string;
  persons: Person[];
}

// ============================================================================
// Component
// ============================================================================

export function JointFamilyView({
  persons,
  unions,
  relationships,
  headOfHouseholdId,
  onPersonClick,
}: JointFamilyViewProps) {
  // ============================================================================
  // Group by Generation
  // ============================================================================

  const generations = useMemo(() => {
    // Simple heuristic: Group by age ranges
    // In production, use actual generational relationships from graph
    const now = new Date();
    const groups: GenerationGroup[] = [
      {
        generation: 'grandparents',
        label: 'Elders',
        hindiLabel: 'बुजुर्ग (Bujurg)',
        persons: [],
      },
      {
        generation: 'parents',
        label: 'Parents Generation',
        hindiLabel: 'माता-पिता (Mata-Pita)',
        persons: [],
      },
      {
        generation: 'children',
        label: 'Children',
        hindiLabel: 'बच्चे (Bacche)',
        persons: [],
      },
      {
        generation: 'grandchildren',
        label: 'Grandchildren',
        hindiLabel: 'पोते-पोती (Pote-Poti)',
        persons: [],
      },
    ];

    persons.forEach((person) => {
      const age = person.birthDate ? now.getFullYear() - new Date(person.birthDate).getFullYear() : null;

      if (age === null) {
        // No birth date - try to infer from relationships
        // Default to parents generation
        groups[1].persons.push(person);
      } else if (age >= 60) {
        groups[0].persons.push(person); // Grandparents
      } else if (age >= 25) {
        groups[1].persons.push(person); // Parents
      } else if (age >= 1) {
        groups[2].persons.push(person); // Children
      } else {
        groups[3].persons.push(person); // Grandchildren
      }
    });

    // Filter out empty generations
    return groups.filter((g) => g.persons.length > 0);
  }, [persons]);

  // ============================================================================
  // Find Unions for Each Person
  // ============================================================================

  const getPersonUnions = (personId: string): Union[] => {
    const unionIds = relationships
      .filter((r) => r.type === 'PARTNER_IN' && r.fromId === personId)
      .map((r) => r.toId);

    return unions.filter((u) => unionIds.includes(u.unionId));
  };

  const getSpouses = (personId: string): Person[] => {
    const personUnionIds = relationships
      .filter((r) => r.type === 'PARTNER_IN' && r.fromId === personId)
      .map((r) => r.toId);

    const spouseIds = relationships
      .filter((r) => r.type === 'PARTNER_IN' && personUnionIds.includes(r.toId) && r.fromId !== personId)
      .map((r) => r.fromId);

    return persons.filter((p) => spouseIds.includes(p.personId));
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (persons.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-gray-500 text-center">No family members in household</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">
          Joint Family Household
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          संयुक्त परिवार (Sanyukt Parivar) - {persons.length} members
        </p>
      </div>

      {/* Generation Groups */}
      {generations.map((group) => (
        <GenerationSection
          key={group.generation}
          group={group}
          headOfHouseholdId={headOfHouseholdId}
          getSpouses={getSpouses}
          getPersonUnions={getPersonUnions}
          onPersonClick={onPersonClick}
        />
      ))}

      {/* Living Arrangement Info */}
      <Card className="p-4 bg-[#E8EDFF] border-[#2F3E8F]/30">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          About Joint Families
        </h3>
        <p className="text-xs text-[#2F3E8F]">
          Joint families (संयुक्त परिवार) are traditional Indian households where
          multiple generations live together. Typically includes grandparents, their sons
          with families, and unmarried daughters.
        </p>
      </Card>
    </div>
  );
}

// ============================================================================
// Generation Section Component
// ============================================================================

interface GenerationSectionProps {
  group: GenerationGroup;
  headOfHouseholdId?: string;
  getSpouses: (personId: string) => Person[];
  getPersonUnions: (personId: string) => Union[];
  onPersonClick?: (personId: string) => void;
}

function GenerationSection({
  group,
  headOfHouseholdId,
  getSpouses,
  getPersonUnions,
  onPersonClick,
}: GenerationSectionProps) {
  return (
    <Card className="p-6">
      {/* Generation Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{group.label}</h3>
        <p className="text-sm text-gray-500">{group.hindiLabel}</p>
      </div>

      {/* Person Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {group.persons.map((person) => {
          const spouses = getSpouses(person.personId);
          const unions = getPersonUnions(person.personId);
          const isHeadOfHousehold = person.personId === headOfHouseholdId;

          return (
            <PersonMemberCard
              key={person.personId}
              person={person}
              spouses={spouses}
              unions={unions}
              isHeadOfHousehold={isHeadOfHousehold}
              onClick={() => onPersonClick?.(person.personId)}
            />
          );
        })}
      </div>
    </Card>
  );
}

// ============================================================================
// Person Member Card
// ============================================================================

interface PersonMemberCardProps {
  person: Person;
  spouses: Person[];
  unions: Union[];
  isHeadOfHousehold: boolean;
  onClick?: () => void;
}

function PersonMemberCard({
  person,
  spouses,
  unions,
  isHeadOfHousehold,
  onClick,
}: PersonMemberCardProps) {
  const age = person.birthDate
    ? new Date().getFullYear() - new Date(person.birthDate).getFullYear()
    : null;

  return (
    <div
      className={`border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer ${
        isHeadOfHousehold ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'
      }`}
      onClick={onClick}
    >
      {/* Person Info */}
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={person.profilePhotoUrl || undefined} alt={person.firstName} />
          <AvatarFallback>{person.firstName?.[0]}{person.lastName?.[0]}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 truncate">
            {person.firstName} {person.lastName}
          </div>

          {age !== null && (
            <div className="text-sm text-gray-600">
              Age {age} • {person.gender === 'male' ? 'Male' : person.gender === 'female' ? 'Female' : 'Other'}
            </div>
          )}

          {person.occupation && (
            <div className="text-xs text-gray-500 truncate">{person.occupation}</div>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-1 mt-2">
            {isHeadOfHousehold && (
              <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">
                Head of Household
              </Badge>
            )}

            {person.isHomePerson && (
              <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 border-purple-300">
                You
              </Badge>
            )}

            {!person.isLiving && (
              <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600 border-gray-300">
                Deceased
              </Badge>
            )}

            {person.elderStatus && (
              <Badge variant="outline" className="text-xs">
                {person.elderStatus === 'elder' ? 'बड़ा (Elder)' : 'छोटा (Younger)'}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Spouse(s) */}
      {spouses.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <div className="text-xs text-gray-500 mb-2">
            Spouse{spouses.length > 1 ? 's' : ''}:
          </div>
          {spouses.map((spouse, index) => (
            <div key={spouse.personId} className="flex items-center gap-2 text-sm">
              <span className="text-gray-700">
                {spouse.firstName} {spouse.lastName}
              </span>
              {unions[index]?.livingArrangement && (
                <Badge variant="outline" className="text-xs">
                  {unions[index].livingArrangement === 'joint' ? 'Joint Family' : 'Nuclear'}
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cultural Info */}
      {(person.gotra || person.religion) && (
        <div className="mt-3 pt-3 border-t">
          {person.gotra && (
            <div className="text-xs text-gray-600">
              <span className="font-medium">Gotra:</span> {person.gotra}
            </div>
          )}
          {person.religion && (
            <div className="text-xs text-gray-600">
              <span className="font-medium">Religion:</span> {person.religion}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
