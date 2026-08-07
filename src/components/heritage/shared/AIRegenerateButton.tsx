import { RefreshCw, Sparkles } from 'lucide-react'

interface AIRegenerateButtonProps {
  onClick: () => void
  loading?: boolean
  source?: 'ai' | 'template' | 'unavailable' | null
  label?: string
}

export function AIRegenerateButton({
  onClick,
  loading = false,
  source,
  label = 'Regenerate',
}: AIRegenerateButtonProps) {
  return (
    <div className="inline-flex items-center gap-2">
      {source === 'ai' && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#C2A46D]/20 text-[#8B6F3A] ring-1 ring-[#C2A46D]/30">
          <Sparkles className="w-3 h-3" />
          AI
        </span>
      )}
      {source === 'unavailable' && (
        <span className="text-[10px] text-[#8B7355]/70">AI unavailable</span>
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-[#8B6F3A] hover:text-[#2F3E8F] hover:bg-[#C2A46D]/10 transition-colors disabled:opacity-60"
      >
        <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Refreshing…' : label}
      </button>
    </div>
  )
}
