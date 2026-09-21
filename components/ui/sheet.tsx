"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

export interface SheetProps {
  title: string;
  description?: string;
  triggerLabel: string;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export function Sheet({
  title,
  description,
  triggerLabel,
  children,
  open,
  onOpenChange,
  className,
}: SheetProps) {
  return (
    <DrawerPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DrawerPrimitive.Trigger className="inline-flex touch-manipulation items-center justify-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        {triggerLabel}
      </DrawerPrimitive.Trigger>
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Viewport className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <DrawerPrimitive.Popup
            className={cn(
              "w-full max-w-md rounded-2xl border border-border bg-card p-6 overscroll-contain text-foreground shadow-2xl",
              className
            )}
          >
            <DrawerPrimitive.Content className="flex min-w-0 flex-col">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <DrawerPrimitive.Title className="text-lg font-bold text-balance text-foreground">
                    {title}
                  </DrawerPrimitive.Title>
                  {description && (
                    <DrawerPrimitive.Description className="mt-1 text-sm break-words text-muted-foreground">
                      {description}
                    </DrawerPrimitive.Description>
                  )}
                </div>
                <DrawerPrimitive.Close
                  aria-label="Close sheet"
                  className="rounded-lg p-1.5 touch-manipulation text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={18} aria-hidden="true" />
                </DrawerPrimitive.Close>
              </div>
              <div className="mt-4 min-w-0">{children}</div>
            </DrawerPrimitive.Content>
          </DrawerPrimitive.Popup>
        </DrawerPrimitive.Viewport>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
