"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus, ShoppingBasket } from "lucide-react";
import { useTranslations } from "next-intl";

import { useGroupContext } from "~/app/_components/context/group-context";
import { Switcher } from "~/app/_components/switcher/Switcher";
import { useTRPC } from "~/trpc/react";
import { EditListDialog } from "../ListDialogs";

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
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(
    null,
  );
  const { data } = useQuery(
    trpc.shoppingList.getShoppingLists.queryOptions({ groupId }),
  );
  const lists = data?.success ? data.data : [];
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
          more: {
            label: t("switcher.moreFor", { name: list.name }),
            onSelect: () => setEditing({ id: list.id, name: list.name }),
          },
        }))}
        selectedId={shoppingListId}
        onSelect={(list) => {
          if (list.id !== shoppingListId)
            router.push(`/shopping-list/${list.id}`);
        }}
        actions={[
          {
            testId: "shopping-list-switcher-new",
            icon: Plus,
            title: t("switcher.newList"),
            onSelect: () => router.push("/shopping-list/new"),
          },
        ]}
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
