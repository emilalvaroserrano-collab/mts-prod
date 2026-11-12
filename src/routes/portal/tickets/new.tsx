import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { listPortalTicketSchema, submitPortalTicket } from "@/lib/portal/api";
import type { DeskField, DeskForm } from "@/lib/portal/types";
import { useShopToken } from "@/lib/portal/shop-session";
import { controlKind } from "@/lib/portal/zendesk-field-types";
import { Field, Input, Textarea } from "@/components/ui";

export const Route = createFileRoute("/portal/tickets/new")({
  component: NewTicket,
});

const selectClass = "h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm";

function control(field: DeskField, value: string, set: (next: string) => void) {
  const kind = controlKind(field.type);
  if (kind === "textarea") {
    return <Textarea value={value} onChange={(event) => set(event.target.value)} required={field.required} />;
  }
  if (kind === "select") {
    return (
      <select value={value} onChange={(event) => set(event.target.value)} required={field.required} className={selectClass}>
        <option value="">{field.required ? "Choose" : "Optional"}</option>
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>{option.name}</option>
        ))}
      </select>
    );
  }
  if (kind === "checkbox") {
    return (
      <label className="flex h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={value === "true"} onChange={(event) => set(event.target.checked ? "true" : "false")} />
        {field.title}
      </label>
    );
  }
  return <Input type={kind === "number" ? "number" : kind === "date" ? "date" : "text"} value={value} onChange={(event) => set(event.target.value)} required={field.required} className="h-11 rounded-xl" />;
}

function applyConditions(fields: DeskField[], form: DeskForm | undefined, values: Record<string, string>) {
  const onForm = !form
    ? fields
    : fields.filter((field) => form.fieldIds.includes(field.id) || field.key === "subject" || field.key === "description");
  const base = onForm.length ? onForm : fields;
  const conditions = form?.conditions ?? [];
  const childIds = new Set(conditions.flatMap((condition) => condition.children.map((child) => child.id)));
  const required = new Map<string, boolean>();
  for (const condition of conditions) {
    if ((values[condition.parentId] || "") !== condition.value) continue;
    for (const child of condition.children) required.set(child.id, child.required || required.get(child.id) === true);
  }
  return base
    .filter((field) => !childIds.has(field.id) || required.has(field.id))
    .map((field) => (required.has(field.id) ? { ...field, required: required.get(field.id) || field.required } : field));
}

export function NewTicket() {
  const token = useShopToken();
  const navigate = useNavigate();
  const client = useQueryClient();
  const schema = useQuery({
    queryKey: ["ticket-schema", token],
    queryFn: () => listPortalTicketSchema({ data: token }),
    enabled: Boolean(token),
  });
  const [formId, setFormId] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const forms = schema.data?.forms ?? [];
  const fields = schema.data?.fields ?? [];
  const selected = forms.find((form) => form.id === formId) || forms[0];
  const shown = useMemo(() => applyConditions(fields, selected, values), [fields, selected, values]);
  const send = useMutation({
    mutationFn: () => {
      const subject = shown.find((field) => field.key === "subject");
      const description = shown.find((field) => field.key === "description");
      const priority = shown.find((field) => field.key === "priority");
      const kind = shown.find((field) => field.key === "tickettype");
      const payload: Record<string, string> = {};
      for (const field of shown) payload[field.id] = values[field.id] || "";
      if (priority) payload.priority = values[priority.id] || "";
      if (kind) payload.tickettype = values[kind.id] || "";
      return submitPortalTicket({
        data: {
          token,
          subject: subject ? values[subject.id] || "" : values.subject || "",
          body: description ? values[description.id] || "" : values.description || "",
          category: selected?.name || "IT support",
          severity: priority ? values[priority.id] || "normal" : "normal",
          formId: selected?.id || "",
          fields: payload,
        },
      });
    },
    onSuccess: (result) => {
      void client.invalidateQueries({ queryKey: ["portal-session", token] });
      if (result.warning && !result.zendeskId) setNotice(result.warning);
      const base = window.location.pathname.startsWith("/production/user-portal") ? "/production/user-portal" : "/portal";
      void navigate({ to: `${base}/tickets/$ticketId` as "/portal/tickets/$ticketId", params: { ticketId: String(result.ticketId) } });
    },
    onError: (error) => setNotice(error instanceof Error ? error.message : "Could not open the ticket."),
  });

  if (schema.isPending) return <p className="text-sm text-muted">Loading the support form…</p>;
  if (!shown.length) return <FallbackTicket />;

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
      {schema.data?.warning ? <p className="text-sm text-muted">{schema.data.warning}</p> : null}
      {forms.length > 1 ? (
        <Field label="Form">
          <select
            value={selected?.id || ""}
            onChange={(event) => {
              setFormId(event.target.value);
              setValues({});
            }}
            className={selectClass}
          >
            {forms.map((form) => <option key={form.id} value={form.id}>{form.name}</option>)}
          </select>
        </Field>
      ) : null}
      {shown.map((field) => (
        <Field key={field.id} label={field.type === "checkbox" ? "" : field.title} hint={field.description || undefined}>
          {control(field, values[field.id] || "", (next) => setValues((current) => ({ ...current, [field.id]: next })))}
        </Field>
      ))}
      {notice ? <p className="text-sm text-bad">{notice}</p> : null}
      <button type="submit" disabled={send.isPending} className="h-11 rounded-xl bg-ink text-sm font-medium text-white disabled:opacity-50">{send.isPending ? "Sending" : "Submit ticket"}</button>
    </form>
  );
}

function FallbackTicket() {
  const token = useShopToken();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState("normal");
  const [notice, setNotice] = useState("");
  const send = useMutation({
    mutationFn: () => submitPortalTicket({ data: { token, subject, body, category: "IT support", severity } }),
    onSuccess: (result) => {
      if (result.warning && !result.zendeskId) setNotice(result.warning);
      void client.invalidateQueries({ queryKey: ["portal-session", token] });
      const base = window.location.pathname.startsWith("/production/user-portal") ? "/production/user-portal" : "/portal";
      void navigate({ to: `${base}/tickets/$ticketId` as "/portal/tickets/$ticketId", params: { ticketId: String(result.ticketId) } });
    },
    onError: (error) => setNotice(error instanceof Error ? error.message : "Could not open the ticket."),
  });
  return (
    <form className="grid w-full gap-3" onSubmit={(event) => { event.preventDefault(); send.mutate(); }}>
      <h1 className="text-2xl font-medium tracking-tight">New ticket</h1>
      <p className="text-sm text-muted">Zendesk has not published a customer form yet. Subject and description still open a ticket.</p>
      <Field label="Subject"><Input value={subject} onChange={(event) => setSubject(event.target.value)} required className="h-11 rounded-xl" /></Field>
      <Field label="Description"><Textarea value={body} onChange={(event) => setBody(event.target.value)} required /></Field>
      <Field label="Priority">
        <select value={severity} onChange={(event) => setSeverity(event.target.value)} className={selectClass}>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </Field>
      {notice ? <p className="text-sm text-muted">{notice}</p> : null}
      <button type="submit" disabled={send.isPending} className="h-11 rounded-xl bg-ink text-sm font-medium text-white disabled:opacity-50">{send.isPending ? "Sending" : "Submit ticket"}</button>
    </form>
  );
}
