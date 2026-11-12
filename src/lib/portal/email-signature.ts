export const PORTAL_ORIGIN = "https://mts.192-888-702-801.site";
export const TICKETS_URL = `${PORTAL_ORIGIN}/production/user-portal/tickets`;

export const DEFAULT_EMAIL_SIGNATURE = `{{agent.name}}
Manage Tech Service
Technology that drives business success.
${PORTAL_ORIGIN}`;

export function renderSignature(template: string, name: string) {
  const source = template.trim() || DEFAULT_EMAIL_SIGNATURE;
  return source.replaceAll("{{agent.name}}", name.trim() || "MTS Support").trim();
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
}

export function signatureHtml(template: string) {
  return (template.trim() || DEFAULT_EMAIL_SIGNATURE)
    .split("\n")
    .map((line) =>
      line
        .split(/(\{\{agent\.name\}\})/g)
        .map((part) => (part === "{{agent.name}}" ? part : escapeHtml(part)))
        .join(""),
    )
    .join("<br>\n");
}

export function htmlMailTemplate(template: string) {
  const signature = signatureHtml(template);
  return `<!DOCTYPE html>
<html dir="auto" {{lang}}>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <style type="text/css">
    table td { border-collapse: collapse; }
    {{styles}}
  </style>
</head>
<body {{attributes}} style="width: 100%!important; margin: 0; padding: 0;">
  <div style="font-family: 'system-ui','-apple-system','BlinkMacSystemFont','Segoe UI','Roboto','Helvetica Neue','Arial','sans-serif'; font-size: 14px; line-height: 1.5; color:#444444;">
    {{content}}
  </div>
  <div style="font-family: 'system-ui','-apple-system','BlinkMacSystemFont','Segoe UI','Roboto','Helvetica Neue','Arial','sans-serif'; font-size: 13px; line-height: 1.5; color:#444444; margin-top: 16px;">
    ${signature}
    <br><a href="${TICKETS_URL}">Open your tickets</a>
  </div>
  {{quoted_content}}
</body>
</html>`;
}

export function textMailTemplate(template: string) {
  const signature = (template.trim() || DEFAULT_EMAIL_SIGNATURE).trim();
  return `{{content}}\n\n${signature}\nOpen your tickets: ${TICKETS_URL}\n\n{{quoted_content}}`;
}
