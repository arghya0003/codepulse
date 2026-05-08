import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "CodePulse — Your Coding Journey, Unified",
    template: "%s | CodePulse",
  },
  description:
    "Track your coding progress across GitHub, LeetCode, Codeforces, and CodeChef — all in one beautiful dashboard with ML-powered insights.",
  keywords: ["coding tracker", "leetcode", "github", "codeforces", "developer analytics", "contribution graph"],
  authors: [{ name: "CodePulse" }],
  creator: "CodePulse",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "CodePulse — Your Coding Journey, Unified",
    description: "Track your coding progress across all major platforms in one beautiful dashboard.",
    siteName: "CodePulse",
  },
  twitter: {
    card: "summary_large_image",
    title: "CodePulse",
    description: "Track your coding journey across GitHub, LeetCode, Codeforces, and more.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
