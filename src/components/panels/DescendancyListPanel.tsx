/**
 * DescendancyListPanel (Phase 5)
 *
 * Table/list format of descendants with configurable columns.
 * Shows an indented list, generation by generation, with sortable columns.
 */

import { useState, useMemo, useCallback } from 'react';
import { X, ChevronDown, ChevronRight, ArrowUpDown } from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';
import type { Person, Union, ExtendedRelationship } from '@/types';

interface DescendancyListPanelProps {
  personId: string;
  persons: Person[];
  unions: Union[];
  relationships: ExtendedRelationship[];
  onClose: () => void;
  onPersonSelect?: (id: string) => void;
}

type SortField = 'name' | 'birthDate';
type SortDir = 'asc' | 'desc';

interface DescendantRow {
  person: Person;
  generation: number;
  children: DescendantRow[];
}

/**
 * Build a tree of descendants starting from personId.
 */
function buildDescendantTree(
  rootId: string,
  persons: Person[],
  unions: Union[],
  relationships: ExtendedRelationship[],
  maxDepth: number,
  currentDepth: number = 0
): DescendantRow[] {
  if (currentDepth >= maxDepth) return [];

  const personMap = new Map(persons.map((p) => [p.personId, p]));

  // Find unions this person is a partner in
  const partnerRels = relationships.filter(
    (r) => r.fromId === rootId && r.type === 'PARTNER_IN'
  );
  const unionIds = partnerRels.map((r) => r.toId);

  // Find children of these unions
  const childIds = new Set<string>();
  for (const uid of unionIds) {
    const childRels = relationships.filter(
      (r) => r.fromId === uid && r.type === 'HAS_CHILD'
    );
    for (const cr of childRels) {
      childIds.add(cr.toId);
    }
  }

  const rows: DescendantRow[] = [];

  for (const childId of childIds) {
    const child = personMap.get(childId);
    if (!child) continue;

    const childRow: DescendantRow = {
      person: child,
      generation: currentDepth + 1,
      children: buildDescendantTree(
        childId,
        persons,
        unions,
        relationships,
        maxDepth,
        currentDepth + 1
      ),
    };
    rows.push(childRow);
  }

  return rows;
}

/**
 * Flatten the tree into a list for rendering.
 */
function flattenTree(
  rows: DescendantRow[],
  collapsed: Set<string>
): DescendantRow[] {
  const result: DescendantRow[] = [];
  for (const row of rows) {
    result.push(row);
    if (!collapsed.has(row.person.personId) && row.children.length > 0) {
      result.push(...flattenTree(row.children, collapsed));
    }
  }
  return result;
}

function sortRows(rows: DescendantRow[], field: SortField, dir: SortDir): DescendantRow[] {
  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    if (field === 'name') {
      const na = `${a.person.firstName} ${a.person.lastName}`.toLowerCase();
      const nb = `${b.person.firstName} ${b.person.lastName}`.toLowerCase();
      cmp = na.localeCompare(nb);
    } else {
      const da = a.person.birthDate || '';
      const db = b.person.birthDate || '';
      cmp = da.localeCompare(db);
    }
    return dir === 'desc' ? -cmp : cmp;
  });

  return sorted.map((row) => ({
    ...row,
    children: sortRows(row.children, field, dir),
  }));
}

export function DescendancyListPanel({
  personId,
  persons,
  unions,
  relationships,
  onClose,
  onPersonSelect,
}: DescendancyListPanelProps) {
  const { isMobile } = useResponsive();
  const [maxDepth, setMaxDepth] = useState(5);
  const [sortField, setSortField] = useState<SortField>('birthDate');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const rootPerson = useMemo(
    () => persons.find((p) => p.personId === personId),
    [persons, personId]
  );

  const descendantTree = useMemo(() => {
    const tree = buildDescendantTree(personId, persons, unions, relationships, maxDepth);
    return sortRows(tree, sortField, sortDir);
  }, [personId, persons, unions, relationships, maxDepth, sortField, sortDir]);

  const flatList = useMemo(
    () => flattenTree(descendantTree, collapsed),
    [descendantTree, collapsed]
  );

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  if (!rootPerson) {
    return (
      <div className="p-4 text-gray-500 text-sm">Person not found.</div>
    );
  }

  return (
    <div className={`${isMobile ? 'fixed inset-0 z-50' : 'h-full border-l border-gray-200'} flex flex-col bg-white`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Descendants of {rootPerson.firstName} {rootPerson.lastName}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {flatList.length} descendant{flatList.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-100 text-sm">
        <label className="flex items-center gap-1.5 text-gray-600">
          Depth:
          <select
            value={maxDepth}
            onChange={(e) => setMaxDepth(Number(e.target.value))}
            className="h-7 rounded border border-gray-300 bg-white px-1.5 text-xs"
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Table */}
      <div className={`flex-1 overflow-auto ${isMobile ? 'pb-16' : ''}`}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600">
                <button
                  onClick={() => toggleSort('name')}
                  className="flex items-center gap-1 hover:text-gray-900"
                >
                  Name
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">
                <button
                  onClick={() => toggleSort('birthDate')}
                  className="flex items-center gap-1 hover:text-gray-900"
                >
                  Birth
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">
                Birth Place
              </th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">
                Death
              </th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">
                Occupation
              </th>
            </tr>
          </thead>
          <tbody>
            {flatList.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No descendants found.
                </td>
              </tr>
            ) : (
              flatList.map((row) => {
                const hasChildren = row.children.length > 0;
                const isCollapsed = collapsed.has(row.person.personId);
                const indent = row.generation * 20;

                return (
                  <tr
                    key={row.person.personId}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                    onClick={() => onPersonSelect?.(row.person.personId)}
                  >
                    <td className="px-4 py-2">
                      <div
                        className="flex items-center gap-1"
                        style={{ paddingLeft: `${indent}px` }}
                      >
                        {hasChildren ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCollapse(row.person.personId);
                            }}
                            className="p-0.5 rounded hover:bg-gray-200 flex-shrink-0"
                          >
                            {isCollapsed ? (
                              <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                            )}
                          </button>
                        ) : (
                          <span className="w-4.5" />
                        )}
                        <span className="text-gray-900 font-medium">
                          {row.person.firstName} {row.person.lastName}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-1">
                          G{row.generation}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                      {row.person.birthDate || '\u2014'}
                    </td>
                    <td className="px-3 py-2 text-gray-600 truncate max-w-[140px]">
                      {row.person.birthPlace || '\u2014'}
                    </td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                      {row.person.deathDate || (row.person.isLiving ? 'Living' : '\u2014')}
                    </td>
                    <td className="px-3 py-2 text-gray-600 truncate max-w-[120px]">
                      {row.person.occupation || '\u2014'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
