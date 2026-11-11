import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authEnabled } from "@/lib/auth/client";
import { signInWithInvitation } from "@/lib/auth/invited-sign-in";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Boot } from "@/components/ui";

export const Route = createFileRoute("/production/signin")({
  head: () => ({
    meta: [
      { title: "Sign in · Manage Tech Service User Portal" },
      { name: "description", content: "Invite-only sign-in for the Manage Tech Service User Portal." },
    ],
  }),
  component: ProductionSignIn,
});

const font = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif';

function ProductionSignIn() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isPending) return <Boot />;
  if (user) return <Navigate to="/production/user-portal" />;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signInWithInvitation({ data: { email, password } });
      navigate({ to: "/production/user-portal" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in.");
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f5f5f7] px-4 py-16 text-[#1d1d1f]" style={{ fontFamily: font }}>
      <div className="w-full max-w-[420px]">
        <Link to="/production" className="mb-8 grid h-16 w-24 place-items-center overflow-hidden rounded-2xl bg-black">
          <img src="/brand/mts-mark.png" alt="Manage Tech Service" className="h-12 w-auto object-contain" />
        </Link>
        <p className="text-sm font-medium text-[#6e6e73]">Manage Tech Service</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.03em]">User Portal</h1>
        <p className="mt-3 text-[15px] leading-7 text-[#6e6e73]">Invite only. Sign in with the email from your invitation. The first visit sets your password.</p>
        {authEnabled ? (
          <form className="mt-8 grid gap-4" onSubmit={submit}>
            <label className="grid gap-2 text-sm font-medium">
              Email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" placeholder="you@company.com" className="h-12 rounded-2xl border border-black/10 bg-white px-4 text-base font-normal outline-none" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              <span className="flex items-center justify-between">
                Password
                <button type="button" onClick={() => setShowPassword((current) => !current)} className="text-xs font-semibold text-[#127e86]">{showPassword ? "Hide" : "Show"}</button>
              </span>
              <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete="current-password" placeholder="At least 8 characters" className="h-12 rounded-2xl border border-black/10 bg-white px-4 text-base font-normal outline-none" />
            </label>
            {error ? <p className="text-sm text-[#8e1f0b]" role="alert">{error}</p> : null}
            <button type="submit" disabled={busy} className="mt-2 h-12 rounded-full bg-[#1d1d1f] text-sm font-semibold text-white disabled:opacity-50">
              {busy ? "Signing in" : "Sign in"}
            </button>
          </form>
        ) : (
          <p className="mt-8 text-sm text-[#6e6e73]">Sign-in is disabled.</p>
        )}
      </div>
    </main>
  );
}
