import { beforeEach, describe, expect, it, vi } from "vitest";

import { classify } from "../utils/classify";
import { shoppingList } from "./shoppingListRouter";
import { testContext, testUser } from "./testContext";

const { fakeDb, set } = vi.hoisted(() => {
  const set = vi.fn((_values: Record<string, unknown>) => ({
    where: () => ({ returning: () => Promise.resolve([{ id: 4 }]) }),
  }));
  return {
    set,
    fakeDb: {
      query: {
        shoppingListItems: { findFirst: vi.fn() },
        shoppingLists: { findFirst: vi.fn() },
        groupMembers: { findFirst: vi.fn() },
      },
      update: () => ({ set }),
    },
  };
});

vi.mock("@flatsby/db/client", () => ({ db: fakeDb }));
vi.mock("../utils/classify", () => ({ classify: vi.fn(async () => "other") }));

const update = (input: { categoryId: "ai-auto-select"; completed: boolean }) =>
  shoppingList
    .createCaller(testContext(testUser))
    .updateShoppingListItem({ id: 4, name: "Milk", ...input });

beforeEach(() => {
  vi.clearAllMocks();
  fakeDb.query.shoppingListItems.findFirst.mockResolvedValue({
    id: 4,
    name: "Milk",
    categoryId: "dairy",
    completed: false,
    shoppingList: {
      group: {
        id: 3,
        groupMembers: [{ id: 1, userId: testUser.id, isActive: true }],
      },
    },
  });
});

describe("shoppingList.updateShoppingListItem", () => {
  it("keeps the category on a tick sent before the add's auto-select came back", async () => {
    await expect(
      update({ categoryId: "ai-auto-select", completed: true }),
    ).resolves.toMatchObject({ success: true });

    expect(classify).not.toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: "dairy", completed: true }),
    );
  });

  it("classifies again when auto-select is picked in the edit form", async () => {
    await update({ categoryId: "ai-auto-select", completed: false });

    expect(classify).toHaveBeenCalledTimes(1);
  });
});

describe("shoppingList.getShoppingList", () => {
  it("loads a list in a group with a placeholder member", async () => {
    const joinedOn = new Date();
    fakeDb.query.groupMembers.findFirst.mockResolvedValue({
      id: 1,
      groupId: 3,
      userId: testUser.id,
      name: null,
      role: "admin",
      joinedOn,
      isActive: true,
    });
    fakeDb.query.shoppingLists.findFirst.mockResolvedValue({
      id: 5,
      groupId: 3,
      name: "Rewe",
      icon: null,
      description: null,
      createdAt: joinedOn,
      group: {
        id: 3,
        groupMembers: [
          {
            id: 1,
            name: null,
            user: { email: testUser.email, name: testUser.name, image: null },
          },
          { id: 2, name: "Anna", user: null },
        ],
      },
    });

    await expect(
      shoppingList
        .createCaller(testContext(testUser))
        .getShoppingList({ groupId: 3, shoppingListId: 5 }),
    ).resolves.toMatchObject({
      success: true,
      data: {
        shoppingList: {
          group: {
            groupMembers: [
              { id: 1 },
              { id: 2, user: { name: "Anna", email: null, image: null } },
            ],
          },
        },
      },
    });
  });
});
