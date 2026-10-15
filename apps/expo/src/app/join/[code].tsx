import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { INVITE_PATH, inviteCodeSchema } from "@flatsby/validators/invite";

import { Avatar, AvatarFallback, AvatarImage } from "~/lib/ui/avatar";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { trpc } from "~/utils/api";
import { useSession } from "~/utils/auth/auth-client";
import { useShoppingStore } from "~/utils/shopping-store";

const initials = (name: string) => name.substring(0, 2).toUpperCase();

export default function JoinScreen() {
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
    setSelectedGroup(groupId, groupName);
    router.replace("/(tabs)/home/shopping-lists");
  };

  const join = useMutation(
    trpc.invite.join.mutationOptions({
      onSuccess: (data) => {
        if (data.success) openGroup(data.data.groupId, data.data.groupName);
      },
    }),
  );

  const close = () =>
    router.canGoBack() ? router.back() : router.replace("/");

  const invite = preview.data?.success ? preview.data.data : null;

  return (
    <SafeAreaView>
      <View className="bg-background flex-1 px-6 pb-6">
        <Pressable onPress={close} className="self-start py-3">
          <Icon name="x" size={24} color="muted-foreground" />
        </Pressable>

        {parsed.success && preview.isPending ? (
          <ActivityIndicator className="flex-1" />
        ) : !invite ? (
          <View
            testID="join-invite-expired"
            className="flex-1 justify-center gap-2"
          >
            <Text className="text-foreground text-center text-lg font-semibold">
              This invite has expired
            </Text>
            <Text className="text-muted-foreground text-center text-sm">
              Ask someone in the group for a new link.
            </Text>
          </View>
        ) : (
          <>
            <View className="flex-1 items-center justify-center gap-3">
              <Avatar className="h-20 w-20">
                <AvatarImage src={invite.profilePicture ?? undefined} />
                <AvatarFallback>{initials(invite.groupName)}</AvatarFallback>
              </Avatar>
              <Text className="text-muted-foreground text-sm">
                {invite.invitedBy} invited you to
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
                    <Avatar
                      key={member.name}
                      className={`border-background h-8 w-8 border-2 ${i > 0 ? "-ml-2" : ""}`}
                    >
                      <AvatarImage src={member.image ?? undefined} />
                      <AvatarFallback>{initials(member.name)}</AvatarFallback>
                    </Avatar>
                  ))}
                </View>
                <Text className="text-muted-foreground text-sm">
                  {invite.memberCount}{" "}
                  {invite.memberCount === 1 ? "member" : "members"}
                </Text>
              </View>
              <Text className="text-muted-foreground mt-2 max-w-64 text-center text-xs">
                Members will see your name and profile picture, and you'll see
                the group's lists and expenses.
              </Text>
            </View>

            <View className="gap-3">
              {join.data?.success === false && (
                <Text className="text-destructive text-center text-sm">
                  {join.data.error.message}
                </Text>
              )}
              {!session ? (
                <Button
                  title={`Sign in to join ${invite.groupName}`}
                  onPress={() =>
                    router.push({
                      pathname: "/auth/login",
                      params: { next: `${INVITE_PATH}/${code}` },
                    })
                  }
                />
              ) : invite.isMember ? (
                <Button
                  title="Open group"
                  onPress={() => openGroup(invite.groupId, invite.groupName)}
                />
              ) : (
                <Button
                  testID="join-invite-button"
                  title={`Join ${invite.groupName}`}
                  disabled={join.isPending}
                  icon={join.isPending ? "loader" : undefined}
                  onPress={() => join.mutate({ code })}
                />
              )}
              <Button title="Not now" variant="ghost" onPress={close} />
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
