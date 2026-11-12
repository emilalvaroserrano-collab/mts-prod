import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { StoreFrame } from "@/components/storefront";
import { getPortalSession, getPortalTicket, refreshPortalTicket, submitPortalTicket } from "@/lib/portal/api";
import { useShopToken } from "@/lib/portal/shop-session";

export const Route = createFileRoute("/store/$slug/tickets")({
  component: StoreTickets,
});

const PATHS = [
  "IT Support / Microsoft 365 / Outlook",
  "IT Support / Microsoft 365 / Teams",
  "IT Support / Microsoft 365 / SharePoint",
  "IT Support / Printer",
  "IT Support / Network",
  "IT Support / Phone",
  "Other",
];

function StoreTickets() {
  const token = useShopToken();
  const client = useQueryClient();
  const session = useQuery({
    queryKey: ["portal-session", token],
    queryFn: () => getPortalSession({ data: token }),
    enabled: Boolean(token),
  });
  const [openId, setOpenId] = useState(0);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState(PATHS[0]);
  const [severity, setSeverity] = useState("normal");
  const [device, setDevice] = useState("");
  const [body, setBody] = useState("");
  const [notice, setNotice] = useState("");
  const detail = useQuery({
    queryKey: ["portal-ticket", token, openId],
    queryFn: () => getPortalTicket({ data: { token, id: openId } }),
    enabled: Boolean(token && openId),
  });
  const send = useMutation({
    mutationFn: () => submitPortalTicket({ data: { token, subject, category, body, severity, device } }),
    onSuccess: (result) => {
      setNotice(result.zendeskId ? `Ticket ${result.ticketId} is in Zendesk as #${result.zendeskId}.` : result.warning || `Ticket ${result.ticketId} is open.`);
      setSubject("");
      setBody("");
      setOpenId(result.ticketId);
      void client.invalidateQueries({ queryKey: ["portal-session", token] });
    },
    onError: (error) => setNotice(error instanceof Error ? error.message : "Could not open the ticket."),
  });
  const refresh = useMutation({
    mutationFn: () => refreshPortalTicket({ data: { token, id: openId } }),
    onSuccess: (result) => {
      setNotice(result.synced ? "Status pulled from Zendesk." : result.warning);
      void client.invalidateQueries({ queryKey: ["portal-ticket", token, openId] });
      void client.invalidateQueries({ queryKey: ["portal-session", token] });
    },
    onError: (error) => setNotice(error instanceof Error ? error.message : "Could not refresh."),
  });
  const tickets = session.data?.tickets ?? [];

  return (
    <StoreFrame>
      <div className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>
        {!token ? (
          <Link to="/production/signin" className="flex h-12 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">Sign in to open a ticket</Link>
        ) : (
          <form
            className="grid gap-3 rounded-2xl border border-line bg-white p-4"
            onSubmit={(event) => {
              event.preventDefault();
              setNotice("");
              send.mutate();
            }}
          >
            <h2 className="text-sm font-semibold">New ticket</h2>
            <input value={subject} onChange={(event) => setSubject(event.target.value)} required placeholder="Subject" className="h-12 rounded-xl border border-line px-3" />
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-12 rounded-xl border border-line px-3">
              {PATHS.map((item) => <option key={item}>{item}</option>)}
            </select>
            <div className="grid gap-3 sm:grid-cols-2">
              <select value={severity} onChange={(event) => setSeverity(event.target.value)} className="h-12 rounded-xl border border-line px-3">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
              <input value={device} onChange={(event) => setDevice(event.target.value)} placeholder="Affected device" className="h-12 rounded-xl border border-line px-3" />
            </div>
            <textarea value={body} onChange={(event) => setBody(event.target.value)} required placeholder="What is happening?" className="min-h-24 rounded-xl border border-line px-3 py-3" />
            <button type="submit" disabled={send.isPending} className="h-12 rounded-xl bg-ink text-sm font-semibold text-white disabled:opacity-50">
              {send.isPending ? "Sending" : "Submit ticket"}
            </button>
          </form>
        )}
        {notice ? <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm">{notice}</p> : null}
        <ul className="grid gap-2">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <button type="button" onClick={() => setOpenId(ticket.id)} className="grid w-full gap-1 rounded-2xl border border-line bg-white px-4 py-3 text-left">
                <span className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-semibold">{ticket.subject}</span>
                  <span className="shrink-0 text-xs font-semibold uppercase text-accent">{ticket.status}</span>
                </span>
                <span className="text-xs text-muted">{ticket.category}{ticket.zendeskId ? ` · Zendesk #${ticket.zendeskId}` : ""}</span>
              </button>
            </li>
          ))}
          {token && tickets.length === 0 ? <li className="text-sm text-muted">No tickets on this account yet.</li> : null}
        </ul>
        {openId && detail.data ? (
          <section className="grid gap-3 rounded-2xl border border-line bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{detail.data.subject}</h2>
                <p className="text-xs text-muted">Status {detail.data.status}{detail.data.zendeskId ? ` · Zendesk #${detail.data.zendeskId}` : ""}</p>
              </div>
              <button type="button" className="h-10 rounded-full border border-line px-3 text-xs font-semibold" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
                {refresh.isPending ? "Syncing" : "Sync Zendesk"}
              </button>
            </div>
            <ul className="grid gap-2">
              {detail.data.comments.map((comment, index) => (
                <li key={`${comment.at}-${index}`} className="rounded-xl bg-[#f3f6f7] px-3 py-3 text-sm">
                  <p className="text-xs font-semibold text-muted">{comment.author || "Desk"}</p>
                  <p className="mt-1 whitespace-pre-wrap">{comment.body}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </StoreFrame>
  );
}
