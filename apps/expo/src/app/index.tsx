import { useEffect } from "react";
import { Redirect } from "expo-router";

import { useSession } from "~/utils/auth/auth-client";
import { nameStepPending } from "~/utils/auth/name-step";
import {
  clearPostLoginPath,
  peekPostLoginPath,
} from "~/utils/auth/post-login-path";

export default function RootIndex() {
  const { data: session } = useSession();
  const asksForName = session !== null && nameStepPending();
  // An invite waits until the name is set
  const postLoginPath = session && !asksForName ? peekPostLoginPath() : null;

  useEffect(() => {
    if (postLoginPath) clearPostLoginPath();
  }, [postLoginPath]);

  if (asksForName) {
    return <Redirect href="/auth/name" />;
  }
  if (session) {
    return <Redirect href={postLoginPath ?? "/(tabs)/home"} />;
  }
  return <Redirect href="/auth/login" />;
}
