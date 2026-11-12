import { createFileRoute } from "@tanstack/react-router";
import { CompanyPage } from "@/routes/_app/organizations/$orgId";

export const Route = createFileRoute("/production/admin-portal/organizations/$orgId")({
  component: CompanyPage,
});
