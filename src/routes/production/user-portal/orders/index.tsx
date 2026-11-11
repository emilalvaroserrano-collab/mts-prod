import { createFileRoute } from "@tanstack/react-router";
import { OrdersPage } from "@/routes/portal/orders/index";

export const Route = createFileRoute("/production/user-portal/orders/")({
  component: OrdersPage,
});
