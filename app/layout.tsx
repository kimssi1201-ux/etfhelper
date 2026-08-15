import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "localhost:3000";
  const protocol = incoming.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = new URL(`${protocol}://${host}`);
  const socialImage = new URL("/og.png", origin).toString();
  const title = "ETF FLOW | 국내·미국 ETF 배당 계산기";
  const description = "배당으로 만드는 나만의 현금흐름. 국내·미국 ETF의 최근 배당률과 세전·세후 예상 배당금을 한눈에 계산하세요.";
  return {
    metadataBase: origin,
    title,
    description,
    icons: { icon: "/og.png", shortcut: "/og.png" },
    openGraph: { title, description, type: "website", images: [{ url: socialImage, width: 1731, height: 909, alt: "ETF FLOW 배당으로 만드는 나만의 현금흐름" }] },
    twitter: { card: "summary_large_image", title, description, images: [socialImage] },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
