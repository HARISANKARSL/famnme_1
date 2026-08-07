/**
 * Sidebar — B2 reorganization
 *
 * Four primary sections (HOME / FAMILY / HERITAGE / COMMUNITY) with visible
 * sub-items when a section is active. Single-color icon system (gray, indigo
 * when active). Gold left-bar accent marks the active sub-item.
 *
 * Footer: Settings · Help · Feedback.
 */
import { useState, useEffect } from "react";
import { AppTooltip } from "@/components/ui/AppTooltip";
import {
  Home,
  Users,
  Landmark,
  MessageCircle,
  Fingerprint,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Rss,
  Gem,
  Network,
  List,
  LayoutDashboard,
  Image,
  Sparkles,
  MapPinned,
  Newspaper,
  UserPlus,
  MessageSquareText,
  Settings,
  HelpCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLocation } from "react-router-dom";

export interface FamilyRoot {
  personId: string;
  name: string;
  initials: string;
}

export interface SidebarProps {
  currentTreeName?: string;
  homePersonPhotoUrl?: string | null;
  activeView?: "home" | "tree" | "heritage";
  showDailyShare?: boolean;
  showMemories?: boolean;
  showTemples?: boolean;
  showFamily?: boolean;
  showAllPeople?: boolean;
  showOverview?: boolean;
  onGoHome?: () => void;
  onGoTree?: () => void;
  onOpenTreeManager?: () => void;
  onOpenActivityFeed?: () => void;
  onOpenGridSettings?: () => void;
  onOpenBookmarks?: () => void;
  onOpenMemories?: () => void;
  onOpenAllPeople?: () => void;
  onOpenOverview?: () => void;
  onOpenTemples?: () => void;
  onOpenDailyShare?: () => void;
  onOpenFeedback?: () => void;
  onOpenSettings?: () => void;
  onOpenHelp?: () => void;
  onOpenTodayOnTree?: () => void;
  // Discover section
  onOpenMigrationMap?: () => void;
  showHeritage?: boolean;
  // Heritage sub-pages
  onOpenHeritage?: () => void;
  onOpenFestivals?: () => void;
  onOpenSacred?: () => void;
  onOpenTimeline?: () => void;
  onOpenStatistics?: () => void;
  onOpenRelationshipPath?: () => void;
  onOpenSuggestions?: () => void;
  onOpenDuplicateDetection?: () => void;
  onOpenDescendancyList?: () => void;
  // Collaborate section
  onOpenInviteCollaborator?: () => void;
  onOpenSources?: () => void;
  /** True when a tree is loaded (shows Family/Heritage sub-items) */
  isTreeLoaded?: boolean;
}

type SubItem = {
  id: string;
  icon: LucideIcon;
  label: string;
  action?: () => void;
  active?: boolean;
  show?: boolean;
};

type Section = {
  id: "home" | "family" | "your-identity" | "heritage" | "community";
  icon: LucideIcon;
  label: string;
  active: boolean;
  subItems: SubItem[];
};

