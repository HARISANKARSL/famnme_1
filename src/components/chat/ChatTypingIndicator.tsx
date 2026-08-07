/**
 * ChatTypingIndicator — Three-dot bouncing animation shown while AI is processing.
 */

import { Bot } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { resolveBackendUrl } from '@/config/api'

export function ChatTypingIndicator() {
  const user = useAuthStore(s => s.user)
  const avatarUrl = user?.avatarUrl ? resolveBackendUrl(user.avatarUrl) : null
  const assistantFilter = 'grayscale(0.4) hue-rotate(195deg) saturate(1.4) brightness(0.95) contrast(1.05)'

  return (
    <div className="flex items-start gap-2 px-4 py-2">
      {avatarUrl ? (
        <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-[#2F3E8F]/70 dark:ring-[#5A6BFF]/60 shadow-[0_0_8px_rgba(47,62,143,0.35)]">
          <img src={avatarUrl} alt="" className="w-full h-full object-cover" style={{ filter: assistantFilter }} />
        </div>
      ) : (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#2F3E8F] to-[#5A6BFF] dark:from-[#5A6BFF] dark:to-[#8CA0FF] flex items-center justify-center flex-shrink-0 shadow-[0_0_8px_rgba(47,62,143,0.35)]">
          <Bot className="w-4 h-4 text-white" strokeWidth={2} />
        </div>
      )}
      <div className="bg-[#F6F2EA] dark:bg-[#2A241B] rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-[#8B7355] dark:bg-[#C2A46D] rounded-full animate-[chat-bounce_1.4s_ease-in-out_infinite]" />
          <span className="w-2 h-2 bg-[#8B7355] dark:bg-[#C2A46D] rounded-full animate-[chat-bounce_1.4s_ease-in-out_0.2s_infinite]" />
          <span className="w-2 h-2 bg-[#8B7355] dark:bg-[#C2A46D] rounded-full animate-[chat-bounce_1.4s_ease-in-out_0.4s_infinite]" />
        </div>
      </div>
    </div>
  )
}
