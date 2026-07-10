"use client";

import {
  type LucideIcon,
  MessageCircle,
  Minus,
  Plus,
  Ruler,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useCart } from "@/components/cart/cart-provider";
import { MeasurementFigure } from "@/components/product/measurement-figure";
import { formatPrice, whatsappSupportLink } from "@/config/site";
import { getProductPrice } from "@/lib/commerce";
import type {
  CustomMeasurements,
  FitPreference,
  Product,
  StoreSettings,
} from "@/types/commerce";

type MeasurementDraft = Record<
  "shoulder" | "bust" | "waist" | "hips" | "outfitLength" | "sleeveLength" | "height",
  string
>;

const initialMeasurements: MeasurementDraft = {
  shoulder: "",
  bust: "",
  waist: "",
  hips: "",
  outfitLength: "",
  sleeveLength: "",
  height: "",
};

const measurementFields: Array<{
  key: keyof MeasurementDraft;
  label: string;
  hint: string;
  required?: boolean;
}> = [
  { key: "shoulder", label: "Shoulder", hint: "Back, edge to edge", required: true },
  { key: "bust", label: "Bust", hint: "Around the fullest part", required: true },
  { key: "waist", label: "Waist", hint: "Around the natural waist", required: true },
  { key: "hips", label: "Hips", hint: "Around the fullest part", required: true },
  { key: "outfitLength", label: "Outfit length", hint: "Shoulder to desired hem", required: true },
  { key: "sleeveLength", label: "Sleeve length", hint: "Shoulder point to cuff" },
  { key: "height", label: "Your height", hint: "Barefoot, head to floor" },
];

