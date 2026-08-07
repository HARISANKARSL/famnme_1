/**
 * ChatWindow — The main chat popup containing header, messages, and input.
 *
 * Desktop: 380px wide floating card anchored bottom-right
 * Mobile: Full-screen BottomSheet
 *
 * Supports streaming responses with real-time tool call visualization.
 */

import { useRef, useEffect, useCallback } from 'react'
import { X, History, Plus, Gem, Bot } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { resolveBackendUrl } from '@/config/api'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useResponsive } from '@/hooks/useResponsive'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { ChatMessageBubble } from './ChatMessageBubble'
import { ChatInput } from './ChatInput'
import { ChatTypingIndicator } from './ChatTypingIndicator'
import { ChatToolCallIndicator } from './ChatToolCallIndicator'
import { ChatConversationList } from './ChatConversationList'
import { ChatFollowUpSuggestions } from './ChatFollowUpSuggestions'
import { chatMarkdownComponents } from './ChatMarkdownRenderer'
import { spotlightHighlight } from '@/utils/spotlightHighlight'
import type { ChatMessageData, ChatConversationData, ToolCallState } from '@/store/chatStore'

interface ChatWindowProps {
  isOpen: boolean
  messages: ChatMessageData[]
  conversations: ChatConversationData[]
  activeConversationId: string | null
  isLoading: boolean
  isStreaming: boolean
  streamingContent: string
  activeToolCalls: ToolCallState[]
  showConversationList: boolean
  onSend: (message: string) => void
  onClose: () => void
  onToggleHistory: () => void
  onNewConversation: () => void
  onSelectConversation: (id: string) => void
  onArchiveConversation: (id: string) => void
  onPermission: (granted: boolean, scope?: string) => void
  onNavigate: (route: string, highlight?: string) => void
  onRegenerate?: () => void
  onFeedback?: (messageId: string, rating: 'positive' | 'negative') => void
  onEdit?: (messageId: string, newContent: string) => void
}

