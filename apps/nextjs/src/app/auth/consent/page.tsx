import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";
import ConsentForm from "./ConsentForm";

export default async function ConsentPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  return <ConsentForm />;
}
