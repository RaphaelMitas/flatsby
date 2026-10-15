import type { CategoryIdWithAiAutoSelect } from "@flatsby/validators/categories";
import { useTranslations } from "next-intl";

import { ShoppingListItemDisplay } from "~/app/_components/ShoppingListItemDisplay";

interface DemoItem {
  id: number;
  name: "milk" | "bread" | "apples" | "eggs";
  categoryId: CategoryIdWithAiAutoSelect;
  completed: boolean;
}

const demoItems: DemoItem[] = [
  { id: 1, name: "milk", categoryId: "dairy", completed: false },
  { id: 2, name: "bread", categoryId: "bakery", completed: false },
  { id: 3, name: "apples", categoryId: "produce", completed: true },
  { id: 4, name: "eggs", categoryId: "dairy", completed: false },
];

export function ShoppingListDemo() {
  const t = useTranslations("marketing.demo");
  return (
    <div className="flex flex-col gap-2">
      {demoItems.map((item) => (
        <ShoppingListItemDisplay
          key={item.id}
          name={t(item.name)}
          completed={item.completed}
          categoryId={item.categoryId}
        />
      ))}
    </div>
  );
}
