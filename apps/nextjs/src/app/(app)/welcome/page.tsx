import { redirect } from "next/navigation";

import { defaultUserName } from "@flatsby/validators/user";

import { getSession } from "~/auth/server";
import { Welcome } from "./Welcome";

export default async function WelcomePage() {
  const session = await getSession();
  if (!session?.user) redirect("/auth/login");
  const { name, email } = session.user;
  return (
    <Welcome
      initialName={name === defaultUserName(email) ? "" : name}
      savedName={name}
    />
  );
}
