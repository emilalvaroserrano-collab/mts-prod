import { createFileRoute } from "@tanstack/react-router";
import { ProductionHome } from "@/components/production-home";

export const Route = createFileRoute("/production/")({
  head: () => ({
    meta: [
      { title: "Manage Tech Service" },
      { name: "description", content: "Technology that drives business success. Managed IT, cloud, projects, and a full-service help desk." },
    ],
  }),
  component: ProductionHome,
});
