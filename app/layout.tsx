import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tellium — living artwork",
  description: "The first living artwork created by humanity.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
