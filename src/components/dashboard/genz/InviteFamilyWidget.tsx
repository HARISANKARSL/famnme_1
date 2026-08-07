/**
 * InviteFamilyWidget — Engaging tree completeness + WhatsApp invite widget
 *
 * Shows a beautiful circular progress ring with completeness percentage,
 * emotional messaging about preserving family stories, and a WhatsApp
 * share button that sends an OG-tagged invite link.
 */

import { useMemo, useCallback } from 'react'
import { ArrowRight } from 'lucide-react'
import type { Person } from '@/types'

interface InviteFamilyWidgetProps {
  persons: Person[]
  treeId?: string
  familyName?: string
  completenessPercent?: number
  onInvite?: () => void
}

// ── SVG Circular Progress Ring ──
function ProgressRing({ percent, size = 80 }: { percent: number; size?: number }) {
  const stroke = 6
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="currentColor"
          strokeWidth={stroke}
          className="text-stone-100 dark:text-[#333]"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{
            stroke: `url(#progressGradient)`,
          }}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C2A46D" />
            <stop offset="100%" stopColor="#2F3E8F" />
          </linearGradient>
        </defs>
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[20px] font-bold text-[#2F3E8F] dark:text-[#7B8FD4] leading-none">
          {percent}%
        </span>
        <span className="text-[9px] text-[#8B7355] dark:text-[#888] font-medium mt-0.5">complete</span>
      </div>
    </div>
  )
}

// ── WhatsApp icon SVG ──
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

// ── Emotional messages based on completeness ──
function getEmotionalMessage(percent: number, memberCount: number, familyName: string): { headline: string; subtext: string; shareText: string } {
  if (percent < 20) {
    return {
      headline: `Every family has a story worth preserving`,
      subtext: `Your ${familyName} tree has just begun. Every name you add keeps a piece of history alive for generations to come.`,
      shareText: `Hey! I've been putting together our ${familyName} family tree and we already have ${memberCount} members on it. I'd love your help filling in the details — do you remember any names, dates, or stories from our side of the family? Check it out here`,
    }
  }
  if (percent < 40) {
    return {
      headline: `${memberCount} names, countless stories untold`,
      subtext: `The ${familyName} tree is growing. But there are branches waiting to be filled — people whose stories only you can tell.`,
      shareText: `Our ${familyName} family tree is growing — ${memberCount} members and counting! There are still some gaps though. Would you be able to help add details about your side? Here's the link`,
    }
  }
  if (percent < 60) {
    return {
      headline: `Your family's legacy is taking shape`,
      subtext: `${percent}% of your tree is documented. Each new detail — a birthplace, a photo, a story — makes the ${familyName} history richer.`,
      shareText: `Did you know we have ${memberCount} people in our ${familyName} family tree? It's ${percent}% complete and I think you could help fill in some of the missing details. Take a look`,
    }
  }
  if (percent < 80) {
    return {
      headline: `The ${familyName} story is almost complete`,
      subtext: `You're so close! A few more details and your family tree becomes a treasure for future generations to discover.`,
      shareText: `We're so close to completing our ${familyName} family tree — ${percent}% done with ${memberCount} members! Your knowledge of the family would really help finish it. Have a look`,
    }
  }
  return {
    headline: `A legacy preserved for generations`,
    subtext: `${memberCount} family members, documented and connected. The ${familyName} story will live on through the ones who come after.`,
    shareText: `I've been working on our ${familyName} family tree and it's come together beautifully — ${memberCount} members across multiple generations! Come see how far back our family goes`,
  }
}

export function InviteFamilyWidget({
  persons,
  treeId,
  familyName = 'Your',
  completenessPercent,
  onInvite,
}: InviteFamilyWidgetProps) {
  const memberCount = useMemo(() => persons.filter(p => !p.isDeleted && !(p as any).isProxy && !(p.personId && p.personId.includes('_proxy_'))).length, [persons])
  const percent = completenessPercent ?? 0
  const message = useMemo(() => getEmotionalMessage(percent, memberCount, familyName), [percent, memberCount, familyName])

  const shareToWhatsApp = useCallback(() => {
    // Clean URL — WhatsApp crawls it and shows the OG preview card
    // (branded image hosted at CDN, set in index.html og:image)
    const appUrl = 'https://nothing.com'
    const text = `${message.shareText}\n\n${appUrl}`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(whatsappUrl, '_blank', 'noopener')
  }, [message.shareText])

  if (!onInvite && !treeId) return null

  return (
    <div className="rounded-2xl bg-white dark:bg-[#242424] shadow-sm ring-1 ring-stone-100 dark:ring-[#333] overflow-hidden">
      {/* Main content */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Progress ring */}
          <ProgressRing percent={percent} />

          {/* Text content */}
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-[15px] font-bold text-[#3D2E1F] dark:text-[#F5F1E8] leading-snug">
              {message.headline}
            </p>
            <p className="text-[12px] text-[#8B7355] dark:text-[#999] mt-1.5 leading-relaxed">
              {message.subtext}
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-stretch border-t border-stone-100 dark:border-[#333]">
        {/* WhatsApp share */}
        <button
          onClick={shareToWhatsApp}
          className="flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-semibold text-[#25D366] hover:bg-[#25D366]/[0.06] active:bg-[#25D366]/[0.1] transition-colors"
        >
          <WhatsAppIcon className="w-4 h-4" />
          Share on WhatsApp
        </button>

        {/* Divider */}
        <div className="w-px bg-stone-100 dark:bg-[#333]" />

        {/* Invite button */}
        {onInvite && (
          <button
            onClick={onInvite}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[13px] font-semibold text-[#2F3E8F] dark:text-[#5A6BFF] hover:bg-[#2F3E8F]/[0.06] active:bg-[#2F3E8F]/[0.1] transition-colors"
          >
            Invite Family
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
