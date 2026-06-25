"use client";

import { CreditCard, Loader2, PackageCheck, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { useCart } from "@/components/cart/cart-provider";
import { ProductImage } from "@/components/product/product-image";
import { formatPrice } from "@/config/site";
import type { CheckoutCustomer, StoreSettings } from "@/types/commerce";

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

export function CheckoutForm({ settings }: { settings: StoreSettings }) {
  const router = useRouter();
  const { items, ready, subtotal, clearCart } = useCart();
  const [customer, setCustomer] = useState(initialCustomer);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "razorpay">(
    settings.codEnabled ? "cod" : "razorpay",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const totals = useMemo(() => {
    const shipping = items.length ? settings.shippingCharge : 0;
    const tax = Math.round(subtotal * (settings.taxRate / 100) * 100) / 100;
    return { shipping, tax, total: subtotal + shipping + tax };
  }, [items.length, settings.shippingCharge, settings.taxRate, subtotal]);

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
      theme: { color: "#caaa70" },
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
      <main className="grid min-h-[65vh] place-items-center">
        <p className="eyebrow">Preparing checkout…</p>
      </main>
    );
  }

  if (!items.length) {
    return (
      <main className="grid min-h-[65vh] place-items-center px-4 text-center">
        <div>
          <h1 className="font-display text-5xl">Your cart is empty.</h1>
          <Link href="/#collection" className="primary-button mt-7">
            Browse collection
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="py-12 sm:py-16">
      <form
        onSubmit={submit}
        className="section-shell grid gap-8 lg:grid-cols-[1fr_400px]"
      >
        <div>
          <p className="eyebrow">Guest checkout</p>
          <h1 className="font-display mt-3 text-5xl sm:text-6xl">
            Delivery details
          </h1>
          <p className="mt-4 text-sm leading-7 text-white/45">
            No account is required. We use these details only to fulfil and
            support this order.
          </p>

          <div className="glass-panel mt-8 grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
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
                Phone
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
                Email <span className="normal-case tracking-normal">(optional)</span>
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
            <div className="sm:col-span-2">
              <label htmlFor="checkout-address" className="field-label">
                Address
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
            <div>
              <label htmlFor="checkout-landmark" className="field-label">
                Landmark <span className="normal-case tracking-normal">(optional)</span>
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

          <div className="glass-panel mt-6 p-5 sm:p-7">
            <p className="eyebrow">Payment</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {settings.codEnabled && (
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cod")}
                  className={`rounded-2xl border p-5 text-left transition ${
                    paymentMethod === "cod"
                      ? "border-[#caaa70] bg-[#caaa70]/8"
                      : "border-white/10"
                  }`}
                >
                  <Truck className="h-5 w-5 text-[#caaa70]" />
                  <p className="mt-3 text-sm font-semibold">Cash on delivery</p>
                  <p className="mt-2 text-xs leading-5 text-white/40">
                    Pay when the order reaches you.
                  </p>
                </button>
              )}
              <button
                type="button"
                onClick={() => setPaymentMethod("razorpay")}
                className={`rounded-2xl border p-5 text-left transition ${
                  paymentMethod === "razorpay"
                    ? "border-[#caaa70] bg-[#caaa70]/8"
                    : "border-white/10"
                }`}
              >
                <CreditCard className="h-5 w-5 text-[#caaa70]" />
                <p className="mt-3 text-sm font-semibold">Pay securely online</p>
                <p className="mt-2 text-xs leading-5 text-white/40">
                  UPI, cards, net banking and supported wallets via Razorpay.
                </p>
              </button>
            </div>
          </div>
        </div>

        <aside className="glass-panel h-fit p-6 lg:sticky lg:top-24">
          <p className="eyebrow">Your order</p>
          <div className="mt-5 max-h-80 space-y-4 overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item.key} className="flex gap-3">
                <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-black">
                  <ProductImage
                    src={item.image}
                    alt=""
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.name}</p>
                  <p className="mt-1 text-xs text-white/38">
                    {item.size} · Qty {item.quantity}
                  </p>
                </div>
                <p className="text-sm text-[#dfc184]">
                  {formatPrice(item.unitPrice * item.quantity)}
                </p>
              </div>
            ))}
          </div>
          <div className="my-5 h-px bg-white/10" />
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-white/55">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-white/55">
              <span>Shipping</span>
              <span>
                {totals.shipping ? formatPrice(totals.shipping) : "Free"}
              </span>
            </div>
            <div className="flex justify-between text-white/55">
              <span>Tax ({settings.taxRate}%)</span>
              <span>{formatPrice(totals.tax)}</span>
            </div>
          </div>
          <div className="my-5 h-px bg-white/10" />
          <div className="flex items-end justify-between">
            <span className="font-semibold">Estimated total</span>
            <span className="font-display text-3xl text-[#dfc184]">
              {formatPrice(totals.total)}
            </span>
          </div>
          {error && (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-red-400/20 bg-red-400/8 p-4 text-xs leading-5 text-red-200"
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
                Processing…
              </>
            ) : (
              <>
                <PackageCheck className="h-4 w-4" />
                {paymentMethod === "cod" ? "Place COD order" : "Proceed to payment"}
              </>
            )}
          </button>
          <p className="mt-4 text-center text-[0.68rem] leading-5 text-white/30">
            Prices, inventory and totals are revalidated before the order is
            accepted.
          </p>
        </aside>
      </form>
    </main>
  );
}
