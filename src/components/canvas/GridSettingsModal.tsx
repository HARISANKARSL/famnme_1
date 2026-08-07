/**
 * GridSettingsModal Component
 *
 * Modal for toggling grid overlay visualization options.
 * Used for development and debugging of tree layout.
 */

import { X } from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';

export interface GridSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showGridOverlay: boolean;
  showGrid: boolean;
  showGenerationLines: boolean;
  showAnchorPoints: boolean;
  showMeasurements: boolean;
  showNodeCenters: boolean;
  showSnapGuides: boolean;
  onToggleGridOverlay: (value: boolean) => void;
  onToggleGrid: (value: boolean) => void;
  onToggleGenerationLines: (value: boolean) => void;
  onToggleAnchorPoints: (value: boolean) => void;
  onToggleMeasurements: (value: boolean) => void;
  onToggleNodeCenters: (value: boolean) => void;
  onToggleSnapGuides: (value: boolean) => void;
}

export function GridSettingsModal({
  isOpen,
  onClose,
  showGridOverlay,
  showGrid,
  showGenerationLines,
  showAnchorPoints,
  showMeasurements,
  showNodeCenters,
  showSnapGuides,
  onToggleGridOverlay,
  onToggleGrid,
  onToggleGenerationLines,
  onToggleAnchorPoints,
  onToggleMeasurements,
  onToggleNodeCenters,
  onToggleSnapGuides,
}: GridSettingsModalProps) {
  const { isMobile } = useResponsive();
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`fixed z-50 bg-white shadow-xl overflow-auto ${isMobile ? 'bottom-0 left-0 right-0 rounded-t-lg rounded-b-none max-h-[90dvh]' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg w-[calc(100vw-2rem)] sm:w-[400px] max-w-[400px] max-h-[500px]'}`} style={isMobile ? { paddingBottom: 'env(safe-area-inset-bottom)' } : undefined}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Grid Overlay Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-gray-600 mb-4">
            Toggle visualization options for debugging tree layout
          </p>

          <div className="space-y-3">
            {/* Main Toggle */}
            <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded">
              <input
                type="checkbox"
                checked={showGridOverlay}
                onChange={(e) => onToggleGridOverlay(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900">Show Grid Overlay</div>
                <div className="text-xs text-gray-500">Enable grid visualization</div>
              </div>
            </label>

            {/* Sub-options (only enabled when main toggle is on) */}
            {showGridOverlay && (
              <div className="ml-4 pl-4 border-l-2 border-gray-200 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(e) => onToggleGrid(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <div className="text-sm text-gray-900">Grid Cells</div>
                    <div className="text-xs text-gray-500">Show grid cell boundaries</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={showGenerationLines}
                    onChange={(e) => onToggleGenerationLines(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <div className="text-sm text-gray-900">Generation Lines</div>
                    <div className="text-xs text-gray-500">Show horizontal generation separators</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={showAnchorPoints}
                    onChange={(e) => onToggleAnchorPoints(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <div className="text-sm text-gray-900">Anchor Points</div>
                    <div className="text-xs text-gray-500">Show edge connection points</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={showMeasurements}
                    onChange={(e) => onToggleMeasurements(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <div className="text-sm text-gray-900">Measurements</div>
                    <div className="text-xs text-gray-500">Show spacing measurements</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={showNodeCenters}
                    onChange={(e) => onToggleNodeCenters(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <div className="text-sm text-gray-900">Node Centers</div>
                    <div className="text-xs text-gray-500">Show center points of cards</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={showSnapGuides}
                    onChange={(e) => onToggleSnapGuides(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <div className="text-sm text-gray-900">Snap Guides</div>
                    <div className="text-xs text-gray-500">Show alignment guides</div>
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
