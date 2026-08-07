/**
 * FanChart – Ancestry-style upper semi-circle ancestor chart
 *
 * Dark background, pastel-colored segments by lineage quadrant,
 * text rotated along the radial direction, dashed empty slots.
 */

import { useMemo, useState, useCallback } from 'react';
import { calculateFanChart, arcToPath, buildAhnentafelMap, type FanSegment, MAX_GENERATIONS } from '@/services/fanChartService';
import type { Person, Union } from '@/types';
import type { Relationship } from '@/services/elkLayoutService';
import { useTheme } from '@/contexts/ThemeContext';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface FanChartProps {
  homePersonId: string;
  persons: Person[];
  unions: Union[];
  relationships: Relationship[];
  onPersonClick?: (personId: string) => void;
  onPersonContextAction?: (personId: string, action: string) => void;
  width?: number;
  height?: number;
}

// Warm-toned quadrant colors matching terracotta app theme
const QUADRANT_COLORS: Record<number, { fill: string; stroke: string; hover: string }> = {
  0: { fill: '#d4e0cc', stroke: '#a8c49a', hover: '#c8d8bc' }, // FF - sage green
  1: { fill: '#c8d4e0', stroke: '#98b4cc', hover: '#b8c8d8' }, // FM - dusty blue
  2: { fill: '#e8dcc8', stroke: '#d0bfa0', hover: '#e0d0b8' }, // MF - warm sand
  3: { fill: '#e8c4b4', stroke: '#cc9c88', hover: '#e0b8a4' }, // MM - warm terracotta tint
};

function formatLifeSpan(person: Person): string {
  const birth = person.birthDate
    ? new Date(person.birthDate).getFullYear().toString()
    : '';
  if (!birth) return '';
  const death = person.deathDate
    ? new Date(person.deathDate).getFullYear().toString()
    : person.isLiving !== false ? 'Living' : '';
  return `${birth}–${death}`;
}

