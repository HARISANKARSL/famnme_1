/**
 * FamilyMainTempleCard
 *
 * Theme-token based version with full dark/light support.
 */

import { useEffect, useRef, useState } from "react";

import {
  Star,
  MapPin,
  Clock,
  BookOpen,
  Flame,
  ChevronRight,
  Loader2,
} from "lucide-react";

import { useGetTempleDetails } from "@/hooks/useInstitution";

import type { UserInstitution, TempleDetailsResponse } from "@/types";

interface FamilyMainTempleCardProps {
  institution: UserInstitution;
  userId: string;
  onOpen: (institutionId: string) => void;
}

export function FamilyMainTempleCard({
  institution,
  userId,
  onOpen,
}: FamilyMainTempleCardProps) {
  const { mutate: fetchTempleDetails } = useGetTempleDetails();

  const [details, setDetails] = useState<TempleDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!institution.institutionId || !userId) return;

    let cancelled = false;

    (async () => {
      setLoading(true);

      try {
        const result = await fetchTempleDetails({
          templeId: institution.institutionId,
          userId,
        });

        if (!cancelled && result) {
          setDetails(result);
        }
      } catch {
        // Silent fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [institution.institutionId, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const significance = details?.about?.significance;

const rituals = details?.about?.ritualsAndPractices as string | string[] | null | undefined;

const ritualsText =
  typeof rituals === "string"
    ? rituals
    : Array.isArray(rituals)
    ? rituals.join("\n")
    : rituals
    ? JSON.stringify(rituals)
    : null;

  const timings = details?.visit?.timings;

  return (
    // Fix: changed <button> to <div> to avoid nested <button> DOM violation
    <div
      className="relative w-full overflow-hidden text-left cursor-default group rounded-3xl"
    >
      {/* Glow Border */}
      <div
        className="
          absolute -inset-px rounded-3xl
          bg-gradient-to-br
          from-[hsl(var(--primary))]/40
          via-[hsl(var(--primary))]/10
          to-[hsl(var(--primary))]/30
          opacity-0
          transition-opacity duration-500
          group-hover:opacity-100
        "
      />

      {/* Card */}
      <div
        className="
          relative overflow-hidden rounded-3xl
          border border-[hsl(var(--border))]
          bg-[hsl(var(--card))]
          shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)]
        "
      >
        {/* Grain Texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
        >
          <svg width="100%" height="100%">
            <filter id="fmtc-grain">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.85"
                numOctaves="2"
              />
            </filter>
            <rect width="100%" height="100%" filter="url(#fmtc-grain)" />
          </svg>
        </div>

        {/* Radial Glow */}
        <div
          aria-hidden
          className="absolute top-0 right-0 rounded-full pointer-events-none h-72 w-72"
          style={{
            background:
              "radial-gradient(circle at 70% 20%, rgba(194,164,109,0.16) 0%, transparent 70%)",
          }}
        />

        <div className="relative p-6 space-y-5 md:p-7">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Label */}
              <div className="mb-2.5 inline-flex items-center gap-1.5">
                <Star
                  className="
                    h-3 w-3
                    fill-[hsl(var(--primary))]
                    text-[hsl(var(--primary))]
                  "
                />
                <span
                  className="
                    text-[10px] font-bold uppercase
                    tracking-[0.26em]
                    text-[hsl(var(--primary))]
                  "
                >
                  Family Main Temple
                </span>
              </div>

              {/* Title */}
              <h2
                className="
                  font-serif text-[22px] font-semibold
                  leading-[1.15]
                  text-[hsl(var(--foreground))]
                  md:text-[26px]
                "
              >
                {institution.title}
              </h2>

              {/* Location */}
              <p
                className="
                  mt-2 flex items-start gap-1.5
                  text-[12px]
                  text-[hsl(var(--muted-foreground))]
                "
              >
                <MapPin
                  className="mt-0.5 h-3 w-3 shrink-0 text-[hsl(var(--primary))]"
                />
                <span className="line-clamp-2">{institution.location}</span>
              </p>
            </div>

            {/* Thumbnail */}
            {institution.thumbnail && (
              <div
                className="
                  h-16 w-16 shrink-0 overflow-hidden
                  rounded-2xl
                  border-2 border-[hsl(var(--border))]
                  shadow-md
                  md:h-20 md:w-20
                "
              >
                <img
                  src={institution.thumbnail}
                  alt={institution.title}
                  className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
                />
              </div>
            )}
          </div>

          {/* Divider */}
          <div
            className="
              h-px bg-gradient-to-r
              from-transparent via-[hsl(var(--border))] to-transparent
            "
          />

          {/* Body */}
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <div className="space-y-5">
              {significance && (
                <DetailBlock
                  icon={
                    <BookOpen className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
                  }
                  label="Significance"
                  text={significance}
                  previewLines={3}
                />
              )}

              {ritualsText && (
                <DetailBlock
                  icon={
                    <Flame className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
                  }
                  label="Rituals & Practices"
                  text={stripMarkdown(ritualsText)}
                  previewLines={3}
                />
              )}

              {(timings?.open || timings?.close) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {timings.open && (
                    <TimingPill label="Opens" value={timings.open} />
                  )}
                  {timings.close && (
                    <TimingPill label="Closes" value={timings.close} />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <span
              className="
                inline-flex items-center gap-1
                rounded-full
                border border-[hsl(var(--border))]
                bg-[hsl(var(--muted))]
                px-2.5 py-1
                text-[11px] font-semibold capitalize
                text-[hsl(var(--foreground))]
              "
            >
              {institution.tag}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────── */
/* Detail Block */
/* ───────────────────────────────────────────── */

function DetailBlock({
  icon,
  label,
  text,
  previewLines = 3,
}: {
  icon: React.ReactNode;
  label: string;
  text: string;
  previewLines?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [shouldShowToggle, setShouldShowToggle] = useState(false);
  const textRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    setShouldShowToggle(el.scrollHeight > el.clientHeight);
  }, [text]);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-1.5">
        {icon}
        <span
          className="
            text-[10px] font-bold uppercase
            tracking-[0.2em]
            text-[hsl(var(--primary))]
          "
        >
          {label}
        </span>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <p
          ref={textRef}
          className={`
            text-[13px] leading-[1.8]
            text-[hsl(var(--foreground))]
            transition-all duration-300
            ${expanded ? "" : `line-clamp-${previewLines}`}
          `}
        >
          {text}
        </p>

        {shouldShowToggle && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setExpanded((prev) => !prev);
            }}
            className="
              inline-flex items-center gap-1
              text-[12px] font-semibold
              text-[hsl(var(--primary))]
              transition-colors hover:opacity-80
            "
          >
            {expanded ? "Read less" : "Read more"}
            <ChevronRight
              className={`
                h-3.5 w-3.5 transition-transform duration-300
                ${expanded ? "rotate-90" : ""}
              `}
            />
          </button>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────── */
/* Timing Pill */
/* ───────────────────────────────────────────── */

function TimingPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="
        inline-flex items-center gap-1.5
        rounded-full
        border border-[hsl(var(--border))]
        bg-[hsl(var(--muted))]
        px-3 py-1.5
      "
    >
      <Clock className="h-3 w-3 text-[hsl(var(--primary))]" />
      <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
        {label}:
      </span>
      <span className="text-[11px] font-semibold text-[hsl(var(--foreground))]">
        {value}
      </span>
    </div>
  );
}

/* ───────────────────────────────────────────── */
/* Skeleton */
/* ───────────────────────────────────────────── */

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[hsl(var(--primary))]" />
        <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
          Loading temple details…
        </span>
      </div>
      <div className="space-y-2">
        <div className="skeleton-shimmer h-2.5 w-3/4 rounded-full" />
        <div className="skeleton-shimmer h-2.5 w-full rounded-full" />
        <div className="skeleton-shimmer h-2.5 w-2/3 rounded-full" />
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────── */
/* Utils */
/* ───────────────────────────────────────────── */

function stripMarkdown(text: string): string {
  if (!text || typeof text !== "string") return "";
  return text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/^\*\s+/gm, "• ");
}

