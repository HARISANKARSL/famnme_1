import { useState, useEffect, useMemo } from 'react';
import { Gem, Landmark } from 'lucide-react';
import type { FaithContext } from '@/data/temples/sacredPlaceLabels';
import { getSacredPlaceNounLower } from '@/data/temples/sacredPlaceLabels';

interface TempleAILoadingOverlayProps {
  templeName: string;
  isVisible: boolean;
  faithContext?: FaithContext;
}

function getSteps(faith?: FaithContext): string[] {
  const noun = getSacredPlaceNounLower(faith ?? null);
  return [
    `Locating ${noun} on the map...`,
    'Analyzing your ancestors\' connection...',
    'Extracting rituals and traditions...',
    'Checking current service timings...',
    `Preparing your ${noun} profile...`,
  ];
}

export function TempleAILoadingOverlay({ templeName, isVisible, faithContext }: TempleAILoadingOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const steps = useMemo(() => getSteps(faithContext), [faithContext]);

  useEffect(() => {
    if (!isVisible) {
      setStepIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setStepIndex(prev => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1200);
    return () => clearInterval(interval);
  }, [isVisible, steps.length]);

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-10 bg-[#F6F2EA]/95 dark:bg-[#1E1E1E]/95 flex flex-col items-center justify-center px-6 backdrop-blur-sm">
      {/* Icon */}
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2F3E8F] to-[#8B5E3C] flex items-center justify-center shadow-lg">
          <Landmark className="w-8 h-8 text-white" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#2F3E8F] flex items-center justify-center animate-pulse">
          <Gem className="w-3.5 h-3.5 text-white" />
        </div>
      </div>

      {/* Temple name */}
      <h2 className="text-[15px] font-bold text-[#3D2E1F] dark:text-[#f5f5f5] text-center mb-1">
        {templeName}
      </h2>
      <p className="text-[12px] text-[#8B7355] dark:text-[#A19F9D] text-center mb-6">
        Our AI is preparing your personalized {getSacredPlaceNounLower(faithContext ?? null)} profile
      </p>

      {/* Current step */}
      <div className="w-full max-w-xs mb-4">
        <p className="text-[13px] text-[#2F3E8F] font-medium text-center min-h-[20px] transition-all">
          {steps[stepIndex]}
        </p>
      </div>

      {/* Stepped progress dots */}
      <div className="flex items-center gap-2">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-500 ${
              i <= stepIndex
                ? 'w-2.5 h-2.5 bg-[#2F3E8F]'
                : 'w-1.5 h-1.5 bg-[#E2DBCE] dark:bg-[#2a2a2a]'
            }`}
          />
        ))}
      </div>

      {/* Flavor text */}
      <p className="text-[11px] text-[#B8A090] dark:text-[#666] text-center mt-6 max-w-[220px]">
        Like your ancestors, we're finding the sacred thread that connects your family to this place.
      </p>
    </div>
  );
}