export function Sidebar({
  currentTreeName = "Family Tree",
  activeView = "home",
  showDailyShare = false,
  showMemories = false,
  showTemples = false,
  showFamily = false,
  showAllPeople = false,
  showOverview = false,
  onGoHome,
  onGoTree,
  onOpenTreeManager,
  onOpenMemories,
  onOpenAllPeople,
  onOpenOverview,
  onOpenTemples,
  onOpenDailyShare,
  onOpenFeedback,
  onOpenSettings,
  onOpenHelp,
  onOpenTodayOnTree,
  onOpenMigrationMap,
  onOpenHeritage,
  onOpenFestivals,
  onOpenSacred,
  onOpenInviteCollaborator,
  isTreeLoaded = false,
}: SidebarProps) {
  const location = useLocation();

  const [isExpanded, setIsExpanded] = useState(() => {
    try {
      return localStorage.getItem("sidebar-expanded") !== "false";
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("sidebar-expanded", String(isExpanded));
    } catch {
      /* noop */
    }
  }, [isExpanded]);

  // Accordion expansion: only one section's sub-items are visible at a time.
  // On page load, auto-open the section that matches the current URL so the
  // submenu stays visible after a cross-page navigation (e.g. Dashboard →
  // /heritage reloads the Sidebar from scratch).
  const [expandedSection, setExpandedSection] = useState<Section["id"] | null>(
    () => {
      try {
        const path = window.location.pathname;
        if (path.includes("/heritage") || path === "/migration")
          return "heritage";
        if (path.includes("/people") || path.includes("/trees"))
          return "family";
        return null;
      } catch {
        return null;
      }
    },
  );

  // Publish current sidebar width as a CSS variable so full-screen overlay
  // pages (TreeOverview, AllPeoplePanel, etc.) can leave room for it on
  // desktop via `.shell-overlay` instead of covering it.
  useEffect(() => {
    const set = () => {
      const root = document.documentElement;
      // <md (768px): sidebar is hidden, so no offset.
      if (window.matchMedia("(max-width: 767px)").matches) {
        root.style.setProperty("--app-sidebar-width", "0px");
      } else {
        root.style.setProperty(
          "--app-sidebar-width",
          isExpanded ? "248px" : "68px",
        );
      }
    };
    set();
    window.addEventListener("resize", set);
    return () => {
      window.removeEventListener("resize", set);
      document.documentElement.style.removeProperty("--app-sidebar-width");
    };
  }, [isExpanded]);

  // Family contains: Tree canvas, All people, Overview, Memories.
  // The parent Family section is "active" when any of those sub-views are open.
  // The "Tree canvas" sub-item is only active when the user is *on* the canvas
  // (none of the other sub-views are open) — otherwise the canvas highlight
  // would persist alongside the highlight on whichever sub-view is open.
  const anyFamilySubActive = showMemories || showAllPeople || showOverview;
  const onCanvas =
    activeView === "tree" &&
    !showDailyShare &&
    !anyFamilySubActive &&
    !showTemples;

  const homeActive =
    activeView === "home" &&
    !showDailyShare &&
    !anyFamilySubActive &&
    !showFamily &&
    !showTemples &&
    !location.pathname.startsWith("/heritage");
  const familyActive = showFamily || anyFamilySubActive || onCanvas;
  const yourIdentityActive = showTemples;
  const heritageActive =
    activeView === "heritage" ||
    location.pathname.startsWith("/heritage");
  const communityActive = showDailyShare;

  useEffect(() => {
    const path = location.pathname;
    if (path.includes("/heritage") || path === "/migration" || heritageActive) {
      setExpandedSection("heritage");
    } else if (path.includes("/people") || path.includes("/trees") || familyActive) {
      setExpandedSection("family");
    } else if (homeActive) {
      setExpandedSection("home");
    }
  }, [location.pathname, familyActive, homeActive, heritageActive]);

  const sections: Section[] = [
    {
      id: "home",
      icon: Home,
      label: "Home",
      active: homeActive,
      subItems: [
        {
          id: "feed",
          icon: Rss,
          label: "Feed",
          action: onGoHome,
          active: homeActive,
          show: true,
        },
        // { id: 'today', icon: Gem, label: 'Today on your tree', action: onOpenTodayOnTree ?? onGoHome, show: true },
      ],
    },
    {
      id: "family",
      icon: Users,
      label: "Family",
      active: familyActive,
      subItems: [
        {
          id: "canvas",
          icon: Network,
          label: "Tree canvas",
          action: onGoTree,
          active: onCanvas,
          show: true,
        },
        {
          id: "people",
          icon: List,
          label: "All people",
          action: onOpenAllPeople,
          active: showAllPeople,
          show: !!onOpenAllPeople,
        },
        {
          id: "overview",
          icon: LayoutDashboard,
          label: "Overview",
          action: onOpenOverview,
          active: showOverview,
          show: !!onOpenOverview,
        },
        {
          id: "memories",
          icon: Image,
          label: "Memories",
          action: onOpenMemories,
          active: showMemories,
          show: !!onOpenMemories,
        },
      ],
    },
    // {
    //   id: 'your-identity',
    //   icon: Fingerprint,
    //   label: 'Your Identity',
    //   active: yourIdentityActive,
    //   subItems: [],
    // },
    {
      id: "heritage",
      icon: Landmark,
      label: "Heritage",
      active: heritageActive,
      subItems: [
        // { id: 'sacred', icon: Landmark, label: 'Sacred Places', action: onOpenSacred, show: !!onOpenSacred },
        {
          id: "sacred",
          icon: Landmark,
          label: "Sacred Places",
          action: onOpenSacred,
          active: location.pathname === "/heritage/sacred",
          show: !!onOpenSacred,
        },
        // { id: 'festivals', icon: Sparkles, label: 'Festivals', action: onOpenFestivals, show: !!onOpenFestivals },
        // { id: 'migration', icon: MapPinned, label: 'Migration',       action: onOpenMigrationMap, show: !!onOpenMigrationMap },
      ],
    },
    // {
    //   id: 'community',
    //   icon: MessageCircle,
    //   label: 'Community',
    //   active: communityActive,
    //   subItems: [
    //     { id: 'dailyshare',    icon: Newspaper, label: 'Daily Share',    action: onOpenDailyShare,      active: showDailyShare, show: !!onOpenDailyShare },
    //     { id: 'collaborators', icon: UserPlus,  label: 'Collaborators',  action: onOpenInviteCollaborator, show: !!onOpenInviteCollaborator },
    //   ],
    // },
  ];

  const itemBase =
    "group relative flex items-center w-full rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F3E8F]/40";
  const sectionBtnCls = (active: boolean) =>
    `${itemBase} ${isExpanded ? "gap-3 px-3 py-2" : "p-2.5 justify-center"} ${active
      ? "bg-[#2F3E8F]/[0.06] dark:bg-white/[0.06] text-[#2F3E8F] dark:text-[#8CA0FF]"
      : "hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-[#5B5449] dark:text-[#B8B8B8]"
    }`;

  const renderSection = (section: Section) => {
    const Icon = section.icon;
    const visibleSubItems = section.subItems.filter((s) => s.show !== false);
    // Accordion: sub-items show only for the currently-expanded section.
    const showSubs =
      isExpanded &&
      expandedSection === section.id &&
      visibleSubItems.length > 0;

    const sectionPrimaryAction = () => {
      // Clicking a section header always keeps its submenu open AND navigates
      // to the section's main page. Never collapses on click.
      setExpandedSection(section.id);
      if (section.id === "home") {
        onGoHome?.();
        return;
      }
      if (section.id === "family") {
        onGoTree?.();
        return;
      }
      if (section.id === "your-identity") {
        onOpenTemples?.();
        return;
      }
      if (section.id === "heritage") {
        onOpenHeritage?.();
        return;
      }
      const first = visibleSubItems[0];
      first?.action?.();
    };

    const sectionBtn = (
      <button
        type="button"
        onClick={sectionPrimaryAction}
        data-tutorial={`sidebar-${section.id}`}
        aria-expanded={showSubs}
        className={sectionBtnCls(section.active)}
      >
        <Icon
          className={`w-[18px] h-[18px] shrink-0 ${section.active
            ? "text-[#2F3E8F] dark:text-[#8CA0FF]"
            : "text-[#8B7355] dark:text-[#888]"
            }`}
          strokeWidth={section.active ? 2.1 : 1.8}
        />
        {isExpanded && (
          <>
            <span
              className={`text-[13px] leading-tight truncate flex-1 text-left ${section.active ? "font-semibold" : "font-medium"
                }`}
            >
              {section.label}
            </span>
            {visibleSubItems.length > 0 && (
              <ChevronDown
                className={`w-3.5 h-3.5 shrink-0 text-[#8B7355]/60 dark:text-[#888] transition-transform duration-200 ${showSubs ? "rotate-180" : ""}`}
              />
            )}
          </>
        )}
      </button>
    );

    return (
      <div key={section.id} className="space-y-0.5">
        {isExpanded ? (
          sectionBtn
        ) : (
          <AppTooltip content={section.label} side="right">
            {sectionBtn}
          </AppTooltip>
        )}
        {showSubs && (
          <div className="ml-2 pl-3 border-l border-[#E2DBCE]/70 dark:border-[#2a2a2a] space-y-0.5 py-0.5">
            {visibleSubItems.map((sub) => {
              const SIcon = sub.icon;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={sub.action}
                  aria-current={sub.active ? "page" : undefined}
                  className={`relative flex items-center gap-2 w-full rounded-lg px-2.5 py-1.5 text-[12.5px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F3E8F]/40 ${sub.active
                    ? "text-[#3D2E1F] dark:text-[#F3F2F1] font-semibold bg-[#C2A46D]/[0.10] dark:bg-[#C2A46D]/[0.12]"
                    : "text-[#5B5449] dark:text-[#999] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] font-medium"
                    }`}
                >
                  {sub.active && (
                    <span
                      aria-hidden="true"
                      className="absolute -left-3 top-1.5 bottom-1.5 w-[2.5px] rounded-full bg-[#C2A46D]"
                    />
                  )}
                  <SIcon
                    className={`w-3.5 h-3.5 shrink-0 ${sub.active
                      ? "text-[#2F3E8F] dark:text-[#8CA0FF]"
                      : "text-[#8B7355]/80 dark:text-[#777]"
                      }`}
                    strokeWidth={sub.active ? 2 : 1.7}
                  />
                  <span className="truncate">{sub.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderFooterItem = (
    label: string,
    Icon: LucideIcon,
    action?: () => void,
  ) => {
    const btn = (
      <button
        type="button"
        onClick={action}
        className={`${itemBase} ${isExpanded ? "gap-3 px-3 py-2" : "p-2.5 justify-center"} text-[#5B5449] dark:text-[#888] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]`}
      >
        <Icon
          className="w-[17px] h-[17px] shrink-0 text-[#8B7355] dark:text-[#888]"
          strokeWidth={1.8}
        />
        {isExpanded && (
          <span className="text-[13px] font-medium truncate">{label}</span>
        )}
      </button>
    );
    return isExpanded ? (
      btn
    ) : (
      <AppTooltip key={label} content={label} side="right">
        {btn}
      </AppTooltip>
    );
  };

  return (
    <aside
      className={`
        ${isExpanded ? "w-[248px]" : "w-[68px]"}
        bg-white/60 dark:bg-[#0a0a0a]/60
        backdrop-blur-sm
        border-r border-[#E2DBCE]/60 dark:border-[#2A2A2A]
        hidden md:flex flex-col
        transition-[width] duration-200 ease-in-out
        overflow-hidden
      `}
    >
      {/* Header: tree switcher */}
      <div
        className={`flex items-center shrink-0 ${isExpanded ? "px-3 pt-4 pb-3" : "flex-col gap-1.5 px-2 pt-4 pb-3"}`}
      >
        {isExpanded ? (
          <>
            <button
              onClick={onOpenTreeManager}
              className="flex items-center gap-2.5 flex-1 min-w-0 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.04] px-2 py-1.5 transition-colors"
              aria-label={`${currentTreeName}. Click to switch trees.`}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2F3E8F] to-[#4B2C5E] flex items-center justify-center shadow-sm shrink-0">
                <img
                  src="/logo.png"
                  alt="FC"
                  className="object-contain w-5 h-5"
                />
              </div>
              <span className="text-[14px] font-semibold font-display text-[#3D2E1F] dark:text-[#F3F2F1] truncate">
                {currentTreeName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 shrink-0 text-[#8B7355] dark:text-[#888]" />
            </button>
            <AppTooltip content="Collapse sidebar" side="right">
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1.5 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-[#8B7355] dark:text-[#666] transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F3E8F]/40"
                aria-label="Collapse sidebar"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
            </AppTooltip>
          </>
        ) : (
          <>
            <button
              onClick={onOpenTreeManager}
              className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#2F3E8F] to-[#4B2C5E] flex items-center justify-center shadow-sm shrink-0 overflow-hidden hover:shadow-md transition-shadow"
              aria-label={currentTreeName}
            >
              <img
                src="/logo.png"
                alt="FC"
                className="object-contain w-6 h-6"
              />
            </button>
            <AppTooltip content="Expand sidebar" side="right">
              <button
                onClick={() => setIsExpanded(true)}
                className="p-1.5 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-[#8B7355] dark:text-[#666] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F3E8F]/40"
                aria-label="Expand sidebar"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </AppTooltip>
          </>
        )}
      </div>

      {/* Sections */}
      <nav className="flex-1 px-2 py-1 space-y-2 overflow-y-auto scrollbar-hide">
        {sections.map((section, idx) => {
          // Only show Heritage/Community sections with sub-items if tree is loaded (avoids dead entries)
          if (
            !isTreeLoaded &&
            (section.id === "heritage" || section.id === "community")
          ) {
            // Still render top-level to preserve the 4-section structure visually; disable if no tree
          }
          return (
            <div key={section.id}>
              {renderSection(section)}
              {idx < sections.length - 1 && isExpanded && (
                <div className="my-1 h-px bg-[#E2DBCE]/40 dark:bg-[#2A2A2A]/60 mx-3" />
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer: Settings · Help · Feedback */}
      <div className="py-2 px-2 shrink-0 border-t border-[#E2DBCE]/40 dark:border-[#2A2A2A] space-y-0.5">
        {renderFooterItem("Settings", Settings, onOpenSettings)}
        {/* {renderFooterItem('Help', HelpCircle, onOpenHelp)} */}
        {renderFooterItem('Feedback', MessageSquareText, onOpenFeedback)}
      </div>
    </aside>
  );
}
