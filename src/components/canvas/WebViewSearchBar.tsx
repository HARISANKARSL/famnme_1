import { Search } from 'lucide-react'

export function WebViewSearchBar({ onSearch }: { onSearch: () => void }) {
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-[90%] max-w-sm">
      <button
        onClick={onSearch}
        className="w-full flex items-center gap-2 bg-white/90 backdrop-blur-sm
                   border border-gray-200 rounded-full px-4 py-2.5 shadow-md
                   text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        <Search className="w-4 h-4 shrink-0" />
        <span>Search family members…</span>
      </button>
    </div>
  )
}
