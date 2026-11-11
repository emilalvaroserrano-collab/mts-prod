import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Boot } from "@/components/ui";

export const Route = createFileRoute("/production/user-portal")({
  head: () => ({
    meta: [{ title: "User Portal · Manage Tech Service" }],
  }),
  component: ProductionAccount,
});

const font = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif';

function ProductionAccount() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <Boot />;
  if (!user) return <Navigate to="/production/signin" />;
  const name = user.displayName || user.primaryEmail || "there";
  return (
    <main className="min-h-dvh bg-[#f5f5f7] text-[#1d1d1f]" style={{ fontFamily: font }}>
      <header className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-5">
        <Link to="/production" className="flex items-center gap-3">
          <span className="grid h-9 w-14 place-items-center overflow-hidden rounded-lg bg-black">
            <img src="/brand/mts-mark.png" alt="MTS" className="h-7 w-auto object-contain" />
          </span>
          <span className="text-sm font-semibold tracking-tight">User Portal</span>
        </Link>
        <button type="button" onClick={() => void signOut("/production")} className="text-sm font-medium text-[#6e6e73]">
          Sign out
        </button>
      </header>
      <section className="mx-auto w-full max-w-3xl px-5 py-16">
        <p className="text-sm font-medium text-[#6e6e73]">Manage Tech Service</p>
        <h1 className="mt-2 text-5xl font-semibold tracking-[-0.03em]">Welcome, {name}.</h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-[#6e6e73]">This is the new portal. Your invitation is active. Tickets, orders, and services will live here as this build grows.</p>
        <div className="mt-10 grid gap-3">
          {[
            ["Managed IT", "/production#managed-it"],
            ["Cloud Services", "/production#cloud"],
            ["IT Projects", "/production#projects"],
            ["Help Desk", "/production#help-desk"],
          ].map(([label, href]) => (
            <a key={label} href={href} className="rounded-2xl bg-white px-5 py-5 text-[15px] font-medium">
              {label}
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
