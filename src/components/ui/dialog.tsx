import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useResponsive } from "@/hooks/useResponsive"
import { BottomSheet } from "@/components/ui/BottomSheet"

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { hideCloseButton?: boolean }
>(({ className, children, hideCloseButton, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      onInteractOutside={(e) => e.preventDefault()}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-1.5rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-md text-[#3D2E1F] dark:text-[#f5f5f5] p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-[#E2E8F0]/60 dark:border-[#2a2a2a] duration-200 max-h-[90dvh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden overscroll-contain data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.97] data-[state=open]:zoom-in-[0.97] data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-2xl",
        className
      )}
      {...props}
    >
      {children}
      {!hideCloseButton && (
        <DialogPrimitive.Close className="absolute right-4 top-4 p-1.5 rounded-lg opacity-60 transition-all duration-150 hover:opacity-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/40 focus:ring-offset-2 disabled:pointer-events-none text-[#8B7355] dark:text-[#999]">
          <X className="h-4 w-4" strokeWidth={1.5} />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-0 sm:space-x-2 pt-2 [&>button]:w-full [&>button]:sm:w-auto",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-[16px] font-semibold leading-none tracking-tight text-[#3D2E1F] dark:text-[#f5f5f5]",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-[13px] text-[#8B7355] dark:text-[#999]", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

/**
 * ResponsiveDialogContent — renders as BottomSheet on mobile, standard DialogContent on desktop.
 * Usage: Replace `DialogContent` import with `ResponsiveDialogContent` in any modal.
 * The parent `<Dialog open={...} onOpenChange={...}>` controls open/close state.
 */
interface ResponsiveDialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  mobileTitle?: string
  hideCloseButton?: boolean
}

const ResponsiveDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  ResponsiveDialogContentProps
>(({ className, children, mobileTitle, hideCloseButton, ...props }, ref) => {
  const { isMobile } = useResponsive()

  if (isMobile) {
    // Strip desktop-only scroll/sizing classes — BottomSheet handles scrolling.
    // Nested overflow-y-auto inside the BottomSheet's own scrollable area
    // creates a scroll trap on iOS where neither container scrolls.
    const mobileClassName = className
      ?.replace(/\bmax-h-\[[\w%]+\]/g, '')
      .replace(/\boverflow-(auto|scroll|hidden)\b/g, '')
      .replace(/\boverflow-[xy]-(auto|scroll|hidden)\b/g, '')
      .replace(/\boverscroll-\w+\b/g, '')
      .replace(/\bmax-w-\w+\b/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    return (
      <DialogPortal>
        <BottomSheet
          open={true}
          onClose={() => {
            // Dispatch Escape to trigger Radix Dialog's built-in close handler
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
          }}
          title={mobileTitle}
          contentClassName="p-0"
        >
          <DialogPrimitive.Content
            ref={ref}
            className={cn("outline-none", mobileClassName)}
            {...props}
            style={{ position: 'static', transform: 'none', maxHeight: 'none', ...props.style }}
          >
            {children}
          </DialogPrimitive.Content>
        </BottomSheet>
      </DialogPortal>
    )
  }

  // Desktop: render the standard centered dialog
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        onInteractOutside={(e) => e.preventDefault()}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-1.5rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-md text-[#3D2E1F] dark:text-[#f5f5f5] p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-[#E2E8F0]/60 dark:border-[#2a2a2a] duration-200 max-h-[90dvh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden overscroll-contain data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.97] data-[state=open]:zoom-in-[0.97] data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-2xl",
          className
        )}
        {...props}
      >
        {children}
        {!hideCloseButton && (
          <DialogPrimitive.Close className="absolute right-4 top-4 p-1.5 rounded-lg opacity-60 transition-all duration-150 hover:opacity-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/40 focus:ring-offset-2 disabled:pointer-events-none text-[#8B7355] dark:text-[#999]">
            <X className="h-4 w-4" strokeWidth={1.5} />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
ResponsiveDialogContent.displayName = "ResponsiveDialogContent"

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  ResponsiveDialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
