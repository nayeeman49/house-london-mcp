import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, Instrument_Serif, Playfair_Display } from "next/font/google";
import { PageMotion } from "@/components/PageMotion";
import "./globals.css";

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif",
});

const display = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const elegant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-elegant",
});

export const metadata: Metadata = {
  title: "HouseData Engine | Unified Policy Analytics via MCP",
  description: "London planning data — unified policy analytics via Model Context Protocol. House London #2.",
  openGraph: {
    title: "HouseData Engine",
    description: "182k London planning applications — map, chat, and evidence desk via MCP.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${display.variable} ${elegant.variable}`}>
      <body className="min-h-screen antialiased font-sans">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <PageMotion>{children}</PageMotion>
      </body>
    </html>
  );
}
