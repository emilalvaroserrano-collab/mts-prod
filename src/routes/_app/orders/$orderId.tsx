import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { deleteOrder, getOrder, linkOrderTicket, refreshAlternativeOrder, trackAwb, updateOrder } from "@/lib/portal/api";
import { AwbScanner } from "@/components/awb-scanner";
import { OrderBarcode } from "@/components/order-barcode";
import { isUpsAwb, upsTrackUrl } from "@/lib/portal/awb";
import { ago, day, money, paymentLabel, orderCustomer, orderEmail, shopifyDelivery, shopifyFulfillment, shopifyPayment } from "@/lib/portal/format";
import { orderPdfUrl } from "@/lib/portal/pdf";
import { Badge, Button, ErrorNote, Field, Input, Loading, PageHeader, Panel, Select, StatusBadge, Textarea, errorText } from "@/components/ui";

export const Route = createFileRoute("/_app/orders/$orderId")({
  component: OrderPage,
});

const STATUSES = ["pending", "approved", "processing", "fulfilled", "cancelled"] as const;

type DraftLine = {
  productId: number | null;
  productName: string;
  sku: string;
  quantity: number;
  unitPriceCents: number;
};

function printAwb(number: string) {
  const label = document.getElementById("awb-label");
  if (!label) return;
  const popup = window.open("", "awb", "noopener,noreferrer,width=480,height=720");
  if (!popup) return;
  popup.document.write(`<!doctype html><meta charset="utf-8"><title>${number} air waybill</title>
    <style>body{margin:28px;font-family:Helvetica,sans-serif;color:#111}svg{width:100%;height:auto}p{text-align:center}</style>
    ${label.innerHTML}<script>addEventListener("load",()=>print())<\/script>`);
  popup.document.close();
}

