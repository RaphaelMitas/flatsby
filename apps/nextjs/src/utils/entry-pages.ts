import { INVITE_PATH } from "@flatsby/validators/invite";

export const isEntryPage = (pathname: string) =>
  pathname === "/auth/login" || pathname.startsWith(`${INVITE_PATH}/`);
