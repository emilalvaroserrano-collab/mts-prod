import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/routes/_app/dashboard";

export const Route = createFileRoute("/production/admin-portal/")({
  component: DashboardPage,
});
