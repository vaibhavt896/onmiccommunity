import type { Metadata, Viewport } from "next";
import { Anton, DM_Sans, Instrument_Serif, Permanent_Marker, Space_Mono } from "next/font/google";
import { SITE_URL } from "@/lib/public-config";
import "./globals.css";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton", display: "swap" });
const instrument = Instrument_Serif({ weight: "400", style: "italic", subsets: ["latin"], variable: "--font-instrument", display: "swap" });
const dmsans = DM_Sans({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-dmsans", display: "swap" });
const spacemono = Space_Mono({ weight: "700", subsets: ["latin"], variable: "--font-spacemono", display: "swap", preload: false });
const marker = Permanent_Marker({ weight: "400", subsets: ["latin"], variable: "--font-marker", display: "swap", preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "On Mic Community · Open mic + jam nights, Kanpur", template: "%s · On Mic Community" },
  description: "Open mic and jam nights in Kanpur for everyone who has something to say (or sing, or spit). 50 seats, prepaid, secret venue.",
  applicationName: "On Mic Community",
};

export const viewport: Viewport = { themeColor: "#0d0616", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${instrument.variable} ${dmsans.variable} ${spacemono.variable} ${marker.variable}`}>
      <body>{children}</body>
    </html>
  );
}

