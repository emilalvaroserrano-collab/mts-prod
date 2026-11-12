import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/portal/login")({
  beforeLoad: () => {
    throw redirect({ href: "/production/signin", replace: true });
  },
});
