import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Nunito } from "next/font/google";
import EntryModal from "@/components/shared/EntryModal";
import Navbar from "@/components/shared/Navbar";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito-body",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const nunitoHeading = Nunito({
  variable: "--font-nunito-heading",
  subsets: ["latin"],
  weight: "900",
});

export const metadata: Metadata = {
  title: "VineMe",
  description: "Helping UK churches connect people into small groups.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${nunitoHeading.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-brand-dark">
        <Navbar />
        <main className="flex-1">{children}</main>
        <EntryModal />
        <Analytics />
      </body>
    </html>
  );
}
