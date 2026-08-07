import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-[13px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F3E8F]/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#2F3E8F] text-white shadow-[0_2px_8px_rgba(47, 62, 143,0.2)] hover:brightness-110 active:scale-[0.98]",
        destructive:
          "bg-red-500 text-white shadow-sm hover:bg-red-600 active:scale-[0.98]",
        outline:
          "border border-[#E2E8F0]/80 dark:border-[#2a2a2a] bg-transparent text-[#8B7355] dark:text-[#999] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] hover:text-[#3D2E1F] dark:hover:text-[#f5f5f5] hover:border-[#2F3E8F]/30",
        secondary:
          "bg-black/[0.04] dark:bg-white/[0.06] text-[#3D2E1F] dark:text-[#f5f5f5] hover:bg-black/[0.06] dark:hover:bg-white/[0.08]",
        ghost:
          "text-[#8B7355] dark:text-[#999] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] hover:text-[#3D2E1F] dark:hover:text-[#f5f5f5]",
        link: "text-[#2F3E8F] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 md:h-9 px-4 py-2",
        sm: "h-10 md:h-8 rounded-lg px-3 text-[12px]",
        lg: "h-11 rounded-lg px-6",
        icon: "h-11 w-11 md:h-9 md:w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
