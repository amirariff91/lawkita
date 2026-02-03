import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { GlobalSchemas } from "@/components/seo";
import "./globals.css";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} antialiased`}
      >
        <GlobalSchemas />
        <NuqsAdapter>{children}</NuqsAdapter>
      </body>
    </html>
  );
}
