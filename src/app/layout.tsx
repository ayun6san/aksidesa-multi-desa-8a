import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/error-boundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AKSIDESA - Sistem Informasi Digital Desa",
  description: "Aplikasi Sistem Informasi Digital Desa yang terintegrasi untuk pelayanan masyarakat yang lebih baik.",
  keywords: ["AKSIDESA", "Sistem Desa", "Pelayanan Desa", "E-Government", "Digital Desa", "Kependudukan", "Multi Desa"],
  authors: [{ name: "AKSIDESA Team" }],
  icons: {
    icon: "/favicon-new.png",
    apple: "/favicon-new.png",
  },
  openGraph: {
    title: "AKSIDESA - Sistem Informasi Digital Desa",
    description: "Sistem Informasi Digital Desa yang terintegrasi untuk pelayanan masyarakat yang lebih baik.",
    siteName: "AKSIDESA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AKSIDESA - Sistem Informasi Digital Desa",
    description: "Sistem Informasi Digital Desa yang terintegrasi untuk pelayanan masyarakat yang lebih baik.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ErrorBoundary>
          {children}
          <Toaster />
        </ErrorBoundary>
      </body>
    </html>
  );
}
