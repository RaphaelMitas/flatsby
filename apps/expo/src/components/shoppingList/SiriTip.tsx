import { useEffect, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslations } from "use-intl";

import { TipCard } from "~/components/TipCard";
import { isE2ETestingEnabled } from "~/utils/e2e";

const HAND_ADDS_KEY = "siri_tip_hand_adds";
const DISMISSED_KEY = "siri_tip_dismissed";
const MIN_HAND_ADDS = 3;

// It would pop up mid-flow in the e2e shopping list tests
const enabled = Platform.OS === "ios" && !isE2ETestingEnabled();

export function countHandAddedItem() {
  if (!enabled) return;
  AsyncStorage.getItem(HAND_ADDS_KEY)
    .then((adds) =>
      AsyncStorage.setItem(HAND_ADDS_KEY, String(Number(adds) + 1)),
    )
    .catch(() => undefined);
}

export function SiriTip() {
  const t = useTranslations("siri.tip");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    Promise.all([
      AsyncStorage.getItem(HAND_ADDS_KEY),
      AsyncStorage.getItem(DISMISSED_KEY),
    ])
      .then(([adds, dismissed]) =>
        setVisible(dismissed === null && Number(adds) >= MIN_HAND_ADDS),
      )
      .catch(() => undefined);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    void AsyncStorage.setItem(DISMISSED_KEY, "true");
  };

  return (
    <TipCard
      className="mx-4 mt-2 mb-2"
      title={t("title")}
      body={t("body")}
      dismissLabel={t("dismiss")}
      onDismiss={dismiss}
    />
  );
}
