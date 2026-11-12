import { createFileRoute } from "@tanstack/react-router";
import { OrdersPage } from "@/routes/_app/orders/index";

export const Route = createFileRoute("/production/admin-portal/orders/")({
  component: OrdersPage,
});
