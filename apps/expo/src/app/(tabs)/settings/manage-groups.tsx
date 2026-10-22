import { Stack } from "expo-router";
import { useTranslations } from "use-intl";

import { GroupsDashboard } from "~/components/groupDashboard/GroupsDashboard";
import { useThemedScreenOptions } from "~/lib/utils";

const ManageGroups = () => {
  const t = useTranslations("navigation");
  const { solidHeader } = useThemedScreenOptions();
  return (
    <>
      <Stack.Screen
        options={{
          title: t("manageGroups"),
          headerBackTitle: t("settings"),
          ...solidHeader,
        }}
      />
      <GroupsDashboard />
    </>
  );
};

export default ManageGroups;
