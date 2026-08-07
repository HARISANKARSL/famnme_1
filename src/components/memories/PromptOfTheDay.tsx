import { useMemo, useState } from 'react'
import { Lightbulb, Shuffle, X as XIcon } from 'lucide-react'
import {
  getPromptOfTheDay, PROMPT_CATEGORY_COLORS, MEMORY_PROMPTS, type MemoryPrompt,
} from '@/data/memoryPrompts'

interface PromptOfTheDayProps {
  onStartPrompt: (title: string, textContent: string, category?: string) => void
  inline?: boolean
}

const SKIP_KEY = 'memoryPrompt.skippedFor'

function isSkippedToday(): boolean {
  try { return localStorage.getItem(SKIP_KEY) === new Date().toISOString().slice(0, 10) } catch { return false }
}
function skipToday() {
  try { localStorage.setItem(SKIP_KEY, new Date().toISOString().slice(0, 10)) } catch { /* noop */ }
}

export function PromptOfTheDay({ onStartPrompt, inline = false }: PromptOfTheDayProps) {
  const seedPrompt = useMemo(() => getPromptOfTheDay(), [])
  const [prompt, setPrompt] = useState<MemoryPrompt>(seedPrompt)
  const [hidden, setHidden] = useState<boolean>(() => isSkippedToday())

  if (hidden) return null

  const colors = PROMPT_CATEGORY_COLORS[prompt.category]

  const shuffle = () => {
    // Pick a different prompt at random (avoid repeats when possible)
    let next = prompt
    for (let i = 0; i < 8 && next.id === prompt.id; i++) {
      next = MEMORY_PROMPTS[Math.floor(Math.random() * MEMORY_PROMPTS.length)]
    }
    setPrompt(next)
  }

  const handleSkip = () => {
    skipToday()
    setHidden(true)
  }

  const content = (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-900/30">
          <Lightbulb className="w-3.5 h-3.5 text-[#2F3E8F] dark:text-blue-400" strokeWidth={1.5} />
        </div>
        <span className="text-[13px] font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">Prompt of the Day</span>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} ${colors.border} border`}>
          {prompt.category}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={shuffle}
            aria-label="Shuffle to a different prompt"
            title="Shuffle"
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[#5B5449] dark:text-[#888] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F3E8F]/40"
          >
            <Shuffle className="w-3.5 h-3.5" strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={handleSkip}
            aria-label="Skip prompts for today"
            title="Skip for today"
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[#5B5449] dark:text-[#888] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F3E8F]/40"
          >
            <XIcon className="w-3.5 h-3.5" strokeWidth={1.8} />
          </button>
        </div>
      </div>
      <button
        onClick={() => onStartPrompt(
          prompt.suggestedTitle,
          `## ${prompt.prompt}\n\n`,
          prompt.suggestedCategory,
        )}
        className="w-full text-left group"
      >
        <p className="text-[14px] text-[#3D2E1F] dark:text-[#e0e0e0] leading-relaxed italic">
          "{prompt.prompt}"
        </p>
        <p className="text-[12px] text-[#2F3E8F] font-medium mt-2 group-hover:underline">
          Start writing this memory &rarr;
        </p>
      </button>
    </>
  )

  if (inline) {
    return (
      <div className="rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#E2E8F0]/60 dark:border-[#2a2a2a] p-3 mx-1 shadow-sm">
        {content}
      </div>
    )
  }

  return (
    <div className="border-b border-[#E2E8F0]/60 dark:border-[#2a2a2a]">
      <div className="px-5 sm:px-8 py-4">
        {content}
      </div>
    </div>
  )
}
