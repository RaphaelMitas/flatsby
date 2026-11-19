import type { ExpenseFilterChoice } from "@flatsby/validators/expenses/list-filter";
import { z } from "zod/v4";

import { calendarDateSchema } from "@flatsby/validators/calendar";
import { expenseCategoryGroups } from "@flatsby/validators/expenses/categories";
import { memberRoles } from "@flatsby/validators/expenses/list-filter";

const filterParamsSchema = z.object({
  member: z.coerce.number().int().optional().catch(undefined),
  role: z.enum(memberRoles).catch("any"),
  category: z.enum(expenseCategoryGroups).optional().catch(undefined),
  from: calendarDateSchema.optional().catch(undefined),
  to: calendarDateSchema.optional().catch(undefined),
});

export function expenseFilterHref({
  memberId,
  memberRole,
  category,
  range,
}: ExpenseFilterChoice) {
  const params = new URLSearchParams();
  if (memberId !== undefined) {
    params.set("member", String(memberId));
    params.set("role", memberRole);
  }
  if (category) params.set("category", category);
  if (range) {
    params.set("from", range.from);
    params.set("to", range.to);
  }
  return `/expenses?${params.toString()}`;
}

export function expenseFilterChoice(
  searchParams: URLSearchParams,
): Partial<ExpenseFilterChoice> | undefined {
  const { member, role, category, from, to } = filterParamsSchema.parse(
    Object.fromEntries(searchParams),
  );
  const range = from && to ? { from, to } : undefined;
  if (member === undefined && !category && !range) return undefined;
  return {
    ...(member !== undefined && { memberId: member, memberRole: role }),
    ...(category && { category }),
    ...(range && { range }),
  };
}
