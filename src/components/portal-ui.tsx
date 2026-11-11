import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PortalPanel({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("grid gap-3 rounded-2xl border border-line bg-surface/90 p-4 shadow-sm backdrop-blur-sm", className)}>
      {title || action ? (
        <div className="flex items-center justify-between gap-3">
          {title ? <h2 className="text-sm font-medium">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function DataField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1 rounded-xl bg-surface-2/70 px-3 py-2.5">
      <p className="text-[11px] font-medium tracking-wide text-muted uppercase">{label}</p>
      <p className="truncate text-sm font-medium text-ink">{value || "Not set"}</p>
    </div>
  );
}

export function StatTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <article className="rounded-2xl border border-line bg-surface/90 px-4 py-3 shadow-sm backdrop-blur-sm">
      <p className="text-[11px] font-medium tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-1 text-2xl font-medium tabular-nums">{value}</p>
    </article>
  );
}
