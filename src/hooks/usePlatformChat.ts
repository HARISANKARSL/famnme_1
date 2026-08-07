/**
 * usePlatformChat — Core hook for the platform chat assistant.
 *
 * Manages conversation lifecycle, message sending, and permission flow.
 * Actions are extracted individually from Zustand (they're referentially stable).
 */

import { useCallback, useEffect, useRef } from 'react'
import { useChatStore, type ChatMessageData } from '@/store/chatStore'
import * as chatApi from '@/services/platformChatApiService'

export function usePlatformChat() {
  // ─── State selectors (each is a primitive or stable reference) ────────────
  const isOpen = useChatStore(s => s.isOpen)
  const isMinimized = useChatStore(s => s.isMinimized)
  const isLoading = useChatStore(s => s.isLoading)
  const messages = useChatStore(s => s.messages)
  const activeConversationId = useChatStore(s => s.activeConversationId)
  const conversations = useChatStore(s => s.conversations)
  const showConversationList = useChatStore(s => s.showConversationList)
  const pendingPermissionRequest = useChatStore(s => s.pendingPermissionRequest)
  const dataPermission = useChatStore(s => s.dataPermission)

  // ─── Actions (Zustand actions are referentially stable — safe to extract) ─
  const open = useChatStore(s => s.open)
  const close = useChatStore(s => s.close)
  const minimize = useChatStore(s => s.minimize)
  const restore = useChatStore(s => s.restore)
  const toggle = useChatStore(s => s.toggle)
  const setActiveConversation = useChatStore(s => s.setActiveConversation)
  const addMessage = useChatStore(s => s.addMessage)
  const setMessages = useChatStore(s => s.setMessages)
  const setLoading = useChatStore(s => s.setLoading)
  const setConversations = useChatStore(s => s.setConversations)
  const grantDataPermission = useChatStore(s => s.grantDataPermission)
  const revokeDataPermission = useChatStore(s => s.revokeDataPermission)
  const setDataPermission = useChatStore(s => s.setDataPermission)
  const setPendingPermissionRequest = useChatStore(s => s.setPendingPermissionRequest)
  const setContext = useChatStore(s => s.setContext)
  const toggleConversationList = useChatStore(s => s.toggleConversationList)
  const reset = useChatStore(s => s.reset)

  // ─── Refs for values needed inside callbacks (avoid stale closures) ───────
  const activeConvIdRef = useRef(activeConversationId)
  activeConvIdRef.current = activeConversationId
  const messagesRef = useRef(messages)
  messagesRef.current = messages
  const conversationsRef = useRef(conversations)
  conversationsRef.current = conversations
  const isLoadingRef = useRef(isLoading)
  isLoadingRef.current = isLoading

  // We read current context from the store directly inside callbacks
  // to avoid stale closures without adding them to dependency arrays.
  const getContext = useCallback(() => useChatStore.getState(), [])

  // ─── Load conversation list ──────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      const convs = await chatApi.listConversations({ limit: 20 })
      setConversations(convs)
    } catch (err) {
      console.error('Failed to load chat conversations:', err)
    }
  }, [setConversations])

  // ─── Start a new conversation ────────────────────────────────────────────
  const startNewConversation = useCallback(async () => {
    try {
      const { currentTreeId } = getContext()
      const conv = await chatApi.createConversation(currentTreeId)
      setActiveConversation(conv.conversationId, [])
      setConversations([conv, ...conversationsRef.current])
      return conv.conversationId
    } catch (err) {
      console.error('Failed to create conversation:', err)
      return null
    }
  }, [getContext, setActiveConversation, setConversations])

  // ─── Load an existing conversation ───────────────────────────────────────
  const loadConversation = useCallback(async (conversationId: string) => {
    try {
      const data = await chatApi.getConversation(conversationId)
      setActiveConversation(data.conversation.conversationId, data.messages)
      setDataPermission(data.conversation.dataPermission as 'none' | 'statistics' | 'family_data')
    } catch (err) {
      console.error('Failed to load conversation:', err)
    }
  }, [setActiveConversation, setDataPermission])

  // ─── Send a message ──────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoadingRef.current) return

    let conversationId = activeConvIdRef.current
    const ctx = getContext()

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
    setLoading(true)

    try {
      const response = await chatApi.sendMessage(conversationId, {
        message: text.trim(),
        currentRoute: ctx.currentRoute,
        currentTreeId: ctx.currentTreeId ?? undefined,
        currentTreeName: ctx.currentTreeName ?? undefined,
      })

      // Replace temp message with real one and add assistant response
      const currentMsgs = messagesRef.current
      setMessages([
        ...currentMsgs.filter(m => m.messageId !== tempUserMsg.messageId),
        response.userMessage,
        response.assistantMessage,
      ])

      // Check for permission request in assistant response metadata
      const metadata = response.assistantMessage.metadata as Record<string, unknown> | null
      if (metadata?.type === 'permission_request') {
        setPendingPermissionRequest({
          scope: metadata.scope as string,
          reason: metadata.reason as string,
        })
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
  }, [getContext, setActiveConversation, setConversations, addMessage, setLoading, setMessages, setPendingPermissionRequest])

  // ─── Handle permission grant/deny ────────────────────────────────────────
  const handlePermission = useCallback(async (granted: boolean, scope?: string) => {
    const conversationId = activeConvIdRef.current
    if (!conversationId) return

    if (granted) {
      const permLevel = (scope === 'statistics' ? 'statistics' : 'family_data') as 'statistics' | 'family_data'
      try {
        await chatApi.grantPermission(conversationId, permLevel)
        grantDataPermission(permLevel)

        // Re-send the last user message now that permission is granted
        const msgs = messagesRef.current
        const lastUserMsg = [...msgs].reverse().find(m => m.role === 'user')
        if (lastUserMsg) {
          setLoading(true)
          try {
            const ctx = getContext()
            const response = await chatApi.sendMessage(conversationId, {
              message: lastUserMsg.content,
              currentRoute: ctx.currentRoute,
              currentTreeId: ctx.currentTreeId ?? undefined,
              currentTreeName: ctx.currentTreeName ?? undefined,
            })
            addMessage(response.assistantMessage)
          } catch (err) {
            console.error('Failed to re-process with permission:', err)
          } finally {
            setLoading(false)
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
  }, [getContext, grantDataPermission, revokeDataPermission, addMessage, setLoading])

  // ─── Archive a conversation ──────────────────────────────────────────────
  const archiveConversation = useCallback(async (conversationId: string) => {
    try {
      await chatApi.archiveConversation(conversationId)
      const updated = conversationsRef.current.filter(c => c.conversationId !== conversationId)
      setConversations(updated)
      if (activeConvIdRef.current === conversationId) {
        reset()
      }
    } catch (err) {
      console.error('Failed to archive conversation:', err)
    }
  }, [setConversations, reset])

  // ─── Load conversations on first open ────────────────────────────────────
  useEffect(() => {
    if (isOpen && conversations.length === 0) {
      loadConversations()
    }
  }, [isOpen, conversations.length, loadConversations])

  return {
    isOpen,
    isMinimized,
    isLoading,
    messages,
    activeConversationId,
    conversations,
    showConversationList,
    pendingPermissionRequest,
    dataPermission,

    open,
    close,
    minimize,
    restore,
    toggle,
    sendMessage,
    startNewConversation,
    loadConversation,
    handlePermission,
    archiveConversation,
    loadConversations,
    toggleConversationList,
    setContext,
    reset,
  }
}
