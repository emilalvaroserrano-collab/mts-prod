import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { saveCampaign } from "@/lib/portal/api";
import { Button, Field, Input, PageHeader, Panel, errorText } from "@/components/ui";

export const Route = createFileRoute("/_app/campaigns")({
  component: CampaignAdmin,
});

export function CampaignAdmin() {
  const client = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaHref, setCtaHref] = useState("/portal/services");
  const save = useMutation({
    mutationFn: () => saveCampaign({ data: { title, body, audience, ctaLabel, ctaHref } }),
    onSuccess: () => {
      toast.success("Campaign published");
      setTitle("");
      setBody("");
      void client.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (error) => toast.error(errorText(error)),
  });
  return (
    <div className="grid gap-4">
      <PageHeader eyebrow="Customers" title="Campaigns" description="Customers only see a campaign when it matches their access. All, shop, or business." />
      <Panel className="grid max-w-xl gap-3">
        <Field label="Title"><Input value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
        <Field label="Message"><Input value={body} onChange={(event) => setBody(event.target.value)} /></Field>
        <Field label="Audience">
          <select value={audience} onChange={(event) => setAudience(event.target.value)} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm">
            <option value="all">Everyone</option>
            <option value="shop">Shop customers</option>
            <option value="business">Business accounts</option>
          </select>
        </Field>
        <Field label="Button label"><Input value={ctaLabel} onChange={(event) => setCtaLabel(event.target.value)} /></Field>
        <Field label="Button link"><Input value={ctaHref} onChange={(event) => setCtaHref(event.target.value)} /></Field>
        <Button type="button" disabled={save.isPending} onClick={() => save.mutate()}>Publish</Button>
      </Panel>
    </div>
  );
}
