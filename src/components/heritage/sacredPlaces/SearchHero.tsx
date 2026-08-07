import {
  Search,
  MapPin,
  ChevronRight,
  Loader2,
  Plus,
  Landmark,
  Church,
  Building2,
} from "lucide-react";

import {
  memo,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ComponentType,
  useMemo,
} from "react";

import { useAddInstitutionToMyList } from "@/hooks/useInstitution";
import { searchJourneyTemples } from "@/services/institutionService";

import type { AddToMyListPayload } from "@/types";

import { useToast } from "@/components/ui/use-toast";

// ─── Constants ────────────────────────────────────────────────────────────────

const LIMIT = 10;

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchHeroProps {
  onSearch: () => void;
  onNearby?: () => void;
  onQuickSelect?: (type: QuickType) => void;
  onAddNearbyTemple?: (temple: JourneyTemple) => Promise<void> | void;
  onInstitutionAdded?: () => void;
  activeFaith?: string;
}

export interface JourneyTemple {
  templeId: string;
  thumbnail: string;
  title: string;
  religion: string;
  location: string;
}

export type QuickType =
  | "somnath_temple"
  | "kashi_vishwanath"
  | "sri_venkateswara_swami_temple"
  | "meenakshi_temple"
  | "jagannath_puri"
  | "golden_temple"
  | "gurudwara_bangla_sahib"
  | "haji_ali_dargah"
  | "ajmer_sharif"
  | "velankanni_church"
  | "st_thomas_basilica"
  | "palitana_temples"
  | "shri_mahavirji"
  | "mahabodhi_temple"
  | "tawang_monastery";

// ─── Static data ──────────────────────────────────────────────────────────────

const ALL_QUICK_OPTIONS: {
  label: string;
  value: QuickType;
  religion: string;
}[] = [
    // Hindu
    { label: "Somnath Temple", value: "somnath_temple", religion: "Hindu" },
    { label: "Kashi Vishwanath", value: "kashi_vishwanath", religion: "Hindu" },
    {
      label: "Sri Venkateswara Swami Temple",
      value: "sri_venkateswara_swami_temple",
      religion: "Hindu",
    },
    { label: "Meenakshi Temple", value: "meenakshi_temple", religion: "Hindu" },
    { label: "Jagannath Puri", value: "jagannath_puri", religion: "Hindu" },
    // Sikh
    { label: "Golden Temple", value: "golden_temple", religion: "Sikh" },
    {
      label: "Gurudwara Bangla Sahib",
      value: "gurudwara_bangla_sahib",
      religion: "Sikh",
    },
    // Islam
    { label: "Haji Ali Dargah", value: "haji_ali_dargah", religion: "Islam" },
    { label: "Ajmer Sharif Dargah", value: "ajmer_sharif", religion: "Islam" },
    // Christian
    {
      label: "Velankanni Church",
      value: "velankanni_church",
      religion: "Christian",
    },
    {
      label: "St. Thomas Basilica",
      value: "st_thomas_basilica",
      religion: "Christian",
    },
    // Jain
    { label: "Palitana Temples", value: "palitana_temples", religion: "Jain" },
    { label: "Shri Mahavirji", value: "shri_mahavirji", religion: "Jain" },
    // Buddhist
    {
      label: "Mahabodhi Temple",
      value: "mahabodhi_temple",
      religion: "Buddhist",
    },
    {
      label: "Tawang Monastery",
      value: "tawang_monastery",
      religion: "Buddhist",
    },
  ];

const RELIGION_ICON: Record<
  string,
  ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  Hindu: Landmark,
  Christian: Church,
  Islam: Building2,
};

// ─── Component ────────────────────────────────────────────────────────────────

