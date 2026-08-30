import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";

import { SiteShell } from "@/components/layout/site-shell";
import { siteConfig } from "@/config/site";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: {
    default: `${siteConfig.name} | Wear Confidence`,
    template: `%s | ${siteConfig.shortName}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  manifest: "/site.webmanifest",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: siteConfig.name,
    title: `${siteConfig.name} | Wear Confidence`,
    description: siteConfig.description,
    images: ["/og-cover.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: ["/og-cover.svg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google tag (gtag.js) */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-7QM5DMJ34G"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-7QM5DMJ34G');
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${cormorant.variable} antialiased`}>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}