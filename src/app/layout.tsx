import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import { RegisterSW } from "@/components/RegisterSW";
import { site } from "@/lib/site";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["400", "600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Nathora Technologies — Web, Mobile Apps, Software & Cloud",
    template: "%s · Nathora Technologies",
  },
  description:
    "Nathora Technologies builds websites, Android & iOS apps, custom software and cloud solutions with Angular, .NET and Android. Guiding your business into the digital era.",
  keywords: [
    "Nathora Technologies",
    "Nathora",
    "IT solutions Kerala",
    "website development Alappuzha",
    "Android app development Kerala",
    "Angular developer",
    ".NET developer",
    "custom software development",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Nathora Technologies",
    title: "Nathora Technologies — Web, Mobile Apps, Software & Cloud",
    description: "Websites, Android apps, custom software and cloud solutions. Guiding your business into the digital era.",
    locale: "en_IN",
  },
  robots: { index: true, follow: true },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
  applicationName: "Nathora",
  appleWebApp: { capable: true, title: "Nathora", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#0B1530",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body className="min-h-dvh">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
