const AGENT_ONLY = new Set(["status", "custom_status", "assignee", "group"]);
const NOT_COLLECTED = new Set(["lookup", "multi_lookup"]);

export function customerCanFill(type: string, visible: boolean, editable: boolean) {
  if (AGENT_ONLY.has(type) || NOT_COLLECTED.has(type)) return false;
  return visible && editable;
}

export function fieldAudience(type: string, visible: boolean) {
  if (NOT_COLLECTED.has(type)) return "Not collected";
  if (AGENT_ONLY.has(type) || !visible) return "Agent only";
  return "Customer form";
}

export function controlKind(type: string) {
  if (type === "textarea" || type === "description") return "textarea" as const;
  if (type === "tagger" || type === "priority" || type === "tickettype" || type === "multiselect") return "select" as const;
  if (type === "checkbox") return "checkbox" as const;
  if (type === "integer" || type === "decimal") return "number" as const;
  if (type === "date") return "date" as const;
  return "text" as const;
}
