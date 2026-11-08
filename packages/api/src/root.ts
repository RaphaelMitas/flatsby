import { authRouter } from "./router/auth";
import { calendarRouter } from "./router/calendarRouter";
import { expenseRouter } from "./router/expenseRouter";
import { groupRouter } from "./router/groupRouter";
import { inviteRouter } from "./router/inviteRouter";
import { receiptRouter } from "./router/receiptRouter";
import { shoppingList } from "./router/shoppingListRouter";
import { statsRouter } from "./router/statsRouter";
import { userRouter } from "./router/userRouter";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  calendar: calendarRouter,
  group: groupRouter,
  invite: inviteRouter,
  receipt: receiptRouter,
  shoppingList: shoppingList,
  expense: expenseRouter,
  stats: statsRouter,
  user: userRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
