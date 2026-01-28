import { authRouter } from "./router/auth";
import { chatRouter } from "./router/chatRouter";
import { expenseRouter } from "./router/expenseRouter";
import { groupRouter } from "./router/groupRouter";
import { shoppingList } from "./router/shoppingListRouter";
import { statsRouter } from "./router/statsRouter";
import { userRouter } from "./router/userRouter";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  chat: chatRouter,
  group: groupRouter,
  shoppingList: shoppingList,
  expense: expenseRouter,
  stats: statsRouter,
  user: userRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
