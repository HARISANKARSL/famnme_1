import { useTreeStore } from '@/store/treeStore'

interface TopNavigationProps {
  onAddMember: () => void
}

export function TopNavigation({ }: TopNavigationProps) {
  const tree = useTreeStore((state) => state.tree)

  return (
    <nav className="border-b bg-white px-6 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            FamNme
          </div>
        </div>
        <div className="h-6 w-px bg-gray-300" />
        <div className="text-sm text-gray-600">
          {tree?.tree_name || 'My Family Tree'}
        </div>
      </div>
    </nav>
  )
}
