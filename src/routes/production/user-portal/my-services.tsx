import { createFileRoute } from "@tanstack/react-router";
import { MyServices } from "@/routes/portal/my-services";

export const Route = createFileRoute("/production/user-portal/my-services")({
  component: MyServices,
});
