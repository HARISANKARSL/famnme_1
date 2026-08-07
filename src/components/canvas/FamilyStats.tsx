/**
 * FamilyStats Component (Phase 2.6 Enhanced)
 *
 * Displays overview statistics about the family tree.
 * - compact=true: Shows only Total Members, Generations, Marriages (backward compatible)
 * - showDetailed=true: Shows full statistics dashboard with gender, living/deceased,
 *   surnames, geographic spread, age stats, and gotra distribution
 */

import { useMemo } from 'react';
import {
  Users, GitBranch, Heart, UserCheck, UserX,
} from 'lucide-react';
import type { Person, Union, ExtendedRelationship } from '@/types';

export interface FamilyStatsProps {
  persons: Person[];
  unions: Union[];
  relationships: ExtendedRelationship[];
  compact?: boolean;
  showDetailed?: boolean;
}

/**
 * Calculate the generation depth of the family tree
 * Uses BFS from the home person to find max depth
 */
function calculateGenerations(
  persons: Person[],
  relationships: ExtendedRelationship[]
): { minGeneration: number; maxGeneration: number; totalGenerations: number } {
  const homePerson = persons.find(p => p.isHomePerson);
  if (!homePerson) {
    return { minGeneration: 0, maxGeneration: 0, totalGenerations: 1 };
  }

  const generations = new Map<string, number>();
  const queue: { personId: string; generation: number }[] = [
    { personId: homePerson.personId, generation: 0 }
  ];
  const visited = new Set<string>();

  generations.set(homePerson.personId, 0);

  while (queue.length > 0) {
    const { personId, generation } = queue.shift()!;

    if (visited.has(personId)) continue;
    visited.add(personId);

    // Find parents (go up)
    const parentUnionIds = relationships
      .filter(r => r.type === 'HAS_CHILD' && r.toId === personId)
      .map(r => r.fromId);

    parentUnionIds.forEach(unionId => {
      const parents = relationships
        .filter(r => r.type === 'PARTNER_IN' && r.toId === unionId)
        .map(r => r.fromId);

      parents.forEach(parentId => {
        if (!generations.has(parentId)) {
          generations.set(parentId, generation - 1);
          queue.push({ personId: parentId, generation: generation - 1 });
        }
      });
    });

    // Find children (go down)
    const personUnionIds = relationships
      .filter(r => r.type === 'PARTNER_IN' && r.fromId === personId)
      .map(r => r.toId);

    personUnionIds.forEach(unionId => {
      const children = relationships
        .filter(r => r.type === 'HAS_CHILD' && r.fromId === unionId)
        .map(r => r.toId);

      children.forEach(childId => {
        if (!generations.has(childId)) {
          generations.set(childId, generation + 1);
          queue.push({ personId: childId, generation: generation + 1 });
        }
      });
    });
  }

  const generationValues = Array.from(generations.values());
  const minGeneration = Math.min(...generationValues);
  const maxGeneration = Math.max(...generationValues);
  const totalGenerations = maxGeneration - minGeneration + 1;

  return { minGeneration, maxGeneration, totalGenerations };
}

/** Calculate age from birth date string to today or a death date */
function calculateAge(birthDate: string, endDate?: string | null): number | null {
  try {
    const birth = new Date(birthDate);
    const end = endDate ? new Date(endDate) : new Date();
    if (isNaN(birth.getTime()) || isNaN(end.getTime())) return null;
    let age = end.getFullYear() - birth.getFullYear();
    const monthDiff = end.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  } catch {
    return null;
  }
}

