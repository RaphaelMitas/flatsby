"use client";

import React from "react";
import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";

import { Button } from "@flatsby/ui/button";

import { useTRPC } from "~/trpc/react";
import { handleApiError } from "~/utils";
import GroupsDashboardElement from "./GroupsDashboardElement";

export function GroupsDashboard() {
  const trpc = useTRPC();
  const { data: groups, status } = useSuspenseQuery(
    trpc.shoppingList.getUserGroups.queryOptions(),
  );

  if (!groups.success) {
    return handleApiError(groups.error);
  }

  return (
    <section className="h-full w-full max-w-prose">
      <div className="flex h-full w-full flex-col gap-6 p-4 md:p-6">
        <div className="flex h-fit items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            Your Groups
          </h2>
          <Link
            className="inline-flex h-9 items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-gray-50 shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50 dark:bg-gray-50 dark:text-gray-900 dark:focus-visible:ring-gray-300 md:hover:bg-gray-900/90 md:dark:hover:bg-gray-50/90"
            href="group/create"
          >
            Create Group
          </Link>
        </div>

        {status === "success" && groups.data.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <div className="text-center text-lg font-semibold">
              You are not a member of any groups.
            </div>
            <Button asChild className="mx-auto grid max-w-6xl gap-2">
              <Link href="/group/create">Create a Group</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {groups.data.map((group) => (
              <GroupsDashboardElement
                key={group.id}
                link={`/group/${group.id}`}
                groupName={group.name}
                memberCount={group.memberCount}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
