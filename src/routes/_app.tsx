import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { Boot } from "@/components/ui";
import { getSessionHome } from "@/lib/portal/api";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, isPending } = useCurrentUserState();
  const home = useQuery({
    queryKey: ["session-home", user?.id],
    queryFn: () => getSessionHome(),
    enabled: Boolean(user),
  });
  if (isPending || (user && home.isPending)) return <Boot />;
  if (!user) return <Navigate to="/upgrade" />;
  if (!home.data?.desk) return <Navigate to="/portal" />;
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}
