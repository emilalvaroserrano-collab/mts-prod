import { createFileRoute } from "@tanstack/react-router";
import { IntegrationPage } from "@/routes/_app/integrations";

export const Route = createFileRoute("/production/admin-portal/integrations")({
  component: IntegrationPage,
});
