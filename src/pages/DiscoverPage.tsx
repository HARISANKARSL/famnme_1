import {
  Map as MapIcon, Clock, BarChart3, Image, Route,
  Lightbulb, Merge, List, ArrowLeft,
} from 'lucide-react'

interface DiscoverPageProps {
  onClose: () => void
  onOpenMigrationMap?: () => void
  onOpenTimeline?: () => void
  onOpenStatistics?: () => void
  onOpenMemories?: () => void
  onOpenPathfinder?: () => void
  onOpenSuggestions?: () => void
  onOpenDuplicates?: () => void
  onOpenDescendancy?: () => void
}

interface DiscoverCard {
  id: string
  label: string
  description: string
  icon: typeof MapIcon
  iconColor: string
  bgColor: string
  action?: () => void
}

export function DiscoverPage({
  onClose,
  onOpenMigrationMap,
  onOpenTimeline,
  onOpenStatistics,
  onOpenMemories,
  onOpenPathfinder,
  onOpenSuggestions,
  onOpenDuplicates,
  onOpenDescendancy,
}: DiscoverPageProps) {
  const cards: DiscoverCard[] = [
    {
      id: 'migration-map',
      label: 'Migration Map',
      description: 'See where your family has lived',
      icon: MapIcon,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/10',
      action: onOpenMigrationMap,
    },
    {
      id: 'timeline',
      label: 'Timeline',
      description: 'Life events in chronological order',
      icon: Clock,
      iconColor: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-900/10',
      action: onOpenTimeline,
    },
    {
      id: 'statistics',
      label: 'Statistics',
      description: 'Numbers and insights about your tree',
      icon: BarChart3,
      iconColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/10',
      action: onOpenStatistics,
    },
    {
      id: 'memories',
      label: 'Memories',
      description: 'Photos, stories, and moments',
      icon: Image,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/10',
      action: onOpenMemories,
    },
    {
      id: 'pathfinder',
      label: 'Relationship Finder',
      description: 'How are two people related?',
      icon: Route,
      iconColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/10',
      action: onOpenPathfinder,
    },
    {
      id: 'suggestions',
      label: 'Smart Suggestions',
      description: 'Missing info and improvements',
      icon: Lightbulb,
      iconColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/10',
      action: onOpenSuggestions,
    },
    {
      id: 'duplicates',
      label: 'Duplicate Detection',
      description: 'Find and merge duplicate entries',
      icon: Merge,
      iconColor: 'text-rose-600',
      bgColor: 'bg-rose-50 dark:bg-rose-900/10',
      action: onOpenDuplicates,
    },
    {
      id: 'descendancy',
      label: 'Descendancy List',
      description: 'All descendants of a person',
      icon: List,
      iconColor: 'text-teal-600',
      bgColor: 'bg-teal-50 dark:bg-teal-900/10',
      action: onOpenDescendancy,
    },
  ]

  return (
    <div className="h-full bg-[#F6F2EA] dark:bg-[#121212] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#1E1E1E]/80 backdrop-blur-sm border-b border-[#E2E8F0]/60 dark:border-[#2a2a2a] px-4 py-3 flex items-center gap-3">
        <button
          onClick={onClose}
          className="p-1.5 -ml-1 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[#3D2E1F] dark:text-[#f5f5f5]" />
        </button>
        <h1 className="text-lg font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">Discover</h1>
      </div>

      {/* Card Grid */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {cards.filter(c => !!c.action).map(card => {
          const Icon = card.icon
          return (
            <button
              key={card.id}
              onClick={() => { card.action?.(); onClose(); }}
              className="flex flex-col items-center text-center p-4 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-[#E2E8F0]/60 dark:border-[#2a2a2a] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 min-h-[120px] justify-center gap-2"
            >
              <div className={`w-12 h-12 rounded-xl ${card.bgColor} flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${card.iconColor}`} />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-[#3D2E1F] dark:text-[#e0e0e0]">{card.label}</div>
                <div className="text-[11px] text-[#8B7355] dark:text-[#999] mt-0.5 leading-tight">{card.description}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
