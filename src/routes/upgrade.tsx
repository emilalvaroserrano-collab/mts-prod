import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/upgrade")({
  component: UpgradePage,
});

const steps = [
  "Checking the portal surface",
  "Refreshing tickets, orders, and services",
  "Holding the entry page while the experience updates",
];

function UpgradePage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,229,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.06)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="upgrade-scan absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(0,229,255,0.16),transparent)]" />
        <div className="login-orb absolute top-[-10rem] left-1/2 size-[32rem] -translate-x-1/2 rounded-full bg-[#00e5ff]/15 blur-3xl" />
      </div>
      <div className="relative mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center px-5 py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <img src="/brand/mts-mark.png" alt="MTS" className="h-12 w-auto object-contain" />
          <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.22em] text-[#7af6ff] uppercase">
            <span className="upgrade-blink inline-block size-2 rounded-full bg-[#00e5ff] shadow-[0_0_12px_#00e5ff]" />
            Live
          </p>
        </div>
        <p className="font-mono text-xs tracking-[0.28em] text-white/50 uppercase">System status</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">Upgrading the App Experience</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-white/65">The portal entry is paused while the experience is being upgraded. This page stays up until the update is finished.</p>
        <div className="mt-10 overflow-hidden rounded-3xl border border-[#00e5ff]/25 bg-white/5 shadow-[0_0_80px_rgba(0,229,255,0.08),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 font-mono text-[11px] tracking-[0.18em] text-white/55 uppercase">
            <span>Upgrade sequence</span>
            <span className="upgrade-blink text-[#7af6ff]">Running</span>
          </div>
          <div className="relative h-1.5 overflow-hidden bg-white/10">
            <div className="upgrade-sweep absolute inset-y-0 w-1/2 bg-[#00e5ff]" />
          </div>
          <ul className="grid gap-3 px-5 py-5">
            {steps.map((step, index) => (
              <li key={step} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 font-mono text-sm">
                <span className={`upgrade-blink inline-block size-2 rounded-full bg-[#00e5ff] ${index === 1 ? "upgrade-blink-late" : ""}`} />
                <span className="text-white/80">{step}</span>
              </li>
            ))}
            <li className="font-mono text-sm text-[#7af6ff]">
              Awaiting release<span className="upgrade-caret">_</span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
