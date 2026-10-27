import { cache } from "react";

import { inviteCodeSchema } from "@flatsby/validators/invite";

import { caller } from "~/trpc/server";

export const loadInvite = cache(async (param: string) => {
  const parsed = inviteCodeSchema.safeParse(param);
  if (!parsed.success) return { code: null, preview: null };

  const preview = await caller.invite.preview({ code: parsed.data });
  if (!preview.success && preview.error.type !== "NotFoundError") {
    throw new Error(preview.error.message);
  }
  return {
    code: parsed.data,
    preview: preview.success ? preview.data : null,
  };
});
