"use client";

import type { ReactNode } from "react";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@flatsby/ui/sidebar";

import { GroupContextProvider } from "~/app/_components/context/group-context";
import { AppSidebar } from "./app-sidebar";
import { BottomNavigation } from "./bottom-navigation";
import { HomeLink } from "./home-link";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <GroupContextProvider>
        <AppSidebar />
        <SidebarInset className="flex h-screen flex-col overflow-hidden">
          <header className="bg-background flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <HomeLink />
          </header>
          <div className="flex min-h-0 flex-1 flex-col overflow-auto pb-16 md:pb-0">
            {children}
          </div>
        </SidebarInset>
        <BottomNavigation />
      </GroupContextProvider>
    </SidebarProvider>
  );
}
