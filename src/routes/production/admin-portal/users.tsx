import { createFileRoute } from "@tanstack/react-router";
import { PeoplePage } from "@/routes/_app/users";

export const Route = createFileRoute("/production/admin-portal/users")({
  component: PeoplePage,
});