// /**
//  * FamilyMainTempleCard
//  *
//  * Shown on SacredPlacesPage when any institution in the user's list
//  * has family_main === true. Fetches temple details via useGetTempleDetails
//  * and renders a rich editorial card matching the app's warm-parchment theme.
//  */

// import { useEffect, useMemo, useState } from "react";
// import {
//   Star,
//   MapPin,
//   Clock,
//   BookOpen,
//   Flame,
//   ChevronRight,
//   Loader2,
// } from "lucide-react";

// import { useGetTempleDetails } from "@/hooks/useInstitution";
// import type { UserInstitution, TempleDetailsResponse } from "@/types";

// interface FamilyMainTempleCardProps {
//   /** The institution from getMyInstitutions that has family_main === true */
//   institution: UserInstitution;

//   /** Current user's ID — needed for temple details API */
//   userId: string;

//   /** Called when the card is tapped — open the detail page */
//   onOpen: (institutionId: string) => void;
// }

// export function FamilyMainTempleCard({
//   institution,
//   userId,
//   onOpen,
// }: FamilyMainTempleCardProps) {
//   const { mutate: fetchTempleDetails } = useGetTempleDetails();

//   const [details, setDetails] = useState<TempleDetailsResponse | null>(null);

//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     if (!institution.institutionId || !userId) return;