export function FanChart({
  homePersonId,
  persons,
  unions,
  relationships,
  onPersonClick,
  onPersonContextAction,
  width = 900,
  height = 600,
}: FanChartProps) {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [zoom, setZoom] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const fanData = useMemo(
    () => calculateFanChart(homePersonId, persons, unions, relationships, width, height),
    [homePersonId, persons, unions, relationships, width, height]
  );

  const ahnMap = useMemo(
    () => buildAhnentafelMap(homePersonId, persons, unions, relationships, MAX_GENERATIONS),
    [homePersonId, persons, unions, relationships]
  );

  const handleSegmentHover = useCallback((segment: FanSegment | null, e?: React.MouseEvent) => {
    if (segment?.person && e) {
      setHoveredSegment(segment.personId);
      const lifespan = formatLifeSpan(segment.person);
      setTooltip({
        x: e.clientX,
        y: e.clientY,
        text: `${segment.person.firstName} ${segment.person.lastName || ''}${lifespan ? ` (${lifespan})` : ''}`,
      });
    } else {
      setHoveredSegment(null);
      setTooltip(null);
    }
  }, []);

  const homePerson = fanData.homePerson;
  const homeLifeSpan = homePerson ? formatLifeSpan(homePerson) : '';
  const centerRadius = fanData.centerRadius;
  const isRadial = fanData.maxGeneration > 3;

  const maxRadius = fanData.maxRadius;
  const padding = 40;
  const minX = -maxRadius - padding;
  const maxX = maxRadius + padding;
  const minY = -maxRadius - padding;
  const maxY = isRadial ? (maxRadius + padding) : (maxRadius * 0.25 + padding);

  const viewBoxWidth = maxX - minX;
  const viewBoxHeight = maxY - minY;

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    const nextZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
    const clampedZoom = Math.max(0.3, Math.min(3.0, nextZoom));

    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPoint = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    if (svgPoint) {
      const untransX = (svgPoint.x - panOffset.x) / zoom;
      const untransY = (svgPoint.y - panOffset.y) / zoom;

      const newPanX = svgPoint.x - untransX * clampedZoom;
      const newPanY = svgPoint.y - untransY * clampedZoom;

      setZoom(clampedZoom);
      setPanOffset({ x: newPanX, y: newPanY });
    }
  }, [zoom, panOffset]);

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return; // only drag on left click
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  }, [panOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(3.0, prev * 1.2));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(prev => Math.max(0.3, prev / 1.2));
  }, []);

  const resetView = useCallback(() => {
    setZoom(1.0);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  return (
    <div className="relative" style={{ width, height }}>
      <svg
        width={width}
        height={height}
        viewBox={`${minX} ${minY} ${viewBoxWidth} ${viewBoxHeight}`}
        style={{
          background: isDark ? '#121214' : '#4a3f36',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onWheelCapture={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoom})`}>
          {/* Filled ancestor segments */}
          {fanData.segments.filter(s => !s.isEmpty).map((segment) => {
            const colors = QUADRANT_COLORS[segment.quadrant] || QUADRANT_COLORS[0];
            const isHovered = hoveredSegment === segment.personId;

            return (
              <g key={`filled-${segment.ahnentafel}`}>
                <path
                  d={arcToPath(
                    fanData.centerX, fanData.centerY,
                    segment.innerRadius, segment.outerRadius,
                    segment.startAngle, segment.endAngle
                  )}
                  fill={isHovered ? colors.hover : colors.fill}
                  stroke={isDark ? '#121214' : '#ffffff'}
                  strokeWidth={1}
                  className="cursor-pointer"
                  onMouseEnter={(e) => handleSegmentHover(segment, e)}
                  onMouseMove={(e) => handleSegmentHover(segment, e)}
                  onMouseLeave={() => handleSegmentHover(null)}
                  onClick={() => segment.personId && onPersonClick?.(segment.personId)}
                />
                {/* Rotated text label */}
                <SegmentLabel segment={segment} cx={fanData.centerX} cy={fanData.centerY} isRadial={isRadial} />
              </g>
            );
          })}

          {/* Empty ancestor slots (dashed outlines) */}
          {fanData.segments.filter(s => s.isEmpty && s.label).map((segment) => {
            const arcSpan = segment.endAngle - segment.startAngle;
            const midRadius = (segment.innerRadius + segment.outerRadius) / 2;
            return (
              <g key={`empty-${segment.ahnentafel}`}>
                <path
                  d={arcToPath(
                    fanData.centerX, fanData.centerY,
                    segment.innerRadius, segment.outerRadius,
                    segment.startAngle, segment.endAngle
                  )}
                  fill="transparent"
                  stroke={isDark ? '#2A2A30' : '#7a6d62'}
                  strokeWidth={1}
                  strokeDasharray="6,4"
                  className="cursor-pointer"
                  onClick={() => {
                    const childAhn = Math.floor(segment.ahnentafel / 2);
                    const childPerson = ahnMap.get(childAhn);
                    console.log('[FanChart] Clicked empty slot:', {
                      ahnentafel: segment.ahnentafel,
                      childAhn,
                      childPersonId: childPerson?.personId,
                      childPersonName: childPerson ? `${childPerson.firstName} ${childPerson.lastName}` : null
                    });
                    if (childPerson) {
                      const isFather = segment.ahnentafel % 2 === 0;
                      console.log('[FanChart] Triggering action:', isFather ? 'add-father' : 'add-mother', 'for child:', childPerson.personId);
                      onPersonContextAction?.(childPerson.personId, isFather ? 'add-father' : 'add-mother');
                    } else {
                      console.warn('[FanChart] No child person found in ahnMap for ahnentafel:', childAhn);
                    }
                  }}
                />
                {/* "Add father" / "Add mother" label */}
                {(isRadial ? arcSpan > 1.5 : arcSpan > 8) && (() => {
                  if (isRadial) {
                    const pathId = `fan-path-empty-${segment.ahnentafel}`;
                    const pathD = getArcTextPath(fanData.centerX, fanData.centerY, midRadius, segment.startAngle, segment.endAngle, segment.midAngle);
                    return (
                      <g>
                        <path
                          id={pathId}
                          d={pathD}
                          fill="none"
                          stroke="none"
                        />
                        <text
                          fontSize={segment.generation >= 4 ? 8 : 9}
                          fill={isDark ? '#aaaaaa' : '#9a8d82'}
                          pointerEvents="none"
                          className="select-none"
                        >
                          <textPath
                            href={`#${pathId}`}
                            startOffset="50%"
                            textAnchor="middle"
                            dominantBaseline="central"
                          >
                            {segment.label}
                          </textPath>
                        </text>
                      </g>
                    );
                  } else {
                    return (
                      <text
                        x={segment.cx}
                        y={segment.cy}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={segment.generation <= 3 ? 11 : 9}
                        fill={isDark ? '#666666' : '#9a8d82'}
                        pointerEvents="none"
                        className="select-none"
                        transform={`rotate(${segment.midAngle}, ${segment.cx}, ${segment.cy})`}
                      >
                        {segment.label}
                      </text>
                    );
                  }
                })()}
              </g>
            );
          })}

          {/* Center divider line (vertical from center upward) */}
          <line
            x1={fanData.centerX}
            y1={fanData.centerY - centerRadius}
            x2={fanData.centerX}
            y2={fanData.centerY - fanData.maxRadius}
            stroke={isDark ? '#2A2A30' : '#6a5d52'}
            strokeWidth={0.5}
          />

          {/* Center circle (home person) */}
          <circle
            cx={fanData.centerX}
            cy={fanData.centerY}
            r={centerRadius}
            fill={isDark ? '#1C1C22' : '#f2ebe2'}
            stroke={isDark ? '#7B8FD4' : '#c4774a'}
            strokeWidth={2}
            className="cursor-pointer"
            onClick={() => onPersonClick?.(homePersonId)}
          />
          <text
            x={fanData.centerX}
            y={fanData.centerY - (homeLifeSpan ? 10 : 4)}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={13}
            fontWeight="bold"
            fill={isDark ? '#F3F2F1' : '#31271c'}
            pointerEvents="none"
          >
            {homePerson?.firstName} {homePerson?.lastName || ''}
          </text>
          {homeLifeSpan && (
            <text
              x={fanData.centerX}
              y={fanData.centerY + 10}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={11}
              fill={isDark ? '#B8A090' : '#6a5d52'}
              pointerEvents="none"
            >
              {homeLifeSpan}
            </text>
          )}
        </g>

        {/* Stats */}
        <text x={maxX - 10} y={maxY - 10} textAnchor="end" fontSize={11} fill={isDark ? '#666666' : '#9a8d82'}>
          {fanData.totalAncestors} ancestor{fanData.totalAncestors !== 1 ? 's' : ''} across {fanData.maxGeneration} generation{fanData.maxGeneration !== 1 ? 's' : ''}
        </text>
      </svg>

      {/* Zoom HUD */}
      <div
        role="group"
        aria-label="Fan Chart controls"
        className="no-export absolute right-4 bottom-14 z-10 flex flex-col gap-1 bg-white/95 dark:bg-[#1E1E1E]/95 backdrop-blur-sm rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-1 transition-all duration-200"
      >
        <button
          onClick={zoomIn}
          className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4 text-gray-700 dark:text-gray-200" />
        </button>
        <button
          onClick={zoomOut}
          className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4 text-gray-700 dark:text-gray-200" />
        </button>
        <div className="h-px bg-gray-200 dark:bg-gray-800 mx-1" />
        <button
          onClick={resetView}
          className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
          title="Reset View"
        >
          <Maximize2 className="w-4 h-4 text-gray-700 dark:text-gray-200" />
        </button>
        <div className="text-[10px] text-center text-gray-400 dark:text-gray-500 px-1 select-none">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none z-50"
          style={{ left: tooltip.x + 12, top: tooltip.y - 32 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

/**
 * Helper to compute an SVG path for an arc to render curved text using <textPath>.
 * If the segment is in the bottom half of the chart, we reverse the path's sweep
 * direction so that text is drawn left-to-right from the viewer's perspective.
 */
function getArcTextPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number, midAngle: number): string {
  let normMid = (midAngle + 360) % 360;
  const reverse = normMid > 90 && normMid < 270;

  const a1 = reverse ? endAngle : startAngle;
  const a2 = reverse ? startAngle : endAngle;

  const radStart = a1 * (Math.PI / 180);
  const radEnd = a2 * (Math.PI / 180);

  const startX = cx + r * Math.sin(radStart);
  const startY = cy - r * Math.cos(radStart);
  const endX = cx + r * Math.sin(radEnd);
  const endY = cy - r * Math.cos(radEnd);

  const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  const sweepFlag = reverse ? 0 : 1;

  return `M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${endX} ${endY}`;
}

/**
 * Renders rotated multi-line text inside a filled segment.
 * Text follows the radial direction, reading from center outward.
 */
function SegmentLabel({ segment, cx, cy, isRadial }: { segment: FanSegment; cx: number; cy: number; isRadial: boolean }) {
  const { person, generation, midAngle, endAngle, startAngle } = segment;
  if (!person) return null;

  const arcSpan = endAngle - startAngle;
  if (!isRadial && arcSpan < 10) return null;
  if (isRadial && arcSpan < 1.5) return null;

  const ringHeight = segment.outerRadius - segment.innerRadius;
  const midRadius = (segment.innerRadius + segment.outerRadius) / 2;

  // Single line display
  const displayName = person.lastName 
    ? `${person.firstName} ${person.lastName}`
    : person.firstName;

  // Font size selection
  let fontSize = 10;
  if (generation === 1) fontSize = 12;
  else if (generation === 2) fontSize = 11;
  else if (generation === 3) fontSize = 10;
  else if (generation === 4) fontSize = 9;
  else fontSize = 8;

  if (isRadial) {
    const pathId = `fan-path-${segment.ahnentafel}`;
    const pathD = getArcTextPath(cx, cy, midRadius, startAngle, endAngle, midAngle);

    return (
      <g>
        <path
          id={pathId}
          d={pathD}
          fill="none"
          stroke="none"
        />
        <text
          fontSize={fontSize}
          fontWeight="bold"
          fill="#31271c"
          pointerEvents="none"
          className="select-none"
        >
          <textPath
            href={`#${pathId}`}
            startOffset="50%"
            textAnchor="middle"
            dominantBaseline="central"
          >
            {displayName}
          </textPath>
        </text>
      </g>
    );
  } else {
    const showLastName = arcSpan > 18 && ringHeight > 40;
    const showDates = arcSpan > 25 && ringHeight > 55 && generation <= 3;

    const lines: Array<{ text: string; fontSize: number; fontWeight: string }> = [];

    if (showDates) {
      const lifespan = formatLifeSpan(person);
      if (lifespan) {
        lines.push({ text: lifespan, fontSize: 9, fontWeight: 'normal' });
      }
    }

    if (showLastName && person.lastName) {
      lines.push({
        text: person.lastName,
        fontSize: generation <= 2 ? 11 : 9,
        fontWeight: 'normal',
      });
    }

    lines.push({
      text: person.firstName || '',
      fontSize: generation <= 2 ? 12 : 10,
      fontWeight: 'bold',
    });

    const lineHeight = 14;
    const totalHeight = lines.length * lineHeight;
    const startOffset = -totalHeight / 2 + lineHeight / 2;

    return (
      <g transform={`rotate(${midAngle}, ${segment.cx}, ${segment.cy})`}>
        {lines.map((line, i) => {
          const yOff = startOffset + i * lineHeight;
          return (
            <text
              key={i}
              x={segment.cx}
              y={segment.cy + yOff}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={line.fontSize}
              fontWeight={line.fontWeight}
              fill="#31271c"
              pointerEvents="none"
              className="select-none"
            >
              {line.text}
            </text>
          );
        })}
      </g>
    );
  }
}
