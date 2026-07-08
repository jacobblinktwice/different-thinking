import type { Metadata } from "next";
import localFont from "next/font/local";
import "@fontsource/libre-baskerville/latin-400.css"; // serif for the logotype (melted "exposure" test)
import "./globals.css";

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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