//     let cancelled = false;

//     (async () => {
//       setLoading(true);

//       try {
//         const result = await fetchTempleDetails({
//           templeId: institution.institutionId,
//           userId,
//         });

//         if (!cancelled && result) {
//           setDetails(result);
//         }
//       } catch {
//         // Silent fail — fallback UI still renders
//       } finally {
//         if (!cancelled) {
//           setLoading(false);
//         }
//       }
//     })();

//     return () => {
//       cancelled = true;
//     };
//   }, [institution.institutionId, userId]); // eslint-disable-line react-hooks/exhaustive-deps

//   const significance = details?.about?.significance;

//   const rituals = details?.about?.ritualsAndPractices;

//   const timings = details?.visit?.timings;

//   return (
//     <button
//       // onClick={() => onOpen(institution.institutionId)}
//       className="
//         w-full text-left group relative
//         rounded-3xl overflow-hidden
//         focus:outline-none
//         focus-visible:ring-2
//         focus-visible:ring-[#C2A46D]/60
//       "
//     >
//       {/* Glow Border */}
//       <div
//         className="
//           absolute -inset-px rounded-3xl
//           bg-gradient-to-br
//           from-[#C2A46D]/40
//           via-[#E8C47E]/20
//           to-[#8B6F3A]/30
//           opacity-0 group-hover:opacity-100
//           transition-opacity duration-500
//         "
//       />

//       <div
//         className="
//           relative rounded-3xl overflow-hidden
//           border border-[#C2A46D]/25
//           bg-gradient-to-br
//           from-[#FDF8F0]
//           via-[#FAF4E8]
//           to-[#F5EDD8]
//           dark:from-[#1E1910]
//           dark:via-[#1A1608]
//           dark:to-[#151200]
//           shadow-[0_8px_40px_-12px_rgba(194,164,109,0.35)]
//         "
//       >
//         {/* Texture */}
//         <div
//           className="absolute inset-0 opacity-[0.035] pointer-events-none"
//           aria-hidden
//         >
//           <svg width="100%" height="100%">
//             <filter id="fmtc-grain">
//               <feTurbulence
//                 type="fractalNoise"
//                 baseFrequency="0.85"
//                 numOctaves="2"
//               />
//             </filter>

//             <rect width="100%" height="100%" filter="url(#fmtc-grain)" />
//           </svg>
//         </div>

//         {/* Radial glow */}
//         <div
//           className="absolute top-0 right-0 rounded-full pointer-events-none w-72 h-72"
//           style={{
//             background:
//               "radial-gradient(circle at 70% 20%, rgba(194,164,109,0.18) 0%, transparent 70%)",
//           }}
//           aria-hidden
//         />

//         <div className="relative p-6 space-y-5 md:p-7">
//           {/* Header */}
//           <div className="flex items-start justify-between gap-4">
//             <div className="flex-1 min-w-0">
//               {/* Label */}
//               <div className="inline-flex items-center gap-1.5 mb-2.5">
//                 <Star className="w-3 h-3 fill-[#C2A46D] text-[#C2A46D]" />

