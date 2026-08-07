/**
 * ChatInput — Text input with send button and voice input for the chat assistant.
 *
 * Uses h-11 + text-base on mobile to prevent iOS auto-zoom.
 * Voice input via Web Speech API (browser-native, zero dependencies).
 */

import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react'
import { Send, Loader2, Mic, MicOff } from 'lucide-react'

// Web Speech API type declarations
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

interface ChatInputProps {
  onSend: (message: string) => void
  isLoading: boolean
  placeholder?: string
}

// Feature detection for Web Speech API
function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as
    (new () => SpeechRecognitionInstance) | null
}

export function ChatInput({ onSend, isLoading, placeholder = 'Ask me anything...' }: ChatInputProps) {
  const [text, setText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const hasVoiceSupport = useRef(!!getSpeechRecognition())

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return
    onSend(trimmed)
    setText('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [text, isLoading, onSend])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const toggleVoice = useCallback(() => {
    if (isRecording) {
      // Stop recording
      recognitionRef.current?.stop()
      setIsRecording(false)
      return
    }

    const SpeechRecognition = getSpeechRecognition()
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-IN'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      // Show interim results while speaking, final result when done
      setText(prev => {
        const base = finalTranscript || prev
        return interimTranscript ? `${base}${interimTranscript}` : base
      })

      if (finalTranscript) {
        setText(finalTranscript)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error)
      setIsRecording(false)
    }

    recognition.onend = () => {
      setIsRecording(false)
      // Focus the input so user can review/edit before sending
      setTimeout(() => inputRef.current?.focus(), 100)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }, [isRecording])

  return (
    <div className="border-t border-[#DDD6C8] dark:border-gray-700 bg-white dark:bg-[#1E1E1E] px-3 py-2">
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? 'Listening...' : placeholder}
          rows={1}
          className={`flex-1 resize-none rounded-xl border
                     bg-[#F6F2EA] dark:bg-[#242424]
                     text-base md:text-[13px] h-11 md:h-9
                     px-3 py-2.5 md:py-2
                     text-gray-900 dark:text-[#F5F1E8]
                     placeholder:text-[#8B7355] dark:placeholder:text-gray-500
                     focus:outline-none focus:ring-2
                     transition-colors ${
            isRecording
              ? 'border-red-400 dark:border-red-500 focus:ring-red-400/30 dark:focus:ring-red-500/30'
              : 'border-[#DDD6C8] dark:border-gray-600 focus:ring-[#2F3E8F]/30 dark:focus:ring-[#5A6BFF]/30'
          }`}
          style={{ maxHeight: '120px' }}
        />

        {/* Voice input button */}
        {hasVoiceSupport.current && (
          <button
            onClick={toggleVoice}
            disabled={isLoading}
            className={`flex-shrink-0 w-9 h-9 md:w-8 md:h-8 rounded-full
                       flex items-center justify-center
                       transition-all mb-0.5 ${
              isRecording
                ? 'bg-red-500 text-white animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                : 'bg-gray-100 dark:bg-[#333] text-[#8B7355] dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#444] hover:text-[#2F3E8F] dark:hover:text-[#7B8FD4]'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
            title={isRecording ? 'Stop' : 'Voice input'}
          >
            {isRecording ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!text.trim() || isLoading}
          className="flex-shrink-0 w-9 h-9 md:w-8 md:h-8 rounded-full
                     bg-[#2F3E8F] dark:bg-[#5A6BFF] text-white
                     flex items-center justify-center
                     hover:bg-[#3B4DA6] dark:hover:bg-[#6C7CFF]
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-colors mb-0.5"
          aria-label="Send message"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  )
}
