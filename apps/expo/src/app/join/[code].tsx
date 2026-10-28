import type { ReactNode } from "react";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { failureOf } from "@flatsby/api/resultMutation";
import { inviteCodeSchema, invitePath } from "@flatsby/validators/invite";

import { MemberAvatar } from "~/components/expenses/MemberAvatar";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { cn } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { useSession } from "~/utils/auth/auth-client";
import {
  clearPostLoginPath,
  rememberPostLoginPath,
} from "~/utils/auth/post-login-path";
import { useShoppingStore } from "~/utils/shopping-store";

export default function JoinScreen() {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const { setSelectedGroup } = useShoppingStore();
  const parsed = inviteCodeSchema.safeParse(
    useLocalSearchParams<{ code: string }>().code,
  );
  const code = parsed.data ?? "";

  const preview = useQuery({
    ...trpc.invite.preview.queryOptions({ code }),
    enabled: parsed.success,
  });
  const [picked, setPicked] = useState<{ id: number; name: string }>();

  const openGroup = (groupId: number, groupName: string) => {
    void queryClient.invalidateQueries(trpc.group.getUserGroups.queryFilter());
    void queryClient.invalidateQueries(
      trpc.user.getCurrentUserWithGroups.queryFilter(),
    );
    setSelectedGroup(groupId, groupName);
    router.dismissTo("/(tabs)/home");
  };

  const invite = preview.data?.success ? preview.data.data : null;
  const claim = invite?.placeholders.find(({ id }) => id === picked?.id);
  // Someone else claimed the picked spot, seen on a refetch or a refused join
  const takenName = invite && picked && !claim ? picked.name : undefined;

  const join = useMutation(
    trpc.invite.join.mutationOptions({
      onSuccess: (data) => {
        if (data.success) {
          openGroup(data.data.groupId, data.data.groupName);
          return;
        }
        if (data.error.details.messageKey !== "errors.placeholderTaken") return;
        void queryClient.invalidateQueries(
          trpc.invite.preview.queryFilter({ code }),
        );
      },
    }),
  );

  const close = () => {
    clearPostLoginPath();
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const joinFailure =
    takenName !== undefined
      ? t("invite.join.placeholderTaken", { name: takenName })
      : failureOf(join, t("invite.join.joinFailed"));
  const expired =
    !parsed.success ||
    (preview.data?.success === false &&
      preview.data.error.type === "NotFoundError");

  return (
    <SafeAreaView>
      <View className="bg-background flex-1 px-6 pb-6">
        <Pressable onPress={close} className="self-start py-3">
          <Icon name="x" size={24} color="muted-foreground" />
        </Pressable>

        {parsed.success && preview.isPending ? (
          <ActivityIndicator className="flex-1" />
        ) : !invite && !expired ? (
          <View className="flex-1 justify-center gap-4">
            <Text className="text-foreground text-center text-lg font-semibold">
              {t("invite.join.loadFailedTitle")}
            </Text>
            <Button
              title={t("home.retry")}
              variant="outline"
              disabled={preview.isFetching}
              onPress={() => void preview.refetch()}
            />
          </View>
        ) : !invite ? (
          <View
            testID="join-invite-expired"
            className="flex-1 justify-center gap-2"
          >
            <Text className="text-foreground text-center text-lg font-semibold">
              {t("invite.join.expiredTitle")}
            </Text>
            <Text className="text-muted-foreground text-center text-sm">
              {t("invite.join.expiredHint")}
            </Text>
          </View>
        ) : (
          <>
            <View className="flex-1 items-center justify-center gap-3">
              <MemberAvatar
                person={{
                  name: invite.groupName,
                  image: invite.profilePicture,
                }}
                className="h-20 w-20"
              />
              <Text className="text-muted-foreground text-sm">
                {t("invite.join.invitedYouTo", { name: invite.invitedBy })}
              </Text>
              <Text
                testID="join-invite-group-name"
                className="text-foreground text-center text-2xl font-bold"
              >
                {invite.groupName}
              </Text>
              <View className="flex-row items-center gap-2">
                <View className="flex-row">
                  {invite.members.map((member, i) => (
                    <MemberAvatar
                      // biome-ignore lint/suspicious/noArrayIndexKey: names repeat and the public preview carries no ids
                      key={i}
                      person={member}
                      className={`border-background h-8 w-8 border-2 ${i > 0 ? "-ml-2" : ""}`}
                    />
                  ))}
                </View>
                <Text className="text-muted-foreground text-sm">
                  {t("group.memberCount", { count: invite.memberCount })}
                </Text>
              </View>
              <Text className="text-muted-foreground mt-2 max-w-64 text-center text-xs">
                {t("invite.join.consent")}
              </Text>
            </View>

            <View className="gap-3">
              {joinFailure !== undefined && (
                <Text className="text-destructive text-center text-sm">
                  {joinFailure}
                </Text>
              )}
              {!session ? (
                <Button
                  title={t("invite.join.signInToJoinGroup", {
                    group: invite.groupName,
                  })}
                  onPress={() => {
                    rememberPostLoginPath(invitePath(code));
                    router.push("/auth/login");
                  }}
                />
              ) : invite.isMember ? (
                <Button
                  title={t("invite.join.openGroup")}
                  onPress={() => openGroup(invite.groupId, invite.groupName)}
                />
              ) : (
                <>
                  {invite.placeholders.length > 0 && (
                    <View className="gap-2">
                      <Text className="text-foreground text-sm font-semibold">
                        {t("invite.join.alreadyListed")}
                      </Text>
                      {invite.placeholders.map(({ id, name }) => (
                        <ClaimOption
                          key={id}
                          testID={`join-claim-option-${id}`}
                          selected={claim?.id === id}
                          disabled={join.isPending}
                          onPress={() => setPicked({ id, name })}
                        >
                          <MemberAvatar
                            person={{ name, image: null, placeholder: true }}
                            className="h-6 w-6"
                            textClassName="text-xs"
                          />
                          <Text className="text-foreground text-sm">
                            {t("invite.join.iAm", { name })}
                          </Text>
                        </ClaimOption>
                      ))}
                      <ClaimOption
                        testID="join-claim-new"
                        selected={claim === undefined}
                        disabled={join.isPending}
                        onPress={() => setPicked(undefined)}
                      >
                        <Text className="text-foreground text-sm">
                          {t("invite.join.imNew")}
                        </Text>
                      </ClaimOption>
                    </View>
                  )}
                  <Button
                    testID="join-invite-button"
                    title={
                      claim
                        ? t("invite.join.joinAs", { name: claim.name })
                        : t("invite.join.join", { group: invite.groupName })
                    }
                    disabled={join.isPending || preview.isFetching}
                    icon={join.isPending ? "loader" : undefined}
                    onPress={() => {
                      setPicked(claim);
                      join.mutate({ code, placeholderId: claim?.id });
                    }}
                  />
                </>
              )}
              <Button
                title={t("invite.join.notNow")}
                variant="ghost"
                onPress={close}
              />
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function ClaimOption({
  testID,
  selected,
  disabled,
  onPress,
  children,
}: {
  testID: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      className={cn(
        "bg-background flex-row items-center gap-3 rounded-xl border-2 p-3",
        selected ? "border-primary" : "border-border",
      )}
    >
      <View
        className={cn(
          "h-5 w-5 items-center justify-center rounded-full border-2",
          selected ? "border-primary" : "border-muted-foreground",
        )}
      >
        {selected && <View className="bg-primary h-2.5 w-2.5 rounded-full" />}
      </View>
      {children}
    </Pressable>
  );
}
