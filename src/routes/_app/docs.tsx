import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AgentKeys } from "@/components/agent-keys";
import { Input, PageHeader, Panel } from "@/components/ui";

export const Route = createFileRoute("/_app/docs")({
  component: DocsPage,
});

type Endpoint = {
  method: "GET" | "POST";
  path: string;
  title: string;
  auth: string;
  summary: string;
  request?: string;
  response?: string;
};

const GROUPS: { id: string; title: string; note: string; endpoints: Endpoint[] }[] = [
  {
    id: "portal",
    title: "Portal pages",
    note: "These match the customer menu on /portal. Call them with the agent key and that customer's id. Account is GET or PATCH /api/agent/customers/{id}.",
    endpoints: [
      { method: "GET", path: "/api/agent/customers/{id}/pages", title: "Menu", auth: "Bearer mts_", summary: "The pages this customer sees.", response: `{ "pages": [{ "label": "Order", "path": "/portal/shop", "api": "/api/agent/customers/12/shop" }] }` },
      { method: "GET", path: "/api/agent/customers/{id}/home", title: "Home", auth: "Bearer mts_", summary: "The /portal summary: open tickets, pending orders, unpaid charges, services.", response: `{ "openTickets": 1, "pendingOrders": 0, "page": "/portal" }` },
      { method: "GET", path: "/api/agent/customers/{id}/shop", title: "Order", auth: "Bearer mts_", summary: "The /portal/shop page. Equipment only when this account can shop. Services are network, VoIP, fax, internet, and wiring.", response: `{ "equipment": [{ "sku": "NL-HS-210", "priceCents": 18900 }], "services": [{ "offering": "voip-ext" }] }` },
      { method: "GET", path: "/api/agent/customers/{id}/orders/{orderId}", title: "One order", auth: "Bearer mts_", summary: "The /portal/orders/{orderId} page. Lines, payment, shipment, tracking.", response: `{ "number": "MT-1008", "items": [] }` },
      { method: "GET", path: "/api/agent/customers/{id}/billing", title: "Billing", auth: "Bearer mts_", summary: "The /portal/billing page. 403 when shop and invoice are both off.", response: `{ "invoiceAllowed": false, "orders": [] }` },
      { method: "POST", path: "/api/agent/customers/{id}/organization", title: "Organization", auth: "Bearer mts_", summary: "GET reads /portal/organization. POST saves the company name, phone, and city, then opens a review ticket.", request: `{ "business": "Harbor and Co", "phone": "555-0100", "city": "Austin" }`, response: `{ "ok": true, "ticketId": 41 }` },
    ],
  },
  {
    id: "rules",
    title: "Rules",
    note: "Give this page to the CSR agent. Portal functions act for the signed-in customer. The HTTP API under /api/agent uses an admin-created mts_ key and a customer id, so the agent can reach any account. The machine-readable spec is GET /api/openapi.json.",
    endpoints: [
      {
        method: "GET",
        path: "token",
        title: "Who the call is for",
        auth: "Portal session token",
        summary: "The token is the shop_customers.session_token of the person who is signed in. portalVerify and shopLogin return it. It is 64 hex characters and slides forward 400 days on use. Staff cookies, Zendesk keys, and admin user ids are not this token.",
        response: `{ "token": "64 hex chars", "email": "ada@customer.com", "name": "Ada Cruz" }`,
      },
      {
        method: "POST",
        path: "never",
        title: "Do not do these",
        auth: "Blocked",
        summary: "Do not change role_id, grant_shop, grant_services, grant_invoice, or pay_later. Do not read another customer. Do not delete a ticket, order, complaint, or service request. Do not take a card number, CVV, or full PAN. Do not say a Zendesk id, price, or shipment date that the function did not return. Spoken yes does not confirm a quote. Only the Confirm button sets confirmMonthly.",
      },
    ],
  },
  {
    id: "session",
    title: "Read the current user",
    note: "Call getPortalSession first. Everything below is limited to the customer that token belongs to.",
    endpoints: [
      {
        method: "GET",
        path: "getPortalSession",
        title: "Current portal account",
        auth: "token",
        summary: "Reads the signed-in customer, company, permissions, and the latest 20 tickets for that email. Returns null if the token is missing or expired.",
        request: `token: string`,
        response: `{
  "customer": { "name", "email", "phone", "address", "city", "region", "postal", "country", "payLater" },
  "access": { "roleId", "roleLabel", "canTicket", "canShop", "canPurchase", "canPayNow", "canOrderIt", "canOrderPhone", "canDefer" },
  "tickets": [{ "id", "subject", "status", "category", "zendeskId", "updatedAt", "comments": [] }],
  "business": "",
  "organization": "",
  "interests": [],
  "verified": true,
  "grants": { "shop": false, "services": false, "invoice": false }
}`,
      },
      {
        method: "GET",
        path: "getShopAccount",
        title: "Profile and orders",
        auth: "token",
        summary: "Same customer, plus that customer's orders. An order is included when shop_customer_id matches or ship_email matches this email. Order number is MT- plus 1000 plus the id.",
        request: `token: string`,
        response: `{
  "customer": { "name", "email", "phone", "address", "city", "region", "postal", "country", "payLater" },
  "orders": [{
    "id", "number", "createdAt", "status", "shipmentStatus", "trackingNumber", "trackingCarrier",
    "shippingMethod", "paymentMethod", "paymentUrl", "totalCents",
    "shipName", "shipAddress", "shipCity", "shipRegion", "shipPostal", "shipCountry",
    "items": [{ "name", "sku", "quantity", "unitPriceCents" }]
  }]
}`,
      },
    ],
  },
  {
    id: "account",
    title: "Update this account",
    note: "Update is the profile fields only. Email, password, role, and grants are not writable by the agent.",
    endpoints: [
      {
        method: "POST",
        path: "saveShopProfile",
        title: "Update name, phone, and address",
        auth: "token",
        summary: "Writes name, phone, address, city, region, postal, and country on this customer. Name is required. Country defaults to United States. Does not open a ticket.",
        request: `{ "token", "name", "phone", "address", "city", "region", "postal", "country" }`,
        response: `{ "ok": true }`,
      },
      {
        method: "POST",
        path: "Sarah tool update_contact",
        title: "Change phone, with Confirm",
        auth: "token, then Confirm",
        summary: "Use this when the caller asks to change the phone. The first call does not write. It returns a quote. After they press Confirm, the phone is saved and a desk ticket is opened.",
        request: `{ "tool": "update_contact", "phone": "818-555-0100" }`,
        response: `Before Confirm: "Press Confirm if that number is right."
After Confirm: phone saved, plus desk ticket id and Zendesk id when the copy succeeds.`,
      },
    ],
  },
  {
    id: "tickets",
    title: "Tickets",
    note: "Tickets belong to this email. Private Zendesk notes are not returned. There is no delete.",
    endpoints: [
      {
        method: "GET",
        path: "Sarah tool list_tickets",
        title: "List this customer's tickets",
        auth: "token",
        summary: "Latest 5 tickets for this requester email: id, subject, status. getPortalSession returns up to 20 without comments.",
        response: `{ "cards": [{ "title": "Ticket 14", "detail": "Printer offline · open" }] }`,
      },
      {
        method: "GET",
        path: "getPortalTicket",
        title: "Read one ticket",
        auth: "token",
        summary: "id must be a ticket whose requester_email is this customer. Public comments only.",
        request: `{ "token", "id": 14 }`,
        response: `{ "id", "subject", "status", "category", "zendeskId", "updatedAt", "comments": [{ "author", "body", "at" }] }`,
      },
      {
        method: "POST",
        path: "submitPortalTicket",
        title: "Open a ticket",
        auth: "token, access.canTicket",
        summary: "Creates a portal ticket for this name and email, adds the first public comment, and copies it to Zendesk when the shop client is connected. Otherwise it stays queued. Category defaults to IT support. Severity high sets priority high. Sarah's open_ticket tool does the same through filePortalTicket.",
        request: `{ "token", "subject", "body", "category": "IT support", "severity": "normal", "device": "" }`,
        response: `{ "ticketId": 14, "zendeskId": "", "warning": "" }`,
      },
      {
        method: "POST",
        path: "replyPortalTicket",
        title: "Add a public reply",
        auth: "token",
        summary: "Inserts a public comment by this customer's name. If the ticket has a zendesk_id and Zendesk is connected, the same text is sent as a public comment. Sarah's reply_ticket also opens a separate desk copy ticket.",
        request: `{ "token", "id": 14, "body": "It is still offline." }`,
        response: `{ "ok": true }`,
      },
      {
        method: "POST",
        path: "refreshPortalTicket",
        title: "Pull Zendesk updates",
        auth: "token",
        summary: "Reads status and comments from Zendesk for this ticket only. Does nothing if the ticket has no zendesk_id or the desk is disconnected.",
        request: `{ "token", "id": 14 }`,
        response: `{ "synced": true, "warning": "" }`,
      },
    ],
  },
  {
    id: "orders",
    title: "Orders and catalog",
    note: "The agent can read this customer's orders and find catalog items. Checkout stays on the store. The agent does not mark an order paid, shipped, or deleted.",
    endpoints: [
      {
        method: "GET",
        path: "Sarah tool list_orders",
        title: "Recent orders",
        auth: "token",
        summary: "Latest 5 orders for this shop_customer_id or ship_email. Status, payment_status, and shipment_status are the live columns. Number is MT-1000 plus the id.",
        response: `{ "cards": [{ "title": "MT-1008", "detail": "pending · payment pending · unfulfilled" }] }`,
      },
      {
        method: "GET",
        path: "getStorefront",
        title: "Active catalog",
        auth: "None",
        summary: "Public catalog: brand, slug, and products that are available. Price is price_cents. Do not quote a price that is not on a returned product.",
        response: `{ "brandName", "slug", "tagline", "supportEmail", "closed", "products": [] }`,
      },
      {
        method: "POST",
        path: "Sarah tool find_equipment",
        title: "Find or hold a product",
        auth: "token, access.canShop to add",
        summary: "Searches available products by name, category, or sku, limit 3. add false only reads. add true requires canShop, returns cartSku, and opens a desk ticket saying the item was placed for checkout. The customer still checks out. If nothing matches, do not invent a product.",
        request: `{ "tool": "find_equipment", "query": "laptop", "add": false }`,
        response: `{ "cards": [{ "title": "Latitude 5450", "detail": "lat-5450 · $1299.00" }], "cartSku": "" }`,
      },
      {
        method: "POST",
        path: "placeStorefrontOrder",
        title: "Place an equipment order",
        auth: "token email must match",
        summary: "Places an order only when the token's email equals the shipping email. Items are sku and quantity 1 to 99. Shipping is standard or express. Do not send a card number. cardBrand is credit or debit, and cardLast4 is four digits only if checkout already collected them in the form.",
        request: `{ "token", "name", "email", "phone", "address", "city", "region", "postal", "country", "shippingMethod": "standard", "items": [{ "sku", "quantity": 1 }] }`,
      },
    ],
  },
  {
    id: "services",
    title: "Services on this account",
    note: "Phone and fax need access.canOrderPhone. Other offerings need access.canOrderIt. A new registration has both false until an admin sets the grants.",
    endpoints: [
      {
        method: "GET",
        path: "listPortalServices",
        title: "List this customer's requests",
        auth: "token",
        summary: "service_requests for this shop_customer_id only. Sarah's list_requests returns the latest 5 names and statuses.",
        request: `token: string`,
        response: `[{ "id", "category", "serviceName", "details", "severity", "status", "quoteNote", "createdAt" }]`,
      },
      {
        method: "GET",
        path: "listServiceCatalog",
        title: "Service catalog",
        auth: "None",
        summary: "Active rows in service_catalog. getService reads one id. Use requestPortalService to ask for one of these.",
        response: `[{ "id", "category", "name", "summary", "kind", "benefits", "scope" }]`,
      },
      {
        method: "POST",
        path: "orderPortalOffering",
        title: "Order a portal service",
        auth: "token",
        summary: "offering is one of network, voip-line, voip-ext, fax-physical, fax-efax, internet-spectrum, internet-att, internet-frontier, internet-fixed, wiring. network and internet-* require site. fax-efax requires recipientEmail. voip-ext throws unless confirmMonthly is true, and that flag is set only by the Confirm button. Wiring is 17500 cents per drop, max 50 drops. Creates a service_requests row and a ticket. Sarah's order_service tool is the same offer list and also asks before a VoIP desk phone.",
        request: `{ "token", "offering": "voip-ext", "site": "", "notes": "", "recipientEmail": "", "drops": 1, "shipPhone": false, "confirmMonthly": false }`,
        response: `{ "id": 3, "ticketId": 21 }`,
      },
      {
        method: "POST",
        path: "requestPortalService",
        title: "Request a catalog service",
        auth: "token and the matching grant",
        summary: "serviceId must be an active catalog row. kind phone checks canOrderPhone. Anything else checks canOrderIt. Status becomes requested and a ticket is filed.",
        request: `{ "token", "serviceId": 4, "details": "Two new desks", "severity": "normal" }`,
        response: `{ "id": 8, "status": "requested" }`,
      },
      {
        method: "POST",
        path: "respondToQuote",
        title: "Accept or reject a quote",
        auth: "token",
        summary: "Only a service_requests row on this customer with status quoted. decision is accepted or rejected. No other status can be set by the customer.",
        request: `{ "token", "id": 8, "decision": "accepted" }`,
        response: `{ "status": "accepted" }`,
      },
    ],
  },
  {
    id: "complaints",
    title: "Complaints and notices",
    note: "Both are stored on this shop_customer_id. A complaint also opens a ticket.",
    endpoints: [
      {
        method: "GET",
        path: "listMyComplaints",
        title: "List complaints",
        auth: "token",
        summary: "Latest 30 complaints for this customer.",
        response: `[{ "id", "kind", "subject", "body", "status", "ticketId", "createdAt" }]`,
      },
      {
        method: "POST",
        path: "submitComplaint",
        title: "File a complaint",
        auth: "token",
        summary: "kind defaults to General feedback. Subject and body are required. Opens a ticket titled Complaint: plus the subject, then stores the complaint against this customer.",
        request: `{ "token", "kind": "General feedback", "subject", "body" }`,
        response: `{ "id": 2, "ticketId": 22, "zendeskId": "" }`,
      },
      {
        method: "GET",
        path: "listCustomerNotices",
        title: "List notices",
        auth: "token",
        summary: "Latest 40 notices for this customer. read is true when read_at is set.",
        response: `[{ "id", "title", "body", "href", "read", "createdAt" }]`,
      },
      {
        method: "POST",
        path: "markCustomerNotice",
        title: "Mark one notice read",
        auth: "token",
        summary: "Sets read_at on this customer's notice. Does not mark another customer's notice.",
        request: `{ "token", "id": 5 }`,
        response: `{ "ok": true }`,
      },
    ],
  },
  {
    id: "pages",
    title: "Pages the agent may open",
    note: "show_page opens one of these for the signed-in customer and highlights the visible tab. It does not read or change data, and it does not open a ticket. show me my tickets stays a list, not a navigation.",
    endpoints: [
      { method: "GET", path: "/portal", title: "Home", auth: "show_page home", summary: "Greeting, open tickets, moving orders, and service requests for this account." },
      { method: "GET", path: "/portal/tickets", title: "Tickets", auth: "show_page tickets", summary: "This account's tickets. A detail is /portal/tickets/{id}." },
      { method: "GET", path: "/portal/tickets/new", title: "New ticket", auth: "show_page new-ticket", summary: "The form behind submitPortalTicket." },
      { method: "GET", path: "/portal/shop", title: "Order", auth: "show_page shop", summary: "Equipment and Order services. Guide id is order." },
      { method: "GET", path: "/portal/orders", title: "My orders", auth: "show_page orders", summary: "Status, payment, and shipment. Detail is /portal/orders/{id}." },
      { method: "GET", path: "/portal/billing", title: "Billing", auth: "show_page billing", summary: "Invoices and whether this account pays now or may use order now, pay later." },
      { method: "GET", path: "/portal/complaints", title: "Complaints", auth: "show_page complaints", summary: "Complaints for this customer." },
      { method: "GET", path: "/portal/organization", title: "Organization", auth: "show_page organization", summary: "The company on this login. The agent does not rename it." },
      { method: "GET", path: "/portal/account", title: "Account", auth: "show_page account", summary: "Name, email, and phone. Phone changes go through update_contact." },
      { method: "GET", path: "/portal/my-services", title: "My services", auth: "show_page services", summary: "No top-nav item. Highlight the page title." },
      { method: "GET", path: "/portal/quotes", title: "Quotes", auth: "show_page quotes", summary: "Quoted requests. Accept or reject with respondToQuote." },
      { method: "GET", path: "/portal/notifications", title: "Notifications", auth: "show_page notifications", summary: "This customer's notices. The bell is data-guide notifications." },
    ],
  },
];

