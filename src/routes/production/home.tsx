import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/production/home")({
  beforeLoad: () => {
    throw redirect({ href: "/production/user-portal", replace: true });
  },
});
