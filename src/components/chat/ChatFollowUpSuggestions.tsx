/**
 * ChatFollowUpSuggestions — Renders AI-generated contextual follow-up question pills.
 *
 * Displayed below the latest assistant message. Each pill sends the suggestion as a new message.
 */

interface ChatFollowUpSuggestionsProps {
  suggestions: string[]
  onSelect: (suggestion: string) => void
  isLoading?: boolean
}

export function ChatFollowUpSuggestions({ suggestions, onSelect, isLoading }: ChatFollowUpSuggestionsProps) {
  if (!suggestions.length || isLoading) return null

  return (
    <div className="px-4 pb-2 flex flex-wrap gap-1.5">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          onClick={() => onSelect(suggestion)}
          className="text-[11px] px-3 py-1.5 rounded-full
                     border border-[#2F3E8F]/20 dark:border-[#5A6BFF]/20
                     bg-[#2F3E8F]/5 dark:bg-[#5A6BFF]/8
                     text-[#2F3E8F] dark:text-[#7B8FD4]
                     hover:bg-[#2F3E8F]/12 dark:hover:bg-[#5A6BFF]/15
                     hover:border-[#2F3E8F]/35 dark:hover:border-[#5A6BFF]/35
                     active:scale-[0.97] transition-all
                     max-w-full truncate"
        >
          {suggestion}
        </button>
      ))}
    </div>
  )
}
