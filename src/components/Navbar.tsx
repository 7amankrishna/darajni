import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BrandLogo from "./BrandLogo";

const sectionLinks = [
  { label: "Collection", href: "/#collection" },
  { label: "Our Story", href: "/#about" },
  { label: "Contact", href: "/#contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, profile, isAdmin } = useAuth();
  const location = useLocation();

  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[#090909]/92 backdrop-blur-xl">
      <nav className="section-shell flex h-[74px] items-center justify-between" aria-label="Main navigation">
        <Link to="/" onClick={close} className="flex items-center gap-3" aria-label="DARAJNI home">
          <BrandLogo className="h-11 w-11 border border-[#caaa70]/35" priority />
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
          {sectionLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60 transition hover:text-[#e0c083]"
            >
              {link.label}
            </a>
          ))}
          {user ? (
            <NavLink
              to={isAdmin ? "/admin" : "/dashboard"}
              className="secondary-button !min-h-9 !px-4 !py-2"
            >
              {isAdmin ? "Admin" : profile?.fullName.split(" ")[0] || "Account"}
            </NavLink>
          ) : (
            <NavLink to="/login" className="secondary-button !min-h-9 !px-4 !py-2">
              Sign in
            </NavLink>
          )}
        </div>

        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-full border border-white/10 md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label="Toggle navigation"
        >
          <span className="text-xl">{open ? "×" : "☰"}</span>
        </button>
      </nav>

      {open && (
        <div className="border-t border-white/8 bg-[#0c0c0b] px-5 py-5 md:hidden">
          <div className="flex flex-col gap-1">
            <Link to="/" onClick={close} className="rounded-lg px-3 py-3 text-sm text-white/75">
              Home
            </Link>
            {sectionLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={close}
                className="rounded-lg px-3 py-3 text-sm text-white/75"
              >
                {link.label}
              </a>
            ))}
            <Link
              to={user ? (isAdmin ? "/admin" : "/dashboard") : "/login"}
              state={!user && location.pathname !== "/" ? { from: location.pathname } : undefined}
              onClick={close}
              className="mt-2 primary-button"
            >
              {user ? (isAdmin ? "Admin dashboard" : "My dashboard") : "Sign in"}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
