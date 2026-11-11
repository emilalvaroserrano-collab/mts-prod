import { createFileRoute } from "@tanstack/react-router";
import { PortalHome } from "@/routes/portal/index";

export const Route = createFileRoute("/production/user-portal/")({
  component: PortalHome,
});
