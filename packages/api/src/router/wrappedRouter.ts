import { Effect } from "effect";
import { z } from "zod/v4";

import { eq, inArray } from "@flatsby/db";
import { groupMembers } from "@flatsby/db/schema";

import type {
  UserWrappedSummary,
  WrappedSummaryCategory,
  WrappedSummaryTopGroup,
  WrappedSummaryTopList,
} from "../types";
import { withErrorHandlingAsResult } from "../errors";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const wrappedRouter = createTRPCRouter({
  getUserWrappedSummary: protectedProcedure
    .input(
      z
        .object({
          year: z.number().int().min(2000).max(2100).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const userName = ctx.session.user.name;

      const year = input?.year ?? new Date().getFullYear();
      const from = new Date(year, 0, 1);
      const to = new Date(year + 1, 0, 1);

      // Fetch core data in parallel
      const [userSessions, memberships, items] = await Promise.all([
        ctx.db.query.sessions.findMany({
          where: (session, { eq }) => eq(session.userId, userId),
          columns: {
            createdAt: true,
          },
        }),
        ctx.db.query.groupMembers.findMany({
          where: (gm, { eq }) => eq(gm.userId, userId),
          with: {
            group: {
              columns: {
                id: true,
                name: true,
                profilePicture: true,
              },
            },
          },
        }),
        ctx.db.query.shoppingListItems.findMany({
          // We purposely do not filter by date here to keep the query simple and
          // handle the period logic in JavaScript.
          where: (item, { or }) =>
            or(
              inArray(
                item.createdByGroupMemberId,
                ctx.db
                  .select({ id: groupMembers.id })
                  .from(groupMembers)
                  .where(eq(groupMembers.userId, userId)),
              ),
              inArray(
                item.completedByGroupMemberId,
                ctx.db
                  .select({ id: groupMembers.id })
                  .from(groupMembers)
                  .where(eq(groupMembers.userId, userId)),
              ),
            ),
          columns: {
            id: true,
            shoppingListId: true,
            categoryId: true,
            createdAt: true,
            completedAt: true,
            createdByGroupMemberId: true,
            completedByGroupMemberId: true,
          },
          with: {
            shoppingList: {
              columns: {
                id: true,
                name: true,
                groupId: true,
              },
              with: {
                group: {
                  columns: {
                    id: true,
                    name: true,
                    profilePicture: true,
                  },
                },
              },
            },
          },
        }),
      ]);

      const inRange = (date: Date | null | undefined) =>
        !!date && date >= from && date < to;

      // Sessions: restrict to time range
      const sessionsInRange = userSessions.filter((s) => inRange(s.createdAt));

      const totalSessions = sessionsInRange.length;

      // Active days from sessions and item actions
      const activeDayKeys = new Set<string>();

      const addActiveDay = (d: Date | null | undefined) => {
        if (!inRange(d)) return;
        const key = d ? d.toISOString().slice(0, 10) : "";
        activeDayKeys.add(key);
      };

      sessionsInRange.forEach((s) => addActiveDay(s.createdAt));

      // Filter items to the period and add to active days
      const memberIdSet = new Set<number>(
        memberships.map((m) => m.id).filter((id): id is number => !!id),
      );

      const itemsInRange = items.filter((item) => {
        const createdInRange = inRange(item.createdAt);
        const completedInRange = inRange(item.completedAt);
        const isCreatedByUser =
          item.createdByGroupMemberId != null &&
          memberIdSet.has(item.createdByGroupMemberId);
        const isCompletedByUser =
          item.completedByGroupMemberId != null &&
          memberIdSet.has(item.completedByGroupMemberId);

        const relevant =
          (createdInRange && isCreatedByUser) ||
          (completedInRange && isCompletedByUser);

        if (relevant) {
          if (createdInRange) addActiveDay(item.createdAt);
          if (completedInRange) addActiveDay(item.completedAt);
        }

        return relevant;
      });

      const activeDays = activeDayKeys.size;

      // Longest streak: compute from sorted active days
      const sortedDays = Array.from(activeDayKeys).sort();
      let longestStreak = 0;
      let currentStreak = 0;
      let previousDate: Date | null = null;

      for (const day of sortedDays) {
        const currentDate = new Date(day);
        if (
          previousDate &&
          currentDate.getTime() - previousDate.getTime() === 24 * 60 * 60 * 1000
        ) {
          currentStreak += 1;
        } else {
          currentStreak = 1;
        }
        longestStreak = Math.max(longestStreak, currentStreak);
        previousDate = currentDate;
      }

      // Groups & lists
      const groupsJoined = memberships.length;

      const groupActionCounts = new Map<
        number,
        { name: string; profile: string | null; actions: number }
      >();
      const listActionCounts = new Map<
        number,
        { name: string; actions: number }
      >();

      for (const item of itemsInRange) {
        const list = item.shoppingList;
        const group = list.group;

        const groupEntry = groupActionCounts.get(group.id) ?? {
          name: group.name,
          profile: group.profilePicture,
          actions: 0,
        };
        groupEntry.actions += 1;
        groupActionCounts.set(group.id, groupEntry);

        const listEntry = listActionCounts.get(list.id) ?? {
          name: list.name,
          actions: 0,
        };
        listEntry.actions += 1;
        listActionCounts.set(list.id, listEntry);
      }

      const topGroupByActivityEntry = Array.from(
        groupActionCounts.entries(),
      ).sort(([, a], [, b]) => b.actions - a.actions)[0];

      const topGroupByActivity: WrappedSummaryTopGroup | null =
        topGroupByActivityEntry
          ? {
              groupId: topGroupByActivityEntry[0],
              name: topGroupByActivityEntry[1].name,
              profilePicture: topGroupByActivityEntry[1].profile,
              actions: topGroupByActivityEntry[1].actions,
            }
          : null;

      const mostUsedListEntry = Array.from(listActionCounts.entries()).sort(
        ([, a], [, b]) => b.actions - a.actions,
      )[0];

      const mostUsedList: WrappedSummaryTopList | null = mostUsedListEntry
        ? {
            shoppingListId: mostUsedListEntry[0],
            name: mostUsedListEntry[1].name,
            actions: mostUsedListEntry[1].actions,
          }
        : null;

      const listsTouched = listActionCounts.size;

      // Item-level stats
      let itemsCreated = 0;
      let itemsCompleted = 0;
      let fastestCompletionMs: number | null = null;
      const dayActionCounts = new Map<string, number>();
      const categoryCounts = new Map<string, number>();

      const addDayAction = (date: Date | null | undefined) => {
        if (!inRange(date)) return;
        const key = date ? date.toISOString().slice(0, 10) : "";
        dayActionCounts.set(key, (dayActionCounts.get(key) ?? 0) + 1);
      };

      for (const item of itemsInRange) {
        const createdByUser =
          item.createdByGroupMemberId != null &&
          memberIdSet.has(item.createdByGroupMemberId) &&
          inRange(item.createdAt);
        const completedByUser =
          item.completedByGroupMemberId != null &&
          memberIdSet.has(item.completedByGroupMemberId) &&
          inRange(item.completedAt);

        if (createdByUser) {
          itemsCreated += 1;
          addDayAction(item.createdAt);
        }
        if (completedByUser) {
          itemsCompleted += 1;
          addDayAction(item.completedAt);
        }

        if (createdByUser && completedByUser && item.completedAt) {
          const diff = item.completedAt.getTime() - item.createdAt.getTime();
          if (
            diff >= 0 &&
            (fastestCompletionMs === null || diff < fastestCompletionMs)
          ) {
            fastestCompletionMs = diff;
          }
        }

        // Category taste: use categoryId when user was involved
        if (createdByUser || completedByUser) {
          const cat = item.categoryId;
          categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
        }
      }

      const completionRate =
        itemsCreated > 0 ? itemsCompleted / itemsCreated : null;

      const mostProductiveDayEntry = Array.from(dayActionCounts.entries()).sort(
        (a, b) => b[1] - a[1],
      )[0];

      const mostProductiveDay = mostProductiveDayEntry
        ? mostProductiveDayEntry[0]
        : null;

      const topCategories: WrappedSummaryCategory[] = Array.from(
        categoryCounts.entries(),
      )
        .map(([categoryId, count]) => ({ categoryId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const summary: UserWrappedSummary = {
        year,
        from: from.toISOString(),
        to: to.toISOString(),
        userName,
        totalSessions,
        activeDays,
        longestStreak,
        groupsJoined,
        topGroupByActivity,
        listsTouched,
        mostUsedList,
        itemsCreated,
        itemsCompleted,
        completionRate,
        fastestCompletionMs,
        mostProductiveDay,
        topCategories,
      };

      return await withErrorHandlingAsResult(Effect.succeed(summary));
    }),
});