//                 <span
//                   className="
//                     text-[10px]
//                     uppercase
//                     tracking-[0.26em]
//                     font-bold
//                     text-[#8B6F3A]
//                   "
//                 >
//                   Family Main Temple
//                 </span>
//               </div>

//               {/* Title */}
//               <h2
//                 className="
//                   font-serif
//                   text-[22px] md:text-[26px]
//                   leading-[1.15]
//                   font-semibold
//                   text-[#2A1F12]
//                   dark:text-[#F5F1E8]
//                 "
//               >
//                 {institution.title}
//               </h2>

//               {/* Location */}
//               <p
//                 className="
//                   mt-2
//                   flex items-start gap-1.5
//                   text-[12px]
//                   text-[#7C6A50]
//                   dark:text-[#A89878]
//                 "
//               >
//                 <MapPin className="w-3 h-3 shrink-0 mt-0.5 text-[#C2A46D]" />

//                 <span className="line-clamp-2">{institution.location}</span>
//               </p>
//             </div>

//             {/* Thumbnail */}
//             {institution.thumbnail && (
//               <div
//                 className="
//                   shrink-0
//                   w-16 h-16 md:w-20 md:h-20
//                   rounded-2xl overflow-hidden
//                   border-2 border-[#C2A46D]/30
//                   shadow-md
//                 "
//               >
//                 <img
//                   src={institution.thumbnail}
//                   alt={institution.title}
//                   className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
//                 />
//               </div>
//             )}
//           </div>

//           {/* Divider */}
//           <div
//             className="
//               h-px
//               bg-gradient-to-r
//               from-transparent
//               via-[#C2A46D]/30
//               to-transparent
//             "
//           />

//           {/* Body */}
//           {loading ? (
//             <LoadingSkeleton />
//           ) : (
//             <div className="space-y-5">
//               {significance && (
//                 <DetailBlock
//                   icon={<BookOpen className="w-3.5 h-3.5 text-[#C2A46D]" />}
//                   label="Significance"
//                   text={significance}
//                   previewSentences={3}
//                 />
//               )}

//               {rituals && (
//                 <DetailBlock
//                   icon={<Flame className="w-3.5 h-3.5 text-[#C2A46D]" />}
//                   label="Rituals & Practices"
//                   text={stripMarkdown(rituals)}
//                   previewSentences={2}
//                 />
//               )}

//               {(timings?.open || timings?.close) && (
//                 <div className="flex flex-wrap gap-2 pt-1">
//                   {timings.open && (
//                     <TimingPill label="Opens" value={timings.open} />
//                   )}

//                   {timings.close && (
//                     <TimingPill label="Closes" value={timings.close} />
//                   )}
//                 </div>
//               )}
//             </div>
//           )}

//           {/* Footer */}
//           <div className="flex items-center justify-between pt-1">
//             <span
//               className="
//                 inline-flex items-center gap-1
//                 px-2.5 py-1
//                 rounded-full
//                 bg-[#C2A46D]/12
//                 border border-[#C2A46D]/25
//                 text-[#8B6F3A]
//                 text-[11px]
//                 font-semibold
//                 capitalize
//               "
//             >
//               {institution.tag}
//             </span>

//             {/* <span
//               className="
//                 inline-flex items-center gap-1
//                 text-[12px]
//                 font-semibold
//                 text-[#8B6F3A]
//                 group-hover:text-[#C2A46D]
//                 transition-colors
//               "
//             >
//               Explore Temple

//               <ChevronRight
//                 className="
//                   w-3.5 h-3.5
//                   transition-transform
//                   group-hover:translate-x-0.5
//                 "
//               />
//             </span> */}
//           </div>
//         </div>
//       </div>
//     </button>
//   );
// }

// /* ────────────────────────────────────────────────────────── */
// /* Detail Block */
// /* ────────────────────────────────────────────────────────── */

// function DetailBlock({
//   icon,
//   label,
//   text,
//   previewSentences = 3,
// }: {
//   icon: React.ReactNode;
//   label: string;
//   text: string;
//   previewSentences?: number;
// }) {
//   const [expanded, setExpanded] = useState(false);

