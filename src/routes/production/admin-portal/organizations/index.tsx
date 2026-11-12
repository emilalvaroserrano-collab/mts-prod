import { createFileRoute } from "@tanstack/react-router";
import { CompaniesPage } from "@/routes/_app/organizations/index";

export const Route = createFileRoute("/production/admin-portal/organizations/")({
  component: CompaniesPage,
});
