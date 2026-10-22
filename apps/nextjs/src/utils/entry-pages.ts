// The app pages a signed-out visitor lands on, counted like marketing pages
export const isEntryPage = (pathname: string) =>
  pathname === "/auth/login" || pathname.startsWith("/join/");
