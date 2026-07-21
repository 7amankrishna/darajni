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
import { useEffect, useState } from "react";

import BrandLogo from "@/components/BrandLogo";
import { useCart } from "@/components/cart/cart-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { useWishlist } from "@/components/wishlist/wishlist-provider";
import { formatPrice, siteConfig, whatsappSupportLink } from "@/config/site";

const mobileLinks = [
  { label: "Home", href: "/", icon: Home },
  { label: "Categories", href: "/collection", icon: Grid2X2 },
  { label: "Wishlist", href: "/wishlist", icon: Heart },
  { label: "Orders", href: "/track", icon: PackageSearch },
  { label: "Account", href: "/login", icon: UserRound },
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
    ...availableCategories.slice(0, 4).map((category) => ({
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

  // State to track if purchase bar is visible (for adjusting WhatsApp button)
  const [isPurchaseBarVisible, setIsPurchaseBarVisible] = useState(false);

  useEffect(() => {
    function checkPurchaseBarVisibility() {
      // Check if we're on a product page and the purchase bar exists and is visible
      if (typeof window !== 'undefined') {
        const purchaseBar = document.querySelector('.mobile-purchase-bar');
        const isProductPage = window.location.pathname.startsWith('/design/');

        if (purchaseBar && isProductPage) {
          // Check if the element is not hidden (not sold out)
          const computedStyle = window.getComputedStyle(purchaseBar);
          const isVisible = computedStyle.display !== 'none' &&
                          !purchaseBar.classList.contains('md:hidden');

          setIsPurchaseBarVisible(isVisible);
        } else {
          setIsPurchaseBarVisible(false);
        }
      }
    }

    // Check on mount
    checkPurchaseBarVisibility();

    // Check on resize and route changes
    const observer = new MutationObserver(checkPurchaseBarVisibility);
    observer.observe(document.body, { childList: true, subtree: true });

    const resizeObserver = new ResizeObserver(checkPurchaseBarVisibility);
    resizeObserver.observe(document.body);

    // Listen for route changes (if using Next.js router, we'd need to use usePathname)
    // For simplicity, we'll also check on visibilitychange and focus
    document.addEventListener('visibilitychange', checkPurchaseBarVisibility);
    window.addEventListener('focus', checkPurchaseBarVisibility);

    // Cleanup
    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', checkPurchaseBarVisibility);
      window.removeEventListener('focus', checkPurchaseBarVisibility);
    };
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[#E8E2DA] bg-[#FFFFFF]/94 backdrop-blur-xl dark:border-[#3B3026] dark:bg-[#100D0B]/95">
        <div className="hidden border-b border-[#E8E2DA] bg-[#F5EFEB] text-[#1E1E1E] md:block dark:border-[#3B3026] dark:bg-[#15110F] dark:text-[#F7EADB]">
          <div className="section-shell flex h-[34px] items-center justify-between gap-6 text-[0.72rem] font-semibold">
            <span>{shippingLabel}</span>
            <span>
              {codEnabled ? "COD Available | " : ""}Secure Payments | Exchange Support
            </span>
            <a
              href={whatsappHref}
              target={supportNumber ? "_blank" : undefined}
              rel="noreferrer"
              className="text-[#C8A97E] hover:text-[#1E1E1E] dark:hover:text-white"
            >
              {supportLabel}
            </a>
          </div>
        </div>

        <nav
          className="section-shell grid h-[74px] min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 md:flex md:justify-between"
          aria-label="Main navigation"
        >
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-xl border border-[#E8E2DA] text-[#1E1E1E] dark:border-[#3B3026] dark:text-[#F7EADB] md:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label="Toggle navigation"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="mx-auto flex min-w-0 items-center gap-3 md:mx-0"
            aria-label="DARAJNI home"
          >
            <BrandLogo className="h-11 w-11 border border-[#C8A97E]/35 bg-[#FFFFFF] dark:border-[#C8A97E]/40 dark:bg-[#1B1612]" />
            <span className="hidden sm:block">
              <span className="font-display block text-[1.55rem] leading-none tracking-[0.08em] text-[#1E1E1E] dark:text-[#F7EADB]">
                DARAJNI
              </span>
              <span className="mt-1 block text-[0.52rem] font-bold uppercase tracking-[0.18em] text-[#C8A97E]">
                Designer House
              </span>
            </span>
          </Link>

          <div className="hidden items-center justify-center gap-5 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[0.72rem] font-bold uppercase text-[#666666] transition hover:text-[#C8A97E] dark:text-[#B8A898] dark:hover:text-[#C8A97E]"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2">
            <Link
              href="/collection"
              className="grid h-11 w-11 place-items-center rounded-xl border border-[#E8E2DA] bg-[#FFFFFF] text-[#1E1E1E] transition hover:border-[#C8A97E] dark:border-[#3B3026] dark:bg-[#1B1612] dark:text-[#F7EADB]"
              aria-label="Search collection"
            >
              <Search className="h-4 w-4" />
            </Link>
            <Link
              href="/wishlist"
              className="relative hidden h-11 w-11 place-items-center rounded-xl border border-[#E8E2DA] bg-[#FFFFFF] text-[#1E1E1E] transition hover:border-[#C8A97E] dark:border-[#3B3026] dark:bg-[#1B1612] dark:text-[#F7EADB] md:grid"
              aria-label={`Wishlist with ${wishlistCount} item${wishlistCount === 1 ? "" : "s"}`}
            >
              <Heart className="h-4 w-4" />
              <Badge count={wishlistCount} />
            </Link>
            <Link
              href="/login"
              className="hidden h-11 w-11 place-items-center rounded-xl border border-[#E8E2DA] bg-[#FFFFFF] text-[#1E1E1E] transition hover:border-[#C8A97E] dark:border-[#3B3026] dark:bg-[#1B1612] dark:text-[#F7EADB] md:grid"
              aria-label="Customer account"
            >
              <UserRound className="h-4 w-4" />
            </Link>
            <ThemeToggle />
            <Link
              href="/cart"
              className="relative grid h-11 w-11 place-items-center rounded-xl border border-[#E8E2DA] bg-[#FFFFFF] text-[#1E1E1E] transition hover:border-[#C8A97E] dark:border-[#3B3026] dark:bg-[#1B1612] dark:text-[#F7EADB]"
              aria-label={`Cart with ${itemCount} item${itemCount === 1 ? "" : "s"}`}
            >
              <ShoppingBag className="h-4 w-4" />
              <Badge count={itemCount} />
            </Link>
          </div>
        </nav>

        {open && (
          <div className="border-t border-[#E8E2DA] bg-[#FFFFFF] px-5 py-5 dark:border-[#3B3026] dark:bg-[#1B1612] md:hidden">
            <div className="grid gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 text-sm font-semibold text-[#666666] hover:bg-[#F5EFEB] dark:text-[#B8A898] dark:hover:bg-[#241D17]"
                >
                  {link.label}
                </Link>
              ))}
              <a
                href={whatsappHref}
                target={supportNumber ? "_blank" : undefined}
                rel="noreferrer"
                className="whatsapp-button mt-3 w-full"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp support
              </a>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-[#F5EFEB] px-3 py-2 dark:bg-[#241D17]">
                <span className="text-xs font-extrabold uppercase text-[#666666] dark:text-[#B8A898]">
                  Theme
                </span>
                <ThemeToggle />
              </div>
            </div>
          </div>
        )}
      </header>

      <a
        href={whatsappHref}
        target={supportNumber ? "_blank" : undefined}
        rel="noreferrer"
        className={`fixed ${isPurchaseBarVisible ? 'bottom-[150px]' : 'bottom-[84px]'} right-4 z-52 grid h-12 w-12 place-items-center rounded-full bg-[#1FAF54] text-white shadow-[0_16px_38px_rgba(31,175,84,0.28)] md:bottom-6 md:right-6 transition-all duration-300`}
        aria-label="Chat with DARAJNI on WhatsApp"
      >
        <MessageCircle className="h-5 w-5" />
      </a>

      <nav className={`mobile-bottom-nav fixed inset-x-0 ${isPurchaseBarVisible ? 'bottom-[90px]' : 'bottom-0'} z-50 border-t border-[#E8E2DA] bg-[#FFFFFF]/96 px-2 pt-2 backdrop-blur-xl dark:border-[#3B3026] dark:bg-[#100D0B]/95 md:hidden`}>
        <div className="grid grid-cols-5">
          {mobileLinks.map((item) => {
            const Icon = item.icon;
            const count = item.label === "Wishlist" ? wishlistCount : 0;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="relative flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[0.62rem] font-bold text-[#666666] dark:text-[#B8A898] hover:text-[#1E1E1E] dark:hover:text-[#F7EADB]"
              >
                <span className="relative">
                  <Icon className="h-4 w-4" />
                  <Badge count={count} />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
