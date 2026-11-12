import { createFileRoute } from "@tanstack/react-router";
import { FormsPage } from "@/routes/_app/forms";

export const Route = createFileRoute("/production/admin-portal/forms")({
  component: FormsPage,
});
