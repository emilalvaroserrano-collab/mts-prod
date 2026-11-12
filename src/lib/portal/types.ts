export type Role = "owner" | "admin" | "agent" | "viewer";

export type Actor = {
  userId: string;
  name: string;
  email: string;
  role: Role;
  organizationId: number | null;
  organizationName: string | null;
  active: boolean;
};

export type ShellInfo = {
  actor: Actor;
  brandName: string;
  tagline: string;
  zendeskConnected: boolean;
  zendeskStatus: string;
  orderCount: number;
  ticketCount: number;
  peopleCount: number;
  catalogCount: number;
  companyCount: number;
  noticeCount: number;
};

export type Ticket = {
  id: number;
  zendeskId: string;
  subject: string;
  status: string;
  priority: string;
  ticketType: string;
  groupName: string;
  category: string;
  organizationId: number | null;
  organizationName: string;
  requesterName: string;
  requesterEmail: string;
  assignee: string;
  tags: string[];
  viewLabel: string;
  channel: string;
  externalId: string;
  createdAt: string;
  updatedAt: string;
};

export type Comment = {
  id: number;
  authorName: string;
  body: string;
  publicNote: boolean;
  createdAt: string;
};

export type Org = {
  id: number;
  name: string;
  domain: string;
  industry: string;
  phone: string;
  address: string;
  zendeskOrgId: string;
  notes: string;
  details: string;
  tags: string;
  externalId: string;
  sharedTickets: boolean;
  sharedComments: boolean;
  portalAccess: boolean;
  orderingEnabled: boolean;
  userRequestsEnabled: boolean;
  approvalRequired: boolean;
  createdAt: string;
  userCount: number;
  openTickets: number;
  orderCount: number;
};

export type Customer = {
  id: number;
  organizationId: number | null;
  organizationName: string;
  name: string;
  email: string;
  title: string;
  permissionLevel: string;
  canOrder: boolean;
  canRequestUsers: boolean;
  canApproveOrders: boolean;
  active: boolean;
  zendeskUserId: string;
  createdAt: string;
  source: "company" | "shop" | "portal";
  staffUserId: string;
  phone: string;
  orderCount: number;
  lastOrderId: number | null;
  lastOrderStatus: string;
  ticketId: number | null;
  zendeskTicketId: string;
  payLater: boolean;
};

export type UserRequest = {
  id: number;
  organizationId: number | null;
  organizationName: string;
  requestedName: string;
  requestedEmail: string;
  requestedBy: string;
  status: string;
  createdAt: string;
};

export type Product = {
  id: number;
  sku: string;
  name: string;
  category: string;
  description: string;
  specs: string;
  priceCents: number;
  imageUrl: string;
  images: string[];
  stock: number;
  available: boolean;
  visibility: string;
};

export type OrderItem = {
  id: number;
  productId: number | null;
  productName: string;
  sku: string;
  quantity: number;
  unitPriceCents: number;
};

export type OrderEvent = {
  id: number;
  kind: string;
  fromValue: string;
  toValue: string;
  actorName: string;
  detail: string;
  createdAt: string;
};

export type Order = {
  id: number;
  number: string;
  organizationId: number;
  organizationName: string;
  customerUserId: number | null;
  customerName: string;
  customerEmail: string;
  status: string;
  ticketId: number | null;
  zendeskTicketId: string;
  ticketSubject: string;
  notes: string;
  approvalNote: string;
  processingNote: string;
  createdAt: string;
  updatedAt: string;
  totalCents: number;
  paymentMethod: string;
  paymentUrl: string;
  paymentStatus: string;
  shipName: string;
  shipEmail: string;
  shipPhone: string;
  shipAddress: string;
  shipCity: string;
  shipRegion: string;
  shipPostal: string;
  shipCountry: string;
  shippingMethod: string;
  shippingCents: number;
  shipmentStatus: string;
  trackingNumber: string;
  trackingCarrier: string;
  itemCount: number;
  items: OrderItem[];
  events: OrderEvent[];
};

export type TicketForm = {
  id: number;
  name: string;
  category: string;
  subcategory: string;
  zendeskField: string;
  requiredFields: string[];
  restricted: boolean;
  active: boolean;
};

export type DeskFieldOption = { name: string; value: string };

export type DeskField = {
  id: string;
  key: string;
  title: string;
  description: string;
  type: string;
  required: boolean;
  visible: boolean;
  options: DeskFieldOption[];
};

export type DeskCondition = {
  parentId: string;
  value: string;
  children: { id: string; required: boolean }[];
};

export type DeskForm = {
  id: string;
  name: string;
  fieldIds: string[];
  conditions: DeskCondition[];
};

export type Policy = {
  id: string;
  label: string;
  description: string;
  canOrder: boolean;
  canRequestUsers: boolean;
  canApproveOrders: boolean;
  canManagePortal: boolean;
  scope: string;
  canTicket: boolean;
  canShop: boolean;
  canPurchase: boolean;
  canPayNow: boolean;
  canOrderIt: boolean;
  canOrderPhone: boolean;
  canDefer: boolean;
};

export type Integration = {
  subdomain: string;
  email: string;
  tokenSet: boolean;
  fromEnv: boolean;
  lastSyncAt: string | null;
  lastStatus: string;
  lastError: string;
  conversationsReady: boolean;
  conversationsAppId: string;
  conversationsKeyId: string;
  conversationsSecretSet: boolean;
  webhookReady: boolean;
  webhookId: string;
  oauthReady: boolean;
  oauthClientId: string;
  oauthFromEnv: boolean;
  oauthSecretSet: boolean;
};

