import { z } from "zod/v4";

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
