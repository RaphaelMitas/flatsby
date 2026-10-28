import { usePostHog } from "posthog-react-native";

import { storedChoice } from "./stored-choice";

// "undecided" is the classic home with the invite to try the new one.
export type HomeVersion = "new" | "classic" | "undecided";

const homeVersion = storedChoice<HomeVersion>("home-version", (saved) =>
  saved === "new" || saved === "classic" ? saved : "undecided",
);

/** null until the stored choice is read */
export function useHomeVersion() {
  const posthog = usePostHog();
  const current = homeVersion.useValue();

  const switchTo = (
    next: HomeVersion,
    source: "invite" | "switch_back" | "settings",
    reason?: string,
  ) => {
    if (next === current) return;
    posthog.capture("home_version_changed", {
      from: current,
      to: next,
      source,
      ...(reason && { reason }),
      $set: { home_version: next },
    });
    homeVersion.save(next);
  };

  return { version: current, switchTo };
}
