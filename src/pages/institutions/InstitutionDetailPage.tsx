/**
 * InstitutionDetailPage — detail view for a single institution.
 *
 * Changes from previous version:
 *   - Fetches /tree/explore-roots/user/trees on mount to get the active treeId,
 *     then fetches the window API (/tree/explore-roots/user/tree/:treeId/window)
 *     to get the persons list.
 *   - Passes `persons` down to AddMemorySheet so family members can be tagged.
 *
 * Temple-details integration (GET → POST fallback) is unchanged.
 * Memory-related code is intentionally untouched.
 */

import { useState, useCallback, useEffect } from "react";
import {
  ArrowLeft,
  Plus,
  Bookmark,
  BookmarkCheck,
  Landmark,
  Church,
  Building2,
  MapPin,
  Clock,
  ExternalLink,
  Users,
  Image as ImageIcon,
  Loader2,
  Info,
  Star,
  BookOpen,
  CalendarDays,
  Flame,
  ChevronDown,
  Trash2,
  ChevronUp,
  Sparkle,
  Scroll,
  Building,
  Compass,
  Sun,
  ShieldCheck,
  RefreshCw,
  FileText,
  Play,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ComponentType } from "react";
import type {
  InstitutionTag,
  TempleDetailsResponse,
  Institution,
} from "@/types";
import {
  useInstitutionMemories,
  useInstitutionMembers,
  useAddInstitutionToMyList,
  useRemoveInstitutionFromMyList,
  useUpdateInstitutionTag,
  useDeleteInstitutionMemory,
  useGetTempleDetails,
  useCreateTempleDetails,
  useRefreshTempleDetails,
} from "@/hooks/useInstitution";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/components/ui/use-toast";
import { useNeo4jTreeStore } from "@/store/neo4jTreeStore";
import {
  AddMemorySheet,
  type WindowPerson,
} from "@/components/institutions/AddMemorySheet";
import { EditInstitutionModal } from "@/components/modals/ManageTagsModal";
import { institutionInstance } from "@/services/api/institutionInstance";
import { FullPageMediaViewer } from "@/components/viewer/FullPageMediaViewer";

// ── Props ─────────────────────────────────────────────────────────────────────

interface InstitutionDetailPageProps {
  institutionId: string;
  institution: Institution;
  defaultSaved?: boolean;
  onBack: () => void;
  readOnly?: boolean;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "memories" | "about" | "family" | "visit";

const RELIGION_ICON: Record<
  string,
  ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  Hindu: Landmark,
  Christian: Church,
  Islam: Building2,
};

// ── Helper: fetch persons from the window API ─────────────────────────────────
//
// The window API is already called on page load (visible in the Network tab).
// Rather than duplicating the full tree-store logic here, we make a targeted
// two-step fetch:
//   1. GET /tree/explore-roots/user/trees  → grab the first treeId
//   2. GET /tree/explore-roots/user/tree/:treeId/window?ancestorDepth=99&descendantDepth=99
//
// Both calls reuse the same axios instance used everywhere else in the app
// so auth headers are automatically attached.

async function fetchWindowPersons(treeId: string): Promise<WindowPerson[]> {
  const res = await institutionInstance.get<{
    success: boolean;
    data: {
      persons: WindowPerson[];
    };
  }>(`/tree/explore-roots/user/tree/${treeId}/window`, {
    params: { ancestorDepth: 99, descendantDepth: 99 },
  });
  return res.data?.data?.persons ?? [];
}

