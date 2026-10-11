"use client";

import { Menu } from "lucide-react";
import { useState } from "react";

import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

/**
 * Below `md` the sidebar is hidden, so the header shows a menu button that opens the same
 * sidebar content in a drawer. Following any link inside closes it.
 */
export function MobileNav({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open menu"
        className="text-muted-foreground hover:text-foreground hover:bg-surface-hover -ml-1 rounded-sm p-1 md:hidden"
      >
        <Menu aria-hidden className="size-4" />
      </SheetTrigger>
      <SheetContent side="left" className="bg-panel w-64 gap-0 p-3 sm:max-w-64">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <div
          className="flex h-full flex-col"
          onClickCapture={(event) => {
            if ((event.target as HTMLElement).closest("a")) setOpen(false);
          }}
        >
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
