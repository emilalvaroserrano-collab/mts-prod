import { createFileRoute } from "@tanstack/react-router";
import { ServiceDetail } from "@/routes/portal/services/$serviceId";

export const Route = createFileRoute("/production/user-portal/services/$serviceId")({
  component: ServiceDetail,
});
