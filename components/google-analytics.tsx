"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { analyticsPagePath, googleAnalyticsId } from "@/lib/analytics";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

export function GoogleAnalytics() {
  const pathname = usePathname();
  const previousPage = useRef<string | null>(null);
  const initialized = useRef(false);
  const validId = /^G-[A-Z0-9]+$/.test(googleAnalyticsId);
  const path = analyticsPagePath(pathname);
  const enabled = process.env.NODE_ENV === "production" && validId;

  useEffect(() => {
    if (!enabled) return;
    const target = window;
    target[`ga-disable-${googleAnalyticsId}`] = !path;
    if (!path) {
      previousPage.current = null;
      return;
    }
    target.dataLayer ??= [];
    target.gtag ??= function () { target.dataLayer!.push(arguments); };
    if (!initialized.current) {
      target.gtag("js", new Date());
      target.gtag("config", googleAnalyticsId, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        page_location: `${window.location.origin}${path}`,
        page_referrer: "",
      });
      initialized.current = true;
    }
    if (previousPage.current === path) return;
    target.gtag("set", { page_location: `${window.location.origin}${path}`, page_referrer: previousPage.current ? `${window.location.origin}${previousPage.current}` : "" });
    target.gtag("event", "page_view", {
      send_to: googleAnalyticsId,
      page_title: document.title,
      page_location: `${window.location.origin}${path}`,
      page_referrer: previousPage.current ? `${window.location.origin}${previousPage.current}` : "",
    });
    previousPage.current = path;
  }, [enabled, path]);

  if (!enabled || !path) return null;
  return <Script id="darajni-google-analytics" src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`} strategy="afterInteractive" />;
}
