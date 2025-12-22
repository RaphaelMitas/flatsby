import { authRouter } from "./router/auth";
import { shoppingList } from "./router/shoppingListRouter";
import { wrappedRouter } from "./router/wrappedRouter";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  shoppingList: shoppingList,
  wrapped: wrappedRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
