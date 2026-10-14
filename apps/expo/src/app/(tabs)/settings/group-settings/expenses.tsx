import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useWatch } from "react-hook-form";

import {
  CURRENCY_CODES,
  isCurrencyCode,
} from "@flatsby/validators/expenses/types";
import { groupSchema } from "@flatsby/validators/group";

import type { BottomSheetPickerItem } from "~/lib/ui/bottom-sheet-picker";
import { TimedAlert } from "~/components/TimedAlert";
import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import {
  BottomSheetPickerProvider,
  BottomSheetPickerTrigger,
} from "~/lib/ui/bottom-sheet-picker";
import { Button } from "~/lib/ui/button";
import { Form, FormField, useForm } from "~/lib/ui/form";
import { Label } from "~/lib/ui/label";
import { Switch } from "~/lib/ui/switch";
import { cn, handleApiError } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";
import { useUpdateGroup } from "~/utils/useUpdateGroup";

const expenseSettingsSchema = groupSchema.pick({
  currency: true,
  convertAutomatically: true,
});

const currencyItems: BottomSheetPickerItem[] = CURRENCY_CODES.map((code) => ({
  id: code,
  title: code,
}));

export default function ExpenseSettingsScreen() {
  const router = useRouter();
  const { selectedGroupId } = useShoppingStore();
  const { highlight } = useLocalSearchParams<{ highlight?: string }>();
  const highlightConvert = highlight === "convert";
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const { data: group } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({
      id: Number(selectedGroupId) || 0,
    }),
  );
  const updateGroupMutation = useUpdateGroup(Number(selectedGroupId));

  // Saving diffs against what this admin opened, so another admin's change in between isn't sent back
  const [opened] = useState({
    currency: group.success ? group.data.currency : "EUR",
    convertAutomatically: group.success
      ? group.data.convertAutomatically
      : null,
  });
  const form = useForm({
    schema: expenseSettingsSchema,
    defaultValues: opened,
  });

  useEffect(() => {
    if (highlightConvert) {
      form.setValue("convertAutomatically", true, { shouldDirty: true });
    }
  }, [form, highlightConvert]);
  const currency = useWatch({ control: form.control, name: "currency" });

  if (!group.success) {
    return handleApiError({ router, error: group.error });
  }

  const saved = group.data;
  const isAdmin = saved.thisGroupMember.role === "admin";
  const isEditable = isAdmin && !form.formState.isSubmitting;

  const handleSubmit = form.handleSubmit((values) => {
    const changes = {
      ...(values.currency !== opened.currency && { currency: values.currency }),
      ...(values.convertAutomatically !== opened.convertAutomatically && {
        convertAutomatically: values.convertAutomatically,
      }),
    };
    if (Object.keys(changes).length === 0) return;

    updateGroupMutation.mutate(
      { id: saved.id, ...changes },
      {
        onSuccess: (data) => {
          if (!data.success) {
            form.setError("root", { message: data.error.message });
            return;
          }
          setShowSuccessMessage(true);
          setTimeout(() => {
            setShowSuccessMessage(false);
          }, 3000);
        },
        onError: (err) => {
          form.setError("root", { message: err.message });
        },
      },
    );
  });

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

          <Form {...form}>
            <View className="gap-4">
              <View className="gap-2">
                <Label>Group currency</Label>
                <FormField
                  name="currency"
                  control={form.control}
                  render={({ field }) => (
                    <BottomSheetPickerTrigger
                      testID="group-currency-picker"
                      items={currencyItems}
                      selectedId={field.value}
                      onSelect={(item) => {
                        if (isCurrencyCode(item.id)) field.onChange(item.id);
                      }}
                      triggerTitle={field.value}
                      disabled={!isEditable}
                    />
                  )}
                />
                {currency !== saved.currency && (
                  <Text className="text-warning text-sm">
                    Expenses already converted stay in {saved.currency}.
                  </Text>
                )}
              </View>

              <FormField
                name="convertAutomatically"
                control={form.control}
                render={({ field }) => (
                  <View
                    className={cn(
                      "flex-row items-center gap-4 rounded-lg",
                      highlightConvert && "border-primary border-2 p-3",
                    )}
                  >
                    <View className="flex-1 gap-1">
                      <Label>Convert automatically</Label>
                      <Text className="text-muted-foreground text-sm">
                        New expenses in other currencies are converted to{" "}
                        {currency}. You can keep the original currency on any
                        single expense. Existing expenses don't change.
                      </Text>
                    </View>
                    <Switch
                      testID="group-convert-switch"
                      checked={field.value === true}
                      onCheckedChange={field.onChange}
                      disabled={!isEditable}
                    />
                  </View>
                )}
              />

              <Button
                testID="expense-settings-save"
                icon={form.formState.isSubmitting ? "loader" : "save"}
                disabled={!isEditable}
                title={
                  form.formState.isSubmitting
                    ? "Saving..."
                    : !isAdmin
                      ? "Not an admin"
                      : "Save Changes"
                }
                onPress={handleSubmit}
                className="w-full"
              />
            </View>
          </Form>

          {form.formState.errors.root?.message && (
            <TimedAlert
              variant="destructive"
              title="Error"
              description={form.formState.errors.root.message}
            />
          )}

          {showSuccessMessage && (
            <TimedAlert
              variant="success"
              title="Success!"
              description="Expense settings have been updated."
            />
          )}
        </View>
      </AppScrollView>
    </BottomSheetPickerProvider>
  );
}
