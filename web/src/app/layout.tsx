import type { Metadata } from "next";
import { I18nProvider } from "@/i18n/context";
import { getDictionary } from "@/i18n/get-dictionary";
import { getLocale } from "@/i18n/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "DojoPop — Proof of Practice on Nostr",
  description:
    "Proof-of-practice on Nostr for all martial artists — kenjutsu, HEMA, fencing, and more. Film, share, and verify your training.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://dojopop.live"
  ),
  openGraph: {
    title: "DojoPop",
    description: "Proof-of-practice for every martial artist — on Nostr",
    url: "https://dojopop.live",
    siteName: "DojoPop",
    type: "website",
    images: [
      {
        url: "/hero-dojo.jpg",
        width: 1024,
        height: 576,
        alt: "DojoPop — martial arts practice on the open web",
      },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  return (
    <html lang={locale}>
      <body className="font-sans min-h-screen">
        <I18nProvider locale={locale} dictionary={dictionary}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
