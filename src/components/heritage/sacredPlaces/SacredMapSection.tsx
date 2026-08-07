import { memo, useState, useEffect, useRef, useMemo } from "react";
import type { ComponentType } from "react";
import type { Institution } from "@/types";

import { InstitutionCard } from "@/components/institutions/InstitutionCard";
import {
  useMyInstitutions,
  useRemoveInstitutionFromMyList,
} from "@/hooks/useInstitution";

import { useToast } from "@/components/ui/use-toast";
import { SkeletonGrid } from "@/components/ui/skeleton";

import {
  Landmark,
  ChevronLeft,
  ChevronRight,
  Church,
  Flame,
  MoonStar,
  Flower2,
  Sparkles,
  Users,
  type LucideProps,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Religion meta
// ─────────────────────────────────────────────────────────────

const RELIGION_META: Record<
  string,
  {
    label: string;
    icon: ComponentType<LucideProps>;
    color: string;
  }
> = {
  All: {
    label: "All",
    icon: Landmark,
    color: "",
  },

  Hindu: {
    label: "Hindu",
    icon: Flame,
    color:
      "data-[active=true]:bg-orange-600/90 data-[active=true]:border-orange-500",
  },

  Muslim: {
    label: "Muslim",
    icon: MoonStar,
    color:
      "data-[active=true]:bg-emerald-700/90 data-[active=true]:border-emerald-600",
  },

  Christian: {
    label: "Christian",
    icon: Church,
    color:
      "data-[active=true]:bg-sky-700/90 data-[active=true]:border-sky-600",
  },

  Sikh: {
    label: "Sikh",
    icon: Users,
    color:
      "data-[active=true]:bg-yellow-600/90 data-[active=true]:border-yellow-500",
  },

  Buddhist: {
    label: "Buddhist",
    icon: Flower2,
    color:
      "data-[active=true]:bg-amber-700/90 data-[active=true]:border-amber-600",
  },

  Jain: {
    label: "Jain",
    icon: Sparkles,
    color:
      "data-[active=true]:bg-violet-700/90 data-[active=true]:border-violet-600",
  },
};

// ─────────────────────────────────────────────────────────────
// Pill order
// ─────────────────────────────────────────────────────────────

const PILL_ORDER = [
  "All",
  "Hindu",
  "Muslim",
  "Christian",
  "Sikh",
  "Buddhist",
  "Jain",
];

interface SacredMapSectionProps {
  onOpen: (institutionId: string, institution: Institution) => void;
  religion?: string;
  reloadKey?: unknown;
  pageSize?: number;
}

export const SacredMapSection = memo(function SacredMapSection({
  onOpen,
  religion: initialReligion,
  reloadKey,
  pageSize = 8,
}: SacredMapSectionProps) {
  const { data, loading, error, refetch } = useMyInstitutions([reloadKey]);

  const remove = useRemoveInstitutionFromMyList();

  const { toast } = useToast();

  // ───────────────────────────────────────────────────────────
  // Refs
  // ───────────────────────────────────────────────────────────

  const sectionRef = useRef<HTMLElement>(null);

  // ───────────────────────────────────────────────────────────
  // State
  // ───────────────────────────────────────────────────────────

const [activeReligion, setActiveReligion] = useState<string>("All");

  const [currentPage, setCurrentPage] = useState(1);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeReligion]);

  // ───────────────────────────────────────────────────────────
  // Delete handler
  // ───────────────────────────────────────────────────────────

  const handleDelete = async (institutionId: string) => {
    const result = await remove.mutate(institutionId);

    if (result) {
      toast({
        title: "Removed",
        description: "Institution removed from your list.",
      });

      refetch();
    } else {
      toast({
        title: "Error",
        description: remove.error || "Failed to remove institution.",
        variant: "destructive",
      });
    }
  };

  // ───────────────────────────────────────────────────────────
  // Normalize API response
  // ───────────────────────────────────────────────────────────

  const institutions: Institution[] = (data?.data ?? []).map((item) => ({
    _id: item.institutionId,
    institutionId: item.institutionId,
    name: item.title,
    title: item.title,
    religion: item.religion,
    type: undefined as any, // type: "temple",
    tag: item.tag,
    family_main: item.family_main,

    location: {
      address: item.location,
      locationText: item.location,
      country: "",
      lat: null,
      lng: null,
      googleMapsUrl: null,
    },

    thumbnail: item.thumbnail,
    overview: "",
    addedAt: item.addedAt,
  }));

  // ───────────────────────────────────────────────────────────
  // Available religions
  // ───────────────────────────────────────────────────────────

  const availableReligions = useMemo(() => {
    const present = new Set(
      institutions.map((i) => i.religion).filter(Boolean),
    );

    return PILL_ORDER.filter(
      (religion) => religion === "All" || present.has(religion),
    );
  }, [institutions]);

  // ───────────────────────────────────────────────────────────
  // Filtered institutions
  // ───────────────────────────────────────────────────────────

  const filteredInstitutions =
    activeReligion === "All"
      ? institutions
      : institutions.filter(
          (institution) =>
            institution.religion?.toLowerCase() ===
            activeReligion.toLowerCase(),
        );

  // ───────────────────────────────────────────────────────────
  // Pagination
  // ───────────────────────────────────────────────────────────

  const totalPages = Math.max(
    1,
    Math.ceil(filteredInstitutions.length / pageSize),
  );

  const safePage = Math.min(currentPage, totalPages);

  const startIdx = (safePage - 1) * pageSize;

  // Family main first
  const sortedInstitutions = [...filteredInstitutions].sort((a, b) => {
    if (a.family_main && !b.family_main) return -1;

    if (!a.family_main && b.family_main) return 1;

    return 0;
  });

  const pagedInstitutions = sortedInstitutions.slice(
    startIdx,
    startIdx + pageSize,
  );

  const goTo = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));

    requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  // ───────────────────────────────────────────────────────────
  // Page numbers
  // ───────────────────────────────────────────────────────────

  const pageNumbers = (() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | "…")[] = [1];

    if (safePage > 3) pages.push("…");

    for (
      let page = Math.max(2, safePage - 1);
      page <= Math.min(totalPages - 1, safePage + 1);
      page++
    ) {
      pages.push(page);
    }

    if (safePage < totalPages - 2) pages.push("…");

    pages.push(totalPages);

    return pages;
  })();

  return (
    <section ref={sectionRef} className="space-y-5">
      {/* Header */}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-semibold text-[hsl(var(--foreground))]">
            Your family's sacred map
          </h2>

          <p className="mt-1 text-[13px] text-[hsl(var(--muted-foreground))]">
            All the places your family holds close, in the order that matters.
          </p>
        </div>

        {!loading && !error && filteredInstitutions.length > 0 && (
          <p className="shrink-0 text-[12px] text-[hsl(var(--muted-foreground))]">
            {startIdx + 1}–
            {Math.min(startIdx + pageSize, filteredInstitutions.length)} of{" "}
            {filteredInstitutions.length}
          </p>
        )}
      </div>

      {/* Religion pills */}

      {!loading && availableReligions.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="
              shrink-0
              text-[10.5px]
              font-semibold
              uppercase
              tracking-[0.28em]
              text-[hsl(var(--primary))]
            "
          >
            Filter
          </span>

          <div className="flex flex-wrap items-center gap-2">
            {availableReligions.map((rel) => {
              const meta = RELIGION_META[rel] ?? {
                label: rel,
                icon: Landmark,
                color: "",
              };

              const Icon = meta.icon;

              const isActive = activeReligion === rel;

              return (
                <button
                  key={rel}
                  type="button"
                  onClick={() => setActiveReligion(rel)}
                  data-active={isActive}
                  className={`
                    inline-flex items-center gap-1.5
                    rounded-full border px-3 py-1
                    text-[12px] font-medium
                    transition-all duration-200

                    ${
                      isActive
                        ? `
                          border-[hsl(var(--primary))]
                          bg-[hsl(var(--primary))]
                          text-[hsl(var(--primary-foreground))]
                          shadow-sm
                          ${meta.color}
                        `
                        : `
                          border-[hsl(var(--border))]
                          bg-transparent
                          text-[hsl(var(--muted-foreground))]
                          hover:border-[hsl(var(--border)/0.8)]
                          hover:bg-[hsl(var(--muted))]
                          hover:text-[hsl(var(--foreground))]
                        `
                    }
                  `}
                >
                  <Icon className="size-4 shrink-0" />

                  <span>{meta.label}</span>

                  {!isActive && rel !== "All" && (
                    <span
                      className="
                        ml-0.5 rounded-full
                        bg-[hsl(var(--muted))]
                        px-1.5 py-0.5
                        text-[10px] leading-none
                        text-[hsl(var(--muted-foreground))]
                      "
                    >
                      {
                        institutions.filter(
                          (institution) =>
                            institution.religion?.toLowerCase() ===
                            rel.toLowerCase(),
                        ).length
                      }
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}

      {loading ? (
        <SkeletonGrid />
      ) : error ? (
        <p className="text-[13px] text-red-500">{error}</p>
      ) : filteredInstitutions.length === 0 ? (
        <div
          className="
            flex flex-col items-center justify-center
            rounded-3xl border border-dashed
            border-[hsl(var(--border))]
            bg-[hsl(var(--card))]
            py-14 text-center
          "
        >
          <div
            className="
              flex h-14 w-14 items-center justify-center
              rounded-2xl bg-[hsl(var(--muted))]
            "
          >
            <Landmark className="h-6 w-6 text-[hsl(var(--primary))]" />
          </div>

          <h3 className="mt-4 text-[15px] font-semibold text-[hsl(var(--foreground))]">
            {/* No {activeReligion !== "All" ? `${activeReligion} ` : ""} */}
            No sacred places yet
          </h3>

          <p className="mt-1 max-w-sm text-[13px] text-[hsl(var(--muted-foreground))]">
            {/* {activeReligion !== "All"
              ? `No ${activeReligion} places have been added yet. Try another filter or add one.` */}
              Start adding temples, churches, mosques, and other meaningful places to build your family's sacred map.
          </p>
        </div>
      ) : (
        <>
          {/* Grid */}

          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
            {pagedInstitutions.map((institution) => (
              <InstitutionCard
                key={institution._id}
                institution={institution}
                onClick={() => onOpen(institution._id, institution)}
                onDelete={
                  institution.family_main
                    ? undefined
                    : () => handleDelete(institution._id)
                }
              />
            ))}
          </div>

          {/* Pagination */}

          {totalPages > 1 && (
            <div className="flex items-center justify-end pt-2">
              <div className="flex items-center gap-1">
                {/* Prev */}

                <button
                  type="button"
                  onClick={() => goTo(safePage - 1)}
                  disabled={safePage === 1}
                  aria-label="Previous page"
                  className="
                    flex h-8 w-8 items-center justify-center rounded-full
                    border border-[hsl(var(--border))]
                    text-[hsl(var(--foreground))]
                    transition-colors
                    hover:bg-[hsl(var(--muted))]
                    disabled:opacity-30
                  "
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page numbers */}

                {pageNumbers.map((page, index) =>
                  page === "…" ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="
                        flex h-8 w-8 items-center justify-center
                        text-[12px]
                        text-[hsl(var(--muted-foreground))]
                      "
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={page}
                      type="button"
                      onClick={() => goTo(page)}
                      aria-label={`Page ${page}`}
                      aria-current={page === safePage ? "page" : undefined}
                      className={`
                        flex h-8 w-8 items-center justify-center rounded-full
                        text-[12px] font-medium
                        transition-colors

                        ${
                          page === safePage
                            ? `
                              border border-[hsl(var(--primary))]
                              bg-[hsl(var(--primary))]
                              text-[hsl(var(--primary-foreground))]
                            `
                            : `
                              border border-[hsl(var(--border))]
                              text-[hsl(var(--foreground))]
                              hover:bg-[hsl(var(--muted))]
                            `
                        }
                      `}
                    >
                      {page}
                    </button>
                  ),
                )}

                {/* Next */}

                <button
                  type="button"
                  onClick={() => goTo(safePage + 1)}
                  disabled={safePage === totalPages}
                  aria-label="Next page"
                  className="
                    flex h-8 w-8 items-center justify-center rounded-full
                    border border-[hsl(var(--border))]
                    text-[hsl(var(--foreground))]
                    transition-colors
                    hover:bg-[hsl(var(--muted))]
                    disabled:opacity-30
                  "
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
});

// import { memo, useState, useEffect, useRef } from "react";
// import type { Institution } from "@/types";

// import { InstitutionCard } from "@/components/institutions/InstitutionCard";
// import {
//   useMyInstitutions,
//   useRemoveInstitutionFromMyList,
// } from "@/hooks/useInstitution";

// import { useToast } from "@/components/ui/use-toast";
// import { SkeletonGrid } from "@/components/ui/skeleton";
// import { Landmark, ChevronLeft, ChevronRight } from "lucide-react";

// interface SacredMapSectionProps {
//   onOpen: (institutionId: string, institution: Institution) => void;
//   religion?: string;
//   reloadKey?: unknown;
//   pageSize?: number;
// }

// export const SacredMapSection = memo(function SacredMapSection({
//   onOpen,
//   religion,
//   reloadKey,
//   pageSize = 8,
// }: SacredMapSectionProps) {
//   const { data, loading, error, refetch } = useMyInstitutions([reloadKey]);
//   const remove = useRemoveInstitutionFromMyList();
//   const { toast } = useToast();

//   // ── Scroll anchor ─────────────────────────────────────────────────────────
//   const sectionRef = useRef<HTMLElement>(null);

//   // ── Pagination state ──────────────────────────────────────────────────────
//   const [currentPage, setCurrentPage] = useState(1);

//   // Reset to page 1 whenever the filter changes
//   useEffect(() => {
//     setCurrentPage(1);
//   }, [religion]);

//   // ── Delete handler ────────────────────────────────────────────────────────
//   const handleDelete = async (institutionId: string) => {
//     const result = await remove.mutate(institutionId);

//     if (result) {
//       toast({
//         title: "Removed",
//         description: "Institution removed from your list.",
//       });
//       refetch();
//     } else {
//       toast({
//         title: "Error",
//         description: remove.error || "Failed to remove institution.",
//         variant: "destructive",
//       });
//     }
//   };

//   // ── Normalize API → Institution ───────────────────────────────────────────
//   const institutions: Institution[] = (data?.data ?? []).map((item) => ({
//     _id: item.institutionId,
//     institutionId: item.institutionId,
//     name: item.title,
//     title: item.title,
//     religion: item.religion,
//     type: "temple",
//     tag: item.tag,
//     family_main: item.family_main,
//     location: {
//       address: item.location,
//       locationText: item.location,
//       country: "",
//       lat: null,
//       lng: null,
//       googleMapsUrl: null,
//     },
//     thumbnail: item.thumbnail,
//     overview: "",
//     addedAt: item.addedAt,
//   }));

//   const filteredInstitutions = religion
//     ? institutions.filter(
//         (inst) => inst.religion?.toLowerCase() === religion.toLowerCase(),
//       )
//     : institutions;

//   // ── Pagination math ───────────────────────────────────────────────────────
//   const totalPages = Math.max(1, Math.ceil(filteredInstitutions.length / pageSize));
//   const safePage = Math.min(currentPage, totalPages);
//   const startIdx = (safePage - 1) * pageSize;

//   // Sort: family_main always first, then slice for current page
//   const sortedInstitutions = [...filteredInstitutions].sort((a, b) => {
//     if (a.family_main && !b.family_main) return -1;
//     if (!a.family_main && b.family_main) return 1;
//     return 0;
//   });

//   const pagedInstitutions = sortedInstitutions.slice(startIdx, startIdx + pageSize);

//   const goTo = (page: number) => {
//     setCurrentPage(Math.max(1, Math.min(page, totalPages)));

//     // Scroll back to section heading on every page change
//     setTimeout(() => {
//       sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
//     }, 0);
//   };

//   // ── Page number buttons with ellipsis ─────────────────────────────────────
//   const pageNumbers = (() => {
//     if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

//     const pages: (number | "…")[] = [1];
//     if (safePage > 3) pages.push("…");
//     for (
//       let p = Math.max(2, safePage - 1);
//       p <= Math.min(totalPages - 1, safePage + 1);
//       p++
//     ) {
//       pages.push(p);
//     }
//     if (safePage < totalPages - 2) pages.push("…");
//     pages.push(totalPages);
//     return pages;
//   })();

//   // ─────────────────────────────────────────────────────────────────────────
//   return (
//     <section ref={sectionRef} className="space-y-5">
//       {/* Header */}
//       <div className="flex items-start justify-between">
//         <div>
//           <h2 className="text-[18px] font-semibold text-[#1E1915]">
//             Your family's sacred map
//           </h2>
//           <p className="text-[13px] text-[#1E1915] mt-1">
//             All the places your family holds close, in the order that matters.
//           </p>
//         </div>

//         <span className="text-[12px] text-[#8B7355]">
//           {filteredInstitutions.length} of {institutions.length}
//         </span>
//       </div>

//       {/* Filter */}
//       <div className="flex items-center gap-3">
//         <span className="text-[10.5px] tracking-[0.28em] uppercase text-[#8B6F3A] font-semibold">
//           Filter
//         </span>
//         <button className="px-3 py-1 rounded-full text-[12px] bg-[#3D2E1F] text-[#F6F2EA] border border-[#5A4A32]">
//           {religion || "All"}
//         </button>
//       </div>

//       {/* Content */}
//       {loading ? (
//         <SkeletonGrid />
//       ) : error ? (
//         <p className="text-red-500 text-[13px]">{error}</p>
//       ) : filteredInstitutions.length === 0 ? (
//         <div className="py-14 flex flex-col items-center justify-center text-center rounded-3xl border border-dashed border-[#D7C7AA] bg-[#F8F4EC]">
//           <div className="w-14 h-14 rounded-2xl bg-[#EFE4CF] flex items-center justify-center">
//             <Landmark className="w-6 h-6 text-[#8B6F3A]" />
//           </div>
//           <h3 className="mt-4 text-[15px] font-semibold text-[#3D2E1F]">
//             No sacred places yet
//           </h3>
//           <p className="mt-1 max-w-sm text-[13px] text-[#7B6A58]">
//             Start adding temples, churches, mosques, and other meaningful places
//             to build your family's sacred map.
//           </p>
//         </div>
//       ) : (
//         <>
//           {/* Grid */}
//           <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
//             {pagedInstitutions.map((inst) => (
//               <InstitutionCard
//                 key={inst._id}
//                 institution={inst}
//                 onClick={() => onOpen(inst._id, inst)}
//                 onDelete={
//                   inst.family_main ? undefined : () => handleDelete(inst._id)
//                 }
//               />
//             ))}
//           </div>

//           {/* Pagination — only when more than one page */}
//           {totalPages > 1 && (
//             <div className="flex items-center justify-between pt-2">
//               {/* Range label */}
//               <p className="text-[12px] text-[#8B7355]">
//                 {startIdx + 1}–
//                 {Math.min(startIdx + pageSize, filteredInstitutions.length)} of{" "}
//                 {filteredInstitutions.length}
//               </p>

//               {/* Controls */}
//               <div className="flex items-center gap-1">
//                 {/* Prev */}
//                 <button
//                   onClick={() => goTo(safePage - 1)}
//                   disabled={safePage === 1}
//                   className="w-8 h-8 flex items-center justify-center rounded-full border border-[#D7C7AA] text-[#8B6F3A] disabled:opacity-30 hover:bg-[#EFE4CF] transition-colors"
//                   aria-label="Previous page"
//                 >
//                   <ChevronLeft className="w-4 h-4" />
//                 </button>

//                 {/* Page numbers */}
//                 {pageNumbers.map((p, i) =>
//                   p === "…" ? (
//                     <span
//                       key={`ellipsis-${i}`}
//                       className="w-8 h-8 flex items-center justify-center text-[12px] text-[#8B7355]"
//                     >
//                       …
//                     </span>
//                   ) : (
//                     <button
//                       key={p}
//                       onClick={() => goTo(p)}
//                       className={`w-8 h-8 flex items-center justify-center rounded-full text-[12px] font-medium transition-colors ${
//                         p === safePage
//                           ? "bg-[#3D2E1F] text-[#F6F2EA] border border-[#5A4A32]"
//                           : "border border-[#D7C7AA] text-[#8B6F3A] hover:bg-[#EFE4CF]"
//                       }`}
//                       aria-label={`Page ${p}`}
//                       aria-current={p === safePage ? "page" : undefined}
//                     >
//                       {p}
//                     </button>
//                   ),
//                 )}

//                 {/* Next */}
//                 <button
//                   onClick={() => goTo(safePage + 1)}
//                   disabled={safePage === totalPages}
//                   className="w-8 h-8 flex items-center justify-center rounded-full border border-[#D7C7AA] text-[#8B6F3A] disabled:opacity-30 hover:bg-[#EFE4CF] transition-colors"
//                   aria-label="Next page"
//                 >
//                   <ChevronRight className="w-4 h-4" />
//                 </button>
//               </div>
//             </div>
//           )}
//         </>
//       )}
//     </section>
//   );
// });
