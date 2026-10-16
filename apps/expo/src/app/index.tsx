import { useEffect } from "react";
import { Redirect } from "expo-router";

import { useSession } from "~/utils/auth/auth-client";
import {
  clearPostLoginPath,
  peekPostLoginPath,
} from "~/utils/auth/post-login-path";

export default function RootIndex() {
  const { data: session } = useSession();
  const postLoginPath = session ? peekPostLoginPath() : null;

  useEffect(() => {
    if (postLoginPath) clearPostLoginPath();
  }, [postLoginPath]);

  if (session) {
    return <Redirect href={postLoginPath ?? "/(tabs)/home"} />;
  }
  return <Redirect href="/auth/login" />;
}
