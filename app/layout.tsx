import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Unified AI Chat Studio",
  description: "Multi-provider AI chat studio for OpenAI, Claude, Gemini, Grok, and NVIDIA.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className={`${inter.className} min-h-screen antialiased`}>{children}</body>
    </html>
  );
}
