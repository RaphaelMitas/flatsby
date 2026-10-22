import { INVITE_PATH } from "@flatsby/validators/invite";

// Counted like marketing pages, since signed-out visitors land here
export const isEntryPage = (pathname: string) =>
  pathname === "/auth/login" || pathname.startsWith(`${INVITE_PATH}/`);
