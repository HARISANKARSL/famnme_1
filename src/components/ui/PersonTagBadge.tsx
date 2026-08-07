import { cn } from '@/lib/utils'

// Tag configuration with colors and categories
export const TAG_CONFIG: Record<string, { color: string; bgColor: string; category: string }> = {
  // Research Status
  'Verified': { color: 'text-green-700', bgColor: 'bg-green-100', category: 'Research Status' },
  'To Do': { color: 'text-yellow-700', bgColor: 'bg-yellow-100', category: 'Research Status' },
  'Brick Wall': { color: 'text-red-700', bgColor: 'bg-red-100', category: 'Research Status' },
  'Complete': { color: 'text-[#2F3E8F]', bgColor: 'bg-blue-100', category: 'Research Status' },
  'Hypothesis': { color: 'text-purple-700', bgColor: 'bg-purple-100', category: 'Research Status' },
  // Relationship
  'Adopted': { color: 'text-indigo-700', bgColor: 'bg-indigo-100', category: 'Relationship' },
  'Direct Ancestor': { color: 'text-emerald-700', bgColor: 'bg-emerald-100', category: 'Relationship' },
  'Died Young': { color: 'text-gray-700', bgColor: 'bg-gray-200', category: 'Relationship' },
  'Multiple Spouses': { color: 'text-pink-700', bgColor: 'bg-pink-100', category: 'Relationship' },
  'No Children': { color: 'text-[#2F3E8F]', bgColor: 'bg-blue-100', category: 'Relationship' },
  // Life Experience
  'Immigrant': { color: 'text-cyan-700', bgColor: 'bg-cyan-100', category: 'Life Experience' },
  'Military Service': { color: 'text-blue-800', bgColor: 'bg-blue-100', category: 'Life Experience' },
  'Freedom Fighter': { color: 'text-[#2F3E8F]', bgColor: 'bg-blue-100', category: 'Life Experience' },
  'Religious Leader': { color: 'text-violet-700', bgColor: 'bg-violet-100', category: 'Life Experience' },
}

export const ALL_TAGS = Object.keys(TAG_CONFIG)

export const TAG_CATEGORIES = ['Research Status', 'Relationship', 'Life Experience'] as const

export function getTagsByCategory(): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const [tag, config] of Object.entries(TAG_CONFIG)) {
    if (!result[config.category]) result[config.category] = []
    result[config.category].push(tag)
  }
  return result
}

// --- Tailwind bg-color to raw hex mapping for dots ---
const DOT_COLORS: Record<string, string> = {
  'bg-green-100': '#dcfce7',
  'bg-yellow-100': '#fef9c3',
  'bg-red-100': '#fee2e2',
  'bg-blue-100': '#dbeafe',
  'bg-purple-100': '#f3e8ff',
  'bg-indigo-100': '#e0e7ff',
  'bg-emerald-100': '#d1fae5',
  'bg-gray-200': '#e5e7eb',
  'bg-pink-100': '#fce7f3',
  'bg-orange-100': '#ffedd5',
  'bg-cyan-100': '#cffafe',
  'bg-amber-100': '#fef3c7',
  'bg-violet-100': '#ede9fe',
}

// --- Components ---

interface PersonTagBadgeProps {
  tag: string
  size?: 'sm' | 'md'
  className?: string
}

export function PersonTagBadge({ tag, size = 'md', className }: PersonTagBadgeProps) {
  const config = TAG_CONFIG[tag]
  if (!config) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full font-medium bg-gray-100 text-gray-600',
          size === 'sm' ? 'px-1.5 py-0.5 text-[10px] leading-tight' : 'px-2 py-0.5 text-xs',
          className
        )}
      >
        {tag}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        config.bgColor,
        config.color,
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px] leading-tight' : 'px-2 py-0.5 text-xs',
        className
      )}
    >
      {tag}
    </span>
  )
}

interface PersonTagDotsProps {
  tags: string[]
  maxDots?: number
  className?: string
}

export function PersonTagDots({ tags, maxDots = 3, className }: PersonTagDotsProps) {
  if (!tags || tags.length === 0) return null

  const visible = tags.slice(0, maxDots)
  const overflow = tags.length - maxDots

  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {visible.map((tag) => {
        const config = TAG_CONFIG[tag]
        const bgClass = config?.bgColor ?? 'bg-gray-300'
        const hexColor = DOT_COLORS[bgClass]

        return (
          <span
            key={tag}
            title={tag}
            className="inline-block w-2 h-2 rounded-full shrink-0 border border-white/60"
            style={hexColor ? { backgroundColor: hexColor } : undefined}
          />
        )
      })}
      {overflow > 0 && (
        <span className="text-[9px] text-gray-400 leading-none ml-0.5">+{overflow}</span>
      )}
    </span>
  )
}
