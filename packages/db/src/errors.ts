export { DrizzleQueryError } from "drizzle-orm/errors";

// Matched by message: Next bundles drizzle once per runtime, so instanceof misses errors from another
const QUERY_PARAMS = /(Failed query: [\s\S]*?\nparams: )[\s\S]*/;

export const redactQueryParams = (message: string) =>
  message.replace(QUERY_PARAMS, "$1[redacted]");
