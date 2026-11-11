export const ZENDESK_STATUSES = ["new", "open", "pending", "hold", "solved", "closed"] as const;
export const ZENDESK_TYPES = ["question", "incident", "problem", "task"] as const;
export const ZENDESK_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

const STATUS = new Set<string>(ZENDESK_STATUSES);
const TYPE = new Set<string>(ZENDESK_TYPES);
const PRIORITY = new Set<string>(ZENDESK_PRIORITIES);

export function zendeskTags(value: string | string[] | null | undefined) {
  const list = Array.isArray(value) ? value : String(value || "").split(",");
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const item of list) {
    const tag = item.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^\w:-]/g, "").slice(0, 64);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
    if (tags.length >= 40) break;
  }
  return tags;
}

export function zendeskDomains(value: string | string[] | null | undefined) {
  const list = Array.isArray(value) ? value : String(value || "").split(/[,\s]+/);
  const seen = new Set<string>();
  const domains: string[] = [];
  for (const item of list) {
    const domain = item
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .replace(/^\*\./, "");
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain) || seen.has(domain)) continue;
    seen.add(domain);
    domains.push(domain);
  }
  return domains;
}

export function zendeskRecordId(value: unknown) {
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text)) return null;
  const id = Number(text);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function zendeskPhone(value: string | null | undefined) {
  const phone = String(value || "").trim();
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 7 ? phone.slice(0, 40) : "";
}

export function zendeskTicketBody(input: {
  subject?: string;
  body?: string;
  publicNote?: boolean;
  status?: string;
  priority?: string;
  type?: string;
  tags?: string | string[];
  organizationId?: string | number | null;
  requesterName?: string;
  requesterEmail?: string;
  externalId?: string;
  creating?: boolean;
}) {
  const ticket: Record<string, unknown> = {};
  const subject = String(input.subject || "").trim();
  if (subject) ticket.subject = subject.slice(0, 150);
  const body = String(input.body || "").trim();
  if (body) ticket.comment = { body: body.slice(0, 65000), public: input.publicNote !== false };
  const status = String(input.status || "").toLowerCase();
  if (STATUS.has(status) && status !== "closed") ticket.status = !input.creating && status === "new" ? "open" : status;
  const priority = String(input.priority || "").toLowerCase();
  if (PRIORITY.has(priority)) ticket.priority = priority;
  const type = String(input.type || "").toLowerCase();
  if (TYPE.has(type)) ticket.type = type;
  const tags = zendeskTags(input.tags);
  if (tags.length) ticket.tags = tags;
  const organizationId = zendeskRecordId(input.organizationId);
  if (organizationId) ticket.organization_id = organizationId;
  const email = String(input.requesterEmail || "").trim().toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    ticket.requester = { name: String(input.requesterName || email).trim().slice(0, 120) || email, email };
  }
  const externalId = String(input.externalId || "").trim();
  if (externalId) ticket.external_id = externalId.slice(0, 255);
  return ticket;
}

export function zendeskOrganizationBody(input: {
  name: string;
  domain?: string;
  details?: string;
  notes?: string;
  tags?: string | string[];
  externalId?: string;
  sharedTickets?: boolean;
  sharedComments?: boolean;
}) {
  const organization: Record<string, unknown> = {
    name: input.name.trim().slice(0, 255),
  };
  const domains = zendeskDomains(input.domain);
  if (domains.length) organization.domain_names = domains;
  const details = String(input.details || "").trim();
  if (details) organization.details = details.slice(0, 1000);
  const notes = String(input.notes || "").trim();
  if (notes) organization.notes = notes.slice(0, 1000);
  const tags = zendeskTags(input.tags);
  if (tags.length) organization.tags = tags;
  const externalId = String(input.externalId || "").trim();
  if (externalId) organization.external_id = externalId.slice(0, 255);
  if (typeof input.sharedTickets === "boolean") organization.shared_tickets = input.sharedTickets;
  if (typeof input.sharedComments === "boolean") organization.shared_comments = input.sharedComments;
  return organization;
}

export function zendeskUserBody(input: {
  name: string;
  email: string;
  role?: string;
  phone?: string;
  notes?: string;
  tags?: string | string[];
  organizationId?: string | number | null;
}) {
  const email = input.email.trim().toLowerCase();
  const role = input.role === "agent" || input.role === "admin" ? input.role : "end-user";
  const user: Record<string, unknown> = {
    name: input.name.trim().slice(0, 255) || email,
    email,
    role,
    skip_verify_email: true,
  };
  const phone = zendeskPhone(input.phone);
  if (phone) user.phone = phone;
  const notes = String(input.notes || "").trim();
  if (notes) user.notes = notes.slice(0, 1000);
  const tags = zendeskTags(input.tags);
  if (tags.length) user.tags = tags;
  const organizationId = zendeskRecordId(input.organizationId);
  if (organizationId) user.organization_id = organizationId;
  return user;
}
