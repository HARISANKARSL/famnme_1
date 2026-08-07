/**
 * PedigreeConnectors - SVG connector lines matching Ancestry.com style
 * Animated: lines fade in and smoothly transition positions.
 */

import { memo } from 'react';
import type { ConnectorLine } from '@/services/ancestryPedigreeService';
import { useTheme } from '@/contexts/ThemeContext';

interface PedigreeConnectorsProps {
  connectors: ConnectorLine[];
  width: number;
  height: number;
}

export const PedigreeConnectors = memo(function PedigreeConnectors({
  connectors, width, height,
}: PedigreeConnectorsProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const strokeColor = isDark ? '#4b5563' : '#c4b5a4';

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
      style={{ overflow: 'visible' }}
    >
      {connectors.map((c, i) => (
        <g key={i} style={{ opacity: 1 }}>
          <line
            x1={c.fromX} y1={c.fromY} x2={c.midX} y2={c.fromY}
            stroke={strokeColor} strokeWidth={1.5}
            style={{ transition: 'x1 0.5s ease, y1 0.5s ease, x2 0.5s ease, y2 0.5s ease' }}
          />
          <line
            x1={c.midX} y1={c.fromY} x2={c.midX} y2={c.toY}
            stroke={strokeColor} strokeWidth={1.5}
            style={{ transition: 'x1 0.5s ease, y1 0.5s ease, x2 0.5s ease, y2 0.5s ease' }}
          />
          <line
            x1={c.midX} y1={c.toY} x2={c.toX} y2={c.toY}
            stroke={strokeColor} strokeWidth={1.5}
            style={{ transition: 'x1 0.5s ease, y1 0.5s ease, x2 0.5s ease, y2 0.5s ease' }}
          />
        </g>
      ))}
    </svg>
  );
});
