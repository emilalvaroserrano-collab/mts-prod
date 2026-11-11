import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/portal/login")({
  component: () => <Navigate to="/upgrade" />,
});
