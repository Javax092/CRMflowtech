import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#0f766e"
};

export const metadata: Metadata = {
  title: "FlowCRM",
  description: "CRM comercial da FlowtechAM",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "FlowCRM",
    statusBarStyle: "default"
  },
  icons: {
    icon: [
      { url: "/flowcrm-icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
