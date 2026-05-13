import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ramen Analytics",
  description: "Local CSV analytics dashboard for ramen-style-finder quiz events."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
