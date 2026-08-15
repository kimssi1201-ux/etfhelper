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

async function getRequestOrigin() {
  const incoming = await headers();
  const forwardedHost = incoming.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || incoming.get("host") || "localhost:3000";
  const forwardedProtocol = incoming.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : host.startsWith("localhost")
      ? "http"
      : "https";

  try {
    return new URL(`${protocol}://${host}`);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const origin = await getRequestOrigin();
  const title = "배당계산기 | 미국 배당주 수익 계산";
  const description =
    "실제 최근 12개월 배당 이력과 현재가를 바탕으로 미국 배당주의 월평균·분기·연간 배당금을 계산해 보세요.";
  const socialImage = new URL("/og-dividend-calculator.png", origin).toString();

  return {
    metadataBase: origin,
    title: {
      default: title,
      template: "%s | 배당계산기",
    },
    description,
    applicationName: "배당계산기",
    openGraph: {
      title,
      description,
      type: "website",
      locale: "ko_KR",
      siteName: "배당계산기",
      images: [{
        url: socialImage,
        width: 1730,
        height: 909,
        alt: "배당계산기 미국 배당주 수익 계산",
      }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
