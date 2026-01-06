"use client";

import type { ReactNode } from "react";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@flatsby/ui/sidebar";

import { AppSidebar } from "./app-sidebar";
import { BottomNavigation } from "./bottom-navigation";
import { HomeLink } from "./home-link";

export type AppSection = "group" | "chat" | "user-settings";

interface AppLayoutProps {
  children: ReactNode;
  section: AppSection;
}

export function AppLayout({ children, section }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar section={section} />
      <SidebarInset className="flex h-screen flex-col overflow-hidden">
        <header className="bg-background flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <HomeLink />
        </header>
        <main className="flex min-h-0 flex-1 flex-col overflow-auto pb-16 md:pb-0">
          {children}
        </main>
      </SidebarInset>
      <BottomNavigation />
    </SidebarProvider>
  );
}
