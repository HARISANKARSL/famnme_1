import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageSquareText, Mic, MicOff, Send, Loader2, Bug, Lightbulb, MessageCircle, Image, X, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  ResponsiveDialogContent,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { API_BASE_URL } from '@/config/api'
import { getAuthToken } from '@/lib/auth'

/* Web Speech API types (not in all TS DOM libs) */
interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: { resultIndex: number; results: { length: number;[i: number]: { isFinal: boolean; 0: { transcript: string } } } }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => SpeechRecognitionLike) | null
}

type FeedbackCategory = 'general' | 'bug' | 'suggestion'

const CATEGORIES: { id: FeedbackCategory; label: string; icon: typeof Bug }[] = [
  { id: 'general', label: 'General', icon: MessageCircle },
  { id: 'bug', label: 'Bug Report', icon: Bug },
  { id: 'suggestion', label: 'Suggestion', icon: Lightbulb },
]

interface FeedbackModalProps {
  open: boolean
  onClose: () => void
}

export function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const [category, setCategory] = useState<FeedbackCategory>('general')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)

  const [attachments, setAttachments] = useState<File[]>([])
  const [attachmentPreviews, setAttachmentPreviews] = useState<string[]>([])
  const [attachmentBase64s, setAttachmentBase64s] = useState<string[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Feature-detect speech recognition on mount
  useEffect(() => {
    setSpeechSupported(!!getSpeechRecognitionCtor())
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [])

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setCategory('general')
      setMessage('')
      setError(null)
      setSuccess(false)
      setSending(false)
      setIsListening(false)
      recognitionRef.current?.stop()
      setAttachments([])
      setAttachmentPreviews([])
      setAttachmentBase64s([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [open])

  const toggleSpeechToText = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const SR = getSpeechRecognitionCtor()
    if (!SR) {
      setError('Speech recognition is not supported in this browser.')
      return
    }

    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-IN'

    recognition.onresult = (event) => {
      let finalTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript
        }
      }
      if (finalTranscript) {
        setMessage(prev => prev + (prev ? ' ' : '') + finalTranscript)
      }
    }

    recognition.onerror = (event) => {
      setIsListening(false)
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone permissions.')
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
    setError(null)
  }, [isListening])

  const getCompressedBase64 = async (file: File): Promise<string> => {
    // If it's already under 150KB, just read it as base64 directly
    const maxBytes = 150 * 1024
    if (file.size <= maxBytes) {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result as string
          resolve(result.split(',')[1] || result)
        }
        reader.readAsDataURL(file)
      })
    }

    // Otherwise, compress it using Canvas
    return new Promise((resolve) => {
      const img = new window.Image()
      img.onload = () => {
        const MAX_DIM = 1024
        let width = img.naturalWidth
        let height = img.naturalHeight

        if (width > MAX_DIM || height > MAX_DIM) {
          const scale = Math.min(MAX_DIM / width, MAX_DIM / height)
          width = Math.round(width * scale)
          height = Math.round(height * scale)
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          const reader = new FileReader()
          reader.onloadend = () => {
            const result = reader.result as string
            resolve(result.split(',')[1] || result)
          }
          reader.readAsDataURL(file)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        URL.revokeObjectURL(img.src)

        const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
        resolve(dataUrl.split(',')[1] || dataUrl)
      }
      img.onerror = () => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result as string
          resolve(result.split(',')[1] || result)
        }
        reader.readAsDataURL(file)
      }
      img.src = URL.createObjectURL(file)
    })
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const files = e.target.files
    if (!files || files.length === 0) return

    const allowedExtensions = ['png', 'jpg', 'jpeg', 'webp']
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    const validNewFiles: File[] = []

    // Validate type and extension for all selected files first
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileExtension = file.name.split('.').pop()?.toLowerCase()
      const isValidType = allowedTypes.includes(file.type) || (fileExtension && allowedExtensions.includes(fileExtension))

      if (!file.type.startsWith('image/') || !isValidType) {
        setError('Unsupported file type. Please upload only PNG, JPG, JPEG, or WEBP images.')
        return
      }

      validNewFiles.push(file)
    }

    if (validNewFiles.length === 0) return
    const filesToLoad = validNewFiles

    // Validate combined total size limit
    const totalNewSize = filesToLoad.reduce((sum, f) => sum + f.size, 0)
    const existingTotalSize = attachments.reduce((sum, f) => sum + f.size, 0)
    const maxSize = 20 * 1024 * 1024 // 20MB

    if (existingTotalSize + totalNewSize > maxSize) {
      setError('Total file size must not exceed 20MB.')
      return
    }

    // Update attachments state
    const updatedAttachments = [...attachments, ...filesToLoad]
    setAttachments(updatedAttachments)

    // Generate previews and compressed base64 strings
    const newPreviews: string[] = []
    const newBase64s: string[] = []

    for (const file of filesToLoad) {
      // Preview Data URL
      const previewUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
      newPreviews.push(previewUrl)

      // Compressed raw base64 string
      try {
        const base64Str = await getCompressedBase64(file)
        newBase64s.push(base64Str)
      } catch {
        const base64Str = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            const result = reader.result as string
            resolve(result.split(',')[1] || result)
          }
          reader.readAsDataURL(file)
        })
        newBase64s.push(base64Str)
      }
    }

    setAttachmentPreviews((prev) => [...prev, ...newPreviews])
    setAttachmentBase64s((prev) => [...prev, ...newBase64s])
  }

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
    setAttachmentPreviews((prev) => prev.filter((_, i) => i !== index))
    setAttachmentBase64s((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSend = async () => {
    const trimmed = message.trim()
    if (!trimmed) return

    setSending(true)
    setError(null)

    try {
      const token = getAuthToken()
      const res = await fetch(`${API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          category,
          message: trimmed,
          attachments: attachmentBase64s,
          attachment: attachmentBase64s[0] || null, // fallback for backwards compatibility
        }),
      })

      if (!res.ok) {
        if (res.status === 429) {
          setError('You\'ve sent too many messages. Please try again later.')
        } else {
          setError('Failed to send feedback. Please try again.')
        }
        return
      }

      setSuccess(true)
      recognitionRef.current?.stop()
      setIsListening(false)

      successTimerRef.current = setTimeout(() => {
        onClose()
      }, 2000)
    } catch {
      setError('Failed to send feedback. Please check your connection.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <ResponsiveDialogContent mobileTitle="Send Feedback" className="sm:max-w-md overflow-hidden max-h-[90vh] flex flex-col p-5 sm:p-6 gap-3">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-[#2F3E8F]/10 flex items-center justify-center">
              <MessageSquareText className="w-5 h-5 text-[#2F3E8F]" />
            </div>
            <div>
              <DialogTitle className="text-[15px]">Send Feedback</DialogTitle>
              <DialogDescription className="text-[12px]">Help us improve FamNme</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
              <Send className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-[15px] font-medium text-green-700 dark:text-green-400">
              Thank you for your feedback!
            </p>
            <p className="text-[13px] text-[#8B7355] dark:text-[#A19F9D] mt-1">
              We appreciate you taking the time to help us improve.
            </p>
          </div>
        ) : (
          <>
            {/* Category pills - fixed */}
            <div className="flex gap-2 flex-shrink-0 mt-1">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon
                const isActive = category === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    aria-pressed={isActive}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${isActive
                      ? 'bg-[#2F3E8F] text-white'
                      : 'bg-[#F4F6FA] dark:bg-[#2a2a2a] text-[#8B7355] dark:text-[#A19F9D] hover:bg-[#E8DDD3] dark:hover:bg-[#333]'
                      }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {cat.label}
                  </button>
                )
              })}
            </div>

            {/* Scrollable form body */}
            <div className="flex-1 overflow-y-auto px-1.5 py-2.5 min-h-0 space-y-3">
              {/* Textarea with mic button (mic commented out) */}
              <div className="relative">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what's on your mind..."
                  maxLength={2000}
                  rows={4}
                  autoFocus
                  className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] px-3 py-2.5 pr-3 text-base md:text-[13px] text-[#3D2E1F] dark:text-[#f5f5f5] placeholder:text-[#B8A090] dark:placeholder:text-[#A19F9D]/50 resize-none focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/30 focus:border-[#2F3E8F] transition-colors"
                />
              </div>

              {/* Character count */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#B8A090] dark:text-[#A19F9D] ml-auto">
                  {message.length}/2000
                </span>
              </div>

              {/* Media Attachment Upload Section */}
              <div className="space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="hidden"
                  id="feedback-attachment-input"
                  multiple
                />

                <label
                  htmlFor="feedback-attachment-input"
                  className="flex flex-col items-center justify-center border border-dashed border-[#E2E8F0] dark:border-[#2a2a2a] rounded-lg p-3 cursor-pointer hover:bg-[#F4F6FA] dark:hover:bg-[#2a2a2a] transition-colors"
                >
                  <Image className="w-5 h-5 text-[#8B7355] dark:text-[#A19F9D] mb-1" />
                  <span className="text-[12px] font-medium text-[#3D2E1F] dark:text-[#f5f5f5]">
                    Attach Images
                  </span>
                  <span className="text-[10px] text-[#B8A090] dark:text-[#A19F9D] mt-0.5">
                    PNG, JPG, JPEG, WEBP (Max 20MB total)
                  </span>
                </label>

                {attachmentPreviews.length > 0 && (
                  <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-1">
                    {attachmentPreviews.map((preview, index) => {
                      const file = attachments[index]
                      return (
                        <div
                          key={index}
                          className="relative flex items-center gap-3 p-2 border border-[#E2E8F0] dark:border-[#2a2a2a] rounded-lg bg-[#F4F6FA] dark:bg-[#1a1a1a]"
                        >
                          <div className="relative w-10 h-10 rounded border border-[#E2E8F0] dark:border-[#2a2a2a] overflow-hidden flex-shrink-0 bg-white">
                            <img
                              src={preview}
                              alt={`Attachment ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium text-[#3D2E1F] dark:text-[#f5f5f5] truncate">
                              {file?.name}
                            </p>
                            <p className="text-[10px] text-[#B8A090] dark:text-[#A19F9D]">
                              {file ? `${(file.size / 1024).toFixed(2)} KB` : ''}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(index)}
                            className="p-1 rounded-full hover:bg-[#E8DDD3] dark:hover:bg-[#333] text-[#8B7355] dark:text-[#A19F9D] transition-colors"
                            title="Remove attachment"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Error message (fixed above footer) */}
            {error && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 text-[12px] font-medium flex-shrink-0 mt-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Disabled button helper warning (fixed above footer) */}
            {!message.trim() && (
              <div

                className="flex items-start justify--end gap-1.5 text-[11px] text-[#B8A090] dark:text-[#A19F9D] flex-shrink-0 mt-2"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Please enter a feedback message to enable submission.</span>
              </div>
            )}

            {/* Footer - fixed */}
            <DialogFooter className="flex-shrink-0 pt-2 border-t border-[#E2E8F0]/30 dark:border-[#2a2a2a]/30">
              <Button
                variant="outline"
                onClick={onClose}
                className="text-[13px]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={!message.trim() || sending}
                className="bg-[#2F3E8F] hover:bg-[#A86540] text-white text-[13px] gap-1.5 disabled:opacity-50 disabled:bg-[#2F3E8F]/40 disabled:text-white/40 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send Feedback
              </Button>
            </DialogFooter>
          </>
        )}
      </ResponsiveDialogContent>
    </Dialog>
  )
}
