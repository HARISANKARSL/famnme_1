/**
 * GenZEmptyState — Animated empty state for new users
 *
 * Full-width gradient with growing tree animation.
 * "Every family has a story. What's yours?"
 */

interface GenZEmptyStateProps {
  onStartStoryCapture?: () => void
  onBuildStepByStep?: () => void
}

export function GenZEmptyState({
  onStartStoryCapture,
  onBuildStepByStep,
}: GenZEmptyStateProps) {
  return (
    <div
      className="rounded-2xl p-8 md:p-12 text-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #2F3E8F 0%, #3D2E6E 50%, #4B2C5E 100%)' }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/[0.04]" />
      <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-white/[0.03]" />
      <div className="absolute top-1/4 left-1/4 w-24 h-24 rounded-full bg-white/[0.02]" />

      {/* Animated tree SVG */}
      <div className="relative mx-auto mb-6 w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Trunk */}
          <rect
            x="46" y="60" width="8" height="30" rx="2"
            fill="#C2A46D"
            className="animate-fade-in"
            style={{ animationDelay: '200ms' }}
          />
          {/* Canopy layers */}
          <ellipse
            cx="50" cy="50" rx="28" ry="22"
            fill="rgba(194, 164, 109, 0.3)"
            className="animate-fade-in"
            style={{ animationDelay: '400ms' }}
          />
          <ellipse
            cx="50" cy="42" rx="22" ry="18"
            fill="rgba(194, 164, 109, 0.4)"
            className="animate-fade-in"
            style={{ animationDelay: '600ms' }}
          />
          <ellipse
            cx="50" cy="35" rx="16" ry="14"
            fill="rgba(194, 164, 109, 0.6)"
            className="animate-fade-in"
            style={{ animationDelay: '800ms' }}
          />
          {/* Sparkle dots */}
          <circle cx="38" cy="30" r="2" fill="#C2A46D" className="animate-fade-in" style={{ animationDelay: '1000ms' }} />
          <circle cx="62" cy="35" r="1.5" fill="#C2A46D" className="animate-fade-in" style={{ animationDelay: '1100ms' }} />
          <circle cx="50" cy="22" r="2.5" fill="#C2A46D" className="animate-fade-in" style={{ animationDelay: '1200ms' }} />
        </svg>
      </div>

      {/* Headline */}
      <h2
        className="text-2xl md:text-3xl font-bold text-white leading-tight mb-3 relative animate-fade-in"
        style={{ fontFamily: "'Playfair Display', serif", animationDelay: '400ms' }}
      >
        Every family has a story.<br />What&apos;s yours?
      </h2>

      {/* Subtext */}
      <p className="text-sm text-white/70 mb-8 max-w-md mx-auto relative animate-fade-in" style={{ animationDelay: '600ms' }}>
        Start with just your name. We&apos;ll help you discover the rest.
      </p>

      {/* Primary CTA */}
      {onStartStoryCapture && (
        <button
          onClick={onStartStoryCapture}
          className="relative px-8 py-3 rounded-xl text-base font-bold text-[#2F3E8F] bg-white hover:bg-white/90 active:scale-[0.97] transition-all shadow-lg animate-fade-in"
          style={{ animationDelay: '800ms' }}
        >
          Tell Your Story
        </button>
      )}

      {/* Secondary link */}
      {onBuildStepByStep && (
        <p className="mt-4 relative animate-fade-in" style={{ animationDelay: '1000ms' }}>
          <button
            onClick={onBuildStepByStep}
            className="text-sm text-white/50 hover:text-white/80 underline underline-offset-4 decoration-white/20 hover:decoration-white/50 transition-colors"
          >
            or build step-by-step
          </button>
        </p>
      )}
    </div>
  )
}
