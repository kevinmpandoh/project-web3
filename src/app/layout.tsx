import type { Metadata } from "next";
import "@/styles.css";
import "@/wallet-adapter.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Ansem Land",
  description:
    "A cozy multiplayer farming game on Solana. Plant crops, level up, and grow your land right in the browser. Open beta.",
  openGraph: {
    title: "Ansem Land",
    description:
      "A cozy multiplayer farming game on Solana. Plant crops, level up, and grow your land right in the browser. Open beta.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ansem Land",
    description:
      "A cozy multiplayer farming game on Solana. Plant crops, level up, and grow your land right in the browser. Open beta.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Nunito:wght@400;600;700;800&display=swap"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
