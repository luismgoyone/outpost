import { Box } from "lucide-react";

/** Centered full-page message: sign-in, 404 and error screens. */
export function StatusScreen({
  code,
  title,
  children,
  actions,
}: {
  code?: string;
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="bg-card flex w-full max-w-sm flex-col gap-4 rounded-lg border p-6">
        <div className="flex items-center gap-2.5">
          <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-sm">
            <Box aria-hidden className="size-3.5" />
          </span>
          <span className="text-[15px] font-semibold tracking-[-0.01em]">Outpost</span>
          {code && (
            <span className="text-subtle-foreground ml-auto font-mono text-[11px]">{code}</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-lg font-semibold tracking-[-0.01em]">{title}</h1>
          {children && <div className="text-muted-foreground text-[13px]">{children}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
