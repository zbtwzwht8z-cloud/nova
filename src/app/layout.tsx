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
      <head>
        {/* Applies the saved theme before first paint. Without it the page
            renders light and then flips, which is worse than no dark mode. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("nova-theme");if(["light","papier","rose","dim","nachtblau","dark"].indexOf(t)>-1){document.documentElement.dataset.theme=t}}catch(e){}`
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
