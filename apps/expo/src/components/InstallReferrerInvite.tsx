import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Application from "expo-application";
import { usePathname, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  INVITE_REFERRER_KEY,
  inviteCodeSchema,
  invitePath,
} from "@flatsby/validators/invite";

const HANDLED_KEY = "install_referrer_handled";

// The web join page passes the invite code through the Play Store install referrer
export function InstallReferrerInvite() {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    void (async () => {
      if (await AsyncStorage.getItem(HANDLED_KEY)) return;
      await AsyncStorage.setItem(HANDLED_KEY, "true");
      const referrer = await Application.getInstallReferrerAsync().catch(
        () => "",
      );
      const code = inviteCodeSchema.safeParse(
        new URLSearchParams(referrer).get(INVITE_REFERRER_KEY) ?? "",
      );
      // A link to the same invite may have opened the app already
      if (code.success && pathnameRef.current !== invitePath(code.data)) {
        router.push(invitePath(code.data));
      }
    })();
  }, [router]);

  return null;
}