export const SearchHero = memo(function SearchHero({
  onSearch,
  onNearby,
  onQuickSelect,
  onAddNearbyTemple,
  onInstitutionAdded,
  activeFaith,
}: SearchHeroProps) {
  const { toast } = useToast();

  // ── Geolocation state
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [locLoading, setLocLoading] = useState(false);

  // ── Panel visibility
  const [showNearby, setShowNearby] = useState(false);

  // ── Paginated temple list
  const [temples, setTemples] = useState<JourneyTemple[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [fetchingMore, setFetchingMore] = useState(false);

  // ── Add-to-list state
  const [adding, setAdding] = useState<string | null>(null);

  // ── Refs
  const watchIdRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isFetchingRef = useRef(false); // guard against concurrent fetches

  const { mutate: addToMyList, loading: isAddingToList } =
    useAddInstitutionToMyList();

  // ── Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // ── Core fetch function — appends or replaces based on pageNum
  const fetchPage = useCallback(
    async (lat: number, lng: number, pageNum: number) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      if (pageNum === 1) {
        setInitialLoading(true);
      } else {
        setFetchingMore(true);
      }

      try {
        const results = await searchJourneyTemples({
          query: "any",
          lat,
          lng,
          page: pageNum,
          limit: LIMIT,
        });
        console.log("result,", results)

        if (!mountedRef.current) return;

        const list = (results as JourneyTemple[]) ?? [];

        setTemples((prev) => (pageNum === 1 ? list : [...prev, ...list]));
        setHasMore(list.length === LIMIT);
        setPage(pageNum);
      } catch {
        // Geo errors are surfaced via locError; fetch errors fail silently
        // to avoid double-error UI since the panel header already shows locError
      } finally {
        if (mountedRef.current) {
          setInitialLoading(false);
          setFetchingMore(false);
        }
        isFetchingRef.current = false;
      }
    },
    [],
  );

  // ── Scroll handler — fires when user nears the bottom of the panel
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el || !coords || !hasMore || fetchingMore || initialLoading) return;

    // Trigger when within 60px of the bottom
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) {
      fetchPage(coords.lat, coords.lng, page + 1);
    }
  }, [coords, hasMore, fetchingMore, initialLoading, page, fetchPage]);

  // ── Attach / detach scroll listener whenever panel is shown
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || !showNearby) return;

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll, showNearby]);

  // ── "Near me" button handler
  const handleNearMe = useCallback(() => {
    if (locLoading) return;

    setShowNearby(true);
    setLocError(null);
    setTemples([]);
    setPage(1);
    setHasMore(false);
    setLocLoading(true);

    if (!navigator.geolocation) {
      setLocLoading(false);
      setLocError("Location is not available on this device.");
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    let resolved = false;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (resolved || !mountedRef.current) return;
        resolved = true;

        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }

        const { latitude: lat, longitude: lng } = pos.coords;
        setLocError(null);
        setCoords({ lat, lng });
        setLocLoading(false);
        onNearby?.();

        // Kick off page 1
        fetchPage(lat, lng, 1);
      },
      (error) => {
        if (!mountedRef.current) return;

        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }

        setLocLoading(false);

        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocError("Location permission denied.");
            break;
          case error.TIMEOUT:
            setLocError("Location request timed out. Please try again.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocError("Unable to determine your location.");
            break;
          default:
            setLocError("Unable to access your location.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, [locLoading, onNearby, fetchPage]);

  // ── Hide panel and reset all nearby state
  const handleHide = useCallback(() => {
    setShowNearby(false);
    setCoords(null);
    setTemples([]);
    setPage(1);
    setHasMore(false);
    setLocError(null);
    setLocLoading(false);
    setInitialLoading(false);
    setFetchingMore(false);
    isFetchingRef.current = false;

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // ── Add a temple to the user's list
  const handleAdd = useCallback(
    async (temple: JourneyTemple) => {
      setAdding(temple.templeId);
      try {
        await addToMyList({ institutionId: temple.templeId });
        onInstitutionAdded?.();
        await onAddNearbyTemple?.(temple);
        toast({
          title: "Place added",
          description: `${temple.title} has been added to your sacred map.`,
        });
      } catch (err: any) {
        const message =
          err?.response?.data?.message ??
          err?.message ??
          "Could not add this place";
        toast({
          title: "Failed to add place",
          description: message,
          variant: "destructive",
        });
      } finally {
        setAdding(null);
      }
    },
    [addToMyList, onAddNearbyTemple, onInstitutionAdded, toast],
  );

  // ── Derived booleans
  const isLoadingInitial = showNearby && (locLoading || initialLoading);
  const hasCoords = coords !== null;

  // ── Quick-select chips filtered by active faith
  const visibleOptions = useMemo(() => {
    const matching = ALL_QUICK_OPTIONS.filter((o) => o.religion === activeFaith);
    const others = ALL_QUICK_OPTIONS.filter((o) => o.religion !== activeFaith);
    return [
      ...matching.slice(0, 2),
      ...others.slice(0, 5 - Math.min(matching.length, 2)),
    ];
  }, [activeFaith]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <section className="w-full max-w-5xl">
      {/* ── Heading ──────────────────────────────────────────────────── */}
      <h2 className="font-serif-display text-[28px] md:text-[34px] leading-tight font-semibold text-[var(--color-text-primary)]">
        Start with what you remember
      </h2>

      <p className="mt-1.5 text-[13px] text-[var(--color-text-secondary)] italic">
        The first place that comes to mind is usually the one that matters.
      </p>

      {/* ── Quick Chips ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <span className="text-[12px] tracking-[0.20em] uppercase font-semibold text-[var(--color-text-secondary)] mr-1">
          START WITH
        </span>

        {visibleOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onQuickSelect?.(opt.value)}
            className="
              px-3.5 py-1.5 rounded-full text-[12px] font-medium
              border border-[var(--heritage-sand)]
              text-[var(--color-text-primary)]
              bg-transparent
              hover:bg-[var(--color-surface-sunken)]
              hover:border-[var(--color-text-tertiary)]
              transition-colors
            "
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── Search Bar ───────────────────────────────────────────────── */}
      <div
        className="
          mt-5 flex items-center rounded-full
          border border-[var(--heritage-sand)]
          bg-[var(--color-surface-raised)]
          px-4 py-2.5 shadow-sm
        "
      >
        {/* Search trigger */}
        <button
          onClick={onSearch}
          className="flex items-center flex-1 gap-3 text-left group"
        >
          <Search className="w-4 h-4 text-[var(--color-text-secondary)]" />

          <span
            className="
              text-[13.5px]
              text-[var(--color-text-secondary)]
              group-hover:text-[var(--color-text-primary)]
              transition-colors
            "
          >
            Looking for another place to add?
          </span>

          <ChevronRight
            className="
              w-4 h-4 ml-auto
              text-[var(--color-text-tertiary)]
              group-hover:text-[var(--color-text-primary)]
              group-hover:translate-x-0.5
              transition-all
            "
          />
        </button>

        {/* Divider */}
        <div className="mx-3 h-5 w-px bg-[var(--heritage-sand)]" />

        {/* Near Me */}
        <button
          onClick={handleNearMe}
          disabled={locLoading}
          className="
            flex items-center gap-1.5 text-[12px] font-medium
            text-[var(--color-text-secondary)]
            hover:text-[var(--color-brand-primary)]
            transition-colors disabled:opacity-60
          "
        >
          {locLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--color-brand-primary)]" />
          ) : (
            <MapPin className="w-3.5 h-3.5 text-[var(--color-brand-primary)]" />
          )}
          Near me
        </button>
      </div>

      {/* ── Nearby Panel ─────────────────────────────────────────────── */}
      {showNearby && (
        <div
          className="
            mt-3 overflow-hidden rounded-2xl
            border border-[var(--heritage-separator)]
            bg-[var(--color-surface-raised)]/80 backdrop-blur-sm
          "
        >
          {/* Panel header */}
          <div
            className="
              flex items-center justify-between
              px-4 py-2.5
              border-b border-[var(--heritage-separator)]
            "
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[var(--color-brand-primary)]" />
              <p
                className="
                  text-[11.5px] uppercase tracking-[0.2em]
                  font-semibold text-[var(--color-text-secondary)]
                "
              >
                Nearby sacred places
              </p>
            </div>

            <button
              onClick={handleHide}
              className="text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              Hide
            </button>
          </div>

          {/* Panel body — scrollable, infinite */}
          <div
            ref={scrollContainerRef}
            className="max-h-[280px] overflow-y-auto overscroll-contain custom-scrollbar"
          >
            {/* Initial loading state (geo + first page fetch) */}
            {isLoadingInitial && (
              <div className="flex items-center gap-2 px-4 py-4 text-[12px] text-[var(--color-text-secondary)]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Finding places near you…
              </div>
            )}

            {/* Geo error */}
            {locError && (
              <p className="px-4 py-4 text-[12px] text-[var(--color-state-error)]">
                {locError}
              </p>
            )}

            {/* Empty state — only after coords resolved and fetch completed */}
            {!isLoadingInitial &&
              !locError &&
              hasCoords &&
              temples.length === 0 && (
                <p className="px-4 py-4 text-[12px] text-[var(--color-text-secondary)]">
                  No sacred places found nearby.
                </p>
              )}

            {/* Temple list */}
            {temples.length > 0 && (
              <ul className="divide-y divide-[var(--heritage-separator)]">
                {temples.map((temple) => {
                  const Icon = RELIGION_ICON[temple.religion ?? ""] ?? Landmark;
                  const isAdding =
                    adding === temple.templeId || isAddingToList;

                  return (
                    <li
                      key={temple.templeId}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      {/* Thumbnail / icon */}
                      <div className="shrink-0 w-10 h-10 rounded-xl overflow-hidden bg-[var(--color-surface-sunken)]">
                        {temple.thumbnail ? (
                          <img
                            src={temple.thumbnail}
                            alt={temple.title}
                            className="object-cover w-full h-full"
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="strict-origin-when-cross-origin"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full">
                            <Icon
                              className="w-5 h-5 text-[var(--color-brand-primary)]"
                              strokeWidth={1.8}
                            />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate leading-tight">
                          {temple.title}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-1 mt-0.5">
                          {[temple.religion, temple.location]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>

                      {/* Add button */}
                      <button
                        onClick={() => handleAdd(temple)}
                        disabled={isAdding}
                        className="
                          shrink-0 inline-flex items-center gap-1
                          px-3 py-1.5 rounded-full
                          bg-[var(--color-brand-primary)]
                          hover:opacity-90
                          disabled:opacity-60
                          text-[var(--color-text-inverse)]
                          text-[11.5px] font-medium
                          transition-opacity
                        "
                      >
                        {isAdding ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <Plus className="w-3 h-3" />
                            Add
                          </>
                        )}
                      </button>
                    </li>
                  );
                })}

                {/* Infinite scroll — fetching next page */}
                {fetchingMore && (
                  <li className="flex items-center justify-center gap-2 px-4 py-3 text-[12px] text-[var(--color-text-secondary)]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Loading more…
                  </li>
                )}

                {/* End of results */}
                {!fetchingMore && !hasMore && temples.length > 0 && (
                  <li className="text-center text-[11px] text-[var(--color-text-secondary)] py-3 italic">
                    All nearby places loaded
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
});

// import {
//   Search,
//   MapPin,
//   ChevronRight,
//   Loader2,
//   Plus,
//   Landmark,
//   Church,
//   Building2,
// } from "lucide-react";

// import {
//   memo,
//   useState,
//   useCallback,
//   useRef,
//   useEffect,
//   type ComponentType,
// } from "react";

// import {
//   useSearchJourneyTemples,
//   useAddInstitutionToMyList,
// } from "@/hooks/useInstitution";

// import type {
//   JourneySearchPayload,
//   InstitutionTag,
//   AddToMyListPayload,
// } from "@/types";

// import { useToast } from "@/components/ui/use-toast";

// interface SearchHeroProps {
//   onSearch: () => void;
//   onNearby?: () => void;
//   onQuickSelect?: (type: QuickType) => void;

//   /**
//    * Optional callback for parent-level actions
//    * like createTempleLink()
//    */
//   onAddNearbyTemple?: (temple: JourneyTemple) => Promise<void> | void;

//   onInstitutionAdded?: () => void;
// }

// export interface JourneyTemple {
//   templeId: string;
//   thumbnail: string;
//   title: string;
//   religion: string;
//   location: string;
// }

// export type QuickType =
//   | "somnath_temple"
//   | "kashi_vishwanath"
//   | "tirupati_balaji"
//   | "meenakshi_temple"
//   | "jagannath_puri";

// const QUICK_OPTIONS: {
//   label: string;
//   value: QuickType;
// }[] = [
//   {
//     label: "Somnath Temple",
//     value: "somnath_temple",
//   },
//   {
//     label: "Kashi Vishwanath",
//     value: "kashi_vishwanath",
//   },
//   {
//     label: "Tirupati Balaji",
//     value: "tirupati_balaji",
//   },
//   {
//     label: "Meenakshi Temple",
//     value: "meenakshi_temple",
//   },
//   {
//     label: "Jagannath Puri",
//     value: "jagannath_puri",
//   },
// ];

// const RELIGION_ICON: Record<
//   string,
//   ComponentType<{
//     className?: string;
//     strokeWidth?: number;
//   }>
// > = {
//   Hindu: Landmark,
//   Christian: Church,
//   Islam: Building2,
// };

// export const SearchHero = memo(function SearchHero({
//   onSearch,
//   onNearby,
//   onQuickSelect,
//   onAddNearbyTemple,
//   onInstitutionAdded,
// }: SearchHeroProps) {
//   const { toast } = useToast();

//   // ─────────────────────────────────────────────
//   // Nearby state
//   // ─────────────────────────────────────────────
//   const [nearbyPayload, setNearbyPayload] = useState<
//     JourneySearchPayload | undefined
//   >(undefined);

//   const [locError, setLocError] = useState<string | null>(null);

//   const [locLoading, setLocLoading] = useState(false);

//   const [showNearby, setShowNearby] = useState(false);

//   const [adding, setAdding] = useState<string | null>(null);

//   const watchIdRef = useRef<number | null>(null);

//   const mountedRef = useRef(true);

//   // ─────────────────────────────────────────────
//   // Cleanup
//   // ─────────────────────────────────────────────
//   useEffect(() => {
//     return () => {
//       mountedRef.current = false;

//       if (watchIdRef.current !== null) {
//         navigator.geolocation.clearWatch(watchIdRef.current);
//       }
//     };
//   }, []);

//   // ─────────────────────────────────────────────
//   // Search Hook
//   // ─────────────────────────────────────────────
//   const { data: nearbyTemples, loading: nearbyLoading } =
//     useSearchJourneyTemples(nearbyPayload);

//   // ─────────────────────────────────────────────
//   // Add Institution Hook
//   // ─────────────────────────────────────────────
//   const { mutate: addToMyList, loading: isAddingToList } =
//     useAddInstitutionToMyList();

//   // ─────────────────────────────────────────────
//   // Near Me
//   // ─────────────────────────────────────────────
//   const handleNearMe = useCallback(() => {
//     /**
//      * Prevent duplicate clicks
//      */
//     if (locLoading) {
//       return;
//     }

//     setShowNearby(true);

//     /**
//      * Reset stale state
//      */
//     setLocError(null);

//     setNearbyPayload(undefined);

//     setLocLoading(true);

//     if (!navigator.geolocation) {
//       setLocLoading(false);

//       setLocError("Location is not available on this device.");

//       return;
//     }

//     /**
//      * Cleanup previous watcher
//      */
//     if (watchIdRef.current !== null) {
//       navigator.geolocation.clearWatch(watchIdRef.current);
//     }

//     let resolved = false;

//     watchIdRef.current = navigator.geolocation.watchPosition(
//       (pos) => {
//         /**
//          * Ignore duplicate callbacks
//          */
//         if (resolved || !mountedRef.current) {
//           return;
//         }

//         resolved = true;

//         /**
//          * Stop watcher immediately
//          */
//         if (watchIdRef.current !== null) {
//           navigator.geolocation.clearWatch(watchIdRef.current);

//           watchIdRef.current = null;
//         }

//         setLocError(null);

//         setNearbyPayload({
//           query: "temple",
//           lat: pos.coords.latitude,
//           lng: pos.coords.longitude,
//         });

//         setLocLoading(false);

//         onNearby?.();
//       },

//       (error) => {
//         if (!mountedRef.current) {
//           return;
//         }

//         /**
//          * Stop watcher
//          */
//         if (watchIdRef.current !== null) {
//           navigator.geolocation.clearWatch(watchIdRef.current);

//           watchIdRef.current = null;
//         }

//         setLocLoading(false);

//         switch (error.code) {
//           case error.PERMISSION_DENIED:
//             setLocError("Location permission denied.");
//             break;

//           case error.TIMEOUT:
//             setLocError("Location request timed out. Please try again.");
//             break;

//           case error.POSITION_UNAVAILABLE:
//             setLocError("Unable to determine your location.");
//             break;

//           default:
//             setLocError("Unable to access your location.");
//         }
//       },

//       {
//         enableHighAccuracy: true,
//         timeout: 15000,
//         maximumAge: 0,
//       },
//     );
//   }, [locLoading, onNearby]);

//   // ─────────────────────────────────────────────
//   // Add Temple
//   // ─────────────────────────────────────────────
//   const handleAdd = useCallback(
//     async (temple: JourneyTemple) => {
//       setAdding(temple.templeId);

//       try {
//         await addToMyList({ institutionId: temple.templeId });
//         onInstitutionAdded?.();
//         await onAddNearbyTemple?.(temple);
//         toast({
//           title: "Place added",
//           description: `${temple.title} has been added to your sacred map.`,
//         });
//       } catch (err: any) {
//         const message =
//           err?.response?.data?.message ??
//           err?.message ??
//           "Could not add this place";
//         toast({
//           title: "Failed to add place",
//           description: message,
//           variant: "destructive",
//         });
//       } finally {
//         setAdding(null);
//       }
//     },
//     [addToMyList, onAddNearbyTemple, onInstitutionAdded, toast],
//   );

//   // ─────────────────────────────────────────────
//   // Derived
//   // ─────────────────────────────────────────────
//   const temples: JourneyTemple[] = (nearbyTemples as JourneyTemple[]) ?? [];

//   const isLoadingNearby = showNearby && (locLoading || nearbyLoading);

//   // ─────────────────────────────────────────────
//   // Render
//   // ─────────────────────────────────────────────
//   return (
//     <section className="w-full max-w-5xl">
//       {/* Heading */}
//       <h2 className="font-serif-display text-[28px] md:text-[34px] leading-tight font-semibold text-[#584A3D]">
//         Start with what you remember
//       </h2>

//       <p className="mt-1.5 text-[13px] text-[#584A3D] italic">
//         The first place that comes to mind is usually the one that matters.
//       </p>

//       {/* Quick Chips */}
//       <div className="flex flex-wrap items-center gap-2 mt-4">
//         <span className="text-[12px] tracking-[0.20em] uppercase font-semibold text-[#8B6F3A] mr-1">
//           START WITH
//         </span>

//         {QUICK_OPTIONS.map((opt) => (
//           <button
//             key={opt.value}
//             onClick={() => onQuickSelect?.(opt.value)}
//             className="px-3.5 py-1.5 rounded-full text-[12px] font-medium border border-[#3A342C] text-[#3D2E1F] bg-transparent hover:bg-[#eee3d5] hover:border-[#5A4A32] transition-colors"
//           >
//             {opt.label}
//           </button>
//         ))}
//       </div>

//       {/* Search Bar */}
//       <div className="mt-5 flex items-center rounded-full border border-[#3A342C] bg-[#FBFAF7] px-4 py-2.5 shadow-sm">
//         {/* Search */}
//         <button
//           onClick={onSearch}
//           className="flex items-center flex-1 gap-3 text-left group"
//         >
//           <Search className="w-4 h-4 text-[#8B7355]" />

//           <span className="text-[13.5px] text-[#8B7355] group-hover:text-[#584A3D] transition-colors">
//             Looking for another place to add?
//           </span>

//           <ChevronRight className="w-4 h-4 text-[#8B7355]/60 ml-auto group-hover:text-[#584A3D] group-hover:translate-x-0.5 transition-all" />
//         </button>

//         {/* Divider */}
//         <div className="mx-3 h-5 w-px bg-[#3A342C]" />

//         {/* Near Me */}
//         <button
//           onClick={handleNearMe}
//           disabled={locLoading}
//           className="flex items-center gap-1.5 text-[12px] font-medium text-[#584A3D] hover:text-[#2F3E8F] transition-colors disabled:opacity-60"
//         >
//           {locLoading ? (
//             <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2F3E8F]" />
//           ) : (
//             <MapPin className="w-3.5 h-3.5 text-[#2F3E8F]" />
//           )}
//           Near me
//         </button>
//       </div>

//       {/* Nearby Panel */}
//       {showNearby && (
//         <div className="mt-3 rounded-2xl border border-[#E2DBCE]/70 bg-white/70 backdrop-blur-sm overflow-hidden">
//           {/* Header */}
//           <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#E2DBCE]/60">
//             <div className="flex items-center gap-2">
//               <MapPin className="w-3.5 h-3.5 text-[#2F3E8F]" />

//               <p className="text-[11.5px] uppercase tracking-[0.2em] font-semibold text-[#8B6F3A]">
//                 Nearby sacred places
//               </p>
//             </div>

//             <button
//               onClick={() => {
//                 setShowNearby(false);

//                 setNearbyPayload(undefined);

//                 setLocError(null);

//                 setLocLoading(false);

//                 if (watchIdRef.current !== null) {
//                   navigator.geolocation.clearWatch(watchIdRef.current);

//                   watchIdRef.current = null;
//                 }
//               }}
//               className="text-[11px] text-[#8B7355] hover:text-[#3D2E1F]"
//             >
//               Hide
//             </button>
//           </div>

//           {/* Body */}
//           <div className="max-h-[280px] overflow-y-auto overscroll-contain">
//             {/* Loading */}
//             {isLoadingNearby && (
//               <div className="flex items-center gap-2 px-4 py-4 text-[12px] text-[#8B7355]">
//                 <Loader2 className="w-3.5 h-3.5 animate-spin" />
//                 Finding places near you…
//               </div>
//             )}

//             {/* Error */}
//             {locError && (
//               <p className="px-4 py-4 text-[12px] text-red-600">{locError}</p>
//             )}

//             {/* Empty */}
//             {!isLoadingNearby &&
//               !locError &&
//               temples.length === 0 &&
//               nearbyPayload && (
//                 <p className="px-4 py-4 text-[12px] text-[#8B7355]">
//                   No sacred places found nearby.
//                 </p>
//               )}

//             {/* Results */}
//             {temples.length > 0 && (
//               <ul className="divide-y divide-[#E2DBCE]/50">
//                 {temples.map((temple) => {
//                   const Icon = RELIGION_ICON[temple.religion ?? ""] ?? Landmark;

//                   const isAdding = adding === temple.templeId || isAddingToList;

//                   return (
//                     <li
//                       key={temple.templeId}
//                       className="flex items-center gap-3 px-4 py-3"
//                     >
//                       {/* Icon */}
//                       <div className="shrink-0 w-10 h-10 rounded-xl overflow-hidden bg-[#E2DBCE]/40">
//                         {temple.thumbnail ? (
//                           <img
//                             src={temple.thumbnail}
//                             alt={temple.title}
//                             className="object-cover w-full h-full"
//                             loading="lazy"
//                             decoding="async"
//                             referrerPolicy="strict-origin-when-cross-origin"
//                             onError={(e) => {
//                               e.currentTarget.style.display = "none";
//                             }}
//                           />
//                         ) : (
//                           <div className="flex items-center justify-center w-full h-full">
//                             <Icon
//                               className="w-5 h-5 text-[#2F3E8F]"
//                               strokeWidth={1.8}
//                             />
//                           </div>
//                         )}
//                       </div>

//                       {/* Info */}
//                       <div className="flex-1 min-w-0">
//                         <p className="text-[13px] font-semibold text-[#3D2E1F] truncate leading-tight">
//                           {temple.title}
//                         </p>

//                         <p className="text-[11px] text-[#8B7355] line-clamp-1 mt-0.5">
//                           {[temple.religion, temple.location]
//                             .filter(Boolean)
//                             .join(" · ")}
//                         </p>
//                       </div>

//                       {/* Add */}
//                       <button
//                         onClick={() => handleAdd(temple)}
//                         disabled={isAdding}
//                         className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#3D2E1F] hover:bg-[#2A1F15] disabled:opacity-60 text-white text-[11.5px] font-medium transition-colors"
//                       >
//                         {isAdding ? (
//                           <Loader2 className="w-3 h-3 animate-spin" />
//                         ) : (
//                           <>
//                             <Plus className="w-3 h-3" />
//                             Add
//                           </>
//                         )}
//                       </button>
//                     </li>
//                   );
//                 })}
//               </ul>
//             )}
//           </div>
//         </div>
//       )}
//     </section>
//   );
// });