export type PortalSettings = {
  brandName: string;
  supportEmail: string;
  tagline: string;
  replyName: string;
  emailSignature: string;
  notifyNewTicket: boolean;
  notifyNewOrder: boolean;
  customerCatalogVisible: boolean;
};

export type Audit = {
  id: number;
  actorName: string;
  action: string;
  target: string;
  detail: string;
  createdAt: string;
};

export type Notice = {
  id: number;
  kind: string;
  title: string;
  body: string;
  href: string;
  audience: string;
  actorName: string;
  read: boolean;
  createdAt: string;
};

export type Staff = {
  userId: string;
  name: string;
  email: string;
  role: Role;
  organizationId: number | null;
  organizationName: string;
  active: boolean;
};

export type Dashboard = {
  orgCount: number;
  userCount: number;
  tickets: { incoming: number; open: number; pending: number; solved: number };
  invoiceCount: number;
  recentTickets: Ticket[];
  pendingOrders: Order[];
  recentOrders: Order[];
  activity: Audit[];
};

export type TicketFilter = {
  q: string;
  status: string;
  orgId: number | null;
  category: string;
  assignee: string;
  view: string;
};

export type Named = { id: number; name: string };

export type TicketList = {
  tickets: Ticket[];
  orgs: Named[];
  categories: string[];
  assignees: string[];
};

export type TicketDetail = {
  ticket: Ticket;
  comments: Comment[];
  assignees: string[];
};

export type OrgDetail = {
  org: Org;
  people: Customer[];
  tickets: Ticket[];
  orders: Order[];
};

export type PeopleData = {
  people: Customer[];
  requests: UserRequest[];
  orgs: Named[];
  policies: Policy[];
};

export type OrderDraft = {
  organizationId: number;
  customerUserId: number | null;
  notes: string;
  paymentMethod: string;
  returnUrl: string;
  items: { productId: number; quantity: number }[];
};

export type Payments = {
  cardEnabled: boolean;
  invoiceEnabled: boolean;
  purchaseOrderEnabled: boolean;
  publishableKey: string;
  secretSet: boolean;
  fromEnv: boolean;
  invoiceTerms: string;
  requirePo: boolean;
  lastStatus: string;
  lastError: string;
  accountName: string;
  methods: string[];
  alternativeEnabled: boolean;
  alternativeClientId: string;
  alternativeSecretSet: boolean;
  alternativeFromEnv: boolean;
  alternativeStatus: string;
  alternativeError: string;
  alternativePortalUrl: string;
  alternativeEnvironment: "sandbox" | "live";
  alternativeEnvironmentLocked: boolean;
};

export type Storefront = {
  brandName: string;
  slug: string;
  tagline: string;
  supportEmail: string;
  closed: boolean;
  products: Product[];
};

export type ShopCustomer = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  region: string;
  postal: string;
  country: string;
  payLater: boolean;
};

export type ShopOrderItem = {
  name: string;
  sku: string;
  quantity: number;
  unitPriceCents: number;
};

export type ShopOrder = {
  id: number;
  number: string;
  createdAt: string;
  status: string;
  shipmentStatus: string;
  trackingNumber: string;
  trackingCarrier: string;
  shippingMethod: string;
  paymentMethod: string;
  paymentUrl: string;
  totalCents: number;
  shipName: string;
  shipAddress: string;
  shipCity: string;
  shipRegion: string;
  shipPostal: string;
  shipCountry: string;
  items: ShopOrderItem[];
};

export type PortalAccess = {
  roleId: string;
  roleLabel: string;
  canTicket: boolean;
  canShop: boolean;
  canPurchase: boolean;
  canPayNow: boolean;
  canOrderIt: boolean;
  canOrderPhone: boolean;
  canDefer: boolean;
};

export type PortalComment = { author: string; body: string; at: string };

export type PortalTicket = {
  id: number;
  subject: string;
  status: string;
  category: string;
  zendeskId: string;
  zendeskWarning: string;
  updatedAt: string;
  comments: PortalComment[];
};

export type PortalSession = {
  customer: ShopCustomer;
  access: PortalAccess;
  tickets: PortalTicket[];
  business: string;
  organization: string;
  interests: string[];
  verified: boolean;
  zendeskRole: string;
  timeZone: string;
  grants: { shop: boolean; services: boolean; invoice: boolean };
};

export type ServiceItem = {
  id: number;
  category: string;
  name: string;
  summary: string;
  kind: string;
  benefits: string;
  scope: string;
};

export type ServiceRequest = {
  id: number;
  category: string;
  serviceName: string;
  details: string;
  severity: string;
  status: string;
  quoteNote: string;
  customer: string;
  email: string;
  organization: string;
  createdAt: string;
};

export type ShopAccount = {
  customer: ShopCustomer;
  orders: ShopOrder[];
};

export type ShopCheckoutInfo = {
  methods: string[];
  invoiceTerms: string;
  alternativeEnvironment: "sandbox" | "live";
  payLater: boolean;
  sandboxReady: boolean;
  signedIn: boolean;
  canPurchase: boolean;
  canPayNow: boolean;
};