export function OrderPage() {
  const { orderId = "" } = useParams({ strict: false });
  const id = Number(orderId);
  const client = useQueryClient();
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ["order", id], queryFn: () => getOrder({ data: id }) });
  const [status, setStatus] = useState("pending");
  const [approvalNote, setApprovalNote] = useState("");
  const [processingNote, setProcessingNote] = useState("");
  const [shipmentStatus, setShipmentStatus] = useState("unfulfilled");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingCarrier, setTrackingCarrier] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [addProductId, setAddProductId] = useState<number | "">("");
  const [awbNote, setAwbNote] = useState("");

  useEffect(() => {
    if (!query.data) return;
    setStatus(query.data.order.status);
    setApprovalNote(query.data.order.approvalNote);
    setProcessingNote(query.data.order.processingNote);
    setShipmentStatus(query.data.order.shipmentStatus || "unfulfilled");
    setTrackingNumber(query.data.order.trackingNumber);
    setTrackingCarrier(query.data.order.trackingCarrier);
    setNotes(query.data.order.notes);
    setLines(
      query.data.order.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
      })),
    );
  }, [query.data]);

  const save = useMutation({
    mutationFn: () =>
      updateOrder({
        data: {
          id,
          status,
          approvalNote,
          processingNote,
          shipmentStatus,
          trackingNumber,
          trackingCarrier,
          notes,
          items: lines.map((line) => ({ productId: line.productId, sku: line.sku, quantity: line.quantity })),
        },
      }),
    onSuccess: () => {
      toast.success("Order updated");
      client.invalidateQueries({ queryKey: ["order", id] });
      client.invalidateQueries({ queryKey: ["orders"] });
      client.invalidateQueries({ queryKey: ["dashboard"] });
      client.invalidateQueries({ queryKey: ["shell"] });
    },
    onError: (error) => toast.error(errorText(error)),
  });

  const remove = useMutation({
    mutationFn: () => deleteOrder({ data: id }),
    onSuccess: () => {
      toast.success("Order deleted");
      client.invalidateQueries({ queryKey: ["orders"] });
      client.invalidateQueries({ queryKey: ["dashboard"] });
      client.invalidateQueries({ queryKey: ["shell"] });
      navigate({ to: "/orders" });
    },
    onError: (error) => toast.error(errorText(error)),
  });

  const link = useMutation({
    mutationFn: () => linkOrderTicket({ data: id }),
    onSuccess: (result) => {
      if (result.warning) toast.error(`Ticket saved here. ${result.warning}`);
      else toast.success("Linked to a ticket");
      client.invalidateQueries({ queryKey: ["order", id] });
      client.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (error) => toast.error(errorText(error)),
  });

  const refreshPay = useMutation({
    mutationFn: () => refreshAlternativeOrder({ data: id }),
    onSuccess: (next) => {
      toast.success(next.paymentStatus ? `Payment ${next.paymentStatus}` : "Payment checked");
      client.invalidateQueries({ queryKey: ["order", id] });
    },
    onError: (error) => toast.error(errorText(error)),
  });

  const scan = useMutation({
    mutationFn: (awb: string) => trackAwb({ data: awb }),
    onSuccess: (result) => {
      setTrackingNumber(result.awb);
      if (result.carrier) setTrackingCarrier(result.carrier);
      if (result.shipmentStatus) setShipmentStatus(result.shipmentStatus);
      setAwbNote(result.detail);
      toast.success(result.valid ? "Air waybill scanned" : "Check the scanned number");
    },
    onError: (error) => toast.error(errorText(error)),
  });

  if (query.isPending) return <Loading />;
  if (query.isError) return <ErrorNote message={query.error.message} />;
  const order = query.data.order;
  const payment = shopifyPayment(order);
  const fulfillment = shopifyFulfillment(order);
  const delivery = shopifyDelivery(order);

  function openPdf() {
    const url = orderPdfUrl(order);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${order.number}.pdf`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow={`Placed ${day(order.createdAt)}`}
        title={order.number}
        description={`${order.organizationName}${order.customerName ? ` · ${order.customerName}` : ""}${order.paymentMethod ? ` · ${paymentLabel(order.paymentMethod)}` : ""}`}
        actions={
          <>
            {order.paymentMethod === "alternative" ? (
              <>
                <a
                  href={order.paymentUrl || "https://go.alternativepayments.io"}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center rounded-lg bg-ink px-3 text-[13px] font-semibold text-white"
                >
                  Pay with Alternative Payments
                </a>
                <Button type="button" variant="secondary" disabled={refreshPay.isPending} onClick={() => refreshPay.mutate()}>
                  {refreshPay.isPending ? "Checking" : "Check payment"}
                </Button>
              </>
            ) : null}
            <Button variant="secondary" type="button" onClick={openPdf}>
              Order PDF
            </Button>
            <Link to="/orders" className="inline-flex h-11 items-center text-sm text-accent">
              All orders
            </Link>
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={payment.tone}>{payment.label}</Badge>
        <Badge tone={fulfillment.tone}>{fulfillment.label}</Badge>
        {delivery ? <Badge tone={delivery.tone}>{delivery.label}</Badge> : null}
        <StatusBadge value={order.status} />
        {order.ticketId ? (
          <Link to="/tickets/$ticketId" params={{ ticketId: String(order.ticketId) }} className="text-sm text-accent">
            {order.zendeskTicketId ? `Zendesk #${order.zendeskTicketId}` : `Portal ticket P-${order.ticketId}`}
          </Link>
        ) : (
          <span className="text-sm text-muted">No linked ticket</span>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Panel>
          <p className="text-xs font-medium text-muted">Customer</p>
          <p className="mt-1 text-sm font-semibold">{orderCustomer(order)}</p>
          <p className="text-sm text-muted">{orderEmail(order) || "No email"}</p>
          <p className="text-sm text-muted">{order.shipPhone || "No phone"}</p>
          <p className="mt-2 text-xs text-muted">{order.organizationName}</p>
        </Panel>
        <Panel>
          <p className="text-xs font-medium text-muted">Ship to</p>
          <p className="mt-1 text-sm">
            {[order.shipAddress, order.shipCity, order.shipRegion, order.shipPostal, order.shipCountry].filter(Boolean).join(", ") || "No shipping address"}
          </p>
          <p className="mt-2 text-xs text-muted">
            {order.shippingMethod === "express" ? "Express" : order.shippingMethod === "standard" ? "Standard" : "Not chosen"}
            {order.shippingCents ? ` · ${money(order.shippingCents)}` : order.shippingMethod ? " · Free" : ""}
          </p>
        </Panel>
        <Panel>
          <p className="text-xs font-medium text-muted">Payment</p>
          <p className="mt-1 text-sm font-semibold">{payment.label}</p>
          <p className="text-sm text-muted">{order.paymentMethod ? paymentLabel(order.paymentMethod) : "No method"}</p>
          <p className="mt-2 text-sm tabular-nums">
            Items {money(order.totalCents)}
            {order.shippingCents ? ` · Shipping ${money(order.shippingCents)}` : ""}
          </p>
          <p className="text-sm font-semibold tabular-nums">Total {money(order.totalCents + order.shippingCents)}</p>
        </Panel>
        <Panel>
          <p className="text-xs font-medium text-muted">Fulfillment</p>
          <p className="mt-1 text-sm font-semibold">{fulfillment.label}</p>
          <p className="text-sm text-muted">{delivery?.label || "No delivery update"}</p>
          <p className="mt-2 font-mono text-xs text-muted">{order.trackingNumber ? `${order.trackingCarrier || "Tracking"} ${order.trackingNumber}` : "No tracking number"}</p>
          <p className="mt-1 text-xs text-muted">{order.itemCount} {order.itemCount === 1 ? "item" : "items"} · Placed {day(order.createdAt)}</p>
        </Panel>
      </div>
      {order.events.length > 0 ? (
        <Panel>
          <h2 className="text-sm font-semibold">Timeline</h2>
          <ul className="mt-3 divide-y divide-line">
            {order.events.map((event) => (
              <li key={event.id} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-baseline sm:justify-between">
                <p className="text-sm">
                  <span className="font-medium capitalize">{event.kind}</span>
                  {event.fromValue || event.toValue ? ` · ${event.fromValue || "—"} → ${event.toValue || "—"}` : ""}
                  {event.detail ? <span className="text-muted"> · {event.detail}</span> : null}
                </p>
                <p className="text-xs text-muted">{event.actorName} · {ago(event.createdAt)}</p>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_20rem]">
        <Panel>
          <h2 className="text-sm font-semibold">Items</h2>
          <div className="stack-wrap mt-4 overflow-x-auto">
            <table className="stack-table w-full min-w-[28rem] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="py-2 font-medium">Item</th>
                  <th className="py-2 font-medium">Qty</th>
                  <th className="py-2 font-medium">Unit</th>
                  <th className="py-2 text-right font-medium">Line</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((item, index) => (
                  <tr key={`${item.sku}-${index}`} className="border-t border-line">
                    <td className="py-3">
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-xs text-muted">{item.sku}</p>
                    </td>
                    <td className="py-3" data-label="Qty">
                      <Input
                        type="number"
                        min={1}
                        max={999}
                        value={item.quantity}
                        disabled={!query.data.canEdit}
                        aria-label={`Quantity for ${item.productName}`}
                        className="h-8 w-16 font-mono"
                        onChange={(event) => {
                          const quantity = Math.max(1, Number(event.target.value) || 1);
                          setLines((current) => current.map((line, lineIndex) => (lineIndex === index ? { ...line, quantity } : line)));
                        }}
                      />
                    </td>
                    <td className="py-3 font-mono tabular-nums" data-label="Unit">{money(item.unitPriceCents)}</td>
                    <td className="py-3 text-right" data-label="Line">
                      <span className="font-mono tabular-nums">{money(item.quantity * item.unitPriceCents)}</span>
                      {query.data.canEdit ? (
                        <button
                          type="button"
                          className="ml-3 text-xs text-muted hover:text-ink"
                          onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}
                        >
                          Remove
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {query.data.canEdit ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Select
                value={addProductId}
                onChange={(event) => setAddProductId(event.target.value ? Number(event.target.value) : "")}
                aria-label="Add a product"
                className="h-8 max-w-xs"
              >
                <option value="">Add a product</option>
                {query.data.products
                  .filter((product) => product.available)
                  .map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
              </Select>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const product = query.data.products.find((item) => item.id === addProductId);
                  if (!product) return;
                  setLines((current) => [
                    ...current,
                    {
                      productId: product.id,
                      productName: product.name,
                      sku: product.sku,
                      quantity: 1,
                      unitPriceCents: product.priceCents,
                    },
                  ]);
                  setAddProductId("");
                }}
              >
                Add
              </Button>
            </div>
          ) : null}
          <p className="mt-4 text-right font-mono text-lg tabular-nums">
            {money(lines.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0))}
          </p>
          <Field label="Notes">
            <Textarea value={notes} disabled={!query.data.canEdit} onChange={(event) => setNotes(event.target.value)} />
          </Field>
        </Panel>
        <div className="grid content-start gap-4">
          <Panel>
            <h2 className="text-sm font-semibold">Air waybill</h2>
            <p className="mt-1 text-xs text-muted">Code 128 of this order. A UPS scanner, or any courier barcode gun, reads it as {order.number}.</p>
            <div id="awb-label" className="mt-4 rounded-lg border border-line bg-white px-3 py-4">
              <p className="text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-ink">Manage Tech Service</p>
              <div className="mt-2">
                <OrderBarcode value={order.number} />
              </div>
              <p className="mt-1 text-center font-mono text-sm tracking-[0.18em] text-ink">{order.number}</p>
              {order.shipName || order.shipCity ? (
                <p className="mt-2 text-center text-xs text-muted">
                  {[order.shipName, order.shipCity, order.shipRegion, order.shipPostal].filter(Boolean).join(", ")}
                </p>
              ) : null}
            </div>
            <Button className="mt-3" type="button" variant="secondary" onClick={() => printAwb(order.number)}>
              Print waybill
            </Button>
          </Panel>
          <Panel>
            <h2 className="text-sm font-semibold">Processing</h2>
            <form
              className="mt-4 grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                save.mutate();
              }}
            >
              <Field label="Status">
                <Select value={status} onChange={(event) => setStatus(event.target.value)}>
                  {STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Approval">
                <Textarea value={approvalNote} onChange={(event) => setApprovalNote(event.target.value)} />
              </Field>
              <Field label="Shipment">
                <Select value={shipmentStatus} onChange={(event) => setShipmentStatus(event.target.value)}>
                  <option value="unfulfilled">Not shipped</option>
                  <option value="shipped">Shipped</option>
                  <option value="out_for_delivery">Out for delivery</option>
                  <option value="delivered">Delivered</option>
                </Select>
              </Field>
              <Field label="Carrier">
                <Input value={trackingCarrier} onChange={(event) => setTrackingCarrier(event.target.value)} placeholder="UPS" />
              </Field>
              <Field label="UPS air waybill" hint="Scan the 1Z barcode on the label, then save the order.">
                <Input
                  value={trackingNumber}
                  onChange={(event) => setTrackingNumber(event.target.value.toUpperCase())}
                  placeholder="1Z…"
                  className="font-mono"
                  autoComplete="off"
                />
              </Field>
              <AwbScanner onScan={(awb) => scan.mutate(awb)} />
              {awbNote ? <p className="text-sm text-muted">{scan.isPending ? "Checking UPS…" : awbNote}</p> : null}
              {isUpsAwb(trackingNumber.replace(/[^0-9A-Z]/gi, "").toUpperCase()) ? (
                <a className="text-sm text-accent" href={upsTrackUrl(trackingNumber.replace(/\s/g, ""))} target="_blank" rel="noreferrer">
                  Open this number on UPS
                </a>
              ) : null}
              <Field label="Bench note">
                <Textarea value={processingNote} onChange={(event) => setProcessingNote(event.target.value)} />
              </Field>
              <Button type="submit" disabled={!query.data.canEdit || save.isPending || lines.length === 0}>
                {save.isPending ? "Saving" : "Save order"}
              </Button>
              {query.data.canDelete ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(`Delete ${order.number}? This cannot be undone.`)) remove.mutate();
                  }}
                >
                  {remove.isPending ? "Deleting" : "Delete order"}
                </Button>
              ) : null}
            </form>
          </Panel>
          <Panel>
            <h2 className="text-sm font-semibold">Zendesk</h2>
            <p className="mt-2 text-sm text-muted">
              {order.ticketSubject || "Creates a portal ticket tagged Pending Orders, and a Zendesk ticket when the desk is connected."}
            </p>
            {order.ticketId ? null : (
              <Button className="mt-4" type="button" variant="secondary" disabled={link.isPending} onClick={() => link.mutate()}>
                {link.isPending ? "Linking" : "Create ticket"}
              </Button>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
