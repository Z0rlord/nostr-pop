import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DojoPop — Proof of Practice on Nostr",
  description:
    "Nostr-native proof-of-practice for sword training. Record practice, upload via Blossom, publish kind 34567 events.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://dojopop.live"
  ),
  openGraph: {
    title: "DojoPop",
    description: "Proof-of-practice protocol on Nostr",
    url: "https://dojopop.live",
    siteName: "DojoPop",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans min-h-screen">{children}</body>
    </html>
  );
}
