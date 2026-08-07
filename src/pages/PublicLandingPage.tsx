/**
 * Public logged-out landing page served at `/`.
 * Written in the style of BBH (Bartle Bogle Hegarty): one provocative
 * human-truth idea, executed with editorial restraint. Indian-family
 * primary, neutral (non-religious) in register.
 *
 * Authenticated users are redirected to /dashboard from App.tsx routing.
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

// ----------------------------------------------------------------------------
// Reveal-on-scroll hook. Sets data-revealed="true" on the element when it
// enters the viewport; the .bbh-reveal class in index.css does the fade-up.
// ----------------------------------------------------------------------------
function useRevealOnScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      el.setAttribute('data-revealed', 'true')
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.setAttribute('data-revealed', 'true')
          io.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return ref
}

// ----------------------------------------------------------------------------
// Header — minimal, sticky, shrinks with backdrop-blur after 80px scroll
// ----------------------------------------------------------------------------
function Header() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <header
      className="sticky top-0 z-50 transition-all duration-300"
      style={{
        height: scrolled ? 56 : 72,
        background: scrolled ? 'rgba(246,242,234,0.82)' : 'transparent',
        backdropFilter: scrolled ? 'saturate(180%) blur(14px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'saturate(180%) blur(14px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(62,36,24,0.08)' : '1px solid transparent',
      }}
    >
      <div className="mx-auto h-full w-full max-w-[1360px] px-5 md:px-10 flex items-center justify-between">
        <Link
          to="/"
          aria-label="FamNme home"
          className="flex items-center min-h-[44px] -mx-2 px-2"
        >
          <img
            src="/Fam N Me_Logo_SVG.svg"
            alt="FamNme"
            className="h-7 md:h-8 w-auto"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium" style={{ color: '#3D2E1F' }}>
          <a href="#idea" onClick={scrollTo('idea')} className="bbh-underline">The Idea</a>
          <a href="#how" onClick={scrollTo('how')} className="bbh-underline">How It Works</a>
          <a href="#family" onClick={scrollTo('family')} className="bbh-underline">The Family</a>
        </nav>

        <div className="flex items-center gap-2 md:gap-5">
          <button
            onClick={() => useAuthStore.getState().signIn()}
            className="bbh-underline inline-flex items-center h-11 md:h-10 px-3 text-[13px] md:text-[14px] font-medium"
            style={{ color: '#3D2E1F', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Sign in
          </button>
          {/* <button
            onClick={() => useAuthStore.getState().signIn()}
            className="inline-flex items-center h-11 md:h-10 px-4 md:px-5 rounded-full text-[13px] md:text-[14px] font-semibold transition-colors"
            style={{
              background: '#2F3E8F',
              color: '#F6F2EA',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#283574')}
            onMouseLeave={e => (e.currentTarget.style.background = '#2F3E8F')}
          >
            Start your tree
          </button> */}
        </div>
      </div>
    </header>
  )
}

