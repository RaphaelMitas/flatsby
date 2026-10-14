import { Stack } from "expo-router";
import { useTranslations } from "use-intl";

import { GroupsDashboard } from "~/components/groupDashboard/GroupsDashboard";

const ManageGroups = () => {
  const t = useTranslations("navigation");
  return (
    <>
      <Stack.Screen
        options={{
          title: t("manageGroups"),
          headerBackTitle: t("settings"),
        }}
      />
      <GroupsDashboard />
    </>
  );
};

export default ManageGroups;
