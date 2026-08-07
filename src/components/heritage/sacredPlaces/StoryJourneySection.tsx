import { memo } from "react";
import {
  Landmark,
  Map,
  Loader2,
  Search,
} from "lucide-react";

interface StoryJourneySectionProps {
  onGenerateStory: () => void;

  onOpenJourney?: () => void;
  onDiscoverPlaces?: () => void;

  generatingStory?: boolean;
  creatingJourney?: boolean;
  disableJourney?: boolean;
}

export const StoryJourneySection = memo(function StoryJourneySection({
  onOpenJourney,
  onDiscoverPlaces,
  creatingJourney = false,
  disableJourney = false,
}: StoryJourneySectionProps) {
  return (
    <section className="grid gap-5 md:grid-cols-2">
      {/* Discover Sacred Places */}
      <div
        className="
          relative overflow-hidden rounded-[28px]
          border border-[hsl(var(--border))]
          bg-[hsl(var(--card))]
          p-6 md:p-7
          shadow-sm
        "
      >
        <div
          className="
            pointer-events-none absolute inset-0
            bg-[radial-gradient(circle_at_20%_20%,rgba(194,164,109,0.08),transparent_45%)]
            dark:bg-[radial-gradient(circle_at_20%_20%,rgba(123,143,212,0.10),transparent_45%)]
          "
        />

        <div className="relative z-10 flex flex-col h-full">
          <div
            className="
              mb-5 inline-flex w-fit items-center gap-1.5
              rounded-full
              border border-[hsl(var(--border))]
              bg-[hsl(var(--muted))]
              px-3 py-1
            "
          >
            <Landmark className="h-3 w-3 text-[hsl(var(--primary))]" />

            <span
              className="
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.22em]
                text-[hsl(var(--primary))]
              "
            >
              Discover
            </span>
          </div>

          <h3
            className="
              font-serif-display
              text-[22px]
              font-semibold
              leading-tight
              text-[hsl(var(--foreground))]
              md:text-[24px]
            "
          >
            Explore sacred places
          </h3>

          <p
            className="
              mt-4
              text-[14px]
              leading-relaxed
              text-[hsl(var(--muted-foreground))]
            "
          >
            Discover temples, churches, mosques, gurudwaras, monasteries and
            sacred sites across traditions. Learn their history, significance
            and connection to your family's journey.
          </p>

          <div className="flex-1" />

          <button
            type="button"
            onClick={onDiscoverPlaces}
            className="
              mt-7 inline-flex w-fit items-center gap-2
              rounded-full
              bg-[hsl(var(--primary))]
              px-5 py-2.5
              text-[13px]
              font-medium
              text-[hsl(var(--primary-foreground))]
              transition-all duration-200
              hover:opacity-90
              hover:shadow-md
            "
          >
            <Search className="h-3.5 w-3.5" />
            Explore places
          </button>
        </div>
      </div>

      {/* Generate Pilgrimage */}
      <div
        className="
          relative overflow-hidden rounded-[28px]
          border border-[hsl(var(--border))]
          bg-[hsl(var(--card))]
          p-6 md:p-7
          shadow-sm
        "
      >
        <div
          className="
            pointer-events-none absolute inset-0
            bg-[radial-gradient(circle_at_80%_20%,rgba(194,164,109,0.08),transparent_45%)]
            dark:bg-[radial-gradient(circle_at_80%_20%,rgba(123,143,212,0.10),transparent_45%)]
          "
        />

        <div className="relative z-10 flex flex-col h-full">
          <div
            className="
              mb-5 inline-flex w-fit items-center gap-1.5
              rounded-full
              border border-[hsl(var(--border))]
              bg-[hsl(var(--muted))]
              px-3 py-1
            "
          >
            <Map className="h-3 w-3 text-[hsl(var(--primary))]" />

            <span
              className="
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.22em]
                text-[hsl(var(--primary))]
              "
            >
              Pilgrimage
            </span>
          </div>

          <h3
            className="
              font-serif-display
              text-[22px]
              font-semibold
              leading-tight
              text-[hsl(var(--foreground))]
              md:text-[24px]
            "
          >
            Generate your pilgrimage
          </h3>

          <p
            className="
              mt-4
              text-[14px]
              leading-relaxed
              text-[hsl(var(--muted-foreground))]
            "
          >
            Create a personalized spiritual journey based on your faith,
            location and sacred destinations. Follow a meaningful route through
            places of devotion and heritage.
          </p>

          <div className="flex-1" />

          <button
            type="button"
            disabled={creatingJourney || disableJourney}
            onClick={onOpenJourney}
            className="
              mt-7 inline-flex w-fit items-center gap-2
              rounded-full
              bg-[hsl(var(--primary))]
              px-5 py-2.5
              text-[13px]
              font-medium
              text-[hsl(var(--primary-foreground))]
              transition-all duration-200
              hover:opacity-90
              hover:shadow-md
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            {creatingJourney ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Map className="h-3.5 w-3.5" />
            )}

            {creatingJourney
              ? "Creating your journey..."
              : "Create journey"}
          </button>
        </div>
      </div>
    </section>
  );
});








// import { memo } from "react";
// import { Sparkles, Map, BookOpen, Loader2 } from "lucide-react";

// interface StoryJourneySectionProps {
//   onGenerateStory: () => void;
//   onOpenJourney?: () => void;

