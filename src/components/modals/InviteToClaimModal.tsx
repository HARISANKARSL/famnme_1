/**
 * InviteToClaimModal — Owner invites a family member to claim a specific person node.
 *
 * Features:
 * - Email invite (sends via SendGrid)
 * - Copy WhatsApp link (for sharing via messenger)
 * - Person context preview (who they're claiming)
 * - Personal message (optional)
 */

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { inviteUser } from '@/services/collaborationApiService'
import { useToast } from '@/components/ui/use-toast'
import type { Person } from '@/types'

interface InviteToClaimModalProps {
  open: boolean
  onClose: () => void
  treeId: string
  person: Person
}

export function InviteToClaimModal({ open, onClose, treeId, person }: InviteToClaimModalProps) {
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [personalMessage, setPersonalMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sentInvitation, setSentInvitation] = useState<{
    inviteToken?: string | null
    email: string
  } | null>(null)
  // D9 — auto-generate invite link on open so WhatsApp/QR are instant
  const [autoLink, setAutoLink] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  const personName = [person.firstName, person.lastName].filter(Boolean).join(' ') || 'this person'

  useEffect(() => {
    if (!open || autoLink) return
    let cancelled = false
    setGenerating(true)
    inviteUser(treeId, 'link-only@placeholder.local', 'contributor', {
      targetPersonId: person.personId,
    }).then(invitation => {
      if (cancelled || !invitation.inviteToken) return
      const base = window.location.pathname.startsWith('/FC-familytree') ? '/FC-familytree' : ''
      setAutoLink(`${window.location.origin}${base}/invite/${invitation.inviteToken}`)
    }).catch(() => { /* silent — fallback to email-only flow */ })
      .finally(() => { if (!cancelled) setGenerating(false) })
    return () => { cancelled = true }
  }, [open, treeId, person.personId, autoLink])

  const linkForSharing = sentInvitation?.inviteToken
    ? `${window.location.origin}${window.location.pathname.startsWith('/FC-familytree') ? '/FC-familytree' : ''}/invite/${sentInvitation.inviteToken}`
    : autoLink

  const whatsAppText = linkForSharing
    ? `Hi! I've added you to our family tree on FamNme. Tap to claim your spot:\n${linkForSharing}${personalMessage ? `\n\n${personalMessage}` : ''}`
    : ''
  const whatsAppHref = linkForSharing
    ? `https://wa.me/?text=${encodeURIComponent(whatsAppText)}`
    : '#'
  const qrUrl = linkForSharing
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(linkForSharing)}`
    : null

  const handleSendEmail = async () => {
    if (!email.trim()) return
    setSending(true)
    try {
      const invitation = await inviteUser(treeId, email.trim(), 'contributor', {
        targetPersonId: person.personId,
        personalMessage: personalMessage.trim() || undefined,
      })
      setSentInvitation({
        inviteToken: invitation.inviteToken,
        email: email.trim(),
      })
      toast({ title: 'Invitation sent!', description: `Email sent to ${email.trim()}` })
    } catch (err) {
      toast({
        title: 'Failed to send',
        description: err instanceof Error ? err.message : 'Could not send invitation.',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    setEmail('')
    setPersonalMessage('')
    setSentInvitation(null)
    setAutoLink(null)
    onClose()
  }

  const inviteLink = sentInvitation?.inviteToken
    ? `${window.location.origin}${window.location.pathname.startsWith('/FC-familytree') ? '/FC-familytree' : ''}/invite/${sentInvitation.inviteToken}`
    : null

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#2F3E8F]">Invite {personName} to Join</DialogTitle>
          <DialogDescription>
            They can claim this profile and contribute to your tree
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Person context card */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F6F2EA]/60 border border-[#C2A46D]/30">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#C2A46D]/40 bg-gray-100 flex-shrink-0">
              {person.profilePhotoUrl ? (
                <img src={person.profilePhotoUrl} alt={personName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm text-gray-800 truncate">{personName}</p>
              {person.birthDate && (
                <p className="text-xs text-gray-500">b. {person.birthDate.slice(0, 4)}</p>
              )}
            </div>
          </div>

          {/* Success state */}
          {sentInvitation && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm text-green-800">
                  {sentInvitation.email
                    ? `Invitation sent to ${sentInvitation.email}`
                    : 'Invite link generated!'}
                </p>
              </div>

              {inviteLink && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Share Link</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inviteLink}
                      readOnly
                      className="flex-1 h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-600"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(inviteLink)
                        toast({ title: 'Link copied!' })
                      }}
                      className="px-3 h-9 bg-[#2F3E8F] text-white text-xs font-medium rounded-lg hover:bg-[#253275] transition-colors flex-shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => { setSentInvitation(null); setEmail('') }}
                className="text-sm text-[#2F3E8F] hover:underline"
              >
                Send another invitation
              </button>
            </div>
          )}

          {/* D9 — WhatsApp-first: big green button + QR code (always visible when link is ready) */}
          {!sentInvitation && (
            <div className="space-y-3">
              <a
                href={whatsAppHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!linkForSharing}
                onClick={e => { if (!linkForSharing) e.preventDefault() }}
                className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
                  linkForSharing
                    ? 'bg-[#25D366] text-white hover:bg-[#1da851]'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                }`}
              >
                <span aria-hidden className="text-lg leading-none">💬</span>
                {generating ? 'Generating link…' : 'Share via WhatsApp'}
              </a>

              {qrUrl && (
                <div className="flex flex-col items-center gap-2 py-3 rounded-xl bg-stone-50 border border-stone-200">
                  <p className="text-[11px] uppercase tracking-wide text-stone-500">Or scan in person</p>
                  <img
                    src={qrUrl}
                    alt={`QR code for invite link`}
                    width={140}
                    height={140}
                    className="rounded"
                  />
                  <button
                    onClick={() => {
                      if (linkForSharing) {
                        navigator.clipboard.writeText(linkForSharing)
                        toast({ title: 'Link copied!', description: 'Share it however you like.' })
                      }
                    }}
                    className="text-xs text-[#2F3E8F] hover:underline"
                  >
                    Copy link instead →
                  </button>
                </div>
              )}

              {/* Divider */}
              <div className="relative pt-1">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">or send by email</span></div>
              </div>
            </div>
          )}

          {/* Form (before sending) */}
          {!sentInvitation && (
            <>
              {/* Email input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="relative@email.com"
                  className="w-full h-11 md:h-9 px-3 text-base md:text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/20 focus:border-[#2F3E8F]"
                />
              </div>

              {/* Personal message */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Personal Note <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={personalMessage}
                  onChange={e => setPersonalMessage(e.target.value.slice(0, 200))}
                  placeholder="Add a personal message..."
                  rows={2}
                  className="w-full px-3 py-2 text-base md:text-[13px] border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/20 focus:border-[#2F3E8F]"
                />
                <p className="text-xs text-gray-400 text-right">{personalMessage.length}/200</p>
              </div>

              {/* Send email CTA */}
              <button
                onClick={handleSendEmail}
                disabled={!email.trim() || sending}
                className="w-full py-2.5 bg-[#2F3E8F] text-white rounded-xl font-medium text-sm hover:bg-[#253275] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                )}
                Send Email Invite
              </button>

            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
