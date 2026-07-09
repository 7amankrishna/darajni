"use client";

import { Menu, ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import BrandLogo from "@/components/BrandLogo";
import { useCart } from "@/components/cart/cart-provider";

const links = [
  { label: "Shop", href: "/#collection" },
  { label: "Track order", href: "/track" },
  { label: "Support", href: "/support" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[#090909]/92 backdrop-blur-xl">
      <nav
        className="section-shell flex h-[74px] items-center justify-between"
        aria-label="Main navigation"
      >
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3"
          aria-label="DARAJNI home"
        >
          <BrandLogo
            className="h-11 w-11 border border-[#caaa70]/35"
          />
          <span>
            <span className="font-display block text-[1.55rem] leading-none tracking-[0.13em]">
              DARAJNI
            </span>
            <span className="mt-1 block text-[0.52rem] font-bold uppercase tracking-[0.28em] text-[#caaa70]">
              Designer House
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60 transition hover:text-[#e0c083]"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/cart"
            className="relative grid h-10 w-10 place-items-center rounded-full border border-[#caaa70]/45 text-[#e4c58c] transition hover:bg-[#caaa70]/10"
            aria-label={`Cart with ${itemCount} item${itemCount === 1 ? "" : "s"}`}
          >
            <ShoppingBag className="h-4 w-4" />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#caaa70] px-1 text-[0.6rem] font-bold text-black">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/cart"
            className="relative grid h-11 w-11 place-items-center rounded-full border border-white/10"
            aria-label={`Cart with ${itemCount} item${itemCount === 1 ? "" : "s"}`}
          >
            <ShoppingBag className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#caaa70] px-1 text-[0.6rem] font-bold text-black">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </Link>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full border border-white/10"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label="Toggle navigation"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-white/8 bg-[#0c0c0b] px-5 py-5 md:hidden">
          <div className="flex flex-col gap-1">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3 text-sm text-white/75"
            >
              Home
            </Link>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-sm text-white/75"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/cart"
              onClick={() => setOpen(false)}
              className="primary-button mt-2"
            >
              View cart {itemCount > 0 ? `(${itemCount})` : ""}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
