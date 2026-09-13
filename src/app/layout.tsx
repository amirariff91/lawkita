import { GoogleTagManager } from "@next/third-parties/google";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { GlobalSchemas } from "@/components/seo";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://lawkita.com";
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "LawKita - Malaysia Lawyer Directory",
    template: "%s | LawKita",
  },
  description:
    "Find the right lawyer in Malaysia. Browse 5,000+ verified lawyers, explore famous cases, and read verified reviews.",
  keywords: [
    "lawyer",
    "attorney",
    "legal",
    "Malaysia",
    "directory",
    "law firm",
    "legal services",
  ],
  authors: [{ name: "LawKita" }],
  openGraph: {
    type: "website",
    locale: "en_MY",
    siteName: "LawKita",
  },
  other: {
    "color-scheme": "light dark",
  },
  // Search Console ownership is verified via a DNS TXT record on lawkita.com,
  // so no meta-tag verification is needed. If you ever switch to HTML-tag
  // verification, uncomment and set the token here:
  // verification: { google: process.env.GOOGLE_SITE_VERIFICATION },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Consent defaults must be declared before GTM initialises so the GA4
            Config Tag sees them on the first page view. Analytics granted by
            default; wire this to a real consent banner when one is added. */}
        {GTM_ID && (
          <script
            dangerouslySetInnerHTML={{
              __html: [
                `window.dataLayer=window.dataLayer||[];`,
                `function gtag(){dataLayer.push(arguments);}`,
                `gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied'});`,
              ].join(""),
            }}
          />
        )}
      </head>
      {GTM_ID && <GoogleTagManager gtmId={GTM_ID} />}
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} antialiased`}
      >
        {GTM_ID && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
              title="Google Tag Manager"
            />
          </noscript>
        )}
        <GlobalSchemas />
        <NuqsAdapter>{children}</NuqsAdapter>
      </body>
    </html>
  );
}
