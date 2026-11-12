import { lookupKnowledge, matchPage } from "@/lib/portal/knowledge";

export const OFFERINGS = [
  "network",
  "voip-line",
  "voip-ext",
  "fax-physical",
  "fax-efax",
  "internet-spectrum",
  "internet-att",
  "internet-frontier",
  "internet-fixed",
  "wiring",
] as const;

export type Offering = (typeof OFFERINGS)[number];

export type Planned =
  | { tool: "account" }
  | { tool: "list_tickets" }
  | { tool: "list_orders" }
  | { tool: "list_requests" }
  | { tool: "open_ticket"; subject: string; body: string; category: string }
  | { tool: "reply_ticket"; id: number; body: string }
  | { tool: "order_service"; offering: Offering; site: string; notes: string; recipientEmail: string; drops: number; shipPhone: boolean; confirmMonthly: boolean }
  | { tool: "complaint"; subject: string; body: string }
  | { tool: "update_contact"; phone: string }
  | { tool: "find_equipment"; query: string; add: boolean }
  | { tool: "list_catalog" }
  | { tool: "place_order"; sku: string; quantity: number; payLater: boolean }
  | { tool: "order_detail"; id: number }
  | { tool: "cancel_order"; id: number }
  | { tool: "pay_order"; id: number }
  | { tool: "list_billing" }
  | { tool: "list_notices" }
  | { tool: "read_notice"; id: number }
  | { tool: "ticket_detail"; id: number }
  | { tool: "close_ticket"; id: number }
  | { tool: "refresh_ticket"; id: number }
  | { tool: "update_company"; business: string; phone: string; city: string }
  | { tool: "show"; page: string }
  | { tool: "lookup"; query: string }
  | { tool: "confirm" }
  | { tool: "decline" }
  | { tool: "ask" };

