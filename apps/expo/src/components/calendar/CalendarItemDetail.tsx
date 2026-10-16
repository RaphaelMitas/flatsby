import type { GroupWithAccess } from "@flatsby/api";
import type { ReactNode } from "react";
import { Fragment, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "use-intl";

import {
  describeRecurrence,
  formatCalendarDate,
  localDate,
} from "@flatsby/validators/calendar";

import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Badge } from "~/lib/ui/badge";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { cn } from "~/lib/utils";
import { trpc } from "~/utils/api";
import {
  OccurrenceStatus,
  PersonPill,
  useCalendarPeople,
} from "./CalendarPeople";
import { useCalendarMutations } from "./useCalendarMutations";

interface CalendarItemDetailProps {
  group: GroupWithAccess;
  itemId: number;
  /** The occurrence that was tapped, which skip acts on */
  date: string | undefined;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mt-6 gap-2">
      <Text className="text-muted-foreground text-sm font-semibold">
        {title}
      </Text>
      {children}
    </View>
  );
}

function DateRow({
  label,
  first,
  onPress,
  children,
}: {
  label: string;
  first: boolean;
  onPress?: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      disabled={!onPress}
      accessible={!!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      className={cn(
        "active:bg-muted flex-row items-center justify-between gap-3 px-3.5 py-2.5",
        !first && "border-border border-t",
      )}
    >
      <Text className="text-foreground">{label}</Text>
      {children}
    </Pressable>
  );
}

export function CalendarItemDetail({
  group,
  itemId,
  date,
}: CalendarItemDetailProps) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const people = useCalendarPeople(group);
  const today = localDate();
  const { setSkipped, remove } = useCalendarMutations(group);
  const [armed, setArmed] = useState(false);

  const { data } = useQuery(
    trpc.calendar.item.queryOptions({ groupId: group.id, id: itemId, today }),
  );

  if (!data) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (!data.success) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-destructive text-center">
          {data.error.message}
        </Text>
      </View>
    );
  }

  const { item, upcoming, history } = data.data;
  const dayLabel = (day: string) =>
    day === today
      ? t("calendar.today")
      : formatCalendarDate(day, locale, {
          weekday: "short",
          day: "numeric",
          month: "short",
        });
  const repeats = item.recurrence !== null;
  const currentTurn = upcoming[0]?.turnGroupMemberId ?? null;
  const showOnCalendar = (day: string) =>
    router.dismissTo({ pathname: "/(tabs)/calendar", params: { date: day } });
  const skip = (day: string, skipped: boolean) =>
    setSkipped.mutate({
      groupId: group.id,
      itemId: item.id,
      date: day,
      skipped,
    });

  return (
    <AppScrollView contentContainerClassName="p-5 pb-12">
      <Text
        testID="calendar-detail-title"
        className="text-foreground text-2xl font-bold"
      >
        {item.title}
      </Text>
      <View className="mt-2 flex-row flex-wrap gap-1.5">
        <Badge
          variant="secondary"
          icon={
            <Icon
              name={item.kind === "event" ? "clock" : "square-check"}
              size={12}
              color="muted-foreground"
            />
          }
          label={t(`calendar.kind.${item.kind}`)}
        />
        <Badge
          variant="secondary"
          icon={<Icon name="repeat" size={12} color="muted-foreground" />}
          label={describeRecurrence(item.recurrence, t, locale)}
        />
        {item.kind === "event" && (
          <Badge
            variant="secondary"
            label={item.time ?? t("calendar.allDay")}
          />
        )}
      </View>

      {item.kind === "task" && (
        <Section
          title={
            item.memberIds.length > 1
              ? t("calendar.detail.order")
              : t("calendar.form.who")
          }
        >
          {item.memberIds.length === 0 ? (
            <Text className="text-foreground">{t("calendar.anyone")}</Text>
          ) : (
            <View className="flex-row flex-wrap items-center gap-1.5">
              {item.memberIds.map((memberId, index) => (
                <Fragment key={memberId}>
                  {index > 0 && (
                    <Icon
                      name="arrow-right"
                      size={14}
                      color="muted-foreground"
                    />
                  )}
                  <PersonPill
                    person={people.person(memberId)}
                    label={people.person(memberId).name}
                    highlighted={memberId === currentTurn}
                  />
                </Fragment>
              ))}
            </View>
          )}
        </Section>
      )}

      {upcoming.length > 0 && (
        <Section title={t("calendar.detail.comingUp")}>
          <View className="border-border rounded-lg border">
            {upcoming.map((occurrence, index) => (
              <DateRow
                key={occurrence.date}
                first={index === 0}
                label={dayLabel(occurrence.date)}
                onPress={() => showOnCalendar(occurrence.date)}
              >
                <OccurrenceStatus occurrence={occurrence} people={people} />
              </DateRow>
            ))}
          </View>
        </Section>
      )}

      {(item.kind === "task" || history.length > 0) && (
        <Section title={t("calendar.detail.history")}>
          {history.length === 0 ? (
            <Text className="text-muted-foreground">
              {t("calendar.detail.noHistory")}
            </Text>
          ) : (
            <View className="border-border rounded-lg border">
              {history.map((entry, index) => (
                <DateRow
                  key={entry.date}
                  first={index === 0}
                  label={dayLabel(entry.date)}
                >
                  {entry.skipped ? (
                    <View className="flex-row items-center gap-2">
                      <Text className="text-muted-foreground text-sm">
                        {t("calendar.detail.skipped")}
                      </Text>
                      {repeats && (
                        <Button
                          testID={`calendar-detail-unskip-${entry.date}`}
                          variant="ghost"
                          size="sm"
                          title={t("calendar.detail.unskip")}
                          onPress={() => skip(entry.date, false)}
                        />
                      )}
                    </View>
                  ) : (
                    <OccurrenceStatus
                      occurrence={{ ...entry, turnGroupMemberId: null }}
                      people={people}
                    />
                  )}
                </DateRow>
              ))}
            </View>
          )}
        </Section>
      )}

      {repeats && date && (
        <Button
          testID="calendar-detail-skip"
          className="mt-6"
          variant="outline"
          icon="skip-forward"
          title={t("calendar.detail.skip")}
          onPress={() => {
            skip(date, true);
            router.back();
          }}
        />
      )}

      <View className="mt-6 flex-row gap-2">
        <Button
          testID="calendar-detail-edit"
          className="flex-1"
          variant="outline"
          icon="pencil"
          title={t("calendar.detail.edit")}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/calendar/form",
              params: { id: String(item.id) },
            })
          }
        />
        <Button
          testID="calendar-detail-delete"
          className="flex-1"
          variant={armed ? "destructive" : "outline"}
          icon="trash-2"
          title={t("calendar.detail.delete")}
          onPress={() => {
            if (!armed) {
              setArmed(true);
              return;
            }
            remove.mutate({ groupId: group.id, id: item.id });
            router.back();
          }}
        />
      </View>
      {armed && (
        <Text className="text-destructive mt-2 text-center text-sm">
          {t("calendar.detail.confirmDelete")}
        </Text>
      )}
    </AppScrollView>
  );
}
