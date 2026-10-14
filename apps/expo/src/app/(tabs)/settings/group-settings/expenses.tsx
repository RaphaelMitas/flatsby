import type { GroupWithAccess } from "@flatsby/api";
import { useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { isCurrencyCode } from "@flatsby/validators/expenses/types";

import { currencyItems } from "~/components/expenses/currencyItems";
import { TimedAlert } from "~/components/TimedAlert";
import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import {
  BottomSheetPickerProvider,
  BottomSheetPickerTrigger,
} from "~/lib/ui/bottom-sheet-picker";
import { Button } from "~/lib/ui/button";
import { Label } from "~/lib/ui/label";
import { Switch } from "~/lib/ui/switch";
import { cn, handleApiError } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";
import { useUpdateGroup } from "~/utils/useUpdateGroup";

export default function ExpenseSettingsScreen() {
  const router = useRouter();
  const { selectedGroupId } = useShoppingStore();

  const { data: group } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({
      id: Number(selectedGroupId) || 0,
    }),
  );

  if (!group.success) {
    return handleApiError({ router, error: group.error });
  }

  return <ExpenseSettingsForm key={group.data.id} group={group.data} />;
}

function ExpenseSettingsForm({ group }: { group: GroupWithAccess }) {
  const router = useRouter();
  const { highlight } = useLocalSearchParams<{ highlight?: string }>();
  const isAdmin = group.thisGroupMember.role === "admin";
  const highlightConvert = highlight === "convert" && isAdmin;
  const updateGroupMutation = useUpdateGroup(group.id);
  const [result, setResult] = useState<"saved" | { error: string }>();

  // Saving diffs against what this admin opened, so another admin's change in between isn't sent back
  const [opened, setOpened] = useState({
    currency: group.currency,
    convertAutomatically: group.convertAutomatically === true,
  });
  const [currency, setCurrency] = useState(opened.currency);
  const [convertAutomatically, setConvertAutomatically] = useState(
    opened.convertAutomatically || highlightConvert,
  );

  const isConvertDirty = convertAutomatically !== opened.convertAutomatically;
  const changes = {
    ...(currency !== opened.currency && { currency }),
    ...(isConvertDirty && { convertAutomatically }),
  };
  const isEditable = isAdmin && !updateGroupMutation.isPending;

  const save = () =>
    updateGroupMutation.mutate(
      { id: group.id, ...changes },
      {
        onSuccess: (data) => {
          if (!data.success) {
            setResult({ error: data.error.message });
            return;
          }
          setOpened({ currency, convertAutomatically });
          router.setParams({ highlight: undefined });
          setResult("saved");
        },
        onError: (err) => setResult({ error: err.message }),
      },
    );

  return (
    <BottomSheetPickerProvider>
      <AppScrollView className="p-4">
        <View className="bg-card gap-4 rounded-lg p-4">
          {!isAdmin && (
            <View className="bg-muted rounded-lg p-3">
              <Text className="text-muted-foreground text-sm">
                Only group administrators can edit expense settings.
              </Text>
            </View>
          )}

          <View className="gap-4">
            <View className="gap-2">
              <Label>Group currency</Label>
              <BottomSheetPickerTrigger
                testID="group-currency-picker"
                items={currencyItems}
                selectedId={currency}
                onSelect={(item) => {
                  if (isCurrencyCode(item.id)) setCurrency(item.id);
                }}
                triggerTitle={currency}
                disabled={!isEditable}
              />
              {currency !== group.currency && (
                <Text className="text-warning text-sm">
                  Expenses already converted stay in {group.currency}.
                </Text>
              )}
            </View>

            <View
              className={cn(
                "flex-row items-center gap-4 rounded-lg",
                highlightConvert &&
                  isConvertDirty &&
                  "border-primary border-2 p-3",
              )}
            >
              <View className="flex-1 gap-1">
                <Label>Convert automatically</Label>
                <Text className="text-muted-foreground text-sm">
                  New expenses in other currencies are converted to {currency}.
                  You can keep the original currency on any single expense.
                  Existing expenses don't change.
                </Text>
              </View>
              <Switch
                testID="group-convert-switch"
                checked={convertAutomatically}
                onCheckedChange={setConvertAutomatically}
                disabled={!isEditable}
              />
            </View>

            <Button
              testID="expense-settings-save"
              icon={updateGroupMutation.isPending ? "loader" : "save"}
              disabled={!isEditable || Object.keys(changes).length === 0}
              title={
                updateGroupMutation.isPending
                  ? "Saving..."
                  : !isAdmin
                    ? "Not an admin"
                    : "Save Changes"
              }
              onPress={save}
              className="w-full"
            />
          </View>

          {result === "saved" && (
            <TimedAlert
              variant="success"
              title="Success!"
              description="Expense settings have been updated."
              onDismiss={() => setResult(undefined)}
            />
          )}
          {typeof result === "object" && (
            <TimedAlert
              variant="destructive"
              title="Error"
              description={result.error}
              onDismiss={() => setResult(undefined)}
            />
          )}
        </View>
      </AppScrollView>
    </BottomSheetPickerProvider>
  );
}
