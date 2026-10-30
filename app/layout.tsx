import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Boost Market — Agentic AI Advertising SaaS Platform",
  description: "Agentic AI-powered advertising orchestration platform designed to simplify digital advertising for businesses.",
  openGraph: {
    title: "Boost Market — Agentic AI Advertising SaaS Platform",
    description: "Agentic AI-powered advertising orchestration platform designed to simplify digital advertising for businesses.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Boost Market — Agentic AI Advertising SaaS Platform",
    description: "Agentic AI-powered advertising orchestration platform designed to simplify digital advertising for businesses.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
