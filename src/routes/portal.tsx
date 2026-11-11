import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { PortalShell } from "@/components/customer-portal";
import { openPortalFromAuth } from "@/lib/portal/api";
import { setShopToken, useShopToken } from "@/lib/portal/shop-session";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Boot } from "@/components/ui";

export const Route = createFileRoute("/portal")({
  component: PortalLayout,
});

function PortalLayout() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const { user, isPending } = useCurrentUserState();
  const token = useShopToken();
  const link = useQuery({
    queryKey: ["portal-auth", user?.id],
    queryFn: () => openPortalFromAuth(),
    enabled: Boolean(user),
  });
  useEffect(() => {
    if (link.data?.token) setShopToken(link.data.token);
  }, [link.data?.token]);
  if (isPending || (user && (link.isPending || link.data?.token !== token))) return <Boot />;
  if (!user) return <Navigate to="/upgrade" />;
  if (path === "/portal/call") return <Outlet />;
  return (
    <PortalShell>
      <Outlet />
    </PortalShell>
  );
}
