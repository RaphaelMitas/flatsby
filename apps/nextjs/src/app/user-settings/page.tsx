import React from "react";

import { prefetch, trpc } from "~/trpc/server";
import DeleteUser from "./DeleteUser";
import ManageUser from "./ManageUser";

export default function Page() {
  prefetch(trpc.shoppingList.getCurrentUser.queryOptions());
  return (
    <div className="flex flex-col p-4 md:pt-16">
      <div className="mx-auto grid w-full max-w-6xl items-start gap-6 lg:grid-cols-[1fr]">
        <div className="mx-auto grid w-full max-w-6xl gap-2">
          <h1 className="text-3xl font-semibold">User Settings</h1>
        </div>
        <div className="grid gap-6"></div>
        <ManageUser />
        <DeleteUser />
      </div>
    </div>
  );
}
