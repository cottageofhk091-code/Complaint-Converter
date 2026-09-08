import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";
import "./globals.css";

const APP_NAME = "Smartお詫びコンシェルジュ";
const APP_DESCRIPTION =
  "〜クレーム対応からお詫びメールまで、AIが即座に最適化〜";

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="flex min-h-screen flex-col antialiased">
        <Providers>
          <div className="flex-1">{children}</div>
          <Footer />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}