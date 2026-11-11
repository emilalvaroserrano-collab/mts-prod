import { Link } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

const font = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif';

const chapters = [
  {
    id: "managed-it",
    kicker: "Managed IT",
    title: "Technology that just works.",
    copy: "Proactive monitoring, a live help desk, and the day-to-day care of your servers, network, and devices. Less downtime. Less overhead. More time for the work that matters.",
    tone: "light" as const,
    items: [
      "Server and Network Solutions",
      "PC and Mac Support",
      "Vendor Management",
      "Backup and Recovery",
      "VoIP Communications",
      "Virtual CIO Services",
      "Managed Security Services",
      "24-Hour Support",
    ],
  },
  {
    id: "cloud",
    kicker: "Cloud Services",
    title: "Secure access from anywhere.",
    copy: "Scale up or down without the weight of aging hardware. Hosting, desktops, and infrastructure, monitored and ready when your team is.",
    tone: "dark" as const,
    items: [
      "Application Hosting",
      "Desktop as a Service (DaaS)",
      "Infrastructure as a Service (IaaS)",
      "Colocation",
      "Virtual Server Hosting",
      "Virtualization Support",
    ],
  },
  {
    id: "projects",
    kicker: "IT Projects",
    title: "Your IT department. One project at a time.",
    copy: "Planning, installation, and migration when you need it now. Wi-Fi, security, and the move to what comes next.",
    tone: "light" as const,
    items: [
      "IT Consulting",
      "Migrations and Deployment",
      "Wi-Fi Networks",
      "Mobility (BYOD)",
      "Security Assessments",
      "Staff Augmentation",
    ],
  },
];

export function ProductionHome() {
  const { user } = useCurrentUserState();
  return (
    <div className="min-h-dvh bg-[#f5f5f7] text-[#1d1d1f]" style={{ fontFamily: font }}>
      <header className="sticky top-0 z-30 border-b border-black/5 bg-[#f5f5f7]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link to="/production" className="flex items-center gap-3">
            <span className="grid h-9 w-14 place-items-center overflow-hidden rounded-lg bg-black">
              <img src="/brand/mts-mark.png" alt="MTS" className="h-7 w-auto object-contain" />
            </span>
            <span className="text-sm font-semibold tracking-tight">Manage Tech Service</span>
          </Link>
          {user ? (
            <Link to="/production/user-portal" className="rounded-full bg-[#1d1d1f] px-4 py-2 text-[13px] font-medium text-white">
              Portal
            </Link>
          ) : (
            <Link to="/production/signin" className="rounded-full bg-[#1d1d1f] px-4 py-2 text-[13px] font-medium text-white">
              Sign In
            </Link>
          )}
        </div>
        <nav className="mx-auto flex w-full max-w-6xl gap-6 overflow-x-auto px-5 pb-3 text-[13px] text-[#6e6e73] sm:px-8">
          <a href="#managed-it" className="shrink-0 hover:text-[#1d1d1f]">Managed IT</a>
          <a href="#cloud" className="shrink-0 hover:text-[#1d1d1f]">Cloud</a>
          <a href="#projects" className="shrink-0 hover:text-[#1d1d1f]">IT Projects</a>
          <a href="#help-desk" className="shrink-0 hover:text-[#1d1d1f]">Help Desk</a>
        </nav>
      </header>

      <section className="bg-black text-white">
        <div className="mx-auto grid min-h-[78vh] w-full max-w-6xl content-center px-5 py-20 sm:px-8">
          <img src="/brand/mts-mark.png" alt="" className="h-24 w-auto object-contain object-left sm:h-32" />
          <p className="mt-8 text-sm font-medium tracking-[0.18em] text-[#7af6ff] uppercase">Los Angeles</p>
          <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-[-0.03em] sm:text-7xl sm:leading-[1.02]">Technology that drives business success.</h1>
          <p className="mt-6 max-w-xl text-xl leading-8 text-white/70">Cutting-edge, affordable IT solutions. Proactive support, cloud, and projects, so your team can stay ahead.</p>
          <div className="mt-10 flex flex-wrap items-center gap-6">
            <Link to="/production/signin" className="rounded-full bg-[#00e5ff] px-6 py-3 text-sm font-semibold text-black">Sign in to the portal</Link>
            <a href="tel:8187584073" className="text-sm font-medium text-[#7af6ff]">(818) 758-4073</a>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-5 py-20 sm:px-8 lg:grid-cols-3">
        {[
          ["Expert IT guidance", "Specialists who help you choose the right systems, then put them in place."],
          ["Proactive managed IT", "24/7 monitoring that finds issues before they reach your team."],
          ["Full-service help desk", "On-site, on-call, and remote advisors when something needs a person."],
        ].map(([title, copy]) => (
          <article key={title} className="rounded-[28px] bg-white px-7 py-8 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-3 text-[15px] leading-7 text-[#6e6e73]">{copy}</p>
          </article>
        ))}
      </section>

      {chapters.map((chapter) => (
        <section id={chapter.id} key={chapter.id} className={chapter.tone === "dark" ? "bg-black text-white" : "bg-[#f5f5f7]"}>
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-24 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
            <div>
              <p className={`text-xs font-semibold tracking-[0.2em] uppercase ${chapter.tone === "dark" ? "text-[#7af6ff]" : "text-[#127e86]"}`}>{chapter.kicker}</p>
              <h2 className="mt-3 max-w-md text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">{chapter.title}</h2>
              <p className={`mt-5 max-w-md text-lg leading-8 ${chapter.tone === "dark" ? "text-white/70" : "text-[#6e6e73]"}`}>{chapter.copy}</p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {chapter.items.map((item) => (
                <li key={item} className={`rounded-2xl px-5 py-5 text-[15px] font-medium ${chapter.tone === "dark" ? "bg-white/8 text-white" : "bg-white text-[#1d1d1f]"}`}>{item}</li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      <section id="help-desk" className="bg-white">
        <div className="mx-auto w-full max-w-6xl px-5 py-24 sm:px-8">
          <p className="text-xs font-semibold tracking-[0.2em] text-[#127e86] uppercase">Help Desk</p>
          <h2 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">A person, when you need one.</h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#6e6e73]">Remote and on-site support for the work that stops a day. Outlook, printers, Wi-Fi, slow connections, updates, and the password that will not cooperate.</p>
          <div className="mt-10 flex flex-wrap gap-3">
            {["Outlook and email", "Printers", "Wi-Fi and internet", "Updates and drivers", "Files and shared drives", "Mobile setup"].map((item) => (
              <span key={item} className="rounded-full bg-[#f5f5f7] px-4 py-2 text-sm font-medium">{item}</span>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-[#f5f5f7]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-10 text-sm text-[#6e6e73] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>Manage Tech Service. Your trusted partner in getting, and staying, ahead.</p>
          <a href="tel:8187584073" className="font-medium text-[#1d1d1f]">(818) 758-4073</a>
        </div>
      </footer>
    </div>
  );
}
