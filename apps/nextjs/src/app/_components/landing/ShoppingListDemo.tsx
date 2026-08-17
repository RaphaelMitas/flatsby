import type { CategoryIdWithAiAutoSelect } from "@flatsby/validators/categories";

import { ShoppingListItemDisplay } from "~/app/_components/ShoppingListItemDisplay";

interface DemoItem {
  id: number;
  name: string;
  categoryId: CategoryIdWithAiAutoSelect;
  completed: boolean;
}

const demoItems: DemoItem[] = [
  { id: 1, name: "Milk", categoryId: "dairy", completed: false },
  { id: 2, name: "Bread", categoryId: "bakery", completed: false },
  { id: 3, name: "Apples", categoryId: "produce", completed: true },
  { id: 4, name: "Eggs", categoryId: "dairy", completed: false },
];

export function ShoppingListDemo() {
  return (
    <div className="flex flex-col gap-2">
      {demoItems.map((item) => (
        <ShoppingListItemDisplay
          key={item.id}
          name={item.name}
          completed={item.completed}
          categoryId={item.categoryId}
        />
      ))}
    </div>
  );
}
