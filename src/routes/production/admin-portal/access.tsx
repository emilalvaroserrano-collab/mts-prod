import { createFileRoute } from "@tanstack/react-router";
import { AccessPage } from "@/routes/_app/access";

export const Route = createFileRoute("/production/admin-portal/access")({
  component: AccessPage,
});