/** Count top N occurrences of a field */
function topN<T>(items: T[], accessor: (item: T) => string | null | undefined, n: number): Array<{ value: string; count: number }> {
  const counts = new Map<string, number>();
  items.forEach(item => {
    const val = accessor(item);
    if (val && val.trim()) {
      const key = val.trim();
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  });
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

function StatRow({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-lg font-bold text-gray-900 truncate">{value}</div>
      </div>
    </div>
  );
}

function StatList({ title, items, emptyText }: { title: string; items: Array<{ label: string; count: number }>; emptyText: string }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="text-xs font-semibold text-gray-600 mb-1.5">{title}</div>
      <div className="space-y-1">
        {items.length === 0 ? (
          <div className="text-xs text-gray-400 italic">{emptyText}</div>
        ) : (
          items.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-gray-700 truncate mr-2">{item.label}</span>
              <span className="text-gray-500 font-medium flex-shrink-0">{item.count}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function FamilyStats({ persons: allPersons, unions, relationships, compact, showDetailed }: FamilyStatsProps) {
  // Exclude ghost (soft-deleted) and proxy persons from all stats
  const persons = useMemo(() => allPersons.filter(p => !p.isDeleted && !(p as any).isProxy && !(p.personId && p.personId.includes('_proxy_'))), [allPersons]);
  const { totalGenerations } = calculateGenerations(persons, relationships);
  const marriages = unions.filter(u => u.type === 'marriage').length;

  // Detailed stats (computed only when needed)
  const detailedStats = useMemo(() => {
    if (compact || !showDetailed) return null;

    // Gender distribution
    const maleCount = persons.filter(p => p.gender === 'male').length;
    const femaleCount = persons.filter(p => p.gender === 'female').length;
    const otherCount = persons.filter(p => p.gender === 'other').length;

    // Living vs Deceased
    const livingCount = persons.filter(p => p.isLiving).length;
    const deceasedCount = persons.filter(p => !p.isLiving).length;

    // Top 5 surnames
    const topSurnames = topN(persons, p => p.lastName, 5);

    // Top 5 birth places
    const topBirthPlaces = topN(persons, p => p.birthPlace, 5);

    // Top 5 gotras
    const topGotras = topN(persons, p => p.gotra, 5);

    // Oldest living person
    const livingWithBirth = persons
      .filter(p => p.isLiving && p.birthDate)
      .map(p => ({ person: p, age: calculateAge(p.birthDate!) }))
      .filter((x): x is { person: Person; age: number } => x.age !== null)
      .sort((a, b) => b.age - a.age);
    const oldestLiving = livingWithBirth.length > 0 ? livingWithBirth[0] : null;

    // Average age at death
    const deathAges = persons
      .filter(p => !p.isLiving && p.birthDate && p.deathDate)
      .map(p => calculateAge(p.birthDate!, p.deathDate))
      .filter((age): age is number => age !== null);
    const avgAgeAtDeath = deathAges.length > 0
      ? Math.round((deathAges.reduce((sum, a) => sum + a, 0) / deathAges.length) * 10) / 10
      : null;

    return {
      maleCount, femaleCount, otherCount,
      livingCount, deceasedCount,
      topSurnames, topBirthPlaces, topGotras,
      oldestLiving, avgAgeAtDeath,
    };
  }, [persons, compact, showDetailed]);

  return (
    <div className={compact ? 'p-3' : 'bg-white border border-gray-300 rounded-lg shadow-md p-3'}>
      <div className="text-xs font-semibold text-gray-700 mb-3">Family Stats</div>

      <div className="space-y-2">
        {/* Total Members */}
        <StatRow
          icon={<Users className="w-4 h-4 text-[#2F3E8F]" />}
          label="Total Members"
          value={persons.length}
          color="bg-blue-100"
        />

        {/* Total Generations */}
        <StatRow
          icon={<GitBranch className="w-4 h-4 text-green-600" />}
          label="Generations"
          value={totalGenerations}
          color="bg-green-100"
        />

        {/* Total Marriages */}
        <StatRow
          icon={<Heart className="w-4 h-4 text-pink-600" />}
          label="Marriages"
          value={marriages}
          color="bg-pink-100"
        />
      </div>

      {/* Detailed Statistics (Phase 2.6) */}
      {detailedStats && (
        <div className="mt-4 pt-3 border-t border-gray-200 space-y-4">
          {/* Gender Distribution */}
          <div>
            <div className="text-xs font-semibold text-gray-600 mb-2">Gender Distribution</div>
            <div className="flex gap-3">
              <div className="flex-1 bg-[#E8EDFF] rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-[#2F3E8F]">{detailedStats.maleCount}</div>
                <div className="text-xs text-blue-500">Male</div>
              </div>
              <div className="flex-1 bg-pink-50 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-pink-700">{detailedStats.femaleCount}</div>
                <div className="text-xs text-pink-500">Female</div>
              </div>
              {detailedStats.otherCount > 0 && (
                <div className="flex-1 bg-purple-50 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-purple-700">{detailedStats.otherCount}</div>
                  <div className="text-xs text-purple-500">Other</div>
                </div>
              )}
            </div>
          </div>

          {/* Living vs Deceased */}
          <div>
            <div className="text-xs font-semibold text-gray-600 mb-2">Living vs Deceased</div>
            <div className="flex gap-3">
              <div className="flex-1 flex items-center gap-2 bg-green-50 rounded-lg p-2">
                <UserCheck className="w-4 h-4 text-green-600" />
                <div>
                  <div className="text-sm font-bold text-green-700">{detailedStats.livingCount}</div>
                  <div className="text-xs text-green-500">Living</div>
                </div>
              </div>
              <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                <UserX className="w-4 h-4 text-gray-500" />
                <div>
                  <div className="text-sm font-bold text-gray-600">{detailedStats.deceasedCount}</div>
                  <div className="text-xs text-gray-400">Deceased</div>
                </div>
              </div>
            </div>
          </div>

          {/* Age Statistics */}
          <div>
            <div className="text-xs font-semibold text-gray-600 mb-2">Age Statistics</div>
            <div className="space-y-1.5">
              {detailedStats.oldestLiving && (
                <div className="flex items-center justify-between text-xs bg-[#E8EDFF] rounded p-2">
                  <span className="text-gray-600">Oldest Living</span>
                  <span className="font-medium text-[#2F3E8F]">
                    {[detailedStats.oldestLiving.person.firstName, detailedStats.oldestLiving.person.lastName].filter(Boolean).join(' ')}
                    {' '}({detailedStats.oldestLiving.age} yrs)
                  </span>
                </div>
              )}
              {detailedStats.avgAgeAtDeath !== null && (
                <div className="flex items-center justify-between text-xs bg-gray-50 rounded p-2">
                  <span className="text-gray-600">Avg. Age at Death</span>
                  <span className="font-medium text-gray-700">{detailedStats.avgAgeAtDeath} yrs</span>
                </div>
              )}
              {!detailedStats.oldestLiving && detailedStats.avgAgeAtDeath === null && (
                <div className="text-xs text-gray-400 italic">No age data available</div>
              )}
            </div>
          </div>

          {/* Surname Frequency */}
          <StatList
            title="Top Surnames"
            items={detailedStats.topSurnames.map(s => ({ label: s.value, count: s.count }))}
            emptyText="No surname data"
          />

          {/* Geographic Spread */}
          <StatList
            title="Top Birth Places"
            items={detailedStats.topBirthPlaces.map(p => ({ label: p.value, count: p.count }))}
            emptyText="No birthplace data"
          />

          {/* Gotra Distribution */}
          {detailedStats.topGotras.length > 0 && (
            <StatList
              title="Gotra Distribution"
              items={detailedStats.topGotras.map(g => ({ label: g.value, count: g.count }))}
              emptyText="No gotra data"
            />
          )}
        </div>
      )}
    </div>
  );
}
