import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { submitPortalTicket } from "@/lib/portal/api";
import { useShopToken } from "@/lib/portal/shop-session";
import { Field, Input, Textarea } from "@/components/ui";

export const Route = createFileRoute("/portal/tickets/new")({
  component: NewTicket,
});

const CATEGORIES = [
  "Outlook Not Working",
  "Computer or Laptop Issue",
  "Phone Issue",
  "Printer Not Working",
  "Internet Connection Issue",
  "Network / Wi-Fi Problem",
  "Microsoft 365 Support",
  "Password / Account Access",
  "Software Installation",
  "Security Concern",
  "Other IT Issue",
];

function NewTicket() {
  const token = useShopToken();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState("normal");
  const [ticketType, setTicketType] = useState("incident");
  const [tags, setTags] = useState("");
  const [device, setDevice] = useState("");
  const [notice, setNotice] = useState("");
  const send = useMutation({
    mutationFn: () => submitPortalTicket({ data: { token, subject, category, body, severity, device, ticketType, tags } }),
    onSuccess: (result) => {
      void client.invalidateQueries({ queryKey: ["portal-session", token] });
      if (result.warning && !result.zendeskId) setNotice(result.warning);
      void navigate({ to: "/portal/tickets/$ticketId", params: { ticketId: String(result.ticketId) } });
    },
    onError: (error) => setNotice(error instanceof Error ? error.message : "Could not open the ticket."),
  });

  return (
    <form
      className="grid w-full gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setNotice("");
        send.mutate();
      }}
    >
      <h1 className="text-2xl font-medium tracking-tight">New ticket</h1>
      <Field label="Subject">
        <Input value={subject} onChange={(event) => setSubject(event.target.value)} required className="h-11 rounded-xl" />
      </Field>
      <Field label="Description">
        <Textarea value={body} onChange={(event) => setBody(event.target.value)} required placeholder="What is happening?" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Type">
          <select value={ticketType} onChange={(event) => setTicketType(event.target.value)} className="h-11 rounded-xl border border-line bg-surface px-3">
            <option value="question">Question</option>
            <option value="incident">Incident</option>
            <option value="problem">Problem</option>
            <option value="task">Task</option>
          </select>
        </Field>
        <Field label="Priority">
          <select value={severity} onChange={(event) => setSeverity(event.target.value)} className="h-11 rounded-xl border border-line bg-surface px-3">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </Field>
      </div>
      <Field label="Form">
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-11 rounded-xl border border-line bg-surface px-3">
          {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
        </select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tags">
          <Input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="printer, onsite" className="h-11 rounded-xl" />
        </Field>
        <Field label="Affected device">
          <Input value={device} onChange={(event) => setDevice(event.target.value)} className="h-11 rounded-xl" />
        </Field>
      </div>
      {notice ? <p className="text-sm text-bad">{notice}</p> : null}
      <button type="submit" disabled={send.isPending} className="h-11 rounded-xl bg-ink text-sm font-medium text-white disabled:opacity-50">{send.isPending ? "Sending" : "Submit ticket"}</button>
    </form>
  );
}
