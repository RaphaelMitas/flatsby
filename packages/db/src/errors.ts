export { DrizzleQueryError } from "drizzle-orm/errors";

const QUERY_PARAMS = /(Failed query: [\s\S]*?\nparams: )[\s\S]*/;

export const redactQueryParams = (message: string) =>
  message.replace(QUERY_PARAMS, "$1[redacted]");
