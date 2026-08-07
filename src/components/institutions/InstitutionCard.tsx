import {
  Landmark,
  Church,
  Building2,
  Trash2,
  MapPin,
} from "lucide-react";

import { useState } from "react";

import type { ComponentType } from "react";
import type { Institution } from "@/types";

export interface InstitutionCardData {
  id: string;
  name: string;
  icon: string;
  placeId: string;
  address?: string;
  religion?: string;
  type?: string;
}

interface InstitutionCardProps {
  institution: Institution;
  onClick: () => void;
  onDelete?: () => void;
}

type Religion =
  | "Hindu"
  | "Christian"
  | "Islam";

const RELIGION_ICON: Record<
  Religion,
  ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>
> = {
  Hindu: Landmark,
  Christian: Church,
  Islam: Building2,
};

export function InstitutionCard({
  institution,
  onClick,
  onDelete,
}: InstitutionCardProps) {
  const [confirmDelete, setConfirmDelete] =
    useState(false);

  const {
    name,
    religion,
    location,
    type,
    tag,
    family_main,
    thumbnail,
  } = institution;

  const Icon =
    (religion &&
      RELIGION_ICON[
        religion as Religion
      ]) ||
    Landmark;

  const address =
    location?.locationText ||
    location?.address ||
    "Location unavailable";

  return (
    <div className="relative h-full group">
      <div
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={name}
        className="
          flex h-full w-full flex-col
          min-h-[300px] sm:min-h-[390px]
          overflow-hidden
          rounded-[16px] sm:rounded-[24px]
          border border-[hsl(var(--border))]
          bg-[hsl(var(--card))]
          text-left
          shadow-sm
          cursor-pointer
          transition-all duration-300
          hover:-translate-y-1
          hover:border-[hsl(var(--primary))]
          hover:shadow-xl
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-[hsl(var(--primary))]
          focus-visible:ring-offset-2
        "
      >
        {/* Hero */}
        <div
          className="
            relative w-full overflow-hidden
            h-[140px] sm:h-[200px]
            border-b border-[hsl(var(--border))]
            bg-gradient-to-b
            from-[hsl(var(--muted))]
            via-[hsl(var(--card))]
            to-[hsl(var(--background))]
          "
        >
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={name}
              loading="lazy"
              decoding="async"
              referrerPolicy="strict-origin-when-cross-origin"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
              className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              <Icon
                strokeWidth={1.6}
                className="
                  h-8 w-8 sm:h-12 sm:w-12
                  text-[hsl(var(--primary))]
                "
              />
            </div>
          )}

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-black/0 to-white/10" />

          {/* Religion Badge */}
          <div
            className="
              absolute left-2.5 top-2.5 sm:left-4 sm:top-4 z-20
              inline-flex items-center
              rounded-full
              border border-[hsl(var(--border))]
              bg-[hsl(var(--card))]/95
              px-2 py-0.5 sm:px-3 sm:py-1
              text-[9px] sm:text-[10px]
              font-semibold
              text-[hsl(var(--foreground))]
              shadow-sm
              backdrop-blur-sm
            "
          >
            {religion}
          </div>

          {/* Delete button */}
          {onDelete && !confirmDelete && (
            <button
              aria-label="Remove institution"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(true);
              }}
              className="
                absolute right-2.5 top-2.5 sm:right-4 sm:top-4 z-30
                rounded-lg sm:rounded-xl
                border border-[hsl(var(--border))]
                bg-[hsl(var(--card))]/95
                p-1.5 sm:p-2.5
                text-[hsl(var(--muted-foreground))]
                shadow-md
                backdrop-blur-md
                transition-all duration-200
                opacity-0
                group-hover:opacity-100
                hover:border-red-300
                hover:text-red-500
                focus:opacity-100
              "
            >
              <Trash2
                strokeWidth={2}
                className="w-3 h-3 sm:w-4 sm:h-4"
              />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 px-3 py-3 sm:px-5 sm:py-5">
          {/* Title */}
          <h3
            className="
              line-clamp-2
              min-h-[44px] sm:min-h-[64px]
              text-[15px] sm:text-[22px]
              font-semibold
              leading-[1.4]
              tracking-[-0.02em]
              text-[hsl(var(--foreground))]
            "
          >
            {name}
          </h3>

          {/* Address */}
          <div className="mt-2 sm:mt-3 flex items-start gap-1.5 sm:gap-2.5">
            <MapPin
              strokeWidth={1.8}
              className="
                mt-[3px] h-3 w-3 sm:h-4 sm:w-4 shrink-0
                text-[hsl(var(--primary))]
              "
            />
            <p
              className="
                line-clamp-2
                min-h-[40px] sm:min-h-[52px]
                text-[11px] sm:text-[13px]
                leading-5 sm:leading-6
                text-[hsl(var(--muted-foreground))]
              "
            >
              {address}
            </p>
          </div>

          <div className="flex-1" />

          {/* Footer */}
          <div className="flex items-end justify-between gap-2 mt-3 sm:mt-6">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {family_main && (
                <span
                  className="
                    inline-flex items-center
                    rounded-full
                    border border-[hsl(var(--primary))]
                    bg-[hsl(var(--primary))]
                    px-2 py-1 sm:px-3 sm:py-1.5
                    text-[9px] sm:text-[10px]
                    font-semibold
                    text-[hsl(var(--primary-foreground))]
                  "
                >
                  Family Main
                </span>
              )}

              {tag && (
                <span
                  className="
                    inline-flex items-center
                    rounded-full
                    border border-[hsl(var(--border))]
                    bg-[hsl(var(--muted))]
                    px-2 py-1 sm:px-3 sm:py-1.5
                    text-[9px] sm:text-[10px]
                    font-medium
                    text-[hsl(var(--foreground))]
                  "
                >
                  {tag}
                </span>
              )}
            </div>

            {type && (
              <span
                className="
                  shrink-0
                  text-[9px] sm:text-[10px]
                  font-medium uppercase
                  tracking-[0.12em] sm:tracking-[0.14em]
                  text-[hsl(var(--muted-foreground))]
                "
              >
                {type}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div
          className="
            absolute inset-0 z-40
            flex flex-col items-center justify-center
            gap-3 sm:gap-4
            rounded-[16px] sm:rounded-[24px]
            bg-black/55
            p-4 sm:p-5
            backdrop-blur-md
          "
        >
          <p
            className="
              text-center
              text-[12px] sm:text-[13px]
              font-semibold text-white
            "
          >
            Remove this sacred place?
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(false);
              }}
              className="
                rounded-xl
                bg-white/15
                px-3 py-1.5 sm:px-4 sm:py-2
                text-[11px] sm:text-[12px]
                font-medium text-white
                transition-colors
                hover:bg-white/25
              "
            >
              Cancel
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(false);
                onDelete?.();
              }}
              className="
                rounded-xl
                bg-red-500
                px-3 py-1.5 sm:px-4 sm:py-2
                text-[11px] sm:text-[12px]
                font-medium text-white
                transition-colors
                hover:bg-red-600
              "
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}







