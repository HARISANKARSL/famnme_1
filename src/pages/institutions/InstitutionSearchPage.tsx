import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Search,
  X,
  Landmark,
  Church,
  Building2,
  Loader2,
  MapPin,
} from "lucide-react";
import type { ComponentType } from "react";
import { useSearchJourneyTemples } from "@/hooks/useInstitution";
import type { JourneySearchPayload } from "@/types";
import { useAddInstitutionToMyList } from "@/hooks/useInstitution";
import { useToast } from "@/components/ui/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

interface InstitutionSearchPageProps {
  treeId: string;
  personId: string;
  faithLabel?: string | null;
  initialQuery?: string;
  onBack: () => void;
  onAdded: (templeId: string) => void;
  onViewDetail: (temple: JourneyTemple) => void;
}

interface JourneyTemple {
  templeId: string;
  title: string;
  religion: string;
  location: string;
  thumbnail: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const RELIGION_ICON: Record<
  string,
  ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  Hindu: Landmark,
  Christian: Church,
  Islam: Building2,
};

// ── Component ─────────────────────────────────────────────────────────────────

export function InstitutionSearchPage({
  faithLabel,
  initialQuery = "",
  onBack,
  onAdded,
  onViewDetail,
}: InstitutionSearchPageProps) {
  const { toast } = useToast();

  const [query, setQuery] = useState(initialQuery);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const [locPermissionStatus, setLocPermissionStatus] = useState<string | null>(null);

  const requestLocation = useCallback((showToast = true) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      if (showToast) {
        toast({
          title: "Geolocation Unsupported",
          description: "Your browser does not support location services.",
          variant: "destructive",
        });
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        console.log(`📍 Current browser geolocation retrieved: lat=${lat}, lng=${lng}`);
        setCoordinates({ lat, lng });
        setLocPermissionStatus("granted");
        if (showToast) {
          toast({
            title: "Location retrieved",
            description: `Location successfully shared (lat: ${lat.toFixed(4)}, lng: ${lng.toFixed(4)})`,
          });
        }
      },
      (error) => {
        console.warn(`⚠️ Geolocation error (Code ${error.code}): ${error.message}`, error);
        setLocPermissionStatus("denied");
        if (showToast) {
          toast({
            title: "Location access denied",
            description: `Location request failed: ${error.message} (Code ${error.code}). Please click the lock/settings icon in the browser address bar to allow location access.`,
            variant: "destructive",
          });
        }
      }
    );
  }, [toast]);

  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          console.log(`📍 Silent mount geolocation success: lat=${lat}, lng=${lng}`);
          setCoordinates({ lat, lng });
          setLocPermissionStatus("granted");
        },
        (error) => {
          console.log("ℹ️ Silent mount geolocation skipped/failed:", error.message);
          if (error.code === 1) {
            setLocPermissionStatus("denied");
          }
        },
        { timeout: 5000 }
      );
    }
  }, []);

  const [searchPayload, setSearchPayload] = useState<
    JourneySearchPayload | undefined
  >(
    initialQuery.trim().length >= 2
      ? { query: initialQuery.trim() }
      : undefined,
  );
  const [adding, setAdding] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Hook ──────────────────────────────────────────────────────────────────
  const { data: rawResults, loading: isLoading } =
    useSearchJourneyTemples(searchPayload);
  const results: JourneyTemple[] = (rawResults ?? []) as JourneyTemple[];
  console.log("tmepele", rawResults)
  const {
    mutate: addToMyList,
    loading: isAddingToList,
    error: addError,
  } = useAddInstitutionToMyList();

  // ── Focus on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ── Debounced search — sets payload which triggers the hook ───────────────
  useEffect(() => {
    const q = query.trim();

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.length < 2) {
      setSearchPayload(undefined);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const payload: JourneySearchPayload = {
        query: q,
        limit: 10,
        skip: 0,
      };
      if (coordinates.lat !== 0 && coordinates.lng !== 0) {
        payload.lat = coordinates.lat;
        payload.lng = coordinates.lng;
      }
      setSearchPayload(payload);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, coordinates]);

  // ── Add to tree ───────────────────────────────────────────────────────────
  const handleAdd = useCallback(
    async (temple: JourneyTemple) => {
      setAdding(temple.templeId);
      setErrorMsg(null);

      try {
        await addToMyList({ institutionId: temple.templeId });
        toast({
          title: "Place added",
          description: `${temple.title} has been added to your list.`,
        });
        onAdded(temple.templeId);
      } catch (err: any) {
        const message =
          err?.response?.data?.message ??
          err?.message ??
          "Could not add this place";
        setErrorMsg(message);
        toast({
          title: "Failed to add place",
          description: message,
          variant: "destructive",
        });
        setAdding(null);
      }
    },
    [onAdded, addToMyList, toast],
  );

  // ── Derived ───────────────────────────────────────────────────────────────
  const hasSomething = query.trim().length >= 2;
  const isEmpty = hasSomething && results.length === 0 && !isLoading;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[var(--color-surface-canvas)]">
      {/* ── Header ── */}
      <div className="shrink-0 h-14 md:h-16 flex items-center gap-2 px-3 md:px-4 bg-[var(--color-surface-raised)] border-b border-[var(--heritage-separator)]">
        <button
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-[var(--color-brand-primary)]/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--color-text-primary)]" />
        </button>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              faithLabel === "Christian"
                ? "Search churches…"
                : faithLabel === "Islam" || faithLabel === "Muslim"
                  ? "Search mosques…"
                  : "Search temples, churches, mosques…"
            }
            className="
              w-full h-11 pl-9 pr-20 rounded-xl
              border border-[var(--heritage-sand)]
              bg-[var(--color-surface-canvas)]
              text-base md:text-[13px]
              text-[var(--color-text-primary)]
              placeholder:text-[var(--color-text-tertiary)]
              focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30
              transition-shadow
            "
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setSearchPayload(undefined);
                  inputRef.current?.focus();
                }}
                className="p-1 rounded-full hover:bg-[var(--color-surface-sunken)] min-w-[32px] min-h-[32px] flex items-center justify-center transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4 text-[var(--color-text-secondary)]" />
              </button>
            )}
            <button
              type="button"
              onClick={() => requestLocation(true)}
              className={`p-1.5 rounded-full min-w-[32px] min-h-[32px] flex items-center justify-center transition-all ${
                coordinates.lat !== 0 && coordinates.lng !== 0
                  ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100/50"
                  : locPermissionStatus === "denied"
                    ? "text-red-500 bg-red-50 dark:bg-red-950/10 hover:bg-red-100/50"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)]"
              }`}
              title={
                coordinates.lat !== 0 && coordinates.lng !== 0
                  ? `Location enabled (${coordinates.lat.toFixed(2)}, ${coordinates.lng.toFixed(2)})`
                  : "Click to share current location"
              }
            >
              <MapPin className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="w-full px-3 py-4 mx-auto max-w-7xl md:px-4">
          {/* Error banner */}
          {(errorMsg || addError) && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-[var(--color-state-error)]/10 text-[var(--color-state-error)] text-[12px]">
              {errorMsg || addError}
            </div>
          )}

          {/* No query yet */}
          {!hasSomething && (
            <div className="pt-10 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--color-brand-primary)]/10 mb-4">
                <Search
                  className="w-6 h-6 text-[var(--color-brand-primary)]"
                  strokeWidth={1.8}
                />
              </div>
              <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)] mb-1">
                Start typing to search
              </h2>
              <p className="text-[13px] text-[var(--color-text-secondary)] max-w-sm mx-auto">
                Find your temple, church, or mosque by name or location.
              </p>
            </div>
          )}

          {/* Loading */}
          {isLoading && hasSomething && results.length === 0 && (
            <div className="flex items-center justify-center pt-10 gap-2 text-[13px] text-[var(--color-text-secondary)]">
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching…
            </div>
          )}

          {/* Empty results */}
          {isEmpty && (
            <div className="pt-10 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--color-brand-accent)]/15 mb-4">
                <Search
                  className="w-6 h-6 text-[var(--color-brand-accent)]"
                  strokeWidth={1.8}
                />
              </div>
              <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)] mb-1">
                No matches for &ldquo;{query}&rdquo;
              </h2>
              {/* <p className="text-[13px] text-[var(--color-text-secondary)]">
                Try a different spelling, or search by the town or state.
              </p> */}
              <p>No Results Found</p>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <ul className="space-y-2.5" role="list">
              {results.map((temple) => {
                const Icon = RELIGION_ICON[temple.religion ?? ""] ?? Landmark;
                const isAdding = adding === temple.templeId || isAddingToList;

                return (
                  <li
                    key={temple.templeId}
                    className="rounded-2xl bg-[var(--color-surface-raised)] ring-1 ring-[var(--heritage-separator)] p-3 md:p-4"
                  >
                    <div className="flex items-start gap-3">
                      {/* ── Clickable area (icon + info) → opens detail ── */}
                      <button
                        className="flex items-start flex-1 min-w-0 gap-3 text-left"
                        onClick={() => onViewDetail(temple)}
                      >
                        {/* Icon / thumbnail */}
                        <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-[var(--color-brand-accent)]/20 to-[var(--color-brand-primary)]/10 flex items-center justify-center">
                          {temple.thumbnail ? (
                            <img
                              src={temple.thumbnail}
                              alt={temple.title}
                              className="object-cover w-full h-full"
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="strict-origin-when-cross-origin"
                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                          ) : (
                            <Icon
                              className="w-5 h-5 text-[var(--color-brand-primary)]"
                              strokeWidth={1.8}
                            />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)] leading-snug">
                            {temple.title}
                          </h3>
                          <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5 line-clamp-1">
                            {[temple.religion, temple.location].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </button>

                      {/* Add button — stops propagation so it doesn't also trigger detail */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAdd(temple); }}
                        disabled={isAdding}
                        className="
        shrink-0 inline-flex items-center gap-1.5
        px-3 py-2 rounded-xl
        bg-[var(--color-brand-primary)]
        hover:opacity-90
        disabled:opacity-60
        text-[var(--color-text-inverse)]
        text-[12px] font-semibold
        min-h-[40px] transition-opacity
      "
                      >
                        {isAdding ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          "+ Add"
                        )}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// --------------------------

// /**
//  * InstitutionSearchPage — full-screen search overlay.
//  *
//  * Lets the user search across:
//  *   1. the local SacredPlace DB (instant, synchronous), and
//  *   2. Google Maps (debounced backend call).
//  *
//  * One-tap "Add" on any result optimistically creates a TempleLink and opens
//  * the Institution Detail view.
//  */

// import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
// import { ArrowLeft, Search, X, MapPin, Landmark, Church, Building2, Loader2 } from 'lucide-react'
// import type { ComponentType } from 'react'
// import { searchTemples } from '@/data/temples'
// import { searchGoogleMapsPlaces, enrichPlace } from '@/services/googleMapsApiService'
// import { createTempleLink } from '@/services/templeLinkApiService'
// import type { PlaceSuggestion } from '@/types'
// import type { SacredPlace } from '@/data/temples/types'

// interface InstitutionSearchPageProps {
//   treeId: string
//   personId: string
//   faithLabel?: string | null
//   initialQuery?: string
//   onBack: () => void
//   onAdded: (templeId: string) => void   // called after successful link
// }

// type Row =
//   | { kind: 'local'; temple: SacredPlace }
//   | { kind: 'maps'; place: PlaceSuggestion }

// const FAITH_TO_TYPE: Record<string, 'temple' | 'church' | 'mosque'> = {
//   Hindu: 'temple',
//   Christian: 'church',
//   Islam: 'mosque',
//   Muslim: 'mosque',
// }

// const RELIGION_ICON: Record<string, ComponentType<{ className?: string; strokeWidth?: number }>> = {
//   Hindu: Landmark,
//   Christian: Church,
//   Islam: Building2,
// }

// export function InstitutionSearchPage({ treeId, personId, faithLabel, initialQuery = '', onBack, onAdded }: InstitutionSearchPageProps) {
//   const [query, setQuery] = useState(initialQuery)
//   const [localResults, setLocalResults] = useState<SacredPlace[]>([])
//   const [mapsResults, setMapsResults] = useState<PlaceSuggestion[]>([])
//   const [isMapsLoading, setIsMapsLoading] = useState(false)
//   const [adding, setAdding] = useState<string | null>(null)   // templeId being added
//   const [errorMsg, setErrorMsg] = useState<string | null>(null)

//   const inputRef = useRef<HTMLInputElement>(null)
//   const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

//   const searchType = useMemo(() => (faithLabel ? FAITH_TO_TYPE[faithLabel] : undefined), [faithLabel])

//   // Focus input on mount
//   useEffect(() => {
//     inputRef.current?.focus()
//   }, [])

//   // Run the search on query change (local: instant; maps: debounced)
//   useEffect(() => {
//     const q = query.trim()
//     if (q.length < 2) {
//       setLocalResults([])
//       setMapsResults([])
//       if (debounceRef.current) clearTimeout(debounceRef.current)
//       return
//     }

//     const local = searchTemples(q, 12)
//     setLocalResults(local)

//     if (debounceRef.current) clearTimeout(debounceRef.current)
//     if (q.length < 3) { setMapsResults([]); return }

//     debounceRef.current = setTimeout(async () => {
//       setIsMapsLoading(true)
//       try {
//         const results = await searchGoogleMapsPlaces(q, searchType)
//         const localNames = local.map(t => t.name.toLowerCase())
//         const filtered = results.filter(r => !localNames.some(n => n.includes(r.name.toLowerCase()) || r.name.toLowerCase().includes(n)))
//         setMapsResults(filtered)
//       } catch {
//         setMapsResults([])
//       } finally {
//         setIsMapsLoading(false)
//       }
//     }, 400)

//     return () => {
//       if (debounceRef.current) clearTimeout(debounceRef.current)
//     }
//   }, [query, searchType])

//   const handleAddLocal = useCallback(async (temple: SacredPlace) => {
//     setAdding(temple.templeId)
//     setErrorMsg(null)
//     try {
//       // Send a default connectionType so the prod backend (strict) accepts it.
//       // The new backend ignores this when tags[] is present.
//       await createTempleLink(treeId, personId, { templeId: temple.templeId, connectionType: 'regular_visit' })
//       onAdded(temple.templeId)
//     } catch (err) {
//       setErrorMsg(err instanceof Error ? err.message : 'Could not add this institution')
//       setAdding(null)
//     }
//   }, [treeId, personId, onAdded])

//   const handleAddMaps = useCallback(async (place: PlaceSuggestion) => {
//     setAdding(place.placeId)
//     setErrorMsg(null)
//     try {
//       // Kick off enrichment in the background so detail view has data; don't block on it.
//       enrichPlace(place.placeId).catch(() => {/* silent — user can refresh later */})
//       await createTempleLink(treeId, personId, { templeId: place.placeId, connectionType: 'regular_visit' })
//       onAdded(place.placeId)
//     } catch (err) {
//       setErrorMsg(err instanceof Error ? err.message : 'Could not add this institution')
//       setAdding(null)
//     }
//   }, [treeId, personId, onAdded])

//   const rows: Row[] = useMemo(() => {
//     return [
//       ...localResults.map(temple => ({ kind: 'local' as const, temple })),
//       ...mapsResults.map(place => ({ kind: 'maps' as const, place })),
//     ]
//   }, [localResults, mapsResults])

//   const hasSomething = query.trim().length >= 2
//   const isEmpty = hasSomething && rows.length === 0 && !isMapsLoading

//   return (
//     <div className="absolute inset-0 z-50 bg-[#F6F2EA] dark:bg-[#141414] flex flex-col">
//       {/* Header */}
//       <div className="shrink-0 h-14 md:h-16 flex items-center gap-2 px-3 md:px-4 bg-white dark:bg-[#1A1A1A] border-b border-[#E2DBCE]/70 dark:border-[#2A2A2A]">
//         <button
//           onClick={onBack}
//           className="p-2 rounded-xl hover:bg-[#2F3E8F]/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
//           aria-label="Back"
//         >
//           <ArrowLeft className="w-5 h-5 text-[#3D2E1F] dark:text-[#D4D0CC]" />
//         </button>
//         <div className="relative flex-1">
//           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7355]" />
//           <input
//             ref={inputRef}
//             type="text"
//             value={query}
//             onChange={e => setQuery(e.target.value)}
//             placeholder={faithLabel === 'Christian' ? 'Search churches…' : faithLabel === 'Islam' || faithLabel === 'Muslim' ? 'Search mosques…' : 'Search temples, churches, mosques…'}
//             className="w-full h-11 pl-9 pr-9 rounded-xl border border-[#E2DBCE] dark:border-[#2A2A2A] bg-[#F6F2EA] dark:bg-[#1E1E1E] text-base md:text-[13px] text-[#3D2E1F] dark:text-[#F5F5F5] placeholder:text-[#B8A090] focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/30"
//           />
//           {query && (
//             <button
//               onClick={() => { setQuery(''); inputRef.current?.focus() }}
//               className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 min-w-[32px] min-h-[32px] flex items-center justify-center"
//               aria-label="Clear search"
//             >
//               <X className="w-4 h-4 text-[#8B7355]" />
//             </button>
//           )}
//         </div>
//       </div>

//       {/* Body */}
//       <div className="flex-1 overflow-y-auto">
//         <div className="w-full max-w-2xl px-3 py-4 mx-auto md:px-4">

//           {errorMsg && (
//             <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-[12px]">
//               {errorMsg}
//             </div>
//           )}

//           {/* Placeholder: no query */}
//           {!hasSomething && (
//             <div className="pt-10 text-center">
//               <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#2F3E8F]/10 mb-4">
//                 <Search className="w-6 h-6 text-[#2F3E8F]" strokeWidth={1.8} />
//               </div>
//               <h2 className="text-[16px] font-semibold text-[#3D2E1F] dark:text-[#F5F5F5] mb-1">
//                 Start typing to search
//               </h2>
//               <p className="text-[13px] text-[#8B7355] dark:text-[#A19F9D] max-w-sm mx-auto">
//                 Find your temple, church, or mosque by name or location. We search trusted heritage records and Google Maps.
//               </p>
//             </div>
//           )}

//           {/* Empty results */}
//           {isEmpty && (
//             <div className="pt-10 text-center">
//               <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#C2A46D]/15 mb-4">
//                 <Search className="w-6 h-6 text-[#C2A46D]" strokeWidth={1.8} />
//               </div>
//               <h2 className="text-[16px] font-semibold text-[#3D2E1F] dark:text-[#F5F5F5] mb-1">
//                 No matches for "{query}"
//               </h2>
//               <p className="text-[13px] text-[#8B7355] dark:text-[#A19F9D]">
//                 Try a different spelling, or search by the town or state.
//               </p>
//             </div>
//           )}

//           {/* Results */}
//           {rows.length > 0 && (
//             <ul className="space-y-2.5" role="list">
//               {rows.map(row => {
//                 if (row.kind === 'local') {
//                   const t = row.temple
//                   const Icon = RELIGION_ICON[t.religion] || Landmark
//                   const isAdding = adding === t.templeId
//                   return (
//                     <li key={`local-${t.templeId}`} className="rounded-2xl bg-white dark:bg-[#1E1E1E] ring-1 ring-[#E2DBCE]/70 dark:ring-[#2A2A2A] p-3 md:p-4">
//                       <div className="flex items-start gap-3">
//                         <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[#C2A46D]/20 to-[#2F3E8F]/10 flex items-center justify-center">
//                           <Icon className="w-5 h-5 text-[#2F3E8F]" strokeWidth={1.8} />
//                         </div>
//                         <div className="flex-1 min-w-0">
//                           <h3 className="text-[14px] font-semibold text-[#3D2E1F] dark:text-[#F5F5F5] leading-snug">
//                             {t.name}
//                           </h3>
//                           <p className="text-[12px] text-[#8B7355] dark:text-[#A19F9D] mt-0.5 truncate">
//                             {t.religion}{t.deity ? ` · ${t.deity}` : ''}{t.state ? ` · ${t.state}` : ''}
//                           </p>
//                         </div>
//                         <button
//                           onClick={() => handleAddLocal(t)}
//                           disabled={!!adding}
//                           className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2F3E8F] hover:bg-[#25327A] disabled:opacity-60 text-white text-[12px] font-semibold min-h-[40px] transition-colors"
//                         >
//                           {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '+ Add'}
//                         </button>
//                       </div>
//                     </li>
//                   )
//                 }
//                 const p = row.place
//                 const isAdding = adding === p.placeId
//                 return (
//                   <li key={`maps-${p.placeId}`} className="rounded-2xl bg-white dark:bg-[#1E1E1E] ring-1 ring-[#E2DBCE]/70 dark:ring-[#2A2A2A] p-3 md:p-4">
//                     <div className="flex items-start gap-3">
//                       <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[#2F3E8F]/10 to-[#4B2C5E]/10 flex items-center justify-center">
//                         <MapPin className="w-5 h-5 text-[#2F3E8F]" strokeWidth={1.8} />
//                       </div>
//                       <div className="flex-1 min-w-0">
//                         <h3 className="text-[14px] font-semibold text-[#3D2E1F] dark:text-[#F5F5F5] leading-snug">
//                           {p.name}
//                         </h3>
//                         <p className="text-[12px] text-[#8B7355] dark:text-[#A19F9D] mt-0.5 line-clamp-1">
//                           {p.formattedAddress}
//                         </p>
//                         <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-[#F2F4FB] dark:bg-[#252A3D] text-[10px] text-[#2F3E8F] font-medium">
//                           From Maps
//                         </span>
//                       </div>
//                       <button
//                         onClick={() => handleAddMaps(p)}
//                         disabled={!!adding}
//                         className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2F3E8F] hover:bg-[#25327A] disabled:opacity-60 text-white text-[12px] font-semibold min-h-[40px] transition-colors"
//                       >
//                         {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '+ Add'}
//                       </button>
//                     </div>
//                   </li>
//                 )
//               })}

//               {isMapsLoading && (
//                 <li className="flex items-center gap-2 px-3 py-2 text-[12px] text-[#8B7355]">
//                   <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching maps…
//                 </li>
//               )}
//             </ul>
//           )}
//         </div>
//       </div>
//     </div>
//   )
// }

/**
 * InstitutionSearchPage — full-screen search overlay.
 *
 * Searches institutions via the Celebrate Culture backend (single unified
 * source). Replaced searchTemples (local DB) + searchGoogleMapsPlaces with
 * getInstitutions({ q }) — the backend handles both heritage records and
 * external place data.
 */
