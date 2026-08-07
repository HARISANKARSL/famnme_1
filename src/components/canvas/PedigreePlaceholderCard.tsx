/**
 * PedigreePlaceholderCard - Dashed placeholder matching Ancestry.com dark style
 * Memoized to prevent re-renders during pan/zoom.
 */

import { memo } from 'react';
import { Plus } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface PedigreePlaceholderCardProps {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  childPersonId: string;
  onAdd: () => void;
}

export const PedigreePlaceholderCard = memo(function PedigreePlaceholderCard({
  x, y, width, height, label, onAdd,
}: PedigreePlaceholderCardProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div
      className="absolute cursor-pointer rounded-lg flex items-center justify-center gap-2 pedigree-node"
      style={{
        left: x,
        top: y,
        width,
        height,
        border: isDark ? '2px dashed #4b5563' : '2px dashed #d1ccc6',
        backgroundColor: isDark ? 'rgba(36, 36, 36, 0.6)' : 'rgba(250, 246, 241, 0.6)',
        transition: 'left 0.5s ease, top 0.5s ease, opacity 0.3s ease, border-color 0.2s ease',
      }}
      onClick={onAdd}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = isDark ? '#93C5FD' : '#2F3E8F';
        e.currentTarget.style.backgroundColor = isDark ? 'rgba(36, 36, 36, 0.9)' : 'rgba(250, 246, 241, 0.9)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = isDark ? '#4b5563' : '#d1ccc6';
        e.currentTarget.style.backgroundColor = isDark ? 'rgba(36, 36, 36, 0.6)' : 'rgba(250, 246, 241, 0.6)';
      }}
    >
      <div className="w-6 h-6 rounded-full border-2 border-gray-400 dark:border-zinc-500 flex items-center justify-center">
        <Plus className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-400" />
      </div>
      <span className="text-sm text-gray-500 dark:text-zinc-400">{label}</span>
    </div>
  );
});
