import { useState, useEffect } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { resolveBackendUrl } from '@/config/api'
import { useAuthStore } from '@/store/authStore'

interface Props {
  articleSlug: string
  categorySlug: string
}

type State = 'idle' | 'voted' | 'commenting' | 'thanks'

const storageKey = (slug: string) => `help:feedback:${slug}`

export function HelpFeedback({ articleSlug, categorySlug }: Props) {
  const { toast } = useToast()
  const token = useAuthStore(s => s.token)
  const [state, setState] = useState<State>('idle')
  const [helpful, setHelpful] = useState<boolean | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const prev = typeof window !== 'undefined' ? localStorage.getItem(storageKey(articleSlug)) : null
    if (prev) setState('thanks')
  }, [articleSlug])

  async function submit(wasHelpful: boolean, withComment = '') {
    if (submitting) return
    setSubmitting(true)
    try {
      await fetch(resolveBackendUrl('/api/help/feedback'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          articleSlug,
          categorySlug,
          helpful: wasHelpful,
          ...(withComment ? { comment: withComment.slice(0, 2000) } : {}),
        }),
      })
    } catch {
      // fire-and-forget; don't bother the user
    }
    try {
      localStorage.setItem(storageKey(articleSlug), wasHelpful ? '1' : '0')
    } catch { /* ignore */ }
    setSubmitting(false)
    setState('thanks')
    toast({ title: 'Thanks for your feedback!' })
  }

  function handleVote(wasHelpful: boolean) {
    setHelpful(wasHelpful)
    if (wasHelpful) {
      submit(true)
    } else {
      setState('commenting')
    }
  }

  if (state === 'thanks') {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-5 py-4">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Thanks — your feedback helps us improve this help center.
        </p>
      </div>
    )
  }

  if (state === 'commenting') {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-5 py-4 space-y-3">
        <p className="text-sm font-medium text-gray-900 dark:text-white">Sorry this wasn&rsquo;t helpful.</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          What were you looking for? (optional)
        </p>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Your feedback helps us write better articles."
          className="w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/20 resize-none"
        />
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => submit(false, '')}
            disabled={submitting}
            className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-50"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => submit(false, comment)}
            disabled={submitting}
            className="px-4 py-1.5 rounded-lg text-sm font-medium bg-[#2F3E8F] text-white hover:bg-[#283579] disabled:opacity-50"
          >
            Submit
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <p className="text-sm font-medium text-gray-900 dark:text-white">Was this article helpful?</p>
      <div className="flex gap-2">
        <button
          type="button"
          aria-label="Yes, this was helpful"
          onClick={() => handleVote(true)}
          disabled={submitting}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm transition-colors ${
            helpful === true
              ? 'bg-[#F6F2EA] border-[#C2A46D] text-[#2F3E8F]'
              : 'border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
          }`}
        >
          <ThumbsUp className="w-4 h-4" /> Yes
        </button>
        <button
          type="button"
          aria-label="No, this was not helpful"
          onClick={() => handleVote(false)}
          disabled={submitting}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm transition-colors ${
            helpful === false
              ? 'bg-[#F6F2EA] border-[#C2A46D] text-[#2F3E8F]'
              : 'border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
          }`}
        >
          <ThumbsDown className="w-4 h-4" /> No
        </button>
      </div>
    </div>
  )
}
