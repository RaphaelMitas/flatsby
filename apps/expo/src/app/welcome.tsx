import type { ReactNode } from "react";
import { useState } from "react";
import { Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { failureOf } from "@flatsby/api/resultMutation";
import { useNewGroupForm } from "@flatsby/validators/useNewGroupForm";
import { typedName } from "@flatsby/validators/user";

import { MemberAvatar } from "~/components/expenses/MemberAvatar";
import {
  deviceCurrency,
  useCreateGroup,
} from "~/components/groupDashboard/useCreateGroup";
import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Button } from "~/lib/ui/button";
import { Input } from "~/lib/ui/input";
import { Label } from "~/lib/ui/label";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { trpc } from "~/utils/api";
import { signOut, useSession } from "~/utils/auth/auth-client";
import { useShoppingStore } from "~/utils/shopping-store";

export default function WelcomeScreen() {
  const session = useSession();
  const user = session.data?.user;
  if (!user) return <Redirect href="/auth/login" />;
  return (
    <WelcomeForm
      initialName={typedName(user)}
      savedName={user.name}
      onNameSaved={() => void session.refetch()}
    />
  );
}

function WelcomeForm({
  initialName,
  savedName,
  onNameSaved,
}: {
  initialName: string;
  savedName: string;
  onNameSaved: () => void;
}) {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currency] = useState(deviceCurrency);
  const { clearSelectedGroup } = useShoppingStore();
  const { data: groups } = useQuery(trpc.group.getUserGroups.queryOptions());

  const updateName = useMutation(
    trpc.user.updateUserName.mutationOptions({
      onSuccess: (result) => {
        if (!result.success) return;
        void queryClient.invalidateQueries(
          trpc.user.getCurrentUser.queryOptions(),
        );
        void queryClient.invalidateQueries(
          trpc.user.getCurrentUserWithGroups.queryOptions(),
        );
        onNameSaved();
      },
    }),
  );

  // Home should open with the invite card complete, so stay busy until the group and its invite are cached
  const createGroup = useCreateGroup((groupId) => {
    void Promise.allSettled([
      queryClient.ensureQueryData(
        trpc.group.getGroup.queryOptions({ id: groupId }),
      ),
      queryClient.ensureQueryData(trpc.invite.get.queryOptions({ groupId })),
    ]).then(() => router.replace("/(tabs)/home"));
  });

  const form = useNewGroupForm({
    t,
    initialName,
    savedName,
    saveName: (name) => updateName.mutateAsync({ name }),
    create: (group) => createGroup.mutateAsync({ ...group, currency }),
    openJoin: () => router.push("/join"),
  });

  // Success stays busy too: the WG exists and Home is still loading
  const busy =
    updateName.isPending ||
    createGroup.isPending ||
    createGroup.data?.success === true;
  // A stale cached empty list or a deep link can land someone who already has a group here
  if (!busy && groups?.success && groups.data.length > 0) {
    return <Redirect href="/(tabs)/home" />;
  }

  const failure =
    failureOf(updateName, t("errors.unexpected")) ??
    failureOf(createGroup, t("errors.unexpected"));

  return (
    <SafeAreaView>
      <AppScrollView
        bottomOffset={96}
        contentContainerClassName="gap-6 px-6 py-8"
      >
        <View className="gap-2">
          <Text
            testID="onboarding-title"
            className="text-foreground text-3xl font-extrabold tracking-tight"
          >
            {t("group.onboarding.title")}
          </Text>
          <Text className="text-muted-foreground text-base">
            {t("group.onboarding.question")}
          </Text>
        </View>

        <Field
          label={t("group.onboarding.nameLabel")}
          error={form.issueFor("name")}
        >
          <Input
            testID="onboarding-name-input"
            value={form.name}
            onChangeText={form.setName}
            placeholder={t("auth.name.placeholder")}
            accessibilityLabel={t("group.onboarding.nameLabel")}
            autoFocus={initialName === ""}
            autoComplete="name"
            textContentType="givenName"
            returnKeyType="done"
            editable={!busy}
            error={form.issueFor("name") !== undefined}
          />
        </Field>

        <Field
          label={t("group.onboarding.groupLabel")}
          error={form.issueFor("groupName")}
        >
          <Input
            testID="onboarding-group-input"
            value={form.groupName}
            onChangeText={form.setGroupName}
            placeholder={t("group.create.namePlaceholder")}
            accessibilityLabel={t("group.onboarding.groupLabel")}
            returnKeyType="done"
            editable={!busy}
            error={form.issueFor("groupName") !== undefined}
          />
        </Field>

        <Field
          label={t("group.onboarding.flatmatesLabel")}
          error={form.issueFor("placeholders")}
        >
          <Input
            testID="onboarding-flatmates-input"
            value={form.flatmates}
            onChangeText={form.setFlatmates}
            placeholder={t("group.onboarding.flatmatesPlaceholder")}
            accessibilityLabel={t("group.onboarding.flatmatesLabel")}
            autoCapitalize="words"
            returnKeyType="done"
            editable={!busy}
            error={form.issueFor("placeholders") !== undefined}
          />
          {form.names.length > 0 && (
            <>
              <View className="flex-row flex-wrap gap-2">
                {form.names.map((flatmate) => (
                  <View
                    key={flatmate}
                    className="bg-muted flex-row items-center gap-2 rounded-full py-1 pr-3 pl-1"
                  >
                    <MemberAvatar
                      person={{
                        name: flatmate,
                        image: null,
                        placeholder: true,
                      }}
                      className="h-6 w-6"
                      textClassName="text-xs"
                    />
                    <Text className="text-foreground text-sm">{flatmate}</Text>
                  </View>
                ))}
              </View>
              <Text className="text-muted-foreground text-sm">
                {t("group.onboarding.flatmatesHint")}
              </Text>
            </>
          )}
        </Field>

        <Text className="text-muted-foreground text-sm">
          {t("group.onboarding.currency", { currency })}
        </Text>

        {failure !== undefined && (
          <Text className="text-destructive text-sm">{failure}</Text>
        )}

        <View className="gap-2">
          <Button
            testID="onboarding-create"
            className="w-full py-4"
            title={
              busy
                ? t("group.onboarding.creating")
                : t("group.onboarding.create")
            }
            icon={busy ? "loader" : undefined}
            disabled={busy}
            onPress={form.submit}
          />
          <Button
            testID="onboarding-join"
            variant="ghost"
            className="w-full py-4"
            title={t("invite.join.withCode")}
            disabled={busy}
            onPress={form.joinWithCode}
          />
          {/* Without a group there are no tabs, so this is the only way to a different account */}
          <Button
            testID="onboarding-sign-out"
            variant="link"
            title={t("navigation.logout")}
            disabled={busy}
            onPress={() => {
              clearSelectedGroup();
              void signOut();
            }}
          />
        </View>
      </AppScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error: string | undefined;
  children: ReactNode;
}) {
  return (
    <View className="gap-2">
      <Label>{label}</Label>
      {children}
      {error !== undefined && (
        <Text className="text-destructive text-sm">{error}</Text>
      )}
    </View>
  );
}
