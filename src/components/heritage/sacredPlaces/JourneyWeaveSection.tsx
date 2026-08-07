import { memo } from "react";
import {
  MapPin,
  Clock3,
  CalendarDays,
  Route,
  Loader2,
} from "lucide-react";

import type { JourneyWeaveResponse } from "@/types";

interface JourneyWeaveSectionProps {
  data?: JourneyWeaveResponse | null;
  loading?: boolean;

  title?: string;
  subtitle?: string;

  className?: string;
}

export const JourneyWeaveSection = memo(function JourneyWeaveSection({
  data,
  loading = false,
  title = "Your spiritual pilgrimage",
  subtitle = "A sacred route woven from devotion, ancestry, and memory.",
  className = "",
}: JourneyWeaveSectionProps) {
  // ─────────────────────────────────────────────
  // Loading
  // ─────────────────────────────────────────────

  if (loading) {
    return (
      <section
        className={`
          rounded-3xl
          border
          border-[hsl(var(--border))]
          bg-[hsl(var(--card))]
          p-6
          ${className}
        `}
      >
        <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
          <Loader2 className="w-4 h-4 animate-spin" />

          <span className="text-sm">
            Preparing your pilgrimage...
          </span>
        </div>
      </section>
    );
  }

  // ─────────────────────────────────────────────
  // Empty
  // ─────────────────────────────────────────────

  if (!data || data.temples.length === 0) {
    return null;
  }

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  return (
    <section className={`space-y-6 ${className}`}>
      <div
        className="
          overflow-hidden rounded-[28px]
          border border-[hsl(var(--border))]
          bg-[hsl(var(--card))]
          shadow-sm
        "
      >
        {/* Header */}
        <div
          className="
            relative overflow-hidden rounded-t-[28px]
            border-b border-[hsl(var(--border))]
            bg-[hsl(var(--muted))]
            px-6 py-5
          "
        >
          {/* Glow */}
          <div
            className="
              pointer-events-none absolute inset-0
              bg-[radial-gradient(circle_at_top_right,rgba(194,164,109,0.10),transparent_35%)]
              dark:bg-[radial-gradient(circle_at_top_right,rgba(123,143,212,0.12),transparent_35%)]
            "
          />

          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* LEFT */}
            <div className="min-w-0">
              {/* Badge */}
              <div
                className="
                  inline-flex items-center gap-1.5
                  rounded-full
                  border border-[hsl(var(--border))]
                  bg-[hsl(var(--background))]
                  px-3 py-1
                "
              >
                <Route className="h-3 w-3 text-[hsl(var(--primary))]" />

                <span
                  className="
                    text-[9px] font-semibold uppercase
                    tracking-[0.18em]
                    text-[hsl(var(--primary))]
                  "
                >
                  Journey Weave
                </span>
              </div>

              {/* Title */}
              <h2
                className="
                  mt-3
                  text-[30px]
                  font-semibold
                  leading-tight
                  text-[hsl(var(--foreground))]
                "
              >
                {title}
              </h2>

              {/* Subtitle */}
              <p
                className="
                  mt-1
                  text-[14px]
                  leading-6
                  text-[hsl(var(--muted-foreground))]
                "
              >
                {subtitle}
              </p>
            </div>

            {/* RIGHT */}
            <div className="flex flex-wrap items-center gap-2">
              <div
                className="
                  inline-flex items-center gap-1.5
                  rounded-full
                  border border-[hsl(var(--border))]
                  bg-[hsl(var(--background))]
                  px-3.5 py-2
                  text-[12px] font-medium
                  text-[hsl(var(--foreground))]
                "
              >
                <CalendarDays className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />

                {data.weaver.planningDays}
              </div>

              <div
                className="
                  inline-flex items-center gap-1.5
                  rounded-full
                  border border-[hsl(var(--border))]
                  bg-[hsl(var(--background))]
                  px-3.5 py-2
                  text-[12px] font-medium
                  text-[hsl(var(--foreground))]
                "
              >
                <Clock3 className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />

                {data.weaver.favourableTime}
              </div>
            </div>
          </div>
        </div>

        {/* Temple Rows */}
        {data.temples.map((temple, index) => {
          const isLast = index === data.temples.length - 1;

          return (
            <div
              key={`${temple.templeName}-${index}`}
              className={`
                flex items-start gap-4 px-5 py-4
                transition-colors
                hover:bg-[hsl(var(--muted))]
                ${!isLast ? "border-b border-[hsl(var(--border))]" : ""}
              `}
            >
              {/* Number */}
              <div className="flex shrink-0 pt-0.5">
                <div
                  className="
                    flex h-7 w-7 items-center justify-center
                    rounded-full
                    bg-[hsl(var(--muted))]
                    text-[11px]
                    font-semibold
                    text-[hsl(var(--primary))]
                  "
                >
                  {index + 1}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div
                  className="
                    flex flex-col gap-3
                    lg:grid lg:grid-cols-[minmax(0,1fr)_420px]
                    lg:items-start lg:gap-8
                  "
                >
                  {/* LEFT */}
                  <div className="flex-1 min-w-0">
                    {/* Title Row */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className="
                          truncate
                          text-[14px]
                          font-semibold
                          text-[hsl(var(--foreground))]
                        "
                      >
                        {temple.templeName}
                      </h3>

                      {/* Tag */}
                      <div
                        className="
                          inline-flex shrink-0 items-center gap-1
                          rounded-full
                          bg-[hsl(var(--muted))]
                          px-2 py-0.5
                          text-[9px]
                          font-medium
                          uppercase
                          tracking-[0.08em]
                          text-[hsl(var(--primary))]
                        "
                      >
                        <span>Sacred Stop</span>

                        <span className="opacity-40">•</span>

                        <span>Route</span>
                      </div>
                    </div>

                    {/* Place */}
                    <div
                      className="
                        mt-1 inline-flex items-center gap-1
                        text-[11px]
                        text-[hsl(var(--muted-foreground))]
                      "
                    >
                      <MapPin className="w-3 h-3 shrink-0" />

                      <span className="truncate">
                        {temple.place}
                      </span>
                    </div>
                  </div>

                  {/* RIGHT DESCRIPTION */}
                  <div
                    className="
                      text-[13px]
                      leading-6
                      text-[hsl(var(--muted-foreground))]
                      lg:pt-0.5
                      lg:text-left
                    "
                  >
                    {temple.description}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
});








// import { memo } from "react";
// import { MapPin, Clock3, CalendarDays, Route, Loader2 } from "lucide-react";

// import type { JourneyWeaveResponse } from "@/types";

// interface JourneyWeaveSectionProps {
//   data?: JourneyWeaveResponse | null;

//   loading?: boolean;

//   title?: string;
//   subtitle?: string;

//   className?: string;
// }

// export const JourneyWeaveSection = memo(function JourneyWeaveSection({
//   data,
//   loading = false,

//   title = "Your spiritual pilgrimage",

//   subtitle = "A sacred route woven from devotion, ancestry, and memory.",

//   className = "",
// }: JourneyWeaveSectionProps) {
//   // ─────────────────────────────────────────────
//   // Loading
//   // ─────────────────────────────────────────────

//   if (loading) {
//     return (
//       <section
//         className={`rounded-3xl border border-[#E8DFCF] bg-white p-6 ${className}`}
//       >
//         <div className="flex items-center gap-2 text-[#8B7355]">
//           <Loader2 className="w-4 h-4 animate-spin" />

//           <span className="text-sm">Preparing your pilgrimage...</span>
//         </div>
//       </section>
//     );
//   }

//   // ─────────────────────────────────────────────
//   // Empty
//   // ─────────────────────────────────────────────

//   if (!data || data.temples.length === 0) {
//     return null;
//   }

//   // ─────────────────────────────────────────────
//   // Render
//   // ─────────────────────────────────────────────

//   return (
//     <section className={`space-y-6 ${className}`}>
//       {/* Header */}

//       {/* Single Journey Container */}
//       <div className="overflow-hidden rounded-[28px] border border-[#E8DFCF] bg-white shadow-sm">
//         {/* Compact Header */}
//         <div
//           className="
//     relative overflow-hidden rounded-[28px]
//     border-b border-[#EFE4D3]
//     bg-[#FDFBF7]
//     px-6 py-5
//   "
//         >
//           {/* Soft Glow */}
//           <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(194,164,109,0.06),transparent_35%)]" />

//           <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
//             {/* LEFT */}
//             <div className="min-w-0">
//               {/* Badge */}
//               <div
//                 className="
//           inline-flex items-center gap-1.5
//           rounded-full border border-[#D8C4A4]
//           bg-[#F8F1E7]
//           px-3 py-1
//         "
//               >
//                 <Route className="h-3 w-3 text-[#9C7444]" />

//                 <span
//                   className="
//             text-[9px] font-semibold uppercase
//             tracking-[0.18em] text-[#9C7444]
//           "
//                 >
//                   Journey Weave
//                 </span>
//               </div>

//               {/* Title */}
//               <h2
//                 className="
//           mt-3 text-[30px]
//           font-semibold leading-tight
//           text-[#3B2A1B]
//         "
//               >
//                 {title}
//               </h2>

//               {/* Subtitle */}
//               <p
//                 className="
//           mt-1 text-[14px]
//           leading-6 text-[#6E5A45]
//         "
//               >
//                 {subtitle}
//               </p>
//             </div>

//             {/* RIGHT */}
//             <div className="flex flex-wrap items-center gap-2">
//               <div
//                 className="
//           inline-flex items-center gap-1.5
//           rounded-full border border-[#E7D8C2]
//           bg-[#F8F1E7]
//           px-3.5 py-2
//           text-[12px] font-medium
//           text-[#4E351F]
//         "
//               >
//                 <CalendarDays className="h-3.5 w-3.5 text-[#9C7444]" />

//                 {data.weaver.planningDays}
//               </div>

//               <div
//                 className="
//           inline-flex items-center gap-1.5
//           rounded-full border border-[#E7D8C2]
//           bg-[#F8F1E7]
//           px-3.5 py-2
//           text-[12px] font-medium
//           text-[#4E351F]
//         "
//               >
//                 <Clock3 className="h-3.5 w-3.5 text-[#9C7444]" />

//                 {data.weaver.favourableTime}
//               </div>
//             </div>
//           </div>
//         </div>

//         {data.temples.map((temple, index) => {
//           const isLast = index === data.temples.length - 1;

//           return (
//             <div
//               key={`${temple.templeName}-${index}`}
//               className={`
//         flex items-start gap-4 px-5 py-4
//         transition-colors hover:bg-[#FCFAF7]
//         ${!isLast ? "border-b border-[#F3EBDD]" : ""}
//       `}
//             >
//               {/* Number */}
//               <div className="flex shrink-0 pt-0.5">
//                 <div
//                   className="
//             flex h-7 w-7 items-center justify-center
//             rounded-full bg-[#F6F1E8]
//             text-[11px] font-semibold text-[#8B6B3E]
//           "
//                 >
//                   {index + 1}
//                 </div>
//               </div>

//               {/* Main Row */}
//               <div className="flex-1 min-w-0">
//                 <div
//                   className="
//     flex flex-col gap-3
//     lg:grid lg:grid-cols-[minmax(0,1fr)_420px]
//     lg:items-start lg:gap-8
//   "
//                 >
//                   {/* LEFT */}
//                   <div className="flex-1 min-w-0">
//                     {/* Title Row */}
//                     <div className="flex flex-wrap items-center gap-2">
//                       <h3
//                         className="
//                   truncate text-[14px]
//                   font-semibold text-[#241E18]
//                 "
//                       >
//                         {temple.templeName}
//                       </h3>

//                       {/* Tag */}
//                       <div
//                         className="
//                   inline-flex shrink-0 items-center gap-1
//                   rounded-full bg-[#FAF6EF]
//                   px-2 py-0.5
//                   text-[9px] font-medium uppercase
//                   tracking-[0.08em] text-[#8B6B3E]
//                 "
//                       >
//                         <span>Sacred Stop</span>

//                         <span className="opacity-40">•</span>

//                         <span>Route</span>
//                       </div>
//                     </div>

//                     {/* Place */}
//                     <div
//                       className="
//                 mt-1 inline-flex items-center
//                 gap-1 text-[11px] text-[#8C7B68]
//               "
//                     >
//                       <MapPin className="w-3 h-3 shrink-0" />

//                       <span className="truncate">{temple.place}</span>
//                     </div>
//                   </div>

//                   {/* RIGHT DESCRIPTION */}
//                   <div
//                     className="
//                       text-[13px]
//                       leading-6
//                       text-[#5C5246]
//                       lg:pt-0.5
//                       lg:text-left
//                     "
//                   >
//                     {temple.description}
//                   </div>
//                 </div>
//               </div>
//             </div>
//           );
//         })}
//       </div>
//     </section>
//   );
// });
