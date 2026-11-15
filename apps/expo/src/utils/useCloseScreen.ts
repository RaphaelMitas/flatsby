import { useNavigation, useRoute } from "expo-router";

export function useCloseScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  return () => {
    let nav = navigation;
    let key = route.key;
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
