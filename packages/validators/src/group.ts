import z from "zod/v4";

import { userSchema } from "./user";

export const roleSchema = z.enum(["admin", "member"]);

export const groupSchema = z.object({
  id: z.number(),
  name: z.string().min(1).max(64),
  createdAt: z.date(),
  profilePicture: z.string().nullable(),
});

export const groupWithMemberCountSchema = groupSchema.extend({
  memberCount: z.number(),
});

export const newGroupSchema = z.object({
  name: z.string().min(1).max(64),
  profilePicture: z.string().nullable(),
});

export const updateGroupSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  profilePicture: z.string().nullable().optional(),
});

export const groupMemberSchema = z.object({
  id: z.number(),
  groupId: z.number(),
  userId: z.string(),
  role: roleSchema,
  joinedOn: z.date(),
});

const groupMemberWithoutGroupIdSchema = groupMemberSchema.omit({
  groupId: true,
});

export const newGroupMemberSchema = z.object({
  userId: z.string(),
  role: roleSchema,
});

export const updateGroupMemberSchema = z.object({
  role: roleSchema.optional(),
});

export const groupMemberWithUserSchema = groupMemberSchema.extend({
  user: userSchema.pick({ email: true, name: true, image: true }),
});

const groupMemberWithUserSchemaWithoutGroupId = groupMemberWithUserSchema.omit({
  groupId: true,
});

export const groupWithAccessSchema = groupSchema.extend({
  groupMembers: z.array(groupMemberWithUserSchemaWithoutGroupId),
  thisGroupMember: groupMemberWithUserSchemaWithoutGroupId,
});

export const groupMemberWithGroupSchema = groupSchema.extend({
  groupMembers: z.array(groupMemberWithoutGroupIdSchema),
});

export const groupMemberWithGroupMinimalSchema = groupMemberSchema.extend({
  group: groupSchema.pick({ id: true }).extend({
    groupMembers: z.array(groupMemberWithoutGroupIdSchema),
  }),
});

export type GroupWithAccess = z.infer<typeof groupWithAccessSchema>;
export type GroupMemberWithUser = z.infer<typeof groupMemberWithUserSchema>;
export type GroupMember = z.infer<typeof groupMemberSchema>;
export type GroupWithGroupMembers = z.infer<typeof groupMemberWithGroupSchema>;
export type GroupMemberWithGroupMinimal = z.infer<
  typeof groupMemberWithGroupMinimalSchema
>;
export type Group = z.infer<typeof groupSchema>;
export type GroupWithMemberCount = z.infer<typeof groupWithMemberCountSchema>;
export type NewGroup = z.infer<typeof newGroupSchema>;
export type UpdateGroup = z.infer<typeof updateGroupSchema>;
export type NewGroupMember = z.infer<typeof newGroupMemberSchema>;
export type UpdateGroupMember = z.infer<typeof updateGroupMemberSchema>;
export type Role = z.infer<typeof roleSchema>;
