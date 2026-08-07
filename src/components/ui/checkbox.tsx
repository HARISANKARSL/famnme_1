import * as React from "react"
import { cn } from "@/lib/utils"

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    return (
      <input
        type="checkbox"
        ref={ref}
        checked={checked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        className={cn(
          "h-4 w-4 shrink-0 rounded border border-[#E2E8F0]/80 dark:border-[#2a2a2a] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F3E8F]/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 accent-[#2F3E8F] transition-colors",
          className
        )}
        {...props}
      />
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
