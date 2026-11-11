export const ORDER_MENU = [
  {
    id: "managed",
    title: "Managed IT",
    items: [
      "Server and Network Management Solutions",
      "Backup and Recovery",
      "Cybersecurity and Compliance",
      "24-Hour System Mentoring",
      "Vendor Management",
      "Virtual CIO Services",
      "Help Desk",
      "Business Continuity",
      "Business Antivirus and Endpoint Security",
    ],
  },
  {
    id: "cloud",
    title: "Cloud Services",
    items: [
      "Application Hosting",
      "Cloud Migration and Management",
      "Desktop as a Service (DaaS)",
      "Infrastructure as a Service (IaaS)",
      "Colocation",
      "Virtual Server Hosting",
      "Virtualization Support",
      "VoIP Phone System",
    ],
  },
  {
    id: "projects",
    title: "IT Project Consulting",
    items: [
      "IT Consulting",
      "Migration and Deployment",
      "WiFi Networks",
      "Mobility (BYOD)",
      "Performance and Security Audits",
      "Free IT Health Check",
      "Structured Data Cabling",
      "Office Move & IT Relocation",
      "Domain Registration and Business Email Setup",
    ],
  },
  {
    id: "apps",
    title: "Business App Support",
    items: [
      "Google G Suite",
      "Microsoft Active Directory",
      "Microsoft 365",
      "Microsoft Sharepoint",
      "Microsoft Azure",
      "Microsoft Teams",
      "Microsoft Intune",
      "Microsoft Windows Management",
    ],
  },
] as const;

export type OrderCategoryId = (typeof ORDER_MENU)[number]["id"];

export function orderMenuItem(categoryId: string, name: string) {
  const category = ORDER_MENU.find((item) => item.id === categoryId);
  if (!category) return null;
  const service = category.items.find((item) => item === name);
  if (!service) return null;
  return { category: category.title, name: service };
}
