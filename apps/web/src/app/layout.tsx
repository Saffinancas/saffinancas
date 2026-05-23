import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-instrument-serif",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.oneLiner,
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: BRAND.name,
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.oneLiner,
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.oneLiner,
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF7" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1115" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${inter.variable} ${instrumentSerif.variable}`}>
      <body className="bg-bg text-fg antialiased min-h-dvh">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
