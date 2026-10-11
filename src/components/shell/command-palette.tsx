"use client";

import { FolderGit2, GitPullRequest, RefreshCw, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";

import { NAV_ITEMS } from "./nav-items";

export type PaletteRepo = { id: string; fullName: string };
export type PalettePull = { repo: string; number: number; title: string; url: string };

/**
 * ⌘K / Ctrl+K: jump to any page, connected repo or open PR (from the cached snapshot, so
 * opening it never calls GitHub), or run Sync.
 */
export function CommandPalette({
  repos,
  pulls,
  syncAction,
}: {
  repos: PaletteRepo[];
  pulls: PalettePull[];
  syncAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        aria-keyshortcuts="Meta+K Control+K"
        className="text-muted-foreground hover:text-foreground bg-panel ml-auto flex h-7 items-center gap-2 rounded-sm border px-2 text-[12px] transition-colors sm:w-56"
      >
        <Search aria-hidden className="size-3.5" />
        <span className="max-sm:hidden">Search…</span>
        <kbd className="text-subtle-foreground ml-auto font-mono text-[10px] max-sm:hidden">⌘K</kbd>
      </button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Command palette"
        description="Jump to a page, repository or pull request"
      >
        <Command>
          <CommandInput placeholder="Jump to a page, repo or pull request…" />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup heading="Pages">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                <CommandItem key={href} value={label} onSelect={() => run(() => router.push(href))}>
                  <Icon aria-hidden />
                  {label}
                </CommandItem>
              ))}
            </CommandGroup>
            {repos.length > 0 && (
              <CommandGroup heading="Repositories">
                {repos.map((repo) => (
                  <CommandItem
                    key={repo.id}
                    value={repo.fullName}
                    onSelect={() => run(() => router.push(`/repositories/${repo.id}`))}
                  >
                    <FolderGit2 aria-hidden />
                    <span className="font-mono text-[12px]">{repo.fullName}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {pulls.length > 0 && (
              <CommandGroup heading="Open pull requests">
                {pulls.map((pr) => (
                  <CommandItem
                    key={`${pr.repo}#${pr.number}`}
                    value={`${pr.title} ${pr.repo}#${pr.number}`}
                    onSelect={() => run(() => window.open(pr.url, "_blank", "noopener"))}
                  >
                    <GitPullRequest aria-hidden />
                    <span className="truncate">{pr.title}</span>
                    <CommandShortcut className="font-mono">
                      {pr.repo}#{pr.number}
                    </CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandGroup heading="Actions">
              <CommandItem
                value="Sync now"
                keywords={["refresh"]}
                onSelect={() => run(() => startTransition(() => syncAction()))}
              >
                <RefreshCw aria-hidden />
                Sync now
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
