import { Mail } from 'lucide-react'

interface Props {
  articleTitle?: string
}

export function HelpContactCTA({ articleTitle }: Props) {
  const subject = articleTitle ? `Help: ${articleTitle}` : 'Help Center inquiry'
  const articleUrl = typeof window !== 'undefined' ? window.location.href : ''
  const bodyLines = [
    'Hi FamNme team,',
    '',
    '',
    '',
    articleUrl ? `(Context: ${articleUrl})` : '',
  ]
  const mailto = `mailto:support@famnme.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`

  return (
    <div className="rounded-xl bg-[#F6F2EA] dark:bg-zinc-800/50 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Still need help?</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
          Email our team and we&rsquo;ll get back to you within one business day.
        </p>
      </div>
      <a
        href={mailto}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2F3E8F] text-white text-sm font-medium hover:bg-[#283579] transition-colors shrink-0"
      >
        <Mail className="w-4 h-4" /> Contact support
      </a>
    </div>
  )
}
