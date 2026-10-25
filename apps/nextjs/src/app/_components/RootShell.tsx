import type { Metadata, Viewport } from "next";
import { AutumnProvider } from "autumn-js/react";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { ThemeProvider } from "next-themes";

import { cn } from "@flatsby/ui";
import { Toaster } from "@flatsby/ui/toast";
import { APP_STORE_ID } from "@flatsby/validators/store";

import { AnalyticsProvider } from "~/app/_components/analytics/AnalyticsProvider";
import { SITE_URL } from "~/app/_components/landing/content";
import { TRPCReactProvider } from "~/trpc/react";

import "~/app/globals.css";

export const rootMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Flatsby",
  // i18n-ignore: noindex meta description, never shown in the app
  // i18n-ignore
  description: "Flat Companion",
  icons: [
    {
      rel: "icon",
      type: "image/png",
      sizes: "96x96",
      url: "/favicon-96x96.png",
    },
    {
      rel: "icon",
      type: "image/svg+xml",
      url: "/favicon.svg",
    },
    {
      rel: "shortcut icon",
      url: "/favicon.ico",
    },
    {
      rel: "apple-touch-icon",
      sizes: "180x180",
      url: "/apple-touch-icon.png",
    },
  ],
  itunes: { appId: APP_STORE_ID },
  robots: "noindex,nofollow",
  other: {
    "apple-mobile-web-app-title": "Flatsby",
  },
};

export const rootViewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export function RootShell(props: { lang: string; children: React.ReactNode }) {
  return (
    <html className="h-full" lang={props.lang} suppressHydrationWarning>
      <body
        className={cn(
          "bg-background h-full min-h-full overflow-hidden font-sans antialiased",
          GeistSans.variable,
          GeistMono.variable,
        )}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TRPCReactProvider>
            <AutumnProvider pathPrefix="/api/autumn" includeCredentials>
              <AnalyticsProvider>{props.children}</AnalyticsProvider>
            </AutumnProvider>
          </TRPCReactProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
