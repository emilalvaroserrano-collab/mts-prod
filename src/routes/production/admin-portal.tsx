import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Navigate, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Shell } from "@/components/shell";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getSessionHome } from "@/lib/portal/api";
import { rewriteAdminPath } from "@/lib/portal/paths";

export const Route = createFileRoute("/production/admin-portal")({
  component: ProductionAdminLayout,
});

function ProductionAdminLayout() {
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const home = useQuery({
    queryKey: ["session-home", user?.id],
    queryFn: () => getSessionHome(),
    enabled: Boolean(user),
  });
  if (typeof window !== "undefined") sessionStorage.setItem("mts-production-admin", "1");
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor || anchor.getAttribute("target") === "_blank") return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      const url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) return;
      const next = rewriteAdminPath(url.pathname);
      if (!next || next === url.pathname) return;
      event.preventDefault();
      event.stopPropagation();
      void navigate({ to: next, search: Object.fromEntries(url.searchParams.entries()) });
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [navigate]);
  if (!isPending && !user) return <Navigate to="/production/signin" />;
  if (home.isSuccess && home.data && !home.data.desk) return <Navigate to="/production/user-portal" />;
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}
