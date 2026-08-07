import { MoreVertical, Users, Calendar } from 'lucide-react';
import type { TreeMetadata } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

export interface TreeCardProps {
  tree: TreeMetadata;
  isActive: boolean;
  onClick: () => void;
  onRename: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSettings?: () => void;
  onExportGedcom?: () => void;
  onExportCsv?: () => void;
}

export function TreeCard({
  tree,
  isActive,
  onClick,
  onRename,
  onDelete,
  onDuplicate,
  onSettings,
  onExportGedcom,
  onExportCsv,
}: TreeCardProps) {
  let lastModified = 'Never';
  try {
    if (tree.updatedAt) {
      const date = new Date(tree.updatedAt);
      if (!isNaN(date.getTime())) {
        lastModified = formatDistanceToNow(date, { addSuffix: true });
      }
    }
  } catch (err) {
    console.error('Invalid date for tree.updatedAt:', tree.updatedAt);
  }


  return (
    <div
      className={`
        group relative rounded-lg border transition-all duration-300
        hover:shadow-md hover:-translate-y-0.5
        ${
          isActive
            ? 'border-[#2F3E8F] bg-[#E8EDFF] dark:border-[#7B8FD4] dark:bg-[#1E293B]/70'
            : 'border-[#EFE6D6] bg-[#F6F2EA] hover:border-[#C2A46D]/60 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700'
        }
      `}
    >
      {/* Clickable Area */}
      <div 
        onClick={onClick}
        className="p-4 cursor-pointer"
      >
        {/* Active indicator */}
        {isActive && (
          <div className="absolute top-2 right-2 w-2 h-2 bg-[#2F3E8F] dark:bg-[#93C5FD] rounded-full" />
        )}

        {/* Tree name */}
        <div className="flex items-start justify-between mb-2">
          <h3 className={`text-lg font-semibold pr-10 transition-colors ${isActive ? 'text-[#2F3E8F] dark:text-[#93C5FD]' : 'text-gray-900 dark:text-zinc-100'}`}>
            {tree.treeName}
          </h3>
        </div>

        {/* Tree metadata */}
        <div className={`space-y-1 text-sm ${isActive ? 'text-[#2F3E8F]/80 dark:text-zinc-300' : 'text-gray-600 dark:text-zinc-400'}`}>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{tree.personCount} {tree.personCount === 1 ? 'person' : 'people'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Modified {lastModified}</span>
          </div>
        </div>

        {/* Description (if exists) */}
        {tree.description && (
          <p className={`mt-2 text-sm line-clamp-2 ${isActive ? 'text-[#2F3E8F]/70 dark:text-zinc-400' : 'text-gray-500 dark:text-zinc-500'}`}>
            {tree.description}
          </p>
        )}
      </div>

      {/* Action menu - positioned outside the clickable div */}
      <div className="absolute top-3 right-3 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={`p-1 rounded-full transition-colors focus:outline-none ${isActive ? 'hover:bg-white/40 dark:hover:bg-zinc-800' : 'hover:bg-gray-200/50 dark:hover:bg-zinc-850'}`}
          >
            <MoreVertical className={`h-4 w-4 ${isActive ? 'text-[#2F3E8F] dark:text-zinc-300' : 'text-gray-500 dark:text-zinc-400'}`} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onRename}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              Duplicate
            </DropdownMenuItem>
            {onExportGedcom && (
              <DropdownMenuItem onClick={onExportGedcom}>
                Export GEDCOM
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={onDelete}
              className="text-red-600 focus:text-red-600"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
