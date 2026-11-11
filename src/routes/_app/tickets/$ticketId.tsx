import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getTicket, replyTicket, updateTicket } from "@/lib/portal/api";
import { stamp } from "@/lib/portal/format";
import { ticketSearch } from "@/lib/portal/ticket-search";
import { Button, ErrorNote, Field, Input, Loading, PageHeader, Panel, Select, StatusBadge, Textarea } from "@/components/ui";
import { errorText } from "@/components/ui";

export const Route = createFileRoute("/_app/tickets/$ticketId")({
  component: TicketPage,
});

function TicketPage() {
  const { ticketId } = Route.useParams();
  const id = Number(ticketId);
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["ticket", id], queryFn: () => getTicket({ data: id }) });
  const [body, setBody] = useState("");
  const [publicNote, setPublicNote] = useState(true);
  const [draft, setDraft] = useState({
    subject: "",
    status: "open",
    priority: "normal",
    ticketType: "question",
    assignee: "",
    groupName: "",
    tags: "",
    requesterName: "",
    requesterEmail: "",
  });

  useEffect(() => {
    const ticket = query.data?.ticket;
    if (!ticket) return;
    setDraft({
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority || "normal",
      ticketType: ticket.ticketType || "question",
      assignee: ticket.assignee,
      groupName: ticket.groupName,
      tags: ticket.tags.join(", "),
      requesterName: ticket.requesterName,
      requesterEmail: ticket.requesterEmail,
    });
  }, [query.data?.ticket]);

  const reply = useMutation({
    mutationFn: () => replyTicket({ data: { ticketId: id, body, publicNote } }),
    onSuccess: (result) => {
      setBody("");
      if (result.warning) toast.error(`Saved here. ${result.warning}`);
      else toast.success(publicNote ? "Reply sent" : "Internal note saved");
      client.invalidateQueries({ queryKey: ["ticket", id] });
      client.invalidateQueries({ queryKey: ["tickets"] });
      client.invalidateQueries({ queryKey: ["dashboard"] });
      client.invalidateQueries({ queryKey: ["shell"] });
    },
    onError: (error) => toast.error(errorText(error)),
  });

  const update = useMutation({
    mutationFn: () =>
      updateTicket({
        data: {
          id,
          subject: draft.subject,
          status: draft.status,
          assignee: draft.assignee,
          priority: draft.priority,
          ticketType: draft.ticketType,
          groupName: draft.groupName,
          tags: draft.tags,
          requesterName: draft.requesterName,
          requesterEmail: draft.requesterEmail,
        },
      }),
    onSuccess: (result) => {
      if (result.warning) toast.error(result.warning);
      else toast.success("Ticket updated");
      client.invalidateQueries({ queryKey: ["ticket", id] });
      client.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (error) => toast.error(errorText(error)),
  });

  if (query.isPending) return <Loading />;
  if (query.isError) return <ErrorNote message={query.error.message} />;
  const ticket = query.data.ticket;

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow={ticket.zendeskId ? `Zendesk #${ticket.zendeskId}` : `Portal P-${ticket.id}`}
        title={ticket.subject}
        description={`${ticket.requesterName || "Unknown requester"}${ticket.requesterEmail ? ` · ${ticket.requesterEmail}` : ""}`}
        actions={
          <Link to="/tickets" search={ticketSearch()} className="inline-flex h-11 items-center text-sm text-accent">
            Back to tickets
          </Link>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_20rem]">
        <div className="grid gap-4">
          <Panel>
            <h2 className="text-sm font-semibold">Conversation</h2>
            <ol className="mt-4 grid gap-3">
              {query.data.comments.map((comment) => (
                <li key={comment.id} className={comment.publicNote ? "rounded-lg border border-line px-3 py-3" : "rounded-lg bg-warn-soft px-3 py-3"}>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-xs text-muted">
                    <span className="font-medium text-ink">{comment.authorName}</span>
                    <span>{comment.publicNote ? "Public" : "Internal"} · {stamp(comment.createdAt)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{comment.body}</p>
                </li>
              ))}
              {query.data.comments.length === 0 ? <p className="text-sm text-muted">No replies yet.</p> : null}
            </ol>
          </Panel>
          <Panel>
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                reply.mutate();
              }}
            >
              <Field label={publicNote ? "Public reply" : "Internal note"}>
                <Textarea value={body} onChange={(event) => setBody(event.target.value)} required />
              </Field>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant={publicNote ? "primary" : "secondary"} onClick={() => setPublicNote(true)}>
                    Public
                  </Button>
                  <Button type="button" size="sm" variant={!publicNote ? "primary" : "secondary"} onClick={() => setPublicNote(false)}>
                    Internal
                  </Button>
                </div>
                <Button type="submit" disabled={reply.isPending}>
                  {reply.isPending ? "Sending" : "Add to ticket"}
                </Button>
              </div>
            </form>
          </Panel>
        </div>
        <Panel className="h-fit">
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              update.mutate();
            }}
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center">
              <h2 className="text-sm font-semibold">Ticket fields</h2>
              <StatusBadge value={ticket.status} />
            </div>
            <Field label="Subject">
              <Input value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} required />
            </Field>
            <Field label="Requester">
              <Input value={draft.requesterName} onChange={(event) => setDraft({ ...draft, requesterName: event.target.value })} />
            </Field>
            <Field label="Requester email">
              <Input type="email" value={draft.requesterEmail} onChange={(event) => setDraft({ ...draft, requesterEmail: event.target.value })} />
            </Field>
            <Field label="Status">
              <Select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>
                {["new", "open", "pending", "hold", "solved", "closed"].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </Select>
            </Field>
            <Field label="Type">
              <Select value={draft.ticketType} onChange={(event) => setDraft({ ...draft, ticketType: event.target.value })}>
                {["question", "incident", "problem", "task"].map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })}>
                {["low", "normal", "high", "urgent"].map((priority) => (
                  <option key={priority}>{priority}</option>
                ))}
              </Select>
            </Field>
            <Field label="Group">
              <Input value={draft.groupName} onChange={(event) => setDraft({ ...draft, groupName: event.target.value })} placeholder="Support" />
            </Field>
            <Field label="Assignee">
              <Select value={draft.assignee} onChange={(event) => setDraft({ ...draft, assignee: event.target.value })}>
                <option value="">Unassigned</option>
                {query.data.assignees.map((name) => (
                  <option key={name}>{name}</option>
                ))}
                {draft.assignee && !query.data.assignees.includes(draft.assignee) ? <option>{draft.assignee}</option> : null}
              </Select>
            </Field>
            <Field label="Tags">
              <Input value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} placeholder="portal, customer" />
            </Field>
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-muted">Organization</dt>
                <dd>
                  {ticket.organizationId ? (
                    <Link to="/organizations/$orgId" params={{ orgId: String(ticket.organizationId) }} className="text-accent">
                      {ticket.organizationName}
                    </Link>
                  ) : (
                    "Unlinked"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Form</dt>
                <dd>{ticket.category || "—"}</dd>
              </div>
            </dl>
            <Button type="submit" disabled={update.isPending}>{update.isPending ? "Saving" : "Save ticket"}</Button>
          </form>
        </Panel>
      </div>
    </div>
  );
}
