import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  showCharCount?: boolean;
  charLimit?: number;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, showCharCount, charLimit, value, ...props }, ref) => {
    const currentLength = typeof value === "string" || typeof value === "number" ? String(value).length : 0;
    const isExceeded = charLimit ? currentLength > charLimit : false;

    return (
      <div className="relative w-full flex flex-col gap-1.5">
        <input
          type={type}
          className={cn(
            "flex h-11 md:h-9 w-full rounded-lg border bg-white dark:bg-[#1a1a1a] px-3 py-1 text-base md:text-[13px] text-[#3D2E1F] dark:text-[#f5f5f5] transition-all duration-150 file:border-0 file:bg-transparent file:text-[13px] file:font-medium placeholder:text-[#C4B5A5] dark:placeholder:text-[#555] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            (error || isExceeded) 
              ? "border-red-500 dark:border-red-500 focus:border-red-500 dark:focus:border-red-500 focus:ring-1 focus:ring-red-500/20 dark:focus:ring-red-500/20" 
              : "border-[#E2E8F0]/80 dark:border-[#2a2a2a] focus:border-[#2F3E8F] focus:ring-1 focus:ring-[#2F3E8F]/20",
            className
          )}
          ref={ref}
          value={value}
          {...props}
        />
        {(error || (showCharCount && charLimit)) && (
          <div className="flex items-center justify-between text-[11px] px-1 select-none transition-all duration-200">
            {error ? (
              <span className="text-red-500 font-medium animate-in fade-in-50 slide-in-from-top-1 duration-150">
                {error}
              </span>
            ) : (
              <span />
            )}
            {showCharCount && charLimit && (
              <span className={cn(
                "ml-auto font-mono text-[11px]",
                isExceeded 
                  ? "text-red-500 font-semibold animate-pulse" 
                  : currentLength >= charLimit * 0.8 
                    ? "text-amber-500" 
                    : "text-stone-400 dark:text-stone-500"
              )}>
                {currentLength}/{charLimit}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
