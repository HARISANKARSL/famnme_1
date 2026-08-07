/**
 * ChatToolCallIndicator — Shows active tool calls during streaming.
 *
 * Running: Tool label + spinning icon
 * Done: Tool label + checkmark + result summary (compact)
 */

import { Loader2, Check, X } from 'lucide-react'
import type { ToolCallState } from '@/store/chatStore'

interface ChatToolCallIndicatorProps {
  toolCalls: ToolCallState[]
}

export function ChatToolCallIndicator({ toolCalls }: ChatToolCallIndicatorProps) {
  if (!toolCalls.length) return null

  return (
    <div className="px-4 py-1.5 flex items-start gap-2">
      {/* Avatar column */}
      <div className="w-7 flex-shrink-0" />

      <div className="flex flex-col gap-1 max-w-[80%]">
        {toolCalls.map((tc, idx) => (
          <div
            key={`${tc.name}-${idx}`}
            className={`flex items-center gap-2 text-[11px] px-2.5 py-1.5 rounded-lg
                       transition-all duration-200 ${
              tc.status === 'running'
                ? 'bg-[#2F3E8F]/8 dark:bg-[#5A6BFF]/10 text-[#2F3E8F] dark:text-[#7B8FD4]'
                : tc.success
                  ? 'bg-green-50 dark:bg-green-900/15 text-green-700 dark:text-green-400'
                  : 'bg-red-50 dark:bg-red-900/15 text-red-600 dark:text-red-400'
            }`}
          >
            {tc.status === 'running' ? (
              <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
            ) : tc.success ? (
              <Check className="w-3 h-3 flex-shrink-0" />
            ) : (
              <X className="w-3 h-3 flex-shrink-0" />
            )}

            <span className="truncate">
              {tc.status === 'running' ? tc.label : (tc.result ?? tc.label)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
