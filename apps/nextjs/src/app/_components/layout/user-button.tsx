"use client";

import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Snowflake } from "lucide-react";

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

import { useWinterEffects } from "~/app/_components/layout/winterTheme/use-winter-effects";
import { useTRPC } from "~/trpc/react";
import { handleApiError } from "~/utils";
import { ModeToggle } from "./ModeToggle";
import UserLogoutButton from "./user-logout-button";

export function UserButton() {
  const trpc = useTRPC();
  const { isEnabled, setEnabled } = useWinterEffects();
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
                <Snowflake className="h-4 w-4" />
                <Label htmlFor="winter-effects" className="cursor-pointer">
                  Winter Effects
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
