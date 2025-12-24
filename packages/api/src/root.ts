import { authRouter } from "./router/auth";
import { groupRouter } from "./router/groupRouter";
import { shoppingList } from "./router/shoppingListRouter";
import { userRouter } from "./router/userRouter";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  group: groupRouter,
  shoppingList: shoppingList,
  user: userRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
