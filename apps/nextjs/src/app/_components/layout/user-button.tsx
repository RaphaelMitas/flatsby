"use client";

import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Flower2 } from "lucide-react";

import { Button } from "@flatsby/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@flatsby/ui/dropdown-menu";
import { Label } from "@flatsby/ui/label";
import { Separator } from "@flatsby/ui/separator";
import { UserAvatar } from "@flatsby/ui/user-avatar";

import { useSpringEffects } from "~/app/_components/layout/springTheme/use-spring-effects";
import { useTRPC } from "~/trpc/react";
import { useHandleApiError } from "~/utils";
import { ModeToggle } from "./ModeToggle";
import UserLogoutButton from "./user-logout-button";

export function UserButton() {
  const trpc = useTRPC();
  const { isEnabled, setEnabled } = useSpringEffects();
  const handleApiError = useHandleApiError();
  const { data: userWithGroups } = useSuspenseQuery(
    trpc.user.getCurrentUserWithGroups.queryOptions(),
  );

  if (!userWithGroups.success) {
    return handleApiError(userWithGroups.error);
  }

  const user = userWithGroups.data.user;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <UserAvatar name={user?.name ?? ""} image={user?.image} size="lg" />
          <span className="sr-only">Toggle user menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center gap-4 border-b p-4">
          <UserAvatar name={user?.name ?? ""} image={user?.image} size="xl" />
          <div className="grid gap-1">
            <div className="text-lg font-medium">{user?.name}</div>
            <div className="text-muted-foreground text-sm">{user?.email}</div>
          </div>
        </div>
        <div className="p-4">
          <div className="grid gap-2">
            <ModeToggle />
            <Button
              variant={isEnabled ? "primary" : "outline"}
              className="w-full"
              onClick={() => setEnabled((prev) => !prev)}
            >
              <div className="flex items-center gap-2">
                <Flower2 className="h-4 w-4" />
                <Label htmlFor="spring-effects" className="cursor-pointer">
                  Spring Effects
                </Label>
              </div>
            </Button>
            <Link href="/user-settings">
              <Button variant="outline" className="w-full">
                <DropdownMenuItem className="cursor-pointer">
                  Profile Settings
                </DropdownMenuItem>
              </Button>
            </Link>
            <Separator className="my-4" />
            <UserLogoutButton />
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
