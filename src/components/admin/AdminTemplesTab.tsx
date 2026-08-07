/**
 * AdminTemplesTab — Temple browser for the admin section.
 *
 * Extracted from the user-facing "Explore All" tab in ReligiousServicesPage.
 * Allows admins to browse all 2600+ temples, filter by state/deity, and view details.
 */

import { useState, useMemo, useCallback } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { getAllTemples, getAllStates, getAllDeities, filterByState, filterByDeity } from '@/data/temples';
import type { Temple } from '@/data/temples/types';
import { TempleCard } from '@/components/temples/TempleCard';
import { TempleDetailPanel } from '@/components/temples/TempleDetailPanel';

type GroupBy = 'state' | 'deity';

export function AdminTemplesTab() {
  const [groupBy, setGroupBy] = useState<GroupBy>('state');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [stateFilter, setStateFilter] = useState('');
  const [deityFilter, setDeityFilter] = useState('');
  const [selectedTemple, setSelectedTemple] = useState<Temple | null>(null);

  const allTemples = useMemo(() => getAllTemples(), []);
  const allStates = useMemo(() => getAllStates(), []);
  const allDeities = useMemo(() => getAllDeities(), []);

  const filteredTemples = useMemo(() => {
    if (stateFilter) return filterByState(stateFilter);
    if (deityFilter) return filterByDeity(deityFilter);
    return allTemples;
  }, [allTemples, stateFilter, deityFilter]);

  const groupedTemples = useMemo(() => {
    const groups = new Map<string, Temple[]>();
    for (const temple of filteredTemples) {
      const key = groupBy === 'state' ? temple.state : (temple.deity ?? temple.denomination ?? 'Other');
      const list = groups.get(key) || [];
      list.push(temple);
      groups.set(key, list);
    }
    return new Map([...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }, [filteredTemples, groupBy]);

  const toggleGroup = useCallback((group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }, []);

  const totalCount = Array.from(groupedTemples.values()).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Temple Database</h2>
          <p className="text-sm text-[#B8A090]">Browse and inspect all temples in the local registry</p>
        </div>
        <span className="text-sm text-[#B8A090]">{totalCount.toLocaleString()} temples</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Group by toggle */}
        <div className="flex items-center bg-[#2C1E14] rounded-lg p-0.5 border border-[#4A3828]">
          <button
            onClick={() => { setGroupBy('state'); setDeityFilter(''); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              groupBy === 'state'
                ? 'bg-[#3D2E20] text-white shadow-sm'
                : 'text-[#B8A090] hover:text-white'
            }`}
          >
            By State
          </button>
          <button
            onClick={() => { setGroupBy('deity'); setStateFilter(''); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              groupBy === 'deity'
                ? 'bg-[#3D2E20] text-white shadow-sm'
                : 'text-[#B8A090] hover:text-white'
            }`}
          >
            By Deity
          </button>
        </div>

        {/* State filter */}
        {groupBy === 'state' && (
          <div className="relative">
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="appearance-none pl-3 pr-7 py-1.5 rounded-lg border border-[#4A3828] bg-[#2C1E14] text-xs text-[#E8D8C8] focus:outline-none focus:ring-1 focus:ring-[#2F3E8F]/50"
            >
              <option value="">All States</option>
              {allStates.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#B8A090] pointer-events-none" />
          </div>
        )}

        {/* Deity filter */}
        {groupBy === 'deity' && (
          <div className="relative">
            <select
              value={deityFilter}
              onChange={(e) => setDeityFilter(e.target.value)}
              className="appearance-none pl-3 pr-7 py-1.5 rounded-lg border border-[#4A3828] bg-[#2C1E14] text-xs text-[#E8D8C8] focus:outline-none focus:ring-1 focus:ring-[#2F3E8F]/50"
            >
              <option value="">All Deities</option>
              {allDeities.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#B8A090] pointer-events-none" />
          </div>
        )}

        {/* Quick expand/collapse */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setExpandedGroups(new Set(groupedTemples.keys()))}
            className="text-xs text-[#2F3E8F] hover:text-[#2F3E8F] transition-colors"
          >
            Expand all
          </button>
          <span className="text-[#4A3828]">·</span>
          <button
            onClick={() => setExpandedGroups(new Set())}
            className="text-xs text-[#B8A090] hover:text-white transition-colors"
          >
            Collapse all
          </button>
        </div>
      </div>

      {/* Temple groups */}
      <div className="space-y-2">
        {Array.from(groupedTemples.entries()).map(([group, temples]) => {
          const isExpanded = expandedGroups.has(group);
          return (
            <div key={group} className="border border-[#4A3828] rounded-xl overflow-hidden">
              <button
                onClick={() => toggleGroup(group)}
                className="w-full flex items-center gap-2 px-4 py-3 bg-[#2C1E14] hover:bg-[#3D2E20] transition-colors text-left"
              >
                <span className="text-sm font-semibold text-[#E8D8C8] flex-1 capitalize">{group}</span>
                <span className="text-xs text-[#B8A090] tabular-nums">{temples.length}</span>
                <ChevronDown className={`w-4 h-4 text-[#B8A090] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
              {isExpanded && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-3 bg-[#1A120B]">
                  {temples.map(temple => (
                    <TempleCard
                      key={temple.templeId}
                      temple={temple}
                      onClick={() => setSelectedTemple(temple)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {groupedTemples.size === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search className="w-10 h-10 text-[#4A3828] mb-3" />
          <p className="text-[#B8A090]">No temples found matching the current filters.</p>
        </div>
      )}

      {/* Temple detail panel */}
      {selectedTemple && (
        <TempleDetailPanel
          temple={selectedTemple}
          onClose={() => setSelectedTemple(null)}
        />
      )}
    </div>
  );
}
