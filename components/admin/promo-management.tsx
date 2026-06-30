"use client";

import { Loader2, Pencil, Plus, Power, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPrice } from "@/config/site";
import { formatDate } from "@/lib/commerce";
import type { AdminPromoCode } from "@/types/admin";

interface PromoDraft {
  code: string;
  title: string;
  description: string;
  codeType: "coupon" | "voucher";
  discountType: "percentage" | "fixed_amount";
  discountValue: string;
  minimumSubtotal: string;
  maximumDiscount: string;
  usageLimit: string;
  perPhoneLimit: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

function normalizeCode(value: string) {
  return value.toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9_-]/g, "");
}

function toDateInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function fromDateInput(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function blankDraft(): PromoDraft {
  return {
    code: "",
    title: "",
    description: "",
    codeType: "coupon",
    discountType: "percentage",
    discountValue: "10",
    minimumSubtotal: "0",
    maximumDiscount: "",
    usageLimit: "",
    perPhoneLimit: "1",
    startsAt: "",
    endsAt: "",
    isActive: true,
  };
}

function fromPromo(promo: AdminPromoCode): PromoDraft {
  return {
    code: promo.code,
    title: promo.title,
    description: promo.description ?? "",
    codeType: promo.codeType,
    discountType: promo.discountType,
    discountValue: String(promo.discountValue),
    minimumSubtotal: String(promo.minimumSubtotal),
    maximumDiscount: promo.maximumDiscount === null ? "" : String(promo.maximumDiscount),
    usageLimit: promo.usageLimit === null ? "" : String(promo.usageLimit),
    perPhoneLimit: String(promo.perPhoneLimit),
    startsAt: toDateInput(promo.startsAt),
    endsAt: toDateInput(promo.endsAt),
    isActive: promo.isActive,
  };
}

function discountLabel(promo: AdminPromoCode) {
  if (promo.discountType === "percentage") {
    return `${promo.discountValue}% off${
      promo.maximumDiscount ? ` up to ${formatPrice(promo.maximumDiscount)}` : ""
    }`;
  }
  return `${formatPrice(promo.discountValue)} off`;
}

export function PromoManagement({ promos }: { promos: AdminPromoCode[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPromoCode | null>(null);
  const [draft, setDraft] = useState<PromoDraft>(blankDraft());
  const [saving, setSaving] = useState(false);

  const createPromo = () => {
    setEditing(null);
    setDraft(blankDraft());
    setOpen(true);
  };

  const editPromo = (promo: AdminPromoCode) => {
    setEditing(promo);
    setDraft(fromPromo(promo));
    setOpen(true);
  };

  const setField = <K extends keyof PromoDraft>(
    key: K,
    value: PromoDraft[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const payload = () => ({
    code: normalizeCode(draft.code),
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    codeType: draft.codeType,
    discountType: draft.discountType,
    discountValue: Number(draft.discountValue),
    minimumSubtotal: Number(draft.minimumSubtotal || 0),
    maximumDiscount: draft.maximumDiscount ? Number(draft.maximumDiscount) : null,
    usageLimit: draft.usageLimit ? Number(draft.usageLimit) : null,
    perPhoneLimit: Number(draft.perPhoneLimit || 1),
    startsAt: fromDateInput(draft.startsAt),
    endsAt: fromDateInput(draft.endsAt),
    isActive: draft.isActive,
  });

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const response = await fetch(
      editing ? `/api/admin/promos/${editing.id}` : "/api/admin/promos",
      {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
      },
    );
    const result = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      toast.error(result.error || "The promo code could not be saved.");
      return;
    }
    toast.success(editing ? "Promo code updated." : "Promo code created.");
    setOpen(false);
    router.refresh();
  };

  const deactivate = async (promo: AdminPromoCode) => {
    if (!window.confirm(`Deactivate ${promo.code}?`)) return;
    const response = await fetch(`/api/admin/promos/${promo.id}`, {
      method: "DELETE",
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      toast.error(result.error || "The promo code could not be deactivated.");
      return;
    }
    toast.success("Promo code deactivated.");
    router.refresh();
  };

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Coupons & vouchers</p>
          <h2 className="font-display mt-2 text-4xl">Promo codes</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/40">
            Create order-wide coupons and fixed-value vouchers. Checkout always
            recalculates discounts in PostgreSQL before an order is accepted.
          </p>
        </div>
        <button type="button" onClick={createPromo} className="primary-button">
          <Plus className="h-4 w-4" />
          Add code
        </button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {promos.map((promo) => (
          <article key={promo.id} className="glass-panel p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#caaa70]/35 bg-[#caaa70]/8 px-3 py-1 font-mono text-xs font-bold text-[#dfc184]">
                    {promo.code}
                  </span>
                  <span
                    className={`status-pill ${
                      promo.isActive
                        ? "bg-emerald-400/12 text-emerald-200"
                        : "bg-white/10 text-white/45"
                    }`}
                  >
                    {promo.isActive ? "Active" : "Inactive"}
                  </span>
                  <span className="status-pill bg-white/8 text-white/55">
                    {promo.codeType}
                  </span>
                </div>
                <h3 className="font-display mt-4 text-2xl">{promo.title}</h3>
                <p className="mt-2 text-sm text-[#dfc184]">
                  {discountLabel(promo)}
                </p>
                {promo.description && (
                  <p className="mt-2 text-xs leading-5 text-white/38">
                    {promo.description}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => editPromo(promo)}
                  className="grid h-9 w-9 place-items-center rounded-full border border-white/10 hover:border-[#caaa70]/50"
                  aria-label={`Edit ${promo.code}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                {promo.isActive && (
                  <button
                    type="button"
                    onClick={() => void deactivate(promo)}
                    className="grid h-9 w-9 place-items-center rounded-full border border-red-400/20 text-red-200"
                    aria-label={`Deactivate ${promo.code}`}
                  >
                    <Power className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="mt-5 grid gap-3 text-xs text-white/42 sm:grid-cols-3">
              <p>
                Minimum
                <span className="mt-1 block text-sm text-white/70">
                  {formatPrice(promo.minimumSubtotal)}
                </span>
              </p>
              <p>
                Uses
                <span className="mt-1 block text-sm text-white/70">
                  {promo.redemptionCount}
                  {promo.usageLimit ? ` / ${promo.usageLimit}` : ""}
                </span>
              </p>
              <p>
                Saved
                <span className="mt-1 block text-sm text-white/70">
                  {formatPrice(promo.redeemedAmount)}
                </span>
              </p>
            </div>
            <div className="mt-4 text-xs leading-5 text-white/35">
              {promo.startsAt || promo.endsAt ? (
                <p>
                  Window: {promo.startsAt ? formatDate(promo.startsAt) : "now"} –{" "}
                  {promo.endsAt ? formatDate(promo.endsAt) : "no end"}
                </p>
              ) : (
                <p>No scheduled start or end date.</p>
              )}
              <p>Per phone limit: {promo.perPhoneLimit}</p>
            </div>
          </article>
        ))}
        {!promos.length && (
          <div className="glass-panel grid min-h-64 place-items-center p-8 text-center lg:col-span-2">
            <div>
              <Tag className="mx-auto h-9 w-9 text-[#caaa70]" />
              <h3 className="font-display mt-4 text-3xl">No promo codes yet.</h3>
              <p className="mt-3 text-sm text-white/38">
                Add a coupon or voucher after running the Stage 5 SQL migration.
              </p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit promo code" : "Create promo code"}
            </DialogTitle>
            <DialogDescription>
              Codes are case-insensitive for shoppers and stored uppercase.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="promo-code" className="field-label">
                Code
              </label>
              <input
                id="promo-code"
                value={draft.code}
                onChange={(event) => setField("code", normalizeCode(event.target.value))}
                className="field font-mono uppercase"
                placeholder="DARAJNI10"
                minLength={3}
                maxLength={32}
                required
              />
            </div>
            <div>
              <label htmlFor="promo-title" className="field-label">
                Internal title
              </label>
              <input
                id="promo-title"
                value={draft.title}
                onChange={(event) => setField("title", event.target.value)}
                className="field"
                minLength={2}
                maxLength={100}
                required
              />
            </div>
            <div>
              <label htmlFor="promo-kind" className="field-label">
                Type
              </label>
              <select
                id="promo-kind"
                value={draft.codeType}
                onChange={(event) =>
                  setField("codeType", event.target.value as PromoDraft["codeType"])
                }
                className="field"
              >
                <option value="coupon">Coupon</option>
                <option value="voucher">Voucher</option>
              </select>
            </div>
            <div>
              <label htmlFor="promo-discount-type" className="field-label">
                Discount
              </label>
              <select
                id="promo-discount-type"
                value={draft.discountType}
                onChange={(event) =>
                  setField(
                    "discountType",
                    event.target.value as PromoDraft["discountType"],
                  )
                }
                className="field"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed_amount">Fixed amount</option>
              </select>
            </div>
            <div>
              <label htmlFor="promo-value" className="field-label">
                Discount value
              </label>
              <input
                id="promo-value"
                type="number"
                min="0.01"
                max={draft.discountType === "percentage" ? 100 : undefined}
                step="0.01"
                value={draft.discountValue}
                onChange={(event) => setField("discountValue", event.target.value)}
                className="field"
                required
              />
            </div>
            <div>
              <label htmlFor="promo-minimum" className="field-label">
                Minimum subtotal
              </label>
              <input
                id="promo-minimum"
                type="number"
                min="0"
                step="0.01"
                value={draft.minimumSubtotal}
                onChange={(event) => setField("minimumSubtotal", event.target.value)}
                className="field"
                required
              />
            </div>
            <div>
              <label htmlFor="promo-max" className="field-label">
                Max discount optional
              </label>
              <input
                id="promo-max"
                type="number"
                min="0.01"
                step="0.01"
                value={draft.maximumDiscount}
                onChange={(event) => setField("maximumDiscount", event.target.value)}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="promo-usage" className="field-label">
                Total usage limit optional
              </label>
              <input
                id="promo-usage"
                type="number"
                min="1"
                step="1"
                value={draft.usageLimit}
                onChange={(event) => setField("usageLimit", event.target.value)}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="promo-phone-limit" className="field-label">
                Per-phone limit
              </label>
              <input
                id="promo-phone-limit"
                type="number"
                min="1"
                step="1"
                value={draft.perPhoneLimit}
                onChange={(event) => setField("perPhoneLimit", event.target.value)}
                className="field"
                required
              />
            </div>
            <div>
              <label htmlFor="promo-start" className="field-label">
                Starts at optional
              </label>
              <input
                id="promo-start"
                type="datetime-local"
                value={draft.startsAt}
                onChange={(event) => setField("startsAt", event.target.value)}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="promo-end" className="field-label">
                Ends at optional
              </label>
              <input
                id="promo-end"
                type="datetime-local"
                value={draft.endsAt}
                onChange={(event) => setField("endsAt", event.target.value)}
                className="field"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="promo-description" className="field-label">
                Description optional
              </label>
              <textarea
                id="promo-description"
                value={draft.description}
                onChange={(event) => setField("description", event.target.value)}
                className="field min-h-24 resize-y"
                maxLength={300}
              />
            </div>
            <label className="sm:col-span-2 flex items-center justify-between rounded-xl border border-white/9 p-4">
              <div>
                <p className="text-sm font-semibold">Active</p>
                <p className="mt-1 text-xs text-white/38">
                  Inactive codes cannot be applied at checkout.
                </p>
              </div>
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(event) => setField("isActive", event.target.checked)}
                className="h-5 w-5 accent-[#caaa70]"
              />
            </label>
            <button type="submit" disabled={saving} className="primary-button sm:col-span-2">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : editing ? (
                "Save promo code"
              ) : (
                "Create promo code"
              )}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
