import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import LinkScramble from "./LinkScramble";
import SmoothScroll from "./SmoothScroll";

const neueMontreal = localFont({
  src: "../fonts/NeueMontreal-Regular.otf",
  variable: "--font-neue-montreal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Different Thinking — An AI research lab",
  description:
    "An AI research lab building products for people who think differently.",
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
