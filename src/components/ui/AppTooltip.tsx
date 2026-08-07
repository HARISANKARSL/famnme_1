/**
 * AppTooltip — Lightweight tooltip wrapper for consistent styling across the app.
 *
 * Usage:
 *   <AppTooltip content="Add a family member">
 *     <button><Plus /></button>
 *   </AppTooltip>
 *
 * On touch devices, renders children without tooltip (no hover on mobile).
 * Requires <TooltipProvider> at the app root (in App.tsx).
 */

import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

interface AppTooltipProps {
  content: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  children: React.ReactNode
  enabled?: boolean
}

// Detect touch-primary device once
const isTouchPrimary = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

export function AppTooltip({ content, side = 'top', align = 'center', children, enabled = true }: AppTooltipProps) {
  // Skip tooltip on touch devices or when disabled
  if (!enabled || isTouchPrimary || !content) {
    return <>{children}</>
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent
        side={side}
        align={align}
        className="bg-[#FCFAF7]/95 dark:bg-[#1E1A18]/95 text-[#3D2E1F] dark:text-[#EADFC9] border border-[#EADFC9]/80 dark:border-[#3D3530] shadow-[0_8px_30px_rgba(61,46,31,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] text-[12px] font-medium px-3.5 py-2 rounded-xl max-w-[240px] leading-relaxed whitespace-normal break-words text-center backdrop-blur-sm"
        sideOffset={6}
      >
        {content}
      </TooltipContent>
    </Tooltip>
  )
}
