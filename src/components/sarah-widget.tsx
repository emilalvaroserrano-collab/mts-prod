import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Send, X } from "lucide-react";
import { issueAgentHandoff } from "@/lib/portal/api";
import { useShopToken } from "@/lib/portal/shop-session";

const AGENT_URL = "https://mts-agent.vercel.app/";
const AGENT_ORIGIN = "https://mts-agent.vercel.app";

let sarahLive = false;
let voiceLevels: number[] = [];
const sarahLiveListeners = new Set<(live: boolean) => void>();
const voiceListeners = new Set<(levels: number[]) => void>();

function setSarahLive(next: boolean) {
  sarahLive = next;
  sarahLiveListeners.forEach((listener) => listener(next));
}

function setVoiceLevels(next: number[]) {
  voiceLevels = next;
  voiceListeners.forEach((listener) => listener(next));
}

function useSarahLive() {
  const [live, setLive] = useState(sarahLive);
  useEffect(() => {
    sarahLiveListeners.add(setLive);
    setLive(sarahLive);
    return () => {
      sarahLiveListeners.delete(setLive);
    };
  }, []);
  return live;
}

function useVoiceLevels() {
  const [levels, setLevels] = useState(voiceLevels);
  useEffect(() => {
    voiceListeners.add(setLevels);
    setLevels(voiceLevels);
    return () => {
      voiceListeners.delete(setLevels);
    };
  }, []);
  return levels;
}

function AgentMark({ className = "size-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M16 27a16 16 0 0 1 32 0" fill="none" stroke="currentColor" strokeWidth="4.4" strokeLinecap="round" />
      <rect x="7" y="23" width="10" height="15" rx="3" fill="currentColor" />
      <rect x="47" y="23" width="10" height="15" rx="3" fill="currentColor" />
      <path d="M32 16c8.4 0 15 6.4 15 14.4 0 6.2-3.4 10.4-8.2 13.2L32 54l-6.8-10.4C20.4 40.8 17 36.6 17 30.4 17 22.4 23.6 16 32 16z" fill="currentColor" />
      <circle cx="25.5" cy="31" r="1.8" fill="#e5f6f7" />
      <circle cx="32" cy="31" r="1.8" fill="#e5f6f7" />
      <circle cx="38.5" cy="31" r="1.8" fill="#e5f6f7" />
      <path d="M52 38c5 2 8 6 7 12" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
      <circle cx="58" cy="52" r="2.5" fill="currentColor" />
    </svg>
  );
}

function AudioBars({ levels, wide = false }: { levels: number[]; wide?: boolean }) {
  const count = wide ? 14 : 7;
  const height = wide ? 28 : 32;
  return (
    <span className={wide ? "flex h-8 w-full items-end gap-[3px]" : "flex h-8 w-full items-end justify-center gap-[3px]"} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => {
        const level = levels[index] ?? 0;
        return <span key={index} className="block w-full min-w-[3px] flex-1 rounded-full bg-accent" style={{ height: `${Math.max(3, Math.round((level / 100) * height))}px` }} />;
      })}
    </span>
  );
}

