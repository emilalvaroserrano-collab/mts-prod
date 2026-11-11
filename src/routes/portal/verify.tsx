import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { portalVerify } from "@/lib/portal/api";
import { setShopToken } from "@/lib/portal/shop-session";

export const Route = createFileRoute("/portal/verify")({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === "string" ? search.email : "",
    code: typeof search.code === "string" ? search.code : "",
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState(search.email);
  const [code, setCode] = useState(search.code);
  const [error, setError] = useState("");
  const verify = useMutation({
    mutationFn: () => portalVerify({ data: { email, code } }),
    onSuccess: (result) => {
      setShopToken(result.token);
      void navigate({ to: "/portal" });
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "Could not verify."),
  });

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <form
        className="grid w-full max-w-md gap-4 rounded-3xl border border-line bg-white p-6"
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          verify.mutate();
        }}
      >
        <h1 className="text-2xl font-semibold tracking-tight">Verify your email</h1>
        <p className="text-sm text-muted">Enter the 6-digit code. If mail is connected it was sent from noreply. If not, the code is shown here for the demo.</p>
        {search.code ? <p className="rounded-xl bg-accent-soft px-3 py-2 text-sm">Demo code: {search.code}</p> : null}
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required className="h-12 rounded-xl border border-line px-3" />
        <input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" required placeholder="6-digit code" className="h-12 rounded-xl border border-line px-3" />
        {error ? <p className="text-sm text-bad">{error}</p> : null}
        <button type="submit" disabled={verify.isPending} className="h-12 rounded-xl bg-ink text-sm font-semibold text-white">Verify and sign in</button>
      </form>
    </main>
  );
}
