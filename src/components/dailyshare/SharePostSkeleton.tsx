/**
 * SharePostSkeleton — Pulse-animated placeholder for feed posts during loading.
 * Matches the SharePostCard layout: avatar, name, text lines, image area.
 */

export function SharePostSkeleton() {
  return (
    <div className="px-4 py-4 animate-pulse">
      {/* Header: avatar + name + time */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-stone-200 dark:bg-[#2a2a2a] shrink-0" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3.5 w-28 bg-stone-200 dark:bg-[#2a2a2a] rounded" />
          <div className="h-2.5 w-16 bg-stone-100 dark:bg-[#222] rounded" />
        </div>
      </div>
      {/* Text content */}
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full bg-stone-200 dark:bg-[#2a2a2a] rounded" />
        <div className="h-3 w-4/5 bg-stone-100 dark:bg-[#222] rounded" />
        <div className="h-3 w-2/3 bg-stone-100 dark:bg-[#222] rounded" />
      </div>
      {/* Image placeholder */}
      <div className="mt-3 h-44 w-full bg-stone-100 dark:bg-[#222] rounded-xl" />
      {/* Action bar */}
      <div className="flex items-center gap-8 mt-3">
        <div className="h-4 w-10 bg-stone-100 dark:bg-[#222] rounded" />
        <div className="h-4 w-10 bg-stone-100 dark:bg-[#222] rounded" />
        <div className="h-4 w-10 bg-stone-100 dark:bg-[#222] rounded" />
      </div>
    </div>
  )
}
