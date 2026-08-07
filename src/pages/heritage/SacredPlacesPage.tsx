import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Feather, ImageIcon, Landmark, Plus, Search } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { getUserTrees, fetchTreeWindow } from "@/services/neo4jDataService";
import {
  getTempleMemories,
  createTempleLink,
} from "@/services/templeLinkApiService";
import {
  resolveInstitutions,
  type ResolvedInstitution,
} from "@/components/institutions/institutionResolver";
import { InstitutionSearchPage } from "@/pages/institutions/InstitutionSearchPage";
import { InstitutionDetailPage } from "@/pages/institutions/InstitutionDetailPage";
import { AppShell } from "@/components/layout/AppShell";
import { HubPageTemplate } from "@/components/hubs/HubPageTemplate";
import { HeritageEmptyState } from "@/components/heritage/shared/HeritageEmptyState";
import { ReligionSelectModal } from "@/components/heritage/sacredPlaces/ReligionSelectModal";
import type {
  Institution,
  Person,
  TempleLinkWithPerson,
  TempleConnectionType,
  LensType,
} from "@/types";
import {
  SearchHero,
  type JourneyTemple,
  type QuickType,
} from "@/components/heritage/sacredPlaces/SearchHero";
import { StoryJourneySection } from "@/components/heritage/sacredPlaces/StoryJourneySection";
import { SacredMapSection } from "@/components/heritage/sacredPlaces/SacredMapSection";
import { FamilyMainTempleCard } from "@/components/heritage/sacredPlaces/FamilyMainTempleCard";
import { useToast } from "@/components/ui/use-toast";
import {
  useCreateJourneyWeave,
  useJourneyWeave,
  useMyInstitutions,
} from "@/hooks/useInstitution";
import { JourneyWeaveSection } from "@/components/heritage/sacredPlaces/JourneyWeaveSection";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVE_TREE_KEY = "familytree-active-tree";

const FAITH_KEY = (treeId?: string): string =>
  `cc_faith_${treeId ?? "default"}`;

const QUICK_SELECT_QUERY_MAP: Record<QuickType, string> = {
  somnath_temple: "Somnath Temple Gujarat",
  kashi_vishwanath: "Kashi Vishwanath Temple Varanasi",
  sri_venkateswara_swami_temple: "Sri Venkateswara Swamy Temple Tirupati",
  meenakshi_temple: "Meenakshi Amman Temple Madurai",
  jagannath_puri: "Jagannath Temple Puri",
  golden_temple: "Harmandir Sahib Golden Temple Amritsar",
  gurudwara_bangla_sahib: "Gurudwara Bangla Sahib New Delhi",
  haji_ali_dargah: "Haji Ali Dargah Mumbai",
  ajmer_sharif: "Ajmer Sharif Dargah Rajasthan",
  velankanni_church: "Basilica of Our Lady of Good Health Velankanni",
  st_thomas_basilica: "San Thome Basilica Chennai",
  palitana_temples: "Palitana Jain Temples Gujarat",
  shri_mahavirji: "Shri Mahavirji Temple Rajasthan",
  mahabodhi_temple: "Mahabodhi Temple Bodh Gaya",
  tawang_monastery: "Tawang Monastery Arunachal Pradesh",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type OverlayView = "none" | "search" | "detail" | "search_detail";

interface RecentMemoryItem {
  memoryId: string;
  templeLinkId: string;
  templeId: string;
  templeName: string;
  title: string;
  thumbnailUrl?: string;
  mediaUrl?: string;
  dateTaken?: string;
}

interface TempleGroup {
  templeId: string;
  connectionType: TempleConnectionType;
  links: TempleLinkWithPerson[];
  connectedPersons: Person[];
  resolved: ResolvedInstitution | null;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function getStoredTreeId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_TREE_KEY);
  } catch {
    return null;
  }
}

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";

  const diffDays = Math.round((Date.now() - then) / 86_400_000);
  const weeks = Math.round(diffDays / 7);
  const months = Math.round(diffDays / 30);
  const years = Math.round(diffDays / 365);

  if (diffDays < 1) return "recently";
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  if (diffDays < 30) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  if (diffDays < 365) return `${months} month${months === 1 ? "" : "s"} ago`;
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

function familyLabel(firstName?: string, lastName?: string): string {
  const surname = (lastName ?? "").trim();
  if (surname) return `The ${surname} family`;
  if (firstName) return `${firstName}\u2019s family`;
  return "Your family";
}

// ─── Custom hooks ─────────────────────────────────────────────────────────────

