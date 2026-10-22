import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Application from "expo-application";
import { usePathname, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePostHog } from "posthog-react-native";

import {
  INVITE_REFERRER_KEY,
  inviteCodeSchema,
  invitePath,
  outlivesAnyInvite,
} from "@flatsby/validators/invite";

const HANDLED_KEY = "install_referrer_handled";

// Play's install referrer carries a web invite code and the store link's utm_source
export function InstallReferrer() {
  const router = useRouter();
  const posthog = usePostHog();
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
      const source = params.get("utm_source");
      posthog.capture("install_referrer", {
        utm_source: source,
        utm_medium: params.get("utm_medium"),
        utm_campaign: params.get("utm_campaign"),
        via_invite: params.has(INVITE_REFERRER_KEY),
        ...(source && { $set_once: { install_source: source } }),
      });
      const code = inviteCodeSchema.safeParse(
        params.get(INVITE_REFERRER_KEY) ?? "",
      );
      // A link to the same invite may have opened the app already
      if (code.success && pathnameRef.current !== invitePath(code.data)) {
        router.push(invitePath(code.data));
      }
    })();
  }, [router, posthog]);

  return null;
}
