import { redirect } from "next/navigation";

import { safeRedirectPath } from "@flatsby/validators/invite";

import { getSession } from "~/auth/server";
import Login from "./Login";

const LoginPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) => {
  const callbackURL = safeRedirectPath((await searchParams).next);
  const session = await getSession();
  if (session?.user) {
    redirect(callbackURL);
  } else {
    return <Login callbackURL={callbackURL} />;
  }
};

export default LoginPage;
