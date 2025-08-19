import { authRouter } from "./router/auth";
import { shoppingList } from "./router/shoppingListRouter";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  shoppingList: shoppingList,
});

// export type definition of API
export type AppRouter = typeof appRouter;
