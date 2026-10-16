import type { GroupWithAccess } from "@flatsby/api";
import type { ReactNode } from "react";
import { Fragment, useState, useSyncExternalStore } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "use-intl";

import {
  describeRecurrence,
  formatCalendarDate,
  localDate,
  pickerDate,
  watchLocalDate,
} from "@flatsby/validators/calendar";

import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Badge } from "~/lib/ui/badge";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { DatePickerField } from "~/lib/ui/date-picker-field";
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
  /** The occurrence that was tapped, which skip and move act on */
  originalDate: string | undefined;
  /** Where that occurrence sits now, which differs once it was moved */
  currentDate: string | undefined;
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
  originalDate,
  currentDate,
}: CalendarItemDetailProps) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const people = useCalendarPeople(group);
  const today = useSyncExternalStore(watchLocalDate, localDate);
  const { reschedule, remove } = useCalendarMutations(group.id, people.meId);
  const [armed, setArmed] = useState(false);
  const [moving, setMoving] = useState(false);

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
  const dayLabel = (date: string) =>
    date === today
      ? t("calendar.today")
      : formatCalendarDate(date, locale, {
          weekday: "short",
          day: "numeric",
          month: "short",
        });
  const repeatsOnSchedule =
    item.recurrence !== null && item.recurrence.type !== "afterDone";
  const canReschedule = originalDate !== undefined && repeatsOnSchedule;
  const currentTurn = upcoming[0]?.turnGroupMemberId ?? null;
  const showOnCalendar = (date: string) =>
    router.dismissTo({ pathname: "/(tabs)/calendar", params: { date } });

  const rescheduleTo = (movedTo: string | null) => {
    if (!originalDate) return;
    reschedule.mutate({
      groupId: group.id,
      itemId: item.id,
      originalDate,
      movedTo,
      skipped: movedTo === null,
    });
    if (movedTo) showOnCalendar(movedTo);
    else router.back();
  };

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
                key={occurrence.originalDate}
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
                  key={entry.originalDate}
                  first={index === 0}
                  label={dayLabel(entry.date)}
                >
                  {entry.skipped ? (
                    <View className="flex-row items-center gap-2">
                      <Text className="text-muted-foreground text-sm">
                        {t("calendar.detail.skipped")}
                      </Text>
                      {repeatsOnSchedule && (
                        <Button
                          testID="calendar-detail-unskip"
                          variant="ghost"
                          size="sm"
                          title={t("calendar.detail.unskip")}
                          onPress={() =>
                            reschedule.mutate({
                              groupId: group.id,
                              itemId: item.id,
                              originalDate: entry.originalDate,
                              movedTo: null,
                              skipped: false,
                            })
                          }
                        />
                      )}
                    </View>
                  ) : (
                    <OccurrenceStatus occurrence={entry} people={people} />
                  )}
                </DateRow>
              ))}
            </View>
          )}
        </Section>
      )}

      {canReschedule && (
        <View className="mt-6 gap-2">
          <View className="flex-row gap-2">
            <Button
              testID="calendar-detail-skip"
              className="flex-1"
              variant="outline"
              icon="skip-forward"
              title={t("calendar.detail.skip")}
              onPress={() => rescheduleTo(null)}
            />
            <Button
              testID="calendar-detail-move"
              className="flex-1"
              variant="outline"
              icon="calendar-arrow-up"
              title={t("calendar.detail.move")}
              onPress={() => setMoving(!moving)}
            />
          </View>
          {moving && originalDate && (
            <DatePickerField
              label={t("calendar.form.date")}
              value={pickerDate(currentDate ?? originalDate)}
              onChange={(date) => rescheduleTo(localDate(date))}
            />
          )}
        </View>
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
