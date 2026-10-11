"use client";

import { cn } from "cn";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/write-actions";

/**
 * A one-click write action (re-run, nudge, redeploy) with its pending state and result
 * shown inline next to the button.
 */
export function ActionButton({
  action,
  fields,
  label,
  pendingLabel,
  ariaLabel,
}: {
  action: (state: ActionResult, formData: FormData) => Promise<ActionResult>;
  fields: Record<string, string | number>;
  label: string;
  pendingLabel: string;
  ariaLabel?: string;
}) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex items-center gap-2">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={pending || result?.ok}
        aria-label={ariaLabel}
      >
        {pending ? pendingLabel : label}
      </Button>
      {result && (
        <span
          role="status"
          className={cn(
            "max-w-64 font-mono text-[11px] leading-4 whitespace-normal",
            result.ok ? "text-success" : "text-destructive",
          )}
        >
          {result.message}
        </span>
      )}
    </form>
  );
}
