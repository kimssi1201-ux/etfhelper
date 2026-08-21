import type { Metadata } from "next";
import { Geist, IBM_Plex_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-data-mono",
  weight: ["400", "500", "600", "700"],
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
  const title = "키워드랩 | 포털 키워드 검색량 도구";
  const description =
    "키워드 검색량, 모바일 비중, 연관 키워드와 경쟁도를 한 화면에서 확인하는 포털 키워드 분석 도구입니다.";

  return {
    metadataBase: origin,
    title: {
      default: title,
      template: "%s | 모아봄",
    },
    description,
    applicationName: "키워드랩",
    openGraph: {
      title,
      description,
      type: "website",
      locale: "ko_KR",
      siteName: "키워드랩",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
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
      <body className={`${geistSans.variable} ${ibmPlexMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
