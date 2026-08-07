import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Plus, MoreHorizontal, LayoutGrid, List, Clock, BookOpen, FolderOpen, Pencil, Play, MessageSquare, Type, GitBranch, Download, MapPin, Landmark, Archive, Trash2, Heart } from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';
import { BottomSheet } from '@/components/ui/BottomSheet';

type ViewMode = 'grid' | 'list' | 'timeline' | 'albums' | 'lifePhase' | 'map' | 'for-you' | 'interviews' | 'trash' | 'archived' | 'stories';

interface MemoriesHeaderProps {
  counts: Record<string, number>;
  albumCount: number;
  storyCount: number;
  personName?: string;
  elderMode?: boolean;
  onBack: () => void;
  onAddMemory: () => void;
  onCreateStory: () => void;
  onCreateAlbum: () => void;
  onInterview?: () => void;
  onSlideshow?: () => void;
  onToggleElderMode?: () => void;
  onParallelTimeline?: () => void;
  onExportBook?: () => void;
  onPilgrimageStory?: () => void;
  viewMode?: ViewMode;
  onSetViewMode?: (mode: ViewMode) => void;
}

const MOBILE_VIEW_MODES: Array<{ value: ViewMode; icon: typeof LayoutGrid }> = [
  { value: 'grid', icon: LayoutGrid },
  { value: 'list', icon: List },
  { value: 'timeline', icon: Clock },
];

