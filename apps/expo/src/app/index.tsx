import { Redirect } from "expo-router";

export default function RootIndex() {
  // Redirect to the home tab
  return <Redirect href="/(tabs)/home" />;
}
