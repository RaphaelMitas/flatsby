import { authRouter } from "./router/auth";
import { calendarRouter } from "./router/calendarRouter";
import { expenseRouter } from "./router/expenseRouter";
import { groupRouter } from "./router/groupRouter";
import { inviteRouter } from "./router/inviteRouter";
import { pinboardRouter } from "./router/pinboardRouter";
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
  pinboard: pinboardRouter,
  receipt: receiptRouter,
  shoppingList: shoppingList,
  expense: expenseRouter,
  stats: statsRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
