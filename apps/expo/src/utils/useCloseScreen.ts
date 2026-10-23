import { useNavigation, useRoute, useRouter } from "expo-router";

// A save can resolve after the user left: never pop someone else's screen
export function useCloseScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const route = useRoute();

  return () => {
    const stack = navigation.getState();
    const index = stack?.routes.findIndex(({ key }) => key === route.key) ?? -1;
    if (!stack || index < 0) return;
    if (index > 0) {
      navigation.dispatch({
        type: "GO_BACK",
        source: route.key,
        target: stack.key,
      });
    } else if (navigation.isFocused()) {
      router.back();
    }
  };
}
