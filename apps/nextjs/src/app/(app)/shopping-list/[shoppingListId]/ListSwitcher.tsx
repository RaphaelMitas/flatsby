"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus, ShoppingBasket } from "lucide-react";
import { useTranslations } from "next-intl";

import { useGroupContext } from "~/app/_components/context/group-context";
import { Switcher } from "~/app/_components/switcher/Switcher";
import { useTRPC } from "~/trpc/react";
import { CreateListDialog, EditListDialog } from "../ListDialogs";

export function ListSwitcher({
  groupId,
  shoppingListId,
  name,
}: {
  groupId: number;
  shoppingListId: number;
  name: string;
}) {
  const t = useTranslations("shoppingList");
  const trpc = useTRPC();
  const router = useRouter();
  const { currentGroup } = useGroupContext();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(
    null,
  );
  const { data } = useQuery(
    trpc.shoppingList.getShoppingLists.queryOptions({ groupId }),
  );
  // A list still being created has a placeholder id and can't be opened yet
  const lists = (data?.success ? data.data : []).filter(({ id }) => id > 0);
  const current = lists.find(({ id }) => id === shoppingListId);
  const itemsLeft = (count: number) => t("itemsLeft", { count });

  return (
    <>
      <Switcher
        testId="shopping-list-switcher"
        icon={ShoppingBasket}
        title={current?.name ?? name}
        subtitle={
          current
            ? `${itemsLeft(current.uncheckedItemLength)} · ${t("switcher.listCount", { count: lists.length })}`
            : ""
        }
        menuTitle={t("switcher.title")}
        caption={currentGroup?.name}
        items={lists.map((list) => ({
          id: list.id,
          title: list.name,
          subtitle: itemsLeft(list.uncheckedItemLength),
        }))}
        selectedId={shoppingListId}
        onSelect={(list) => {
          if (list.id !== shoppingListId)
            router.push(`/shopping-list/${list.id}`);
        }}
        onMore={(list) => setEditing({ id: list.id, name: list.title })}
        moreLabel={(list) => t("switcher.moreFor", { name: list.title })}
        actions={[
          {
            testId: "shopping-list-switcher-new",
            icon: Plus,
            title: t("switcher.newList"),
            onSelect: () => setCreating(true),
          },
        ]}
      />
      <CreateListDialog
        groupId={groupId}
        open={creating}
        onOpenChange={setCreating}
      />
      <EditListDialog
        groupId={groupId}
        list={editing}
        isOpenList={editing?.id === shoppingListId}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      />
    </>
  );
}
