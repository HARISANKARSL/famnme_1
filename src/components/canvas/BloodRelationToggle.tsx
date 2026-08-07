/**
 * BloodRelationToggle Component
 *
 * Simple toggle between "All Relations" and "Blood Relations Only" modes.
 * Used to filter the family tree view to show only blood relations by default,
 * with the option to expand non-blood families inline.
 */

import type { BloodRelationMode } from '@/types';

export interface BloodRelationToggleProps {
  mode: BloodRelationMode;
  onModeChange: (mode: BloodRelationMode) => void;
  compact?: boolean;
}

export function BloodRelationToggle({ mode, onModeChange, compact }: BloodRelationToggleProps) {
  return (
    <div className={compact ? 'p-2' : 'bg-white/95 border border-gray-300 rounded-lg shadow-md p-2'}>
      <label className="text-xs font-semibold text-gray-700 mb-1 block">
        View Mode
      </label>
      <div className="flex gap-2">
        <button
          onClick={() => onModeChange('blood-only')}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            mode === 'blood-only'
              ? 'bg-[#2F3E8F] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Blood Relations
        </button>
        <button
          onClick={() => onModeChange('all')}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            mode === 'all'
              ? 'bg-[#2F3E8F] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Relations
        </button>
      </div>
    </div>
  );
}