export function ChatWindow({
  isOpen,
  messages,
  conversations,
  activeConversationId,
  isLoading,
  isStreaming,
  streamingContent,
  activeToolCalls,
  showConversationList,
  onSend,
  onClose,
  onToggleHistory,
  onNewConversation,
  onSelectConversation,
  onArchiveConversation,
  onPermission,
  onNavigate,
  onRegenerate,
  onFeedback,
  onEdit,
}: ChatWindowProps) {
  const { isMobile } = useResponsive()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const user = useAuthStore(s => s.user)
  const userAvatarUrl = user?.avatarUrl ? resolveBackendUrl(user.avatarUrl) : null
  const assistantFilter = 'grayscale(0.4) hue-rotate(195deg) saturate(1.4) brightness(0.95) contrast(1.05)'

  // Auto-scroll to bottom on new messages or streaming updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading, streamingContent, activeToolCalls])

  const handleNavigate = useCallback((route: string, highlight?: string) => {
    onNavigate(route, highlight)
    if (highlight) {
      setTimeout(() => spotlightHighlight(highlight), 500)
    }
  }, [onNavigate])

  // Extract follow-up suggestions from the last assistant message metadata
  const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant')
  const followUps: string[] = lastAssistantMsg?.metadata
    ? (lastAssistantMsg.metadata as Record<string, unknown>).suggestedFollowUps as string[] ?? []
    : []

  const chatContent = (
    <div className={`flex flex-col ${isMobile ? 'h-full' : 'h-[560px] w-[380px]'}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-[#2F3E8F] via-[#3D2E6E] to-[#4B2C5E]
                      dark:from-[#1E2A5A] dark:via-[#2A1E4A] dark:to-[#3A1F3F]
                      px-4 py-3 flex items-center gap-3 flex-shrink-0
                      rounded-t-2xl">
        {userAvatarUrl ? (
          <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-white/40 shadow-[0_0_10px_rgba(255,255,255,0.25)]">
            <img src={userAvatarUrl} alt="" className="w-full h-full object-cover" style={{ filter: assistantFilter }} />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" strokeWidth={2} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-[14px] font-semibold text-white font-['Playfair_Display',Georgia,serif]">
            FamBot AI Agent
          </h2>
          <p className="text-[10px] text-white/60">Here to help you explore</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleHistory}
            className="w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/10
                       flex items-center justify-center transition-colors"
            aria-label="Conversation history"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={onNewConversation}
            className="w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/10
                       flex items-center justify-center transition-colors"
            aria-label="New conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
          {!isMobile && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/10
                         flex items-center justify-center transition-colors"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Conversation list overlay */}
        {showConversationList && (
          <div className="absolute inset-0 z-10 bg-white dark:bg-[#1E1E1E]
                          animate-[slide-in-left_200ms_ease-out]">
            <ChatConversationList
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelect={(id) => {
                onSelectConversation(id)
                onToggleHistory()
              }}
              onNew={() => {
                onNewConversation()
                onToggleHistory()
              }}
              onArchive={onArchiveConversation}
            />
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto overscroll-contain bg-white dark:bg-[#1E1E1E]">
          {messages.length === 0 && !isStreaming ? (
            <div className="flex flex-col items-center justify-center h-full px-6 py-8">
              <div className="w-14 h-14 rounded-full bg-[#2F3E8F]/10 dark:bg-[#5A6BFF]/20
                              flex items-center justify-center mb-4">
                <Gem className="w-7 h-7 text-[#2F3E8F] dark:text-[#5A6BFF]" />
              </div>
              <h3 className="text-[15px] font-semibold text-gray-800 dark:text-[#F5F1E8] mb-2
                             font-['Playfair_Display',Georgia,serif]">
                How can I help?
              </h3>
              <p className="text-[12px] text-[#8B7355] dark:text-gray-500 text-center leading-relaxed max-w-[260px]">
                Ask me about features, get help navigating the app, or ask questions about your family tree.
              </p>

              {/* Quick suggestions */}
              <div className="mt-5 space-y-2 w-full max-w-[280px]">
                {[
                  'How do I add a family member?',
                  'Show me the memories feature',
                  'What can I do with my family tree?',
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => onSend(q)}
                    className="w-full text-left px-3 py-2 rounded-xl border border-[#DDD6C8] dark:border-gray-700
                               bg-[#F6F2EA]/50 dark:bg-[#242424]/50
                               text-[12px] text-gray-700 dark:text-gray-300
                               hover:bg-[#F6F2EA] dark:hover:bg-[#242424]
                               transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-3">
              {messages.map((msg, idx) => (
                <ChatMessageBubble
                  key={msg.messageId}
                  message={msg}
                  onPermission={onPermission}
                  onNavigate={handleNavigate}
                  onRegenerate={onRegenerate}
                  onFeedback={onFeedback}
                  onEdit={onEdit}
                  isLatest={!isStreaming && idx === messages.length - 1 && msg.role === 'assistant'}
                  isLoading={isLoading}
                />
              ))}

              {/* Streaming: tool call indicators */}
              {isStreaming && activeToolCalls.length > 0 && (
                <ChatToolCallIndicator toolCalls={activeToolCalls} />
              )}

              {/* Streaming: live text rendering */}
              {isStreaming && streamingContent && (
                <div className="flex items-start gap-2 px-4 py-1.5">
                  <div className="w-7 h-7 rounded-full bg-[#2F3E8F] dark:bg-[#5A6BFF] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-[10px] font-bold">FC</span>
                  </div>
                  <div className="max-w-[80%]">
                    <div className="rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed break-words
                                    bg-[#F6F2EA] dark:bg-[#2A241B] text-gray-900 dark:text-[#F5F1E8] rounded-tl-sm">
                      <Markdown remarkPlugins={[remarkGfm]} components={chatMarkdownComponents}>
                        {streamingContent}
                      </Markdown>
                      {/* Blinking cursor */}
                      <span className="inline-block w-0.5 h-4 bg-[#2F3E8F] dark:bg-[#7B8FD4] ml-0.5 align-text-bottom animate-pulse" />
                    </div>
                  </div>
                </div>
              )}

              {/* Non-streaming: typing indicator (before first token) */}
              {isLoading && !isStreaming && <ChatTypingIndicator />}
              {isStreaming && !streamingContent && activeToolCalls.length === 0 && <ChatTypingIndicator />}

              {/* Contextual follow-up suggestions */}
              {!isLoading && !isStreaming && followUps.length > 0 && (
                <ChatFollowUpSuggestions
                  suggestions={followUps}
                  onSelect={onSend}
                  isLoading={isLoading}
                />
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <ChatInput onSend={onSend} isLoading={isLoading} />
    </div>
  )

  // Mobile: use BottomSheet
  if (isMobile) {
    return (
      <BottomSheet
        open={isOpen}
        onClose={onClose}
        contentClassName="p-0"
      >
        <div className="h-[75dvh] flex flex-col">
          {chatContent}
        </div>
      </BottomSheet>
    )
  }

  // Desktop: floating card
  if (!isOpen) return null

  return (
    <div className="fixed bottom-20 right-6 z-[45]
                    w-[380px] rounded-2xl overflow-hidden
                    shadow-[0_8px_32px_rgba(0,0,0,0.18)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]
                    border border-[#DDD6C8]/50 dark:border-gray-700/50
                    animate-[chat-window-in_250ms_cubic-bezier(0.34,1.56,0.64,1)]">
      {chatContent}
    </div>
  )
}
