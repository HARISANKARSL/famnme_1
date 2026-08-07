import React, { useState, useEffect } from 'react';
import { Loader2, Heart, Users, ShieldCheck, CloudUpload, Clock, Sparkles } from 'lucide-react';

const LOADING_MESSAGES = [
  "Gathering your family moments...",
  "Preserving memories for generations...",
  "Connecting the hearts of your home...",
  "Securing your family heritage...",
  "Creating your ancestry vault...",
  "Almost there, wrapping up memories...",
  "Honoring your family legacy...",
  "Building your digital heirloom...",
];

const FAMILY_ICONS = [
  Heart,
  Users,
  ShieldCheck,
  CloudUpload,
  Clock,
  Sparkles,
];

interface FamilyUploadLoaderProps {
  open: boolean;
  progressText?: string;
}

export function FamilyUploadLoader({ open, progressText }: FamilyUploadLoaderProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [iconIndex, setIconIndex] = useState(0);

  useEffect(() => {
    if (!open) return;

    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2800);

    const iconInterval = setInterval(() => {
      setIconIndex((prev) => (prev + 1) % FAMILY_ICONS.length);
    }, 1200);

    return () => {
      clearInterval(messageInterval);
      clearInterval(iconInterval);
    };
  }, [open]);

  if (!open) return null;

  const ActiveIcon = FAMILY_ICONS[iconIndex];

  return (
    <>
      <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center p-4">
        {/* Immersive Dark Overlay */}
        <div className="absolute inset-0 bg-[#0a0a0a]/80 backdrop-blur-[6px] animate-in fade-in duration-500" />
        
        {/* Modal Box */}
        <div className="relative w-full max-w-sm bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] shadow-[0_30px_70px_rgba(0,0,0,0.5)] p-10 flex flex-col items-center text-center border border-white/5 animate-in zoom-in-95 duration-300">
          
          {/* Animated Icon Container */}
          <div className="relative mb-8 group">
            <div className="absolute inset-0 bg-[#C2A46D]/10 blur-[40px] rounded-full scale-150 animate-pulse" />
            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-[#C2A46D] via-[#A8894F] to-[#8B7355] flex items-center justify-center shadow-2xl border border-white/10">
              <ActiveIcon className="w-10 h-10 text-white animate-in zoom-in-0 duration-400 drop-shadow-lg" />
              <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-white dark:bg-[#262626] flex items-center justify-center shadow-xl border border-white/10">
                <Loader2 className="w-4 h-4 text-[#C2A46D] animate-spin" />
              </div>
            </div>
          </div>

          {/* Text Area */}
          <div className="space-y-6 w-full">
            <div className="h-10 flex flex-col items-center justify-center">
               <p className="text-[15px] font-bold text-stone-800 dark:text-stone-100 transition-all duration-500 leading-tight">
                {LOADING_MESSAGES[messageIndex]}
              </p>
            </div>
            
            <div className="flex flex-col gap-4 py-2 border-t border-stone-100 dark:border-white/5 pt-6">
              <p className="text-[11px] font-bold text-[#C2A46D] tracking-[0.2em] uppercase min-h-[1.5em]">
                {progressText || "Connecting Hearts"}
              </p>
              
              <div className="w-full h-1 bg-stone-100 dark:bg-white/5 rounded-full overflow-hidden">
                 <div className="h-full bg-gradient-to-r from-[#C2A46D] to-[#A8894F] w-1/3 rounded-full animate-[progress_2s_ease-in-out_infinite]" />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <div 
                  key={i} 
                  className="w-1.5 h-1.5 rounded-full bg-[#C2A46D]/20 animate-bounce" 
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}} />
    </>
  );
}