export function ProductPurchase({
  product,
  supportNumber,
  settings,
}: {
  product: Product;
  supportNumber: string;
  settings: StoreSettings;
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const size = "Custom Size";
  const [quantity, setQuantity] = useState(1);
  const [measurements, setMeasurements] = useState(initialMeasurements);
  const [fitPreference, setFitPreference] = useState<FitPreference>("regular");
  const [measurementNotes, setMeasurementNotes] = useState("");
  const [measurementsConfirmed, setMeasurementsConfirmed] = useState(false);
  const price = getProductPrice(product);
  const soldOut = product.stock < 1;
  const whatsappHref = whatsappSupportLink(
    supportNumber,
    `Hello DARAJNI, I need measurement help for ${product.name}.`,
  );
  const trustItems: Array<[string, LucideIcon]> = [
    ["Secure payment", ShieldCheck],
    [settings.codEnabled ? "COD after pincode check" : "Online payment", ShoppingBag],
    ["Exchange policy", Ruler],
    [
      settings.shippingCharge > 0
        ? `${formatPrice(settings.shippingCharge)} shipping`
        : "Free shipping",
      Truck,
    ],
  ];

  const buildMeasurements = (): CustomMeasurements | null => {
    const values = Object.fromEntries(
      Object.entries(measurements).map(([key, value]) => [
        key,
        value.trim() ? Number(value) : undefined,
      ]),
    ) as Record<keyof MeasurementDraft, number | undefined>;

    if (
      !values.shoulder ||
      !values.bust ||
      !values.waist ||
      !values.hips ||
      !values.outfitLength ||
      !measurementsConfirmed
    ) {
      toast.error("Enter the five required measurements and confirm them.");
      return null;
    }

    return {
      unit: "in",
      shoulder: values.shoulder,
      bust: values.bust,
      waist: values.waist,
      hips: values.hips,
      outfitLength: values.outfitLength,
      sleeveLength: values.sleeveLength,
      height: values.height,
      fitPreference,
      notes: measurementNotes.trim() || undefined,
      customerConfirmed: true,
    };
  };

  const add = () => {
    const customMeasurements = buildMeasurements();
    if (!customMeasurements) return false;
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images[0] || "/logo.webp",
      size,
      quantity,
      unitPrice: price,
      stock: product.stock,
      measurements: customMeasurements,
    });
    toast.success(`${product.name} added to your cart`);
    return true;
  };

  const buyNow = () => {
    if (add()) router.push("/checkout");
  };

  return (
    <div>
      <div className="rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F6E9DD] text-[#B8893B]">
            <Ruler className="h-5 w-5" />
          </span>
          <div>
            <p className="eyebrow">Custom size ordering</p>
            <h2 className="font-display mt-2 text-3xl leading-none text-[#171717]">
              Your size. Your fit. Made just for you.
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#6F6255]">
              This design is made to your measurements. Measure in inches over
              fitted clothing, keep the tape level and comfortable, and check
              every number twice before confirming.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="inline-flex min-h-10 items-center rounded-xl border border-[#111111] bg-[#111111] px-4 text-xs font-extrabold text-white">
            Custom Size
          </span>
          <Link href="/size-guide" className="secondary-button !min-h-10 !py-2">
            Open Size Guide
          </Link>
          <a href={whatsappHref} className="whatsapp-button !min-h-10 !py-2">
            WhatsApp Measurement Help
          </a>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[0.82fr_1.18fr]">
          <MeasurementFigure className="!min-h-[25rem]" />
          <div>
            <div className="grid gap-4 sm:grid-cols-2">
              {measurementFields.map((field) => (
                <div key={field.key}>
                  <label htmlFor={`measurement-${field.key}`} className="field-label">
                    {field.label} {field.required ? "*" : "(optional)"}
                  </label>
                  <div className="relative">
                    <input
                      id={`measurement-${field.key}`}
                      type="number"
                      min="1"
                      max="90"
                      step="0.25"
                      inputMode="decimal"
                      value={measurements[field.key]}
                      onChange={(event) =>
                        setMeasurements((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                      className="field !pr-12"
                      required={field.required}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6F6255]">
                      in
                    </span>
                  </div>
                  <p className="mt-1 text-[0.68rem] text-[#6F6255]">{field.hint}</p>
                </div>
              ))}
              <div>
                <label htmlFor="measurement-fit" className="field-label">Fit preference</label>
                <select
                  id="measurement-fit"
                  value={fitPreference}
                  onChange={(event) => setFitPreference(event.target.value as FitPreference)}
                  className="field"
                >
                  <option value="close">Close fit</option>
                  <option value="regular">Regular fit</option>
                  <option value="relaxed">Relaxed fit</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="measurement-notes" className="field-label">Tailoring notes (optional)</label>
                <textarea
                  id="measurement-notes"
                  value={measurementNotes}
                  onChange={(event) => setMeasurementNotes(event.target.value)}
                  maxLength={500}
                  className="field min-h-20 resize-y"
                  placeholder="Neck depth, sleeve style, comfort or mobility notes"
                />
              </div>
            </div>
            <label className="mt-4 flex items-start gap-3 rounded-xl border border-[#B8893B]/35 bg-[#F6E9DD] p-4 text-xs leading-5 text-[#5F5348]">
              <input
                type="checkbox"
                checked={measurementsConfirmed}
                onChange={(event) => setMeasurementsConfirmed(event.target.checked)}
                className="mt-0.5 accent-[#B8893B]"
              />
              I measured in inches, checked each number twice, and understand
              the tailoring team will confirm these details before cutting.
            </label>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <span className="field-label">Quantity</span>
        <div className="flex w-fit items-center rounded-xl border border-[#E9DCCB] bg-[#FFFDF8]">
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            className="grid h-11 w-11 place-items-center text-[#5F5348]"
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-10 text-center text-sm font-semibold">{quantity}</span>
          <button
            type="button"
            onClick={() =>
              setQuantity((value) => Math.min(product.stock, value + 1))
            }
            className="grid h-11 w-11 place-items-center text-[#5F5348]"
            aria-label="Increase quantity"
            disabled={quantity >= product.stock}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-3">
        <button
          type="button"
          onClick={buyNow}
          disabled={soldOut}
          className="primary-button w-full"
        >
          <Zap className="h-4 w-4" />
          Buy Now
        </button>
        <button
          type="button"
          onClick={add}
          disabled={soldOut}
          className="secondary-button w-full"
        >
          <ShoppingBag className="h-4 w-4" />
          Add to Cart
        </button>
        <a href={whatsappHref} className="whatsapp-button w-full">
          <MessageCircle className="h-4 w-4" />
          Chat on WhatsApp
        </a>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 text-[0.68rem] font-bold text-[#6F6255] sm:grid-cols-4">
        {trustItems.map(([label, Icon]) => (
          <span key={label} className="flex items-center gap-2 rounded-xl bg-[#F6E9DD] p-2">
            <Icon className="h-3.5 w-3.5 text-[#B8893B]" />
            {label}
          </span>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-[#6F6255]">
        {soldOut
          ? "This product is currently sold out."
          : `${product.stock} available · ${formatPrice(price * quantity)} total`}
      </p>

      {!soldOut && (
        <div className="fixed inset-x-0 bottom-[3.85rem] z-[45] border-t border-[#E9DCCB] bg-[#FFFDF8]/96 p-3 shadow-[0_-12px_35px_rgba(83,54,22,0.12)] backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.65rem] font-bold uppercase text-[#6F6255]">
                {size} · Qty {quantity}
              </p>
              <p className="font-display text-xl font-semibold text-[#171717]">
                {formatPrice(price * quantity)}
              </p>
            </div>
            <button type="button" onClick={add} className="primary-button !min-h-11 shrink-0">
              <ShoppingBag className="h-4 w-4" />
              Add to cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
