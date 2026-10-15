import { useEffect } from "react";
import { Platform } from "react-native";
import * as Application from "expo-application";
import { useRouter } from "expo-router";
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
      if (code.success) router.push(invitePath(code.data));
    })();
  }, [router]);

  return null;
}
