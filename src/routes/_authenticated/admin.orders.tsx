import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, RefreshCw, Upload } from "lucide-react";
import {
  adminDocumentUrl,
  adminFulfilItem,
  adminListOrders,
  adminSetItemDueDate,
  adminSetOrderDates,
  adminSetOrderStatus,
  adminUploadItemDocument,
} from "@/lib/orders.functions";
import { formatPrice } from "@/lib/products";
import { Button } from "@/components/ui/button";


export const Route = createFileRoute("/_authenticated/admin/orders")({
  head: () => ({
    meta: [
      { title: "Orders — Admin" },
      { name: "description", content: "Review and fulfil customer certificate and report orders." },
      { property: "og:title", content: "Orders — Admin" },
      { property: "og:description", content: "Review and fulfil customer certificate and report orders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminOrdersPage,
});

const euros = (cents: number) => formatPrice(cents / 100);
const STATUSES = ["awaiting_payment", "paid", "processing", "delivered", "cancelled"];

const dateInput = (value?: string | null) => (value ? value.slice(0, 10) : "");
const showDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("en-GB", { timeZone: "Asia/Nicosia" }) : "—";

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}

function AdminOrdersPage() {
  const list = useServerFn(adminListOrders);
  const setStatus = useServerFn(adminSetOrderStatus);
  const fulfil = useServerFn(adminFulfilItem);
  const setOrderDates = useServerFn(adminSetOrderDates);
  const setItemDue = useServerFn(adminSetItemDueDate);
  const uploadDocument = useServerFn(adminUploadItemDocument);
  const documentUrl = useServerFn(adminDocumentUrl);
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [notify, setNotify] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const query = useQuery({ queryKey: ["admin", "orders"], queryFn: () => list() });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });

  const statusMutation = useMutation({
    mutationFn: (input: { reference: string; status: string }) => setStatus({ data: input }),
    onSuccess: invalidate,
  });

  const datesMutation = useMutation({
    mutationFn: (input: { reference: string; dueDate?: string | null; deliveredAt?: string | null }) =>
      setOrderDates({ data: input }),
    onSuccess: () => {
      setMessage("Order dates saved.");
      void invalidate();
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Could not save dates"),
  });

  const itemDueMutation = useMutation({
    mutationFn: (input: { itemId: string; dueDate?: string | null }) => setItemDue({ data: input }),
    onSuccess: invalidate,
  });

  const uploadMutation = useMutation({
    mutationFn: async (input: { itemId: string; file: File }) => {
      const base64 = await fileToBase64(input.file);
      return uploadDocument({
        data: {
          itemId: input.itemId,
          fileName: input.file.name,
          contentType: input.file.type || "application/octet-stream",
          base64,
          notify,
        },
      });
    },
    onSuccess: (result) => {
      setMessage(
        result.notified
          ? `Uploaded ${result.documentName} — the client has been emailed.`
          : `Uploaded ${result.documentName}.`,
      );
      void invalidate();
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Upload failed"),
    onSettled: () => setUploadingId(null),
  });

  const openDocument = async (path: string) => {
    try {
      const { url } = await documentUrl({ data: { path } });
      window.open(url, "_blank", "noopener");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not open the document");
    }
  };

  const fulfilMutation = useMutation({
    mutationFn: (itemId: string) => fulfil({ data: { itemId } }),
    onSuccess: (result) => {
      setMessage(result.ok ? "Report retrieved from API4ALL." : `Failed: ${result.message}`);
      void invalidate();
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Fulfilment failed"),
  });


  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Confirm payment and pull Structure / Credit reports from API4ALL.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link to="/admin/users">Users</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/usage">Usage</Link>
          </Button>
          <Button variant="outline" onClick={() => void invalidate()}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
        </div>
      </div>

      {message && <p className="mt-4 rounded-md border bg-card p-3 text-sm">{message}</p>}

      {query.isLoading && (
        <p className="mt-10 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading orders…
        </p>
      )}

      <div className="mt-8 space-y-6">
        {(query.data?.orders ?? []).map((order) => (
          <div key={order.id} className="rounded-xl border bg-card p-5 shadow-panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono font-semibold">{order.reference}</p>
                <p className="text-sm text-muted-foreground">
                  {order.full_name} · {order.email}
                  {order.firm ? ` · ${order.firm}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleString("en-GB")} · {euros(order.total_cents)} incl. VAT
                </p>
              </div>
              <select
                value={order.status}
                onChange={(event) =>
                  statusMutation.mutate({ reference: order.reference, status: event.target.value })
                }
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            {order.notes && <p className="mt-3 rounded-md bg-muted/40 p-3 text-sm">{order.notes}</p>}

            <ul className="mt-4 space-y-2">
              {(order.order_items ?? []).map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">
                      {item.product_name}
                      {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.company_name ?? "—"}
                      {item.company_number ? ` · ${item.company_number}` : ""} · {item.fulfilment_status}
                      {item.fulfilment_message ? ` · ${item.fulfilment_message}` : ""}
                    </p>
                  </div>
                  {item.a4a_kind && item.fulfilment_status !== "delivered" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={fulfilMutation.isPending}
                      onClick={() => fulfilMutation.mutate(item.id)}
                    >
                      {fulfilMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                      Fetch {item.a4a_kind} report
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {query.data && query.data.orders.length === 0 && (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        )}
      </div>
    </div>
  );
}
