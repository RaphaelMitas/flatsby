import { redirect } from "next/navigation";

import { safeRedirectPath } from "@flatsby/validators/invite";

import { getSession } from "~/auth/server";
import Login from "./Login";

const LoginPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) => {
  const { next } = await searchParams;
  const callbackURL = safeRedirectPath(
    typeof next === "string" ? next : undefined,
  );
  const session = await getSession();
  if (session?.user) {
    redirect(callbackURL);
  } else {
    return <Login callbackURL={callbackURL} />;
  }
};

export default LoginPage;
