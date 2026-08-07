/**
 * ServiceTimingsCard — Displays structured service timings for a sacred place.
 * Shows regular services, seasonal variations, and special day timings.
 */

import { Clock, Sun, Star, AlertCircle } from 'lucide-react';
import type { ServiceTimings } from '@/types';

interface ServiceTimingsCardProps {
  timings: ServiceTimings;
  /** Source of the timings data */
  timingsSource?: 'ai' | 'admin';
}

export function ServiceTimingsCard({ timings, timingsSource }: ServiceTimingsCardProps) {
  const hasRegular = timings.regular && timings.regular.length > 0;
  const hasSeasonal = timings.seasonal && timings.seasonal.length > 0;
  const hasSpecial = timings.specialDays && timings.specialDays.length > 0;

  if (!hasRegular && !hasSeasonal && !hasSpecial) return null;

  return (
    <div className="space-y-3">
      {/* Regular Services */}
      {hasRegular && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="w-3.5 h-3.5 text-[#2F3E8F]" />
            <p className="text-[12px] font-semibold text-[#3A342B] dark:text-[#f5f5f5] uppercase tracking-wider">
              Regular Services
            </p>
          </div>
          <div className="bg-white dark:bg-[#1E1E1E] rounded-xl border border-[#E2DBCE]/60 dark:border-[#2a2a2a] overflow-hidden">
            <div className="divide-y divide-[#E2DBCE]/40 dark:divide-[#2a2a2a]/60">
              {timings.regular.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2">
                  <span className="text-[13px] text-[#3D2E1F] dark:text-[#f5f5f5] font-medium flex-1 min-w-0 truncate">
                    {entry.name}
                  </span>
                  <span className="text-[12px] text-[#2F3E8F] dark:text-blue-400 font-medium whitespace-nowrap shrink-0">
                    {entry.time}
                  </span>
                  <span className="text-[11px] text-[#8B7355] dark:text-[#A19F9D] whitespace-nowrap shrink-0 hidden sm:inline">
                    {entry.days}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Seasonal Timings */}
      {hasSeasonal && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Sun className="w-3.5 h-3.5 text-[#C2A46D]" />
            <p className="text-[12px] font-semibold text-[#3A342B] dark:text-[#f5f5f5] uppercase tracking-wider">
              Seasonal Changes
            </p>
          </div>
          <div className="space-y-1.5">
            {timings.seasonal!.map((entry, i) => (
              <div key={i} className="px-3 py-2 rounded-lg bg-[#FBF7EF] dark:bg-[#1E1E1E] border border-[#E2DBCE]/40 dark:border-[#2a2a2a]">
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-medium text-[#3D2E1F] dark:text-[#f5f5f5] flex-1 min-w-0 truncate">{entry.name}</p>
                  <p className="text-[11px] text-[#8B7355] dark:text-[#A19F9D] shrink-0">{entry.period}</p>
                </div>
                <p className="text-[11px] text-[#5A4D3F] dark:text-[#B8A090] mt-0.5">{entry.timings}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Special Days */}
      {hasSpecial && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Star className="w-3.5 h-3.5 text-[#C2A46D]" />
            <p className="text-[12px] font-semibold text-[#3A342B] dark:text-[#f5f5f5] uppercase tracking-wider">
              Special Days
            </p>
          </div>
          <div className="space-y-1.5">
            {timings.specialDays!.map((entry, i) => (
              <div key={i} className="px-3 py-2 rounded-lg bg-[#FBF7EF] dark:bg-[#1E1E1E] border border-[#E2DBCE]/40 dark:border-[#2a2a2a]">
                <p className="text-[12px] font-medium text-[#3D2E1F] dark:text-[#f5f5f5]">{entry.name}</p>
                <p className="text-[11px] text-[#5A4D3F] dark:text-[#B8A090] mt-0.5">{entry.timing}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-1.5 px-2 py-1.5">
        <AlertCircle className="w-3 h-3 text-[#8B7355]/60 mt-0.5 shrink-0" />
        <p className="text-[10px] text-[#8B7355]/70 dark:text-[#A19F9D]/70 leading-relaxed">
          {timingsSource === 'admin'
            ? 'Timings verified by admin. May still vary on holidays.'
            : 'Timings are approximate and AI-generated. Please verify with the institution before visiting.'}
        </p>
      </div>
    </div>
  );
}
