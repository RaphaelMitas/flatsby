import type { ReactNode } from "react";
import { useState } from "react";
import { Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { failureOf } from "@flatsby/api/resultMutation";
import { translateIfKey } from "@flatsby/i18n/message-key";
import {
  newGroupFormSchema,
  splitFlatmateNames,
} from "@flatsby/validators/group";
import { defaultUserName } from "@flatsby/validators/user";

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
import { useSession } from "~/utils/auth/auth-client";

export default function WelcomeScreen() {
  const session = useSession();
  const user = session.data?.user;
  if (!user) return <Redirect href="/auth/login" />;
  return (
    <WelcomeForm
      initialName={user.name === defaultUserName(user.email) ? "" : user.name}
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
  const [name, setName] = useState(initialName);
  const [editedGroupName, setEditedGroupName] = useState<string>();
  const [flatmates, setFlatmates] = useState("");
  const [currency] = useState(deviceCurrency);
  const [issues, setIssues] = useState<
    { path: PropertyKey[]; message: string }[]
  >([]);
  const [opening, setOpening] = useState(false);

  const firstName = name.trim().split(/\s+/)[0] ?? "";
  const groupName =
    editedGroupName ??
    (firstName
      ? t("group.onboarding.defaultGroupName", { name: firstName })
      : "");
  const names = splitFlatmateNames(flatmates);

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

  // Home should open with the invite card complete, so the button stays busy until both are cached
  const createGroup = useCreateGroup((groupId) => {
    setOpening(true);
    void Promise.allSettled([
      queryClient.ensureQueryData(
        trpc.group.getGroup.queryOptions({ id: groupId }),
      ),
      queryClient.ensureQueryData(trpc.invite.get.queryOptions({ groupId })),
    ]).then(() => router.replace("/(tabs)/home"));
  });

  const saveName = async (trimmed: string) =>
    trimmed === savedName ||
    (await updateName.mutateAsync({ name: trimmed }).catch(() => undefined))
      ?.success === true;

  const submit = async () => {
    const parsed = newGroupFormSchema.safeParse({
      name: name.trim(),
      groupName: groupName.trim(),
      placeholders: names,
    });
    setIssues(parsed.error?.issues ?? []);
    if (!parsed.success) return;
    if (!(await saveName(parsed.data.name))) return;
    createGroup.mutate({
      name: parsed.data.groupName,
      currency,
      placeholders: parsed.data.placeholders,
    });
  };

  // Someone who lost their invite link joins from here, so this is their name step too
  const joinWithCode = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== savedName) void saveName(trimmed);
    router.push("/join");
  };

  const busy = updateName.isPending || createGroup.isPending || opening;
  const issueFor = (field: string) => {
    const message = issues.find(({ path }) => path[0] === field)?.message;
    return message && translateIfKey(t, message);
  };
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

        <Field label={t("group.onboarding.nameLabel")} error={issueFor("name")}>
          <Input
            testID="onboarding-name-input"
            value={name}
            onChangeText={setName}
            placeholder={t("auth.name.placeholder")}
            accessibilityLabel={t("group.onboarding.nameLabel")}
            autoFocus={initialName === ""}
            autoComplete="name"
            textContentType="givenName"
            returnKeyType="done"
            editable={!busy}
            error={issueFor("name") !== undefined}
          />
        </Field>

        <Field
          label={t("group.onboarding.groupLabel")}
          error={issueFor("groupName")}
        >
          <Input
            testID="onboarding-group-input"
            value={groupName}
            onChangeText={setEditedGroupName}
            placeholder={t("group.create.namePlaceholder")}
            accessibilityLabel={t("group.onboarding.groupLabel")}
            returnKeyType="done"
            editable={!busy}
            error={issueFor("groupName") !== undefined}
          />
        </Field>

        <Field
          label={t("group.onboarding.flatmatesLabel")}
          error={issueFor("placeholders")}
        >
          <Input
            testID="onboarding-flatmates-input"
            value={flatmates}
            onChangeText={setFlatmates}
            placeholder={t("group.onboarding.flatmatesPlaceholder")}
            accessibilityLabel={t("group.onboarding.flatmatesLabel")}
            autoCapitalize="words"
            returnKeyType="done"
            editable={!busy}
            error={issueFor("placeholders") !== undefined}
          />
          {names.length > 0 && (
            <>
              <View className="flex-row flex-wrap gap-2">
                {names.map((flatmate) => (
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
            onPress={submit}
          />
          <Button
            testID="onboarding-join"
            variant="ghost"
            className="w-full py-4"
            title={t("invite.join.withCode")}
            disabled={busy}
            onPress={joinWithCode}
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
