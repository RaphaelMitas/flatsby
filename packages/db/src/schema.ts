import type {
  CalendarColor,
  CalendarItemKind,
  Recurrence,
} from "@flatsby/validators/calendar";
import type { PersistedToolCall } from "@flatsby/validators/chat/tools";
import type { CurrencyCode } from "@flatsby/validators/expenses/types";
import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTableCreator,
  primaryKey,
  real,
  serial,
  text,
  time,
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
  lastChatModelUsed: text("last_chat_model_used"),
  lastToolsEnabled: boolean("last_tools_enabled"),
  // Legal consent tracking
  termsAcceptedAt: timestamp("terms_accepted_at"),
  termsVersion: varchar("terms_version", { length: 20 }),
  privacyAcceptedAt: timestamp("privacy_accepted_at"),
  privacyVersion: varchar("privacy_version", { length: 20 }),
  // AI consent tracking
  aiConsentAcceptedAt: timestamp("ai_consent_accepted_at"),
  aiConsentVersion: varchar("ai_consent_version", { length: 20 }),
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

// Enums
export const groupMemberRoleEnum = pgEnum("group_member_role", [
  "admin",
  "member",
]);

// Create a pgTable that maps to a table in your DB
export const groups = createTable("groups", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  profilePicture: text("profilePicture"),
  currency: varchar("currency", { length: 3 })
    .$type<CurrencyCode>()
    .default("EUR")
    .notNull(),
  // null until an admin decides, which is what the debts banner asks about
  convertAutomatically: boolean("convert_automatically"),
});

export const groupMembers = createTable(
  "group_members",
  {
    id: serial("id").primaryKey(),
    groupId: integer("groupId")
      .notNull()
      .references(() => groups.id),
    userId: text("userId").notNull(),
    role: groupMemberRoleEnum("role").notNull(),
    joinedOn: timestamp("joinedOn").defaultNow().notNull(),
    isActive: boolean("is_active").default(true).notNull(),
  },
  (table) => [
    index("group_members_group_user_idx").on(table.groupId, table.userId),
    index("group_members_user_idx").on(table.userId),
  ],
);

export const groupInvites = createTable("group_invites", {
  groupId: integer("group_id")
    .primaryKey()
    .references(() => groups.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 8 }).notNull().unique(),
  createdByMemberId: integer("created_by_member_id")
    .notNull()
    .references(() => groupMembers.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
});

export const groupInvitesRelations = relations(groupInvites, ({ one }) => ({
  group: one(groups, {
    fields: [groupInvites.groupId],
    references: [groups.id],
  }),
  createdByMember: one(groupMembers, {
    fields: [groupInvites.createdByMemberId],
    references: [groupMembers.id],
  }),
}));

