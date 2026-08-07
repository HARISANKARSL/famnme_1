/**
 * PlatformChatAssistant — Root component for the AI chat assistant.
 *
 * Renders a floating action button (FAB) and the ChatWindow popup.
 * Supports streaming responses with real-time tool call visualization,
 * tree mutations, and contextual follow-up suggestions.
 *
 * Desktop: FAB at bottom-right, chat popup above it
 * Mobile: FAB above BottomNav, chat as BottomSheet
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { MessageCircle, X } from 'lucide-react'
import { useResponsive } from '@/hooks/useResponsive'
import { useChatStore } from '@/store/chatStore'
import * as chatApi from '@/services/platformChatApiService'
import { ChatWindow } from './ChatWindow'
import type { ChatMessageData } from '@/store/chatStore'

export function PlatformChatAssistant() {
  const { isMobile } = useResponsive()

  // ─── Zustand selectors (each returns a stable primitive/ref) ─────────────
  const isOpen = useChatStore(s => s.isOpen)
  const isLoading = useChatStore(s => s.isLoading)
  const messages = useChatStore(s => s.messages)
  const activeConversationId = useChatStore(s => s.activeConversationId)
  const conversations = useChatStore(s => s.conversations)
  const showConversationList = useChatStore(s => s.showConversationList)
  const isStreaming = useChatStore(s => s.isStreaming)
  const streamingContent = useChatStore(s => s.streamingContent)
  const activeToolCalls = useChatStore(s => s.activeToolCalls)

  // Actions (referentially stable in Zustand)
  const closeChat = useChatStore(s => s.close)
  const toggleChat = useChatStore(s => s.toggle)
  const toggleConversationList = useChatStore(s => s.toggleConversationList)
  const resetChat = useChatStore(s => s.reset)
  const setActiveConversation = useChatStore(s => s.setActiveConversation)
  const setConversations = useChatStore(s => s.setConversations)
  const addMessage = useChatStore(s => s.addMessage)
  const setMessages = useChatStore(s => s.setMessages)
  const setLoading = useChatStore(s => s.setLoading)
  const setDataPermission = useChatStore(s => s.setDataPermission)
  const grantDataPermission = useChatStore(s => s.grantDataPermission)
  const revokeDataPermission = useChatStore(s => s.revokeDataPermission)
  const setPendingPermissionRequest = useChatStore(s => s.setPendingPermissionRequest)
  const startStreaming = useChatStore(s => s.startStreaming)
  const appendStreamDelta = useChatStore(s => s.appendStreamDelta)
  const addToolCall = useChatStore(s => s.addToolCall)
  const updateToolCall = useChatStore(s => s.updateToolCall)
  const finalizeStream = useChatStore(s => s.finalizeStream)
  const cancelStreaming = useChatStore(s => s.cancelStreaming)

  // Refs for values needed inside callbacks
  const activeConvIdRef = useRef(activeConversationId)
  activeConvIdRef.current = activeConversationId
  const messagesRef = useRef(messages)
  messagesRef.current = messages
  const conversationsRef = useRef(conversations)
  conversationsRef.current = conversations
  const isLoadingRef = useRef(isLoading)
  isLoadingRef.current = isLoading

  // Streaming buffer for 60fps throttled updates
  const streamBufferRef = useRef('')
  const rafIdRef = useRef<number | null>(null)

  const flushStreamBuffer = useCallback(() => {
    if (streamBufferRef.current) {
      appendStreamDelta(streamBufferRef.current)
      streamBufferRef.current = ''
    }
    rafIdRef.current = null
  }, [appendStreamDelta])

  const bufferStreamDelta = useCallback((delta: string) => {
    streamBufferRef.current += delta
    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(flushStreamBuffer)
    }
  }, [flushStreamBuffer])

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
    }
  }, [])

  // ─── Load conversations on first open ────────────────────────────────────
  useEffect(() => {
    if (isOpen && conversations.length === 0) {
      chatApi.listConversations({ limit: 20 })
        .then(setConversations)
        .catch(err => console.error('Failed to load chat conversations:', err))
    }
  }, [isOpen, conversations.length, setConversations])

  // ─── Send message (streaming with fallback) ──────────────────────────────
  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || isLoadingRef.current) return

    let conversationId = activeConvIdRef.current
    const ctx = useChatStore.getState()

    // Auto-create conversation if none active
    if (!conversationId) {
      try {
        const conv = await chatApi.createConversation(ctx.currentTreeId)
        setActiveConversation(conv.conversationId, [])
        setConversations([conv, ...conversationsRef.current])
        conversationId = conv.conversationId
      } catch (err) {
        console.error('Failed to create conversation:', err)
        return
      }
    }

    // Optimistic: add user message immediately
    const tempUserMsg: ChatMessageData = {
      messageId: `temp-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      createdAt: new Date().toISOString(),
    }
    addMessage(tempUserMsg)

    const payload: chatApi.SendMessagePayload = {
      message: text.trim(),
      currentRoute: ctx.currentRoute,
      currentTreeId: ctx.currentTreeId ?? undefined,
      currentTreeName: ctx.currentTreeName ?? undefined,
      focusPersonId: ctx.focusPersonId ?? undefined,
      focusPersonName: ctx.focusPersonName ?? undefined,
    }

    // Track accumulated content for finalization
    let accumulatedContent = ''
    let finalMetadata: Record<string, unknown> = {}
    let savedMessageId = `stream-${Date.now()}`

    // Try streaming first, fall back to REST
    startStreaming()

    try {
      await chatApi.sendMessageStream(conversationId, payload, {
        onTextDelta: (delta) => {
          accumulatedContent += delta
          bufferStreamDelta(delta)
        },
        onToolStart: (tool, label) => {
          addToolCall(tool, label)
        },
        onToolEnd: (tool, success, result) => {
          updateToolCall(tool, success, result)
        },
        onFollowUps: (suggestions) => {
          finalMetadata.suggestedFollowUps = suggestions
        },
        onPermission: (scope, reason) => {
          setPendingPermissionRequest({ scope, reason })
        },
        onDone: (metadata) => {
          finalMetadata = { ...finalMetadata, ...metadata }
        },
        onUserMessageId: (messageId) => {
          // Replace temp user message with real ID
          const currentMsgs = useChatStore.getState().messages
          setMessages(currentMsgs.map(m =>
            m.messageId === tempUserMsg.messageId ? { ...m, messageId } : m,
          ))
        },
        onSavedMessageId: (messageId) => {
          savedMessageId = messageId
        },
        onError: (message) => {
          console.error('Stream error:', message)
        },
      })

      // Flush any remaining buffer
      if (streamBufferRef.current) {
        accumulatedContent = useChatStore.getState().streamingContent + streamBufferRef.current
        streamBufferRef.current = ''
      }

      // Finalize: convert streaming state into a real message
      // Strip follow-up tags from content if they weren't parsed by backend
      const cleanContent = accumulatedContent.replace(/<!--followups:.*?-->/s, '').trim()

      finalizeStream(
        savedMessageId,
        cleanContent || "I'm here to help! What would you like to know?",
        Object.keys(finalMetadata).length > 0 ? finalMetadata : null,
      )

      // Handle permission request
      if (finalMetadata.type === 'permission_request') {
        setPendingPermissionRequest({
          scope: finalMetadata.scope as string,
          reason: finalMetadata.reason as string,
        })
      }

      // Trigger tree refresh
      if (finalMetadata.treeMutated) {
        console.log('[ChatAssistant] treeMutated detected, dispatching refresh event')
        window.dispatchEvent(new CustomEvent('familytree:mutated'))
      }

    } catch {
      // Streaming failed — fall back to REST
      console.warn('[ChatAssistant] Streaming failed, falling back to REST')
      cancelStreaming()
      setLoading(true)

      try {
        const response = await chatApi.sendMessage(conversationId, payload)
        const currentMsgs = useChatStore.getState().messages
        setMessages([
          ...currentMsgs.filter(m => m.messageId !== tempUserMsg.messageId),
          response.userMessage,
          response.assistantMessage,
        ])

        const metadata = response.assistantMessage.metadata as Record<string, unknown> | null
        if (metadata?.type === 'permission_request') {
          setPendingPermissionRequest({
            scope: metadata.scope as string,
            reason: metadata.reason as string,
          })
        }
        if (metadata?.treeMutated) {
          window.dispatchEvent(new CustomEvent('familytree:mutated'))
        }
      } catch (err) {
        console.error('Failed to send message:', err)
        addMessage({
          messageId: `error-${Date.now()}`,
          role: 'assistant',
          content: "I'm sorry, I couldn't process that right now. Please try again.",
          createdAt: new Date().toISOString(),
        })
      } finally {
        setLoading(false)
      }
    }
  }, [setActiveConversation, setConversations, addMessage, setLoading, setMessages,
      setPendingPermissionRequest, startStreaming, bufferStreamDelta, addToolCall,
      updateToolCall, finalizeStream, cancelStreaming])

  // ─── Handle permission ───────────────────────────────────────────────────
  const handlePermission = useCallback(async (granted: boolean, scope?: string) => {
    const conversationId = activeConvIdRef.current
    if (!conversationId) return

    if (granted) {
      const permLevel = (scope === 'statistics' ? 'statistics' : 'family_data') as 'statistics' | 'family_data'
      try {
        await chatApi.grantPermission(conversationId, permLevel)
        grantDataPermission(permLevel)

        const msgs = messagesRef.current
        const lastUserMsg = [...msgs].reverse().find(m => m.role === 'user')
        if (lastUserMsg) {
          // Re-send with permission via streaming
          const ctx = useChatStore.getState()
          const payload: chatApi.SendMessagePayload = {
            message: lastUserMsg.content,
            currentRoute: ctx.currentRoute,
            currentTreeId: ctx.currentTreeId ?? undefined,
            currentTreeName: ctx.currentTreeName ?? undefined,
            focusPersonId: ctx.focusPersonId ?? undefined,
            focusPersonName: ctx.focusPersonName ?? undefined,
            isResendAfterPermission: true,
          }

          let accumulatedContent = ''
          let finalMetadata: Record<string, unknown> = {}
          let savedMessageId = `stream-${Date.now()}`

          startStreaming()

          try {
            await chatApi.sendMessageStream(conversationId, payload, {
              onTextDelta: (delta) => { accumulatedContent += delta; bufferStreamDelta(delta) },
              onToolStart: (tool, label) => { addToolCall(tool, label) },
              onToolEnd: (tool, success, result) => { updateToolCall(tool, success, result) },
              onFollowUps: (suggestions) => { finalMetadata.suggestedFollowUps = suggestions },
              onPermission: () => {},
              onDone: (metadata) => { finalMetadata = { ...finalMetadata, ...metadata } },
              onUserMessageId: () => {},
              onSavedMessageId: (messageId) => { savedMessageId = messageId },
              onError: (message) => { console.error('Re-send stream error:', message) },
            })

            if (streamBufferRef.current) {
              streamBufferRef.current = ''
            }

            const cleanContent = accumulatedContent.replace(/<!--followups:.*?-->/s, '').trim()
            finalizeStream(savedMessageId, cleanContent || "Here's what I found.", finalMetadata)

            if (finalMetadata.treeMutated) {
              window.dispatchEvent(new CustomEvent('familytree:mutated'))
            }
          } catch {
            cancelStreaming()
            // Fall back to REST
            setLoading(true)
            try {
              const response = await chatApi.sendMessage(conversationId, payload)
              addMessage(response.assistantMessage)
              if ((response.assistantMessage.metadata as Record<string, unknown>)?.treeMutated) {
                window.dispatchEvent(new CustomEvent('familytree:mutated'))
              }
            } catch (err) {
              console.error('Failed to re-process with permission:', err)
            } finally {
              setLoading(false)
            }
          }
        }
      } catch (err) {
        console.error('Failed to grant permission:', err)
      }
    } else {
      revokeDataPermission()
      addMessage({
        messageId: `system-${Date.now()}`,
        role: 'assistant',
        content: "No problem! I won't access your family data. I can still help you with feature guidance and navigation. What else would you like to know?",
        createdAt: new Date().toISOString(),
      })
    }
  }, [grantDataPermission, revokeDataPermission, addMessage, setLoading,
      startStreaming, bufferStreamDelta, addToolCall, updateToolCall,
      finalizeStream, cancelStreaming])

  // ─── Edit message (truncate from edit point and re-send) ──────────────────
  const handleEdit = useCallback(async (messageId: string, newContent: string) => {
    if (isLoadingRef.current) return
    const conversationId = activeConvIdRef.current
    if (!conversationId) return

    const msgs = useChatStore.getState().messages
    const editIdx = msgs.findIndex(m => m.messageId === messageId)
    if (editIdx < 0) return

    // Truncate messages after the edited one in local state
    const truncated = msgs.slice(0, editIdx)
    setMessages(truncated)

    // Delete messages after this one on the backend (fire-and-forget)
    chatApi.deleteMessagesAfter(conversationId, messageId)
      .catch(err => console.error('Failed to truncate messages on server:', err))

    // Send the edited content as a new message
    await handleSend(newContent)
  }, [handleSend, setMessages])

  // ─── Regenerate last response ─────────────────────────────────────────────
  const handleRegenerate = useCallback(async () => {
    const msgs = messagesRef.current
    const lastUserMsg = [...msgs].reverse().find(m => m.role === 'user')
    if (!lastUserMsg || isLoadingRef.current) return

    // Remove last assistant message from state
    const currentState = useChatStore.getState()
    const lastAssistantIdx = currentState.messages.map(m => m.role).lastIndexOf('assistant')
    if (lastAssistantIdx >= 0) {
      setMessages(currentState.messages.filter((_, i) => i !== lastAssistantIdx))
    }

    // Re-send via handleSend
    await handleSend(lastUserMsg.content)
  }, [handleSend, setMessages])

  // ─── Message feedback ───────────────────────────────────────────────────
  const handleFeedback = useCallback(async (messageId: string, rating: 'positive' | 'negative') => {
    const conversationId = activeConvIdRef.current
    if (!conversationId) return
    try {
      await chatApi.submitFeedback(conversationId, messageId, rating)
    } catch (err) {
      console.error('Failed to submit feedback:', err)
    }
  }, [])

  // ─── Load conversation ───────────────────────────────────────────────────
  const handleLoadConversation = useCallback(async (conversationId: string) => {
    try {
      const data = await chatApi.getConversation(conversationId)
      setActiveConversation(data.conversation.conversationId, data.messages)
      setDataPermission(data.conversation.dataPermission as 'none' | 'statistics' | 'family_data')
    } catch (err) {
      console.error('Failed to load conversation:', err)
    }
  }, [setActiveConversation, setDataPermission])

  // ─── Archive conversation ────────────────────────────────────────────────
  const handleArchive = useCallback(async (conversationId: string) => {
    try {
      await chatApi.archiveConversation(conversationId)
      const updated = conversationsRef.current.filter(c => c.conversationId !== conversationId)
      setConversations(updated)
      if (activeConvIdRef.current === conversationId) {
        resetChat()
      }
    } catch (err) {
      console.error('Failed to archive conversation:', err)
    }
  }, [setConversations, resetChat])

  // ─── New conversation ────────────────────────────────────────────────────
  const handleNewConversation = useCallback(async () => {
    resetChat()
    try {
      const ctx = useChatStore.getState()
      const conv = await chatApi.createConversation(ctx.currentTreeId)
      setActiveConversation(conv.conversationId, [])
      setConversations([conv, ...conversationsRef.current])
    } catch (err) {
      console.error('Failed to create conversation:', err)
    }
  }, [resetChat, setActiveConversation, setConversations])

  // ─── Navigation handler ──────────────────────────────────────────────────
  const handleNavigate = useCallback((route: string) => {
    window.location.hash = route
  }, [])

  // ─── Tooltip: show every 2 minutes when chat is closed ─────────────────
  const [showTooltip, setShowTooltip] = useState(false)
  useEffect(() => {
    if (isOpen) {
      setShowTooltip(false)
      return
    }
    const interval = setInterval(() => {
      setShowTooltip(true)
      setTimeout(() => setShowTooltip(false), 5000)
    }, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [isOpen])

  const content = (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className={`fixed rounded-full
                     flex items-center justify-center
                     active:scale-95 transition-all duration-200
                     ${isMobile
                       ? `z-50 left-4 w-11 h-11
                          bg-white dark:bg-[#2c2c2e]
                          border border-[#E2DBCE]/60 dark:border-[#3a3a3c]
                          text-[#2F3E8F] dark:text-[#7B8FD4]
                          shadow-[0_2px_8px_rgba(0,0,0,0.1)]`
                       : `z-[45] right-6 w-11 h-11
                          bg-[#2F3E8F] dark:bg-[#5A6BFF] text-white
                          shadow-[0_4px_16px_rgba(47,62,143,0.35)] dark:shadow-[0_4px_16px_rgba(90,107,255,0.35)]
                          hover:bg-[#3B4DA6] dark:hover:bg-[#6C7CFF]
                          hover:shadow-[0_6px_20px_rgba(47,62,143,0.45)]`
                   }
                     animate-[chat-fab-in_400ms_cubic-bezier(0.34,1.56,0.64,1)]
                  `}
          style={isMobile
            ? { bottom: 'calc(62px + env(safe-area-inset-bottom, 0px))' }
            : { bottom: '24px' }
          }
          aria-label="Open chat assistant"
        >
          <MessageCircle className="w-[18px] h-[18px]" strokeWidth={2} />

          {/* Subtle pulse ring on first appearance (desktop only) */}
          {!isMobile && !showTooltip && (
            <span className="absolute inset-0 rounded-full animate-ping
                             bg-[#2F3E8F]/20 dark:bg-[#5A6BFF]/20"
                  style={{ animationDuration: '2s', animationIterationCount: '3' }} />
          )}
        </button>
      )}

      {/* Tooltip: "Use AI agent for support" — appears every 2 minutes */}
      {!isOpen && showTooltip && (
        <div
          className={`fixed z-[45] animate-[chat-fab-in_300ms_ease-out] ${
            isMobile
              ? 'left-16 bg-white dark:bg-[#2c2c2e] text-[#3D2E1F] dark:text-[#f5f5f5] border border-[#E2DBCE]/60 dark:border-[#3a3a3c]'
              : 'right-[72px] bg-[#2F3E8F] dark:bg-[#5A6BFF] text-white'
          } px-3 py-2 rounded-lg shadow-lg text-xs font-medium whitespace-nowrap`}
          style={isMobile
            ? { bottom: 'calc(68px + env(safe-area-inset-bottom, 0px))' }
            : { bottom: '30px' }
          }
        >
          Use AI agent for support
          <span className={`absolute top-1/2 -translate-y-1/2 w-0 h-0 border-[5px] ${
            isMobile
              ? 'left-[-10px] border-transparent border-r-white dark:border-r-[#2c2c2e]'
              : 'right-[-10px] border-transparent border-l-[#2F3E8F] dark:border-l-[#5A6BFF]'
          }`} />
        </div>
      )}

      {/* Close FAB (shown when chat is open, desktop only) */}
      {isOpen && !isMobile && (
        <button
          onClick={closeChat}
          className="fixed bottom-6 right-6 z-[45]
                     w-11 h-11 rounded-full
                     bg-gray-500/80 dark:bg-gray-600/80 text-white
                     shadow-lg hover:bg-gray-600 dark:hover:bg-gray-500
                     active:scale-95 transition-all
                     flex items-center justify-center
                     backdrop-blur-sm"
          aria-label="Close chat assistant"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Chat Window */}
      <ChatWindow
        isOpen={isOpen}
        messages={messages}
        conversations={conversations}
        activeConversationId={activeConversationId}
        isLoading={isLoading}
        isStreaming={isStreaming}
        streamingContent={streamingContent}
        activeToolCalls={activeToolCalls}
        showConversationList={showConversationList}
        onSend={handleSend}
        onClose={closeChat}
        onToggleHistory={toggleConversationList}
        onNewConversation={handleNewConversation}
        onSelectConversation={handleLoadConversation}
        onArchiveConversation={handleArchive}
        onPermission={handlePermission}
        onNavigate={handleNavigate}
        onRegenerate={handleRegenerate}
        onFeedback={handleFeedback}
        onEdit={handleEdit}
      />
    </>
  )

  return createPortal(content, document.body)
}
