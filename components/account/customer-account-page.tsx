"use client";

import {
  Loader2,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  Save,
  ShoppingBag,
  UserPlus,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { OrderStatusTimeline } from "@/components/order/order-status-timeline";
import { formatPrice } from "@/config/site";
import { formatDate } from "@/lib/commerce";
import { supabase } from "@/lib/supabase/client";
import type {
  CustomerAccountData,
  CustomerProfile,
  OrderSummary,
} from "@/types/commerce";

interface ProfileForm {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string;
}

function profileToForm(
  profile: CustomerProfile | null,
  email: string,
): ProfileForm {
  const emailName = email.split("@")[0] || "Customer";
  return {
    fullName:
      profile?.fullName || (emailName.length >= 2 ? emailName : "Customer"),
    phone: profile?.phone || "",
    address: profile?.address || "",
    city: profile?.city || "",
    state: profile?.state || "",
    pincode: profile?.pincode || "",
    landmark: profile?.landmark || "",
  };
}

function initials(name: string, email: string) {
  const source = name.trim() || email;
  const parts = source.split(/\s+|@/).filter(Boolean);
  return (parts[0]?.[0] || "D").toUpperCase();
}

function OrderCard({ order }: { order: OrderSummary }) {
  const visibleItems = order.items.slice(0, 2);
  const hiddenItemCount = Math.max(0, order.items.length - visibleItems.length);

  return (
    <article className="rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-5 shadow-[0_18px_50px_rgba(83,54,22,0.07)] sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="eyebrow">Order</p>
          <h3 className="font-display mt-2 text-3xl text-[#171717]">
            {order.orderNumber}
          </h3>
          <p className="mt-2 text-xs font-semibold text-[#6F6255]">
            Placed {formatDate(order.createdAt)}
          </p>
        </div>
        <span className="status-pill border border-[#E9DCCB] bg-[#F6E9DD] text-[#5F5348]">
          {order.status}
        </span>
      </div>

      <div className="mt-7">
        <OrderStatusTimeline status={order.status} />
      </div>

      <div className="mt-7 grid gap-3 rounded-2xl bg-[#F6E9DD] p-4 text-sm text-[#5F5348] sm:grid-cols-3">
        <div>
          <p className="field-label">Updated</p>
          <p>{formatDate(order.updatedAt)}</p>
        </div>
        <div>
          <p className="field-label">Payment</p>
          <p className="capitalize">
            {order.paymentMethod === "cod" ? "Cash on delivery" : order.paymentStatus}
          </p>
        </div>
        <div>
          <p className="field-label">Total</p>
          <p className="font-semibold text-[#171717]">{formatPrice(order.total)}</p>
        </div>
      </div>

      <div className="mt-5 divide-y divide-[#E9DCCB] border-t border-[#E9DCCB] pt-2">
        {visibleItems.map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between gap-4 py-3 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-[#171717]">
                {item.productName}
              </p>
              <p className="mt-1 text-xs text-[#6F6255]">
                Size {item.selectedSize} | Qty {item.quantity}
              </p>
            </div>
            <p className="shrink-0 font-semibold text-[#171717]">
              {formatPrice(item.lineTotal)}
            </p>
          </div>
        ))}
        {hiddenItemCount > 0 && (
          <p className="py-3 text-xs font-semibold text-[#6F6255]">
            +{hiddenItemCount} more item{hiddenItemCount === 1 ? "" : "s"}
          </p>
        )}
      </div>
    </article>
  );
}

