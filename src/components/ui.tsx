import * as Dialog from "@radix-ui/react-dialog";
import * as Switch from "@radix-ui/react-switch";
import { cva, type VariantProps } from "class-variance-authority";
import { LayoutGrid, List, X } from "lucide-react";
import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const buttonStyles = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold shadow-[inset_0_-1px_0_rgba(0,0,0,0.12)] transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-accent text-white hover:bg-[#0c6368]",
        secondary: "border border-line-strong bg-surface text-ink shadow-none hover:bg-surface-2",
        ghost: "text-ink shadow-none hover:bg-surface-2",
        danger: "border border-bad/20 bg-bad-soft text-bad shadow-none hover:opacity-90",
      },
      size: {
        md: "h-8 px-3",
        sm: "h-7 px-2.5",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles>) {
  return <button className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}

const fieldClass =
  "h-9 w-full rounded-lg border border-line-strong bg-surface px-3 text-[13px] text-ink outline-none placeholder:text-subtle";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldClass, props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(fieldClass, "h-auto min-h-28 py-3", props.className)}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(fieldClass, "pr-8", props.className)} />;
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-ink">{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

const tones = {
  neutral: "bg-surface-2 text-muted",
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  info: "bg-info-soft text-info",
  pine: "bg-accent-soft text-accent",
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof tones;
  children: ReactNode;
}) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}

const statusTone: Record<string, keyof typeof tones> = {
  new: "info",
  incoming: "info",
  open: "pine",
  pending: "warn",
  solved: "good",
  closed: "neutral",
  approved: "info",
  processing: "warn",
  fulfilled: "good",
  cancelled: "bad",
  denied: "bad",
  urgent: "bad",
  high: "warn",
  normal: "neutral",
  low: "neutral",
  active: "good",
  inactive: "neutral",
};

export function StatusBadge({ value }: { value: string }) {
  const key = value.toLowerCase();
  return <Badge tone={statusTone[key] ?? "neutral"}>{value}</Badge>;
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] w-full overflow-auto rounded-t-3xl border border-line bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(0,0,0,0.16)] outline-none sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[min(36rem,calc(100%-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-base font-semibold text-ink">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-muted">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close className="grid size-7 place-items-center rounded-lg text-muted hover:bg-surface-2" aria-label="Close">
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <div className="mt-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Toggle({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface px-3 py-3">
      <span className="text-sm text-ink">{label}</span>
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={label}
        className="relative h-6 w-11 shrink-0 rounded-full bg-line-strong data-[state=checked]:bg-accent"
      >
        <Switch.Thumb className="block size-5 translate-x-0.5 rounded-full bg-surface transition-transform duration-150 data-[state=checked]:translate-x-5" />
      </Switch.Root>
    </label>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-3 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
      <div className="min-w-0 max-w-full">
        {eyebrow ? <p className="text-[11px] font-semibold tracking-[0.14em] text-subtle uppercase">{eyebrow}</p> : null}
        <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl break-words text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="admin-actions flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("grid min-w-0 max-w-full content-start gap-3 overflow-hidden rounded-xl border border-line bg-surface p-4 shadow-[0_1px_0_rgba(0,0,0,0.04)] break-words", className)}>{children}</section>;
}

export function useViewMode(key: string, fallback: "grid" | "list" = "grid") {
  const [mode, setMode] = useState<"grid" | "list">(fallback);
  useEffect(() => {
    const saved = window.localStorage.getItem(key);
    if (saved === "grid" || saved === "list") setMode(saved);
  }, [key]);
  function choose(next: "grid" | "list") {
    setMode(next);
    window.localStorage.setItem(key, next);
  }
  return [mode, choose] as const;
}

export function ViewSwitch({ mode, onChange }: { mode: "grid" | "list"; onChange: (mode: "grid" | "list") => void }) {
  return (
    <div className="flex shrink-0 rounded-lg border border-line bg-surface p-0.5" role="group" aria-label="Layout">
      <button type="button" aria-pressed={mode === "grid"} aria-label="Grid view" onClick={() => onChange("grid")} className={mode === "grid" ? "grid size-11 place-items-center rounded-md bg-ink text-white md:size-8" : "grid size-11 place-items-center rounded-md text-muted md:size-8"}>
        <LayoutGrid className="size-4" />
      </button>
      <button type="button" aria-pressed={mode === "list"} aria-label="List view" onClick={() => onChange("list")} className={mode === "list" ? "grid size-11 place-items-center rounded-md bg-ink text-white md:size-8" : "grid size-11 place-items-center rounded-md text-muted md:size-8"}>
        <List className="size-4" />
      </button>
    </div>
  );
}

export function Loading({ label = "Loading the desk" }: { label?: string }) {
  return (
    <div className="grid gap-3" aria-busy="true" aria-label={label}>
      <div className="h-8 w-48 animate-pulse rounded-md bg-surface-2" />
      <div className="h-24 animate-pulse rounded-2xl bg-surface-2" />
      <div className="h-40 animate-pulse rounded-2xl bg-surface-2" />
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-bad/30 bg-bad-soft px-4 py-3 text-sm text-bad" role="alert">
      {message}
    </div>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong px-4 py-10 text-center">
      <p className="font-medium text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}

export function Boot() {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="text-center">
        <p className="text-sm font-semibold text-ink">Manage Tech Service</p>
        <p className="mt-1 text-[13px] text-muted">Opening admin</p>
      </div>
    </div>
  );
}

export function errorText(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong.";
}
