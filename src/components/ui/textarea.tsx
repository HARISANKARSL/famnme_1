import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  showCharCount?: boolean;
  charLimit?: number;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, showCharCount, charLimit, value, ...props }, ref) => {
    const currentLength = typeof value === "string" || typeof value === "number" ? String(value).length : 0;
    const isExceeded = charLimit ? currentLength > charLimit : false;

    return (
      <div className="relative w-full flex flex-col gap-1.5">
        <textarea
          className={cn(
            "flex min-h-[60px] w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            (error || isExceeded) 
              ? "border-red-500 dark:border-red-500 focus:border-red-500 dark:focus:border-red-500 focus-visible:ring-1 focus-visible:ring-red-500/20 dark:focus-visible:ring-red-500/20" 
              : "border-input focus-visible:ring-1 focus-visible:ring-ring",
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
Textarea.displayName = "Textarea"

export { Textarea }
