import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { Plus } from 'lucide-react'

interface PlaceholderNodeProps {
  data: {
    label: string
    onAdd?: () => void
  }
}

export const PlaceholderNode = memo(({ data }: PlaceholderNodeProps) => {
  return (
    <div
      className="relative bg-transparent border-2 border-dashed border-gray-400 rounded-md w-[120px] h-[180px] flex flex-col items-center justify-center cursor-pointer hover:border-gray-300 hover:bg-gray-600/20 transition-all"
      onClick={data.onAdd}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />

      {/* Plus Icon */}
      <div className="bg-gray-500 rounded-full p-2 mb-2">
        <Plus className="h-6 w-6 text-white" />
      </div>

      {/* Label */}
      <div className="text-xs text-gray-300 text-center px-2">
        {data.label}
      </div>

      <Handle type="source" position={Position.Bottom} className="opacity-0" />
      <Handle type="source" position={Position.Left} className="opacity-0" />
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  )
})

PlaceholderNode.displayName = 'PlaceholderNode'