export function MemoriesHeader({
  counts, albumCount, storyCount, personName, elderMode,
  onBack, onAddMemory, onCreateStory, onCreateAlbum,
  onInterview, onSlideshow, onToggleElderMode,
  onParallelTimeline, onExportBook, onPilgrimageStory,
  viewMode = 'grid', onSetViewMode,
}: MemoriesHeaderProps) {
  const { isMobile } = useResponsive();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const total = counts.total ?? (counts.photo || 0) + (counts.video || 0) + (counts.audio || 0) + (counts.text || 0);

  // Close add menu on outside click
  useEffect(() => {
    if (!showAddMenu) return;
    const handler = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setShowAddMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAddMenu]);

  const moreActions = [
    onCreateAlbum && { label: 'Create Album', icon: FolderOpen, action: () => { onCreateAlbum(); setShowMoreMenu(false); } },
    onCreateStory && { label: 'Write a Story', icon: Pencil, action: () => { onCreateStory(); setShowMoreMenu(false); } },
    onSetViewMode && { label: 'For You', icon: BookOpen, action: () => { onSetViewMode('for-you'); setShowMoreMenu(false); }, active: viewMode === 'for-you' },
    onSetViewMode && { label: 'Albums View', icon: FolderOpen, action: () => { onSetViewMode('albums'); setShowMoreMenu(false); }, active: viewMode === 'albums' },
    onSetViewMode && { label: 'Map View', icon: MapPin, action: () => { onSetViewMode('map'); setShowMoreMenu(false); }, active: viewMode === 'map' },
    onSlideshow && { label: 'Slideshow', icon: Play, action: () => { onSlideshow(); setShowMoreMenu(false); } },
    onInterview && { label: 'Interview an Elder', icon: MessageSquare, action: () => { onInterview(); setShowMoreMenu(false); } },
    onParallelTimeline && { label: 'Compare Timelines', icon: GitBranch, action: () => { onParallelTimeline(); setShowMoreMenu(false); } },
    onPilgrimageStory && { label: 'Pilgrimage Story', icon: Landmark, action: () => { onPilgrimageStory(); setShowMoreMenu(false); } },
    onExportBook && { label: 'Export Memory Book', icon: Download, action: () => { onExportBook(); setShowMoreMenu(false); } },
    onSetViewMode && { label: 'Archived', icon: Archive, action: () => { onSetViewMode('archived'); setShowMoreMenu(false); }, active: viewMode === 'archived' },
    onSetViewMode && { label: 'Trash', icon: Trash2, action: () => { onSetViewMode('trash'); setShowMoreMenu(false); }, active: viewMode === 'trash' },
    onToggleElderMode && { label: elderMode ? 'Normal Mode' : 'Elder-Friendly Mode', icon: Type, action: () => { onToggleElderMode(); setShowMoreMenu(false); }, active: elderMode },
  ].filter(Boolean) as Array<{ label: string; icon: typeof LayoutGrid; action: () => void; active?: boolean }>;

  return (
    <div className="bg-white/80 dark:bg-[#1A1A1A]/80 backdrop-blur-sm relative z-[48]">
      {/* Mobile Header */}
      {isMobile ? (
        <div className="px-3 pt-2.5 pb-2 border-b border-[#E2DBCE]/60 dark:border-[#2a2a2a]">
          <div className="flex items-center gap-1.5">
            <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-xl text-[#8B7355] dark:text-[#999] active:bg-black/[0.06] transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className={`font-semibold text-[#3D2E1F] dark:text-[#f5f5f5] tracking-tight truncate ${elderMode ? 'text-lg' : 'text-[16px]'}`}>
                {personName ? `${personName}'s Memories` : 'Memories'}
              </h1>
              <p className="text-[#8B7355] dark:text-[#666] text-[10px]">{total} memories · {storyCount} stories · {albumCount} albums</p>
            </div>
            {onSetViewMode && (
              <div className="flex bg-[#f0ebe4] dark:bg-[#1f1f1f] rounded-lg p-[2px] shrink-0">
                {MOBILE_VIEW_MODES.map(({ value, icon: Icon }) => (
                  <button key={value} onClick={() => onSetViewMode(value)}
                    className={`p-[5px] rounded-md transition-all duration-150 ${viewMode === value ? 'bg-white dark:bg-[#333] text-[#3D2E1F] dark:text-[#f5f5f5] shadow-[0_1px_2px_rgba(0,0,0,0.08)]' : 'text-[#8B7355] dark:text-[#777]'}`}>
                    <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setShowMoreMenu(true)} className="w-9 h-9 flex items-center justify-center rounded-xl text-[#8B7355] dark:text-[#999] active:bg-black/[0.06] transition-colors shrink-0">
              <MoreHorizontal className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <button onClick={onAddMemory} className="w-9 h-9 flex items-center justify-center rounded-full text-white shrink-0 active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(180deg, #C2A46D, #A8894F)' }}>
              <Plus className="w-[18px] h-[18px]" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      ) : (
        /* Desktop Header — Clean single-row with back, title, and + Add */
        <div className="border-b border-[#E2DBCE]/60 dark:border-[#2a2a2a]">
          <div className="flex items-center gap-3 px-4 md:px-6 h-14">
            <button
              onClick={onBack}
              className="p-1.5 -ml-1.5 rounded-lg hover:bg-[#2F3E8F]/[0.06] dark:hover:bg-white/[0.06] transition-colors shrink-0"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 text-[#3D2E1F] dark:text-[#D4D0CC]" strokeWidth={1.5} />
            </button>
            <Heart className="w-5 h-5 text-[#C2A46D] shrink-0" strokeWidth={1.8} />
            <div className="min-w-0 flex-1">
              <h1 className="text-[16px] font-bold text-[#3D2E1F] dark:text-[#F3F2F1] tracking-tight leading-tight">
                {personName ? `${personName}'s Memories` : 'Memories & Stories'}
              </h1>
              <p className="text-[11px] text-[#8B7355] dark:text-[#666] leading-tight">
                {total} {total === 1 ? 'memory' : 'memories'} · {albumCount} {albumCount === 1 ? 'album' : 'albums'} · {storyCount} {storyCount === 1 ? 'story' : 'stories'}
              </p>
            </div>

            {/* + Add dropdown — right-aligned */}
            <div className="relative shrink-0" ref={addMenuRef}>
              <button
                onClick={() => setShowAddMenu(v => !v)}
                className="flex items-center gap-1.5 h-8 px-4 rounded-xl text-[12px] font-semibold text-white whitespace-nowrap transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
                style={{ background: 'linear-gradient(180deg, #C2A46D, #A8894F)' }}
              >
                <Plus className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
                Add
              </button>
              {showAddMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-[200px] bg-white dark:bg-[#2a2a2a] rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-[#E2DBCE]/60 dark:border-[#3a3a3a] py-1.5 z-[100]">
                  <button onClick={() => { onAddMemory(); setShowAddMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#3D2E1F] dark:text-[#f5f5f5] hover:bg-[#f5f0e8] dark:hover:bg-white/[0.06] transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-[#C2A46D]/[0.08] flex items-center justify-center shrink-0">
                      <Plus className="w-3.5 h-3.5 text-[#C2A46D]" strokeWidth={2.5} />
                    </div>
                    Add Memory
                  </button>
                  <button onClick={() => { onCreateStory(); setShowAddMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#3D2E1F] dark:text-[#f5f5f5] hover:bg-[#f5f0e8] dark:hover:bg-white/[0.06] transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-[#2F3E8F]/[0.08] flex items-center justify-center shrink-0">
                      <Pencil className="w-3.5 h-3.5 text-[#2F3E8F]" strokeWidth={2.5} />
                    </div>
                    Add Story
                  </button>
                  <button onClick={() => { onCreateAlbum(); setShowAddMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#3D2E1F] dark:text-[#f5f5f5] hover:bg-[#f5f0e8] dark:hover:bg-white/[0.06] transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-[#4B2C5E]/[0.08] flex items-center justify-center shrink-0">
                      <FolderOpen className="w-3.5 h-3.5 text-[#4B2C5E]" strokeWidth={2.5} />
                    </div>
                    Add to Album
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isMobile && (
        <BottomSheet open={showMoreMenu} onClose={() => setShowMoreMenu(false)} title="Actions">
          <div className="flex flex-col gap-1 pb-2">
            {moreActions.map((item) => (
              <button key={item.label} onClick={item.action}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors active:bg-[#F4F6FA] ${item.active ? 'bg-[#C2A46D]/8' : 'hover:bg-[#F4F6FA]'}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${item.active ? 'bg-[#C2A46D]/15' : 'bg-[#F4F6FA]'}`}>
                  <item.icon className={`w-[18px] h-[18px] ${item.active ? 'text-[#C2A46D]' : 'text-[#8B7355]'}`} strokeWidth={1.5} />
                </div>
                <span className={`text-[15px] ${item.active ? 'text-[#C2A46D] font-medium' : 'text-[#3D2E1F]'}`}>{item.label}</span>
              </button>
            ))}
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
