import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { inviteCodeSchema, invitePath } from "@flatsby/validators/invite";

import { MemberAvatar } from "~/components/expenses/MemberAvatar";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { SafeAreaView } from "~/lib/ui/safe-area";
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

  const openGroup = (groupId: number, groupName: string) => {
    void queryClient.invalidateQueries(trpc.group.getUserGroups.queryFilter());
    void queryClient.invalidateQueries(
      trpc.user.getCurrentUserWithGroups.queryFilter(),
    );
    setSelectedGroup(groupId, groupName);
    router.dismissTo("/(tabs)/home");
  };

  const join = useMutation(
    trpc.invite.join.mutationOptions({
      onSuccess: (data) => {
        if (data.success) openGroup(data.data.groupId, data.data.groupName);
      },
    }),
  );

  const close = () => {
    clearPostLoginPath();
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const invite = preview.data?.success ? preview.data.data : null;
  const expired =
    !parsed.success ||
    (preview.data?.success === false &&
      preview.data.error.type === "NotFoundError");

  return (
    // On iOS this is a sheet, which never reaches the status bar
    <SafeAreaView edges={Platform.OS === "ios" ? [] : ["top"]}>
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
              {(join.isError || join.data?.success === false) && (
                <Text className="text-destructive text-center text-sm">
                  {join.data?.success === false
                    ? join.data.error.message
                    : t("invite.join.joinFailed")}
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
                <Button
                  testID="join-invite-button"
                  title={t("invite.join.join", { group: invite.groupName })}
                  disabled={join.isPending || preview.isFetching}
                  icon={join.isPending ? "loader" : undefined}
                  onPress={() => join.mutate({ code })}
                />
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