export function CustomerAccountPage({
  initialAccount,
}: {
  initialAccount: CustomerAccountData;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [authForm, setAuthForm] = useState({
    email: "",
    password: "",
    fullName: "",
  });
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [profileForm, setProfileForm] = useState<ProfileForm>(() =>
    profileToForm(initialAccount.profile, initialAccount.user?.email || ""),
  );
  const [profileBusy, setProfileBusy] = useState(false);

  const user = initialAccount.user;
  const orders = initialAccount.orders;
  const accountEmail = user?.email || initialAccount.profile?.email || "";

  useEffect(() => {
    setProfileForm(profileToForm(initialAccount.profile, accountEmail));
  }, [accountEmail, initialAccount.profile]);

  const activeOrderCount = useMemo(
    () =>
      orders.filter(
        (order) => !["delivered", "cancelled"].includes(order.status),
      ).length,
    [orders],
  );

  const setProfileField = (field: keyof ProfileForm, value: string) => {
    setProfileForm((current) => ({ ...current, [field]: value }));
  };

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || authBusy) {
      setAuthError("Customer sign in is not configured.");
      return;
    }

    setAuthBusy(true);
    setAuthError("");
    setAuthNotice("");

    if (mode === "signup" && authForm.fullName.trim().length < 2) {
      setAuthBusy(false);
      setAuthError("Enter your full name.");
      return;
    }

    const email = authForm.email.trim().toLowerCase();
    const password = authForm.password;
    const response =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: authForm.fullName.trim() },
            },
          });

    if (response.error) {
      setAuthBusy(false);
      setAuthError(
        mode === "signin"
          ? "The email or password is incorrect."
          : response.error.message,
      );
      return;
    }

    if (mode === "signup" && !response.data.session) {
      setAuthBusy(false);
      setAuthNotice("Check your email to finish creating your account.");
      return;
    }

    toast.success(mode === "signin" ? "Signed in." : "Account created.");
    router.refresh();
    setAuthBusy(false);
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (profileBusy) return;

    setProfileBusy(true);
    const response = await fetch("/api/account/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileForm),
    });
    const result = (await response.json()) as {
      profile?: CustomerProfile;
      error?: string;
    };
    setProfileBusy(false);

    if (!response.ok || !result.profile) {
      toast.error(result.error || "Your details could not be saved.");
      return;
    }

    setProfileForm(profileToForm(result.profile, accountEmail));
    toast.success("Details saved.");
    router.refresh();
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    toast.success("Signed out.");
    router.refresh();
  };

  if (!user) {
    return (
      <main className="bg-[#FFF8EF] py-12 sm:py-16">
        <div className="section-shell grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
          <section className="premium-card p-6 sm:p-8">
            <p className="eyebrow">Customer account</p>
            <h1 className="font-display mt-3 text-5xl leading-none text-[#171717] sm:text-6xl">
              Sign in to DARAJNI
            </h1>

            <div className="mt-7 grid grid-cols-2 gap-2 rounded-2xl bg-[#F6E9DD] p-2">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setAuthError("");
                  setAuthNotice("");
                }}
                className={`secondary-button !min-h-10 !py-2 ${
                  mode === "signin" ? "!border-[#111111] !bg-[#111111] !text-white" : ""
                }`}
                aria-pressed={mode === "signin"}
              >
                <LogIn className="h-4 w-4" />
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setAuthError("");
                  setAuthNotice("");
                }}
                className={`secondary-button !min-h-10 !py-2 ${
                  mode === "signup" ? "!border-[#111111] !bg-[#111111] !text-white" : ""
                }`}
                aria-pressed={mode === "signup"}
              >
                <UserPlus className="h-4 w-4" />
                Create
              </button>
            </div>

            <form onSubmit={submitAuth} className="mt-6 space-y-5">
              {mode === "signup" && (
                <div>
                  <label htmlFor="account-name" className="field-label">
                    Full name
                  </label>
                  <input
                    id="account-name"
                    value={authForm.fullName}
                    onChange={(event) =>
                      setAuthForm((current) => ({
                        ...current,
                        fullName: event.target.value,
                      }))
                    }
                    className="field"
                    autoComplete="name"
                    minLength={2}
                    maxLength={100}
                    required
                  />
                </div>
              )}
              <div>
                <label htmlFor="account-email" className="field-label">
                  Email
                </label>
                <input
                  id="account-email"
                  type="email"
                  value={authForm.email}
                  onChange={(event) =>
                    setAuthForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  className="field"
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <label htmlFor="account-password" className="field-label">
                  Password
                </label>
                <input
                  id="account-password"
                  type="password"
                  value={authForm.password}
                  onChange={(event) =>
                    setAuthForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  className="field"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  minLength={6}
                  required
                />
              </div>

              {authError && (
                <p className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-800">
                  {authError}
                </p>
              )}
              {authNotice && (
                <p className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-800">
                  {authNotice}
                </p>
              )}

              <button type="submit" disabled={authBusy} className="primary-button w-full">
                {authBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Please wait
                  </>
                ) : mode === "signin" ? (
                  <>
                    <LogIn className="h-4 w-4" />
                    Sign in
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Create account
                  </>
                )}
              </button>
            </form>
          </section>

          <section className="grid gap-4">
            <div className="rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-5">
              <div className="flex items-center gap-3">
                <UserRound className="h-5 w-5 text-[#B8893B]" />
                <h2 className="font-display text-3xl text-[#171717]">
                  Your details
                </h2>
              </div>
            </div>
            <div className="rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-5">
              <div className="flex items-center gap-3">
                <PackageCheck className="h-5 w-5 text-[#B8893B]" />
                <h2 className="font-display text-3xl text-[#171717]">
                  Order progress
                </h2>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[#FFF8EF] py-12 sm:py-16">
      <div className="section-shell">
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Customer account</p>
            <h1 className="font-display mt-3 text-5xl leading-none text-[#171717] sm:text-6xl">
              Welcome, {profileForm.fullName.split(" ")[0] || "Customer"}.
            </h1>
          </div>
          <button type="button" onClick={() => void signOut()} className="secondary-button">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <section className="h-fit rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-5 shadow-[0_18px_50px_rgba(83,54,22,0.08)] sm:p-7 lg:sticky lg:top-32">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-[#B8893B]/40 bg-[#F6E9DD] font-display text-3xl font-semibold text-[#6E0F1A]">
                {initials(profileForm.fullName, accountEmail)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#171717]">
                  {accountEmail}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#6F6255]">
                  {activeOrderCount} active order{activeOrderCount === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <form onSubmit={saveProfile} className="mt-7 grid gap-5">
              <div>
                <label htmlFor="profile-name" className="field-label">
                  Full name
                </label>
                <input
                  id="profile-name"
                  value={profileForm.fullName}
                  onChange={(event) =>
                    setProfileField("fullName", event.target.value)
                  }
                  className="field"
                  autoComplete="name"
                  minLength={2}
                  maxLength={100}
                  required
                />
              </div>
              <div>
                <label htmlFor="profile-phone" className="field-label">
                  Mobile number
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B8893B]" />
                  <input
                    id="profile-phone"
                    type="tel"
                    value={profileForm.phone}
                    onChange={(event) =>
                      setProfileField("phone", event.target.value)
                    }
                    className="field pl-10"
                    autoComplete="tel"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="profile-address" className="field-label">
                  Address
                </label>
                <textarea
                  id="profile-address"
                  value={profileForm.address}
                  onChange={(event) =>
                    setProfileField("address", event.target.value)
                  }
                  className="field min-h-24 resize-y"
                  autoComplete="street-address"
                  maxLength={300}
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="profile-city" className="field-label">
                    City
                  </label>
                  <input
                    id="profile-city"
                    value={profileForm.city}
                    onChange={(event) =>
                      setProfileField("city", event.target.value)
                    }
                    className="field"
                    autoComplete="address-level2"
                    maxLength={80}
                  />
                </div>
                <div>
                  <label htmlFor="profile-state" className="field-label">
                    State
                  </label>
                  <input
                    id="profile-state"
                    value={profileForm.state}
                    onChange={(event) =>
                      setProfileField("state", event.target.value)
                    }
                    className="field"
                    autoComplete="address-level1"
                    maxLength={80}
                  />
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="profile-pincode" className="field-label">
                    Pincode
                  </label>
                  <input
                    id="profile-pincode"
                    inputMode="numeric"
                    pattern="[1-9][0-9]{5}"
                    value={profileForm.pincode}
                    onChange={(event) =>
                      setProfileField("pincode", event.target.value)
                    }
                    className="field"
                    autoComplete="postal-code"
                    maxLength={6}
                  />
                </div>
                <div>
                  <label htmlFor="profile-landmark" className="field-label">
                    Landmark
                  </label>
                  <input
                    id="profile-landmark"
                    value={profileForm.landmark}
                    onChange={(event) =>
                      setProfileField("landmark", event.target.value)
                    }
                    className="field"
                    maxLength={160}
                  />
                </div>
              </div>
              <button type="submit" disabled={profileBusy} className="primary-button">
                {profileBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save details
                  </>
                )}
              </button>
            </form>
          </section>

          <section>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-5">
                <Mail className="h-5 w-5 text-[#B8893B]" />
                <p className="field-label mt-4">Email</p>
                <p className="truncate text-sm font-semibold text-[#171717]">
                  {accountEmail}
                </p>
              </div>
              <div className="rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-5">
                <MapPin className="h-5 w-5 text-[#B8893B]" />
                <p className="field-label mt-4">Delivery city</p>
                <p className="truncate text-sm font-semibold text-[#171717]">
                  {profileForm.city || "Not saved"}
                </p>
              </div>
              <div className="rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-5">
                <ShoppingBag className="h-5 w-5 text-[#B8893B]" />
                <p className="field-label mt-4">Orders</p>
                <p className="text-sm font-semibold text-[#171717]">
                  {orders.length} saved
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="eyebrow">Order progress</p>
                <h2 className="font-display mt-2 text-4xl text-[#171717]">
                  Saved orders
                </h2>
              </div>
              <Link href="/track" className="secondary-button">
                Track another order
              </Link>
            </div>

            <div className="mt-5 grid gap-5">
              {orders.length ? (
                orders.map((order) => <OrderCard key={order.id} order={order} />)
              ) : (
                <div className="rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-8 text-center shadow-[0_18px_50px_rgba(83,54,22,0.07)]">
                  <PackageCheck className="mx-auto h-10 w-10 text-[#B8893B]" />
                  <h3 className="font-display mt-4 text-3xl text-[#171717]">
                    No saved orders yet.
                  </h3>
                  <Link href="/collection" className="primary-button mt-6">
                    Shop collection
                  </Link>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