async function fetchActiveTreeId(): Promise<string | null> {
  try {
    const res = await institutionInstance.get<{
      success: boolean;
      data: { treeId: string; id?: string }[];
    }>("/tree/explore-roots/user/trees");
    const trees = res.data?.data ?? [];
    return trees[0]?.treeId ?? trees[0]?.id ?? null;
  } catch {
    return null;
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export function InstitutionDetailPage({
  institutionId,
  institution,
  defaultSaved,
  onBack,
  readOnly = false,
}: InstitutionDetailPageProps) {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = useState<Tab>(
    readOnly ? "about" : "memories",
  );
  const [inMyList, setInMyList] = useState<boolean | null>(null);
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [localTag, setLocalTag] = useState<InstitutionTag | undefined>(
    undefined,
  );
  const [localFamilyMain, setLocalFamilyMain] = useState<boolean>(
    institution.family_main ?? false,
  );

  // ── Temple details state ─────────────────────────────────────────────────
  const [templeDetails, setTempleDetails] =
    useState<TempleDetailsResponse | null>(null);
  const [templeDetailsLoading, setTempleDetailsLoading] = useState(false);
  const [templeDetailsGenerating, setTempleDetailsGenerating] = useState(false);

  // ── Window API persons state ─────────────────────────────────────────────
  const [persons, setPersons] = useState<WindowPerson[]>([]);
  const [activeTreeId, setActiveTreeId] = useState<string | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<any | null>(null);

  // ── Data hooks ───────────────────────────────────────────────────────────
  const savedInMyList = inMyList ?? defaultSaved ?? false;
  const currentTag = localTag ?? institution.tag;

  const {
    data: memoriesRes,
    loading: memoriesLoading,
    refetch: refetchMemories,
  } = useInstitutionMemories(institutionId);

  const memories = memoriesRes?.data?.memories ?? [];

  const { data: membersRes, loading: membersLoading } = useInstitutionMembers(
    activeTab === "family" ? institutionId : "",
  );

  const members = membersRes?.data ?? [];

  // ── Temple details mutation hooks ────────────────────────────────────────

  const { mutate: fetchTempleDetails } = useGetTempleDetails();
  const { mutate: generateTempleDetails } = useCreateTempleDetails();
  const { mutate: refreshDetails } = useRefreshTempleDetails();

  // ── Fetch window API persons on mount ────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const treeId = await fetchActiveTreeId();
        if (cancelled || !treeId) return;

        setActiveTreeId(treeId);

        const windowPersons = await fetchWindowPersons(treeId);
        if (!cancelled) {
          setPersons(windowPersons);
        }
      } catch {
        // Non-critical — AddMemorySheet will simply hide the people section
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Temple details fetch: GET → POST fallback ────────────────────────────

  useEffect(() => {
    if (!institutionId || !user?.id) return;
    let cancelled = false;

    (async () => {
      setTempleDetailsLoading(true);
      try {
        // Step 1: Try GET
        const existing = await fetchTempleDetails({
          templeId: institutionId,
          userId: user.id,
        });

        if (cancelled) return;

        if (existing) {
          setTempleDetails(existing);
          setTempleDetailsLoading(false);
          return;
        }

        // Step 2: GET returned null (fail / 404) → generate via POST
        setTempleDetailsLoading(false);
        setTempleDetailsGenerating(true);

        const generated = await generateTempleDetails({
          templeId: institutionId,
          userId: user.id,
        });

        if (!cancelled && generated) {
          setTempleDetails(generated);
        }
      } catch {
        // GET threw (404) → fall through to POST
        if (cancelled) return;
        setTempleDetailsLoading(false);
        setTempleDetailsGenerating(true);

        try {
          const generated = await generateTempleDetails({
            templeId: institutionId,
            userId: user.id,
          });
          if (!cancelled && generated) {
            setTempleDetails(generated);
          }
        } catch {
          // Silent fail — institution detail data will still show
        } finally {
          if (!cancelled) setTempleDetailsGenerating(false);
        }
      } finally {
        if (!cancelled) {
          setTempleDetailsLoading(false);
          setTempleDetailsGenerating(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [institutionId, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mutation hooks ───────────────────────────────────────────────────────

  const { mutate: addToList, loading: addingToList } =
    useAddInstitutionToMyList();
  const { mutate: removeFromList, loading: removingFromList } =
    useRemoveInstitutionFromMyList();
  const { mutate: updateTag, loading: updatingTag } = useUpdateInstitutionTag();

  const { mutate: deleteMemory, loading: deletingMemory } =
    useDeleteInstitutionMemory();

  const listLoading = addingToList || removingFromList;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleToggleMyList = useCallback(async () => {
    setErrorMsg(null);

    if (savedInMyList) {
      const result = await removeFromList(institutionId);
      if (result !== null) {
        setInMyList(false);
        toast({
          title: "Removed from list",
          description: `${institution.name} has been removed from your list.`,
        });
      } else {
        const message = "Could not remove from list";
        setErrorMsg(message);
        toast({
          title: "Failed to remove",
          description: message,
          variant: "destructive",
        });
      }
    } else {
      const result = await addToList({ institutionId });
      if (result !== null) {
        setInMyList(true);
        toast({
          title: "Added to list",
          description: `${institution.name} has been added to your list.`,
        });
      } else {
        const message = "Could not add to list";
        setErrorMsg(message);
        toast({
          title: "Failed to add",
          description: message,
          variant: "destructive",
        });
      }
    }
  }, [
    institution,
    savedInMyList,
    institutionId,
    addToList,
    removeFromList,
    toast,
  ]);

  const handleDeleteMemory = useCallback(
    async (memoryId: string) => {
      const result = await deleteMemory({ institutionId, memoryId });
      if (result !== null) {
        refetchMemories();
        toast({
          title: "Memory deleted",
          description: "The memory has been removed.",
        });
      } else {
        toast({
          title: "Failed to delete",
          description: "Could not delete memory.",
          variant: "destructive",
        });
      }
    },
    [institutionId, deleteMemory, refetchMemories, toast],
  );

  const handleUpdateTag = useCallback(
    async (tag: InstitutionTag, familyMain: boolean) => {
      setErrorMsg(null);
      const result = await updateTag({
        institutionId,
        payload: { tag, family_main: familyMain },
      });
      if (result !== null) {
        setLocalTag(tag);
        setLocalFamilyMain(familyMain);
        setShowEdit(false);
        toast({
          title: "Details Updated",
          description: `Sacred Place details updated successfully.`,
        });
      }
    },
    [institutionId, updateTag, toast],
  );

  const handleRefreshDetails = useCallback(async () => {
    if (!user?.id) return;
    const result = await refreshDetails({
      templeId: institutionId,
      userId: user.id,
    });
    if (result) {
      setTempleDetails(result);
    } else {
      throw new Error("Refresh failed");
    }
  }, [institutionId, user?.id, refreshDetails]);

  // ── Derived ──────────────────────────────────────────────────────────────

  const religion = institution.religion ?? "Unknown";
  const ReligionIcon = RELIGION_ICON[religion] || Landmark;

  const locationText =
    institution.location?.locationText ?? institution.location?.address ?? "";
  const mapsUrl =
    institution.location?.googleMapsUrl ??
    (institution.location?.lat && institution.location?.lng
      ? `https://www.google.com/maps/search/?api=1&query=${institution.location.lat},${institution.location.lng}`
      : null);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="absolute inset-0 z-40 bg-[hsl(var(--background))] flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 h-14 md:h-16 flex items-center justify-between gap-3 px-3 md:px-4 bg-[hsl(var(--background))]/90 backdrop-blur-sm border-b border-[hsl(var(--border))]">
        <button
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-[hsl(var(--primary))]/10 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-[hsl(var(--foreground))] dark:text-[#D4D0CC]" />
        </button>
      </div>

      {/* Scroll container */}
      <div className="flex-1 overflow-y-auto pb-28 custom-scrollbar">
        {/* Hero banner */}
        <div className="relative w-full h-56 md:h-72 overflow-hidden bg-[hsl(var(--muted))]">
          {institution.thumbnail ? (
            <img
              src={institution.thumbnail}
              alt={institution.name}
              className="absolute inset-0 object-cover w-full h-full transition-transform duration-700 hover:scale-105"
              loading="eager"
              decoding="async"
              referrerPolicy="strict-origin-when-cross-origin"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--muted))]">
              <ReligionIcon
                className="w-16 h-16 text-[hsl(var(--primary-foreground))]/40"
                strokeWidth={1.5}
              />
            </div>
          )}

          <div className="absolute inset-0 bg-black/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />

          {institution.type && (
            <div className="absolute top-4 left-4 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/35 backdrop-blur-md border border-white/15 text-[hsl(var(--primary-foreground))] text-[10px] font-semibold uppercase tracking-wider">
              <ReligionIcon className="w-3 h-3" strokeWidth={2} />
              {institution.type}
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-5 text-[hsl(var(--primary-foreground))] md:px-6 md:pb-6">
            <h1 className="text-[24px] md:text-[34px] font-bold leading-tight tracking-[-0.02em] font-serif-display drop-shadow-sm max-w-5xl">
              {institution.name}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] md:text-[13px] text-[hsl(var(--primary-foreground))]/90">
              {religion !== "Unknown" && (
                <div className="inline-flex items-center gap-1.5">
                  <ReligionIcon
                    className="w-3.5 h-3.5 shrink-0"
                    strokeWidth={2}
                  />
                  <span>{religion}</span>
                </div>
              )}

              {locationText && (
                <>
                  <span className="opacity-50">•</span>
                  <div className="inline-flex items-center gap-1.5 min-w-0">
                    <MapPin className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                    <span className="truncate max-w-[900px]">
                      {locationText}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick meta strip */}
        {!readOnly && (
          <div className="px-4 md:px-6 py-3 flex flex-wrap gap-x-5 gap-y-1.5 border-b border-[hsl(var(--border))] bg-white/60 dark:bg-[#1A1A1A]/60">
            {savedInMyList && (
              <span className="inline-flex flex-wrap items-center gap-2">
                {currentTag && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#C2A46D]/15 text-[#8B6F3A] text-[11px] font-semibold capitalize">
                    {String(currentTag).replace(/_/g, " ")}
                  </span>
                )}
                {localFamilyMain && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FDF6E3] border border-[#C2A46D]/40 text-[#7A5C1E] text-[11px] font-semibold">
                    <Star className="w-3 h-3 fill-[#C2A46D] text-[hsl(var(--primary))]" />
                    Family Main
                  </span>
                )}
                <button
                  onClick={() => setShowEdit(true)}
                  className="text-[11px] px-2 py-0.5 rounded-full border border-[#C2A46D]/40 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10"
                >
                  {currentTag ? "Edit" : "Add Tag"}
                </button>
              </span>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="sticky top-0 z-10 bg-[hsl(var(--background))]">
          <div className="px-3 py-2 md:px-5">
            <div className="flex gap-1 rounded-2xl p-1 bg-[hsl(var(--card))] border border-[hsl(var(--border))] dark:ring-[#2A2A2A] overflow-x-auto">
              {(
                [
                  ...(!readOnly
                    ? [{ key: "memories" as Tab, label: "Memories" }]
                    : []),
                  { key: "about" as Tab, label: "About" },
                  { key: "visit" as Tab, label: "Visit" },
                ] as Array<{ key: Tab; label: string }>
              ).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={[
                    "flex-1 min-w-fit px-3 py-2 rounded-xl text-[12px] md:text-[13px] font-semibold transition-colors whitespace-nowrap",
                    activeTab === t.key
                      ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm"
                      : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--card))]",
                  ].join(" ")}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="mx-4 md:mx-6 mt-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-[12px]">
            {errorMsg}
          </div>
        )}

        {/* Tab content */}
        <div className="px-4 pt-4 space-y-4 md:px-6">
          {/* ══ Memories tab ══════════════════════════════════════════════ */}
          {activeTab === "memories" && (
            <div>
              {memoriesLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--muted-foreground))]" />
                </div>
              ) : memories.length === 0 ? (
                <EmptyState
                  icon={ImageIcon}
                  title="No memories yet"
                  description={
                    <>
                      Tap{" "}
                      <span className="font-semibold text-[hsl(var(--primary))]">
                        + Add Memory
                      </span>{" "}
                      below to preserve your first moment here.
                    </>
                  }
                />
              ) : (
                <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {memories.map((m) => (
                    <MemoryCard
                      key={m._id ?? m.memoryId}
                      memory={m}
                      onDelete={handleDeleteMemory}
                      deleting={deletingMemory}
                      onClick={() => setSelectedMemory(m)}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* ══ About tab ═════════════════════════════════════════════════ */}
          {activeTab === "about" && (
            <AboutTab
              detail={institution}
              templeDetails={templeDetails}
              loading={templeDetailsLoading}
              generating={templeDetailsGenerating}
              religion={religion}
              locationText={locationText}
            />
          )}

          {/* ══ Visit tab ═════════════════════════════════════════════════ */}
          {activeTab === "visit" && (
            <VisitTab
              detail={institution}
              templeDetails={templeDetails}
              loading={templeDetailsLoading}
              generating={templeDetailsGenerating}
              mapsUrl={mapsUrl}
            />
          )}
        </div>
      </div>

      {/* Sticky FAB */}
      {!readOnly && (
        <button
          onClick={() => setShowAddMemory(true)}
          className="fixed bottom-24 right-5 md:bottom-8 md:right-[112px] z-40 inline-flex items-center gap-2 px-5 h-14 rounded-full bg-[hsl(var(--primary))] hover:opacity-90 text-[hsl(var(--primary-foreground))] font-semibold shadow-xl shadow-[#3D2E1F]/30 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2F3E8F]/30"
        >
          <Plus className="w-5 h-5" strokeWidth={2.2} />
          Add Memory
        </button>
      )}

      {/* Add Memory sheet — now receives persons from window API */}
      {!readOnly && showAddMemory && (
        <AddMemorySheet
          institutionId={institutionId}
          institutionName={institution.name}
          persons={persons}
          onClose={() => setShowAddMemory(false)}
          onSaved={() => {
            setShowAddMemory(false);
            refetchMemories();
            setActiveTab("memories");
          }}
        />
      )}

      <EditInstitutionModal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        institutionId={institutionId}
        currentTag={currentTag}
        currentFamilyMain={localFamilyMain}
        onUpdated={handleUpdateTag}
        onRefreshDetails={handleRefreshDetails}
      />

      {selectedMemory && (
        <FullPageMediaViewer
          memories={memories}
          currentIndex={Math.max(0, memories.findIndex((m) => (m._id || m.memoryId) === (selectedMemory._id || selectedMemory.memoryId)))}
          onNavigate={(index) => setSelectedMemory(memories[index])}
          onClose={() => setSelectedMemory(null)}
          onUpdate={() => refetchMemories()}
          onDelete={() => {
            setSelectedMemory(null);
            refetchMemories();
          }}
          treeId={activeTreeId || ""}
          currentUserId={user?.id || ""}
          currentUserName={user?.fullName || ""}
          persons={persons}
          readOnly={true}
        />
      )}
    </div>
  );
}

// ── About tab ─────────────────────────────────────────────────────────────────

function AboutTab({
  detail,
  templeDetails,
  loading,
  generating,
  religion,
  locationText,
}: {
  detail: any;
  templeDetails: TempleDetailsResponse | null;
  loading: boolean;
  generating: boolean;
  religion: string;
  locationText: string;
}) {
  const about = templeDetails?.about;
  
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] dark:ring-[#2A2A2A] p-4 space-y-2.5">
        {detail.deity && <FactRow label="Deity" value={detail.deity} />}
        {religion !== "Unknown" && (
          <FactRow label="Tradition" value={religion} />
        )}
        {detail.type && <FactRow label="Type" value={detail.type} />}
        {locationText && (
          <div className="flex items-start gap-2 text-[13px]">
            <MapPin className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))] mt-0.5 shrink-0" />
            <span className="text-[hsl(var(--foreground))]">
              {detail.location?.address ?? locationText}
            </span>
          </div>
        )}
      </div>

      {detail.overview && (
        <Section title="Overview" icon={Info}>
          <ExpandableText text={detail.overview} />
        </Section>
      )}

      {(loading || generating) && !about && (
        <TempleDetailsLoadingCard generating={generating} />
      )}

      {about && (
        <>
          {about.significance && (
            <Section title="Significance" icon={Star}>
              <ExpandableText text={about.significance} />
            </Section>
          )}
          {about.historicalBackground && (
            <Section title="Historical Background" icon={BookOpen}>
              <ExpandableText text={about.historicalBackground} />
            </Section>
          )}
          {about.culturalContext && (
            <Section title="Cultural Context" icon={Building}>
              <ExpandableText text={about.culturalContext} />
            </Section>
          )}
          {about.legendsAndBeliefs && (
            <Section title="Legends & Beliefs" icon={Scroll}>
              <ExpandableText text={about.legendsAndBeliefs} />
            </Section>
          )}
          {about.ritualsAndPractices && (
            <Section title="Rituals & Practices" icon={Flame}>
              <ExpandableText text={about.ritualsAndPractices} />
            </Section>
          )}
          {about.architecture && (
            <Section title="Architecture" icon={Building2}>
              <ExpandableText text={about.architecture} />
            </Section>
          )}
          {about.story && (
            <Section title="The Story" icon={Scroll}>
              <ExpandableText text={about.story} />
            </Section>
          )}
          {about.scriptureMentions && (
            <Section title="Scripture Mentions" icon={BookOpen}>
              <ExpandableText text={about.scriptureMentions} />
            </Section>
          )}
          {about.sources && about.sources.length > 0 && (
            <Section title="Sources" icon={ExternalLink}>
              <ul className="space-y-2">
                {about.sources.map((src, i) => (
                  <li key={i}>
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[12.5px] text-[hsl(var(--primary))] hover:underline"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      {src.title}
                    </a>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </>
      )}

      {!about && !loading && !generating && (
        <>
          {detail.significance && (
            <Section title="Significance" icon={Star}>
              <ExpandableText text={detail.significance} />
            </Section>
          )}
          {detail.history && (
            <Section title="History" icon={BookOpen}>
              <ExpandableText text={detail.history} />
            </Section>
          )}
          {detail.ritualsAndPractices && (
            <Section title="Rituals & Practices" icon={Flame}>
              <ExpandableText text={detail.ritualsAndPractices} />
            </Section>
          )}
          {detail.notableEvents && detail.notableEvents.length > 0 && (
            <Section title="Notable Events" icon={CalendarDays}>
              <ul className="space-y-2">
                {detail.notableEvents.map((ev: string, i: number) => (
                  <li
                    key={i}
                    className="text-[13px] leading-relaxed text-[hsl(var(--foreground))] dark:text-[#E5E5E5] pl-3 border-l-2 border-[#C2A46D]/50"
                  >
                    {ev}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

// ── Visit tab ─────────────────────────────────────────────────────────────────

function VisitTab({
  detail,
  templeDetails,
  loading,
  generating,
  mapsUrl,
}: {
  detail: any;
  templeDetails: TempleDetailsResponse | null;
  loading: boolean;
  generating: boolean;
  mapsUrl: string | null;
}) {
  const visit = templeDetails?.visit;
  const resolvedMapsUrl = templeDetails?.mapUrl ?? mapsUrl;
  const hasVisitInfo =
    detail.visitInfo?.serviceTiming?.regularServices?.length ||
    detail.visitInfo?.visitorTips ||
    detail.visitInfo?.howToReach;

  return (
    <div className="space-y-4">
      {(loading || generating) && !visit && (
        <TempleDetailsLoadingCard generating={generating} />
      )}

      {visit && (
        <>
          {(visit.timings?.open || visit.timings?.close) && (
            <Section title="Timings" icon={Clock}>
              <div className="space-y-2">
                {visit.timings.open && (
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-[hsl(var(--muted-foreground))]">
                      Morning
                    </span>
                    <span className="font-semibold text-[hsl(var(--primary))]">
                      {visit.timings.open}
                    </span>
                  </div>
                )}
                {visit.timings.close && (
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-[hsl(var(--muted-foreground))]">
                      Evening
                    </span>
                    <span className="font-semibold text-[hsl(var(--primary))]">
                      {visit.timings.close}
                    </span>
                  </div>
                )}
                {visit.timings.notes && (
                  <p className="text-[11.5px] text-[hsl(var(--muted-foreground))] italic mt-2 leading-relaxed">
                    {visit.timings.notes}
                  </p>
                )}
              </div>
            </Section>
          )}
          {visit.bestTimeToVisit && (
            <Section title="Best Time to Visit" icon={Sun}>
              <p className="text-[13px] leading-relaxed text-[hsl(var(--foreground))] dark:text-[#E5E5E5]">
                {visit.bestTimeToVisit}
              </p>
            </Section>
          )}
          {visit.peakDays && visit.peakDays.length > 0 && (
            <Section title="Peak Days" icon={CalendarDays}>
              <ul className="space-y-1.5">
                {visit.peakDays.map((day, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-[13px] text-[hsl(var(--foreground))] dark:text-[#E5E5E5]"
                  >
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#C2A46D] shrink-0" />
                    {day.replace(/^\*\*/, "").replace(/\*\*$/, "")}
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {visit.darshanInfo && (
            <Section title="Darshan Info" icon={Info}>
              <p className="text-[13px] leading-relaxed text-[hsl(var(--foreground))] dark:text-[#E5E5E5]">
                {visit.darshanInfo}
              </p>
            </Section>
          )}
          {visit.dressCode && (
            <Section title="Dress Code" icon={ShieldCheck}>
              <p className="text-[13px] leading-relaxed text-[hsl(var(--foreground))] dark:text-[#E5E5E5]">
                {visit.dressCode}
              </p>
            </Section>
          )}
          {visit.travelTips && visit.travelTips.length > 0 && (
            <Section title="Travel Tips" icon={Compass}>
              <ul className="space-y-2.5">
                {visit.travelTips.map((tip, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-[13px] leading-relaxed text-[hsl(var(--foreground))] dark:text-[#E5E5E5]"
                  >
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#C2A46D] shrink-0" />
                    {tip.replace(/\*\*[^*]+\*\*:?\s?/, (m) =>
                      m.replace(/\*\*/g, ""),
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {visit.nearbyPlaces && visit.nearbyPlaces.length > 0 && (
            <Section title="Nearby Places" icon={MapPin}>
              <ul className="space-y-2.5">
                {visit.nearbyPlaces.map((place, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-[13px] leading-relaxed text-[hsl(var(--foreground))] dark:text-[#E5E5E5] pl-3 border-l-2 border-[#C2A46D]/40"
                  >
                    {place.replace(/^\*\*/, "").replace(/\*\*:?\s?/, ": ")}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </>
      )}

      {!visit && !loading && !generating && (
        <>
          {detail.visitInfo?.serviceTiming?.regularServices?.length > 0 && (
            <Section title="Service Timings" icon={Clock}>
              <ul className="divide-y divide-[#E2DBCE]/60 dark:divide-[#2A2A2A]">
                {detail.visitInfo.serviceTiming.regularServices.map(
                  (s: any, i: number) => (
                    <li
                      key={i}
                      className="py-2.5 flex items-start justify-between gap-3"
                    >
                      <div>
                        <p className="text-[13px] font-semibold text-[hsl(var(--foreground))]">
                          {s.name}
                        </p>
                        {s.frequency && (
                          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                            {s.frequency}
                          </p>
                        )}
                      </div>
                      <span className="text-[12px] font-medium text-[hsl(var(--primary))] shrink-0">
                        {s.time}
                      </span>
                    </li>
                  ),
                )}
              </ul>
            </Section>
          )}
          {detail.visitInfo?.visitorTips && (
            <Section title="Visitor Tips" icon={Info}>
              <p className="text-[13px] leading-relaxed text-[hsl(var(--foreground))] dark:text-[#E5E5E5] whitespace-pre-line">
                {detail.visitInfo.visitorTips}
              </p>
            </Section>
          )}
          {detail.visitInfo?.howToReach && (
            <Section title="How to Reach" icon={MapPin}>
              <p className="text-[13px] leading-relaxed text-[hsl(var(--foreground))] dark:text-[#E5E5E5] whitespace-pre-line">
                {detail.visitInfo.howToReach}
              </p>
            </Section>
          )}
          {!hasVisitInfo && (
            <EmptyState
              icon={CalendarDays}
              title="No visit info yet"
              description="Visiting details aren't available for this institution yet."
            />
          )}
        </>
      )}

      {resolvedMapsUrl && (
        <a
          href={resolvedMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] dark:ring-[#2A2A2A] hover:bg-[hsl(var(--primary))]/5 transition-colors group"
        >
          <div className="shrink-0 w-9 h-9 rounded-xl bg-[#C2A46D]/15 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-[#8B6F3A]" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[hsl(var(--foreground))]">
              View on Google Maps
            </p>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))] truncate">
              {resolvedMapsUrl}
            </p>
          </div>
          <ExternalLink className="w-4 h-4 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))] transition-colors shrink-0" />
        </a>
      )}
    </div>
  );
}

// ── Temple details loading / generating card ──────────────────────────────────

function TempleDetailsLoadingCard({ generating }: { generating: boolean }) {
  return (
    <div className="rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--primary))]/30 p-5 flex items-start gap-3">
      <div className="shrink-0 w-8 h-8 rounded-xl bg-[#C2A46D]/15 flex items-center justify-center">
        {generating ? (
          <RefreshCw className="w-4 h-4 text-[#8B6F3A] animate-spin" />
        ) : (
          <Loader2 className="w-4 h-4 text-[#8B6F3A] animate-spin" />
        )}
      </div>
      <div className="flex-1 space-y-2">
        <p className="text-[13px] font-semibold text-[hsl(var(--foreground))]">
          {generating
            ? "Generating detailed information…"
            : "Loading temple details…"}
        </p>
        <p className="text-[11.5px] text-[hsl(var(--muted-foreground))]">
          {generating
            ? "We're researching this place for you. This may take a moment."
            : "Please wait while we fetch the details."}
        </p>
        <div className="space-y-1.5 pt-1">
          <div className="h-2.5 w-3/4 rounded bg-[hsl(var(--muted))] animate-pulse" />
          <div className="h-2.5 w-full rounded bg-[hsl(var(--muted))] animate-pulse" />
          <div className="h-2.5 w-2/3 rounded bg-[hsl(var(--muted))] animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] dark:ring-[#2A2A2A] p-4">
      <h3 className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3">
        {Icon && <Icon className="w-3 h-3" strokeWidth={2} />}
        {title}
      </h3>
      {children}
    </section>
  );
}

function FactRow({ label, value }: { label: string; value: string }) {

  return (
    <p className="text-[13px] flex gap-2">
      <span className="text-[hsl(var(--muted-foreground))] shrink-0">
        {label}:
      </span>
      <span className="text-[hsl(var(--foreground))] capitalize">{value}</span>
    </p>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] dark:ring-[#2A2A2A] p-8 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[hsl(var(--primary))]/10 mb-3">
        <Icon
          className="w-6 h-6 text-[hsl(var(--primary))]"
          strokeWidth={1.8}
        />
      </div>
      <h3 className="text-[15px] font-semibold text-[hsl(var(--foreground))] mb-1">
        {title}
      </h3>
      <p className="text-[13px] text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
        {description}
      </p>
    </div>
  );
}

function MemoryCard({
  memory,
  onDelete,
  deleting,
  onClick,
}: {
  memory: any;
  onDelete: (id: string) => void;
  deleting: boolean;
  onClick: () => void;
}) {
  const storePersons = useNeo4jTreeStore((state) => state.persons);
  const activePersons = storePersons.filter((p: any) => !p.isDeleted);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const firstFile = memory.files?.[0];
  const thumbnailImg = firstFile?.thumbnailSignedUrl || firstFile?.thumbnailUrl || memory.thumbnailUrl;
  const thumb = thumbnailImg || memory.mediaUrls?.[0] || firstFile?.signedUrl || firstFile?.fileUrl || memory.mediaUrl || "";
  const isText = memory.memoryType === "text" || (!thumb && (memory.textdata || memory.textContent || firstFile?.textContent));
  const memoryId = memory._id || memory.memoryId;

  const isVideo = firstFile?.fileType?.startsWith("video/") ||
    (typeof (firstFile?.signedUrl || firstFile?.fileUrl || memory.mediaUrl) === "string" && (
      (firstFile?.signedUrl || firstFile?.fileUrl || memory.mediaUrl).toLowerCase().split('?')[0].endsWith(".mp4") ||
      (firstFile?.signedUrl || firstFile?.fileUrl || memory.mediaUrl).toLowerCase().split('?')[0].endsWith(".mov") ||
      (firstFile?.signedUrl || firstFile?.fileUrl || memory.mediaUrl).toLowerCase().split('?')[0].endsWith(".webm")
    ));

  const rawTagged: { name: string; id: string }[] =
    memory.taggedPeople ||
    memory.files?.[0]?.taggedPeople ||
    memory.taggedPersons?.map(p => ({ id: p.personId, name: `${p.firstName} ${p.lastName}` })) ||
    memory.files?.[0]?.taggedPersons?.map((p: any) => ({ id: p.personId || p.id, name: p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim() })) ||
    [];

  const taggedPeople = activePersons.length > 0
    ? rawTagged.filter(p => activePersons.some(ap => ap.personId === p.id))
    : rawTagged;

  return (
    <li
      onClick={onClick}
      className="group relative rounded-xl overflow-hidden bg-[hsl(var(--card))] border border-[hsl(var(--border))] dark:ring-[#2A2A2A] cursor-pointer"
    >
      <div className="relative w-full aspect-square bg-[#E2DBCE]/40 dark:bg-[#252525] overflow-hidden">
        {isVideo ? (
          <div className="relative w-full h-full">
            {thumbnailImg ? (
              <img
                src={thumbnailImg}
                loading="lazy"
                className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <video
                src={firstFile?.signedUrl || firstFile?.fileUrl || memory.mediaUrl}
                className="object-cover w-full h-full"
                preload="metadata"
                playsInline
                muted
              />
            )}
            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/35 transition-colors">
              <div className="w-10 h-10 rounded-full bg-white/35 backdrop-blur-md flex items-center justify-center border border-white/40 shadow-lg">
                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
              </div>
            </div>
          </div>
        ) : thumb ? (
          <img
            src={thumb}
            loading="lazy"
            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[hsl(var(--muted-foreground))]/50">
            {isText ? (
              <div className="flex flex-col items-center gap-1.5">
                <FileText className="w-8 h-8 text-blue-500" strokeWidth={1.5} />
                <span className="text-[10px] font-semibold text-[#8B7355] dark:text-[#999]">Text Memory</span>
              </div>
            ) : (
              <ImageIcon className="w-8 h-8" strokeWidth={1.5} />
            )}
          </div>
        )}

        {/* Tagged people pill — bottom-left overlay on the image */}
        {taggedPeople.length > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-2 py-1 rounded-full bg-black/55 backdrop-blur-sm z-10"
                >
                  <Users
                    className="w-2.5 h-2.5 text-white shrink-0"
                    strokeWidth={2}
                  />

                  <span className="text-[10px] text-white font-medium leading-none truncate max-w-[80px]">
                    {taggedPeople.length === 1
                      ? taggedPeople[0].name.split(" ")[0]
                      : `${taggedPeople[0].name.split(" ")[0]} +${taggedPeople.length - 1}`}
                  </span>
                </button>
              </TooltipTrigger>

              <TooltipContent side="top" className="max-w-[220px]">
                <div className="space-y-1">
                  <p className="text-xs font-semibold">Tagged People</p>

                  {taggedPeople.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center gap-2 text-xs"
                    >
                      <Users className="w-3 h-3" />
                      <span>{person.name}</span>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {!confirmOpen && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setConfirmOpen(true);
            }}
            className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-black/50 text-[hsl(var(--primary-foreground))] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity z-10"
            aria-label="Delete memory"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        {confirmOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2 bg-black/70 z-20"
          >
            <p className="text-[hsl(var(--primary-foreground))] text-[11px] font-semibold text-center">
              {isText ? "Delete this text memory?" : "Delete this memory?"}
            </p>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmOpen(false);
                }}
                className="px-3 py-1 rounded-lg bg-white/20 text-[hsl(var(--primary-foreground))] text-[11px] font-semibold hover:bg-white/30"
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmOpen(false);
                  onDelete(memoryId);
                }}
                disabled={deleting}
                className="px-3 py-1 rounded-lg bg-red-500 text-[hsl(var(--primary-foreground))] text-[11px] font-semibold hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="px-2.5 py-2 space-y-1">
        <p className="text-[11px] md:text-[12px] font-semibold text-[hsl(var(--foreground))] line-clamp-1">
          {memory.title}
        </p>
        {memory.festival && (
          <p className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#C2A46D]/15 text-[#8B6F3A]">
            <Flame className="w-2.5 h-2.5" strokeWidth={2} />
            {memory.festival}
          </p>
        )}
        {memory.ritual && (
          <p className="inline-flex items-center gap-1 text-[10px] text-[hsl(var(--muted-foreground))]">
            <Sparkle className="w-2.5 h-2.5 shrink-0" strokeWidth={2} />
            <span className="truncate">{memory.ritual}</span>
          </p>
        )}
        {memory.description && (
          <p className="text-[10px] text-[hsl(var(--muted-foreground))] line-clamp-2 leading-relaxed">
            {memory.description}
          </p>
        )}
        {/* {memory.date && (
          <p className="text-[10px] text-[hsl(var(--muted-foreground))]/70">
            {(() => {
              try {
                const d = new Date(memory.date);
                if (isNaN(d.getTime())) return memory.date;
                const dd = String(d.getDate()).padStart(2, "0");
                const mm = String(d.getMonth() + 1).padStart(2, "0");
                const yy = String(d.getFullYear()).slice(-2);
                return `${dd}-${mm}-${yy}`;
              } catch {
                return memory.date;
              }
            })()}
          </p>
        )} */}
        {memory.date && (
          <p className="text-[10px] text-[hsl(var(--muted-foreground))]/70">
            {(() => {
              try {
                const d = new Date(memory.date);
                if (isNaN(d.getTime())) return memory.date;

                const dd = String(d.getDate()).padStart(2, "0");
                const mm = String(d.getMonth() + 1).padStart(2, "0");
                const yyyy = d.getFullYear();

                return `${dd}-${mm}-${yyyy}`;
              } catch {
                return memory.date;
              }
            })()}
          </p>
        )}
      </div>
    </li>
  );
}

function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 280;
  const long = text.length > LIMIT;
  return (
    <div>
      <p className="text-[13px] leading-relaxed text-[hsl(var(--foreground))] dark:text-[#E5E5E5] whitespace-pre-line">
        {long && !expanded ? text.slice(0, LIMIT).trimEnd() + "…" : text}
      </p>
      {long && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-semibold text-[hsl(var(--primary))] hover:underline"
        >
          {expanded ? (
            <>
              {" "}
              Show less <ChevronUp className="w-3.5 h-3.5" />{" "}
            </>
          ) : (
            <>
              {" "}
              Read more <ChevronDown className="w-3.5 h-3.5" />{" "}
            </>
          )}
        </button>
      )}
    </div>
  );
}