// import {
//   Landmark,
//   Church,
//   Building2,
//   Trash2,
//   MapPin,
// } from "lucide-react";

// import { useState } from "react";

// import type { ComponentType } from "react";
// import type { Institution } from "@/types";

// export interface InstitutionCardData {
//   id: string;
//   name: string;
//   icon: string;
//   placeId: string;
//   address?: string;
//   religion?: string;
//   type?: string;
// }

// interface InstitutionCardProps {
//   institution: Institution;
//   onClick: () => void;
//   onDelete?: () => void;
// }

// /**
//  * Supported religion values
//  */
// type Religion = "Hindu" | "Christian" | "Islam";

// /**
//  * Religion icon mapping
//  */
// const RELIGION_ICON: Record<
//   Religion,
//   ComponentType<{ className?: string; strokeWidth?: number }>
// > = {
//   Hindu: Landmark,
//   Christian: Church,
//   Islam: Building2,
// };

// export function InstitutionCard({
//   institution,
//   onClick,
//   onDelete,
// }: InstitutionCardProps) {
//   const [confirmDelete, setConfirmDelete] = useState(false);

//   const { name, religion, location, type, tag, family_main, thumbnail } =
//     institution;

//   /**
//    * Safe icon resolution
//    */
//   const Icon =
//     (religion && RELIGION_ICON[religion as Religion]) || Landmark;

//   /**
//    * Safe location extraction
//    */
//   const address =
//     location?.locationText ||
//     location?.address ||
//     "Location unavailable";

//   return (
//     <div className="relative h-full group">
//       <button
//         onClick={onClick}
//         className="
//           flex h-full min-h-[390px] w-full flex-col
//           overflow-hidden rounded-[24px]
//           border border-[#E7DDCE]
//           bg-[#FDFBF7]
//           text-left
//           shadow-[0_4px_18px_rgba(91,64,37,0.08)]
//           transition-all duration-300
//           hover:-translate-y-1
//           hover:border-[#D7C2A2]
//           hover:shadow-[0_14px_36px_rgba(91,64,37,0.14)]
//         "
//         aria-label={name}
//       >
//         {/* ── Hero Image ───────────────────────────────────────────── */}
//         <div
//           className="
//             relative h-[200px] w-full overflow-hidden
//             border-b border-[#EFE4D5]
//             bg-gradient-to-b
//             from-[#F8F3EB]
//             via-[#F4EEE5]
//             to-[#ECE3D6]
//           "
//         >
//           {thumbnail ? (
//             <img
//               src={thumbnail}
//               alt={name}
//               className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
//               loading="lazy"
//               decoding="async"
//               referrerPolicy="strict-origin-when-cross-origin"
//               onError={(e) => {
//                 e.currentTarget.style.display = "none";
//               }}
//             />
//           ) : (
//             <div className="flex items-center justify-center w-full h-full">
//               <Icon
//                 className="h-12 w-12 text-[#8B6F3A]"
//                 strokeWidth={1.6}
//               />
//             </div>
//           )}

