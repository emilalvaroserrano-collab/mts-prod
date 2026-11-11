import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { listMyComplaints, submitComplaint } from "@/lib/portal/api";
import { useShopToken } from "@/lib/portal/shop-session";

export const Route = createFileRoute("/portal/complaints")({
  component: ComplaintsPage,
});

const KINDS = ["Service complaint", "Billing complaint", "Technical support complaint", "Delivery or order complaint", "General feedback"];

export function ComplaintsPage() {
  const token = useShopToken();
  const client = useQueryClient();
  const mine = useQuery({ queryKey: ["complaints", token], queryFn: () => listMyComplaints({ data: token }), enabled: Boolean(token) });
  const [kind, setKind] = useState(KINDS[0]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [notice, setNotice] = useState("");
  const send = useMutation({
    mutationFn: () => submitComplaint({ data: { token, kind, subject, body } }),
    onSuccess: (result) => {
      setSubject("");
      setBody("");
      setNotice(result.zendeskId ? `Ticket ${result.ticketId} is in Zendesk as #${result.zendeskId}.` : `Ticket ${result.ticketId} is open. Zendesk sync is pending if no number is shown.`);
      void client.invalidateQueries({ queryKey: ["complaints", token] });
      void client.invalidateQueries({ queryKey: ["portal-session", token] });
    },
    onError: (error) => setNotice(error instanceof Error ? error.message : "Could not send that."),
  });
  return (
    <div className="grid w-full gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Complaints and feedback</h1>
      <form className="grid gap-3 rounded-xl border border-line bg-surface p-4" onSubmit={(event) => { event.preventDefault(); send.mutate(); }}>
        <select value={kind} onChange={(event) => setKind(event.target.value)} aria-label="Type" className="h-11 rounded-xl border border-line px-3">
          {KINDS.map((item) => <option key={item}>{item}</option>)}
        </select>
        <input value={subject} onChange={(event) => setSubject(event.target.value)} required placeholder="Subject" aria-label="Subject" className="h-11 rounded-xl border border-line px-3" />
        <textarea value={body} onChange={(event) => setBody(event.target.value)} required placeholder="What happened?" aria-label="Details" className="min-h-28 rounded-xl border border-line px-3 py-3" />
        <button type="submit" disabled={send.isPending} className="h-11 rounded-xl bg-ink text-sm font-semibold text-white disabled:opacity-50">Submit</button>
      </form>
      {notice ? <p className="text-sm text-muted">{notice}</p> : null}
      {(mine.data ?? []).map((item) => (
        <article key={item.id} className="rounded-xl border border-line bg-surface px-4 py-3 text-sm">
          <p className="font-semibold">{item.subject}</p>
          <p className="text-xs text-muted">{item.kind} · {item.status}{item.ticketId ? ` · Ticket ${item.ticketId}` : ""}</p>
        </article>
      ))}
    </div>
  );
}
