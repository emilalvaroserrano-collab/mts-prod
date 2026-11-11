import assert from "node:assert/strict";
import test from "node:test";
import { zendeskDomains, zendeskOrganizationBody, zendeskTags, zendeskTicketBody, zendeskUserBody } from "./zendesk-shape.ts";

test("ticket payloads only include Zendesk fields", () => {
  const ticket = zendeskTicketBody({
    subject: "Printer down",
    body: "It jams.",
    status: "new",
    priority: "soon",
    type: "incident",
    tags: "Portal, customer, Portal",
    organizationId: "shop-12",
    requesterEmail: "not-an-email",
    creating: true,
  });
  assert.equal(ticket.status, "new");
  assert.equal(ticket.priority, undefined);
  assert.equal(ticket.type, "incident");
  assert.deepEqual(ticket.tags, ["portal", "customer"]);
  assert.equal(ticket.organization_id, undefined);
  assert.equal(ticket.requester, undefined);
  const update = zendeskTicketBody({ status: "new", creating: false });
  assert.equal(update.status, "open");
  assert.equal(zendeskTicketBody({ status: "closed" }).status, undefined);
});

test("organization and user payloads match Zendesk tables", () => {
  const organization = zendeskOrganizationBody({
    name: "North Clinic",
    domain: "https://NorthClinic.com/help, bad",
    details: "Healthcare",
    tags: ["VIP", "vip"],
    externalId: "mts-org-4",
  });
  assert.deepEqual(organization.domain_names, ["northclinic.com"]);
  assert.deepEqual(organization.tags, ["vip"]);
  assert.equal(organization.external_id, "mts-org-4");
  const user = zendeskUserBody({
    name: "Ada",
    email: "Ada@Example.com",
    role: "owner",
    phone: "123",
    organizationId: "88",
    tags: "portal",
  });
  assert.equal(user.email, "ada@example.com");
  assert.equal(user.role, "end-user");
  assert.equal(user.phone, undefined);
  assert.equal(user.organization_id, 88);
  assert.deepEqual(zendeskDomains("example.com example.com"), ["example.com"]);
  assert.deepEqual(zendeskTags(""), []);
});
