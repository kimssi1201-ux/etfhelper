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
  const title = "모아봄 | 여러 커뮤니티 인기글을 한눈에";
  const description =
    "여러 커뮤니티의 공개 게시글 제목과 메타데이터, 직접 작성한 짧은 요약을 한곳에서 확인하고 원문으로 이동하세요.";

  return {
    metadataBase: origin,
    title: {
      default: title,
      template: "%s | 모아봄",
    },
    description,
    applicationName: "모아봄",
    openGraph: {
      title,
      description,
      type: "website",
      locale: "ko_KR",
      siteName: "모아봄",
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
