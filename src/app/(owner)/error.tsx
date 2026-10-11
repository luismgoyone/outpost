"use client";

import { RotateCw } from "lucide-react";

import { StatusScreen } from "@/components/shell/status-screen";
import { Button } from "@/components/ui/button";

/** A page failed to render. The shell stays, so the owner can retry or go elsewhere. */
export default function OwnerError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <StatusScreen
      code={error.digest ? `ref ${error.digest}` : undefined}
      title="Something went wrong"
      actions={
        <Button onClick={() => retry()}>
          <RotateCw aria-hidden />
          Try again
        </Button>
      }
    >
      This page couldn&apos;t load. GitHub may be down or rate limiting. The reference above matches
      the server logs.
    </StatusScreen>
  );
}
