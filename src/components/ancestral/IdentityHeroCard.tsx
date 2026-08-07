import { RefreshCw, Gem } from 'lucide-react'
import { Chip } from './ui'

interface IdentityHeroCardProps {
  narrative: string
  heritageTags: string[]
  isSparse: boolean
  loading: boolean
  regenerating: boolean
  onRegenerate: () => void
}

export function IdentityHeroCard({
  narrative,
  heritageTags,
  isSparse,
  loading,
  regenerating,
  onRegenerate,
}: IdentityHeroCardProps) {
  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#3D2E1F] via-[#5C4A2E] to-[#C2A46D]">
      <div className="absolute top-0 right-0 w-44 h-44 bg-[#2A5F4B]/[0.14] rounded-full -translate-y-16 translate-x-12" />
      <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-[#C2A46D]/[0.15] rounded-full translate-y-14" />

      <div className="relative p-5 md:p-7">
        <div className="flex items-center gap-2 mb-3">
          <Gem className="w-4 h-4 text-[#F6F2EA]/80" strokeWidth={1.8} />
          <span className="text-[11px] uppercase tracking-[0.12em] text-[#F6F2EA]/80 font-semibold">
            Your story
          </span>
        </div>

        {loading ? (
          <div className="space-y-2">
            <div className="h-4 bg-white/[0.12] rounded animate-pulse w-3/4" />
            <div className="h-4 bg-white/[0.12] rounded animate-pulse w-full" />
            <div className="h-4 bg-white/[0.12] rounded animate-pulse w-2/3" />
          </div>
        ) : (
          <p className="text-[15px] md:text-[17px] leading-relaxed text-white font-light">
            {narrative}
          </p>
        )}

        {heritageTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {heritageTags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/[0.14] text-white/90 border border-white/[0.18] backdrop-blur-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {!isSparse && !loading && (
          <button
            onClick={onRegenerate}
            disabled={regenerating}
            className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium bg-white/[0.16] hover:bg-white/[0.24] text-white/95 border border-white/[0.22] transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
            {regenerating ? 'Refreshing insight...' : 'Regenerate insight'}
          </button>
        )}

        {isSparse && !loading && (
          <div className="mt-4 inline-block">
            <Chip variant="gold">Complete your tree to unlock deeper insights</Chip>
          </div>
        )}
      </div>
    </div>
  )
}
