import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { NextAuthProvider } from "@/components/providers/NextAuthProvider";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "전국체육대회 성적 분석 대시보드",
  description: "경기도체육회 - 전국체육대회 성적 데이터 분석 및 관리 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <NextAuthProvider>
          <div className="flex min-h-screen flex-col">
            <Suspense fallback={null}>
              <Header />
            </Suspense>
            <main className="flex-1 container mx-auto py-6 px-4">
              {children}
            </main>
            <Footer />
          </div>
          <Toaster position="top-right" richColors />
        </NextAuthProvider>
      </body>
    </html>
  );
}
