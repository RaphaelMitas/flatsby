import { ScrollArea } from "@flatsby/ui/scroll-area";

import { AppBar } from "./app-bar";
import { BottomNavigation } from "./bottom-navigation";

export function Navigation({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <header className="fixed top-0 z-50 w-full bg-background">
        <AppBar />
      </header>
      <ScrollArea className="mb-16 mt-16 h-full md:mb-0">
        <main className="flex w-full justify-center">{children}</main>
      </ScrollArea>
      <BottomNavigation />
    </div>
  );
}
