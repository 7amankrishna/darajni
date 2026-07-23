import { BadgeCheck, MapPin, MessageCircle, Ruler, ShieldCheck } from "lucide-react";
import Link from "next/link";

import BrandLogo from "./BrandLogo";

const promises = [
  ["Clear totals", "Tax and shipping are shown before payment."],
  ["Custom fit support", "Measurements are confirmed after ordering."],
  ["Secure checkout", "COD and PayU options are shown clearly."],
  ["Pan-India delivery", "Orders are packed with tracking support."],
];

export default function About() {
  return (
    <section id="about" className="bg-[#FFF8EF] py-20 sm:py-28">
      <div className="section-shell grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20">
        <div className="relative min-h-[430px] overflow-hidden rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-6 shadow-[0_24px_80px_rgba(83,54,22,0.09)] sm:min-h-[560px] sm:p-8">
          <div className="absolute inset-x-0 top-0 h-28 bg-[#6E0F1A]" />
          <div className="relative z-10 grid h-full min-h-[380px] place-items-center rounded-2xl border border-[#E9DCCB] bg-[#F6E9DD]">
            <BrandLogo className="h-56 w-56 border border-[#B8893B]/25 bg-[#FFFDF8] shadow-[0_22px_70px_rgba(83,54,22,0.12)] sm:h-80 sm:w-80" />
            <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8]/92 p-5 backdrop-blur-md sm:inset-x-7 sm:bottom-7 sm:p-7">
              <p className="font-display text-3xl leading-none text-[#171717]">
                Rooted in Bihar Sharif. Designed to travel.
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm leading-6 text-[#6F6255]">
                <MapPin className="h-4 w-4 text-[#B8893B]" />
                Bihar Sharif 803111, serving customers throughout India.
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="eyebrow">Brand story</p>
          <h2 className="font-display mt-5 text-5xl leading-[0.95] text-[#171717] sm:text-6xl">
            A boutique label with
            <span className="block italic text-[#6E0F1A]">real care at its centre.</span>
          </h2>
          <p className="mt-7 text-base leading-8 text-[#5F5348]">
            DARAJNI began in Bihar Sharif with a simple promise: present every
            design honestly, help every customer choose the right fit and
            deliver occasion wear with care.
          </p>
          <p className="mt-5 text-base leading-8 text-[#5F5348]">
            The store is built around clear prices, secure ordering, useful
            updates, guest checkout and order tracking with an order ID and
            matching phone number.
          </p>

          <div className="mt-9 grid gap-3 sm:grid-cols-2">
            {promises.map(([title, text], index) => {
              const icons = [BadgeCheck, Ruler, ShieldCheck, MessageCircle];
              const Icon = icons[index];
              return (
                <div key={title} className="rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-5">
                  <Icon className="h-5 w-5 text-[#B8893B]" />
                  <p className="font-display mt-4 text-2xl text-[#171717]">{title}</p>
                  <p className="mt-2 text-xs leading-6 text-[#6F6255]">{text}</p>
                </div>
              );
            })}
          </div>

          <Link href="/about" className="secondary-button mt-8">
            Read Our Story
          </Link>
        </div>
      </div>
    </section>
  );
}
