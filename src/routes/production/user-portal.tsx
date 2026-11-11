import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Navigate, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { PortalShell } from "@/components/customer-portal";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { openPortalFromAuth } from "@/lib/portal/api";
import { rewriteProductionPath } from "@/lib/portal/paths";
import { setShopToken, useShopToken } from "@/lib/portal/shop-session";
import { PortalHome } from "@/routes/portal/index";

export const Route = createFileRoute("/production/user-portal")({
  component: ProductionPortalLayout,
});

function ProductionPortalLayout() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const token = useShopToken();
  const link = useQuery({
    queryKey: ["portal-auth", user?.id],
    queryFn: () => openPortalFromAuth(),
    enabled: Boolean(user),
    retry: false,
  });
  if (typeof window !== "undefined") sessionStorage.setItem("mts-production-portal", "1");
  useEffect(() => {
    if (link.data?.token && link.data.token !== token) setShopToken(link.data.token);
  }, [link.data?.token, token]);
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      const url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) return;
      const next = rewriteProductionPath(url.pathname);
      if (!next || next === url.pathname) return;
      event.preventDefault();
      event.stopPropagation();
      void navigate({ to: next });
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [navigate]);
  if (!isPending && !user) return <Navigate to="/production/signin" />;
  const home = path === "/production/user-portal" || path === "/production/user-portal/";
  return (
    <PortalShell>
      {link.isError ? <p className="mb-4 rounded-xl bg-bad-soft px-4 py-3 text-sm text-bad">{link.error instanceof Error ? link.error.message : "The portal could not open this account."}</p> : null}
      {home ? <PortalHome /> : path.endsWith("/call") ? <Outlet /> : <Outlet />}
    </PortalShell>
  );
}
