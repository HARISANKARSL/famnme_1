/**
 * ChatMessageBubble — Renders a single message (user or assistant).
 *
 * User messages: right-aligned, indigo background, white text, with edit action
 * Assistant messages: left-aligned, ivory background, dark text, with FC avatar
 *   - Rich markdown rendering for assistant responses
 *   - Copy, regenerate, and feedback action buttons
 */

import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Copy, Check, RefreshCw, ThumbsUp, ThumbsDown, Pencil, X, Send, Bot } from 'lucide-react'
import type { ChatMessageData } from '@/store/chatStore'
import { ChatPermissionCard } from './ChatPermissionCard'
import { ChatRichContent } from './ChatRichContent'
import { chatMarkdownComponents } from './ChatMarkdownRenderer'
import { useAuthStore } from '@/store/authStore'
import { resolveBackendUrl } from '@/config/api'

interface ChatMessageBubbleProps {
  message: ChatMessageData
  onPermission?: (granted: boolean, scope?: string) => void
  onNavigate?: (route: string, highlight?: string) => void
  onRegenerate?: () => void
  onFeedback?: (messageId: string, rating: 'positive' | 'negative') => void
  onEdit?: (messageId: string, newContent: string) => void
  /** Whether this is the latest assistant message (used for auto-navigation & regen) */
  isLatest?: boolean
  /** Whether a response is currently loading/streaming */
  isLoading?: boolean
}

