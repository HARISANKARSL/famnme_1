/**
 * SeededFeedFallback — Phase 3 / 6.7
 *
 * When the global Daily Share feed is empty, surface a small set of
 * curated culturally-relevant prompts + family wisdom so the page never
 * feels dead. Each card has a clear "Share your own" CTA that opens the
 * memory composer (or, when not provided, the existing memories panel).
 *
 * The cards are static, public-domain proverbs / rotating gentle nudges
 * — they are clearly marked "From the FamNme team" so they don't appear
 * to be authored by another user.
 */
import { useMemo } from 'react'
import { Gem, ArrowRight } from 'lucide-react'

interface SeededFeedFallbackProps {
  onStartMemory?: () => void
}

const SEEDS = [
  {
    quote: 'A people without the knowledge of their past history, origin and culture is like a tree without roots.',
    attribution: 'Marcus Garvey',
    nudge: 'What story would you tell about your roots?',
  },
  {
    quote: 'When an elder dies, a library burns to the ground.',
    attribution: 'African proverb',
    nudge: 'Capture one of your elder\'s stories before it fades.',
  },
  {
    quote: 'जैसा बीज, वैसा फल। (As the seed, so is the fruit.)',
    attribution: 'Sanskrit proverb',
    nudge: 'Add a memory of one tradition you carry forward.',
  },
  {
    quote: 'The family is one of nature\'s masterpieces.',
    attribution: 'George Santayana',
    nudge: 'Share what makes your family\'s story unique.',
  },
]

export function SeededFeedFallback({ onStartMemory }: SeededFeedFallbackProps) {
  const seed = useMemo(() => {
    // Rotate by date hash so the seed feels different each day but is stable per session.
    const dayKey = Math.floor(Date.now() / 86_400_000)
    return SEEDS[dayKey % SEEDS.length]
  }, [])

  return (
    <div className="px-6 py-10 text-center">
      <div className="inline-flex items-center gap-1.5 mb-3 text-[10px] uppercase tracking-[0.08em] text-[#8B6C2E] dark:text-[#D9BE8A] font-semibold">
        <Gem className="w-3 h-3" />
        From the FamNme team
      </div>
      <p className="font-display text-[18px] md:text-[20px] text-[#3D2E1F] dark:text-[#F3F2F1] leading-snug max-w-md mx-auto">
        “{seed.quote}”
      </p>
      <p className="text-[12px] text-[#8B7355] dark:text-[#A19F9D] mt-2">
        — {seed.attribution}
      </p>
      <p className="text-[13px] text-[#5B5449] dark:text-[#B8B8B8] mt-5">
        {seed.nudge}
      </p>
      {onStartMemory && (
        <button
          onClick={onStartMemory}
          className="mt-4 inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#2F3E8F] hover:bg-[#283576] text-white text-[13px] font-semibold transition-colors"
        >
          Share a story
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
