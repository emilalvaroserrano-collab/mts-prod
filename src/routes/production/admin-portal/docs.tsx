import { createFileRoute } from "@tanstack/react-router";
import { DocsPage } from "@/routes/_app/docs";

export const Route = createFileRoute("/production/admin-portal/docs")({
  component: DocsPage,
});