export function ChatMessageBubble({
  message,
  onPermission,
  onNavigate,
  onRegenerate,
  onFeedback,
  onEdit,
  isLatest,
  isLoading,
}: ChatMessageBubbleProps) {
  const isUser = message.role === 'user'
  const user = useAuthStore(s => s.user)
  const userAvatarUrl = user?.avatarUrl ? resolveBackendUrl(user.avatarUrl) : null
  const metadata = message.metadata as Record<string, unknown> | null | undefined
  const isPermissionRequest = metadata?.type === 'permission_request'
  const hasNavAction = !!metadata?.navigationAction
  const hasFeatureHelp = !!metadata?.featureHelp

  const isNavigationConfirmation = isLatest && hasNavAction && !isPermissionRequest &&
    !hasFeatureHelp

  // Copy state
  const [copied, setCopied] = useState(false)
  // Feedback state
  const [feedbackGiven, setFeedbackGiven] = useState<'positive' | 'negative' | null>(null)
  // Edit state
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(message.content)
  const editRef = useRef<HTMLTextAreaElement>(null)

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus()
      editRef.current.setSelectionRange(editRef.current.value.length, editRef.current.value.length)
    }
  }, [isEditing])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = message.content
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [message.content])

  const handleFeedback = useCallback((rating: 'positive' | 'negative') => {
    if (feedbackGiven === rating) return
    setFeedbackGiven(rating)
    onFeedback?.(message.messageId, rating)
  }, [feedbackGiven, message.messageId, onFeedback])

  const handleStartEdit = useCallback(() => {
    setEditText(message.content)
    setIsEditing(true)
  }, [message.content])

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    setEditText(message.content)
  }, [message.content])

  const handleSubmitEdit = useCallback(() => {
    const trimmed = editText.trim()
    if (!trimmed || trimmed === message.content) {
      handleCancelEdit()
      return
    }
    setIsEditing(false)
    onEdit?.(message.messageId, trimmed)
  }, [editText, message.content, message.messageId, onEdit, handleCancelEdit])

  const handleEditKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmitEdit()
    }
    if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }, [handleSubmitEdit, handleCancelEdit])

  // Format timestamp
  const time = new Date(message.createdAt)
  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  // Don't show edit on temp/error messages
  const canEdit = isUser && onEdit && !isLoading && !message.messageId.startsWith('temp-')

  // Avatar: assistant shows user's photo with an "AI" filter tint;
  // user shows their photo unfiltered. Fallback to a robot icon when no photo.
  const assistantFilter = 'grayscale(0.4) hue-rotate(195deg) saturate(1.4) brightness(0.95) contrast(1.05)'
  const renderAvatar = () => {
    if (userAvatarUrl) {
      return (
        <div
          className={`w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mt-0.5 ${
            isUser
              ? 'ring-1 ring-[#2F3E8F]/30 dark:ring-[#5A6BFF]/30'
              : 'ring-2 ring-[#2F3E8F]/70 dark:ring-[#5A6BFF]/60 shadow-[0_0_8px_rgba(47,62,143,0.35)]'
          }`}
          aria-label={isUser ? 'You' : 'AI assistant'}
        >
          <img
            src={userAvatarUrl}
            alt=""
            className="w-full h-full object-cover"
            style={isUser ? undefined : { filter: assistantFilter }}
          />
        </div>
      )
    }
    // No user photo — robot for assistant, initials/blank for user
    if (!isUser) {
      return (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#2F3E8F] to-[#5A6BFF] dark:from-[#5A6BFF] dark:to-[#8CA0FF] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-[0_0_8px_rgba(47,62,143,0.35)]">
          <Bot className="w-4 h-4 text-white" strokeWidth={2} />
        </div>
      )
    }
    const initials = (user?.fullName || user?.email || 'U')
      .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    return (
      <div className="w-7 h-7 rounded-full bg-[#8B7355] dark:bg-[#3a3a3a] flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-white text-[10px] font-bold">{initials}</span>
      </div>
    )
  }

  return (
    <div className={`flex items-start gap-2 px-4 py-1.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar — user photo (unfiltered) for user, same photo with AI tint for assistant */}
      {renderAvatar()}

      <div className={`max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Message bubble */}
        {isUser && isEditing ? (
          /* Edit mode for user messages */
          <div className="w-full max-w-[280px]">
            <textarea
              ref={editRef}
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={handleEditKeyDown}
              rows={2}
              className="w-full resize-none rounded-xl border border-[#2F3E8F]/30 dark:border-[#5A6BFF]/30
                         bg-white dark:bg-[#242424]
                         text-[13px] text-gray-900 dark:text-[#F5F1E8]
                         px-3 py-2
                         focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/30 dark:focus:ring-[#5A6BFF]/30
                         transition-colors"
              style={{ maxHeight: '120px' }}
            />
            <div className="flex items-center gap-1.5 mt-1 justify-end">
              <button
                onClick={handleCancelEdit}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Cancel (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleSubmitEdit}
                disabled={!editText.trim() || editText.trim() === message.content}
                className="p-1 rounded-md text-[#2F3E8F] dark:text-[#7B8FD4]
                           hover:bg-[#2F3E8F]/10 dark:hover:bg-[#5A6BFF]/15
                           disabled:opacity-30 disabled:cursor-not-allowed
                           transition-colors"
                title="Send edit (Enter)"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed break-words ${
              isUser
                ? 'bg-[#2F3E8F] dark:bg-[#5A6BFF] text-white rounded-tr-sm whitespace-pre-wrap'
                : 'bg-[#F6F2EA] dark:bg-[#2A241B] text-gray-900 dark:text-[#F5F1E8] rounded-tl-sm'
            }`}
          >
            {isUser ? (
              message.content
            ) : (
              <Markdown remarkPlugins={[remarkGfm]} components={chatMarkdownComponents}>
                {message.content}
              </Markdown>
            )}
          </div>
        )}

        {/* Rich content: permission cards, navigation, steps */}
        {!isUser && metadata && (
          <>
            {isPermissionRequest && onPermission && (
              <ChatPermissionCard
                scope={metadata.scope as string}
                reason={metadata.reason as string}
                onGrant={(scope) => onPermission(true, scope)}
                onDeny={() => onPermission(false)}
              />
            )}
            {(hasNavAction || hasFeatureHelp) && !isPermissionRequest && (
              <ChatRichContent
                metadata={metadata}
                onNavigate={onNavigate}
                autoNavigate={isNavigationConfirmation}
              />
            )}
          </>
        )}

        {/* Action bar: timestamp + actions */}
        {!isEditing && (
          <div className={`flex items-center gap-1.5 mt-1 ${isUser ? 'flex-row-reverse' : ''}`}>
            <span className={`text-[10px] ${
              isUser ? 'text-gray-400 dark:text-gray-500' : 'text-[#8B7355] dark:text-gray-500'
            }`}>
              {timeStr}
            </span>

            {/* User message: edit action */}
            {canEdit && (
              <button
                onClick={handleStartEdit}
                className="p-1 rounded-md text-gray-400 dark:text-gray-500
                           hover:bg-gray-100 dark:hover:bg-[#333]
                           hover:text-[#2F3E8F] dark:hover:text-[#7B8FD4]
                           transition-colors"
                aria-label="Edit message"
                title="Edit"
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}

            {/* Assistant message actions */}
            {!isUser && !message.messageId.startsWith('error-') && (
              <div className="flex items-center gap-0.5">
                {/* Copy */}
                <button
                  onClick={handleCopy}
                  className="p-1 rounded-md text-[#8B7355] dark:text-gray-500
                             hover:bg-[#E8E0D2] dark:hover:bg-[#333]
                             hover:text-[#2F3E8F] dark:hover:text-[#7B8FD4]
                             transition-colors"
                  aria-label={copied ? 'Copied' : 'Copy message'}
                  title={copied ? 'Copied!' : 'Copy'}
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>

                {/* Feedback: thumbs up */}
                <button
                  onClick={() => handleFeedback('positive')}
                  className={`p-1 rounded-md transition-colors ${
                    feedbackGiven === 'positive'
                      ? 'text-[#2F3E8F] dark:text-[#7B8FD4] bg-[#2F3E8F]/10 dark:bg-[#5A6BFF]/15'
                      : 'text-[#8B7355] dark:text-gray-500 hover:bg-[#E8E0D2] dark:hover:bg-[#333] hover:text-[#2F3E8F] dark:hover:text-[#7B8FD4]'
                  }`}
                  aria-label="Good response"
                  title="Good response"
                >
                  <ThumbsUp className="w-3 h-3" />
                </button>

                {/* Feedback: thumbs down */}
                <button
                  onClick={() => handleFeedback('negative')}
                  className={`p-1 rounded-md transition-colors ${
                    feedbackGiven === 'negative'
                      ? 'text-red-500 dark:text-red-400 bg-red-500/10'
                      : 'text-[#8B7355] dark:text-gray-500 hover:bg-[#E8E0D2] dark:hover:bg-[#333] hover:text-red-500 dark:hover:text-red-400'
                  }`}
                  aria-label="Poor response"
                  title="Poor response"
                >
                  <ThumbsDown className="w-3 h-3" />
                </button>

                {/* Regenerate (only on last assistant message, when not loading) */}
                {isLatest && onRegenerate && !isLoading && (
                  <button
                    onClick={onRegenerate}
                    className="p-1 rounded-md text-[#8B7355] dark:text-gray-500
                               hover:bg-[#E8E0D2] dark:hover:bg-[#333]
                               hover:text-[#2F3E8F] dark:hover:text-[#7B8FD4]
                               transition-colors"
                    aria-label="Regenerate response"
                    title="Regenerate"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
