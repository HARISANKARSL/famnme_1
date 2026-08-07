import { useMemo } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RelationshipSelectionPanelProps {
  memberName: string
  context: 'parent' | 'sibling'
  onClose: () => void
  onSelectRelationship: (relationship: 'father' | 'mother' | 'brother' | 'sister') => void
}

export function RelationshipSelectionPanel({ memberName, context, onClose, onSelectRelationship }: RelationshipSelectionPanelProps) {
  const relationships = useMemo(() => {
    const all = [
      { value: 'father' as const, label: 'Father' },
      { value: 'mother' as const, label: 'Mother' },
      { value: 'brother' as const, label: 'Brother' },
      { value: 'sister' as const, label: 'Sister' },
    ]

    if (context === 'parent') {
      return all.filter(r => r.value === 'father' || r.value === 'mother')
    }
    if (context === 'sibling') {
      return all.filter(r => r.value === 'brother' || r.value === 'sister')
    }
    return all
  }, [context])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Right Sidebar Panel */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white dark:bg-[#1E1E1E] shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b dark:border-stone-850 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-stone-100">
              Add {context} for {memberName}
            </h2>
            <p className="text-sm text-gray-600 dark:text-stone-400 mt-1">
              {context === 'parent' ? 'Select which parent to add' : 'Select which sibling to add'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-stone-400 dark:hover:text-stone-200 dark:hover:bg-stone-800"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Relationship Grid */}
        <div className="flex-1 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {relationships.map((rel) => (
              <button
                key={rel.value}
                onClick={() => onSelectRelationship(rel.value)}
                className="p-4 border-2 border-gray-300 dark:border-stone-700 rounded-lg hover:border-[#2F3E8F] dark:hover:border-[#8CA0FF] hover:bg-[#E8EDFF] dark:hover:bg-[#2F3E8F]/20 transition-colors text-center font-medium text-gray-900 dark:text-stone-100 dark:hover:text-white"
              >
                {rel.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
