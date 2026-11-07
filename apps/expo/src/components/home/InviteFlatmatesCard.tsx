import type { InvitePlaceholder } from "@flatsby/validators/group";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { failureOf } from "@flatsby/api/resultMutation";
import { openPlaceholders } from "@flatsby/validators/group";
import {
  formatInviteCode,
  inviteDaysLeft,
  spokenInviteCode,
} from "@flatsby/validators/invite";
import { useOnce } from "@flatsby/validators/useOnce";
import {
  markInviteShared,
  useWaitingForFlatmates,
} from "@flatsby/validators/useWaitingForFlatmates";

import { MemberAvatar } from "~/components/expenses/MemberAvatar";
import {
  useInviteMessage,
  useShareInvite,
} from "~/components/invite/useShareInvite";
import { Button } from "~/lib/ui/button";
import { Card, CardContent } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";
import { trpc } from "~/utils/api";

const dismissedKey = (groupId: number) => `invite_card_dismissed_${groupId}`;

export function InviteFlatmatesCard({
  groupId,
  className,
}: {
  groupId: number;
  className?: string;
}) {
  const t = useTranslations();
  const [dismissal, setDismissal] = useState<{
    groupId: number;
    dismissed: boolean;
  }>();
  const once = useOnce();
  const { data: group } = useQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );
  const waiting = useWaitingForFlatmates(
    groupId,
    group?.success ? group.data.groupMembers : undefined,
  );
  const visible =
    waiting && dismissal?.groupId === groupId && !dismissal.dismissed;

  const invite = useQuery({
    ...trpc.invite.get.queryOptions({ groupId }),
    enabled: visible,
  });
  const message = useInviteMessage();
  const shareInvite = useShareInvite();
  const sharePressed = useMutation(trpc.invite.sharePressed.mutationOptions());

  useEffect(() => {
    AsyncStorage.getItem(dismissedKey(groupId))
      .then((value) => setDismissal({ groupId, dismissed: value !== null }))
      .catch(() => setDismissal({ groupId, dismissed: false }));
  }, [groupId]);

  if (!visible || !group?.success) return null;

  const dismiss = () => {
    setDismissal({ groupId, dismissed: true });
    void AsyncStorage.setItem(dismissedKey(groupId), "true");
  };

  const placeholders = openPlaceholders(group.data.groupMembers);
  const code = invite.data?.success ? invite.data.data : undefined;
  const loadFailure = failureOf(invite, t("invite.loadFailed"));

  const share = once(async (placeholder?: InvitePlaceholder) => {
    if (!code) return;
    markInviteShared(groupId);
    sharePressed.mutate({ groupId, personal: placeholder !== undefined });
    await shareInvite(code.code, placeholder).catch(() => undefined);
  });

  return (
    <Card testID="invite-flatmates-card" className={className}>
      <CardContent className="gap-3 p-4">
        <View className="flex-row items-start gap-2">
          <Text className="text-foreground flex-1 text-base font-bold">
            {t("invite.card.title", { group: group.data.name })}
          </Text>
          <Pressable
            testID="invite-flatmates-dismiss"
            accessibilityLabel={t("invite.card.dismiss")}
            hitSlop={8}
            onPress={dismiss}
          >
            <Icon name="x" size={18} color="muted-foreground" />
          </Pressable>
        </View>
        <Text className="text-muted-foreground text-sm">
          {placeholders.length > 0
            ? t("invite.card.namedBody")
            : t("invite.card.body")}
        </Text>

        {loadFailure !== undefined ? (
          <View className="gap-2">
            <Text className="text-destructive text-sm">{loadFailure}</Text>
            <Button
              title={t("home.retry")}
              variant="outline"
              disabled={invite.isFetching}
              onPress={() => void invite.refetch()}
            />
          </View>
        ) : (
          <>
            {code && (
              <View
                testID="invite-card-preview"
                className="bg-muted gap-1 rounded-lg p-3"
              >
                <Text className="text-muted-foreground text-xs">
                  {t("invite.card.preview")}
                </Text>
                <Text
                  className="text-foreground text-sm italic"
                  numberOfLines={4}
                >
                  {message(code.code, placeholders[0])}
                </Text>
              </View>
            )}

            {placeholders.length === 0 ? (
              <Button
                testID="invite-card-share"
                title={t("invite.shareLink")}
                icon={code ? "share" : "loader"}
                disabled={!code}
                onPress={() => share()}
              />
            ) : (
              <View className="gap-2">
                {placeholders.map((placeholder) => (
                  <View
                    key={placeholder.id}
                    className="flex-row items-center gap-3"
                  >
                    <MemberAvatar
                      person={{
                        name: placeholder.name,
                        image: null,
                        placeholder: true,
                      }}
                      className="h-8 w-8"
                      textClassName="text-xs"
                    />
                    <Text className="text-foreground flex-1 text-sm font-medium">
                      {placeholder.name}
                    </Text>
                    <Button
                      testID={`invite-card-send-${placeholder.id}`}
                      title={t("invite.card.send")}
                      accessibilityLabel={t("invite.card.sendTo", {
                        name: placeholder.name,
                      })}
                      size="sm"
                      icon="share"
                      disabled={!code}
                      onPress={() => share(placeholder)}
                    />
                  </View>
                ))}
                <Button
                  testID="invite-card-group-chat"
                  title={t("invite.card.groupChat")}
                  variant="outline"
                  disabled={!code}
                  onPress={() => share()}
                />
              </View>
            )}

            <View className="flex-row items-center justify-between gap-2">
              <Text className="text-muted-foreground text-xs">
                {t("invite.card.code")}
              </Text>
              {code && (
                <Text
                  testID="invite-card-code"
                  accessibilityLabel={spokenInviteCode(code.code)}
                  className="text-foreground font-mono text-base font-bold tracking-widest"
                >
                  {formatInviteCode(code.code)}
                </Text>
              )}
            </View>
            {code && (
              <Text className="text-muted-foreground text-xs">
                {t("invite.expiresIn", {
                  days: inviteDaysLeft(code.expiresAt),
                })}
              </Text>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
