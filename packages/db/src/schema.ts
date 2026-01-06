import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTableCreator,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `flat-cove_${name}`); // still called flat-cove because of the old name

export const users = createTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  lastGroupUsed: integer("last_group_used").references(() => groups.id),
  lastShoppingListUsed: integer("last_shopping_list_used").references(
    () => shoppingLists.id,
  ),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  groupMembers: many(groupMembers),
  conversations: many(conversations),
  lastGroupUsed: one(groups, {
    fields: [users.lastGroupUsed],
    references: [groups.id],
  }),
  lastShoppingListUsed: one(shoppingLists, {
    fields: [users.lastShoppingListUsed],
    references: [shoppingLists.id],
  }),
}));

export const accounts = createTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = createTable("verification_token", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
// end auth

// Create a pgTable that maps to a table in your DB
export const groups = createTable("groups", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  profilePicture: text("profilePicture"),
});

export const groupMembers = createTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("groupId")
    .notNull()
    .references(() => groups.id),
  userId: text("userId").notNull(),
  role: varchar("role", { length: 256 }).notNull(),
  joinedOn: timestamp("joinedOn").defaultNow().notNull(),
});

export const groupsRelations = relations(groups, ({ many }) => ({
  groupMembers: many(groupMembers),
  shoppingLists: many(shoppingLists),
  expenses: many(expenses),
}));

export const groupMembersRelations = relations(
  groupMembers,
  ({ one, many }) => ({
    group: one(groups, {
      fields: [groupMembers.groupId],
      references: [groups.id],
    }),
    user: one(users, {
      fields: [groupMembers.userId],
      references: [users.id],
    }),
    createdByGroupMember: many(shoppingListItems, {
      relationName: "createdByGroupMember",
    }),
    completedByGroupMember: many(shoppingListItems, {
      relationName: "completedByGroupMember",
    }),
    paidByExpenses: many(expenses, {
      relationName: "paidByGroupMember",
    }),
    createdExpenses: many(expenses, {
      relationName: "createdByGroupMember",
    }),
    expenseSplits: many(expenseSplits),
  }),
);

export const shoppingLists = createTable("shopping_lists", {
  id: serial("id").primaryKey(),
  groupId: integer("groupId")
    .notNull()
    .references(() => groups.id),
  name: varchar("name", { length: 256 }).notNull(),
  icon: text("icon"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const shoppingListsRelations = relations(
  shoppingLists,
  ({ many, one }) => ({
    shoppingListItems: many(shoppingListItems),
    group: one(groups, {
      fields: [shoppingLists.groupId],
      references: [groups.id],
    }),
  }),
);

export const shoppingListItems = createTable("shopping_list_item", {
  id: serial("id").primaryKey(),
  shoppingListId: integer("shoppingListId")
    .notNull()
    .references(() => shoppingLists.id),
  name: varchar("name", { length: 256 }).notNull(),
  categoryId: varchar("categoryId", { length: 50 }).default("other").notNull(),
  createdByGroupMemberId: integer("createdByGroupMemberId").references(
    () => groupMembers.id,
  ),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completed: boolean("completed").notNull(),
  completedByGroupMemberId: integer("completedByGroupMemberId").references(
    () => groupMembers.id,
  ),
  completedAt: timestamp("completedAt"),
});

export const shoppingListItemsRelations = relations(
  shoppingListItems,
  ({ one }) => ({
    shoppingList: one(shoppingLists, {
      fields: [shoppingListItems.shoppingListId],
      references: [shoppingLists.id],
    }),
    createdByGroupMember: one(groupMembers, {
      fields: [shoppingListItems.createdByGroupMemberId],
      references: [groupMembers.id],
      relationName: "createdByGroupMember",
    }),
    completedByGroupMember: one(groupMembers, {
      fields: [shoppingListItems.completedByGroupMemberId],
      references: [groupMembers.id],
      relationName: "completedByGroupMember",
    }),
  }),
);

export const expenses = createTable("expenses", {
  id: serial("id").primaryKey(),
  groupId: integer("groupId")
    .notNull()
    .references(() => groups.id),
  paidByGroupMemberId: integer("paidByGroupMemberId")
    .notNull()
    .references(() => groupMembers.id),
  amountInCents: integer("amount_in_cents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  description: varchar("description", { length: 512 }),
  category: varchar("category", { length: 100 }),
  expenseDate: timestamp("expenseDate").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdByGroupMemberId: integer("createdByGroupMemberId")
    .notNull()
    .references(() => groupMembers.id),
  splitMethod: varchar("split_method", { length: 20 })
    .default("equal")
    .notNull(),
});

export const expenseSplits = createTable("expense_splits", {
  id: serial("id").primaryKey(),
  expenseId: integer("expenseId")
    .notNull()
    .references(() => expenses.id),
  groupMemberId: integer("groupMemberId")
    .notNull()
    .references(() => groupMembers.id),
  amountInCents: integer("amount_in_cents").notNull(),
  percentage: integer("percentage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const expensesRelations = relations(expenses, ({ many, one }) => ({
  group: one(groups, {
    fields: [expenses.groupId],
    references: [groups.id],
  }),
  paidByGroupMember: one(groupMembers, {
    fields: [expenses.paidByGroupMemberId],
    references: [groupMembers.id],
    relationName: "paidByGroupMember",
  }),
  createdByGroupMember: one(groupMembers, {
    fields: [expenses.createdByGroupMemberId],
    references: [groupMembers.id],
    relationName: "createdByGroupMember",
  }),
  expenseSplits: many(expenseSplits),
}));

export const expenseSplitsRelations = relations(expenseSplits, ({ one }) => ({
  expense: one(expenses, {
    fields: [expenseSplits.expenseId],
    references: [expenses.id],
  }),
  groupMember: one(groupMembers, {
    fields: [expenseSplits.groupMemberId],
    references: [groupMembers.id],
  }),
}));

// Chat tables
export const conversations = createTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),
  model: text("model").default("google/gemini-2.0-flash"),
  systemPrompt: text("system_prompt"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    user: one(users, {
      fields: [conversations.userId],
      references: [users.id],
    }),
    messages: many(chatMessages),
  }),
);

export const chatMessages = createTable(
  "chat_messages",
  {
    // Use text instead of uuid to accept AI SDK's nanoid-style IDs
    id: text("id").primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull(), // "user" | "assistant" | "system"
    content: text("content").notNull().default(""),
    status: varchar("status", { length: 20 }).default("pending").notNull(), // "pending" | "streaming" | "complete" | "error"
    tokenCount: integer("token_count"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("chat_messages_conv_idx").on(table.conversationId, table.createdAt),
  ],
);

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [chatMessages.conversationId],
    references: [conversations.id],
  }),
}));
