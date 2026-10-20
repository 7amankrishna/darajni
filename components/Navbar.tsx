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
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
    <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[var(--maroon)] px-1 text-[0.6rem] font-bold text-white shadow-[0_2px_8px_rgba(110,15,26,0.4)] ring-1 ring-white/25">
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
  const [open, setOpen] = useState(false);
  const drawer = useRef<HTMLDivElement>(null);
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

  // Close the drawer after navigation so it never stays open across routes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(drawer.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? []);
    focusable()[0]?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", handleKey);
    const desktop = window.matchMedia("(min-width: 1280px)");
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      document.removeEventListener("keydown", handleKey);
      desktop.removeEventListener("change", closeOnDesktop);
      previousFocus?.focus();
    };
  }, [open]);

  // Lock the ROOT SCROLLER (<html>) while the drawer is open. Freezing <body>
  // with position:fixed would drag the sticky header off-screen once the page
  // is scrolled; locking <html> keeps it stuck at the top with zero shift,
  // while overscroll-behavior blocks iOS rubber-band bleed-through.
  useEffect(() => {
    if (!open) return;

    const { body, documentElement } = document;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
    const previous = {
      htmlOverflow: documentElement.style.overflow,
      htmlOverscroll: documentElement.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
      bodyPaddingRight: body.style.paddingRight,
    };

    documentElement.style.overflow = "hidden";
    documentElement.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      documentElement.style.overflow = previous.htmlOverflow;
      documentElement.style.overscrollBehavior = previous.htmlOverscroll;
      body.style.overflow = previous.bodyOverflow;
      body.style.paddingRight = previous.bodyPaddingRight;
    };
  }, [open]);

  return (
    <>
      {/* Spacer holds the layout because the header is always position:fixed.
          A fixed header cannot be dislodged by scroll position, sticky
          containing blocks, or the drawer's scroll lock. */}
      <div aria-hidden="true" className="atelier-header-spacer" />

      <header className="atelier-header fixed inset-x-0 top-0 z-40 border-b border-border bg-background">
        <div className="hidden border-b border-border/60 bg-surface-alt/70 text-text-primary lg:block">
          <div className="section-shell flex h-[34px] items-center justify-between gap-6 text-[0.64rem] font-bold uppercase tracking-[0.12em] text-text-secondary">
            <span>{shippingLabel}</span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-px bg-accent/40" aria-hidden="true" />
              {codEnabled ? "COD Available" : ""}
              {codEnabled ? <span className="h-3 w-px bg-accent/40" aria-hidden="true" /> : null}
              Secure Payments
              <span className="h-3 w-px bg-accent/40" aria-hidden="true" />
              Exchange Support
            </span>
            <a
              href={whatsappHref}
              target={supportNumber ? "_blank" : undefined}
              rel="noreferrer"
              className="text-[var(--gold-dark)] transition-colors hover:text-text-primary"
            >
              {supportLabel}
            </a>
          </div>
        </div>

        <nav
          className="atelier-nav section-shell"
          aria-label="Main navigation"
        >
          <button
            type="button"
            className="grid h-10 w-10 place-items-center text-text-primary hover:bg-surface-alt/50 rounded-full transition-colors xl:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="atelier-mobile-menu"
            aria-label="Toggle navigation"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link href="/about" className="atelier-nav-origin">Bihar Sharif, India<br /><span>A personal approach to occasion wear</span></Link>

          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="atelier-wordmark group"
            aria-label="DARAJNI Homepage"
          >
            <BrandLogo className="hidden h-8 w-8 text-accent 2xl:block" />
            <span className="block">
              <span className="atelier-wordmark-name font-display">
                DARAJNI
              </span>
              <span className="atelier-wordmark-subtitle">
                Designer House
              </span>
            </span>
          </Link>

          <div className="atelier-nav-links">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="nav-link"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="atelier-nav-actions flex shrink-0 items-center justify-end gap-0 sm:gap-1">
            <Link
              href="/collection"
              className="grid h-10 w-10 place-items-center rounded-full text-text-primary transition hover:bg-surface-alt/50"
              aria-label="Search collection"
            >
              <Search className="h-5 w-5" />
            </Link>
            <Link
              href="/wishlist"
              className="relative hidden md:grid h-10 w-10 place-items-center rounded-full text-text-primary transition hover:bg-surface-alt/50"
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

      {open &&
        createPortal(
          // Portaled to document.body so no ancestor (transform/filter) can
          // turn the fixed drawer into a scroll-away box.
          <div ref={drawer} id="atelier-mobile-menu" role="dialog" aria-modal="true" aria-label="Navigation" className="mobile-drawer atelier-drawer fixed inset-x-0 bottom-0 z-30 flex flex-col bg-background xl:hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-3">
              <span className="eyebrow">Explore DARAJNI</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close navigation" className="grid h-11 w-11 place-items-center"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-6">
              <div className="grid gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-4 py-3.5 text-[0.85rem] font-bold tracking-wide text-text-primary transition-all hover:bg-surface-alt hover:text-accent hover:translate-x-1"
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
          </div>,
          document.body,
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
