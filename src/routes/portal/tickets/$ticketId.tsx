import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { getPortalTicket, refreshPortalTicket, replyPortalTicket } from "@/lib/portal/api";
import { useShopToken } from "@/lib/portal/shop-session";

export const Route = createFileRoute("/portal/tickets/$ticketId")({
  component: TicketDetail,
});

export function TicketDetail() {
  const { ticketId = "" } = useParams({ strict: false });
  const id = Number(ticketId);
  const token = useShopToken();
  const client = useQueryClient();
  const [body, setBody] = useState("");
  const [notice, setNotice] = useState("");
  const detail = useQuery({
    queryKey: ["portal-ticket", token, id],
    queryFn: () => getPortalTicket({ data: { token, id } }),
    enabled: Boolean(token && id),
  });
  const refresh = useMutation({
    mutationFn: () => refreshPortalTicket({ data: { token, id } }),
    onSuccess: (result) => {
      setNotice(result.synced ? "Status pulled from Zendesk." : result.warning || "Zendesk did not return an update.");
      void client.invalidateQueries({ queryKey: ["portal-ticket", token, id] });
      void client.invalidateQueries({ queryKey: ["portal-session", token] });
    },
    onError: (error) => setNotice(error instanceof Error ? error.message : "Could not refresh."),
  });
  const reply = useMutation({
    mutationFn: () => replyPortalTicket({ data: { token, id, body } }),
    onSuccess: () => {
      setBody("");
      setNotice("Reply added.");
      void client.invalidateQueries({ queryKey: ["portal-ticket", token, id] });
    },
    onError: (error) => setNotice(error instanceof Error ? error.message : "Could not reply."),
  });
  const ticket = detail.data;
  if (detail.isPending) return <p className="text-sm text-muted">Opening the ticket…</p>;
  if (detail.isError || !ticket) return <p className="text-sm text-bad">{detail.error instanceof Error ? detail.error.message : "Ticket not found."}</p>;

  return (
    <div className="grid w-full gap-4">
      <Link to="/portal/tickets" className="text-sm text-muted">All tickets</Link>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{ticket.subject}</h1>
          <p className="mt-1 text-sm text-muted">{ticket.status} · {ticket.category}{ticket.zendeskId ? ` · Zendesk #${ticket.zendeskId}` : " · Not in Zendesk yet"}</p>
        </div>
        <button type="button" className="h-10 shrink-0 rounded-full border border-line px-3 text-xs font-semibold" onClick={() => refresh.mutate()} disabled={refresh.isPending}>{refresh.isPending ? "Syncing" : "Refresh"}</button>
      </div>
      <ul className="grid gap-2">
        {ticket.comments.map((comment, index) => (
          <li key={`${comment.at}-${index}`} className="rounded-xl border border-line bg-surface px-4 py-3 text-sm">
            <p className="text-xs font-semibold text-muted">{comment.author || "Desk"}</p>
            <p className="mt-1 whitespace-pre-wrap">{comment.body}</p>
          </li>
        ))}
      </ul>
      <form
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          reply.mutate();
        }}
      >
        <textarea value={body} onChange={(event) => setBody(event.target.value)} required placeholder="Add a reply" aria-label="Reply" className="min-h-24 rounded-xl border border-line bg-surface px-3 py-3" />
        <button type="submit" disabled={reply.isPending} className="h-11 rounded-xl bg-ink text-sm font-semibold text-white disabled:opacity-50">Send reply</button>
      </form>
      {notice ? <p className="text-sm text-muted">{notice}</p> : null}
    </div>
  );
}
