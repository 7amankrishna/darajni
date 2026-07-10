"use client";

import {
  Ban,
  Check,
  Eye,
  FileText,
  Package,
  Printer,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/config/site";
import { formatDate } from "@/lib/commerce";
import type { AdminOrder } from "@/types/admin";
import type { OrderStatus } from "@/types/database";

const statusStyle: Record<OrderStatus, string> = {
  pending: "bg-amber-400/10 text-amber-200",
  confirmed: "bg-blue-400/10 text-blue-200",
  packed: "bg-violet-400/10 text-violet-200",
  shipped: "bg-cyan-400/10 text-cyan-200",
  delivered: "bg-emerald-400/10 text-emerald-200",
  cancelled: "bg-red-400/10 text-red-200",
};

const actions: Partial<
  Record<
    OrderStatus,
    Array<{
      status: OrderStatus;
      label: string;
      icon: typeof Check;
      danger?: boolean;
    }>
  >
> = {
  pending: [
    { status: "confirmed", label: "Confirm", icon: Check },
    { status: "cancelled", label: "Cancel", icon: Ban, danger: true },
  ],
  confirmed: [
    { status: "packed", label: "Pack", icon: Package },
    { status: "cancelled", label: "Cancel", icon: Ban, danger: true },
  ],
  packed: [
    { status: "shipped", label: "Ship", icon: Truck },
    { status: "cancelled", label: "Cancel", icon: Ban, danger: true },
  ],
  shipped: [{ status: "delivered", label: "Deliver", icon: Check }],
};

export function OrderManagement({ orders }: { orders: AdminOrder[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [filter, setFilter] = useState<"active" | OrderStatus>("active");
  const [busy, setBusy] = useState("");
  const visible = useMemo(
    () =>
      orders.filter((order) =>
        filter === "active"
          ? !["delivered", "cancelled"].includes(order.status)
          : order.status === filter,
      ),
    [filter, orders],
  );

  const updateStatus = async (order: AdminOrder, status: OrderStatus) => {
    if (
      status === "cancelled" &&
      !window.confirm(`Cancel order ${order.orderNumber}?`)
    ) {
      return;
    }
    setBusy(`${order.id}:${status}`);
    const response = await fetch(`/api/admin/orders/${order.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentStatus: order.status, status }),
    });
    const result = (await response.json()) as { error?: string };
    setBusy("");
    if (!response.ok) {
      toast.error(result.error || "The order could not be updated.");
      return;
    }
    toast.success(`Order marked ${status}.`);
    setSelected(null);
    router.refresh();
  };

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="eyebrow">Order management</p>
          <h2 className="font-display mt-2 text-4xl">Active orders</h2>
        </div>
        <select
          value={filter}
          onChange={(event) =>
            setFilter(event.target.value as "active" | OrderStatus)
          }
          className="field !w-auto"
          aria-label="Filter orders"
        >
          <option value="active">All active</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="packed">Packed</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="glass-panel mt-6 overflow-hidden">
        {visible.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Placed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-semibold text-[#D9B56B]">
                    {order.orderNumber}
                  </TableCell>
                  <TableCell>
                    <p>{order.customerName}</p>
                    <p className="mt-1 text-xs text-white/75">{order.phone}</p>
                  </TableCell>
                  <TableCell>{formatPrice(order.total)}</TableCell>
                  <TableCell>
                    <span className={`status-pill ${statusStyle[order.status]}`}>
                      {order.status}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(order.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setSelected(order)}
                        className="grid h-9 w-9 place-items-center rounded-full border border-white/10 hover:border-[#B8893B]/50"
                        aria-label={`View ${order.orderNumber}`}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {(actions[order.status] ?? []).map((action) => {
                        const Icon = action.icon;
                        return (
                          <button
                            type="button"
                            key={action.status}
                            disabled={busy === `${order.id}:${action.status}`}
                            onClick={() => void updateStatus(order, action.status)}
                            className={`inline-flex h-9 items-center gap-1 rounded-full border px-3 text-xs font-semibold ${
                              action.danger
                                ? "border-red-400/25 text-red-200"
                                : "border-[#B8893B]/35 text-[#D9B56B]"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {action.label}
                          </button>
                        );
                      })}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="py-16 text-center text-sm text-white/75">
            No orders match this status.
          </p>
        )}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        {selected && (
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selected.orderNumber}</DialogTitle>
              <DialogDescription>
                Placed {formatDate(selected.createdAt)} · {selected.paymentMethod.toUpperCase()} ·{" "}
                {selected.paymentStatus}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 sm:grid-cols-2">
              <section className="rounded-xl border border-white/9 p-4">
                <p className="field-label">Customer</p>
                <p className="font-semibold">{selected.customerName}</p>
                <p className="mt-2 text-sm text-white/55">{selected.phone}</p>
                {selected.email && (
                  <p className="mt-1 text-sm text-white/55">{selected.email}</p>
                )}
              </section>
              <section className="rounded-xl border border-white/9 p-4">
                <p className="field-label">Delivery address</p>
                <p className="text-sm leading-6 text-white/65">
                  {selected.address}, {selected.city}, {selected.state} {selected.pincode}
                  {selected.landmark ? ` · ${selected.landmark}` : ""}
                </p>
              </section>
            </div>
            <section className="rounded-xl border border-white/9">
              <div className="divide-y divide-white/8">
                {selected.items.map((item) => (
                  <div key={item.id} className="flex justify-between gap-4 p-4">
                    <div>
                      <p className="font-semibold">{item.productName}</p>
                      <p className="mt-1 text-xs text-white/75">
                        Size {item.selectedSize} · Qty {item.quantity}
                      </p>
                    </div>
                    <p className="text-[#D9B56B]">{formatPrice(item.lineTotal)}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/9 p-4 text-right">
                <div className="ml-auto mb-4 max-w-xs space-y-2 text-sm">
                  <div className="flex justify-between text-white/50">
                    <span>Subtotal</span>
                    <span>{formatPrice(selected.subtotal)}</span>
                  </div>
                  {selected.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-200">
                      <span>
                        Promo
                        {selected.promoCode ? ` (${selected.promoCode})` : ""}
                      </span>
                      <span>-{formatPrice(selected.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-white/50">
                    <span>Shipping</span>
                    <span>{formatPrice(selected.shippingFee)}</span>
                  </div>
                  <div className="flex justify-between text-white/50">
                    <span>Tax</span>
                    <span>{formatPrice(selected.taxAmount)}</span>
                  </div>
                </div>
                <p className="font-display text-2xl text-[#D9B56B]">
                  {formatPrice(selected.total)}
                </p>
              </div>
            </section>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/admin/orders/${selected.id}/invoice`}
                target="_blank"
                className="secondary-button"
              >
                <FileText className="h-4 w-4" />
                Invoice
              </Link>
              <Link
                href={`/admin/orders/${selected.id}/packing-slip`}
                target="_blank"
                className="secondary-button"
              >
                <Printer className="h-4 w-4" />
                Packing slip
              </Link>
              {(actions[selected.status] ?? []).map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    type="button"
                    key={action.status}
                    onClick={() => void updateStatus(selected, action.status)}
                    className={action.danger ? "danger-button" : "primary-button"}
                  >
                    <Icon className="h-4 w-4" />
                    {action.label}
                  </button>
                );
              })}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
