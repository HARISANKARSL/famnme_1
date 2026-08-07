import { useState } from 'react';
import { Camera, Video, Music, FileText, HardDrive, ChevronDown, ChevronUp } from 'lucide-react';

export interface StorageBucketData {
  bytes: number;
  count: number;
}

export interface StorageBreakdownData {
  photos: StorageBucketData;
  videos: StorageBucketData;
  audio: StorageBucketData;
  documents: StorageBucketData;
  thumbnails: StorageBucketData;
  other: StorageBucketData;
}

interface StorageBreakdownWidgetProps {
  totalBytes: number;
  maxBytes: number;
  fileCount: number;
  breakdown: StorageBreakdownData | null;
  compact?: boolean;
}

const SEGMENTS = [
  { key: 'photos' as const, label: 'Photos', color: '#C2A46D', icon: Camera },
  { key: 'videos' as const, label: 'Videos', color: '#8B7355', icon: Video },
  { key: 'audio' as const, label: 'Audio', color: '#D4B896', icon: Music },
  { key: 'documents' as const, label: 'Documents', color: '#A8894F', icon: FileText },
] as const;

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export default function StorageBreakdownWidget({
  totalBytes,
  maxBytes,
  fileCount,
  breakdown,
  compact = false,
}: StorageBreakdownWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const usagePercent = Math.min((totalBytes / maxBytes) * 100, 100);
  const isWarning = totalBytes > 5 * 1024 * 1024 * 1024;
  const isDanger = totalBytes > 8 * 1024 * 1024 * 1024;

  // Build segment widths
  const segments = breakdown
    ? SEGMENTS.map(seg => ({
        ...seg,
        bytes: breakdown[seg.key].bytes,
        count: breakdown[seg.key].count,
        widthPercent: maxBytes > 0 ? (breakdown[seg.key].bytes / maxBytes) * 100 : 0,
      })).filter(s => s.bytes > 0)
    : [];

  // Compact mobile layout
  if (compact) {
    return (
      <div className="mx-4 mb-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-2 py-2"
        >
          <HardDrive className="w-3.5 h-3.5 text-[#8B7355] dark:text-[#666] flex-shrink-0" strokeWidth={1.5} />
          <div className="flex-1 min-w-0">
            <div className="h-1.5 rounded-full bg-[#E2E8F0]/40 dark:bg-[#2a2a2a] overflow-hidden">
              {breakdown ? (
                <div className="h-full flex">
                  {segments.map(seg => (
                    <div
                      key={seg.key}
                      className="h-full first:rounded-l-full last:rounded-r-full"
                      style={{ width: `${seg.widthPercent}%`, backgroundColor: seg.color }}
                    />
                  ))}
                </div>
              ) : (
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${usagePercent}%`,
                    background: isDanger
                      ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                      : isWarning
                      ? 'linear-gradient(90deg, #D4B896, #A8894F)'
                      : 'linear-gradient(90deg, #C2A46D, #A8894F)',
                  }}
                />
              )}
            </div>
          </div>
          <span className="text-[10px] text-[#8B7355] dark:text-[#666] whitespace-nowrap flex-shrink-0">
            {formatSize(totalBytes)} / {formatSize(maxBytes)}
          </span>
          {breakdown && (
            expanded
              ? <ChevronUp className="w-3 h-3 text-[#B8A090] dark:text-[#555] flex-shrink-0" />
              : <ChevronDown className="w-3 h-3 text-[#B8A090] dark:text-[#555] flex-shrink-0" />
          )}
        </button>

        {expanded && breakdown && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pb-2 pl-5.5">
            {segments.map(seg => {
              const Icon = seg.icon;
              return (
                <div key={seg.key} className="flex items-center gap-1.5">
                  <Icon className="w-3 h-3 flex-shrink-0" style={{ color: seg.color }} strokeWidth={1.5} />
                  <span className="text-[10px] text-[#8B7355] dark:text-[#888]">{seg.label}</span>
                  <span className="text-[10px] font-medium text-[#3D2E1F] dark:text-[#ccc] ml-auto">{formatSize(seg.bytes)}</span>
                </div>
              );
            })}
            <div className="col-span-2 text-[9px] text-[#B8A090] dark:text-[#555] mt-0.5">
              {fileCount} files stored
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop sidebar layout
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold text-[#8B7355] dark:text-[#666] uppercase tracking-wider">Storage</span>
        <span className="text-[10px] text-[#8B7355] dark:text-[#666]">
          {formatSize(totalBytes)} / {formatSize(maxBytes)}
        </span>
      </div>

      {/* Segmented progress bar */}
      <div
        className="h-2 rounded-full bg-[#E2E8F0]/40 dark:bg-[#2a2a2a] overflow-hidden transition-shadow duration-300"
        style={
          isDanger
            ? { boxShadow: '0 0 6px rgba(239,68,68,0.3)' }
            : isWarning
            ? { boxShadow: '0 0 6px rgba(56,189,248,0.25)' }
            : undefined
        }
      >
        {breakdown && segments.length > 0 ? (
          <div className="h-full flex">
            {segments.map((seg, i) => (
              <div
                key={seg.key}
                className="h-full transition-all duration-500"
                style={{
                  width: `${seg.widthPercent}%`,
                  backgroundColor: seg.color,
                  borderRadius:
                    i === 0 && i === segments.length - 1
                      ? '9999px'
                      : i === 0
                      ? '9999px 0 0 9999px'
                      : i === segments.length - 1
                      ? '0 9999px 9999px 0'
                      : undefined,
                }}
              />
            ))}
          </div>
        ) : (
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${usagePercent}%`,
              background: isDanger
                ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                : isWarning
                ? 'linear-gradient(90deg, #D4B896, #A8894F)'
                : 'linear-gradient(90deg, #C2A46D, #A8894F)',
            }}
          />
        )}
      </div>

      {/* Legend */}
      {breakdown && segments.length > 0 && (
        <div className="mt-2.5 space-y-1">
          {segments.map(seg => {
            const Icon = seg.icon;
            return (
              <div key={seg.key} className="flex items-center gap-1.5">
                <Icon className="w-3 h-3 flex-shrink-0" style={{ color: seg.color }} strokeWidth={1.5} />
                <span className="text-[10px] text-[#8B7355] dark:text-[#888] flex-1">{seg.label}</span>
                <span className="text-[10px] text-[#8B7355] dark:text-[#888]">{seg.count}</span>
                <span className="text-[10px] font-medium text-[#3D2E1F] dark:text-[#ccc] w-14 text-right">{formatSize(seg.bytes)}</span>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[9px] text-[#B8A090] dark:text-[#555] mt-1.5">{fileCount} files stored</p>
    </div>
  );
}
