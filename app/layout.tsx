import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pack Pullers | Choose Your Adventure",
  description: "A celestial arcade for collectors opening The Hobbit Collector Booster.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
