import type { Metadata } from "next";
import { MEMBERSHIP_PRICE_USD } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Join DojoPop",
  description: `Proof-of-practice for martial artists — film daily sessions, build a verifiable log on Nostr. $${MEMBERSHIP_PRICE_USD}/month.`,
  openGraph: {
    title: "Join DojoPop — proof of practice",
    description:
      "Film your training, own your log on Nostr. Kenjutsu, aikido, HEMA, 52vtk, and more.",
    url: "https://dojopop.live/join",
    siteName: "DojoPop",
    type: "website",
    images: [
      {
        url: "/hero-dojo.jpg",
        width: 1024,
        height: 576,
        alt: "DojoPop — join the dojo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Join DojoPop",
    description: "Verifiable martial arts practice on the open web.",
    images: ["/hero-dojo.jpg"],
  },
};

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}
