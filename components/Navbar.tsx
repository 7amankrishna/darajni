"use client";

import {
  Grid2X2,
  Heart,
  Home,
  Menu,
  MessageCircle,
  PackageSearch,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import BrandLogo from "@/components/BrandLogo";
import { useCart } from "@/components/cart/cart-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { useWishlist } from "@/components/wishlist/wishlist-provider";
import { formatPrice, siteConfig, whatsappSupportLink } from "@/config/site";

const mobileLinks = [
  { label: "Home", href: "/", icon: Home },
  { label: "Shop", href: "/collection", icon: Grid2X2 },
  { label: "Wishlist", href: "/wishlist", icon: Heart },
  { label: "Orders", href: "/dashboard", icon: PackageSearch },
  { label: "Profile", href: "/login", icon: UserRound },
];

function Badge({ count }: { count: number }) {
  if (count < 1) return null;
  return (
    <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#6E0F1A] px-1 text-[0.6rem] font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function Navbar({
  supportNumber,
  shippingCharge,
  codEnabled,
  availableCategories,
  hasSaleProducts,
}: {
  supportNumber: string;
  shippingCharge: number;
  codEnabled: boolean;
  availableCategories: Array<{ name: string; slug: string }>;
  hasSaleProducts: boolean;
}) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [open, setOpen] = useState(false);
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const whatsappHref = whatsappSupportLink(
    supportNumber,
    "Hello DARAJNI, I need help with sizing, delivery or an order.",
  );
  const supportLabel = supportNumber
    ? `WhatsApp Support: +${supportNumber}`
    : `Support: ${siteConfig.email}`;
  const navLinks = [
    { label: "Collection", href: "/collection" },
    ...availableCategories.slice(0, 3).map((category) => ({
      label: category.name,
      href: `/collection?category=${encodeURIComponent(category.slug)}`,
    })),
    { label: "About", href: "/about" },
    { label: "Custom Fit", href: "/size-guide" },
    { label: "Request a Dress", href: "/requested-dresses" },
    { label: "Track Order", href: "/track" },
  ];
  const shippingLabel = shippingCharge > 0
    ? `${formatPrice(shippingCharge)} shipping Pan India`
    : "Free shipping Pan India";

  // ProductPurchase emits this event when its mobile checkout bar mounts. This
  // avoids observing the entire document and reading computed layout on every
  // DOM mutation.
  const [isPurchaseBarVisible, setIsPurchaseBarVisible] = useState(false);

  useEffect(() => {
    function updatePurchaseBarVisibility(event: Event) {
      const visible = (event as CustomEvent<boolean>).detail;
      setIsPurchaseBarVisible((current) => current === visible ? current : visible);
    }

    window.addEventListener("darajni:mobile-purchase-bar", updatePurchaseBarVisibility);

    return () => {
      window.removeEventListener("darajni:mobile-purchase-bar", updatePurchaseBarVisibility);
    };
  }, []);

  return (
    <>
      <header className={cn("inset-x-0 top-0 z-40 h-[64px] border-b border-border/40 bg-background/90 transition-colors backdrop-blur-md lg:h-[90px]", isHome ? "sticky lg:fixed" : "sticky")}>
        <div className="hidden border-b border-border bg-surface-alt text-text-primary lg:block">
          <div className="section-shell flex h-[34px] items-center justify-between gap-6 text-[0.72rem] font-semibold">
            <span>{shippingLabel}</span>
            <span>
              {codEnabled ? "COD Available | " : ""}Secure Payments | Exchange Support
            </span>
            <a
              href={whatsappHref}
              target={supportNumber ? "_blank" : undefined}
              rel="noreferrer"
              className="text-accent hover:text-text-primary"
            >
              {supportLabel}
            </a>
          </div>
        </div>

        <nav
          className="section-shell grid h-[64px] min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 md:flex md:justify-between lg:h-[90px]"
          aria-label="Main navigation"
        >
          <button
            type="button"
            className="grid h-10 w-10 place-items-center text-text-primary hover:bg-surface-alt/50 rounded-full transition-colors xl:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label="Toggle navigation"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="group flex shrink-0 items-center justify-center xl:justify-start gap-3 w-full xl:w-auto pr-4 xl:pr-0"
            aria-label="DARAJNI Homepage"
          >
            <BrandLogo className="hidden sm:block h-9 w-9 text-accent transition-transform group-hover:scale-105 sm:h-11 sm:w-11" />
            <span className="block">
              <span className="font-display block whitespace-nowrap text-xl tracking-[0.08em] text-text-primary sm:text-2xl">
                DARAJNI
              </span>
              <span className="hidden sm:block whitespace-nowrap text-[0.48rem] font-bold uppercase tracking-[0.16em] text-accent sm:text-[0.52rem]">
                Designer House
              </span>
            </span>
          </Link>

          <div className="hidden flex-1 items-center justify-center gap-1.5 px-2 xl:flex 2xl:gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="relative whitespace-nowrap p-1.5 text-[0.8rem] font-medium text-text-primary transition hover:text-accent 2xl:p-2.5 2xl:text-base"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-2">
            <Link
              href="/collection"
              className="grid h-10 w-10 place-items-center rounded-full text-text-primary transition hover:bg-surface-alt/50"
              aria-label="Search collection"
            >
              <Search className="h-5 w-5" />
            </Link>
            <Link
              href="/wishlist"
              className="relative grid h-10 w-10 place-items-center rounded-full text-text-primary transition hover:bg-surface-alt/50"
              aria-label={`Wishlist with ${wishlistCount} item${wishlistCount === 1 ? "" : "s"}`}
            >
              <Heart className="h-5 w-5" />
              <Badge count={wishlistCount} />
            </Link>
            <Link
              href="/login"
              className="hidden h-10 w-10 place-items-center rounded-full text-text-primary transition hover:bg-surface-alt/50 md:grid"
              aria-label="Customer account"
            >
              <UserRound className="h-5 w-5" />
            </Link>
            <ThemeToggle />
            <Link
              href="/cart"
              className="relative grid h-10 w-10 place-items-center rounded-full text-text-primary transition hover:bg-surface-alt/50"
              aria-label={`Cart with ${itemCount} item${itemCount === 1 ? "" : "s"}`}
            >
              <ShoppingBag className="h-5 w-5" />
              <Badge count={itemCount} />
            </Link>
          </div>
        </nav>

      </header>

      {open && (
        <div className="fixed inset-0 z-30 mt-[74px] flex flex-col bg-background/98 backdrop-blur-xl animate-in slide-in-from-top-2 fade-in duration-300 xl:hidden">
          <div className="flex-1 overflow-y-auto px-5 py-6">
            <div className="grid gap-2">
              {navLinks.map((link, index) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-3.5 text-[0.85rem] font-bold tracking-wide text-text-primary transition-all hover:bg-surface-alt hover:text-accent hover:translate-x-1"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="mt-8 border-t border-border pt-6">
              <a
                href={whatsappHref}
                target={supportNumber ? "_blank" : undefined}
                rel="noreferrer"
                className="whatsapp-button w-full shadow-lg shadow-success/20"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp support
              </a>
            </div>
            <div className="mt-6 flex h-16 items-center justify-between rounded-xl border border-border bg-surface-alt/50 px-4">
              <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-text-primary">
                Theme
              </span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}

      <a
        href={whatsappHref}
        target={supportNumber ? "_blank" : undefined}
        rel="noreferrer"
        className={`fixed ${isPurchaseBarVisible ? 'bottom-[130px]' : 'bottom-[76px]'} right-4 z-50 grid h-12 w-12 place-items-center rounded-full bg-surface border border-border text-text-primary shadow-[0_8px_24px_rgba(0,0,0,0.12)] md:bottom-6 md:right-6 transition-all duration-300 hover:scale-105 hover:border-accent hover:text-accent`}
        aria-label="Chat with DARAJNI on WhatsApp"
      >
        <MessageCircle className="h-5 w-5" />
      </a>

      <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 px-2 pt-2 pb-safe backdrop-blur-xl md:hidden shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-5">
          {mobileLinks.map((item) => {
            const Icon = item.icon;
            const count = item.label === "Wishlist" ? wishlistCount : (item.label === "Cart" ? itemCount : 0);
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "relative flex min-h-[52px] flex-col items-center justify-center gap-1.5 px-1 py-1.5 text-[0.65rem] transition-colors",
                  isActive ? "text-accent font-bold" : "text-text-secondary font-medium hover:text-text-primary"
                )}
              >
                <span className="relative">
                  <Icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} />
                  <Badge count={count} />
                </span>
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
