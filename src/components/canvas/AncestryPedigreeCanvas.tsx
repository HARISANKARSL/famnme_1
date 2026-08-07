/**
 * AncestryPedigreeCanvas - Ancestry.com-style horizontal pedigree canvas
 *
 * Dark charcoal background, compact layout, focus card on left,
 * ancestors expanding rightward.
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Loader2, Printer, Trees, Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { useTheme } from '@/contexts/ThemeContext';
import { PedigreeFocusCard } from './PedigreeFocusCard';

import { PedigreeAncestorCard } from './PedigreeAncestorCard';
import { PedigreePlaceholderCard } from './PedigreePlaceholderCard';
import { PedigreeConnectors } from './PedigreeConnectors';
import { PedigreePersonPopup } from './PedigreePersonPopup';
import { PedigreeBreadcrumb } from './PedigreeBreadcrumb';
import {
  extractPedigreeData,
  calculateAncestryPedigreeLayout,
  getPedigreeLayoutConfig,
  type PedigreeLayoutResult,
  type PedigreeFocusContext,
} from '@/services/ancestryPedigreeService';
import { fetchTreeWindow } from '@/services/neo4jDataService';
import type { Person, Union } from '@/types';
import type { Relationship } from '@/services/elkLayoutService';

export interface AncestryPedigreeCanvasProps {
  treeId: string;
  focusPersonId?: string;
  reloadTrigger?: number;
  onPersonContextAction?: (personId: string, action: string) => void;
  onPersonClick?: (personId: string) => void;
  onTreeDataLoaded?: (data: { persons: Person[]; unions: Union[]; relationships: Relationship[] }) => void;
  treeName?: string;
  onOpenAddRelativePanel?: (personId: string) => void;
  onImportGedcom?: () => void;
  onCreateRoot?: () => void;
}


export function AncestryPedigreeCanvas({
  treeId,
  focusPersonId,
  reloadTrigger,
  onPersonContextAction,
  onPersonClick,
  onTreeDataLoaded,
  treeName,
  onOpenAddRelativePanel,
  onImportGedcom,
  onCreateRoot,
}: AncestryPedigreeCanvasProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const { toast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [persons, setPersons] = useState<Person[]>([]);
  const [unions, setUnions] = useState<Union[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentFocusId, setCurrentFocusId] = useState<string | null>(focusPersonId || null);
  const [focusContext, setFocusContext] = useState<PedigreeFocusContext | null>(null);
  const [layout, setLayout] = useState<PedigreeLayoutResult | null>(null);
  const [breadcrumbTrail, setBreadcrumbTrail] = useState<Array<{ personId: string; name: string; person?: Person }>>([]);

  const [popupPerson, setPopupPerson] = useState<Person | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  const [zoom, setZoom] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Memoize person map for O(1) lookups — prevents re-renders from creating new references
  const personMap = useMemo(() => {
    const map = new Map<string, Person>();
    persons.forEach(p => map.set(p.personId, p));
    return map;
  }, [persons]);

  const homePersonId = persons.find(p => p.isHomePerson)?.personId;

  // Load tree data
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchTreeWindow(treeId, currentFocusId || undefined);
        if (cancelled) return;
        setPersons(data.persons);
        setUnions(data.unions);
        setRelationships(data.relationships as Relationship[]);
        onTreeDataLoaded?.(data as { persons: Person[]; unions: Union[]; relationships: Relationship[] });

        if (!currentFocusId) {
          const home = data.persons.find(p => p.isHomePerson);
          if (home) setCurrentFocusId(home.personId);
          else if (data.persons.length > 0) setCurrentFocusId(data.persons[0].personId);
        }
      } catch (err) {
        if (!cancelled) setError('Failed to load tree data');
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [treeId, reloadTrigger]);

  // Extract + layout when focus or data changes
  useEffect(() => {
    if (!currentFocusId || persons.length === 0) return;

    const config = getPedigreeLayoutConfig(window.innerWidth);
    const data = extractPedigreeData(currentFocusId, persons, unions, relationships, config.maxGenerations);

    setFocusContext(data.focusContext);

    const layoutResult = calculateAncestryPedigreeLayout(
      data.ancestors, data.missingSlots, data.focusContext, config
    );
    setLayout(layoutResult);

    // Init breadcrumb
    if (breadcrumbTrail.length === 0 && data.focusContext.focusPerson) {
      const fp = data.focusContext.focusPerson;
      setBreadcrumbTrail([{
        personId: fp.personId,
        name: `${fp.firstName} ${fp.lastName}`,
        person: fp,
      }]);
    }
  }, [currentFocusId, persons, unions, relationships]);

  // Auto-fit view when layout changes
  useEffect(() => {
    if (!layout || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const padding = 60;
    const scaleX = (rect.width - padding * 2) / layout.bounds.width;
    const scaleY = (rect.height - padding * 2) / layout.bounds.height;
    const fitZoom = Math.min(scaleX, scaleY, 1.2);
    const clampedZoom = Math.max(0.4, Math.min(1.2, fitZoom));

    setZoom(clampedZoom);
    const cx = (rect.width - layout.bounds.width * clampedZoom) / 2;
    const cy = (rect.height - layout.bounds.height * clampedZoom) / 2;
    setPanOffset({ x: cx, y: cy });
  }, [layout]);

  const navigateToFocus = useCallback((personId: string) => {
    const person = personMap.get(personId);
    if (!person) return;

    setCurrentFocusId(personId);
    setPopupPerson(null);

    setBreadcrumbTrail(prev => {
      const existingIdx = prev.findIndex(e => e.personId === personId);
      if (existingIdx >= 0) return prev.slice(0, existingIdx + 1);
      return [...prev, { personId, name: `${person.firstName} ${person.lastName}`, person }];
    });
  }, [personMap]);

  // Pan & Zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    const rect = canvasRef.current?.getBoundingClientRect();
    const focalX = rect ? e.clientX - rect.left : e.clientX;
    const focalY = rect ? e.clientY - rect.top : e.clientY;

    setZoom(prev => {
      const next = Math.max(0.2, Math.min(2.5, prev + delta));
      const ratio = next / prev;
      setPanOffset(p => ({
        x: focalX - (focalX - p.x) * ratio,
        y: focalY - (focalY - p.y) * ratio,
      }));
      return next;
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('.pedigree-card') || target.closest('.pedigree-popup')) return;
    setIsPanning(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanOffset(prev => ({
      x: prev.x + e.clientX - lastMousePos.x,
      y: prev.y + e.clientY - lastMousePos.y,
    }));
    setLastMousePos({ x: e.clientX, y: e.clientY });
  }, [isPanning, lastMousePos]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const handleAncestorClick = useCallback((personId: string) => {
    const person = personMap.get(personId);
    if (!person || !layout) return;
    const pos = layout.ancestorPositions.get(personId);
    if (!pos) return;
    const config = getPedigreeLayoutConfig(window.innerWidth);
    setPopupPerson(person);
    setPopupPosition({ x: pos.x + config.cardWidth + 10, y: pos.y - 30 });
  }, [personMap, layout]);

  const handlePlaceholderClick = useCallback((childPersonId: string, _parentType: 'father' | 'mother') => {
    onPersonContextAction?.(childPersonId, 'add-parent');
  }, [onPersonContextAction]);

  const handleAddRelative = useCallback(() => {
    if (currentFocusId) {
      if (onOpenAddRelativePanel) {
        onOpenAddRelativePanel(currentFocusId);
      } else {
        onPersonContextAction?.(currentFocusId, 'add-parent');
      }
    }
  }, [currentFocusId, onOpenAddRelativePanel, onPersonContextAction]);

  const handlePrintPdf = async () => {
    if (!canvasRef.current) return;

    try {
      toast({
        title: 'Preparing PDF...',
        description: 'Generating your pedigree capture. Please wait.',
      });

      // Capture the current view of the canvas
      const dataUrl = await toPng(canvasRef.current, {
        backgroundColor: isDark ? '#1b1a19' : '#faf6f1', // Pedigree background color
        quality: 1,
        pixelRatio: 2,
        filter: (node) => {
          if (node instanceof HTMLElement) {
            if (node.classList.contains('no-export')) return false;
            // Also exclude UI buttons in the horizontal view
            if (node.classList.contains('z-10')) return false;
          }
          return true;
        }
      });


      const width = canvasRef.current.clientWidth;
      const height = canvasRef.current.clientHeight;

      const pdf = new jsPDF({
        orientation: width > height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [width, height]
      });

      pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);
      pdf.save(`${treeName || 'pedigree'}.pdf`);

      toast({
        title: 'PDF Downloaded',
        description: 'Your pedigree view has been saved as a PDF.',
        variant: 'success',
      });

    } catch (err) {
      console.error('PDF export failed:', err);
      toast({
        title: 'PDF Export failed',
        description: 'An error occurred while generating the PDF.',
        variant: 'destructive',
      });
    }
  };


  const config = getPedigreeLayoutConfig(window.innerWidth);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: isDark ? '#1b1a19' : '#faf6f1' }}>
        <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
      </div>
    );
  }

  if (error || persons.length === 0 || !layout || !focusContext) {
    if (error) {
      return (
        <div className="w-full h-full flex items-center justify-center text-gray-400" style={{ backgroundColor: isDark ? '#1b1a19' : '#faf6f1' }}>
          {error}
        </div>
      );
    }

    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-8" style={{ backgroundColor: isDark ? '#1b1a19' : '#faf6f1' }}>
        <div className="relative group">
          <div className="absolute -inset-4 bg-[#2F3E8F]/5 dark:bg-[#7B8FD4]/10 rounded-full blur-xl group-hover:bg-[#2F3E8F]/10 dark:group-hover:bg-[#7B8FD4]/15 transition-all duration-500" />
          <Trees className="w-24 h-24 text-[#2F3E8F]/20 dark:text-[#7B8FD4]/30 relative z-10 animate-float" />
        </div>
        
        <div className="text-center space-y-2 relative z-10">
          <h2 className="text-3xl font-serif text-[#3D2E1F] dark:text-[#F3F2F1]">Your family tree is empty</h2>
          <p className="text-base text-[#6B7280] dark:text-[#9B9790] max-w-sm mx-auto">
            Start building your legacy today. You can add yourself as the root or import existing family data.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10">
          <Button
            onClick={onCreateRoot}
            className="h-12 px-8 bg-[#2F3E8F] hover:bg-[#1E2B6D] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
          >
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold">+</span>
            </div>
            <span className="font-medium">Start with yourself</span>
          </Button>

          <div className="text-[#8B7355] dark:text-slate-500 font-medium text-sm px-2">OR</div>

          <Button
            onClick={onImportGedcom}
            variant="outline"
            className="h-12 px-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-[#E2E8F0] dark:border-slate-800 text-[#2F3E8F] dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-full shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2"
          >
            <Download className="w-5 h-5 rotate-180" />
            <span className="font-medium">Import GEDCOM</span>
          </Button>
        </div>

        <div className="mt-8 p-4 bg-white/50 dark:bg-[#1E1E1E]/50 backdrop-blur-sm rounded-2xl border border-dashed border-[#E2E8F0] dark:border-slate-800 text-center max-w-xs">
          <p className="text-xs text-[#8B7355] dark:text-[#C2A46D]/90">
            Build a bridge between generations. Your history is just a click away.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: isDark ? '#1b1a19' : '#faf6f1' }}>
      {/* Print PDF Button (Top Right) */}
      <div className="absolute top-3 right-4 z-10">
        {/* <Button
          onClick={handlePrintPdf}
          variant="outline"
          size="sm"
          className="bg-white/95 backdrop-blur-sm border-[#E2E8F0] text-[#2F3E8F] hover:bg-[#2F3E8F] hover:text-white dark:bg-slate-900/90 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white transition-all shadow-sm font-medium"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print PDF
        </Button> */}
      </div>

      {/* Canvas */}

      <div
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onWheelCapture={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isPanning ? 'none' : 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            width: layout.bounds.width,
            height: layout.bounds.height,
          }}
        >
          <PedigreeConnectors
            connectors={layout.connectors}
            width={layout.bounds.width}
            height={layout.bounds.height}
          />

          {/* Focus Card */}
          <div
            className="pedigree-card"
            style={{ position: 'absolute', left: layout.focusPosition.x, top: layout.focusPosition.y }}
          >
            <PedigreeFocusCard
              focusContext={focusContext}
              width={config.focusCardWidth}
              onViewFamilyTree={navigateToFocus}
              onAddRelative={handleAddRelative}
              onPersonClick={(personId) => onPersonClick?.(personId)}
              homePersonId={homePersonId}
            />
          </div>

          {/* Ancestor Cards */}
          {Array.from(layout.ancestorPositions.entries()).map(([personId, pos]) => {
            const person = personMap.get(personId);
            if (!person) return null;
            if (person.isDeleted) {
              const label = person.gender === 'female' ? 'Add mother' : person.gender === 'male' ? 'Add father' : 'Add parent';
              return (
                <div key={personId} className="pedigree-card">
                  <PedigreePlaceholderCard
                    x={pos.x}
                    y={pos.y}
                    width={config.cardWidth}
                    height={config.cardHeight}
                    label={label}
                    childPersonId={personId}
                    onAdd={() => onPersonContextAction?.(personId, 'ghost-add')}
                  />
                </div>
              );
            }
            return (
              <div key={personId} className="pedigree-card">
                <PedigreeAncestorCard
                  person={person}
                  x={pos.x}
                  y={pos.y}
                  width={config.cardWidth}
                  height={config.cardHeight}
                  onClick={(pid) => {
                    handleAncestorClick(pid);
                  }}
                />
              </div>
            );
          })}

          {/* Placeholder Cards */}
          {layout.placeholders.map((ph, i) => (
            <div key={`ph-${i}`} className="pedigree-card">
              <PedigreePlaceholderCard
                x={ph.x}
                y={ph.y}
                width={config.cardWidth}
                height={config.cardHeight}
                label={`Add ${ph.parentType}`}
                childPersonId={ph.childPersonId}
                onAdd={() => handlePlaceholderClick(ph.childPersonId, ph.parentType)}
              />
            </div>
          ))}

          {/* Person Popup */}
          {popupPerson && (
            <div className="pedigree-popup">
              <PedigreePersonPopup
                person={popupPerson}
                position={popupPosition}
                onClose={() => setPopupPerson(null)}
                onViewFamilyTree={(pid) => { setPopupPerson(null); navigateToFocus(pid); }}
                onEdit={(pid) => { setPopupPerson(null); onPersonContextAction?.(pid, 'edit'); }}
                onAddRelative={(pid) => { setPopupPerson(null); onPersonContextAction?.(pid, 'add-parent'); }}
                onViewProfile={(pid) => { setPopupPerson(null); onPersonContextAction?.(pid, 'view-profile'); }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Breadcrumb */}
      <PedigreeBreadcrumb trail={breadcrumbTrail} onNavigate={navigateToFocus} />

      {/* Tree Controls removed — duplicates View menu in TopBar */}
    </div>
  );
}
