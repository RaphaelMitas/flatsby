import { z } from "zod/v4";

import { currencyCodeSchema } from "./expenses/schemas";
import {
  shoppingListItemNameSchema,
  shoppingListNameSchema,
} from "./shopping-list";
import { userEmailSchema, userImageSchema, userNameSchema } from "./user";

export const groupNameSchema = z
  .string()
  .min(1, {
    message: "Group name is required",
  })
  .max(256, {
    message: "Group name cannot be longer than 256 characters",
  });

export const groupSchema = z.object({
  id: z.number(),
  name: groupNameSchema,
  createdAt: z.date(),
  profilePicture: z.string().optional().nullable(),
});

export const groupFormSchema = groupSchema.pick({ name: true });
export type GroupFormValues = z.infer<typeof groupFormSchema>;

export const createGroupSchema = groupSchema.pick({ name: true });

export const updateGroupSchema = groupSchema.pick({ name: true, id: true });

export const deleteGroupSchema = groupSchema.pick({ id: true });

// Group Member validators
export const groupMemberRoleSchema = z.enum(["admin", "member"]);
export type GroupMemberRole = z.infer<typeof groupMemberRoleSchema>;

export const groupMemberEmailSchema = z.email({
  message: "Please enter a valid email address",
});

export const groupMemberSchema = z.object({
  id: z.number(),
  groupId: z.number(),
  userId: z.string(),
  role: groupMemberRoleSchema,
  joinedOn: z.date(),
});
export type GroupMember = z.infer<typeof groupMemberSchema>;

export const groupMemberUserSchema = z.object({
  email: userEmailSchema,
  name: userNameSchema.nullable(),
  image: userImageSchema,
});
export type GroupMemberUser = z.infer<typeof groupMemberUserSchema>;

export const groupMemberWithUserSchema = groupMemberSchema.extend({
  user: groupMemberUserSchema,
});
export type GroupMemberWithUser = z.infer<typeof groupMemberWithUserSchema>;

export const updateMemberRoleInputSchema = z.object({
  memberId: z.number(),
  newRole: groupMemberRoleSchema,
});
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleInputSchema>;

export const removeGroupMemberInputSchema = z.object({ memberId: z.number() });
export type RemoveGroupMemberInput = z.infer<
  typeof removeGroupMemberInputSchema
>;

export const addGroupMemberInputSchema = z.object({
  groupId: z.number(),
  memberEmail: groupMemberEmailSchema,
});
export type AddGroupMemberInput = z.infer<typeof addGroupMemberInputSchema>;

export const addMemberFormSchema = z.object({ email: groupMemberEmailSchema });
export type AddMemberFormValues = z.infer<typeof addMemberFormSchema>;

// Activity validators
export const activityUserSchema = z.object({
  email: userEmailSchema,
  name: userNameSchema,
  image: userImageSchema,
});
export type ActivityUser = z.infer<typeof activityUserSchema>;

export const expenseActivityDataSchema = z.object({
  expenseId: z.number(),
  amountInCents: z.number().int(),
  currency: currencyCodeSchema,
  description: z.string().nullable(),
});
export type ExpenseActivityData = z.infer<typeof expenseActivityDataSchema>;

export const shoppingItemActivityDataSchema = z.object({
  itemId: z.number(),
  itemName: shoppingListItemNameSchema,
  shoppingListName: shoppingListNameSchema,
});
export type ShoppingItemActivityData = z.infer<
  typeof shoppingItemActivityDataSchema
>;

export const expenseActivitySchema = z.object({
  type: z.literal("expense"),
  id: z.string(),
  timestamp: z.date(),
  user: activityUserSchema,
  data: expenseActivityDataSchema,
});
export type ExpenseActivity = z.infer<typeof expenseActivitySchema>;

export const shoppingItemCreatedActivitySchema = z.object({
  type: z.literal("shopping_item_created"),
  id: z.string(),
  timestamp: z.date(),
  user: activityUserSchema,
  data: shoppingItemActivityDataSchema,
});
export type ShoppingItemCreatedActivity = z.infer<
  typeof shoppingItemCreatedActivitySchema
>;

export const shoppingItemCompletedActivitySchema = z.object({
  type: z.literal("shopping_item_completed"),
  id: z.string(),
  timestamp: z.date(),
  user: activityUserSchema,
  data: shoppingItemActivityDataSchema,
});
export type ShoppingItemCompletedActivity = z.infer<
  typeof shoppingItemCompletedActivitySchema
>;

export const activityItemSchema = z.discriminatedUnion("type", [
  expenseActivitySchema,
  shoppingItemCreatedActivitySchema,
  shoppingItemCompletedActivitySchema,
]);
export type ActivityItem = z.infer<typeof activityItemSchema>;

export const getRecentActivityInputSchema = z.object({
  groupId: z.number(),
  limit: z.number().int().min(1).max(20).optional().default(15),
});
export type GetRecentActivityInput = z.infer<
  typeof getRecentActivityInputSchema
>;