//   generatingStory?: boolean;
//   creatingJourney?: boolean;

//   disableJourney?: boolean;
// }

// export const StoryJourneySection = memo(function StoryJourneySection({
//   onGenerateStory,
//   onOpenJourney,

//   generatingStory = false,
//   creatingJourney = false,

//   disableJourney = false,
// }: StoryJourneySectionProps) {
//   return (
//     <section className="grid gap-5 md:grid-cols-1">
//       {/* LEFT — Story */}
//       {/* <div
//         className="
//           relative overflow-hidden rounded-[28px]
//           border border-[#E4D8C7]
//           bg-[#FDFBF7]
//           p-6 md:p-7
//           shadow-[0_8px_30px_-18px_rgba(91,64,37,0.18)]
//         "
//       >
//         <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(194,164,109,0.06),transparent_45%)]" />

//         <div className="relative z-10 flex flex-col h-full">
//           <div
//             className="
//               mb-5 inline-flex w-fit items-center gap-1.5
//               rounded-full border border-[#D8C4A4]
//               bg-[#F8F1E7]
//               px-3 py-1
//             "
//           >
//             <BookOpen className="h-3 w-3 text-[#9C7444]" />

//             <span
//               className="
//                 text-[10px] font-semibold uppercase
//                 tracking-[0.22em] text-[#9C7444]
//               "
//             >
//               Sample
//             </span>
//           </div>

//           <h3
//             className="
//               font-serif-display text-[22px]
//               font-semibold leading-tight
//               text-[#3B2A1B]
//               md:text-[24px]
//             "
//           >
//             Your family story — sample
//           </h3>

//           <p
//             className="
//               mt-4 max-w-md text-[14px]
//               italic leading-relaxed
//               text-[#6E5A45]
//             "
//           >
//             “Three generations of the family have returned to Guruvayur each
//             December — a rhythm older than the grandparents can remember, a
//             thread that still pulls the grandchildren back.”
//           </p>

//           <div className="flex-1" />

//           <button
//             type="button"
//             disabled={generatingStory}
//             onClick={onGenerateStory}
//             className="
//               mt-7 inline-flex w-fit items-center gap-2
//               rounded-full
//               bg-[#4E351F]
//               px-5 py-2.5
//               text-[13px] font-medium text-white
//               transition-all duration-200
//               hover:bg-[#3E2918]
//               hover:shadow-md
//               disabled:cursor-not-allowed
//               disabled:opacity-60
//             "
//           >
//             {generatingStory ? (
//               <Loader2 className="h-3.5 w-3.5 animate-spin" />
//             ) : (
//               <Sparkles className="h-3.5 w-3.5" />
//             )}

//             {generatingStory
//               ? "Generating story..."
//               : "Generate your story"}
//           </button>
//         </div>
//       </div> */}

//       {/* RIGHT — Journey */}
//       <div
//         className="
//           relative overflow-hidden rounded-[28px]
//           border border-[#E4D8C7]
//           bg-[#FDFBF7]
//           p-6 md:p-7
//           shadow-[0_8px_30px_-18px_rgba(91,64,37,0.18)]
//         "
//       >
//         {/* Soft Glow */}
//         <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(194,164,109,0.06),transparent_45%)]" />

//         <div className="relative z-10 flex flex-col h-full">
//           {/* Badge */}
//           <div
//             className="
//               mb-5 inline-flex w-fit items-center gap-1.5
//               rounded-full border border-[#D8C4A4]
//               bg-[#F8F1E7]
//               px-3 py-1
//             "
//           >
//             <Map className="h-3 w-3 text-[#9C7444]" />

//             <span
//               className="
//                 text-[10px] font-semibold uppercase
//                 tracking-[0.22em] text-[#9C7444]
//               "
//             >
//               Your journey
//             </span>
//           </div>

//           {/* Title */}
//           <h3
//             className="
//               font-serif-display text-[22px]
//               font-semibold leading-tight
//               text-[#3B2A1B]
//               md:text-[24px]
//             "
//           >
//             Your pilgrimage
//           </h3>

//           {/* Description */}
//           <p
//             className="
//               mt-4  text-[14px]
//               italic leading-relaxed
//               text-[#6E5A45]
//             "
//           >
//             “This pilgrimage traces the sacred geography of your family’s
//             history, bridging the devotion of the south with the eternal legacy
//             of the west. It is a beautiful way to walk the paths your ancestors
//             once traveled…”
//           </p>

//           <div className="flex-1" />

//           {/* CTA */}
//           <button
//             type="button"
//             disabled={creatingJourney || disableJourney}
//             onClick={onOpenJourney}
//             className="
//               mt-7 inline-flex w-fit items-center gap-2
//               rounded-full
//               bg-[#4E351F]
//               px-5 py-2.5
//               text-[13px] font-medium text-white
//               transition-all duration-200
//               hover:bg-[#3E2918]
//               hover:shadow-md
//               disabled:cursor-not-allowed
//               disabled:opacity-60
//             "
//           >
//             {creatingJourney ? (
//               <Loader2 className="h-3.5 w-3.5 animate-spin" />
//             ) : (
//               <Map className="h-3.5 w-3.5" />
//             )}

//             {creatingJourney
//               ? "Creating your journey..."
//               : "Weave your journey"}
//           </button>
//         </div>
//       </div>
//     </section>
//   );
// });