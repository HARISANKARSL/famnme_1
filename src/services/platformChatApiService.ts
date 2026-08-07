/**
 * Platform Chat API Service — typed client for the chat assistant backend.
 */

import { API_BASE_URL } from '@/config/api'
import type { ChatMessageData, ChatConversationData } from '@/store/chatStore'

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

// ─── Conversations ───────────────────────────────────────────────────────────

export async function createConversation(
  treeId?: string | null,
): Promise<ChatConversationData> {
  const res = await fetch(`${API_BASE_URL}/chat/conversations`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ treeId: treeId ?? undefined }),
  })
  if (!res.ok) throw new Error('Failed to create conversation')
  return res.json()
}

export async function listConversations(
  opts: { treeId?: string; limit?: number; offset?: number } = {},
): Promise<ChatConversationData[]> {
  const params = new URLSearchParams()
  if (opts.treeId) params.set('treeId', opts.treeId)
  if (opts.limit) params.set('limit', String(opts.limit))
  if (opts.offset) params.set('offset', String(opts.offset))

  const res = await fetch(`${API_BASE_URL}/chat/conversations?${params}`, {
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error('Failed to list conversations')
  return res.json()
}

export async function getConversation(
  id: string,
): Promise<{ conversation: ChatConversationData; messages: ChatMessageData[] }> {
  const res = await fetch(`${API_BASE_URL}/chat/conversations/${id}`, {
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error('Failed to get conversation')
  return res.json()
}

export async function archiveConversation(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/chat/conversations/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error('Failed to archive conversation')
}

// ─── Messages ────────────────────────────────────────────────────────────────

export interface SendMessagePayload {
  message: string
  currentRoute?: string
  currentTreeId?: string
  currentTreeName?: string
  focusPersonId?: string
  focusPersonName?: string
  isResendAfterPermission?: boolean
}

export interface SendMessageResponse {
  userMessage: ChatMessageData
  assistantMessage: ChatMessageData
}

export async function sendMessage(
  conversationId: string,
  payload: SendMessagePayload,
): Promise<SendMessageResponse> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60000) // 60s timeout (mutations need extra time)

  try {
    const res = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) throw new Error('Failed to send message')
    return res.json()
  } catch (err) {
    clearTimeout(timeoutId)
    throw err
  }
}

// ─── Permission ──────────────────────────────────────────────────────────────

export async function grantPermission(
  conversationId: string,
  permission: 'none' | 'statistics' | 'family_data',
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/permission`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ permission }),
  })
  if (!res.ok) throw new Error('Failed to update permission')
}

// ─── Message Editing ────────────────────────────────────────────────────────

export async function deleteMessagesAfter(
  conversationId: string,
  messageId: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/chat/conversations/${conversationId}/messages/${messageId}/after`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    },
  )
  if (!res.ok) throw new Error('Failed to delete messages')
}

// ─── Streaming Messages ─────────────────────────────────────────────────────

export interface StreamCallbacks {
  onTextDelta: (delta: string) => void
  onToolStart: (tool: string, label: string) => void
  onToolEnd: (tool: string, success: boolean, result: string) => void
  onFollowUps: (suggestions: string[]) => void
  onPermission: (scope: string, reason: string) => void
  onDone: (metadata: Record<string, unknown>) => void
  onUserMessageId: (messageId: string) => void
  onSavedMessageId: (messageId: string) => void
  onError: (message: string) => void
}

export async function sendMessageStream(
  conversationId: string,
  payload: SendMessagePayload,
  callbacks: StreamCallbacks,
): Promise<void> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 90000) // 90s timeout for streaming

  try {
    const res = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/messages/stream`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      throw new Error(`Stream request failed: ${res.status}`)
    }

    const reader = res.body?.getReader()
    if (!reader) throw new Error('No readable stream')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Parse SSE events from buffer
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? '' // Keep incomplete line in buffer

      let currentEvent = ''
      let currentData = ''

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim()
        } else if (line.startsWith('data: ')) {
          currentData = line.slice(6)
        } else if (line === '' && currentEvent && currentData) {
          // Empty line = end of event
          try {
            const data = JSON.parse(currentData)
            switch (currentEvent) {
              case 'text_delta':
                callbacks.onTextDelta(data.delta ?? '')
                break
              case 'tool_start':
                callbacks.onToolStart(data.tool, data.label)
                break
              case 'tool_end':
                callbacks.onToolEnd(data.tool, data.success, data.result)
                break
              case 'followups':
                callbacks.onFollowUps(data.suggestions ?? [])
                break
              case 'permission':
                callbacks.onPermission(data.scope, data.reason)
                break
              case 'done':
                callbacks.onDone(data.metadata ?? {})
                break
              case 'user_message':
                callbacks.onUserMessageId(data.messageId)
                break
              case 'saved':
                callbacks.onSavedMessageId(data.messageId)
                break
              case 'error':
                callbacks.onError(data.message ?? 'Something went wrong')
                break
            }
          } catch {
            // Failed to parse SSE data — skip
          }
          currentEvent = ''
          currentData = ''
        }
      }
    }
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof Error && err.name === 'AbortError') {
      callbacks.onError('Request timed out. Please try again.')
    } else {
      throw err // Re-throw to let caller handle fallback
    }
  }
}

// ─── Feedback ───────────────────────────────────────────────────────────────

export async function submitFeedback(
  conversationId: string,
  messageId: string,
  rating: 'positive' | 'negative',
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/chat/conversations/${conversationId}/messages/${messageId}/feedback`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ rating }),
    },
  )
  if (!res.ok) throw new Error('Failed to submit feedback')
}

// ─── Search ──────────────────────────────────────────────────────────────────

export async function searchConversations(
  query: string,
): Promise<ChatConversationData[]> {
  const res = await fetch(`${API_BASE_URL}/chat/search?q=${encodeURIComponent(query)}`, {
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error('Failed to search conversations')
  return res.json()
}
