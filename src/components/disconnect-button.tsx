"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

/**
 * Two-step disconnect: the first click asks for confirmation inline (no browser dialog),
 * the second submits. Cached data for the repo is deleted; the App install stays.
 */
export function DisconnectButton({
  id,
  fullName,
  action,
}: {
  id: string;
  fullName: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Disconnect ${fullName}`}
        className="text-muted-foreground hover:text-destructive"
        onClick={() => setConfirming(true)}
      >
        Disconnect
      </Button>
    );
  }

  return (
    <form action={action} className="flex items-center gap-1">
      <input type="hidden" name="id" value={id} />
      <ConfirmButton fullName={fullName} />
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </form>
  );
}

function ConfirmButton({ fullName }: { fullName: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="destructive"
      size="sm"
      disabled={pending}
      aria-label={pending ? `Disconnecting ${fullName}` : `Confirm disconnect ${fullName}`}
    >
      {pending ? "Disconnecting…" : "Confirm disconnect"}
    </Button>
  );
}