//   const preview = useMemo(
//     () => truncateBySentences(text, previewSentences),
//     [text, previewSentences],
//   );

//   const shouldShowToggle = preview !== text;

//   return (
//     <div className="space-y-2">
//       {/* Header */}
//       <div className="flex items-center gap-1.5">
//         {icon}

//         <span
//           className="
//             text-[10px]
//             uppercase
//             tracking-[0.2em]
//             font-bold
//             text-[#8B6F3A]
//           "
//         >
//           {label}
//         </span>
//       </div>

//       {/* Content */}
//       <div className="space-y-2">
//         <p
//           className="
//             text-[13px]
//             leading-[1.8]
//             text-[#3D2E1F]
//             dark:text-[#DDD5C4]
//             transition-all duration-300
//           "
//         >
//           {expanded ? text : preview}
//         </p>

//         {shouldShowToggle && (
//           <button
//             type="button"
//             onClick={(e) => {
//               e.preventDefault();
//               e.stopPropagation();

//               setExpanded((prev) => !prev);
//             }}
//             className="
//               inline-flex items-center gap-1
//               text-[12px]
//               font-semibold
//               text-[#8B6F3A]
//               hover:text-[#C2A46D]
//               transition-colors
//             "
//           >
//             {expanded ? "Read less" : "Read more"}

//             <ChevronRight
//               className={`
//                 w-3.5 h-3.5 transition-transform duration-300
//                 ${expanded ? "rotate-90" : ""}
//               `}
//             />
//           </button>
//         )}
//       </div>
//     </div>
//   );
// }

// /* ────────────────────────────────────────────────────────── */
// /* Timing Pill */
// /* ────────────────────────────────────────────────────────── */

// function TimingPill({ label, value }: { label: string; value: string }) {
//   return (
//     <div
//       className="
//         inline-flex items-center gap-1.5
//         px-3 py-1.5
//         rounded-full
//         bg-[#3D2E1F]/[0.04]
//         dark:bg-white/[0.05]
//         border border-[#C2A46D]/20
//       "
//     >
//       <Clock className="w-3 h-3 text-[#C2A46D]" />

//       <span className="text-[11px] text-[#7C6A50] dark:text-[#A89878]">
//         {label}:
//       </span>

//       <span
//         className="
//           text-[11px]
//           font-semibold
//           text-[#3D2E1F]
//           dark:text-[#F0EAD8]
//         "
//       >
//         {value}
//       </span>
//     </div>
//   );
// }

// /* ────────────────────────────────────────────────────────── */
// /* Skeleton */
// /* ────────────────────────────────────────────────────────── */

// function LoadingSkeleton() {
//   return (
//     <div className="space-y-3">
//       <div className="flex items-center gap-2">
//         <Loader2 className="w-3.5 h-3.5 text-[#C2A46D] animate-spin" />

//         <span className="text-[11px] text-[#8B6F3A]">
//           Loading temple details…
//         </span>
//       </div>

//       <div className="space-y-2">
//         <div
//           className="
//             h-2.5 w-3/4
//             rounded-full
//             bg-[#C2A46D]/15
//             animate-pulse
//           "
//         />

//         <div
//           className="
//             h-2.5 w-full
//             rounded-full
//             bg-[#C2A46D]/10
//             animate-pulse
//           "
//         />

//         <div
//           className="
//             h-2.5 w-2/3
//             rounded-full
//             bg-[#C2A46D]/10
//             animate-pulse
//           "
//         />
//       </div>
//     </div>
//   );
// }

// /* ────────────────────────────────────────────────────────── */
// /* Utils */
// /* ────────────────────────────────────────────────────────── */

// function stripMarkdown(text: string): string {
//   return text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/^\*\s+/gm, "• ");
// }

// function truncateBySentences(text: string, maxSentences = 3): string {
//   if (!text) return "";

//   const cleaned = text.replace(/\s+/g, " ").trim();

//   const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [];

//   if (sentences.length <= maxSentences) {
//     return cleaned;
//   }

//   return sentences.slice(0, maxSentences).join(" ").trim();
// }
