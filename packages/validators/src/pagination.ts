/**
 * Page sizes for infinite queries.
 *
 * These values are part of the React Query cache key: a component that reads a
 * list with one limit and invalidates it with another silently misses the
 * cache entry. Import these constants instead of inlining the number so the
 * read and the invalidation can never drift apart.
 */
export const PAGE_SIZE = {
  expenses: 20,
  shoppingListItems: 20,
  conversations: 10,
} as const;
