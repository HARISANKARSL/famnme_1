/**
 * SlideshowMode — full-screen auto-advancing slideshow with Ken Burns effect
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Pause, Play, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import type { Memory } from '@/types';

interface SlideshowModeProps {
  memories: Memory[];
  onClose: () => void;
}

const SPEEDS = [
  { label: '5s', value: 5000 },
  { label: '8s', value: 8000 },
  { label: '12s', value: 12000 },
];

export function SlideshowMode({ memories, onClose }: SlideshowModeProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(8000);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [kenBurnsPhase, setKenBurnsPhase] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mediaMemories = memories.filter(m => m.mediaUrl && (m.memoryType === 'photo' || m.memoryType === 'video'));
  const current = mediaMemories[currentIdx];

  const goNext = useCallback(() => {
    setCurrentIdx(i => (i + 1) % mediaMemories.length);
    setKenBurnsPhase(p => p + 1);
  }, [mediaMemories.length]);

  const goPrev = useCallback(() => {
    setCurrentIdx(i => (i - 1 + mediaMemories.length) % mediaMemories.length);
    setKenBurnsPhase(p => p + 1);
  }, [mediaMemories.length]);

  // Auto-advance
  useEffect(() => {
    if (playing && mediaMemories.length > 1) {
      timerRef.current = setTimeout(goNext, speed);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }
  }, [playing, currentIdx, speed, goNext, mediaMemories.length]);

  // Auto-hide controls
  const showControlsBriefly = useCallback(() => {
    setShowControls(true);
    if (hideRef.current) clearTimeout(hideRef.current);
    hideRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    showControlsBriefly();
    return () => { if (hideRef.current) clearTimeout(hideRef.current); };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === ' ') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'p') setPlaying(p => !p);
      showControlsBriefly();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, onClose, showControlsBriefly]);

  if (mediaMemories.length === 0) {
    return (
      <div className="fixed inset-0 z-[70] bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 text-lg">No photos or videos to display</p>
          <button onClick={onClose} className="mt-4 px-6 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20">Close</button>
        </div>
      </div>
    );
  }

  // Ken Burns transform variations (cycles through 4 different zoom/pan combos)
  const kenBurnsTransforms = [
    'scale(1.05) translate(-1%, -1%)',
    'scale(1.1) translate(1%, 0%)',
    'scale(1.08) translate(0%, 1%)',
    'scale(1.06) translate(-0.5%, -0.5%)',
  ];
  const kbTransform = kenBurnsTransforms[kenBurnsPhase % kenBurnsTransforms.length];

  return (
    <div
      className="fixed inset-0 z-[70] bg-black cursor-none"
      onMouseMove={showControlsBriefly}
      onClick={showControlsBriefly}
      style={{ cursor: showControls ? 'default' : 'none' }}
    >
      {/* Image with Ken Burns */}
      {current && (
        <div className="absolute inset-0 overflow-hidden">
          <img
            key={current.memoryId}
            src={current.mediaUrl!}
            alt={current.title}
            className="absolute inset-0 w-full h-full object-contain"
            style={{
              transform: kbTransform,
              transition: `transform ${speed}ms ease-in-out`,
            }}
          />
        </div>
      )}

      {/* Title overlay */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-8 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <p className="text-white text-xl font-semibold">{current?.title}</p>
        {current?.dateTaken && (
          <p className="text-white/60 text-sm mt-1">
            {new Date(current.dateTaken).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        )}
        <p className="text-white/40 text-xs mt-1">{currentIdx + 1} / {mediaMemories.length}</p>
      </div>

      {/* Controls overlay */}
      <div className={`absolute top-0 left-0 right-0 flex items-center justify-between p-4 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <button onClick={onClose} className="p-2 rounded-full bg-black/30 text-white/80 hover:bg-black/50 backdrop-blur-sm">
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <button onClick={goPrev} className="p-2 rounded-full bg-black/30 text-white/80 hover:bg-black/50 backdrop-blur-sm">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => setPlaying(p => !p)} className="p-3 rounded-full bg-black/30 text-white/80 hover:bg-black/50 backdrop-blur-sm">
            {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button onClick={goNext} className="p-2 rounded-full bg-black/30 text-white/80 hover:bg-black/50 backdrop-blur-sm">
            <ChevronRight className="w-5 h-5" />
          </button>
          <button onClick={() => setShowSettings(s => !s)} className="p-2 rounded-full bg-black/30 text-white/80 hover:bg-black/50 backdrop-blur-sm">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Speed settings popup */}
      {showSettings && showControls && (
        <div className="absolute top-16 right-4 bg-black/70 backdrop-blur-md rounded-xl p-3 space-y-1">
          <p className="text-white/50 text-[11px] font-medium mb-2">Slide Duration</p>
          {SPEEDS.map(s => (
            <button
              key={s.value}
              onClick={() => { setSpeed(s.value); setShowSettings(false); }}
              className={`block w-full text-left px-3 py-1.5 rounded-lg text-sm ${
                speed === s.value ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
