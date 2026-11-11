import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authEnabled } from "@/lib/auth/client";
import { signInWithInvitation } from "@/lib/auth/invited-sign-in";

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
const passwordForgotHref = "https://mts-portal.zendesk.com/auth/v3/password/forgot?locale=en-us&return_to=https%3A%2F%2Fmts-portal.zendesk.com";

function ProductionSignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
    <main className="grid min-h-dvh bg-[#f5f5f7] text-[#1d1d1f] lg:grid-cols-2" style={{ fontFamily: font }}>
      <section className="flex flex-col justify-between bg-black px-8 py-10 text-white sm:px-14 sm:py-14">
        <Link to="/production" className="text-sm font-medium tracking-tight text-white/80">
          Manage Tech Service
        </Link>
        <div className="py-16 lg:py-0">
          <h1 className="max-w-md text-5xl font-semibold tracking-[-0.03em] sm:text-6xl">Manage Tech Service</h1>
          <p className="mt-5 max-w-sm text-lg leading-8 text-white/70">User Portal. Invite only. One place for support, orders, and services.</p>
        </div>
        <p className="text-sm text-white/50">Use the email from your invitation.</p>
      </section>
      <section className="flex items-center justify-center px-6 py-16 sm:px-12">
        <div className="w-full max-w-sm">
          <h2 className="text-3xl font-semibold tracking-[-0.03em]">Sign in</h2>
          <p className="mt-3 text-[15px] leading-7 text-[#6e6e73]">The first visit sets your password.</p>
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
              <p className="text-sm text-[#6e6e73]">
                Emailed us for support?{" "}
                <a href={passwordForgotHref} className="font-semibold text-[#127e86]">Request password</a>
              </p>
            </form>
          ) : (
            <p className="mt-8 text-sm text-[#6e6e73]">Sign-in is disabled.</p>
          )}
        </div>
      </section>
    </main>
  );
}
