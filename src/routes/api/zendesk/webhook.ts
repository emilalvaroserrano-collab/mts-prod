import { createFileRoute } from "@tanstack/react-router";
import { acceptZendeskWebhookUser, applyZendeskWebhook } from "@/lib/portal/api";
import { getSql } from "@/lib/db";
import { ingestZendeskWebhook, verifyZendeskWebhook } from "@/lib/portal/zendesk-conversations";

export const Route = createFileRoute("/api/zendesk/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        try {
          await verifyZendeskWebhook(request, raw);
          const payload = raw ? JSON.parse(raw) : {};
          const sql = await getSql();
          const stored = await ingestZendeskWebhook(sql, payload);
          const invited = await acceptZendeskWebhookUser(sql, payload);
          await applyZendeskWebhook(sql, payload);
          return Response.json({ ok: true, stored, invited });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Webhook rejected.";
          const status = /signature|timestamp|Webhook ID|SECRET/.test(message) ? 401 : 400;
          return Response.json({ ok: false, error: message }, { status });
        }
      },
    },
  },
});
