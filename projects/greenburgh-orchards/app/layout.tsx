import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "greenburghorchards.com";
  const protocol = host.includes("localhost") ? "http" : "https";

  return {
    metadataBase: new URL(`${protocol}://${host}`),
    title: "Greenburgh Orchards — Clothing Shaped by the Orchard",
    description: "Small-edition garments from Greenburgh, New York. Useful pieces, quietly made.",
    openGraph: {
      title: "Greenburgh Orchards",
      description: "Clothing shaped by the orchard.",
      images: [{ url: "/og.png", width: 1792, height: 939, alt: "Greenburgh Orchards Verger Neigeux shirt" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Greenburgh Orchards",
      description: "Clothing shaped by the orchard.",
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
