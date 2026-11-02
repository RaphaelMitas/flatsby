import {
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

export const CAT_SIZE = 56;
export const HOP = 8;

export function useCatTap() {
  const hop = useSharedValue(0);

  const tap = () => {
    hop.value = withSequence(
      withTiming(-HOP, { duration: 120 }),
      withSpring(0, { damping: 8, stiffness: 300 }),
    );
  };

  return { hop, tap };
}
