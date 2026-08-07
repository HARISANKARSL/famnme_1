import { useRef, useCallback, useState, useEffect } from 'react';
import type { Person } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';

interface MinimapProps {
  persons: Person[];
  positions: Map<string, { x: number; y: number }>;
  bounds: { width: number; height: number; minX: number; minY: number };
  panOffset: { x: number; y: number };
  zoom: number;
  canvasWidth: number;
  canvasHeight: number;
  onPan: (offset: { x: number; y: number }) => void;
  personWidth: number;
  personHeight: number;
}

export function Minimap({
  persons,
  positions,
  bounds,
  panOffset,
  zoom,
  canvasWidth,
  canvasHeight,
  onPan,
  personWidth,
  personHeight,
}: MinimapProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const [_isDragging, _setIsDragging] = useState(false);

  const MINIMAP_WIDTH = 150;
  const MINIMAP_HEIGHT = 100;
  const PADDING = 10;

  // Scale factor: tree bounds -> minimap dimensions
  const scaleX = (MINIMAP_WIDTH - PADDING * 2) / Math.max(bounds.width + personWidth, 1);
  const scaleY = (MINIMAP_HEIGHT - PADDING * 2) / Math.max(bounds.height + personHeight, 1);
  const scale = Math.min(scaleX, scaleY);

  const draw = useCallback(() => {
    const ctx = minimapRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    // Background
    ctx.fillStyle = isDark ? 'rgba(27, 27, 27, 0.9)' : 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    // Draw person rectangles
    persons.forEach(person => {
      const pos = positions.get(person.personId);
      if (!pos) return;

      const x = PADDING + (pos.x - bounds.minX) * scale;
      const y = PADDING + (pos.y - bounds.minY) * scale;
      const w = personWidth * scale;
      const h = personHeight * scale;

      if (isDark) {
        ctx.fillStyle = person.gender === 'male' ? 'rgba(147, 197, 253, 0.7)'
                       : person.gender === 'female' ? 'rgba(244, 114, 182, 0.7)'
                       : 'rgba(161, 161, 170, 0.7)';
      } else {
        ctx.fillStyle = person.gender === 'male' ? 'rgba(148, 163, 184, 0.7)'
                       : person.gender === 'female' ? 'rgba(249, 168, 212, 0.7)'
                       : 'rgba(209, 213, 219, 0.7)';
      }
      ctx.fillRect(x, y, Math.max(w, 2), Math.max(h, 2));
    });

    // Draw viewport rectangle
    const vpX = PADDING + (-panOffset.x / zoom - bounds.minX) * scale;
    const vpY = PADDING + (-panOffset.y / zoom - bounds.minY) * scale;
    const vpW = (canvasWidth / zoom) * scale;
    const vpH = (canvasHeight / zoom) * scale;

    ctx.strokeStyle = isDark ? 'rgba(147, 197, 253, 0.8)' : 'rgba(59, 130, 246, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vpX, vpY, vpW, vpH);
    ctx.fillStyle = isDark ? 'rgba(147, 197, 253, 0.15)' : 'rgba(59, 130, 246, 0.1)';
    ctx.fillRect(vpX, vpY, vpW, vpH);
  }, [persons, positions, bounds, panOffset, zoom, canvasWidth, canvasHeight, scale, personWidth, personHeight, isDark]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleMinimapClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = minimapRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert minimap click to tree-space coordinates
    const treeX = bounds.minX + (clickX - PADDING) / scale;
    const treeY = bounds.minY + (clickY - PADDING) / scale;

    // Pan so that this point is centered in the viewport
    onPan({
      x: -(treeX - canvasWidth / (2 * zoom)) * zoom,
      y: -(treeY - canvasHeight / (2 * zoom)) * zoom,
    });
  }, [bounds, scale, zoom, canvasWidth, canvasHeight, onPan]);

  return (
    <canvas
      ref={minimapRef}
      width={MINIMAP_WIDTH}
      height={MINIMAP_HEIGHT}
      className="rounded-lg border border-gray-200 dark:border-zinc-800 shadow-md cursor-pointer"
      style={{ width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT }}
      onClick={handleMinimapClick}
    />
  );
}
