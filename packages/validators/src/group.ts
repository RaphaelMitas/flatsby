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
  profilePicture: z.string().optional(),
});

export const groupFormSchema = groupSchema.pick({ name: true });
export type GroupFormValues = z.infer<typeof groupFormSchema>;
