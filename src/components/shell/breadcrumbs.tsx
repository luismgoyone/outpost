"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { sectionFor } from "./nav-items";

export function Breadcrumbs() {
  const pathname = usePathname();
  const section = sectionFor(pathname);
  const isSectionRoot = section?.href === pathname;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex min-w-0 items-center gap-1.5 text-xs whitespace-nowrap"
    >
      {/* On phones the header is tight, so only the section shows. */}
      <span className="text-muted-foreground max-sm:hidden">Outpost</span>
      {section && (
        <>
          <span aria-hidden className="text-subtle-foreground max-sm:hidden">
            /
          </span>
          {isSectionRoot ? (
            <span aria-current="page" className="text-primary font-medium">
              {section.label}
            </span>
          ) : (
            <Link href={section.href} className="text-muted-foreground hover:text-foreground">
              {section.label}
            </Link>
          )}
        </>
      )}
    </nav>
  );
}
