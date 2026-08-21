import type { Metadata } from "next";
import { Fredoka, Inter } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "@/components/settings-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/**
 * CookieRun's own font is Devsisters' and not ours to redistribute, so display
 * type uses Fredoka -- the closest freely-licensed match: geometric, rounded
 * terminals, heavy weights. Body text is Inter, which sits close to Apple's
 * SF Text and carries the Latin-extended glyphs Tagalog and Malay need.
 *
 * next/font self-hosts both at build time: no runtime request to Google.
 */
const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fredoka",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OvenBase — CookieRun: Braverse card prices",
  description:
    "A community price baseline for CookieRun: Braverse singles and decks, in SGD, PHP, IDR and MYR.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fredoka.variable} ${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SettingsProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </SettingsProvider>
      </body>
    </html>
  );
}
