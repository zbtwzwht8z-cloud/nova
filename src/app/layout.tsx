import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./design-system.css";

export const metadata: Metadata = {
  title: "Nova",
  description: "Klausurtrainer",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Nova",
    statusBarStyle: "default"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#216e62"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
