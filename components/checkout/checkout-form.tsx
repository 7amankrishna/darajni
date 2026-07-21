"use client";

import {
  CreditCard,
  Loader2,
  MessageCircle,
  PackageCheck,
  Ruler,
  Tag,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { useCart } from "@/components/cart/cart-provider";
import { ProductImage } from "@/components/product/product-image";
import { formatPrice } from "@/config/site";
import type {
  CheckoutCustomer,
  CheckoutPromoQuote,
  CustomerProfile,
  StoreSettings,
} from "@/types/commerce";

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
    };
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name: string;
    email?: string;
    contact: string;
  };
  theme: { color: string };
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void | Promise<void>;
  modal: { ondismiss: () => void };
}

const initialCustomer: CheckoutCustomer = {
  customerName: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  landmark: "",
  email: "",
};

function customerFromProfile(
  profile?: CustomerProfile | null,
): CheckoutCustomer {
  if (!profile) return initialCustomer;
  return {
    customerName: profile.fullName,
    phone: profile.phone,
    address: profile.address,
    city: profile.city,
    state: profile.state,
    pincode: profile.pincode,
    landmark: profile.landmark,
    email: profile.email,
  };
}

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function CheckoutForm({
  settings,
  customerProfile,
}: {
  settings: StoreSettings;
  customerProfile?: CustomerProfile | null;
}) {
  const router = useRouter();
  const { items, ready, subtotal, clearCart } = useCart();
  const [customer, setCustomer] = useState<CheckoutCustomer>(() =>
    customerFromProfile(customerProfile),
  );
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "razorpay">(
    settings.codEnabled ? "cod" : "razorpay",
  );
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<CheckoutPromoQuote | null>(
    null,
  );
  const [promoBusy, setPromoBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(true);
  const [needsMeasurementHelp, setNeedsMeasurementHelp] = useState(false);

  const cartSignature = useMemo(
    () =>
      items
        .map((item) => `${item.productId}:${item.size}:${item.quantity}`)
        .sort()
        .join("|"),
    [items],
  );
  useEffect(() => {
    setAppliedPromo(null);
  }, [cartSignature]);

  const totals = useMemo(() => {
    const shipping = items.length ? settings.shippingCharge : 0;
    const discount = Math.min(appliedPromo?.discountAmount ?? 0, subtotal);
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const tax =
      Math.round(discountedSubtotal * (settings.taxRate / 100) * 100) / 100;
    return {
      shipping,
      discount,
      discountedSubtotal,
      tax,
      total: discountedSubtotal + shipping + tax,
    };
  }, [
    appliedPromo?.discountAmount,
    items.length,
    settings.shippingCharge,
    settings.taxRate,
    subtotal,
  ]);

  const setField = (field: keyof CheckoutCustomer, value: string) => {
    setCustomer((current) => ({ ...current, [field]: value }));
  };

  const cancelReservation = async (token: string, paymentFailed = false) => {
    await fetch("/api/checkout/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, paymentFailed }),
      keepalive: true,
    }).catch(() => undefined);
  };

  const applyPromo = async () => {
    const code = promoInput.trim();
    if (!code || promoBusy) return;

    setPromoBusy(true);
    setError("");
    try {
      const response = await fetch("/api/checkout/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promoCode: code,
          phone: customer.phone || undefined,
          items: items.map((item) => ({
            productId: item.productId,
            size: item.size,
            quantity: item.quantity,
          })),
        }),
      });
      const result = (await response.json()) as
        | CheckoutPromoQuote
        | { error?: string };

      if (!response.ok || !("code" in result)) {
        throw new Error(
          "error" in result && result.error
            ? result.error
            : "This coupon or voucher could not be applied.",
        );
      }

      setAppliedPromo(result);
      setPromoInput(result.code);
    } catch (promoError) {
      setAppliedPromo(null);
      setError(
        promoError instanceof Error
          ? promoError.message
          : "This coupon or voucher could not be applied.",
      );
    } finally {
      setPromoBusy(false);
    }
  };

  const startRazorpay = async (checkout: {
    keyId: string;
    amount: number;
    currency: string;
    storeName: string;
    description: string;
    razorpayOrderId: string;
    token: string;
    customer: { name: string; email?: string; phone: string };
  }) => {
    const loaded = await loadRazorpay();
    if (!loaded || !window.Razorpay) {
      await cancelReservation(checkout.token, true);
      throw new Error("The secure payment window could not be loaded.");
    }

    const razorpay = new window.Razorpay({
      key: checkout.keyId,
      amount: checkout.amount,
      currency: checkout.currency,
      name: checkout.storeName,
      description: checkout.description,
      order_id: checkout.razorpayOrderId,
      prefill: {
        name: checkout.customer.name,
        email: checkout.customer.email,
        contact: checkout.customer.phone,
      },
      theme: { color: "#B8893B" },
      handler: async (response) => {
        setBusy(true);
        const verification = await fetch("/api/payments/razorpay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: checkout.token,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          }),
        });
        const result = (await verification.json()) as {
          successUrl?: string;
          error?: string;
        };
        if (!verification.ok || !result.successUrl) {
          setBusy(false);
          setError(
            result.error ||
              "Payment was received but confirmation is delayed. Contact support with the payment ID.",
          );
          return;
        }
        clearCart();
        router.push(result.successUrl);
      },
      modal: {
        ondismiss: () => {
          void cancelReservation(checkout.token);
          setBusy(false);
          setError("Payment was cancelled. No order was placed.");
        },
      },
    });
    razorpay.open();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!items.length || busy) return;

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer,
          items: items.map((item) => ({
            productId: item.productId,
            size: item.size,
            quantity: item.quantity,
          })),
          paymentMethod,
          promoCode: appliedPromo?.code || "",
        }),
      });
      const result = (await response.json()) as {
        mode?: "cod" | "razorpay";
        successUrl?: string;
        error?: string;
        keyId?: string;
        amount?: number;
        currency?: string;
        storeName?: string;
        description?: string;
        razorpayOrderId?: string;
        token?: string;
        customer?: { name: string; email?: string; phone: string };
      };

      if (!response.ok || !result.mode) {
        throw new Error(result.error || "Checkout could not be completed.");
      }

      if (result.mode === "cod" && result.successUrl) {
        clearCart();
        router.push(result.successUrl);
        return;
      }

      if (
        result.mode === "razorpay" &&
        result.keyId &&
        result.amount &&
        result.currency &&
        result.storeName &&
        result.description &&
        result.razorpayOrderId &&
        result.token &&
        result.customer
      ) {
        await startRazorpay({
          keyId: result.keyId,
          amount: result.amount,
          currency: result.currency,
          storeName: result.storeName,
          description: result.description,
          razorpayOrderId: result.razorpayOrderId,
          token: result.token,
          customer: result.customer,
        });
        return;
      }

      throw new Error("Checkout returned an incomplete payment response.");
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Checkout could not be completed.",
      );
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <main className="grid min-h-[65vh] place-items-center bg-[#FFF8EF]">
        <p className="eyebrow">Preparing checkout...</p>
      </main>
    );
  }

  if (!items.length) {
    return (
      <main className="grid min-h-[65vh] place-items-center bg-[#FFF8EF] px-4 text-center">
        <div>
          <h1 className="font-display text-5xl text-[#171717]">
            Your cart is empty.
          </h1>
          <Link href="/collection" className="primary-button mt-7">
            Shop Collection
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[#FFF8EF] py-12 sm:py-16">
      <form
        onSubmit={submit}
        className="section-shell grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]"
      >
        <div>
          <p className="eyebrow">
            {customerProfile ? "Account checkout" : "Guest checkout"}
          </p>
          <h1 className="font-display mt-3 text-5xl leading-none text-[#171717] sm:text-6xl">
            Place your order securely.
          </h1>
          <p className="mt-4 text-sm leading-7 text-[#6F6255]">
            A guided checkout for contact details, delivery address,
            custom-size support and payment. We use this information only for
            order updates and delivery.
          </p>

          <div className="mt-7 flex flex-col space-x-4 sm:flex-row">
          <div className="flex-1 border-b border-[#E9DCCB] pb-2">
            <span className="text-xs font-extrabold uppercase text-[#B8893B]">1</span>
            <span className="ml-2 text-[0.87rem] font-medium">Details</span>
          </div>
          <span className="mx-2 text-[0.87rem] text-[#5F5348]">→</span>
          <div className="flex-1 border-b border-[#E9DCCB] pb-2">
            <span className="text-xs font-extrabold uppercase text-[#B8893B]">2</span>
            <span className="ml-2 text-[0.87rem] font-medium">Delivery</span>
          </div>
          <span className="mx-2 text-[0.87rem] text-[#5F5348]">→</span>
          <div className="flex-1 border-b border-[#E9DCCB] pb-2">
            <span className="text-xs font-extrabold uppercase text-[#B8893B]">3</span>
            <span className="ml-2 text-[0.87rem] font-medium">Size</span>
          </div>
          <span className="mx-2 text-[0.87rem] text-[#5F5348]">→</span>
          <div className="flex-1 border-b border-[#E9DCCB] pb-2">
            <span className="text-xs font-extrabold uppercase text-[#B8893B]">4</span>
            <span className="ml-2 text-[0.87rem] font-medium">Payment</span>
          </div>
        </div>

          <section className="mt-8 rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-5 shadow-[0_18px_50px_rgba(83,54,22,0.07)] sm:p-7">
            <div className="flex items-center gap-3">
              <UserRound className="h-5 w-5 text-[#B8893B]" />
              <h2 className="font-display text-3xl text-[#171717]">
                Contact details
              </h2>
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="checkout-name" className="field-label">
                  Full name
                </label>
                <input
                  id="checkout-name"
                  value={customer.customerName}
                  onChange={(event) => setField("customerName", event.target.value)}
                  className="field"
                  autoComplete="name"
                  minLength={2}
                  maxLength={100}
                  required
                />
              </div>
              <div>
                <label htmlFor="checkout-phone" className="field-label">
                  Phone number
                </label>
                <input
                  id="checkout-phone"
                  type="tel"
                  value={customer.phone}
                  onChange={(event) => setField("phone", event.target.value)}
                  className="field"
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                  required
                />
              </div>
              <div>
                <label htmlFor="checkout-email" className="field-label">
                  Email <span className="normal-case">(optional)</span>
                </label>
                <input
                  id="checkout-email"
                  type="email"
                  value={customer.email}
                  onChange={(event) => setField("email", event.target.value)}
                  className="field"
                  autoComplete="email"
                  maxLength={254}
                />
              </div>
              <label className="sm:col-span-2 flex items-center gap-2 rounded-xl bg-[#F6E9DD] p-4 text-xs font-semibold text-[#5F5348]">
                <input
                  type="checkbox"
                  checked={whatsappSameAsPhone}
                  onChange={(event) => setWhatsappSameAsPhone(event.target.checked)}
                  className="accent-[#B8893B]"
                />
                WhatsApp number is same as phone number
              </label>
            </div>
            <p className="mt-4 text-xs leading-5 text-[#6F6255]">
              We use this only for order updates, delivery and measurement
              confirmation.
            </p>
          </section>

          <section className="mt-6 rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-5 shadow-[0_18px_50px_rgba(83,54,22,0.07)] sm:p-7">
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-[#B8893B]" />
              <h2 className="font-display text-3xl text-[#171717]">
                Delivery address
              </h2>
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="checkout-pincode" className="field-label">
                  Pincode
                </label>
                <input
                  id="checkout-pincode"
                  inputMode="numeric"
                  pattern="[1-9][0-9]{5}"
                  value={customer.pincode}
                  onChange={(event) => setField("pincode", event.target.value)}
                  className="field"
                  autoComplete="postal-code"
                  maxLength={6}
                  required
                />
              </div>
              <div className="rounded-xl bg-[#F6E9DD] p-4 text-xs leading-5 text-[#5F5348]">
                {customer.pincode.length === 6
                  ? "Delivery estimate will be confirmed after checkout for this pincode."
                  : "Enter pincode to help us confirm delivery timing."}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="checkout-address" className="field-label">
                  Full address
                </label>
                <textarea
                  id="checkout-address"
                  value={customer.address}
                  onChange={(event) => setField("address", event.target.value)}
                  className="field min-h-24 resize-y"
                  autoComplete="street-address"
                  minLength={10}
                  maxLength={300}
                  required
                />
              </div>
              <div>
                <label htmlFor="checkout-city" className="field-label">
                  City
                </label>
                <input
                  id="checkout-city"
                  value={customer.city}
                  onChange={(event) => setField("city", event.target.value)}
                  className="field"
                  autoComplete="address-level2"
                  required
                />
              </div>
              <div>
                <label htmlFor="checkout-state" className="field-label">
                  State
                </label>
                <input
                  id="checkout-state"
                  value={customer.state}
                  onChange={(event) => setField("state", event.target.value)}
                  className="field"
                  autoComplete="address-level1"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="checkout-landmark" className="field-label">
                  Landmark <span className="normal-case">(optional)</span>
                </label>
                <input
                  id="checkout-landmark"
                  value={customer.landmark}
                  onChange={(event) => setField("landmark", event.target.value)}
                  className="field"
                  maxLength={160}
                />
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-5 shadow-[0_18px_50px_rgba(83,54,22,0.07)] sm:p-7">
            <div className="flex items-center gap-3">
              <Ruler className="h-5 w-5 text-[#B8893B]" />
              <h2 className="font-display text-3xl text-[#171717]">
                Size and customization
              </h2>
            </div>
            <div className="mt-5 grid gap-5">
              <div className="rounded-xl border border-[#E9DCCB] bg-[#F6E9DD] p-4">
                <p className="text-xs font-extrabold uppercase text-[#B8893B]">
                  Size option
                </p>
                <p className="mt-2 font-display text-3xl text-[#171717]">
                  Custom
                </p>
                <p className="mt-2 text-sm leading-6 text-[#5F5348]">
                  Measurements are collected after order. You can also share
                  measurement photos or notes with support.
                </p>
              </div>
              <div className="rounded-xl border border-[#E9DCCB] bg-[#FFF8EF] p-4 text-sm leading-6 text-[#5F5348]">
                Share sleeve length, blouse length, fit preference or
                measurement photos through WhatsApp support after checkout so
                the team can confirm them before processing.
              </div>
              <label className="flex items-center gap-2 rounded-xl bg-[#F6E9DD] p-4 text-xs font-semibold text-[#5F5348]">
                <input
                  type="checkbox"
                  checked={needsMeasurementHelp}
                  onChange={(event) => setNeedsMeasurementHelp(event.target.checked)}
                  className="accent-[#B8893B]"
                />
                I need help with measurements
              </label>
              {needsMeasurementHelp && (
                <p className="rounded-xl border border-[#B8893B]/30 bg-[#FFF8EF] p-4 text-xs leading-5 text-[#5F5348]">
                  DARAJNI support will guide you after checkout. Keep a soft
                  measuring tape ready if possible.
                </p>
              )}
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-[#E8E2DA] bg-[#FFFFFF] p-5 shadow-[0_18px_50px_rgba(83,54,22,0.07)] sm:p-7 dark:bg-[#1B1612] dark:border-[#3B3026]">
            <p className="eyebrow">Payment Options</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {settings.codEnabled && (
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cod")}
                  className={`rounded-2xl border p-5 text-left transition ${
                    paymentMethod === "cod"
                      ? "border-[#1E1E1E] bg-[#1E1E1E] text-white dark:border-[#C8A97E] dark:bg-[#C8A97E] dark:text-[#100D0B]"
                      : "border-[#E8E2DA] bg-white text-[#1E1E1E] dark:border-[#3B3026] dark:bg-[#100D0B] dark:text-[#F7EADB]"
                  }`}
                >
                  <Truck className="h-5 w-5 text-[#C8A97E]" />
                  <p className="mt-3 text-sm font-semibold">Cash on Delivery (COD)</p>
                  <p className={`mt-2 text-xs leading-5 ${paymentMethod === "cod" ? "opacity-80" : "text-[#666666] dark:text-[#A89B8C]"}`}>
                    Pay in cash when your custom outfit arrives.
                  </p>
                </button>
              )}
              <button
                type="button"
                onClick={() => setPaymentMethod("razorpay")}
                className={`rounded-2xl border p-5 text-left transition ${
                  paymentMethod === "razorpay"
                    ? "border-[#1E1E1E] bg-[#1E1E1E] text-white dark:border-[#C8A97E] dark:bg-[#C8A97E] dark:text-[#100D0B]"
                    : "border-[#E8E2DA] bg-white text-[#1E1E1E] dark:border-[#3B3026] dark:bg-[#100D0B] dark:text-[#F7EADB]"
                }`}
              >
                <CreditCard className="h-5 w-5 text-[#C8A97E]" />
                <p className="mt-3 text-sm font-semibold">Instant Online Payment</p>
                <p className={`mt-2 text-xs leading-5 ${paymentMethod === "razorpay" ? "opacity-80" : "text-[#666666] dark:text-[#A89B8C]"}`}>
                  UPI (GPay/PhonePe), Credit/Debit Cards, NetBanking via Razorpay.
                </p>
              </button>
            </div>
            
            {/* Authenticity & Accepted Card Logos */}
            <div className="mt-5 pt-4 border-t border-[#E8E2DA] dark:border-[#3B3026]">
              <p className="text-[0.65rem] font-bold uppercase tracking-wider text-[#666666] dark:text-[#A89B8C] mb-2.5">
                Guaranteed Safe &amp; Encrypted Checkout
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-8 items-center justify-center rounded-lg border border-[#E8E2DA] bg-white px-2.5 text-[0.7rem] font-extrabold italic tracking-tight text-[#1A1F71] shadow-sm dark:border-[#3B3026] dark:bg-[#100D0B]">
                  VISA
                </span>
                <span className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-[#E8E2DA] bg-white px-2.5 shadow-sm dark:border-[#3B3026] dark:bg-[#100D0B]">
                  <span className="h-3.5 w-3.5 rounded-full bg-[#EB001B]" />
                  <span className="-ml-2 h-3.5 w-3.5 rounded-full bg-[#F79E1B] opacity-90" />
                </span>
                <span className="inline-flex h-8 items-center justify-center rounded-lg border border-[#E8E2DA] bg-white px-2.5 text-[0.7rem] font-black italic text-[#0066B3] shadow-sm dark:border-[#3B3026] dark:bg-[#100D0B]">
                  RuPay<span className="text-[#F37021]">&gt;</span>
                </span>
                <span className="inline-flex h-8 items-center justify-center rounded-lg border border-[#E8E2DA] bg-[#008276] px-3 text-[0.7rem] font-black tracking-wider text-white shadow-sm">
                  UPI
                </span>
                <span className="inline-flex h-8 items-center justify-center rounded-lg border border-[#E8E2DA] bg-white px-2.5 text-[0.65rem] font-bold text-[#1E1E1E] shadow-sm dark:border-[#3B3026] dark:bg-[#100D0B] dark:text-[#F7EADB]">
                  NetBanking
                </span>
                <span className="inline-flex h-8 items-center justify-center rounded-lg border border-[#C8A97E]/40 bg-[#C8A97E]/10 px-2.5 text-[0.65rem] font-extrabold text-[#C8A97E] shadow-sm">
                  🔒 256-Bit SSL
                </span>
              </div>
            </div>
          </section>
        </div>

        <aside className="h-fit min-w-0 rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-5 shadow-[0_18px_50px_rgba(83,54,22,0.08)] sm:p-6 lg:sticky lg:top-32">
          <p className="eyebrow">Your order</p>
          <div className="mt-5 max-h-80 space-y-4 overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item.key} className="flex gap-3">
                <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-[#F6E9DD]">
                  <ProductImage
                    src={item.image}
                    alt=""
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#171717]">
                    {item.name}
                  </p>
                  <p className="mt-1 text-xs text-[#6F6255]">
                    {item.size} | Qty {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-semibold text-[#171717]">
                  {formatPrice(item.unitPrice * item.quantity)}
                </p>
              </div>
            ))}
          </div>
          <div className="my-5 h-px bg-[#E9DCCB]" />
          <div className="rounded-2xl border border-[#E9DCCB] bg-[#F6E9DD] p-4">
            <label htmlFor="checkout-promo" className="field-label">
              Coupon or voucher
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="checkout-promo"
                value={promoInput}
                onChange={(event) => {
                  setPromoInput(event.target.value.toUpperCase());
                  if (appliedPromo) setAppliedPromo(null);
                }}
                className="field min-w-0 flex-1"
                placeholder="DARAJNI10"
                maxLength={32}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => void applyPromo()}
                disabled={promoBusy || !promoInput.trim()}
                className="secondary-button shrink-0 !px-4"
              >
                {promoBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Tag className="h-4 w-4" />
                    Apply
                  </>
                )}
              </button>
            </div>
            {appliedPromo && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs text-emerald-800">
                <span className="min-w-0">
                  {appliedPromo.message}: {appliedPromo.code} saves{" "}
                  {formatPrice(totals.discount)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAppliedPromo(null);
                    setPromoInput("");
                  }}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-white/50"
                  aria-label="Remove coupon or voucher"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
          <div className="my-5 h-px bg-[#E9DCCB]" />
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-[#6F6255]">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Promo discount</span>
                <span>-{formatPrice(totals.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#6F6255]">
              <span>Shipping</span>
              <span>
                {totals.shipping ? formatPrice(totals.shipping) : "Free"}
              </span>
            </div>
            <div className="flex justify-between text-[#6F6255]">
              <span>Tax ({settings.taxRate}%)</span>
              <span>{formatPrice(totals.tax)}</span>
            </div>
          </div>
          <div className="my-5 h-px bg-[#E9DCCB]" />
          <div className="flex items-end justify-between">
            <span className="font-semibold text-[#171717]">Estimated total</span>
            <span className="font-display text-3xl font-semibold text-[#171717]">
              {formatPrice(totals.total)}
            </span>
          </div>
          {error && (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-xs leading-5 text-red-800"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="primary-button mt-6 w-full"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <PackageCheck className="h-4 w-4" />
                {paymentMethod === "cod" ? "Place COD order" : "Place Order Securely"}
              </>
            )}
          </button>
          <div className="mt-4 rounded-xl bg-[#F6E9DD] p-4 text-center text-[0.68rem] leading-5 text-[#5F5348]">
            Razorpay secure payment | Order total rechecked | WhatsApp support
          </div>
          <Link href="/support" className="secondary-button mt-3 w-full">
            <MessageCircle className="h-4 w-4" />
            Need help?
          </Link>
        </aside>
      </form>
    </main>
  );
}
