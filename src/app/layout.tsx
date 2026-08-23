import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import {
  OG_IMAGE_PATH,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from "@/lib/site-metadata";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  verification: {
    google: "LXnGM94kDLw16JNHb1gAN7f7R8PM7OV8iyX9kZhh2pw",
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE_PATH],
    type: "website",
    locale: "ja_JP",
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE_PATH],
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#0d9488",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white text-gray-900">
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
