/**
 * TutorialOverlay — Full-screen guided tour with spotlight + tooltip.
 *
 * Highlights the target element with a dark backdrop cutout,
 * shows a positioned tooltip with step info, and provides
 * Next/Back/Skip navigation.
 */

import { useEffect, useState, useCallback } from 'react';
import { useTutorialStore } from '@/store/tutorialStore';
import { ChevronRight, ChevronLeft, X, Gem } from 'lucide-react';

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8; // padding around the highlighted element
const TOOLTIP_GAP = 12; // gap between target and tooltip

export function TutorialOverlay() {
  const { isActive, currentStep, steps, nextStep, prevStep, skipTutorial } = useTutorialStore();
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const updatePosition = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.targetSelector);
    if (!el) {
      // Element not found — skip to show tooltip centered
      setTargetRect(null);
      setTooltipStyle({
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      });
      return;
    }

    // Scroll element into view
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

    // Wait for scroll to finish
    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const tr: TargetRect = {
        top: rect.top - PADDING,
        left: rect.left - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
      };
      setTargetRect(tr);

      // Calculate tooltip position
      const tooltipWidth = 320;
      const tooltipHeight = 200;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let style: React.CSSProperties = {};

      // If target is very large (covers >60% of viewport), center the tooltip
      const targetCoversScreen = tr.width > vw * 0.6 && tr.height > vh * 0.5;
      if (targetCoversScreen) {
        style = {
          top: Math.max(80, vh * 0.35),
          left: Math.max(16, (vw - tooltipWidth) / 2),
        };
        setTooltipStyle(style);
        return;
      }

      switch (step.position) {
        case 'right':
          style = {
            top: Math.max(16, Math.min(tr.top, vh - tooltipHeight - 16)),
            left: Math.min(tr.left + tr.width + TOOLTIP_GAP, vw - tooltipWidth - 16),
          };
          break;
        case 'left':
          style = {
            top: Math.max(16, Math.min(tr.top, vh - tooltipHeight - 16)),
            left: Math.max(16, tr.left - tooltipWidth - TOOLTIP_GAP),
          };
          break;
        case 'bottom':
          style = {
            top: Math.min(tr.top + tr.height + TOOLTIP_GAP, vh - tooltipHeight - 16),
            left: Math.max(16, Math.min(tr.left, vw - tooltipWidth - 16)),
          };
          break;
        case 'top':
          style = {
            top: Math.max(16, tr.top - tooltipHeight - TOOLTIP_GAP),
            left: Math.max(16, Math.min(tr.left, vw - tooltipWidth - 16)),
          };
          break;
      }

      // Final safety: ensure tooltip is always within viewport
      if (typeof style.top === 'number' && style.top > vh - tooltipHeight - 16) {
        style.top = vh - tooltipHeight - 16;
      }

      setTooltipStyle(style);
    }, 300);
  }, [step]);

  useEffect(() => {
    if (!isActive) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [isActive, currentStep, updatePosition]);

  if (!isActive || !step) return null;

  // Build the clip-path for the spotlight cutout
  const backdropStyle: React.CSSProperties = targetRect
    ? {
        clipPath: `polygon(
          0% 0%, 0% 100%,
          ${targetRect.left}px 100%,
          ${targetRect.left}px ${targetRect.top}px,
          ${targetRect.left + targetRect.width}px ${targetRect.top}px,
          ${targetRect.left + targetRect.width}px ${targetRect.top + targetRect.height}px,
          ${targetRect.left}px ${targetRect.top + targetRect.height}px,
          ${targetRect.left}px 100%,
          100% 100%, 100% 0%
        )`,
      }
    : {};

  return (
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true">
      {/* Dark backdrop with cutout */}
      <div
        className="absolute inset-0 bg-black/60 transition-all duration-300"
        style={backdropStyle}
        onClick={skipTutorial}
      />

      {/* Highlight ring around target */}
      {targetRect && (
        <div
          className="absolute rounded-lg border-2 border-[#2F3E8F] pointer-events-none transition-all duration-300 animate-pulse"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            boxShadow: '0 0 0 4px rgba(47, 62, 143, 0.2)',
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="absolute bg-white dark:bg-[#1a1a1a] rounded-xl shadow-2xl border border-[#E2E8F0] dark:border-[#333] p-5 transition-all duration-300 animate-fade-in"
        style={{ ...tooltipStyle, width: 320, zIndex: 10000 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gem className="w-4 h-4 text-[#2F3E8F]" />
            <span className="text-[10px] text-[#2F3E8F] font-semibold uppercase tracking-wider">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          <button
            onClick={skipTutorial}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#333] text-gray-400 transition-colors"
            title="Close tutorial"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <h3 className="text-base font-semibold text-[#3D2E1F] dark:text-[#f5f5f5] mb-2">
          {step.title}
        </h3>
        <p className="text-sm text-[#8B7355] dark:text-[#999] leading-relaxed mb-4">
          {step.description}
        </p>

        {/* Step dots */}
        <div className="flex items-center gap-1.5 mb-4">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === currentStep
                  ? 'w-6 bg-[#2F3E8F]'
                  : i < currentStep
                  ? 'w-1.5 bg-[#2F3E8F]/40'
                  : 'w-1.5 bg-[#E2E8F0]'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={skipTutorial}
            className="text-xs text-[#B8A090] hover:text-[#8B7355] transition-colors"
          >
            Skip tutorial
          </button>
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={prevStep}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-[#8B7355] border border-[#E2E8F0] rounded-lg hover:bg-[#F4F6FA] transition-colors"
              >
                <ChevronLeft className="w-3 h-3" />
                Back
              </button>
            )}
            <button
              onClick={nextStep}
              className="flex items-center gap-1 px-4 py-1.5 text-xs font-medium text-white bg-[#2F3E8F] rounded-lg hover:bg-[#3B4DA6] transition-colors"
            >
              {isLastStep ? 'Finish' : 'Next'}
              {!isLastStep && <ChevronRight className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
