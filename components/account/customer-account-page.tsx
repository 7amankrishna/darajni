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
    <article className="rounded-3xl border border-[#E8E2DA] bg-white p-5 shadow-sm sm:p-6 dark:border-[#3B3026] dark:bg-[#1B1612]">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="eyebrow text-[#C8A97E]">Order</p>
          <h3 className="font-display mt-1 text-3xl font-light text-[#1E1E1E] dark:text-[#F7EADB]">
            {order.orderNumber}
          </h3>
          <p className="mt-1 text-xs font-semibold text-[#666666] dark:text-[#B8A898]">
            Placed {formatDate(order.createdAt)}
          </p>
        </div>
        <span className="status-pill border border-[#E8E2DA] bg-[#F9F9F9] dark:bg-[#241D17] text-[#666666] dark:border-[#3B3026] dark:bg-[#241D17] dark:text-[#F7EADB]">
          {order.status}
        </span>
      </div>

      <div className="mt-6">
        <OrderStatusTimeline status={order.status} />
      </div>

      <div className="mt-6 grid gap-3 rounded-2xl bg-[#F9F9F9] dark:bg-[#241D17] p-4 text-xs text-[#666666] sm:grid-cols-3 dark:bg-[#241D17] dark:text-[#B8A898]">
        <div>
          <p className="field-label !mb-1 text-[0.62rem]">Updated</p>
          <p className="font-semibold text-[#1E1E1E] dark:text-[#F7EADB]">{formatDate(order.updatedAt)}</p>
        </div>
        <div>
          <p className="field-label !mb-1 text-[0.62rem]">Payment</p>
          <p className="capitalize font-semibold text-[#1E1E1E] dark:text-[#F7EADB]">
            {order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentStatus}
          </p>
        </div>
        <div>
          <p className="field-label !mb-1 text-[0.62rem]">Total</p>
          <p className="font-semibold text-[#1E1E1E] dark:text-[#C8A97E]">{formatPrice(order.total)}</p>
        </div>
      </div>

      <div className="mt-5 divide-y divide-[#E8E2DA] border-t border-[#E8E2DA] pt-2 dark:divide-[#3B3026] dark:border-[#3B3026]">
        {visibleItems.map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between gap-4 py-3 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-[#1E1E1E] dark:text-[#F7EADB]">
                {item.productName}
              </p>
              <p className="mt-1 text-xs text-[#666666] dark:text-[#B8A898]">
                Size {item.selectedSize} | Qty {item.quantity}
              </p>
            </div>
            <p className="shrink-0 font-semibold text-[#1E1E1E] dark:text-[#F7EADB]">
              {formatPrice(item.lineTotal)}
            </p>
          </div>
        ))}
        {hiddenItemCount > 0 && (
          <p className="py-3 text-xs font-semibold text-[#666666] dark:text-[#B8A898]">
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
  const [activeTab, setActiveTab] = useState<"orders" | "profile">("orders");

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
      setAuthError("Customer sign in is temporarily unavailable.");
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
          : "The account could not be created. Check your details and try again.",
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
      <main className="min-h-[78vh] bg-white py-8 sm:py-16 dark:bg-[#100D0B] flex items-center justify-center">
        <div className="w-full max-w-md px-4 sm:px-6">
          <section className="premium-card rounded-3xl border border-[#E8E2DA] bg-white p-6 sm:p-9 shadow-[0_20px_60px_rgba(58,46,37,0.08)] dark:border-[#3B3026] dark:bg-[#1B1612]">
            <div className="text-center">
              <span className="eyebrow text-[#C8A97E]">DARAJNI Couture</span>
              <h1 className="font-display mt-2 text-3xl font-light text-[#1E1E1E] sm:text-4xl dark:text-[#F7EADB]">
                {mode === "signin" ? "Sign in to account" : "Create your account"}
              </h1>
              <p className="mt-2 text-xs leading-5 text-[#666666] dark:text-[#B8A898]">
                {mode === "signin"
                  ? "Access your saved custom measurements & order history"
                  : "Join DARAJNI to track orders & save custom fit details"}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="mt-6 grid grid-cols-2 gap-1.5 rounded-2xl bg-[#F9F9F9] dark:bg-[#241D17] p-1.5 dark:bg-[#241D17]">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setAuthError("");
                  setAuthNotice("");
                }}
                className={`flex h-11 items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all ${
                  mode === "signin"
                    ? "bg-[#1E1E1E] text-white shadow-sm dark:bg-[#C8A97E] dark:text-[#100D0B]"
                    : "text-[#666666] hover:text-[#1E1E1E] dark:text-[#B8A898] dark:hover:text-[#F7EADB]"
                }`}
                aria-pressed={mode === "signin"}
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setAuthError("");
                  setAuthNotice("");
                }}
                className={`flex h-11 items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all ${
                  mode === "signup"
                    ? "bg-[#1E1E1E] text-white shadow-sm dark:bg-[#C8A97E] dark:text-[#100D0B]"
                    : "text-[#666666] hover:text-[#1E1E1E] dark:text-[#B8A898] dark:hover:text-[#F7EADB]"
                }`}
                aria-pressed={mode === "signup"}
              >
                <UserPlus className="h-4 w-4" />
                Create Account
              </button>
            </div>

            <form onSubmit={submitAuth} className="mt-6 space-y-4">
              {mode === "signup" && (
                <div>
                  <label htmlFor="account-name" className="field-label">
                    Full Name
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
                    className="field min-h-12"
                    placeholder="Your Full Name"
                    autoComplete="name"
                    minLength={2}
                    maxLength={100}
                    required
                  />
                </div>
              )}
              <div>
                <label htmlFor="account-email" className="field-label">
                  Email Address
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
                  className="field min-h-12"
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <div className="flex items-center justify-between gap-4 mb-1">
                  <label htmlFor="account-password" className="field-label !mb-0">
                    Password
                  </label>
                  {mode === "signin" && (
                    <Link
                      href="/forgot-password"
                      className="text-xs font-bold text-[#C8A97E] transition hover:underline"
                    >
                      Forgot password?
                    </Link>
                  )}
                </div>
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
                  className="field min-h-12"
                  placeholder="••••••••"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  minLength={6}
                  required
                />
              </div>

              {authError && (
                <p className="rounded-xl border border-red-500/25 bg-red-500/10 p-3.5 text-xs font-medium text-red-800 dark:text-red-300">
                  {authError}
                </p>
              )}
              {authNotice && (
                <p className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                  {authNotice}
                </p>
              )}

              <button type="submit" disabled={authBusy} className="primary-button min-h-12 w-full text-xs font-bold tracking-wider">
                {authBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Authenticating…
                  </>
                ) : mode === "signin" ? (
                  <>
                    <LogIn className="h-4 w-4" />
                    Sign in to Account
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Create New Account
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[#E8E2DA] dark:border-[#3B3026] text-center">
              <p className="text-xs text-[#666666] dark:text-[#B8A898]">
                Need help with your order?{" "}
                <Link href="/support" className="font-bold text-[#C8A97E] hover:underline">
                  Contact Support
                </Link>
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[80vh] bg-white py-8 sm:py-16 dark:bg-[#100D0B]">
      <div className="section-shell max-w-5xl">
        {/* Welcome Banner */}
        <div className="mb-8 flex flex-col justify-between gap-4 rounded-3xl border border-[#E8E2DA] bg-white p-6 shadow-sm sm:flex-row sm:items-center dark:border-[#3B3026] dark:bg-[#1B1612]">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-[#C8A97E]/40 bg-[#F9F9F9] dark:bg-[#241D17] font-display text-2xl font-semibold text-[#C8A97E] dark:bg-[#241D17]">
              {initials(profileForm.fullName, accountEmail)}
            </div>
            <div className="min-w-0">
              <span className="eyebrow text-[#C8A97E]">Logged in Customer</span>
              <h1 className="font-display mt-0.5 text-2xl font-light text-[#1E1E1E] sm:text-3xl dark:text-[#F7EADB]">
                Welcome back, {profileForm.fullName.split(" ")[0] || "Customer"}
              </h1>
              <p className="truncate text-xs text-[#666666] dark:text-[#B8A898]">
                {accountEmail} • {orders.length} saved orders
              </p>
            </div>
          </div>
          <button type="button" onClick={() => void signOut()} className="secondary-button shrink-0 text-xs">
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>

        {/* Dashboard Tabs */}
        <div className="mb-8 flex border-b border-[#E8E2DA] dark:border-[#3B3026]">
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "orders"
                ? "border-[#1E1E1E] text-[#1E1E1E] dark:border-[#C8A97E] dark:text-[#C8A97E]"
                : "border-transparent text-[#666666] hover:text-[#1E1E1E] dark:text-[#B8A898] dark:hover:text-[#F7EADB]"
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            My Orders ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "profile"
                ? "border-[#1E1E1E] text-[#1E1E1E] dark:border-[#C8A97E] dark:text-[#C8A97E]"
                : "border-transparent text-[#666666] hover:text-[#1E1E1E] dark:text-[#B8A898] dark:hover:text-[#F7EADB]"
            }`}
          >
            <UserRound className="h-4 w-4" />
            Saved Address &amp; Fit Profile
          </button>
        </div>

        {/* Tab Content 1: Orders */}
        {activeTab === "orders" && (
          <section className="space-y-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-display text-3xl font-light text-[#1E1E1E] dark:text-[#F7EADB]">
                  Order History
                </h2>
                <p className="text-xs text-[#666666] dark:text-[#B8A898]">
                  Track production, size confirmation &amp; delivery updates for all your orders
                </p>
              </div>
              <Link href="/track" className="secondary-button shrink-0 text-xs">
                Track by Order ID
              </Link>
            </div>

            <div className="grid gap-5">
              {orders.length ? (
                orders.map((order) => <OrderCard key={order.id} order={order} />)
              ) : (
                <div className="rounded-3xl border border-[#E8E2DA] bg-white p-10 text-center shadow-sm dark:border-[#3B3026] dark:bg-[#1B1612]">
                  <PackageCheck className="mx-auto h-12 w-12 text-[#C8A97E]" />
                  <h3 className="font-display mt-4 text-3xl font-light text-[#1E1E1E] dark:text-[#F7EADB]">
                    No saved orders yet
                  </h3>
                  <p className="mt-2 text-xs text-[#666666] dark:text-[#B8A898]">
                    Explore our couture collection and place your first custom outfit order.
                  </p>
                  <Link href="/collection" className="primary-button mt-6 text-xs">
                    Explore Collection
                  </Link>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Tab Content 2: Saved Address & Profile */}
        {activeTab === "profile" && (
          <section className="rounded-3xl border border-[#E8E2DA] bg-white p-6 sm:p-9 shadow-sm dark:border-[#3B3026] dark:bg-[#1B1612]">
            <div>
              <h2 className="font-display text-3xl font-light text-[#1E1E1E] dark:text-[#F7EADB]">
                Saved Address &amp; Measurements
              </h2>
              <p className="mt-1 text-xs text-[#666666] dark:text-[#B8A898]">
                Default shipping details prefilled during your next checkout.
              </p>
            </div>

            <form onSubmit={saveProfile} className="mt-6 grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="profile-name" className="field-label">
                    Full Name
                  </label>
                  <input
                    id="profile-name"
                    value={profileForm.fullName}
                    onChange={(event) => setProfileField("fullName", event.target.value)}
                    className="field min-h-12"
                    placeholder="Full Name"
                    autoComplete="name"
                    minLength={2}
                    maxLength={100}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="profile-phone" className="field-label">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C8A97E]" />
                    <input
                      id="profile-phone"
                      type="tel"
                      value={profileForm.phone}
                      onChange={(event) => setProfileField("phone", event.target.value)}
                      className="field min-h-12 pl-10"
                      autoComplete="tel"
                      placeholder="9876543210"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="profile-address" className="field-label">
                  Street Address
                </label>
                <textarea
                  id="profile-address"
                  value={profileForm.address}
                  onChange={(event) => setProfileField("address", event.target.value)}
                  className="field min-h-24 resize-y"
                  placeholder="House/Flat number, Street, Area"
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
                    onChange={(event) => setProfileField("city", event.target.value)}
                    className="field min-h-12"
                    placeholder="City"
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
                    onChange={(event) => setProfileField("state", event.target.value)}
                    className="field min-h-12"
                    placeholder="State"
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
                    onChange={(event) => setProfileField("pincode", event.target.value)}
                    className="field min-h-12"
                    placeholder="800001"
                    autoComplete="postal-code"
                    maxLength={6}
                  />
                </div>
                <div>
                  <label htmlFor="profile-landmark" className="field-label">
                    Landmark (Optional)
                  </label>
                  <input
                    id="profile-landmark"
                    value={profileForm.landmark}
                    onChange={(event) => setProfileField("landmark", event.target.value)}
                    className="field min-h-12"
                    placeholder="Nearby landmark"
                    maxLength={160}
                  />
                </div>
              </div>

              <div className="mt-2">
                <button type="submit" disabled={profileBusy} className="primary-button min-h-12 px-8 text-xs font-bold">
                  {profileBusy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Address Details
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}
