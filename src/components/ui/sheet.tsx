"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const Sheet = DialogPrimitive.Root

interface SheetContentProps extends Omit<DialogPrimitive.Popup.Props, "title"> {
  title: string
  closeLabel: string
}

function SheetContent({
  className,
  children,
  title,
  closeLabel,
  ...props
}: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        data-slot="sheet-backdrop"
        className="fixed inset-0 z-50 bg-black/50 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
      />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-[85vw] max-w-sm flex-col gap-4 border-l border-border bg-background p-4 shadow-lg outline-none data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right",
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between">
          <DialogPrimitive.Title className="text-sm font-medium">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Close
            aria-label={closeLabel}
            className="rounded-[3px] p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <XIcon className="size-4" />
          </DialogPrimitive.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

export { Sheet, SheetContent }