// ----------------------------------------------------------------------------
// 1. Hero — massive editorial H1 left, cropped portrait right
// ----------------------------------------------------------------------------
function Hero() {
  const headline = 'Everyone you come from is still here.'
  const words = headline.split(' ')
  const eyebrowRef = useRevealOnScroll<HTMLParagraphElement>()
  const subRef = useRevealOnScroll<HTMLParagraphElement>()
  const ctaRowRef = useRevealOnScroll<HTMLDivElement>()
  const photoRef = useRevealOnScroll<HTMLDivElement>()
  const captionRef = useRevealOnScroll<HTMLElement>()

  return (
    <section
      id="idea"
      className="relative overflow-hidden"
      style={{ background: '#F6F2EA' }}
    >
      <div className="mx-auto max-w-[1360px] px-5 md:px-10 pt-10 md:pt-16 pb-14 md:pb-20">
        <div className="grid grid-cols-12 gap-6 md:gap-10 items-end">
          {/* Left: H1 + sub + CTA */}
          <div className="col-span-12 lg:col-span-7">
            <p
              className="text-[11px] md:text-[12px] font-semibold uppercase bbh-reveal"
              style={{ color: '#8B6A3F', letterSpacing: '0.22em' }}
              ref={eyebrowRef}
            >
              A family archive, for the generations still listening.
            </p>

            <h1
              className="font-display font-bold mt-5 md:mt-7"
              style={{
                color: '#1F1A14',
                lineHeight: 0.92,
                letterSpacing: '-0.025em',
                fontSize: 'clamp(40px, 8.5vw, 128px)',
                textAlign: 'left',
                textWrap: 'balance',
              }}
            >
              {words.map((w, i) => (
                <span
                  key={i}
                  className="bbh-word"
                  style={{ ['--word-index' as string]: i } as React.CSSProperties}
                >
                  {w}
                  {i < words.length - 1 ? '\u00A0' : ''}
                </span>
              ))}
            </h1>

            <p
              className="mt-7 md:mt-9 max-w-[520px] bbh-reveal"
              style={{
                color: '#4A3D2E',
                fontSize: '15px',
                lineHeight: 1.65,
              }}
              ref={subRef}
            >
              In the names above yours. In the languages you half-remember. In the
              photographs nobody labelled. FamNme is how you record them — before
              the remembering stops.
            </p>

            <div className="mt-8 md:mt-10 flex flex-wrap items-center gap-5 bbh-reveal"
              ref={ctaRowRef}
            >
              <button
                onClick={() => useAuthStore.getState().signIn()}
                className="inline-flex items-center gap-2 h-12 md:h-14 pl-6 pr-5 rounded-full text-[14px] md:text-[15px] font-semibold transition-colors"
                style={{
                  background: '#C2A46D',
                  color: '#1F1A14',
                  border: 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#B0925A')}
                onMouseLeave={e => (e.currentTarget.style.background = '#C2A46D')}
              >
                Begin with your name
                <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>→</span>
              </button>
              <button
                onClick={() => useAuthStore.getState().signIn()}
                className="bbh-underline inline-flex items-center min-h-[44px] py-2 text-[13px] md:text-[14px] font-medium"
                style={{ color: '#2F3E8F', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                I already have an account
              </button>
            </div>
          </div>

          {/* Right: circular portrait + one-line Playfair caption.
              login-woman.webp is already a circular PNG with transparent bg
              — we lean into the cut-out rather than forcing a rectangle. */}
          <div className="col-span-12 lg:col-span-5">
            <figure className="relative">
              <div
                className="relative w-full bbh-reveal"
                style={{ aspectRatio: '1 / 1' }}
                ref={photoRef}
              >
                <img
                  src="/login-woman.webp"
                  alt="A woman in a quiet sitting room, her gaze drifting past the frame — the kind of afternoon a family remembers."
                  className="absolute inset-0 w-full h-full bbh-photo"
                  style={{
                    objectFit: 'contain',
                    WebkitMaskImage:
                      "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><circle cx='50' cy='50' r='50' fill='black'/><path d='M 0 0 L 50 0 A 50 50 0 0 0 0 50 Z' fill='black'/></svg>\")",
                    maskImage:
                      "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><circle cx='50' cy='50' r='50' fill='black'/><path d='M 0 0 L 50 0 A 50 50 0 0 0 0 50 Z' fill='black'/></svg>\")",
                    WebkitMaskSize: '100% 100%',
                    maskSize: '100% 100%',
                    WebkitMaskRepeat: 'no-repeat',
                    maskRepeat: 'no-repeat',
                  }}
                  loading="eager"
                  fetchPriority="high"
                />
                {/* Photo-corner bracket at top-left: short L-mount that makes
                    the retained white corner read as a deliberate pointer back
                    toward the headline. */}
                <div
                  aria-hidden="true"
                  className="absolute top-0 left-0 pointer-events-none"
                  style={{
                    width: '22%',
                    height: '22%',
                    borderTop: '1.5px solid rgba(62,46,31,0.38)',
                    borderLeft: '1.5px solid rgba(62,46,31,0.38)',
                  }}
                />
              </div>
              <figcaption
                className="mt-5 flex items-baseline justify-between gap-4 bbh-reveal"
                ref={captionRef}
              >
                <span
                  className="font-display italic"
                  style={{
                    color: '#3D2E1F',
                    fontSize: 'clamp(15px, 1.4vw, 18px)',
                    letterSpacing: '0.005em',
                  }}
                >
                  Meera, 1982, Pune.
                </span>
                <span
                  className="text-[10px] uppercase tracking-[0.22em] font-semibold"
                  style={{ color: '#8B6A3F' }}
                >
                  One name · one date · one place
                </span>
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  )
}

// ----------------------------------------------------------------------------
// 2. Dark band — ghost type secondary headline. Static. No animation.
// ----------------------------------------------------------------------------
function DarkBand() {
  const revealRef = useRevealOnScroll<HTMLDivElement>()
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: '#4B2C5E' }}
    >
      <div className="mx-auto max-w-[1360px] px-5 md:px-10 py-24 md:py-36">
        <div ref={revealRef} className="bbh-reveal">
          <h2
            className="font-display font-bold bbh-ghost"
            style={{
              fontSize: 'clamp(46px, 11vw, 170px)',
              textAlign: 'left',
              textWrap: 'balance',
            }}
          >
            Before you, there were them.
          </h2>
          <p
            className="mt-8 md:mt-10 max-w-[520px]"
            style={{
              color: '#D6B67A',
              fontSize: '14px',
              lineHeight: 1.65,
              letterSpacing: '0.005em',
            }}
          >
            Every generation loses a little more — a name, a hand on a cheek, a
            recipe nobody wrote down. FamNme is how you stop the clock.
          </p>
        </div>
      </div>
    </section>
  )
}

// ----------------------------------------------------------------------------
// 3. Three Acts — Remember / Reconnect / Revive. Editorial typography, no
// photos (a BBH print ad for three acts wouldn't need three photos).
// ----------------------------------------------------------------------------
type ActProps = {
  index: '01' | '02' | '03'
  eyebrow: string
  headline: string
  body: string
  verb: string
  detail: string
}

function Act({ index, eyebrow, headline, body, verb, detail }: ActProps) {
  const revealRef = useRevealOnScroll<HTMLDivElement>()

  return (
    <div
      ref={revealRef}
      className="bbh-reveal grid grid-cols-12 gap-6 md:gap-10 items-start py-14 md:py-20 border-t"
      style={{ borderColor: 'rgba(62,46,31,0.14)' }}
    >
      {/* Left rail: big numeral + eyebrow */}
      <div className="col-span-12 lg:col-span-2">
        <div className="flex lg:flex-col items-baseline lg:items-start gap-4 lg:gap-3">
          <span
            className="font-display"
            style={{
              color: '#C2A46D',
              fontSize: 'clamp(48px, 5.5vw, 80px)',
              lineHeight: 0.9,
              letterSpacing: '-0.02em',
              fontWeight: 400,
              fontStyle: 'italic',
            }}
          >
            {index}
          </span>
          <span
            className="text-[11px] font-semibold uppercase"
            style={{ color: '#8B6A3F', letterSpacing: '0.22em' }}
          >
            {eyebrow}
          </span>
        </div>
      </div>

      {/* Center: headline + body */}
      <div className="col-span-12 lg:col-span-6">
        <h3
          className="font-display font-semibold"
          style={{
            color: '#1F1A14',
            fontSize: 'clamp(30px, 4.2vw, 52px)',
            lineHeight: 1.04,
            letterSpacing: '-0.015em',
          }}
        >
          {headline}
        </h3>
        <p
          className="mt-5 md:mt-7 max-w-[520px]"
          style={{
            color: '#4A3D2E',
            fontSize: '15px',
            lineHeight: 1.65,
          }}
        >
          {body}
        </p>
      </div>

      {/* Right rail: one verb + one quiet detail */}
      <div className="col-span-12 lg:col-span-4 lg:pl-8">
        <div
          className="pt-5 md:pt-6 md:pl-6 border-t md:border-t-0 md:border-l"
          style={{ borderColor: 'rgba(62,46,31,0.14)' }}
        >
          <p
            className="font-display italic"
            style={{
              color: '#4B2C5E',
              fontSize: 'clamp(22px, 2.2vw, 28px)',
              lineHeight: 1.1,
              letterSpacing: '-0.01em',
            }}
          >
            {verb}
          </p>
          <p
            className="mt-3 text-[13px]"
            style={{ color: '#6B5A47', lineHeight: 1.55 }}
          >
            {detail}
          </p>
        </div>
      </div>
    </div>
  )
}

function ThreeActs() {
  return (
    <section
      id="how"
      className="relative"
      style={{ background: '#F6F2EA' }}
    >
      <div className="mx-auto max-w-[1360px] px-5 md:px-10">
        <div className="pt-20 md:pt-28 pb-8 md:pb-12">
          <p
            className="text-[11px] font-semibold uppercase"
            style={{ color: '#8B6A3F', letterSpacing: '0.22em' }}
          >
            How it unfolds
          </p>
          <h2
            className="font-display font-bold mt-4 max-w-[1000px]"
            style={{
              color: '#1F1A14',
              fontSize: 'clamp(36px, 6vw, 96px)',
              lineHeight: 0.98,
              letterSpacing: '-0.02em',
            }}
          >
            Three acts.<br />One family.
          </h2>
        </div>

        <Act
          index="01"
          eyebrow="Remember"
          headline="Add the ones you know by heart."
          body="Names, faces, dates. A first parent, a first grandparent, a first cousin you actually remember. The raw material of legacy — and it starts with you."
          verb="Your mother's mother."
          detail="Start with the ones you see on WhatsApp. The tree fills from there."
        />

        <Act
          index="02"
          eyebrow="Reconnect"
          headline="Find the cousins you've only heard about."
          body="Invite a sibling. Merge a branch from another city. Stitch a tree that spans Madurai, Mumbai, Muscat and Manchester — as one. The family you didn't know you had, finally in one place."
          verb="The wedding you didn't attend."
          detail="Everyone's branch, merged without the awkward group-chat reshuffle."
        />

        <Act
          index="03"
          eyebrow="Revive"
          headline="Record the voice, before it's gone."
          body="Audio memories. Story prompts that unlock your grandparents. A living library of who they were — kept for the children who never got to meet them."
          verb="The partition story he never told."
          detail="Short voice notes, quietly stored. The library outlives us all."
        />

        <div
          className="py-14 md:py-20 border-t flex flex-wrap items-center gap-5"
          style={{ borderColor: 'rgba(62,46,31,0.14)' }}
        >
          <Link
            to="/login?mode=register"
            className="inline-flex items-center gap-2 h-12 md:h-14 pl-6 pr-5 rounded-full text-[14px] md:text-[15px] font-semibold transition-colors"
            style={{ background: '#2F3E8F', color: '#F6F2EA' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#283574')}
            onMouseLeave={e => (e.currentTarget.style.background = '#2F3E8F')}
          >
            Start the remembering
            <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>→</span>
          </Link>
          <span className="text-[13px]" style={{ color: '#6B5A47' }}>
            Takes sixty seconds. No credit card.
          </span>
        </div>
      </div>
    </section>
  )
}

// ----------------------------------------------------------------------------
// 4. The Quiet Beat — a single italic line. No image. No CTA. No attribution.
// ----------------------------------------------------------------------------
function QuietBeat() {
  const revealRef = useRevealOnScroll<HTMLQuoteElement>()
  return (
    <section
      aria-label="A quiet thought"
      style={{
        background: '#FFFBF3',
        borderTop: '1px solid rgba(62,46,31,0.08)',
        borderBottom: '1px solid rgba(62,46,31,0.08)',
      }}
    >
      <div className="mx-auto max-w-[1360px] px-5 md:px-10 py-24 md:py-36">
        <blockquote
          ref={revealRef}
          className="bbh-reveal font-display italic max-w-[920px]"
          style={{
            color: '#1F1A14',
            fontSize: 'clamp(22px, 3.2vw, 38px)',
            lineHeight: 1.28,
            letterSpacing: '-0.005em',
            fontWeight: 400,
          }}
        >
          “The last person who remembered my great-grandmother's voice died in
          2019. We didn't know we needed to ask.”
        </blockquote>

        <div className="mt-10 md:mt-14">
          <Link
            to="/login?mode=register"
            className="bbh-underline inline-flex items-center min-h-[44px] py-2 text-[13px] md:text-[14px] font-medium"
            style={{ color: '#2F3E8F' }}
          >
            Add the first name →
          </Link>
        </div>
      </div>
    </section>
  )
}

// ----------------------------------------------------------------------------
// 5. For the Indian Family — neutral pillars, NO icons, NO tiles
// ----------------------------------------------------------------------------
function IndianFamily() {
  const revealRef = useRevealOnScroll<HTMLDivElement>()
  const pillars: Array<{ title: string; body: string }> = [
    {
      title: 'Native place.',
      body: 'Where your people are from — not just where you live now. Villages, tehsils, the town your grandparents called home.',
    },
    {
      title: 'Home languages.',
      body: 'Record the tongue your grandparents argued in. Tamil, Marathi, Bengali, Malayalam, Konkani — kept in the tree, not just the head.',
    },
    {
      title: "Relationships English can't name.",
      body: 'Chacha, chachi, mama, mami, pishi, atya, mausi, kaka. We know them all. And we label them the way your family does.',
    },
    {
      title: 'Cross-border family.',
      body: 'Trees that span Pune, Singapore, Toronto, Dubai — as one. For the diaspora that still calls someone at home every Sunday.',
    },
  ]

  return (
    <section
      id="family"
      style={{ background: '#F6F2EA' }}
    >
      <div className="mx-auto max-w-[1360px] px-5 md:px-10 py-20 md:py-28">
        <div ref={revealRef} className="bbh-reveal">
          <p
            className="text-[11px] font-semibold uppercase"
            style={{ color: '#8B6A3F', letterSpacing: '0.22em' }}
          >
            For the Indian family
          </p>
          <h2
            className="font-display font-bold mt-4 max-w-[900px]"
            style={{
              color: '#1F1A14',
              fontSize: 'clamp(30px, 4.5vw, 52px)',
              lineHeight: 1.02,
              letterSpacing: '-0.015em',
            }}
          >
            Built for the family you actually have.
          </h2>
        </div>

        <div className="mt-14 md:mt-20 grid grid-cols-1 md:grid-cols-2 gap-x-10 md:gap-x-16 gap-y-12 md:gap-y-16">
          {pillars.map((p, i) => (
            <PillarBlock key={p.title} index={i} title={p.title} body={p.body} />
          ))}
        </div>
      </div>
    </section>
  )
}

function PillarBlock({ index, title, body }: { index: number; title: string; body: string }) {
  const ref = useRevealOnScroll<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className="bbh-reveal border-t pt-6"
      style={{ borderColor: 'rgba(62,46,31,0.16)', transitionDelay: `${index * 80}ms` }}
    >
      <div className="flex items-baseline gap-4 mb-3">
        <span
          className="font-display italic"
          style={{ color: '#C2A46D', fontSize: '14px', letterSpacing: '0.02em' }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <h3
          className="font-display font-semibold"
          style={{
            color: '#1F1A14',
            fontSize: 'clamp(22px, 2.6vw, 30px)',
            lineHeight: 1.15,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h3>
      </div>
      <p
        className="max-w-[440px]"
        style={{ color: '#4A3D2E', fontSize: '15px', lineHeight: 1.65 }}
      >
        {body}
      </p>
    </div>
  )
}

// ----------------------------------------------------------------------------
// 6. Pull-quote kicker — soft blurred portrait behind, italic Playfair
// ----------------------------------------------------------------------------
function PullQuote() {
  const revealRef = useRevealOnScroll<HTMLDivElement>()
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: '#FFFBF3' }}
    >
      {/* blurred decorative portrait behind — heavy blur reads as warm texture */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'url(/login-woman.webp) center/40% no-repeat',
          filter: 'blur(56px) saturate(0.55) brightness(1.1)',
          opacity: 0.4,
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(255,251,243,0.3) 0%, rgba(255,251,243,0.85) 60%, #FFFBF3 100%)',
        }}
      />

      <div className="relative mx-auto max-w-[900px] px-5 md:px-10 py-24 md:py-36 text-center">
        <div ref={revealRef} className="bbh-reveal">
          <blockquote
            className="font-display italic"
            style={{
              color: '#1F1A14',
              fontSize: 'clamp(26px, 4vw, 52px)',
              lineHeight: 1.15,
              letterSpacing: '-0.01em',
              fontWeight: 400,
            }}
          >
            “The oldest stories are already in your house.”
          </blockquote>
          <div
            className="mt-8 text-[12px] font-medium"
            style={{ color: '#8B6A3F', letterSpacing: '0.1em' }}
          >
            — Priya V., Pune · early FamNme member
          </div>
        </div>
      </div>
    </section>
  )
}

// ----------------------------------------------------------------------------
// 7. Closing CTA band — indigo, massive Playfair, single gold pill
// ----------------------------------------------------------------------------
function ClosingCTA() {
  const revealRef = useRevealOnScroll<HTMLDivElement>()
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: '#2F3E8F' }}
    >
      {/* subtle warm vignette */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 20% 0%, rgba(194,164,109,0.18) 0%, transparent 55%), radial-gradient(ellipse at 80% 100%, rgba(75,44,94,0.35) 0%, transparent 55%)',
        }}
      />

      <div className="relative mx-auto max-w-[1360px] px-5 md:px-10 py-24 md:py-36">
        <div ref={revealRef} className="bbh-reveal max-w-[1040px]">
          <h2
            className="font-display font-bold"
            style={{
              color: '#F6F2EA',
              fontSize: 'clamp(40px, 8vw, 132px)',
              lineHeight: 0.96,
              letterSpacing: '-0.025em',
              textWrap: 'balance',
            }}
          >
            Your tree is waiting. Begin it.
          </h2>
          <p
            className="mt-8 md:mt-10 max-w-[520px]"
            style={{
              color: 'rgba(246,242,234,0.78)',
              fontSize: '15px',
              lineHeight: 1.65,
            }}
          >
            Add the first name. It takes sixty seconds. Your family does the rest —
            one remembered face at a time.
          </p>

          <div className="mt-10 md:mt-12 flex flex-wrap items-center gap-6">
            <Link
              to="/login?mode=register"
              className="inline-flex items-center gap-2 h-14 pl-7 pr-6 rounded-full text-[15px] font-semibold transition-colors"
              style={{ background: '#C2A46D', color: '#1F1A14' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#B0925A')}
              onMouseLeave={e => (e.currentTarget.style.background = '#C2A46D')}
            >
              Begin your tree
              <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>→</span>
            </Link>
            <Link
              to="/login"
              className="bbh-underline inline-flex items-center min-h-[44px] py-2 text-[13px] font-medium"
              style={{ color: 'rgba(246,242,234,0.75)' }}
            >
              Already a member? Sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

// ----------------------------------------------------------------------------
// 8. Footer — minimal. No trust logos, no newsletter, no social-proof counters.
// ----------------------------------------------------------------------------
function Footer() {
  return (
    <footer style={{ background: '#F6F2EA', borderTop: '1px solid rgba(62,46,31,0.14)' }}>
      <div className="mx-auto max-w-[1360px] px-5 md:px-10 py-14 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-5">
            <img
              src="/Fam N Me_Logo_SVG.svg"
              alt="FamNme"
              className="h-8 w-auto"
            />
            <p
              className="mt-6 max-w-[360px] font-display italic"
              style={{ color: '#4A3D2E', fontSize: '15px', lineHeight: 1.55 }}
            >
              Built in India. For the families who made it, and the ones they'll
              make.
            </p>
          </div>

          <FooterCol
            title="The Idea"
            links={[
              { label: 'What it is', href: '#idea' },
              { label: 'How it works', href: '#how' },
            ]}
          />
          <FooterCol
            title="Help"
            links={[
              { label: 'Contact', href: '#contact' },
              { label: 'FAQ', href: '#family' },
            ]}
          />
          <FooterCol
            title="Legal"
            links={[
              { label: 'Privacy', href: '#privacy' },
              { label: 'Terms', href: '#terms' },
            ]}
          />
        </div>

        <div
          className="mt-16 pt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-t"
          style={{ borderColor: 'rgba(62,46,31,0.14)' }}
        >
          <p className="text-[12px]" style={{ color: '#6B5A47' }}>
            © {new Date().getFullYear()} FamNme. All names, quietly kept.
          </p>
          <p className="text-[11px] uppercase tracking-[0.2em] font-semibold" style={{ color: '#8B6A3F' }}>
            Everyone you come from is still here.
          </p>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({ title, links }: { title: string; links: Array<{ label: string; href: string }> }) {
  return (
    <div className="md:col-span-2">
      <h4
        className="text-[11px] font-semibold uppercase mb-4"
        style={{ color: '#8B6A3F', letterSpacing: '0.22em' }}
      >
        {title}
      </h4>
      <ul>
        {links.map(l => (
          <li key={l.label}>
            <a
              href={l.href}
              className="bbh-underline inline-flex items-center min-h-[44px] min-w-[44px] py-2 text-[14px]"
              style={{ color: '#3D2E1F' }}
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Page
// ----------------------------------------------------------------------------
export function PublicLandingPage() {
  // Global `html, body { height: 100%; overflow: hidden }` in src/index.css
  // keeps the authenticated app shell pinned to viewport. The public landing
  // wants normal document scroll — release locks while mounted, restore on unmount.
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prev = {
      htmlOverflow: html.style.overflow,
      htmlHeight: html.style.height,
      bodyOverflow: body.style.overflow,
      bodyHeight: body.style.height,
    }
    html.style.overflow = 'auto'
    html.style.height = 'auto'
    body.style.overflow = 'auto'
    body.style.height = 'auto'
    return () => {
      html.style.overflow = prev.htmlOverflow
      html.style.height = prev.htmlHeight
      body.style.overflow = prev.bodyOverflow
      body.style.height = prev.bodyHeight
    }
  }, [])

  return (
    <div className="min-h-screen" style={{ background: '#F6F2EA' }}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-[#1F1A14]"
      >
        Skip to content
      </a>
      <Header />
      <main id="main-content">
        <Hero />
        <DarkBand />
        <ThreeActs />
        <QuietBeat />
        <IndianFamily />
        <PullQuote />
        <ClosingCTA />
      </main>
      <Footer />
    </div>
  )
}

export default PublicLandingPage