function useSacredPlacesData(userId: string | undefined, reloadKey: number) {
  const [treeId, setTreeId] = useState("");
  const [persons, setPersons] = useState<Person[]>([]);
  const [links, setLinks] = useState<TempleLinkWithPerson[]>([]);
  const [resolvedById, setResolvedById] = useState<
    Record<string, ResolvedInstitution>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const trees = await getUserTrees(userId);
        if (cancelled) return;

        if (trees.length === 0) {
          setError(
            "Create a family tree to start recording your sacred places.",
          );
          return;
        }

        const stored = getStoredTreeId();
        const tree = trees.find((t) => t.treeId === stored) ?? trees[0];
        setTreeId(tree.treeId);

        const [data] = await Promise.all([fetchTreeWindow(tree.treeId)]);

        if (cancelled) return;

        setPersons(data.persons as Person[]);
      } catch {
        if (!cancelled) setError("Could not load your tree right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  return { treeId, persons, links, resolvedById, loading, error };
}

function useRecentMemories(
  treeId: string,
  links: TempleLinkWithPerson[],
  resolvedById: Record<string, ResolvedInstitution>,
): RecentMemoryItem[] {
  const [recentMemories, setRecentMemories] = useState<RecentMemoryItem[]>([]);

  useEffect(() => {
    if (
      !treeId ||
      links.length === 0 ||
      Object.keys(resolvedById).length === 0
    ) {
      setRecentMemories([]);
      return;
    }

    let cancelled = false;
    const uniqueTempleIds = Array.from(new Set(links.map((l) => l.templeId)));

    Promise.all(
      uniqueTempleIds.map((templeId) =>
        getTempleMemories(treeId, templeId)
          .then((r) => {
            const link = links.find((l) => l.templeId === templeId);
            return r.memories.map(
              (m): RecentMemoryItem => ({
                memoryId: m.memoryId,
                templeLinkId: link?.templeLinkId ?? "",
                templeId,
                templeName: resolvedById[templeId]?.name ?? "Sacred place",
                title: m.title,
                thumbnailUrl: m.thumbnailUrl,
                mediaUrl: m.mediaUrl?.[0],
                dateTaken: m.dateTaken,
              }),
            );
          })
          .catch(() => [] as RecentMemoryItem[]),
      ),
    ).then((results) => {
      if (cancelled) return;

      const sorted = results.flat().sort((a, b) => {
        const da = a.dateTaken ? new Date(a.dateTaken).getTime() : 0;
        const db = b.dateTaken ? new Date(b.dateTaken).getTime() : 0;
        return db - da;
      });

      setRecentMemories(sorted.slice(0, 8));
    });

    return () => {
      cancelled = true;
    };
  }, [treeId, links, resolvedById]);

  return recentMemories;
}

interface UsePilgrimageJourneyOptions {
  userId: string | undefined;
  creatingJourneyWeave: boolean;
  createJourneyWeave: (args: {
    userId: string;
    religion: string; // ← add
    coordinates: { lat: number; lng: number };
  }) => Promise<unknown>;
  refetchJourneyWeave: () => void;
  toast: ReturnType<typeof useToast>["toast"];
  onJourneyCreated?: () => void;
}

function usePilgrimageJourney({
  userId,
  creatingJourneyWeave,
  createJourneyWeave,
  refetchJourneyWeave,
  toast,
  onJourneyCreated,
}: UsePilgrimageJourneyOptions) {
  const mountedRef = useRef(true);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
      }
    };
  }, []);

  const handleGeneratePilgrimage = useCallback(
    (religion: string) => {
      if (creatingJourneyWeave) return;

      if (!userId) {
        toast({
          title: "User unavailable",
          description: "Unable to create journey right now.",
          variant: "destructive",
        });
        return;
      }

      if (!navigator.geolocation) {
        toast({
          title: "Location unavailable",
          description: "Geolocation is not supported on this device.",
          variant: "destructive",
        });
        return;
      }

      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }

      let resolved = false;

      watchRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          if (resolved || !mountedRef.current) return;
          resolved = true;

          if (watchRef.current !== null) {
            navigator.geolocation.clearWatch(watchRef.current);
            watchRef.current = null;
          }

          try {
            const response = await createJourneyWeave({
              userId,
              religion,
              coordinates: {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              },
            });

            if (!response) {
              toast({
                title: "Journey creation failed",
                description: "Unable to generate your pilgrimage.",
                variant: "destructive",
              });
              return;
            }

            toast({
              title: "Journey created",
              description: "Your spiritual pilgrimage is ready.",
            });
            refetchJourneyWeave();
            onJourneyCreated?.();
          } catch {
            toast({
              title: "Journey creation failed",
              description: "Unable to generate your pilgrimage.",
              variant: "destructive",
            });
          }
        },
        (err) => {
          if (!mountedRef.current) return;

          if (watchRef.current !== null) {
            navigator.geolocation.clearWatch(watchRef.current);
            watchRef.current = null;
          }

          const GEO = err;
          if (err.code === GEO.PERMISSION_DENIED) {
            toast({
              title: "Location permission denied",
              description: "Please allow location access.",
              variant: "destructive",
            });
          } else if (err.code === GEO.TIMEOUT) {
            toast({
              title: "Location timeout",
              description: "Location request timed out. Please try again.",
              variant: "destructive",
            });
          } else if (err.code === GEO.POSITION_UNAVAILABLE) {
            toast({
              title: "Location unavailable",
              description: "Unable to determine your location.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Location error",
              description: "Unable to access your location.",
              variant: "destructive",
            });
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    },
    [
      creatingJourneyWeave,
      userId,
      createJourneyWeave,
      refetchJourneyWeave,
      toast,
    ],
  );

  return { handleGeneratePilgrimage };
}

