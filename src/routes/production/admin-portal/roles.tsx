import { createFileRoute } from "@tanstack/react-router";
import { RolesPage } from "@/routes/_app/roles";

export const Route = createFileRoute("/production/admin-portal/roles")({
  component: RolesPage,
});
