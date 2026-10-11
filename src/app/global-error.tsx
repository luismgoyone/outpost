"use client";

import "./globals.css";

import { StatusScreen } from "@/components/shell/status-screen";
import { Button } from "@/components/ui/button";

/** Last resort when the root layout itself fails; it replaces <html>, so it brings its own. */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="flex min-h-full flex-col">
        <StatusScreen
          code={error.digest ? `ref ${error.digest}` : undefined}
          title="Outpost hit an error"
          actions={<Button onClick={() => retry()}>Try again</Button>}
        >
          The app failed to load. Try again in a moment.
        </StatusScreen>
      </body>
    </html>
  );
}
