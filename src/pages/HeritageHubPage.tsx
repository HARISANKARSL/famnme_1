/**
 * HeritageHubPage — /heritage
 *
 * Feature hub for the Heritage section. Matches the FamilyHub aesthetic:
 * hero gradient tile at the top, secondary tiled grid underneath with
 * staggered reveal animations. Renders inside AppShell so the sidebar
 * persists and clicking the Heritage menu item lands here.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Gem,
  Sparkles,
  Landmark,
  MapPin,
  Flame,
  ArrowRight,
  ChevronRight,
  Users,
  Compass,
} from 'lucide-react'
import { useResponsive } from '@/hooks/useResponsive'
import { AppShell } from '@/components/layout/AppShell'

export function HeritageHubPage() {
  const { isMobile } = useResponsive()
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setRevealed(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const delay = (ms: number) => ({ transitionDelay: `${ms}ms` })
  const revealCls = revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'

  return (
    <AppShell activeView="heritage" showHeritage={true}>
      <div className="min-h-screen bg-[#F6F2EA] dark:bg-[#0a0a0a]">
        <main id="main-content" className="max-w-5xl px-4 pt-6 pb-24 mx-auto md:px-8 md:pt-10">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <div className="flex items-center gap-2 mb-1.5">
              <Gem className="w-5 h-5 text-[#C2A46D]" strokeWidth={2.25} />
              <h1 className="font-display text-[26px] md:text-[32px] font-semibold leading-tight text-[#3D2E1F] dark:text-[#F3F2F1]">
                Heritage
              </h1>
            </div>
            <p className="text-[13px] md:text-[14px] text-[#8B7355] dark:text-[#A19F9D]">
              The cultural threads that connect generations of your family.
            </p>
          </div>

          <div className="space-y-4">
            {/* ═══ HERO: Sacred Places ═══ */}
            <Link
              to="/heritage/sacred"
              className={`group block w-full rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#C2A46D]/40 ${revealCls}`}
              style={delay(0)}
            >
              <div className="relative bg-gradient-to-br from-[#4B2C5E] via-[#3A2249] to-[#2F3E8F] p-5 md:p-7">
                <div className="absolute top-0 right-0 w-44 h-44 bg-[#C2A46D]/[0.12] rounded-full -translate-y-16 translate-x-12 group-hover:translate-x-10 transition-transform duration-500" aria-hidden />
                <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-white/[0.04] rounded-full translate-y-14 group-hover:translate-y-10 transition-transform duration-500" aria-hidden />

                {/* Decorative temple silhouette */}
                <div className="absolute flex items-end gap-1 opacity-50 top-6 right-6 md:right-10" aria-hidden>
                  <div className="w-1.5 h-8 bg-[#C2A46D]/60 rounded-sm" />
                  <div className="w-1.5 h-12 bg-[#C2A46D]/70 rounded-sm" />
                  <div className="w-1.5 h-16 bg-[#C2A46D]/90 rounded-sm" />
                  <div className="w-1.5 h-12 bg-[#C2A46D]/70 rounded-sm" />
                  <div className="w-1.5 h-8 bg-[#C2A46D]/60 rounded-sm" />
                </div>

                <div className="relative flex items-start gap-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-white/[0.14] flex items-center justify-center shrink-0">
                        <Landmark className="w-5 h-5 text-white" strokeWidth={1.8} />
                      </div>
                      <div>
                        <h2 className="text-[18px] md:text-[22px] font-bold text-white leading-tight">
                          Sacred Places
                        </h2>
                        <p className="text-[11px] text-white/60 mt-0.5">
                          Kula Devata &middot; Temples &middot; Churches &middot; Mosques &middot; Gurdwaras
                        </p>
                      </div>
                    </div>

                    <p className="text-[13px] md:text-[14px] text-white/85 leading-relaxed max-w-2xl mt-4">
                      The temples, churches, mosques, and shrines your family holds close — with AI-planned pilgrimage routes and generational stories.
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.12] text-[11px] text-white/80">
                        <Flame className="w-3 h-3" />
                        Pilgrimage planner
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.12] text-[11px] text-white/80">
                        <Users className="w-3 h-3" />
                        Family stories
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 mt-2 transition-all text-white/40 group-hover:text-white/80 group-hover:translate-x-1 shrink-0" />
                </div>
              </div>
            </Link>

            {/* ═══ ROW 2: Festivals + Migration ═══ */}
            {/* <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
              <Link
                to="/heritage/festivals"
                className={`group block w-full rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#C2A46D]/40 ${revealCls}`}
                style={delay(60)}
              >
                <div className="relative bg-gradient-to-br from-[#F6EFE2] via-[#EFE0C6] to-[#E2C693] dark:from-[#2a2318] dark:via-[#3a2f1f] dark:to-[#4a3d27] rounded-2xl p-5 min-h-[180px] flex flex-col overflow-hidden ring-1 ring-[#C2A46D]/20">
                  <div className="absolute top-4 right-4 w-14 h-14 rounded-full border-2 border-[#C2A46D]/30" aria-hidden />
                  <div className="absolute top-7 right-7 w-8 h-8 rounded-full border-2 border-[#C2A46D]/50" aria-hidden />
                  <div className="absolute top-[42px] right-[42px] w-2 h-2 rounded-full bg-[#C2A46D]" aria-hidden />

                  <div className="relative flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-[#8B6F3A]" strokeWidth={1.8} />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8B6F3A]">
                        Festivals
                      </span>
                    </div>

                    <h3 className="text-[16px] font-bold text-[#3D2E1F] dark:text-[#F5F1E8] mb-1.5">
                      Your family&apos;s year
                    </h3>
                    <p className="text-[12px] text-[#8B7355] dark:text-[#C9BDA8] leading-relaxed flex-1">
                      Every festival your family celebrates — with upcoming dates, ritual guides, and cross-religion harmony.
                    </p>

                    <div className="flex items-center justify-between mt-4">
                      <span className="text-[10px] text-[#8B6F3A] font-medium">
                        Today &middot; Upcoming &middot; Calendar
                      </span>
                      <ArrowRight className="w-4 h-4 text-[#8B6F3A]/50 group-hover:text-[#8B6F3A] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </div>
              </Link>

              <Link
                to="/migration"
                className={`group block w-full rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/30 ${revealCls}`}
                style={delay(120)}
              >
                <div className="relative bg-white dark:bg-[#242424] shadow-sm ring-1 ring-stone-100 dark:ring-[#333] rounded-2xl p-5 min-h-[180px] flex flex-col overflow-hidden">
                  <svg className="absolute inset-0 w-full h-full opacity-[0.05]" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <defs>
                      <pattern id="migrationGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#2F3E8F" strokeWidth="0.5" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#migrationGrid)" />
                  </svg>
                  <div className="absolute top-6 right-6 w-1.5 h-1.5 rounded-full bg-[#C2A46D] opacity-80 animate-pulse" aria-hidden />
                  <div className="absolute top-12 right-14 w-1 h-1 rounded-full bg-[#2F3E8F] opacity-60" aria-hidden />
                  <div className="absolute top-20 right-8 w-1.5 h-1.5 rounded-full bg-[#4B2C5E] opacity-40" aria-hidden />

                  <div className="relative flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-[#2F3E8F] dark:text-[#8CA0FF]" strokeWidth={1.8} />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#2F3E8F] dark:text-[#8CA0FF]">
                        Migration &amp; Roots
                      </span>
                    </div>

                    <h3 className="text-[16px] font-bold text-stone-800 dark:text-[#F5F1E8] mb-1.5">
                      Geographic journey
                    </h3>
                    <p className="text-[12px] text-[#8B7355] dark:text-[#999] leading-relaxed flex-1">
                      Trace your family&apos;s movement across places and generations on an interactive map.
                    </p>

                    <div className="flex items-center justify-end mt-4">
                      <ArrowRight className="w-4 h-4 text-[#8B7355]/40 group-hover:text-[#2F3E8F] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </div>
              </Link>
            </div> */}

            {/* ═══ ROW 3: More to come (optional, dashed card) ═══ */}
            <div
              className={`relative rounded-2xl overflow-hidden p-5 flex flex-col md:flex-row md:items-center gap-4 bg-gradient-to-br from-[#2F3E8F]/[0.04] to-[#C2A46D]/[0.06] dark:from-[#1E1E1E] dark:to-[#242424] ring-1 ring-dashed ring-[#C2A46D]/40 dark:ring-[#3A342C] transition-all duration-300 ${revealCls}`}
              style={delay(180)}
            >
              <div className="w-10 h-10 rounded-xl bg-[#C2A46D]/15 text-[#8B6F3A] flex items-center justify-center shrink-0">
                <Compass className="w-5 h-5" strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[14px] font-bold text-stone-800 dark:text-[#F5F1E8] mb-0.5">
                  More heritage features coming soon
                </h3>
                <p className="text-[12px] text-[#8B7355] dark:text-[#A19F9D] leading-relaxed">
                  DNA haplogroup mapping &middot; Oral-history audio archives &middot; Generational photo timelines &middot; Community-contributed regional customs.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AppShell>
  )
}
