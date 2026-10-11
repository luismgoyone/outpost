"use client";

import { Check, Copy } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";

import { createShareLinkAction } from "./actions";

/** Create a share link; its URL is shown once, with a copy button. */
export function ShareForm({ repoId }: { repoId: string }) {
  const [result, formAction, pending] = useActionState(createShareLinkAction, null);
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="repoId" value={repoId} />
        <label htmlFor="share-label" className="sr-only">
          Label
        </label>
        <input
          id="share-label"
          name="label"
          placeholder="Label, e.g. Client name"
          maxLength={80}
          className="bg-panel h-7 w-64 rounded-sm border px-2 text-[13px]"
        />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Creating…" : "Create share link"}
        </Button>
      </form>
      {result && "url" in result && (
        <div
          role="status"
          className="border-success/20 bg-success/8 flex flex-wrap items-center gap-2 rounded-sm border px-3 py-2"
        >
          <span className="text-success text-[12px]">
            Copy it now. It won&apos;t be shown again.
          </span>
          <code aria-label="Share URL" className="font-mono text-[12px] break-all">
            {result.url}
          </code>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(result.url).catch(() => undefined);
              setCopied(true);
            }}
          >
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      )}
      {result && "error" in result && (
        <p role="alert" className="text-destructive font-mono text-[12px]">
          {result.error}
        </p>
      )}
    </div>
  );
}
