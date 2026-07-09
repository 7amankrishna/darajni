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
import { useState } from "react";

import BrandLogo from "@/components/BrandLogo";
import { useCart } from "@/components/cart/cart-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { useWishlist } from "@/components/wishlist/wishlist-provider";
import { siteConfig, whatsappSupportLink } from "@/config/site";

const navLinks = [
  { label: "New Arrivals", href: "/collection" },
  { label: "Lehengas", href: "/collection" },
  { label: "Gowns", href: "/collection" },
  { label: "Sarees", href: "/collection" },
  { label: "Anarkalis", href: "/collection" },
  { label: "Custom Fit", href: "/size-guide" },
  { label: "Sale", href: "/collection" },
  { label: "Track Order", href: "/track" },
];

const mobileLinks = [
  { label: "Home", href: "/", icon: Home },
  { label: "Categories", href: "/collection", icon: Grid2X2 },
  { label: "Wishlist", href: "/wishlist", icon: Heart },
  { label: "Orders", href: "/track", icon: PackageSearch },
  { label: "Account", href: "/support", icon: UserRound },
];

function Badge({ count }: { count: number }) {
  if (count < 1) return null;
  return (
    <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#6E0F1A] px-1 text-[0.6rem] font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function Navbar({ supportNumber }: { supportNumber: string }) {
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

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[#E9DCCB] bg-[#FFF8EF]/94 backdrop-blur-xl">
        <div className="hidden bg-[#171717] text-[#FFFDF8] md:block">
          <div className="section-shell flex h-[34px] items-center justify-between gap-6 text-[0.72rem] font-semibold">
            <span>Free shipping Pan India</span>
            <span>COD Available | Secure Payments | Easy 7-Day Exchange</span>
            <a
              href={whatsappHref}
              target={supportNumber ? "_blank" : undefined}
              rel="noreferrer"
              className="text-[#E7C47F] hover:text-white"
            >
              {supportLabel}
            </a>
          </div>
        </div>

        <nav
          className="section-shell grid h-[74px] grid-cols-[auto_1fr_auto] items-center gap-3 md:flex md:justify-between"
          aria-label="Main navigation"
        >
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-xl border border-[#E9DCCB] text-[#171717] md:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label="Toggle navigation"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="mx-auto flex items-center gap-3 md:mx-0"
            aria-label="DARAJNI home"
          >
            <BrandLogo className="h-11 w-11 border border-[#B8893B]/35 bg-[#FFFDF8]" />
            <span className="hidden sm:block">
              <span className="font-display block text-[1.55rem] leading-none tracking-[0.08em] text-[#171717]">
                DARAJNI
              </span>
              <span className="mt-1 block text-[0.52rem] font-bold uppercase tracking-[0.18em] text-[#B8893B]">
                Designer House
              </span>
            </span>
          </Link>

          <div className="hidden items-center justify-center gap-5 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[0.72rem] font-bold uppercase text-[#5F5348] transition hover:text-[#6E0F1A]"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Link
              href="/collection"
              className="grid h-10 w-10 place-items-center rounded-xl border border-[#E9DCCB] bg-[#FFFDF8] text-[#171717] transition hover:border-[#B8893B]"
              aria-label="Search collection"
            >
              <Search className="h-4 w-4" />
            </Link>
            <Link
              href="/wishlist"
              className="relative hidden h-10 w-10 place-items-center rounded-xl border border-[#E9DCCB] bg-[#FFFDF8] text-[#171717] transition hover:border-[#B8893B] md:grid"
              aria-label={`Wishlist with ${wishlistCount} item${wishlistCount === 1 ? "" : "s"}`}
            >
              <Heart className="h-4 w-4" />
              <Badge count={wishlistCount} />
            </Link>
            <Link
              href="/support"
              className="hidden h-10 w-10 place-items-center rounded-xl border border-[#E9DCCB] bg-[#FFFDF8] text-[#171717] transition hover:border-[#B8893B] md:grid"
              aria-label="Account and support"
            >
              <UserRound className="h-4 w-4" />
            </Link>
            <ThemeToggle />
            <Link
              href="/cart"
              className="relative grid h-10 w-10 place-items-center rounded-xl border border-[#B8893B]/45 bg-[#111111] text-[#FFFDF8] transition hover:bg-[#6E0F1A]"
              aria-label={`Cart with ${itemCount} item${itemCount === 1 ? "" : "s"}`}
            >
              <ShoppingBag className="h-4 w-4" />
              <Badge count={itemCount} />
            </Link>
          </div>
        </nav>

        {open && (
          <div className="border-t border-[#E9DCCB] bg-[#FFFDF8] px-5 py-5 md:hidden">
            <div className="grid gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 text-sm font-semibold text-[#5F5348] hover:bg-[#F6E9DD]"
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
              <div className="mt-3 flex items-center justify-between rounded-xl bg-[#F6E9DD] px-3 py-2">
                <span className="text-xs font-extrabold uppercase text-[#5F5348]">
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
        className="fixed bottom-24 right-4 z-40 grid h-12 w-12 place-items-center rounded-full bg-[#1FAF54] text-white shadow-[0_16px_38px_rgba(31,175,84,0.28)] md:bottom-6 md:right-6"
        aria-label="Chat with DARAJNI on WhatsApp"
      >
        <MessageCircle className="h-5 w-5" />
      </a>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#E9DCCB] bg-[#FFFDF8]/96 px-2 pb-2 pt-2 backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5">
          {mobileLinks.map((item) => {
            const Icon = item.icon;
            const count = item.label === "Wishlist" ? wishlistCount : 0;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="relative flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[0.62rem] font-bold text-[#5F5348]"
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
