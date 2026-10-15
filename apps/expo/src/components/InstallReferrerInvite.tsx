import { useEffect } from "react";
import { Platform } from "react-native";
import * as Application from "expo-application";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  INVITE_PATH,
  INVITE_REFERRER_KEY,
  inviteCodeSchema,
} from "@flatsby/validators/invite";

const HANDLED_KEY = "install_referrer_handled";

/** Opens the invite the web join page passed through the Play Store, once, on the first launch after install. */
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
        new RegExp(`${INVITE_REFERRER_KEY}=([^&]+)`).exec(referrer)?.[1] ?? "",
      );
      if (code.success) router.push(`${INVITE_PATH}/${code.data}`);
    })();
  }, [router]);

  return null;
}
