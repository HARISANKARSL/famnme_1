/**
 * MiniTreePreview — Lightweight vertical family tree visualization using the main UnionBasedTreeCanvas.
 *
 * Converts the narration/backend response (StoryEntity and StoryRelationship) into
 * the TreeWindowData structure, and renders it inside a compact, read-only canvas.
 */

import { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { UnionBasedTreeCanvas, type CanvasControls } from '@/components/canvas/UnionBasedTreeCanvas';
import type { StoryEntity, StoryRelationship } from '@/services/storyParseService';
import type { Person, Union, ExtendedRelationship, TreeWindowData } from '@/types';

/**
 * Transforms Story entities and relationships into the TreeWindowData format.
 */
export function transformStoryToTreeData(
  entities: StoryEntity[],
  relationships: StoryRelationship[]
): TreeWindowData {
  // Defensive check: ensure every entity has a valid tempId
  const sanitizedEntities = entities.map((e, index) => ({
    ...e,
    tempId: e.tempId || `fallback-person-${index + 1}`
  }));

  const selfEntity = sanitizedEntities.find(e => e.role === 'self') || sanitizedEntities[0];

  const persons: Person[] = sanitizedEntities.map(e => {
    return {
      personId: e.tempId,
      firstName: e.firstName,
      lastName: e.lastName || '',
      maidenName: e.maidenName || null,
      gender: (e.gender === 'male' || e.gender === 'female' || e.gender === 'other') ? e.gender : 'other',
      birthDate: e.birthDate || null,
      birthPlace: e.birthPlace || null,
      deathDate: e.deathDate || null,
      deathPlace: e.deathPlace || null,
      isLiving: e.isLiving ?? true,
      isHomePerson: selfEntity ? e.tempId === selfEntity.tempId : false,
      biography: e.note || null,
      occupation: e.occupation || null,
      education: e.education || null,
      religion: e.religion || null,
      nativePlace: e.nativePlace || null,
      nativeLanguage: e.nativeLanguage || null,
      gotra: e.gotra || null,
      caste: e.caste || null,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  const unions: Union[] = [];
  const extendedRels: ExtendedRelationship[] = [];
  const coupleUnions = new Map<string, string>(); // key: sorted spouse IDs, value: unionId

  // Track spouse relationships to create unions
  relationships.forEach(r => {
    if (r.type === 'spouse' && r.fromTempId && r.toTempId) {
      const p1 = r.fromTempId;
      const p2 = r.toTempId;
      const sortedIds = [p1, p2].sort();
      const unionId = `union-${sortedIds[0]}-${sortedIds[1]}`;
      const pairKey = sortedIds.join('_');

      if (!coupleUnions.has(pairKey)) {
        coupleUnions.set(pairKey, unionId);
        unions.push({
          unionId,
          type: 'marriage',
          createdAt: new Date().toISOString(),
        });
        extendedRels.push({
          fromId: p1,
          toId: unionId,
          type: 'PARTNER_IN',
        });
        extendedRels.push({
          fromId: p2,
          toId: unionId,
          type: 'PARTNER_IN',
        });
      }
    }
  });

  // Collect parent-child relationships to group children under unions
  const childToParents = new Map<string, string[]>();
  relationships.forEach(r => {
    if (r.type === 'parent_child' && r.fromTempId && r.toTempId) {
      const childId = r.fromTempId;
      const parentId = r.toTempId;
      const list = childToParents.get(childId) ?? [];
      if (!list.includes(parentId)) {
        list.push(parentId);
      }
      childToParents.set(childId, list);
    }
  });

  // Associate children to unions (couple unions or single-parent unions)
  childToParents.forEach((parents, childId) => {
    if (parents.length === 2) {
      const [p1, p2] = parents;
      const sortedIds = [p1, p2].sort();
      const pairKey = sortedIds.join('_');
      let unionId = coupleUnions.get(pairKey);

      if (!unionId) {
        // Create a union for the parents if it doesn't exist
        unionId = `union-${sortedIds[0]}-${sortedIds[1]}`;
        coupleUnions.set(pairKey, unionId);
        unions.push({
          unionId,
          type: 'marriage',
          createdAt: new Date().toISOString(),
        });
        extendedRels.push({
          fromId: p1,
          toId: unionId,
          type: 'PARTNER_IN',
        });
        extendedRels.push({
          fromId: p2,
          toId: unionId,
          type: 'PARTNER_IN',
        });
      }

      extendedRels.push({
        fromId: unionId,
        toId: childId,
        type: 'HAS_CHILD',
      });
    } else if (parents.length === 1) {
      const parentId = parents[0];
      // Check if this parent has exactly one spouse union
      const parentCouples = Array.from(coupleUnions.entries())
        .filter(([key]) => key.split('_').includes(parentId));

      if (parentCouples.length === 1) {
        const unionId = parentCouples[0][1];
        extendedRels.push({
          fromId: unionId,
          toId: childId,
          type: 'HAS_CHILD',
        });
      } else {
        // Create a single parent union
        const unionId = `union-${parentId}-single`;
        const exists = unions.some(u => u.unionId === unionId);
        if (!exists) {
          unions.push({
            unionId,
            type: 'unknown',
            createdAt: new Date().toISOString(),
          });
          extendedRels.push({
            fromId: parentId,
            toId: unionId,
            type: 'PARTNER_IN',
          });
        }
        extendedRels.push({
          fromId: unionId,
          toId: childId,
          type: 'HAS_CHILD',
        });
      }
    }
  });

  return {
    persons,
    unions,
    relationships: extendedRels,
  };
}

import type { ResponsiveBreakpoint } from '@/constants/responsiveLayoutConstants';

const previewBreakpoint: ResponsiveBreakpoint = {
  minWidth: 0,
  personWidth: 140,
  personHeight: 64,
  generationGap: 70,
  nodeSpacing: 40,
  spouseGap: 24,
  familyUnitGap: 60,
  textSize: 'xs',
  showSideButtons: false,
  minButtonSize: 28,
  photoHeight: 0,
  infoHeight: 64,
};

interface MiniTreePreviewProps {
  entities: StoryEntity[];
  relationships: StoryRelationship[];
}

export function MiniTreePreview({ entities, relationships }: MiniTreePreviewProps) {
  const [controls, setControls] = useState<CanvasControls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Prevent page scroll when scrolling inside the preview canvas
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const preventScroll = (e: WheelEvent) => {
      // Prevent browser scroll, but allow event to bubble for React's onWheelCapture
      e.preventDefault();
    };

    el.addEventListener('wheel', preventScroll, { passive: false });
    return () => {
      el.removeEventListener('wheel', preventScroll);
    };
  }, []);

  if (entities.length === 0) return null;

  const externalTreeData = transformStoryToTreeData(entities, relationships);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[350px] md:h-[400px] rounded-xl overflow-hidden border border-stone-200 dark:border-zinc-800 mini-tree-preview-canvas-container bg-[#FBFBFA] dark:bg-zinc-950"
    >
      <style>{`
        .mini-tree-preview-canvas-container .no-export {
          display: none !important;
        }

        /* Exempt expand buttons, parent nav icons, and collapsed union chevrons from .no-export display override */
        .mini-tree-preview-canvas-container .person-card button.no-export,
        .mini-tree-preview-canvas-container div.no-export.absolute.flex.items-center.justify-center {
          display: flex !important;
        }

        /* Style the parent navigation icons wrapper and make it compact for the mini preview */
        .mini-tree-preview-canvas-container .person-card div.no-export {
          display: flex !important;
          left: auto !important;
          right: -8px !important;
          top: -10px !important;
          flex-direction: row !important;
          gap: 3px !important;
          z-index: 30 !important;
          background-color: rgba(251, 251, 250, 0.9) !important;
          border: 1px solid rgba(0, 0, 0, 0.08) !important;
          border-radius: 6px !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important;
          padding: 2px !important;
          height: auto !important;
          width: auto !important;
        }

        .dark .mini-tree-preview-canvas-container .person-card div.no-export {
          background-color: rgba(24, 24, 27, 0.9) !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
        }

        /* Scale down the parent navigation buttons and SVG icons inside */
        .mini-tree-preview-canvas-container .person-card div.no-export button {
          width: 16px !important;
          height: 16px !important;
          border-width: 1px !important;
          padding: 0 !important;
        }

        .mini-tree-preview-canvas-container .person-card div.no-export button svg {
          width: 8px !important;
          height: 8px !important;
        }

        /* Hide the profile photo container completely */
        .mini-tree-preview-canvas-container .photo-container {
          display: none !important;
        }

        /* Hide the root person badge */
        .mini-tree-preview-canvas-container .person-card .root-person-badge,
        .mini-tree-preview-canvas-container .person-card > div.root-person-badge {
          display: none !important;
        }

        /* Hide gender symbol text in the name */
        .mini-tree-preview-canvas-container .person-card .font-semibold span[aria-hidden="true"] {
          display: none !important;
        }

        /* Make the inner wrapper a full-height flex container to center text */
        .mini-tree-preview-canvas-container .person-card > div:not(.no-export):not(.root-person-badge) {
          display: flex !important;
          flex-direction: column !important;
          justify-content: center !important;
          align-items: center !important;
          height: 100% !important;
          padding: 8px !important;
          text-align: center !important;
          border-radius: 12px !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03) !important;
        }

        /* Make all internal containers transparent to eliminate any white boxes */
        .mini-tree-preview-canvas-container .person-card > div:not(.no-export):not(.root-person-badge) > div {
          background: transparent !important;
          background-color: transparent !important;
          height: auto !important;
          padding: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 2px !important;
          align-items: center !important;
        }

        /* Male background: light blue */
        .mini-tree-preview-canvas-container .person-card[data-gender="male"] > div {
          background-color: #E0F2FE !important; /* Sky-100 */
          border-color: #7DD3FC !important; /* Sky-300 */
        }

        /* Male background dark mode: dark blue */
        .dark .mini-tree-preview-canvas-container .person-card[data-gender="male"] > div {
          background-color: rgba(12, 74, 110, 0.4) !important; /* Sky-950/40 */
          border-color: #0284c7 !important; /* Sky-600 */
        }

        /* Female background: light pink */
        .mini-tree-preview-canvas-container .person-card[data-gender="female"] > div {
          background-color: #FCE7F3 !important; /* Pink-100 */
          border-color: #FBCFE8 !important; /* Pink-300 */
        }

        /* Female background dark mode: dark pink/rose */
        .dark .mini-tree-preview-canvas-container .person-card[data-gender="female"] > div {
          background-color: rgba(131, 24, 67, 0.4) !important; /* Pink-950/40 */
          border-color: #db2777 !important; /* Pink-600 */
        }

        /* Other background: light gray */
        .mini-tree-preview-canvas-container .person-card[data-gender="other"] > div {
          background-color: #F3F4F6 !important; /* Gray-100 */
          border-color: #D1D5DB !important; /* Gray-300 */
        }

        /* Other background dark mode: dark gray/zinc */
        .dark .mini-tree-preview-canvas-container .person-card[data-gender="other"] > div {
          background-color: #27272a !important; /* Zinc-800 */
          border-color: #52525b !important; /* Zinc-600 */
        }

        /* Highlight the name text with highlighter pen swipe effect */
        .mini-tree-preview-canvas-container .person-card .font-semibold {
          font-size: 13px !important;
          font-weight: 700 !important;
          color: #0f172a !important; /* Slate-900 */
          line-height: 1.25 !important;
        
          background-size: 100% 40% !important;
          background-repeat: no-repeat !important;
          background-position: 0 85% !important;
          display: inline-block !important;
          padding: 2px 6px !important;
          border-radius: 4px !important;
        }

        .dark .mini-tree-preview-canvas-container .person-card .font-semibold {
          color: #f8fafc !important; /* Slate-50 */
        }

        /* Style the lifespan */
        .mini-tree-preview-canvas-container .person-card .tabular-nums {
          font-size: 10px !important;
          font-weight: 500 !important;
          color: #475569 !important; /* Slate-600 */
        }

        .dark .mini-tree-preview-canvas-container .person-card .tabular-nums {
          color: #cbd5e1 !important; /* Slate-300 */
        }
      `}</style>
      {controls && (
        <div className="absolute top-3 right-3 z-10 flex gap-2">
          <button
            onClick={() => controls.zoomIn()}
            className="w-9 h-9 flex items-center justify-center bg-white/90 hover:bg-white dark:bg-zinc-900/90 dark:hover:bg-zinc-800 border border-stone-200/80 hover:border-stone-300 dark:border-zinc-700/80 dark:hover:border-zinc-600 text-stone-600 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-200 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-[18px] h-[18px]" />
          </button>
          <button
            onClick={() => controls.zoomOut()}
            className="w-9 h-9 flex items-center justify-center bg-white/90 hover:bg-white dark:bg-zinc-900/90 dark:hover:bg-zinc-800 border border-stone-200/80 hover:border-stone-300 dark:border-zinc-700/80 dark:hover:border-zinc-600 text-stone-600 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-200 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-[18px] h-[18px]" />
          </button>
          <button
            onClick={() => controls.resetView()}
            className="w-9 h-9 flex items-center justify-center bg-white/90 hover:bg-white dark:bg-zinc-900/90 dark:hover:bg-zinc-800 border border-stone-200/80 hover:border-stone-300 dark:border-zinc-700/80 dark:hover:border-zinc-600 text-stone-600 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-200 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
            title="Reset Zoom"
          >
            <RotateCcw className="w-[18px] h-[18px]" />
          </button>
        </div>
      )}
      <UnionBasedTreeCanvas
        treeId="preview-tree"
        externalTreeData={externalTreeData}
        readOnly={true}
        customBreakpoint={previewBreakpoint}
        onCanvasControlsReady={setControls}
        overrideLayoutMode="tree"
      />
    </div>
  );
}
