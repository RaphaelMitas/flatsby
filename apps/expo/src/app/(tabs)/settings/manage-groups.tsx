import { Stack } from "expo-router";

import { GroupsDashboard } from "~/components/groupDashboard/GroupsDashboard";

const ManageGroups = () => {
  return (
    <>
      <Stack.Screen
        options={{
          title: "Manage Groups",
          headerBackTitle: "Settings",
        }}
      />
      <GroupsDashboard />
    </>
  );
};

export default ManageGroups;
