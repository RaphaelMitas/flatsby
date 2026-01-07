import type { Metadata, Viewport } from "next";
import { AutumnProvider } from "autumn-js/react";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { ThemeProvider } from "next-themes";

import { cn } from "@flatsby/ui";
import { Toaster } from "@flatsby/ui/toast";

import { WinterEffectsProvider } from "~/app/_components/layout/winterTheme/use-winter-effects";
import { env } from "~/env";
import { TRPCReactProvider } from "~/trpc/react";
import { WinterSnowWrapper } from "./_components/layout/winterTheme/winter-snow-wrapper";

import "~/app/globals.css";

export const metadata: Metadata = {
  title: "Flatsby",
  description: "Flat Companion",
  icons: [
    {
      rel: "apple-touch-icon",
      sizes: "180x180",
      url: "/apple-touch-icon.png",
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "32x32",
      url: "/favicon-32x32.png",
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "16x16",
      url: "/favicon-16x16.png",
    },
  ],
  manifest: "/site.webmanifest",
  robots: "noindex,nofollow",
  other: {
    "msapplication-TileColor": "#fff",
    "theme-color": "#000",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html className="h-full" lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "bg-background h-full min-h-full overflow-hidden font-sans antialiased",
          GeistSans.variable,
          GeistMono.variable,
        )}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <WinterEffectsProvider>
            <WinterSnowWrapper />
            <TRPCReactProvider>
              <AutumnProvider betterAuthUrl={env.NEXT_PUBLIC_BETTER_AUTH_BASE_URL}>
                {props.children}
              </AutumnProvider>
            </TRPCReactProvider>
            <Toaster />
          </WinterEffectsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
