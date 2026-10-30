import { signedInStep } from "~/auth/server";
import PasskeyOffer from "./PasskeyOffer";

export default async function PasskeyPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await signedInStep(searchParams);
  return <PasskeyOffer next={next} />;
}