export const groupsRelations = relations(groups, ({ many }) => ({
  groupMembers: many(groupMembers),
  shoppingLists: many(shoppingLists),
  expenses: many(expenses),
  calendarItems: many(calendarItems),
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

export const shoppingLists = createTable(
  "shopping_lists",
  {
    id: serial("id").primaryKey(),
    groupId: integer("groupId")
      .notNull()
      .references(() => groups.id),
    name: varchar("name", { length: 256 }).notNull(),
    icon: text("icon"),
    description: text("description"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("shopping_lists_group_idx").on(table.groupId)],
);

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

export const shoppingListItems = createTable(
  "shopping_list_item",
  {
    id: serial("id").primaryKey(),
    shoppingListId: integer("shoppingListId")
      .notNull()
      .references(() => shoppingLists.id),
    name: varchar("name", { length: 256 }).notNull(),
    categoryId: varchar("categoryId", { length: 50 })
      .default("other")
      .notNull(),
    createdByGroupMemberId: integer("createdByGroupMemberId").references(
      () => groupMembers.id,
    ),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    completed: boolean("completed").notNull(),
    completedByGroupMemberId: integer("completedByGroupMemberId").references(
      () => groupMembers.id,
    ),
    completedAt: timestamp("completedAt"),
  },
  (table) => [
    index("shopping_list_item_list_idx").on(
      table.shoppingListId,
      table.completedAt,
      table.createdAt,
    ),
  ],
);

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

export const expenses = createTable(
  "expenses",
  {
    id: serial("id").primaryKey(),
    groupId: integer("groupId")
      .notNull()
      .references(() => groups.id),
    paidByGroupMemberId: integer("paidByGroupMemberId")
      .notNull()
      .references(() => groupMembers.id),
    amountInCents: integer("amount_in_cents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    // Both set when the expense counts toward debts in another currency
    convertedAmountInCents: integer("converted_amount_in_cents"),
    convertedCurrency: varchar("converted_currency", { length: 3 }),
    description: varchar("description", { length: 512 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    subcategory: varchar("subcategory", { length: 100 }).notNull(),
    expenseDate: timestamp("expenseDate").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdByGroupMemberId: integer("createdByGroupMemberId")
      .notNull()
      .references(() => groupMembers.id),
    splitMethod: varchar("split_method", { length: 20 })
      .default("equal")
      .notNull(),
  },
  (table) => [
    index("expenses_group_date_idx").on(
      table.groupId,
      table.expenseDate,
      table.id,
    ),
    index("expenses_group_created_idx").on(table.groupId, table.createdAt),
  ],
);

export const expenseSplits = createTable(
  "expense_splits",
  {
    id: serial("id").primaryKey(),
    expenseId: integer("expenseId")
      .notNull()
      .references(() => expenses.id),
    groupMemberId: integer("groupMemberId")
      .notNull()
      .references(() => groupMembers.id),
    amountInCents: integer("amount_in_cents").notNull(),
    percentage: integer("percentage"),
    shares: integer("shares"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("expense_splits_expense_idx").on(table.expenseId)],
);

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
export const conversations = createTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title"),
    model: text("model").default("openai/gpt-5.4-mini"),
    systemPrompt: text("system_prompt"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { mode: "date" }),
  },
  (table) => [
    index("conversations_user_updated_idx").on(table.userId, table.updatedAt),
  ],
);

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
    createdAt: timestamp("created_at").defaultNow().notNull(),
    // AI generation tracking
    generationId: text("generation_id"), // gen_<ulid> from providerMetadata.gateway
    cost: real("cost"), // Cost in USD from providerMetadata.gateway.cost
    model: text("model"), // Model ID used for this generation
    // Tool calls made during this message
    toolCalls: jsonb("tool_calls").$type<PersistedToolCall[]>(),
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

export const calendarItems = createTable(
  "calendar_item",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 16 }).$type<CalendarItemKind>().notNull(),
    title: varchar("title", { length: 256 }).notNull(),
    color: varchar("color", { length: 16 }).$type<CalendarColor>().notNull(),
    startsOn: date("starts_on", { mode: "string" }).notNull(),
    endsOn: date("ends_on", { mode: "string" }),
    // Wall-clock times, so 19:00 stays 19:00 across DST; null means all day
    startTime: time("start_time"),
    endTime: time("end_time"),
    // null means it happens once
    recurrence: jsonb("recurrence").$type<Recurrence>(),
    createdByGroupMemberId: integer("created_by_group_member_id").references(
      () => groupMembers.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("calendar_item_group_idx").on(table.groupId)],
);

export const calendarItemsRelations = relations(
  calendarItems,
  ({ one, many }) => ({
    group: one(groups, {
      fields: [calendarItems.groupId],
      references: [groups.id],
    }),
    members: many(calendarItemMembers),
    occurrences: many(calendarOccurrences),
  }),
);

export const calendarItemMembers = createTable(
  "calendar_item_member",
  {
    itemId: integer("item_id")
      .notNull()
      .references(() => calendarItems.id, { onDelete: "cascade" }),
    groupMemberId: integer("group_member_id")
      .notNull()
      .references(() => groupMembers.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (table) => [primaryKey({ columns: [table.itemId, table.groupMemberId] })],
);

export const calendarItemMembersRelations = relations(
  calendarItemMembers,
  ({ one }) => ({
    item: one(calendarItems, {
      fields: [calendarItemMembers.itemId],
      references: [calendarItems.id],
    }),
    groupMember: one(groupMembers, {
      fields: [calendarItemMembers.groupMemberId],
      references: [groupMembers.id],
    }),
  }),
);

/** Only occurrences that differ from the rule get a row: done or skipped. */
export const calendarOccurrences = createTable(
  "calendar_occurrence",
  {
    itemId: integer("item_id")
      .notNull()
      .references(() => calendarItems.id, { onDelete: "cascade" }),
    date: date("occurs_on", { mode: "string" }).notNull(),
    skipped: boolean("skipped").default(false).notNull(),
    completedByGroupMemberId: integer(
      "completed_by_group_member_id",
    ).references(() => groupMembers.id, { onDelete: "set null" }),
    completedAt: timestamp("completed_at"),
  },
  (table) => [primaryKey({ columns: [table.itemId, table.date] })],
);

export const calendarOccurrencesRelations = relations(
  calendarOccurrences,
  ({ one }) => ({
    item: one(calendarItems, {
      fields: [calendarOccurrences.itemId],
      references: [calendarItems.id],
    }),
    completedByGroupMember: one(groupMembers, {
      fields: [calendarOccurrences.completedByGroupMemberId],
      references: [groupMembers.id],
    }),
  }),
);
