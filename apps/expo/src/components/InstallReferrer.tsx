import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Application from "expo-application";
import { usePathname, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  INVITE_REFERRER_KEY,
  inviteCodeSchema,
  invitePath,
  outlivesAnyInvite,
} from "@flatsby/validators/invite";

const HANDLED_KEY = "install_referrer_handled";

// The web join page passes the invite code through the Play Store install referrer
export function InstallReferrer() {
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
      // An update to an install older than any invite would replay a long-dead referrer
      if (outlivesAnyInvite(await Application.getInstallationTimeAsync())) {
        await AsyncStorage.setItem(HANDLED_KEY, "true");
        return;
      }
      // Play's referrer service can be briefly unavailable; the next launch tries again
      const referrer = await Application.getInstallReferrerAsync().catch(
        () => null,
      );
      if (referrer === null) return;
      await AsyncStorage.setItem(HANDLED_KEY, "true");
      const params = new URLSearchParams(referrer);
      const code = inviteCodeSchema.safeParse(
        params.get(INVITE_REFERRER_KEY) ?? "",
      );
      // A link to the same invite may have opened the app already
      if (code.success && pathnameRef.current !== invitePath(code.data)) {
        router.push(invitePath(code.data));
      }
    })();
  }, [router]);

  return null;
}
