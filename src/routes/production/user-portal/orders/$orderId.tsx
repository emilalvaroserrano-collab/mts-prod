import { createFileRoute } from "@tanstack/react-router";
import { OrderDetail } from "@/routes/portal/orders/$orderId";

export const Route = createFileRoute("/production/user-portal/orders/$orderId")({
  component: OrderDetail,
});