export function SarahWidget() {
  const token = useShopToken();
  const levels = useVoiceLevels();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "agent">("menu");
  const [sessionLive, setSessionLive] = useState(false);
  const [spot, setSpot] = useState<{ right: number; bottom: number } | null>(null);
  const [wide, setWide] = useState(false);
  const drag = useRef<{ px: number; py: number; right: number; bottom: number; moved: boolean; spot: { right: number; bottom: number } | null } | null>(null);
  const skipClick = useRef(false);
  const openRef = useRef(false);
  const liveRef = useRef(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const tokenRef = useRef("");

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    liveRef.current = sessionLive;
    setSarahLive(sessionLive);
    if (!sessionLive) setVoiceLevels([]);
  }, [sessionLive]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const apply = () => setWide(media.matches);
    apply();
    media.addEventListener("change", apply);
    const saved = window.localStorage.getItem("mts-sarah-spot");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { right?: number; bottom?: number };
        if (typeof parsed.right === "number" && typeof parsed.bottom === "number") setSpot({ right: parsed.right, bottom: parsed.bottom });
      } catch { /* keep the default corner */ }
    }
    const toggle = () => {
      if (openRef.current) setOpen(false);
      else {
        setOpen(true);
        if (liveRef.current) setMode("agent");
      }
    };
    const end = () => {
      setSessionLive(false);
      setMode("menu");
      setOpen(false);
    };
    window.addEventListener("mts-sarah-toggle", toggle);
    window.addEventListener("mts-sarah-end", end);
    return () => {
      media.removeEventListener("change", apply);
      window.removeEventListener("mts-sarah-toggle", toggle);
      window.removeEventListener("mts-sarah-end", end);
    };
  }, []);

  useEffect(() => {
    async function publish() {
      const current = tokenRef.current;
      const target = frame.current?.contentWindow;
      if (!current || !target) return;
      try {
        const issued = await issueAgentHandoff({ data: current });
        target.postMessage({ type: "mts-user", code: issued.code }, AGENT_ORIGIN);
      } catch { /* the agent stays a guest until the next ready ping */ }
    }
    function onMessage(event: MessageEvent) {
      if (event.origin !== AGENT_ORIGIN) return;
      if (event.data?.type === "mts-agent-ready") {
        void publish();
        return;
      }
      if (event.data?.type === "mts-voice" && Array.isArray(event.data.levels)) {
        setVoiceLevels(event.data.levels.filter((level: unknown) => typeof level === "number").slice(0, 14));
        return;
      }
      if (event.data?.type === "mts-minimize") setOpen(false);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  function openAgent() {
    setSessionLive(true);
    setMode("agent");
    setOpen(true);
  }

  function endSession() {
    setSessionLive(false);
    setMode("menu");
    setOpen(false);
  }

  const full = open && mode === "agent";
  const place = spot ? { right: spot.right, bottom: spot.bottom } : undefined;

  function clamp(right: number, bottom: number) {
    const size = 64;
    const minBottom = wide ? 8 : 88;
    return {
      right: Math.min(window.innerWidth - size - 8, Math.max(8, right)),
      bottom: Math.min(window.innerHeight - size - 8, Math.max(minBottom, bottom)),
    };
  }

  return (
    <>
      {sessionLive ? (
        <div
          className={full ? "fixed inset-0 z-50 flex md:inset-auto md:right-4 md:bottom-24 md:h-[min(100dvh-8rem,40rem)] md:w-[24rem]" : "pointer-events-none fixed inset-0 -z-10 opacity-0"}
          style={full && wide ? place : undefined}
        >
          <section className="h-full min-h-0 w-full overflow-hidden bg-surface md:rounded-2xl md:shadow-2xl">
            <iframe
              ref={frame}
              title="Manage Tech Service support"
              src={AGENT_URL}
              allow="microphone; camera; autoplay; display-capture; clipboard-write"
              className="h-full w-full border-0 bg-bg"
            />
          </section>
        </div>
      ) : null}
      <div
        className={full ? "hidden" : open || sessionLive ? "fixed inset-x-0 bottom-0 z-40 flex justify-end md:inset-x-auto md:right-4 md:bottom-24 md:w-[24rem]" : "hidden"}
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex w-full flex-col items-stretch gap-2 px-3 md:w-[24rem] md:items-end md:px-0">
          {sessionLive && !full ? (
            <div className="hidden w-full items-center gap-2 self-end rounded-full bg-ink py-2 pr-2 pl-4 text-white shadow-lg md:flex md:w-auto">
              <AudioBars levels={levels} />
              <button type="button" onClick={openAgent} className="min-w-0 flex-1 truncate text-left text-sm font-semibold">Sarah is still on the line</button>
              <button type="button" aria-label="End support" onClick={endSession} className="grid size-9 place-items-center rounded-full bg-[#8e1f0b]"><PhoneOff className="size-4" /></button>
            </div>
          ) : null}
          {open && mode === "menu" ? (
            <section className="grid w-full gap-3 self-end rounded-2xl border border-line bg-surface p-4 shadow-lg md:w-80">
              <div className="flex items-center justify-between text-ink">
                <p className="text-sm font-semibold">Support</p>
                <button type="button" aria-label="Close support" onClick={() => setOpen(false)}><X className="size-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={openAgent} className="grid h-20 place-items-center gap-1 rounded-xl bg-accent text-sm font-semibold text-white">
                  <Send className="size-5" />
                  Chat
                </button>
                <button type="button" onClick={openAgent} className="grid h-20 place-items-center gap-1 rounded-xl border border-line bg-accent-soft text-sm font-semibold text-ink">
                  <Phone className="size-5" />
                  Call
                </button>
              </div>
            </section>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        aria-label="Talk to support"
        aria-expanded={open}
        onPointerDown={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          drag.current = { px: event.clientX, py: event.clientY, right: window.innerWidth - rect.right, bottom: window.innerHeight - rect.bottom, moved: false, spot: null };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const current = drag.current;
          if (!current) return;
          const next = clamp(current.right - (event.clientX - current.px), current.bottom - (event.clientY - current.py));
          if (Math.hypot(event.clientX - current.px, event.clientY - current.py) > 6) current.moved = true;
          current.spot = next;
          setSpot(next);
        }}
        onPointerUp={() => {
          const current = drag.current;
          drag.current = null;
          if (!current?.moved || !current.spot) return;
          skipClick.current = true;
          window.localStorage.setItem("mts-sarah-spot", JSON.stringify(current.spot));
        }}
        onClick={() => {
          if (skipClick.current) {
            skipClick.current = false;
            return;
          }
          if (open && mode === "menu") setOpen(false);
          else if (sessionLive) openAgent();
          else setOpen(true);
        }}
        style={place}
        className={full || (sessionLive && !wide) ? "hidden" : "fixed right-4 bottom-[max(5.5rem,calc(4.5rem+env(safe-area-inset-bottom)))] z-50 grid size-16 touch-none cursor-grab place-items-center rounded-full bg-ink text-white shadow-[0_8px_24px_rgba(0,57,112,0.28)] ring-4 ring-white active:cursor-grabbing md:bottom-4"}
      >
        {sessionLive ? <AudioBars levels={levels} /> : <AgentMark />}
      </button>
    </>
  );
}

export function SarahHeaderButton() {
  const live = useSarahLive();
  const levels = useVoiceLevels();
  return (
    <span className="flex items-center md:hidden">
      <button type="button" className={live ? "flex h-9 w-[42vw] max-w-60 items-center justify-center rounded-full bg-accent-soft px-3" : "grid size-10 place-items-center rounded-xl text-ink"} aria-label={live ? "Sarah is still on the line" : "Talk to support"} onClick={() => window.dispatchEvent(new Event("mts-sarah-toggle"))}>
        {live ? <AudioBars levels={levels} wide /> : <AgentMark className="size-6" />}
      </button>
      {live ? (
        <button type="button" className="ml-1 grid size-8 place-items-center rounded-full bg-[#8e1f0b] text-white" aria-label="End support" onClick={() => window.dispatchEvent(new Event("mts-sarah-end"))}>
          <PhoneOff className="size-3.5" />
        </button>
      ) : null}
    </span>
  );
}
