import { createFileRoute } from "@tanstack/react-router";
import { OrganizationPage } from "@/routes/portal/organization";

export const Route = createFileRoute("/production/user-portal/organization")({
  component: OrganizationPage,
});
