// Counted like marketing pages, since signed-out visitors land here
export const isEntryPage = (pathname: string) =>
  pathname === "/auth/login" || pathname.startsWith("/join/");
