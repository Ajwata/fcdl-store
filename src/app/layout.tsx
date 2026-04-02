import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const displayFont = Montserrat({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const bodyFont = Montserrat({
  variable: "--font-body",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "FCDL.STORE",
    template: "%s | FCDL.STORE",
  },
  description: "Сервіс бронювання футбольного поля, матчів і керування орендою.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="uk"
      className={`${displayFont.variable} ${bodyFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