// ─── Page component ───────────────────────────────────────────────────────────

export function SacredPlacesPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  const [reloadKey, setReloadKey] = useState(0);
  const [myInstitutionsReloadKey, setMyInstitutionsReloadKey] = useState(0);
  const bumpReloadKey = useCallback(() => setReloadKey((k) => k + 1), []);

  const [overlay, setOverlay] = useState<OverlayView>("none");
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<
    string | null
  >(null);
  const [selectedInstitution, setSelectedInstitution] =
    useState<Institution | null>(null);
  const [initialSearchQuery, setInitialSearchQuery] = useState("");
  const [searchDetailTemple, setSearchDetailTemple] =
    useState<JourneyTemple | null>(null);
  console.log("chruchdeta", searchDetailTemple)
  const [activeLens, setActiveLens] = useState<LensType>("Hindu");

  const searchHeroRef = useRef<HTMLDivElement | null>(null);
  const journeyWeaveSectionRef = useRef<HTMLDivElement | null>(null);

  const { treeId, persons, links, resolvedById, loading, error } =
    useSacredPlacesData(user?.id, reloadKey);

  const [showReligionModal, setShowReligionModal] = useState(false);

  const recentMemories: RecentMemoryItem[] = [];
  const {
    data: journeyWeave,
    loading: journeyWeaveLoading,
    refetch: refetchJourneyWeave,
  } = useJourneyWeave(user?.id);

  const { mutate: createJourneyWeave, loading: creatingJourneyWeave } =
    useCreateJourneyWeave();

  const { data: myInstitutionsRes, refetch: refetchMyInstitutions } =
    useMyInstitutions([myInstitutionsReloadKey]);

  const homePerson = useMemo(
    () => persons.find((p) => p.isHomePerson) ?? persons[0],
    [persons],
  );

  const faithLabel = useMemo((): string | null => {
    try {
      return localStorage.getItem(FAITH_KEY(treeId));
    } catch {
      return null;
    }
  }, [treeId]);

  const templeGroups = useMemo<TempleGroup[]>(() => {
    const groups = new Map<string, TempleGroup>();

    for (const link of links) {
      const person = persons.find((p) => p.personId === link.personId);
      const existing = groups.get(link.templeId);

      if (existing) {
        existing.links.push(link);
        if (
          person &&
          !existing.connectedPersons.some((p) => p.personId === person.personId)
        ) {
          existing.connectedPersons.push(person);
        }
      } else {
        groups.set(link.templeId, {
          templeId: link.templeId,
          connectionType: link.connectionType,
          links: [link],
          connectedPersons: person ? [person] : [],
          resolved: resolvedById[link.templeId] ?? null,
        });
      }
    }

    return Array.from(groups.values());
  }, [links, persons, resolvedById]);

  const kulaDevata = useMemo(
    () => templeGroups.find((g) => g.connectionType === "kula_devata") ?? null,
    [templeGroups],
  );

  const familyMainInstitution = useMemo(
    () =>
      (myInstitutionsRes?.data ?? []).find((i) => i.family_main === true) ??
      null,
    [myInstitutionsRes],
  );

  const totalPlaces = templeGroups.length;
  const totalPeople = useMemo(
    () => new Set(links.map((l) => l.personId)).size,
    [links],
  );
  const religionCount = useMemo(
    () =>
      new Set(templeGroups.map((g) => g.resolved?.religion).filter(Boolean))
        .size,
    [templeGroups],
  );

  const { handleGeneratePilgrimage } = usePilgrimageJourney({
    userId: user?.id,
    creatingJourneyWeave,
    createJourneyWeave,
    refetchJourneyWeave,
    toast,
    onJourneyCreated: () => {
      // ← add this
      setTimeout(() => {
        journeyWeaveSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 300);
    },
  });

  const scrollToSearch = useCallback(() => {
    searchHeroRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  const openSearch = useCallback((prefill = "") => {
    setInitialSearchQuery(prefill);
    setOverlay("search");
  }, []);

  const openDetail = useCallback(
    (institutionId: string, institution: Institution | null = null) => {
      setSelectedInstitutionId(institutionId);
      setSelectedInstitution(
        institution ??
        buildInstitutionFromResolved(
          institutionId,
          resolvedById[institutionId] ?? null,
        ),
      );
      setOverlay("detail");
    },
    [resolvedById],
  );

  const closeOverlay = useCallback(() => {
    setOverlay("none");
    setSelectedInstitutionId(null);
    setSelectedInstitution(null);
  }, []);

  const handleAddNearbyTemple = useCallback(
    async (temple: JourneyTemple) => {
      if (!treeId || !homePerson) return;

      try {
        await createTempleLink(treeId, homePerson.personId, {
          templeId: temple.templeId,
          connectionType: "regular_visit",
        });
        toast({
          title: "Place added",
          description: `${temple.title} has been added.`,
        });
      } catch {
        toast({
          title: "Failed to add place",
          description: "Unable to link this place right now.",
          variant: "destructive",
        });
      }
    },
    [treeId, homePerson, toast],
  );

  if (overlay === "search" && treeId && homePerson) {
    return (
      <AppShell activeView="home">
        <div className="relative h-screen">
          <InstitutionSearchPage
            treeId={treeId}
            personId={homePerson.personId}
            faithLabel={faithLabel}
            initialQuery={initialSearchQuery}
            onBack={() => setOverlay("none")}
            onAdded={() => {
              setOverlay("none");
              bumpReloadKey();
              refetchMyInstitutions();
            }}
            onViewDetail={(temple) => {
              setSearchDetailTemple(temple);
              setOverlay("search_detail");
            }}
          />
        </div>
      </AppShell>
    );
  }

  if (overlay === "detail" && selectedInstitutionId && selectedInstitution) {
    return (
      <AppShell activeView="home">
        <div className="relative h-screen">
          <InstitutionDetailPage
            institutionId={selectedInstitutionId}
            institution={selectedInstitution}
            defaultSaved={true}
            onBack={() => {
              closeOverlay();
              refetchMyInstitutions();
            }}
          />
        </div>
      </AppShell>
    );
  }

  if (overlay === "search_detail" && searchDetailTemple) {
    const inst: Institution = {
      _id: searchDetailTemple.templeId,
      institutionId: searchDetailTemple.templeId,
      name: searchDetailTemple.title,
      religion: searchDetailTemple.religion ?? "Unknown",
      type: undefined as any, // type: "temple",
      location: {
        address: searchDetailTemple.location ?? "",
        locationText: searchDetailTemple.location ?? "",
        country: "",
        lat: null,
        lng: null,
        googleMapsUrl: null,
      },
      thumbnail: searchDetailTemple.thumbnail ?? "",
      overview: "",
    };
    return (
      <AppShell activeView="home">
        <div className="relative h-screen">
          <InstitutionDetailPage
            institutionId={searchDetailTemple.templeId}
            institution={inst}
            defaultSaved={false}
            readOnly={true}
            onBack={() => {
              setOverlay("search");
              setSearchDetailTemple(null);
            }}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <>
      <AppShell activeView="home">
        <HubPageTemplate
          title="Sacred Places"
          subtitle="The temples, churches, mosques, gurdwaras, and shrines your family holds close."
          // subtitle="The temples and shrines your family holds close."
          icon={
            <Landmark className="w-6 h-6 text-[#C2A46D]" strokeWidth={2.25} />
          }
          backTo={null}
        >
          <div className="space-y-7 md:space-y-9">
            {loading ? (
              <HeroSkeleton />
            ) : error ? (
              <HeritageEmptyState
                icon={Landmark}
                title="No tree yet"
                message={error}
                tone="gold"
              />
            ) : (
              <>
                {totalPlaces === 0 ? (
                  <EmptyHero
                    homeName={homePerson?.lastName}
                    onSearch={scrollToSearch}
                  />
                ) : (
                  <EditorialHero
                    homePerson={homePerson}
                    totalPlaces={totalPlaces}
                    totalPeople={totalPeople}
                    religionCount={religionCount}
                    kulaDevataName={kulaDevata?.resolved?.name}
                  />
                )}

                <StoryJourneySection
                  onGenerateStory={() => openSearch()}
                  onDiscoverPlaces={() => openSearch()}
                  onOpenJourney={() => setShowReligionModal(true)}
                  creatingJourney={creatingJourneyWeave}
                />

                {familyMainInstitution && user?.id && (
                  <FamilyMainTempleCard
                    institution={familyMainInstitution}
                    userId={user.id}
                    onOpen={(institutionId) => openDetail(institutionId)}
                  />
                )}

                <div ref={searchHeroRef}>
                  <SearchHero
                    onSearch={() => openSearch()}
                    onAddNearbyTemple={handleAddNearbyTemple}
                    onInstitutionAdded={bumpReloadKey}
                    onQuickSelect={(type) =>
                      openSearch(QUICK_SELECT_QUERY_MAP[type])
                    }
                    activeFaith={activeLens}
                  />
                </div>

                <SacredMapSection
                  religion={activeLens}
                  reloadKey={reloadKey}
                  onOpen={(institutionId, institution) =>
                    openDetail(institutionId, institution)
                  }
                />

                <div ref={journeyWeaveSectionRef}>
                  <JourneyWeaveSection
                    data={journeyWeave}
                    loading={journeyWeaveLoading}
                  />
                </div>

                {recentMemories.length > 0 && (
                  <RecentMemories
                    items={recentMemories}
                    onOpen={(templeId) => openDetail(templeId)}
                  />
                )}

                {totalPlaces > 0 && (
                  <MissingPlaceCta onSearch={() => openSearch()} />
                )}
              </>
            )}
          </div>
        </HubPageTemplate>
      </AppShell>
      <ReligionSelectModal
        open={showReligionModal}
        loading={creatingJourneyWeave}
        onClose={() => setShowReligionModal(false)}
        onConfirm={(religion) => {
          setShowReligionModal(false);
          handleGeneratePilgrimage(religion);
        }}
      />
    </>
  );
}

// ═══ Editorial hero ═══════════════════════════════════════════════════════════

function EditorialHero({
  homePerson,
  totalPlaces,
  totalPeople,
  religionCount,
  kulaDevataName,
}: {
  homePerson?: Person;
  totalPlaces: number;
  totalPeople: number;
  religionCount: number;
  kulaDevataName?: string;
}) {
  const label = familyLabel(homePerson?.firstName, homePerson?.lastName);
  return (
    <header className="relative">
      {/* Eyebrow label */}
      <p
        className="text-[10.5px] md:text-[11px] tracking-[0.28em] uppercase font-semibold mb-2
                    text-[#8B6F3A] dark:text-[#C2A46D]"
      >
        Where your family prays
      </p>

      {/* Headline */}
      <h2
        className="font-serif-display text-[26px] md:text-[34px] leading-[1.12] font-semibold max-w-3xl
                     text-[#3D2E1F] dark:text-[#F5F1E8]"
      >
        {kulaDevataName ? (
          <>
            {label} returns, year after year, to{" "}
            <em className="not-italic text-[#8B6F3A] dark:text-[#C2A46D]">
              {kulaDevataName}
            </em>
            .
          </>
        ) : (
          <>A map of the places {label.toLowerCase()} has held close.</>
        )}
      </h2>

      {/* Sub-copy */}
      <p
        className="mt-3 text-[13.5px] md:text-[14.5px] leading-relaxed max-w-2xl
                    text-[#5C4A2E] dark:text-[#C9BDA8]"
      >
        {totalPlaces} {totalPlaces === 1 ? "place" : "places"} across{" "}
        {religionCount || "multiple"}{" "}
        {religionCount === 1 ? "tradition" : "traditions"}, woven through the
        lives of {totalPeople} {totalPeople === 1 ? "member" : "members"}.
      </p>
    </header>
  );
}

// ═══ Empty hero ═══════════════════════════════════════════════════════════════

function EmptyHero({
  homeName,
  onSearch,
}: {
  homeName?: string;
  onSearch: () => void;
}) {
  return (
    <header className="relative">
      {/* Eyebrow */}
      <p
        className="text-[10.5px] tracking-[0.28em] uppercase font-semibold mb-2
                    text-[#8B6F3A] dark:text-[#C2A46D]"
      >
        Your family's spiritual roots
      </p>

      {/* Headline */}
      <h2
        className="font-serif-display text-[28px] md:text-[36px] leading-tight font-semibold max-w-5xl
                     text-[#3D2E1F] dark:text-[#F5F1E8]"
      >
        {homeName ? (
          <>{homeName} family's spiritual roots are taking shape.</>
        ) : (
          <>Where does your family pause in prayer?</>
        )}
      </h2>

      {/* Body copy */}
      <p
        className="mt-3 text-[14px] leading-relaxed max-w-5xl
                    text-[#5C4A2E] dark:text-[#C9BDA8]"
      >
        Most Indian families hold one or two places close across generations in
        a family temple, a home parish, an ancestral shrine. Add the one that
        matters most.
      </p>

      {/* CTA button */}
      <button
        onClick={onSearch}
        className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium
                   transition-colors
                   bg-[#3D2E1F] text-[#F6F2EA] hover:bg-[#2A1F15]
                   dark:bg-[#F6F2EA] dark:text-[#3D2E1F] dark:hover:bg-[#EFE6D6]"
      >
        <Search className="w-4 h-4" />
        Start with what you remember
      </button>
    </header>
  );
}

// ═══ Skeleton ═════════════════════════════════════════════════════════════════

function HeroSkeleton() {
  return (
    <div className="space-y-3">
      <div
        className="h-3 w-40 rounded animate-pulse
                      bg-[#E2DBCE]/60 dark:bg-[#2A2A2A]"
      />
      <div
        className="h-8 w-3/4 rounded animate-pulse
                      bg-[#E2DBCE]/60 dark:bg-[#2A2A2A]"
      />
      <div
        className="h-4 w-1/2 rounded animate-pulse
                      bg-[#E2DBCE]/60 dark:bg-[#2A2A2A]"
      />
    </div>
  );
}

// ═══ Helper ═══════════════════════════════════════════════════════════════════

function buildInstitutionFromResolved(
  templeId: string,
  resolved: ResolvedInstitution | null,
): Institution {
  return {
    _id: templeId,
    institutionId: templeId,
    name: resolved?.name ?? "Sacred Place",
    religion: resolved?.religion ?? "Unknown",
    type: undefined as any, // type: "temple",
    location: {
      address: resolved?.location ?? "",
      locationText: resolved?.location ?? "",
      country: "",
      lat: null,
      lng: null,
      googleMapsUrl: null,
    },
    thumbnail: "",
    overview: "",
  };
}

// ═══ Recent Memories ══════════════════════════════════════════════════════════

function RecentMemories({
  items,
  onOpen,
}: {
  items: RecentMemoryItem[];
  onOpen: (templeId: string) => void;
}) {
  return (
    <section>
      <header className="flex items-baseline justify-between mb-3">
        <h3
          className="font-serif-display text-[18px] md:text-[20px] font-semibold
                       text-[#3D2E1F] dark:text-[#F5F1E8]"
        >
          From recent visits
        </h3>
        <span className="text-[11px] text-[#8B7355] dark:text-[#A19F9D]">
          {items.length} {items.length === 1 ? "glimpse" : "glimpses"}
        </span>
      </header>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {items.map((m) => (
          <li key={m.memoryId}>
            <button
              onClick={() => onOpen(m.templeId)}
              className="group w-full text-left rounded-xl overflow-hidden transition-all
                         bg-white dark:bg-[#1E1E1E]
                         ring-1 ring-[#E2DBCE]/70 dark:ring-[#2A2A2A]
                         hover:ring-[#2F3E8F]/40 dark:hover:ring-[#5A6BFF]/40"
            >
              {/* Thumbnail */}
              <div
                className="relative w-full aspect-square overflow-hidden
                              bg-[#E2DBCE]/40 dark:bg-[#252525]"
              >
                {m.thumbnailUrl || m.mediaUrl ? (
                  <img
                    src={m.thumbnailUrl || m.mediaUrl}
                    alt={m.title}
                    loading="lazy"
                    className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center
                                  text-[#8B7355]/50 dark:text-[#A19F9D]/40"
                  >
                    <ImageIcon className="w-7 h-7" strokeWidth={1.5} />
                  </div>
                )}
              </div>

              {/* Caption */}
              <div className="px-2.5 py-2.5">
                <p
                  className="text-[12.5px] font-semibold line-clamp-1 leading-tight
                              text-[#3D2E1F] dark:text-[#F5F5F5]"
                >
                  {m.title}
                </p>
                <p
                  className="text-[10.5px] line-clamp-1 mt-0.5 italic
                              text-[#8B7355] dark:text-[#A19F9D]"
                >
                  {m.templeName}
                  {m.dateTaken ? ` \u00B7 ${timeAgo(m.dateTaken)}` : ""}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ═══ Missing place CTA ════════════════════════════════════════════════════════

function MissingPlaceCta({ onSearch }: { onSearch: () => void }) {
  return (
    <div
      className="rounded-2xl border border-dashed px-5 py-5 md:px-6 md:py-6
                    flex flex-col md:flex-row md:items-center gap-4
                    border-[#C2A46D]/40 dark:border-[#C2A46D]/20
                    bg-[#FAF7F0]/50 dark:bg-[#1A1510]/60"
    >
      {/* Icon + text */}
      <div className="flex items-center flex-1 min-w-0 gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0
                        bg-[#C2A46D]/15 dark:bg-[#C2A46D]/10
                        text-[#8B6F3A] dark:text-[#C2A46D]"
        >
          <Feather className="w-4 h-4" strokeWidth={1.8} />
        </div>

        <div className="min-w-0">
          <h4
            className="font-serif-display text-[15px] md:text-[16px] font-semibold
                         text-[#3D2E1F] dark:text-[#F5F1E8]"
          >
            A place your family honours that isn't here yet?
          </h4>
          <p
            className="text-[12px] mt-0.5
                        text-[#8B7355] dark:text-[#A19F9D]"
          >
            Add it — even a small shrine, a roadside chapel, a grandmother's
            devotion.
          </p>
        </div>
      </div>

      {/* CTA button */}
      <button
        onClick={onSearch}
        className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium
                   transition-colors
                   bg-[#3D2E1F] text-[#F6F2EA] hover:bg-[#2A1F15]
                   dark:bg-[#F6F2EA] dark:text-[#3D2E1F] dark:hover:bg-[#EFE6D6]"
      >
        <Plus className="w-4 h-4" />
        Add a place
      </button>
    </div>
  );
}

// ═══ Kula Devata — the editorial focal point ═══

// interface KulaGroup {
//   templeId: string;
//   connectionType: TempleConnectionType;
//   links: TempleLinkWithPerson[];
//   connectedPersons: Person[];
//   resolved: ResolvedInstitution | null;
// }

// function KulaDevataCard({
//   group,
//   treeId,
//   onOpen,
// }: {
//   group: KulaGroup;
//   treeId: string;
//   onOpen: () => void;
// }) {
//   const place = group.resolved;
//   const [story, setStory] = useState<{
//     narrative: string;
//     generationalArc: string;
//     source: string;
//   } | null>(null);
//   const [storyLoading, setStoryLoading] = useState(false);

//   useEffect(() => {
//     if (!treeId || !place) return;
//     let cancelled = false;
//     (async () => {
//       setStoryLoading(true);
//       try {
//         const token = localStorage.getItem("auth_token");
//         const persons = group.connectedPersons.map((p) => ({
//           name: `${p.firstName} ${p.lastName}`.trim(),
//           connectionType: group.connectionType,
//           birthYear: p.birthDate ? Number(p.birthDate.slice(0, 4)) : null,
//           deathYear: p.deathDate ? Number(p.deathDate.slice(0, 4)) : null,
//         }));
//         const params = new URLSearchParams({
//           templeName: place.name,
//           templeType:
//             place.religion === "Christian"
//               ? "church"
//               : place.religion === "Islam"
//                 ? "mosque"
//                 : "temple",
//           location: place.location,
//           connectedPersons: JSON.stringify(persons),
//         });
//         const res = await fetch(
//           resolveBackendUrl(
//             `/api/heritage/tree/${treeId}/sacred/story/${group.templeId}?${params.toString()}`,
//           ),
//           { headers: token ? { Authorization: `Bearer ${token}` } : {} },
//         );
//         if (res.ok && !cancelled) {
//           setStory(await res.json());
//           toast({
//             title: "Story generated",
//             description: `Story for ${place.name} is ready.`,
//           });
//         } else if (!cancelled) {
//           toast({
//             title: "Failed to generate story",
//             description: `Unable to create story for ${place.name} at this time.`,
//             variant: "destructive",
//           });
//         }
//       } catch {
//         if (!cancelled) {
//           toast({
//             title: "Failed to generate story",
//             description: `Unable to create story for ${place.name} at this time.`,
//             variant: "destructive",
//           });
//         }
//       } finally {
//         if (!cancelled) setStoryLoading(false);
//       }
//     })();
//     return () => {
//       cancelled = true;
//     };
//   }, [treeId, place, group, toast]);

//   if (!place) return null;
//   const meta = CATEGORY_META.kula_devata;
//   const generationCount = group.connectedPersons.length;

//   return (
//     <button
//       onClick={onOpen}
//       className="w-full text-left relative rounded-3xl overflow-hidden shadow-[0_24px_60px_-24px_rgba(61,46,31,0.45)] hover:shadow-[0_28px_70px_-22px_rgba(61,46,31,0.5)] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2F3E8F]"
//     >
//       <div
//         className="absolute inset-0 pointer-events-none kula-shimmer-v2"
//         aria-hidden
//       />
//       <div
//         className="relative p-7 md:p-10"
//         style={{
//           background: `linear-gradient(135deg, ${meta.accent.from} 0%, ${meta.accent.via} 55%, ${meta.accent.to} 100%)`,
//         }}
//       >
//         {/* Soft grain */}
//         <div
//           className="absolute inset-0 opacity-[0.09] mix-blend-overlay pointer-events-none"
//           aria-hidden
//         >
//           <svg width="100%" height="100%">
//             <filter id="sacred-grain">
//               <feTurbulence
//                 type="fractalNoise"
//                 baseFrequency="0.9"
//                 numOctaves="2"
//               />
//             </filter>
//             <rect width="100%" height="100%" filter="url(#sacred-grain)" />
//           </svg>
//         </div>
//         <div
//           className="absolute bg-white rounded-full -top-20 -right-16 w-60 h-60 opacity-20"
//           aria-hidden
//         />
//         <div
//           className="absolute bg-white rounded-full -bottom-16 left-1/4 w-44 h-44 opacity-10"
//           aria-hidden
//         />

//         <div className="relative" style={{ color: meta.accent.ink }}>
//           <div className="flex items-center gap-2 mb-4">
//             <Flame className="w-3.5 h-3.5" strokeWidth={2.2} />
//             <span className="text-[10.5px] uppercase tracking-[0.28em] font-semibold opacity-90">
//               Family deity
//             </span>
//           </div>

//           <h2 className="font-serif-display text-[30px] md:text-[42px] leading-[1.08] font-semibold text-white max-w-3xl">
//             {place.name}
//           </h2>
//           <p className="mt-2 text-[13px] md:text-[14px] opacity-90 flex items-center gap-1.5">
//             <MapPin className="w-3.5 h-3.5" />
//             {place.location}
//             {place.religion && place.religion !== "Unknown" && (
//               <> &middot; {place.religion} tradition</>
//             )}
//           </p>

//           {storyLoading && (
//             <div className="mt-5 space-y-2">
//               <div className="h-3 bg-white/[0.14] rounded animate-pulse w-3/4" />
//               <div className="h-3 bg-white/[0.14] rounded animate-pulse w-full" />
//             </div>
//           )}
//           {story?.source === "ai" && story.narrative && (
//             <blockquote className="max-w-3xl pl-4 mt-6 border-l-2 border-white/30">
//               <p className="text-[15px] md:text-[17px] leading-relaxed font-light italic">
//                 {story.narrative}
//               </p>
//               {story.generationalArc && (
//                 <cite className="mt-3 block text-[11.5px] not-italic opacity-75 tracking-wide">
//                   \u2014 {story.generationalArc}
//                 </cite>
//               )}
//             </blockquote>
//           )}
//           {(!story || story.source !== "ai") && !storyLoading && (
//             <p className="mt-5 text-[13.5px] opacity-85 italic max-w-2xl">
//               {generationCount === 1
//                 ? "One voice in your family has woven this place into their spiritual life."
//                 : `${generationCount} members of your family have woven this place into their spiritual lives.`}
//             </p>
//           )}

//           <div className="flex flex-wrap items-center gap-2 mt-6">
//             {group.connectedPersons.slice(0, 5).map((p) => (
//               <span
//                 key={p.personId}
//                 className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11.5px] font-medium bg-white/12 border border-white/20 backdrop-blur-sm"
//               >
//                 {p.firstName}
//               </span>
//             ))}
//             {group.connectedPersons.length > 5 && (
//               <span className="text-[11px] opacity-80">
//                 +{group.connectedPersons.length - 5} more
//               </span>
//             )}
//           </div>

//           <div className="mt-6 inline-flex items-center gap-1.5 text-[12px] font-medium opacity-90">
//             Read the full story <ChevronRight className="w-3.5 h-3.5" />
//           </div>
//         </div>
//       </div>

//       <style>{`
//         .kula-shimmer-v2::before {
//           content: '';
//           position: absolute;
//           inset: 0;
//           background: linear-gradient(115deg, transparent 38%, rgba(255,255,255,0.18) 50%, transparent 62%);
//           transform: translateX(-100%);
//           animation: kula-shimmer-v2 4s ease-out 0.6s 1 forwards;
//           pointer-events: none;
//         }
//         @keyframes kula-shimmer-v2 {
//           to { transform: translateX(100%); }
//         }
//         @media (prefers-reduced-motion: reduce) {
//           .kula-shimmer-v2::before { display: none; }
//         }
//       `}</style>
//     </button>
//   );
// }

// ═══ Recent memories ═══
