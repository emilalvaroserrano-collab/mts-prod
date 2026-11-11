import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { listCustomerNotices, markCustomerNotice } from "@/lib/portal/api";
import { useShopToken } from "@/lib/portal/shop-session";

export const Route = createFileRoute("/portal/notifications")({
  component: NoticesPage,
});

export function NoticesPage() {
  const token = useShopToken();
  const client = useQueryClient();
  const notices = useQuery({
    queryKey: ["customer-notices", token],
    queryFn: () => listCustomerNotices({ data: token }),
    enabled: Boolean(token),
  });
  const mark = useMutation({
    mutationFn: (id: number) => markCustomerNotice({ data: { token, id } }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["customer-notices", token] }),
  });
  const unread = (notices.data ?? []).filter((item) => !item.read).length;
  return (
    <div className="grid w-full gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
      <p className="text-sm text-muted">{unread ? `${unread} unread` : "You're caught up."}</p>
      {(notices.data ?? []).map((item) => (
        <a
          key={item.id}
          href={item.href || "/portal"}
          onClick={() => { if (!item.read) mark.mutate(item.id); }}
          className={item.read ? "rounded-xl border border-line bg-surface px-4 py-3 text-sm" : "rounded-xl border border-ink bg-surface px-4 py-3 text-sm"}
        >
          <span className="block font-semibold">{item.title}</span>
          <span className="text-muted">{item.body}</span>
        </a>
      ))}
      {notices.data && notices.data.length === 0 ? <p className="text-sm text-muted">No notifications yet. Ticket, order, and request updates show up here.</p> : null}
    </div>
  );
}
