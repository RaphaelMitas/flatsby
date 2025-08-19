"use client";

import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";

import { Avatar, AvatarFallback, AvatarImage } from "@flatsby/ui/avatar";
import { Button } from "@flatsby/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@flatsby/ui/dropdown-menu";
import { Separator } from "@flatsby/ui/separator";

import { useTRPC } from "~/trpc/react";
import { handleApiError } from "~/utils";
import { ModeToggle } from "./ModeToggle";
import UserLogoutButton from "./user-logout-button";

export function UserButton() {
  const trpc = useTRPC();
  const { data: userWithGroups } = useSuspenseQuery(
    trpc.shoppingList.getCurrentUserWithGroups.queryOptions(),
  );

  if (!userWithGroups.success) {
    return handleApiError(userWithGroups.error);
  }

  const user = userWithGroups.data.user;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.image ?? undefined} alt="user image" />
            <AvatarFallback>
              {user?.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="sr-only">Toggle user menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center gap-4 border-b p-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user?.image ?? undefined} alt="user image" />
            <AvatarFallback>
              {user?.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="grid gap-1">
            <div className="text-lg font-medium">{user?.name}</div>
            <div className="text-sm text-muted-foreground">{user?.email}</div>
          </div>
        </div>
        <div className="p-4">
          <div className="grid gap-2">
            <ModeToggle />
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
