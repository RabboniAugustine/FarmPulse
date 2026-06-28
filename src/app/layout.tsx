import type { Metadata, Viewport } from "next";
import "../styles/globals.css";
import Providers from "./providers";

export const viewport: Viewport = {
  themeColor: "#152D09",
};

export const metadata: Metadata = {
  title: {
    default: "FarmPulse — Farm Management",
    template: "%s · FarmPulse",
  },
  description:
    "Track poultry, rabbits, pigs, eggs, expenses, sales, vaccinations, and farm activity — all in one place.",
  applicationName: "FarmPulse",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "FarmPulse — Farm Management",
    description:
      "Track poultry, rabbits, pigs, eggs, expenses, sales, vaccinations, and farm activity — all in one place.",
    siteName: "FarmPulse",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
