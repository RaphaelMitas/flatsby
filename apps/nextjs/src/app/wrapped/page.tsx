import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";
import { caller } from "~/trpc/server";
import WrappedExperience from "./WrappedExperience";

export default async function WrappedPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const result = await caller.wrapped.getUserWrappedSummary({});

  if (!result.success) {
    return <div>Error: {result.error.message}</div>;
  }

  return <WrappedExperience summary={result.data} />;
}