//           {/* Overlay Gradient */}
//           <div
//             className="absolute inset-0 bg-gradient-to-t from-black/15 via-black/0 to-white/10"
//           />

//           {/* Religion Badge */}
//           <div
//             className="
//               absolute left-4 top-4 z-20
//               inline-flex items-center
//               rounded-full
//               border border-[#E7D8C2]
//               bg-white/95
//               px-3 py-1
//               text-[10px] font-semibold
//               text-[#6D532E]
//               shadow-sm
//               backdrop-blur-sm
//             "
//           >
//             {religion}
//           </div>

//           {/* Delete Button */}
//           {onDelete && !confirmDelete && (
//             <button
//               onClick={(e) => {
//                 e.stopPropagation();
//                 setConfirmDelete(true);
//               }}
//               className="
//                 absolute right-4 top-4 z-30
//                 rounded-xl
//                 border border-[#E7DDCE]
//                 bg-white/95
//                 p-2.5
//                 text-[#72685C]
//                 shadow-md
//                 backdrop-blur-md
//                 transition-all duration-200
//                 opacity-0
//                 group-hover:opacity-100
//                 hover:border-red-200
//                 hover:text-red-500
//                 focus:opacity-100
//               "
//               aria-label="Remove institution"
//             >
//               <Trash2 className="w-4 h-4" strokeWidth={2} />
//             </button>
//           )}
//         </div>

//         {/* ── Content ───────────────────────────────────────────── */}
//         <div className="flex flex-col flex-1 px-5 py-5">
//           {/* Title */}
//           <h3
//             className="
//               min-h-[64px]
//               text-[22px]
//               font-semibold
//               leading-[1.4]
//               tracking-[-0.02em]
//               text-[#2A2118]
//               line-clamp-2
//             "
//           >
//             {name}
//           </h3>

//           {/* Address */}
//           <div className="flex items-start gap-2.5 mt-3">
//             <MapPin
//               className="
//                 mt-[3px] h-4 w-4 shrink-0
//                 text-[#A07B42]
//               "
//               strokeWidth={1.8}
//             />

//             <p
//               className="
//                 min-h-[52px]
//                 text-[13px]
//                 leading-6
//                 text-[#786857]
//                 line-clamp-2
//               "
//             >
//               {address}
//             </p>
//           </div>

//           {/* Spacer */}
//           <div className="flex-1" />

//           {/* Footer */}
//           <div className="flex items-end justify-between gap-3 mt-6">
//             <div className="flex flex-wrap items-center gap-2">
//               {family_main && (
//                 <span
//                   className="
//                     inline-flex items-center rounded-full
//                     border border-[#5B4630]
//                     bg-[#4B3522]
//                     px-3 py-1.5
//                     text-[10px] font-semibold
//                     text-[#F8F3EA]
//                   "
//                 >
//                   Family Main
//                 </span>
//               )}

//               {tag && (
//                 <span
//                   className="
//                     inline-flex items-center rounded-full
//                     border border-[#E4D0AF]
//                     bg-[#F5E9D3]
//                     px-3 py-1.5
//                     text-[10px] font-medium
//                     text-[#7A5B2D]
//                   "
//                 >
//                   {tag}
//                 </span>
//               )}
//             </div>

//             {type && (
//               <span
//                 className="
//                   shrink-0 text-[10px]
//                   font-medium uppercase
//                   tracking-[0.14em]
//                   text-[#A0814B]
//                 "
//               >
//                 {type}
//               </span>
//             )}
//           </div>
//         </div>
//       </button>

//       {/* ── Delete Confirmation ───────────────────────────────── */}
//       {confirmDelete && (
//         <div
//           className="
//             absolute inset-0 z-40
//             flex flex-col items-center justify-center
//             gap-4 rounded-[24px]
//             bg-black/55
//             p-5
//             backdrop-blur-md
//           "
//         >
//           <p
//             className="
//               text-center text-[13px]
//               font-semibold text-white
//             "
//           >
//             Remove this sacred place?
//           </p>

//           <div className="flex items-center gap-2">
//             <button
//               onClick={(e) => {
//                 e.stopPropagation();
//                 setConfirmDelete(false);
//               }}
//               className="
//                 rounded-xl bg-white/15
//                 px-4 py-2
//                 text-[12px] font-medium
//                 text-white
//                 transition-colors
//                 hover:bg-white/25
//               "
//             >
//               Cancel
//             </button>

//             <button
//               onClick={(e) => {
//                 e.stopPropagation();
//                 setConfirmDelete(false);
//                 onDelete?.();
//               }}
//               className="
//                 rounded-xl bg-red-500
//                 px-4 py-2
//                 text-[12px] font-medium
//                 text-white
//                 transition-colors
//                 hover:bg-red-600
//               "
//             >
//               Remove
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }