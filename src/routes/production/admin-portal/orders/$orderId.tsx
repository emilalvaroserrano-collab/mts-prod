import { createFileRoute } from "@tanstack/react-router";
import { OrderPage } from "@/routes/_app/orders/$orderId";

export const Route = createFileRoute("/production/admin-portal/orders/$orderId")({
  component: OrderPage,
});
