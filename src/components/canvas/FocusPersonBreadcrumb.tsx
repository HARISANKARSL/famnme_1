/**
 * FocusPersonBreadcrumb - Navigation breadcrumb for progressive disclosure
 *
 * Shows a floating bar at the bottom of the canvas with the navigation history:
 *   Home (Abhilash Pillai) > Satheesh Pillai
 *
 * Clicking on a breadcrumb navigates to that person's focused view.
 * Home button returns to the original home person.
 */

import { useRef, useState, useEffect } from 'react';
import { Home, ChevronRight, ChevronLeft } from 'lucide-react';
import type { FocusHistoryEntry } from '@/services/focusNavigationService';

interface FocusPersonBreadcrumbProps {
  breadcrumbs: FocusHistoryEntry[];
  currentIndex: number;
  onNavigateTo: (index: number) => void;
  onHome: () => void;
}

const formatBreadcrumbName = (name: string): string => {
  if (!name) return '';
  return name.split(' ').filter(part => part && part !== 'undefined').join(' ');
};

export function FocusPersonBreadcrumb({
  breadcrumbs,
  currentIndex,
  onNavigateTo,
  onHome,
}: FocusPersonBreadcrumbProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // Check scroll position and update arrow visibility
  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    setShowLeftArrow(scrollLeft > 2);
    setShowRightArrow(scrollWidth - clientWidth - scrollLeft > 2);
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    checkScroll();

    el.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    const observer = new MutationObserver(checkScroll);
    observer.observe(el, { childList: true, subtree: true });

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      observer.disconnect();
    };
  }, [breadcrumbs]);

  // Auto-scroll to end on new breadcrumb addition or active index change
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
    setTimeout(checkScroll, 300);
  }, [breadcrumbs.length, currentIndex]);

  const scrollByAmount = (offset: number) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollBy({ left: offset, behavior: 'smooth' });
  };

  if (breadcrumbs.length === 0) return null;

  if (breadcrumbs.length === 1) {
    return (
      <div className="flex items-center gap-1.5 text-xs bg-white/95 backdrop-blur-sm
                      px-3 py-2 rounded-lg shadow-md border border-gray-200">
        <Home className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-gray-600 font-medium">{formatBreadcrumbName(breadcrumbs[0].personName)}</span>
      </div>
    );
  }

  return (
    <div className="relative flex items-center bg-white/95 backdrop-blur-sm
                    rounded-lg shadow-md border border-gray-200
                    max-w-[calc(100vw-2rem)] md:max-w-md overflow-hidden select-none">
      {/* Left Arrow */}
      {showLeftArrow && (
        <button
          onClick={() => scrollByAmount(-120)}
          className="absolute left-0 top-0 bottom-0 z-10 flex items-center justify-center px-2
                     bg-gradient-to-r from-white via-white/90 to-transparent
                     text-[#8B5E3C] hover:text-[#5B3E24] transition-colors"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
        </button>
      )}

      {/* Scrollable Container */}
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-1 text-xs px-3 py-2 overflow-x-auto scrollbar-none scrollbar-hide w-full"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Home button */}
        <button
          onClick={onHome}
          className="flex items-center gap-1 px-2 py-1 rounded-md
                     hover:bg-[#E8EDFF] text-gray-600 hover:text-[#25327A]
                     transition-colors whitespace-nowrap flex-shrink-0"
          title="Return to yourself"
        >
          <Home className="w-3.5 h-3.5" />
        </button>

        {breadcrumbs.map((entry, idx) => (
          <div key={`${entry.personId}-${idx}`} className="flex items-center gap-1 flex-shrink-0">
            {idx > 0 && (
              <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
            )}
            <button
              onClick={() => onNavigateTo(idx)}
              className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap
                ${idx === currentIndex
                  ? 'bg-[#F3E8DE] text-[#8B5E3C] font-semibold'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                }`}
            >
              {formatBreadcrumbName(entry.personName)}
            </button>
          </div>
        ))}
      </div>

      {/* Right Arrow */}
      {showRightArrow && (
        <button
          onClick={() => scrollByAmount(120)}
          className="absolute right-0 top-0 bottom-0 z-10 flex items-center justify-center px-2
                     bg-gradient-to-l from-white via-white/90 to-transparent
                     text-[#8B5E3C] hover:text-[#5B3E24] transition-colors"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      )}
    </div>
  );
}