const YES = /\b(yes|yeah|yep|agree|confirmed|confirm|go ahead|please do|do it|that's right|that is right|ok|okay)\b/i;
const NO = /\b(no|nope|don't|do not|cancel|never mind|stop)\b/i;

export function affirms(text: string) {
  if (/\$?\s*18\b|eighteen/.test(text) && !/\b(yes|yeah|yep|agree|go ahead|confirm|do it|please do)\b/i.test(text)) return false;
  return YES.test(text) && !NO.test(text);
}

export function declines(text: string) {
  return NO.test(text) && !/\bknow\b/i.test(text);
}

function emailIn(text: string) {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase() ?? "";
}

function dropsIn(text: string) {
  const word = text.match(/\b(\d{1,2})\b/);
  const n = word ? Number(word[1]) : 1;
  return Math.min(50, Math.max(1, n));
}

export function planUtterance(text: string): Planned {
  const raw = text.trim();
  const q = raw.toLowerCase();
  if (!raw) return { tool: "ask" };
  if (declines(q) && q.split(/\s+/).length <= 6) return { tool: "decline" };
  if (/\b(who am i|my account|my profile|what.*account)\b/.test(q)) return { tool: "account" };
  if (/\b(my tickets|open tickets|ticket status|any tickets)\b/.test(q)) return { tool: "list_tickets" };
  if (/\b(my orders|order status|where.*order|shipment|tracking)\b/.test(q)) return { tool: "list_orders" };
  if (/\b(my requests|my services|quote status)\b/.test(q)) return { tool: "list_requests" };
  if (/\b(take me to|go to|bring me to|bring up|pull up|where is|where's|show me the|open the)\b/.test(q) || (/\bopen\b/.test(q) && /\b(page|tab)\b/.test(q))) {
    const page = matchPage(q);
    if (page) return { tool: "show", page: page.id };
  }
  if (/\b(what|how|explain|tell me|price|cost|about)\b/.test(q) && lookupKnowledge(raw)) return { tool: "lookup", query: raw };
  if (/\bphone\b/.test(q) && /\b(change|update|new number|call me at)\b/.test(q)) {
    const phone = raw.match(/(\+?[\d][\d\s().-]{6,})/)?.[1]?.trim() ?? "";
    return phone ? { tool: "update_contact", phone } : { tool: "ask" };
  }
  if (/\b(laptop|printer|monitor|headset|desk phone|mouse|dock|keyboard|webcam|equipment|catalog)\b/.test(q) && /\b(find|show|looking|catalog|price|buy|add|cart|need a|order a)\b/.test(q) && !/\b(down|broken|not working|feels like|whenever)\b/.test(q)) {
    return { tool: "find_equipment", query: raw, add: /\b(add|cart|buy|i'll take|ill take)\b/.test(q) };
  }
  if (/\b(file a complaint|complaint)\b/.test(q)) {
    return { tool: "complaint", subject: raw.slice(0, 140), body: raw };
  }
  if (/\b(reply|respond|update ticket)\b/.test(q)) {
    const id = Number(raw.match(/ticket\s*#?\s*(\d+)/i)?.[1] ?? raw.match(/\b(\d{1,6})\b/)?.[1] ?? 0);
    if (id) return { tool: "reply_ticket", id, body: raw };
  }
  if (/\b(down|broken|not working|outage)\b/.test(q)) {
    return { tool: "open_ticket", subject: raw.slice(0, 140), body: raw, category: "Outage" };
  }
  if (/\b(extension|ext)\b/.test(q)) {
    return { tool: "order_service", offering: "voip-ext", site: "", notes: raw, recipientEmail: "", drops: 1, shipPhone: /\b(desk phone|handset|ship)\b/.test(q), confirmMonthly: false };
  }
  if (/\bvoip|phone line\b/.test(q)) {
    return { tool: "order_service", offering: "voip-line", site: "", notes: raw, recipientEmail: "", drops: 1, shipPhone: false, confirmMonthly: false };
  }
  if (/\befax|e-fax\b/.test(q)) {
    return { tool: "order_service", offering: "fax-efax", site: "", notes: raw, recipientEmail: emailIn(raw), drops: 1, shipPhone: false, confirmMonthly: false };
  }
  if (/\bfax\b/.test(q)) {
    return { tool: "order_service", offering: "fax-physical", site: "", notes: raw, recipientEmail: "", drops: 1, shipPhone: false, confirmMonthly: false };
  }
  if (/\bwiring|network drop\b/.test(q)) {
    return { tool: "order_service", offering: "wiring", site: "", notes: raw, recipientEmail: "", drops: dropsIn(q), shipPhone: false, confirmMonthly: false };
  }
  if (/\bspectrum\b/.test(q)) return { tool: "order_service", offering: "internet-spectrum", site: "", notes: raw, recipientEmail: "", drops: 1, shipPhone: false, confirmMonthly: false };
  if (/\batt\b|\bat&t\b/.test(q)) return { tool: "order_service", offering: "internet-att", site: "", notes: raw, recipientEmail: "", drops: 1, shipPhone: false, confirmMonthly: false };
  if (/\bfrontier\b/.test(q)) return { tool: "order_service", offering: "internet-frontier", site: "", notes: raw, recipientEmail: "", drops: 1, shipPhone: false, confirmMonthly: false };
  if (/\bfixed wireless\b/.test(q)) return { tool: "order_service", offering: "internet-fixed", site: "", notes: raw, recipientEmail: "", drops: 1, shipPhone: false, confirmMonthly: false };
  if (/\binternet\b|\bnetwork\b|\bnew office\b|\bconnect\b/.test(q)) {
    return { tool: "order_service", offering: "network", site: "", notes: raw, recipientEmail: "", drops: 1, shipPhone: false, confirmMonthly: false };
  }
  if (/\b(open|create|file|submit)\b/.test(q) && /\bticket\b/.test(q)) {
    return { tool: "open_ticket", subject: raw.slice(0, 140), body: raw, category: "Chat" };
  }
  if (affirms(q) && q.split(/\s+/).length <= 8) return { tool: "confirm" };
  return { tool: "ask" };
}

export function spokenFallback(text: string) {
  const q = text.toLowerCase();
  if (/\bprinter\b/.test(q) && /\b(feels like|whenever|sometimes|intermittent)\b/.test(q)) {
    return "Those are the annoying ones. Is it one printer, or every printer in the office?";
  }
  return "";
}
