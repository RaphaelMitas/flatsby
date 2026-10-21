import { useState } from "react";
import { View } from "react-native";
import {
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { season } from "~/lib/seasonal/season";

export const CAT_SIZE = 56;
export const HOP = 8;

export function useCatTap() {
  const hop = useSharedValue(0);
  const [taps, setTaps] = useState(0);

  const tap = () => {
    hop.value = withSequence(
      withTiming(-HOP, { duration: 120 }),
      withSpring(0, { damping: 8, stiffness: 300 }),
    );
    setTaps((n) => n + 1);
  };

  return { hop, taps, tap };
}

export function CatTapReaction({ taps }: { taps: number }) {
  const TapReaction = season.TapReaction;
  if (!TapReaction || taps === 0) return null;
  return (
    <View pointerEvents="none" className="absolute top-5 left-1/2">
      <TapReaction key={taps} />
    </View>
  );
}
