import { useCallback, useMemo } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { useRouter } from "expo-router";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

import { centsToDecimal } from "@flatsby/validators/expenses/conversion";
import { CURRENCY_CODES } from "@flatsby/validators/expenses/types";
import { useSplitwiseImport } from "@flatsby/validators/expenses/useSplitwiseImport";

import type { BottomSheetPickerItem } from "~/lib/ui/bottom-sheet-picker";
import { TimedAlert } from "~/components/TimedAlert";
import { Avatar, AvatarFallback, AvatarImage } from "~/lib/ui/avatar";
import {
  BottomSheetPickerProvider,
  BottomSheetPickerTrigger,
} from "~/lib/ui/bottom-sheet-picker";
import { Button } from "~/lib/ui/button";
import { Label } from "~/lib/ui/label";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { handleApiError } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";

export default function ImportExpensesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedGroupId } = useShoppingStore();
  const groupId = Number(selectedGroupId) || 0;
  const wizard = useSplitwiseImport();
  const isAndroid = Platform.OS === "android";

  const { data: group } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );

  const bulkCreateMutation = useMutation(
    trpc.expense.bulkCreateExpenses.mutationOptions({
      onSuccess: (data) => {
        if (data.success) {
          void queryClient.invalidateQueries(
            trpc.expense.getGroupExpenses.queryOptions({ groupId }),
          );
          void queryClient.invalidateQueries(
            trpc.expense.getGroupDebts.queryOptions({ groupId }),
          );
          void queryClient.invalidateQueries({
            queryKey: trpc.expense.getDebtSummary.queryKey(),
          });
        }
      },
    }),
  );

  const { handleFileLoad } = wizard;
  const handlePickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/comma-separated-values", "text/plain"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) return;

      const uri = result.assets[0].uri;
      const file = new File(uri);
      const text = await file.text();
      handleFileLoad(text);
    } catch (error) {
      console.error("Failed to pick/read CSV file:", error);
    }
  }, [handleFileLoad]);

  const handleImport = useCallback(() => {
    bulkCreateMutation.mutate({
      groupId,
      expenses: wizard.expenses.map((exp) => ({
        ...exp,
        description: exp.description,
        category: exp.category,
      })),
    });
  }, [bulkCreateMutation, groupId, wizard.expenses]);

  const memberPickerItems: BottomSheetPickerItem[] = useMemo(
    () =>
      (group.success ? group.data.groupMembers : []).map((m) => ({
        id: String(m.id),
        title: m.user.name || m.user.email,
        icon: (
          <Avatar className="h-6 w-6">
            <AvatarImage src={m.user.image ?? undefined} />
            <AvatarFallback>
              {(m.user.name || m.user.email).charAt(0)}
            </AvatarFallback>
          </Avatar>
        ),
      })),
    [group],
  );

  if (!group.success) {
    return handleApiError({ router, error: group.error });
  }

  if (bulkCreateMutation.data?.success) {
    return (
      <SafeAreaView edges={isAndroid ? undefined : ["left"]}>
        <ScrollView className="m-4">
          <View className="items-center gap-4 py-8">
            <Text className="text-foreground text-xl font-semibold">
              Import Complete
            </Text>
            <Text className="text-muted-foreground text-center text-base">
              Successfully imported {bulkCreateMutation.data.data.importedCount}{" "}
              expenses.
            </Text>
            <Button
              title="Done"
              onPress={() => router.back()}
              className="mt-4 w-full"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <BottomSheetPickerProvider>
      <SafeAreaView edges={isAndroid ? [] : ["bottom"]}>
        <ScrollView className="px-4">
          <Text className="text-foreground text-xl font-semibold">
            Import from Splitwise
          </Text>

          {wizard.step === "file" && (
            <View className="gap-4">
              <Button
                title={wizard.parsed ? "Change CSV File" : "Select CSV File"}
                icon="file-text"
                variant="outline"
                onPress={handlePickFile}
              />

              <View className="gap-2">
                <Label>Currency to import</Label>
                <View className="flex-row flex-wrap gap-2">
                  {CURRENCY_CODES.map((code) => (
                    <Pressable
                      key={code}
                      onPress={() => wizard.setCurrency(code)}
                      className={`rounded-lg border px-4 py-2 ${
                        wizard.currency === code
                          ? "bg-primary border-primary"
                          : "border-input bg-background"
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          wizard.currency === code
                            ? "text-primary-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {code}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {wizard.parsed && (
                <Text className="text-muted-foreground text-sm">
                  Found {wizard.parsed.rows.length} rows and{" "}
                  {wizard.parsed.personNames.length} people:{" "}
                  {wizard.parsed.personNames.join(", ")}
                </Text>
              )}

              {wizard.parsed?.errors.map((err, i) => (
                <TimedAlert
                  key={i}
                  variant="destructive"
                  title="Parse Error"
                  description={err}
                />
              ))}

              <Button
                title="Next"
                disabled={!wizard.parsed || wizard.parsed.rows.length === 0}
                onPress={wizard.goToMapping}
              />
            </View>
          )}

          {wizard.step === "mapping" && (
            <View className="gap-4">
              <Text className="text-muted-foreground text-sm">
                Map each Splitwise person to a group member.
              </Text>

              {wizard.parsed?.personNames.map((name) => (
                <View key={name} className="gap-2">
                  <Label>{name}</Label>
                  <BottomSheetPickerTrigger
                    items={memberPickerItems}
                    selectedId={
                      wizard.memberMapping[name] != null
                        ? String(wizard.memberMapping[name])
                        : undefined
                    }
                    triggerTitle={
                      wizard.memberMapping[name] != null
                        ? undefined
                        : "Select member"
                    }
                    onSelect={(item) =>
                      wizard.setMemberMapping(name, Number(item.id))
                    }
                  />
                </View>
              ))}

              <View className="flex-row gap-2">
                <Button
                  title="Back"
                  variant="outline"
                  onPress={wizard.goBack}
                  className="flex-1"
                />
                <Button
                  title="Next"
                  disabled={!wizard.allNamesMapped}
                  onPress={wizard.goToPreview}
                  className="flex-1"
                />
              </View>
            </View>
          )}

          {wizard.step === "preview" && (
            <View className="gap-4">
              <Text className="text-muted-foreground text-sm">
                {wizard.expenses.length} expenses to import
                {wizard.skipped.length > 0 &&
                  `, ${wizard.skipped.length} rows skipped`}
              </Text>

              {wizard.expenses.slice(0, 50).map((exp, i) => (
                <View
                  key={i}
                  className="border-border flex-row items-center justify-between border-b py-2"
                >
                  <View className="flex-1">
                    <Text className="text-foreground text-sm" numberOfLines={1}>
                      {exp.description}
                    </Text>
                    <Text className="text-muted-foreground text-xs">
                      {exp.expenseDate.toLocaleDateString()} -{" "}
                      {exp.splitMethod === "settlement"
                        ? "Settlement"
                        : "Expense"}
                    </Text>
                  </View>
                  <Text className="text-foreground text-sm font-medium">
                    {centsToDecimal(exp.amountInCents).toFixed(2)}{" "}
                    {exp.currency}
                  </Text>
                </View>
              ))}

              {wizard.expenses.length > 50 && (
                <Text className="text-muted-foreground text-center text-sm">
                  ...and {wizard.expenses.length - 50} more
                </Text>
              )}

              {wizard.skipped.length > 0 && (
                <View className="bg-muted rounded-lg p-3">
                  <Text className="text-muted-foreground mb-1 text-sm font-medium">
                    {wizard.skipped.length} skipped rows
                  </Text>
                  {wizard.skipped.slice(0, 10).map((s, i) => (
                    <Text key={i} className="text-muted-foreground text-xs">
                      Row {s.row}: {s.reason}
                    </Text>
                  ))}
                </View>
              )}

              <View className="flex-row gap-2">
                <Button
                  title="Back"
                  variant="outline"
                  onPress={wizard.goBack}
                  className="flex-1"
                />
                <Button
                  title="Next"
                  disabled={wizard.expenses.length === 0}
                  onPress={wizard.goToConfirm}
                  className="flex-1"
                />
              </View>
            </View>
          )}

          {wizard.step === "confirm" && (
            <View className="gap-4">
              <View className="bg-muted rounded-lg p-4">
                <Text className="text-foreground text-base font-medium">
                  Ready to import
                </Text>
                <Text className="text-muted-foreground mt-1 text-sm">
                  {wizard.expenses.length} expenses will be created in this
                  group. This action cannot be easily undone.
                </Text>
              </View>

              {(bulkCreateMutation.isError ||
                bulkCreateMutation.data?.success === false) && (
                <TimedAlert
                  variant="destructive"
                  title="Import failed"
                  description={
                    bulkCreateMutation.data?.success === false
                      ? bulkCreateMutation.data.error.message
                      : (bulkCreateMutation.error?.message ?? "Unknown error")
                  }
                />
              )}

              <View className="flex-row gap-2">
                <Button
                  title="Back"
                  variant="outline"
                  onPress={wizard.goBack}
                  disabled={bulkCreateMutation.isPending}
                  className="flex-1"
                />
                <Button
                  title={
                    bulkCreateMutation.isPending
                      ? "Importing..."
                      : `Import ${wizard.expenses.length}`
                  }
                  icon={bulkCreateMutation.isPending ? "loader" : undefined}
                  onPress={handleImport}
                  disabled={bulkCreateMutation.isPending}
                  className="flex-1"
                />
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </BottomSheetPickerProvider>
  );
}
