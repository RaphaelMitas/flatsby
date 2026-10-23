import { useNavigation, useRoute } from "expo-router";

// A save can resolve after the user left: never pop someone else's screen
export function useCloseScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  return () => {
    let nav = navigation;
    let key = route.key;
    // The root of a nested stack closes by popping the route that owns it
    for (;;) {
      const state = nav.getState();
      const index = state?.routes.findIndex((r) => r.key === key) ?? -1;
      if (!state || index < 0) return;
      if (index > 0) {
        nav.dispatch({ type: "GO_BACK", source: key, target: state.key });
        return;
      }
      const parent = nav.getParent();
      const parentState = parent?.getState();
      const owner = parentState?.routes.find((r) => r.state?.key === state.key);
      if (!parent || parentState?.type !== "stack" || !owner) return;
      nav = parent;
      key = owner.key;
    }
  };
}
