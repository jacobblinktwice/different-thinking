import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SITE_URL } from "./site";
import LinkScramble from "./LinkScramble";
import SmoothScroll from "./SmoothScroll";

const neueMontreal = localFont({
  src: "../fonts/NeueMontreal-Regular.otf",
  variable: "--font-neue-montreal",
  display: "swap",
});

const TITLE = "Different Thinking — An AI research lab";
const DESCRIPTION = "An AI research lab building products for people who think differently.";

/* metadataBase is what makes the OG image resolve to an absolute URL — without
   it Next warns and social cards come out imageless. The image itself is
   src/app/opengraph-image.png, which Next picks up by file convention and
   attaches to every route, so it needs no entry here.

   No title template: each page already sets its own complete title. */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Different Thinking",
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    locale: "en_GB",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${neueMontreal.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        {/* site-wide: smooth scrolling and the link hover scramble */}
        <SmoothScroll />
        <LinkScramble />
      </body>
    </html>
  );
}
