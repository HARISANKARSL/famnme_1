import { create } from 'zustand'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChatMessageData {
  messageId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: Record<string, unknown> | null
  createdAt: string
}

export interface ChatConversationData {
  conversationId: string
  title: string | null
  treeId: string | null
  mode: string
  dataPermission: string
  messageCount: number
  lastMessage?: string
  createdAt: string
  updatedAt: string
}

export interface ToolCallState {
  name: string
  label: string
  status: 'running' | 'done'
  success?: boolean
  result?: string
}

// ─── Store ───────────────────────────────────────────────────────────────────

interface ChatState {
  // UI state
  isOpen: boolean
  isMinimized: boolean
  showConversationList: boolean

  // Active conversation
  activeConversationId: string | null
  messages: ChatMessageData[]
  isLoading: boolean

  // Streaming state
  isStreaming: boolean
  streamingContent: string
  activeToolCalls: ToolCallState[]

  // Past conversations
  conversations: ChatConversationData[]

  // Permission state (per conversation)
  dataPermission: 'none' | 'statistics' | 'family_data'

  // Pending permission request (from AI)
  pendingPermissionRequest: { scope: string; reason: string } | null

  // Context
  currentRoute: string
  currentTreeId: string | null
  currentTreeName: string | null
  focusPersonId: string | null
  focusPersonName: string | null

  // Actions
  open: () => void
  close: () => void
  minimize: () => void
  restore: () => void
  toggle: () => void
  setActiveConversation: (id: string | null, messages: ChatMessageData[]) => void
  addMessage: (msg: ChatMessageData) => void
  setMessages: (msgs: ChatMessageData[]) => void
  setLoading: (loading: boolean) => void
  setConversations: (convs: ChatConversationData[]) => void
  grantDataPermission: (level: 'statistics' | 'family_data') => void
  revokeDataPermission: () => void
  setDataPermission: (perm: 'none' | 'statistics' | 'family_data') => void
  setPendingPermissionRequest: (req: { scope: string; reason: string } | null) => void
  setContext: (route: string, treeId: string | null, treeName: string | null) => void
  setFocusPerson: (id: string | null, name: string | null) => void
  toggleConversationList: () => void
  removeLastAssistantMessage: () => void
  reset: () => void

  // Streaming actions
  startStreaming: () => void
  appendStreamDelta: (delta: string) => void
  addToolCall: (name: string, label: string) => void
  updateToolCall: (name: string, success: boolean, result: string) => void
  finalizeStream: (messageId: string, fullContent: string, metadata?: Record<string, unknown> | null) => void
  cancelStreaming: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  isMinimized: false,
  showConversationList: false,
  activeConversationId: null,
  messages: [],
  isLoading: false,
  isStreaming: false,
  streamingContent: '',
  activeToolCalls: [],
  conversations: [],
  dataPermission: 'none',
  pendingPermissionRequest: null,
  currentRoute: 'home',
  currentTreeId: null,
  currentTreeName: null,
  focusPersonId: null,
  focusPersonName: null,

  open: () => set({ isOpen: true, isMinimized: false }),
  close: () => set({ isOpen: false }),
  minimize: () => set({ isMinimized: true, isOpen: false }),
  restore: () => set({ isMinimized: false }),
  toggle: () => set(s => s.isOpen ? { isOpen: false } : { isOpen: true, isMinimized: false }),

  setActiveConversation: (id, messages) => set({
    activeConversationId: id,
    messages,
    dataPermission: 'none',
    pendingPermissionRequest: null,
  }),

  addMessage: (msg) => set(s => ({ messages: [...s.messages, msg] })),
  setMessages: (msgs) => set({ messages: msgs }),
  setLoading: (loading) => set({ isLoading: loading }),
  setConversations: (convs) => set({ conversations: convs }),

  grantDataPermission: (level) => set({ dataPermission: level, pendingPermissionRequest: null }),
  revokeDataPermission: () => set({ dataPermission: 'none', pendingPermissionRequest: null }),
  setDataPermission: (perm) => set({ dataPermission: perm }),
  setPendingPermissionRequest: (req) => set({ pendingPermissionRequest: req }),

  setContext: (route, treeId, treeName) => set({
    currentRoute: route,
    currentTreeId: treeId,
    currentTreeName: treeName,
  }),

  setFocusPerson: (id, name) => set({
    focusPersonId: id,
    focusPersonName: name,
  }),

  toggleConversationList: () => set(s => ({ showConversationList: !s.showConversationList })),

  removeLastAssistantMessage: () => set(s => {
    const lastIdx = s.messages.map(m => m.role).lastIndexOf('assistant')
    if (lastIdx < 0) return s
    return { messages: s.messages.filter((_, i) => i !== lastIdx) }
  }),

  reset: () => set({
    activeConversationId: null,
    messages: [],
    isLoading: false,
    isStreaming: false,
    streamingContent: '',
    activeToolCalls: [],
    dataPermission: 'none',
    pendingPermissionRequest: null,
    showConversationList: false,
  }),

  // Streaming actions
  startStreaming: () => set({
    isStreaming: true,
    isLoading: true,
    streamingContent: '',
    activeToolCalls: [],
  }),

  appendStreamDelta: (delta) => set(s => ({
    streamingContent: s.streamingContent + delta,
  })),

  addToolCall: (name, label) => set(s => ({
    activeToolCalls: [...s.activeToolCalls, { name, label, status: 'running' }],
  })),

  updateToolCall: (name, success, result) => set(s => ({
    activeToolCalls: s.activeToolCalls.map(tc =>
      tc.name === name && tc.status === 'running'
        ? { ...tc, status: 'done' as const, success, result }
        : tc,
    ),
  })),

  finalizeStream: (messageId, fullContent, metadata) => set(s => ({
    isStreaming: false,
    isLoading: false,
    streamingContent: '',
    activeToolCalls: [],
    messages: [
      ...s.messages,
      {
        messageId,
        role: 'assistant' as const,
        content: fullContent,
        metadata: metadata ?? null,
        createdAt: new Date().toISOString(),
      },
    ],
  })),

  cancelStreaming: () => set({
    isStreaming: false,
    isLoading: false,
    streamingContent: '',
    activeToolCalls: [],
  }),
}))
