/**
 * ClaimLandingPage — Public invite landing page.
 *
 * Route: /invite/:invitationId (unauthenticated access allowed).
 *
 * Unauthenticated users get an immediate read-only view of the family tree
 * (names, photos, relationships only) centered on the person they were
 * invited as, with a persistent CTA to "Join this family tree" which routes
 * them to signup with auto-claim after successful registration.
 *
 * Authenticated users see the same read-only view plus a one-click
 * "Claim this profile" action that accepts the invite and routes to dashboard.
 *
 * Preserved states: expired invite, already-accepted invite.
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { getPublicInvitation, getPublicTreeWindow, type PublicInvitation, type PublicTreeWindow } from '@/services/publicInviteService'
import { acceptAndClaim } from '@/services/claimApiService'
import { useToast } from '@/components/ui/use-toast'
import { UnionBasedTreeCanvas } from '@/components/canvas/UnionBasedTreeCanvas'
import type { TreeWindowData } from '@/services/neo4jDataService'

// ── Sub-components ───────────────────────────────────────────────────────

function FullScreenCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F6F2EA] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-[#2F3E8F] via-[#4B2C5E] to-[#C2A46D]" />
        <div className="p-6 md:p-8 space-y-6">
          <div className="text-center">
            <span className="text-sm font-medium text-[#C2A46D] tracking-wider uppercase">FamNme</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

function PersonPreviewCard({ name, photo }: { name?: string | null; photo?: string | null }) {
  return (
    <div className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-[#C2A46D]/40 bg-white/80">
      <div className="w-24 h-24 rounded-full overflow-hidden border-3 border-[#C2A46D] bg-gray-100 flex items-center justify-center">
        {photo ? (
          <img src={photo} alt={name || 'Person'} className="w-full h-full object-cover" />
        ) : (
          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )}
      </div>
      <p className="text-lg font-semibold text-[#2F3E8F]">{name || 'Family Member'}</p>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#F6F2EA] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-3 border-[#2F3E8F] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#3D2E1F]/70">Loading the family tree…</p>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────

export function ClaimLandingPage() {
  const { invitationId: token } = useParams<{ invitationId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const user = useAuthStore(s => s.user)

  const [invitation, setInvitation] = useState<PublicInvitation | null>(null)
  const [treeWindow, setTreeWindow] = useState<PublicTreeWindow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link.')
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const inv = await getPublicInvitation(token)
        if (cancelled) return
        setInvitation(inv)

        const isUsable = inv.status === 'pending'
        if (isUsable) {
          const window = await getPublicTreeWindow(token, inv.targetPersonId ?? undefined)
          if (cancelled) return
          setTreeWindow(window)
        }
      } catch {
        if (!cancelled) setError('This invitation was not found.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [token])

  const handleJoin = async () => {
    if (!token) return
    if (!user) {
      navigate(`/login?mode=register&returnTo=${encodeURIComponent(`/invite/${token}`)}&autoClaim=1`)
      return
    }
    setClaiming(true)
    try {
      await acceptAndClaim(token)
      setClaimed(true)
      toast({
        title: `Welcome to the ${invitation?.treeName || 'Family'} tree!`,
        description: 'You now have access and can propose changes.',
      })
      setTimeout(() => navigate('/dashboard', { replace: true }), 1500)
    } catch (err) {
      toast({
        title: 'Could not join',
        description: err instanceof Error ? err.message : 'Something went wrong.',
        variant: 'destructive',
      })
    } finally {
      setClaiming(false)
    }
  }

  if (loading) return <LoadingScreen />

  if (error || !invitation) {
    return (
      <FullScreenCard>
        <div className="text-center space-y-4 py-8">
          <svg className="w-16 h-16 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600">{error || 'Invitation unavailable.'}</p>
        </div>
      </FullScreenCard>
    )
  }

  if (invitation.status === 'expired') {
    return (
      <FullScreenCard>
        <div className="text-center space-y-4 py-4">
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Invitation Expired</h2>
          <p className="text-gray-500 text-sm">
            Ask {invitation.invitedByName || 'the tree owner'} to send a new invitation.
          </p>
          <PersonPreviewCard name={invitation.targetPersonName} photo={invitation.targetPersonPhoto} />
        </div>
      </FullScreenCard>
    )
  }

  if (invitation.status === 'accepted' && !claimed) {
    return (
      <FullScreenCard>
        <div className="text-center space-y-4 py-4">
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Already Claimed</h2>
          <p className="text-gray-500 text-sm">This profile has already been claimed.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-[#2F3E8F] text-white rounded-xl font-medium hover:bg-[#253275] transition-colors"
          >
            Go to Your Tree
          </button>
        </div>
      </FullScreenCard>
    )
  }

  if (claimed) {
    return (
      <FullScreenCard>
        <div className="text-center space-y-4 py-8">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Welcome to the family!</h2>
          <p className="text-gray-500 text-sm">Redirecting to your family tree…</p>
        </div>
      </FullScreenCard>
    )
  }

  // Full-viewport read-only tree view
  const canvasData: TreeWindowData | null = treeWindow
    ? { persons: treeWindow.persons, unions: treeWindow.unions, relationships: treeWindow.relationships }
    : null

  return (
    <div className="fixed inset-0 bg-[#F6F2EA] flex flex-col overflow-hidden">
      {/* A14 — Personal welcome banner */}
      {!bannerDismissed && (
        <div className="relative z-20 shrink-0 bg-gradient-to-r from-[#2F3E8F] via-[#4B2C5E] to-[#C2A46D] text-white px-4 py-3.5 md:py-3 shadow-md">
          <div className="max-w-5xl mx-auto flex items-start md:items-center gap-3">
            <div
              className="shrink-0 w-10 h-10 md:w-9 md:h-9 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border border-white/30"
              aria-hidden="true"
            >
              {invitation.targetPersonPhoto ? (
                <img src={invitation.targetPersonPhoto} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-display text-base font-semibold">
                  {(invitation.invitedByName || '?').trim().charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-[16px] md:text-[15px] font-bold leading-tight">
                <span>{invitation.invitedByName || 'A family member'}</span> built a family tree.
              </p>
              <p className="text-[12px] md:text-[12px] text-white/85 mt-0.5 leading-snug">
                {invitation.targetPersonName ? (
                  <>They'd like you to join as <span className="font-semibold text-white">{invitation.targetPersonName}</span> — highlighted in gold below.</>
                ) : (
                  <>They'd like you to join the <span className="font-semibold text-white">{invitation.treeName || 'family'}</span> tree.</>
                )}
              </p>
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              className="shrink-0 text-[11px] font-medium text-white/80 hover:text-white underline-offset-2 hover:underline"
              aria-label="Hide welcome message"
            >
              Just let me view
            </button>
          </div>
        </div>
      )}

      {/* Tree canvas (read-only) */}
      <div className="flex-1 relative min-h-0">
        {canvasData && invitation.treeId ? (
          <UnionBasedTreeCanvas
            treeId={invitation.treeId}
            externalTreeData={canvasData}
            readOnly
            focusPersonId={invitation.targetPersonId ?? undefined}
            highlightPersonId={invitation.targetPersonId ?? undefined}
            treeName={invitation.treeName ?? undefined}
          />
        ) : (
          <LoadingScreen />
        )}
      </div>

      {/* A14 — Bottom CTA bar with trust row + learn-more footer */}
      <div className="relative z-20 shrink-0 bg-white border-t border-[#C2A46D]/30 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.08)]">
        <div className="max-w-5xl mx-auto px-4 pt-3 pb-2 md:pt-3.5 flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="flex-1 text-center md:text-left">
            <p className="font-display text-[16px] md:text-[15px] font-bold text-[#2F3E8F]">
              {invitation.targetPersonName
                ? `Claim your spot — it's me, ${invitation.targetPersonName.split(' ')[0]}`
                : 'Want to be part of this family tree?'}
            </p>
            <p className="text-[12px] text-[#3D2E1F]/70 mt-0.5">
              {user
                ? 'Claiming lets you add memories and suggest edits.'
                : 'Free forever. Only you can see your personal details.'}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleJoin}
              disabled={claiming}
              className="min-h-11 md:min-h-10 px-6 rounded-xl bg-[#2F3E8F] text-white font-semibold text-sm hover:bg-[#253275] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ boxShadow: '0 4px 14px rgba(47,62,143,0.35)' }}
            >
              {claiming && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {user
                ? (invitation.targetPersonName ? 'This is me — claim' : 'Claim my profile')
                : (invitation.targetPersonName ? 'This is me — join' : 'Join this family tree')}
            </button>
          </div>
        </div>
        {/* Trust + learn-more row */}
        <div className="max-w-5xl mx-auto px-4 pb-2.5 flex flex-wrap items-center justify-center md:justify-between gap-x-4 gap-y-1">
          <p className="text-[11px] text-[#8B7355] inline-flex items-center gap-1.5">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Only you can see your personal details · {invitation.invitedByName || 'They'} chose what's public
          </p>
          {/* <a
            href="https://beta.famnme.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold text-[#2F3E8F] hover:underline"
          >
            What's FamNme? →
          </a> */}
        </div>
      </div>
    </div>
  )
}
