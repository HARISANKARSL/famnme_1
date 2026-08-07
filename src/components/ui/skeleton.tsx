/**
 * Skeleton — shimmer placeholder for loading states (4.6).
 * Use instead of spinners whenever content has known shape.
 */

interface SkeletonProps {
  className?: string;
  /** Inline style overrides — useful for widths/heights that aren't in Tailwind. */
  style?: React.CSSProperties;
  /** Shape — 'rect' (default), 'circle', 'text' (smaller default height). */
  shape?: "rect" | "circle" | "text";
}

export function Skeleton({
  className = "",
  style,
  shape = "rect",
}: SkeletonProps) {
  const baseShape =
    shape === "circle"
      ? "rounded-full"
      : shape === "text"
        ? "rounded h-3"
        : "rounded-lg";
  return (
    <div
      className={`skeleton-shimmer ${baseShape} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

/** Feed post skeleton — avatar + 3 lines + image placeholder */
export function FeedPostSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 border border-[#EEE8DC]">
      <div className="flex items-center gap-3 mb-3">
        <Skeleton shape="circle" className="w-10 h-10" />
        <div className="flex-1 space-y-2">
          <Skeleton className="w-32 h-3" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      </div>
      <div className="mb-3 space-y-2">
        <Skeleton className="w-full h-3" />
        <Skeleton className="h-3 w-[85%]" />
      </div>
      <Skeleton className="w-full aspect-[4/3]" />
    </div>
  );
}

/** Tree card skeleton — wider, shorter */
export function TreeCardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-4 border border-[#EEE8DC]">
      <div className="flex items-center gap-3 mb-3">
        <Skeleton shape="circle" className="w-11 h-11" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-2.5 w-24" />
        </div>
      </div>
      <Skeleton className="w-full h-16" />
    </div>
  );
}

/** People-list row — avatar + name + dates */
export function PersonRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <Skeleton shape="circle" className="w-9 h-9 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="w-40 h-3" />
        <Skeleton className="h-2.5 w-24" />
      </div>
    </div>
  );
}

/** Memory-grid tile — square */
export function MemoryTileSkeleton() {
  return <Skeleton className="w-full aspect-square" />;
}

/** Memory grid placeholder — 12 squares */
export function MemoryGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <MemoryTileSkeleton key={i} />
      ))}
    </div>
  );
}

/** Person profile hero — large avatar + name + metadata */
export function PersonProfileHeroSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <Skeleton shape="circle" className="w-24 h-24" />
      <Skeleton className="w-48 h-5" />
      <Skeleton className="w-32 h-3" />
      <div className="flex gap-2 mt-2">
        <Skeleton className="w-20 h-8" />
        <Skeleton className="w-20 h-8" />
      </div>
    </div>
  );
}

/** Institution card skeleton — matches SacredMap grid */
export function InstitutionCardSkeleton() {
  return (
    <div
      className="
        space-y-4 rounded-[24px]
        border border-[hsl(var(--border))]
        bg-[hsl(var(--card))]
        p-4
        shadow-sm
      "
    >
      {/* Image */}
      <Skeleton
        className="
          aspect-[4/3] w-full
          rounded-[18px]
          bg-[hsl(var(--muted))]
        "
      />

      {/* Content */}
      <div className="space-y-3">
        {/* Title */}
        <Skeleton
          className="
            h-4 w-[78%]
            rounded-full
            bg-[hsl(var(--muted))]
          "
        />

        {/* Subtitle */}
        <Skeleton
          className="
            h-3 w-[52%]
            rounded-full
            bg-[hsl(var(--muted))]
          "
        />

        {/* Meta pills */}
        <div className="flex items-center gap-2 pt-1">
          <Skeleton
            className="
              h-6 w-20
              rounded-full
              bg-[hsl(var(--muted))]
            "
          />

          <Skeleton
            className="
              h-6 w-16
              rounded-full
              bg-[hsl(var(--muted))]
            "
          />
        </div>
      </div>
    </div>
  );
}

/** Grid skeleton */
export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <InstitutionCardSkeleton key={i} />
      ))}
    </div>
  );
}
