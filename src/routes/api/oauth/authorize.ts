import { createFileRoute } from "@tanstack/react-router";
import { handleOauthAuthorize } from "@/lib/portal/mts-oauth";

export const Route = createFileRoute("/api/oauth/authorize")({
  server: {
    handlers: {
      GET: ({ request }) => handleOauthAuthorize(request),
      POST: ({ request }) => handleOauthAuthorize(request),
    },
  },
});
