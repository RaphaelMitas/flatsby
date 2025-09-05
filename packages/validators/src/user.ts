import z from "zod/v4";

export const userSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(64),
  email: z.email(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastGroupUsed: z.number().nullable(),
  lastShoppingListUsed: z.number().nullable(),
});