export function DocsPage() {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const groups = useMemo(
    () =>
      GROUPS.map((group) => ({
        ...group,
        endpoints: group.endpoints.filter((endpoint) => {
          if (!needle) return true;
          return `${group.title} ${endpoint.title} ${endpoint.path} ${endpoint.summary} ${endpoint.request ?? ""} ${endpoint.response ?? ""}`.toLowerCase().includes(needle);
        }),
      })).filter((group) => group.endpoints.length > 0),
    [needle],
  );

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Reference"
        title="CSR agent API"
        description="How Sarah reads and changes a customer on the MTS portal. A key from this page can act for any customer id."
      />
      <AgentKeys />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="API sections">
          {GROUPS.map((group) => (
            <a key={group.id} href={`#${group.id}`} className="h-9 shrink-0 rounded-lg border border-line bg-surface px-3 text-[13px] font-medium leading-9 text-ink">
              {group.title}
            </a>
          ))}
        </nav>
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the API" aria-label="Search the API" className="h-9 sm:w-56" />
      </div>
      {groups.length === 0 ? <p className="text-sm text-muted">Nothing matches that search.</p> : null}
      <div className="grid gap-6">
        {groups.map((group) => (
          <section key={group.id} id={group.id} className="scroll-mt-24">
            <h2 className="text-lg font-semibold tracking-tight">{group.title}</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted">{group.note}</p>
            <div className="mt-3 grid gap-3">
              {group.endpoints.map((endpoint) => (
                <Panel key={`${endpoint.method}-${endpoint.path}`} className="p-0">
                  <div className="flex flex-col gap-2 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={endpoint.method === "GET" ? "rounded-md bg-info-soft px-2 py-0.5 text-[11px] font-semibold text-info" : "rounded-md bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent"}>
                        {endpoint.method}
                      </span>
                      <code className="truncate text-sm font-medium">{endpoint.path}</code>
                    </div>
                    <p className="text-xs text-muted">{endpoint.auth}</p>
                  </div>
                  <div className="grid gap-3 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">{endpoint.title}</p>
                      <p className="mt-1 text-sm text-muted">{endpoint.summary}</p>
                    </div>
                    {endpoint.request ? <Code label="Request" value={endpoint.request} /> : null}
                    {endpoint.response ? <Code label="Response" value={endpoint.response} /> : null}
                  </div>
                </Panel>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function Code({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-subtle uppercase">{label}</p>
      <pre className="mt-1 overflow-x-auto rounded-lg bg-[#f6f6f7] p-3 text-xs leading-5 text-ink">{value}</pre>
    </div>
  );
}
