import { createFileRoute } from "@tanstack/react-router";
import { PortalServices } from "@/routes/portal/services/index";

export const Route = createFileRoute("/production/user-portal/services/")({
  component: PortalServices,
});
