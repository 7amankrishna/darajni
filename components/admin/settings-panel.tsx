"use client";

import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

import type { StoreSettings } from "@/types/commerce";

export function SettingsPanel({ settings }: { settings: StoreSettings }) {
  const router = useRouter();
  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const response = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const result = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      toast.error(result.error || "Settings could not be saved.");
      return;
    }
    toast.success("Store settings updated.");
    router.refresh();
  };

  return (
    <form onSubmit={save} className="max-w-3xl">
      <p className="eyebrow">Store configuration</p>
      <h2 className="font-display mt-2 text-4xl">Settings</h2>
      <div className="glass-panel mt-6 grid gap-5 p-6 sm:grid-cols-2">
        <div>
          <label htmlFor="shipping-charge" className="field-label">
            Shipping charge
          </label>
          <input
            id="shipping-charge"
            type="number"
            min="0"
            step="0.01"
            value={draft.shippingCharge}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                shippingCharge: Number(event.target.value),
              }))
            }
            className="field"
            required
          />
        </div>
        <div>
          <label htmlFor="tax-rate" className="field-label">
            Tax rate %
          </label>
          <input
            id="tax-rate"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={draft.taxRate}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                taxRate: Number(event.target.value),
              }))
            }
            className="field"
            required
          />
        </div>
        <div>
          <label htmlFor="developer-number" className="field-label">
            Developer support WhatsApp
          </label>
          <input
            id="developer-number"
            inputMode="numeric"
            value={draft.developerSupportNumber}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                developerSupportNumber: event.target.value.replace(/\D/g, ""),
              }))
            }
            className="field"
            maxLength={20}
          />
        </div>
        <div>
          <label htmlFor="designer-number" className="field-label">
            Designer support WhatsApp
          </label>
          <input
            id="designer-number"
            inputMode="numeric"
            value={draft.designerSupportNumber}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                designerSupportNumber: event.target.value.replace(/\D/g, ""),
              }))
            }
            className="field"
            maxLength={20}
          />
        </div>
        <label className="sm:col-span-2 flex items-center justify-between rounded-xl border border-white/9 p-4">
          <div>
            <p className="text-sm font-semibold">Cash on delivery</p>
            <p className="mt-1 text-xs text-white/75">
              Allow customers to select COD during checkout.
            </p>
          </div>
          <input
            type="checkbox"
            checked={draft.codEnabled}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                codEnabled: event.target.checked,
              }))
            }
            className="h-5 w-5 accent-[#C8A97E]"
          />
        </label>
        <button type="submit" disabled={saving} className="primary-button sm:col-span-2">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save settings
            </>
          )}
        </button>
      </div>
    </form>
  );
}
