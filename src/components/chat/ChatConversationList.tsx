/**
 * ChatConversationList — Slide-in drawer showing past conversations.
 */

import { MessageSquare, Plus, Trash2 } from 'lucide-react'
import type { ChatConversationData } from '@/store/chatStore'

interface ChatConversationListProps {
  conversations: ChatConversationData[]
  activeConversationId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onArchive: (id: string) => void
}

export function ChatConversationList({
  conversations,
  activeConversationId,
  onSelect,
  onNew,
  onArchive,
}: ChatConversationListProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#DDD6C8] dark:border-gray-700 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-gray-800 dark:text-[#F5F1E8] uppercase tracking-wider">
          Conversations
        </span>
        <button
          onClick={onNew}
          className="w-7 h-7 rounded-lg bg-[#2F3E8F] dark:bg-[#5A6BFF] text-white
                     flex items-center justify-center hover:bg-[#3B4DA6] dark:hover:bg-[#6C7CFF]
                     transition-colors"
          aria-label="New conversation"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {conversations.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <MessageSquare className="w-8 h-8 text-[#DDD6C8] dark:text-gray-600 mx-auto mb-2" />
            <p className="text-[12px] text-[#8B7355] dark:text-gray-500">No conversations yet</p>
          </div>
        ) : (
          <div className="py-1">
            {conversations.map(conv => {
              const isActive = conv.conversationId === activeConversationId
              const date = new Date(conv.updatedAt)
              const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' })

              return (
                <div
                  key={conv.conversationId}
                  className={`group flex items-start gap-2 px-3 py-2.5 cursor-pointer
                             hover:bg-[#F6F2EA]/80 dark:hover:bg-[#2A241B]/50 transition-colors
                             ${isActive ? 'bg-[#F6F2EA] dark:bg-[#2A241B]' : ''}`}
                  onClick={() => onSelect(conv.conversationId)}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#8B7355] dark:text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-gray-800 dark:text-[#F5F1E8] truncate">
                      {conv.title ?? 'New Conversation'}
                    </p>
                    {conv.lastMessage && (
                      <p className="text-[11px] text-[#8B7355] dark:text-gray-500 truncate mt-0.5">
                        {conv.lastMessage}
                      </p>
                    )}
                    <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5">
                      {dateStr}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onArchive(conv.conversationId)
                    }}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md
                               text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20
                               flex items-center justify-center transition-all flex-shrink-0"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
