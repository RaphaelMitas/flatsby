import { signedInStep } from "~/auth/server";
import NameForm from "./NameForm";

export default async function NamePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { user, next } = await signedInStep(searchParams);
  return <NameForm defaultName={user.name} next={next} />;
}
