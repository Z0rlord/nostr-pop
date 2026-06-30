import type { Metadata, Viewport } from "next";
import { Fjalla_One, Lato } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";
import { StagingBanner } from "@/components/StagingBanner";
import { I18nProvider } from "@/components/I18nProvider";

const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-lato",
  display: "swap",
});

const fjalla = Fjalla_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-fjalla",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TENSHINRYU ONLINE KIWAMI -極-",
  description:
    "Learn Tenshinryu Hyoho from anywhere in the world. Traditional wisdom. Modern technology.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tenshinryu KIWAMI",
  },
};

export const viewport: Viewport = {
  themeColor: "#a83f3f",
  width: "device-width",
  initialScale: 1,
};

function authDomainForClient(): string {
  const raw =
    process.env.TENSHINRYU_FIREBASE_AUTH_DOMAIN ||
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "auth.tenshinryu.xyz";
  return raw.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const authDomain = authDomainForClient();

  return (
    <html lang="en" className={`${lato.variable} ${fjalla.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__TENSHINRYU_AUTH_DOMAIN__=${JSON.stringify(authDomain)};`,
          }}
        />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="font-body antialiased">
        <I18nProvider initialLocale="en">
          <StagingBanner />
          <PwaRegister />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
