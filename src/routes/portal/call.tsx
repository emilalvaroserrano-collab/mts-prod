import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { usePortalSession } from "@/lib/portal/use-portal-session";

export const Route = createFileRoute("/portal/call")({
  component: CallDesk,
});

type DeskWindow = Window & {
  MTS_CSR_CONTEXT?: { name: string; organization: string; role: string };
  MTS_CSR_NAVIGATE?: (route: string) => void;
};

export function CallDesk() {
  const frame = useRef<HTMLIFrameElement>(null);
  const user = useCurrentUser();
  const session = usePortalSession();

  function publish() {
    const customer = session.data?.customer;
    const context = {
      name: user?.displayName || customer?.name || "",
      organization: session.data?.business || session.data?.organization || "",
      role: session.data?.access.roleLabel || "Customer",
    };
    sessionStorage.setItem("mts-csr-context", JSON.stringify(context));
    const win = frame.current?.contentWindow as DeskWindow | null;
    if (!win) return;
    win.MTS_CSR_CONTEXT = context;
    win.MTS_CSR_NAVIGATE = (route: string) => {
      if (route.startsWith("/portal")) window.location.assign(route);
    };
    win.dispatchEvent(new Event("mts:csr-context-ready"));
  }

  useEffect(() => {
    publish();
  });

  return (
    <iframe
      ref={frame}
      title="Call Sarah"
      src="/csr-call.html"
      onLoad={publish}
      allow="microphone; camera; autoplay; display-capture; clipboard-write"
      className="fixed inset-0 z-50 h-dvh w-full border-0 bg-[#080d16]"
    />
  );
}
