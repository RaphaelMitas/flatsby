"use client";

import type { ReactNode } from "react";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@flatsby/ui/sidebar";

import { ChatSidebar } from "./_components/chat-sidebar";

interface ChatLayoutProps {
  children: ReactNode;
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <SidebarProvider className="h-[calc(100vh-4rem)]">
      <ChatSidebar />
      <SidebarInset className="flex h-full flex-col overflow-hidden">
        <header className="bg-background flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
