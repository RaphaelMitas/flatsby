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
import { useLocale, useTranslations } from "use-intl";

import { failureOf } from "@flatsby/api/resultMutation";
import {
  formatCurrencyFromCents,
  memberPerson,
} from "@flatsby/validators/expenses/formatting";
import { CURRENCY_CODES } from "@flatsby/validators/expenses/types";
import { useSplitwiseImport } from "@flatsby/validators/expenses/useSplitwiseImport";

import type { BottomSheetPickerItem } from "~/lib/ui/bottom-sheet-picker";
import { MemberAvatar } from "~/components/expenses/MemberAvatar";
import { TimedAlert } from "~/components/TimedAlert";
import { Alert, AlertDescription, AlertTitle } from "~/lib/ui/alert";
import {
  BottomSheetPickerProvider,
  BottomSheetPickerTrigger,
} from "~/lib/ui/bottom-sheet-picker";
import { Button } from "~/lib/ui/button";
import { Label } from "~/lib/ui/label";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";

export default function ImportExpensesScreen() {
  const t = useTranslations("splitwiseImport");
  const tCommon = useTranslations("common");
  const tRoot = useTranslations();
  const locale = useLocale();
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
      expenses: wizard.expenses,
    });
  }, [bulkCreateMutation, groupId, wizard.expenses]);

  const memberPickerItems: BottomSheetPickerItem[] = useMemo(
    () =>
      (group.success ? group.data.groupMembers : []).map((m) => ({
        id: String(m.id),
        title: m.user.name,
        icon: <MemberAvatar person={memberPerson(m)} className="h-6 w-6" />,
      })),
    [group],
  );

  if (!group.success) {
    return null;
  }

  if (bulkCreateMutation.data?.success) {
    return (
      <SafeAreaView edges={isAndroid ? undefined : []}>
        <ScrollView className="m-4">
          <View className="items-center gap-4 py-8">
            <Text className="text-foreground text-xl font-semibold">
              {t("importCompleteTitle")}
            </Text>
            <Text className="text-muted-foreground text-center text-base">
              {t("importedCount", {
                count: bulkCreateMutation.data.data.importedCount,
              })}
            </Text>
            <Button
              title={t("done")}
              onPress={() => router.back()}
              className="mt-4 w-full"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const importFailure = failureOf(bulkCreateMutation, tCommon("unknownError"));

  return (
    <BottomSheetPickerProvider>
      <SafeAreaView edges={isAndroid ? [] : ["bottom"]}>
        <ScrollView className="px-4">
          <Text className="text-foreground text-xl font-semibold">
            {t("importFromSplitwise")}
          </Text>

          {wizard.step === "file" && (
            <View className="gap-4">
              <Button
                title={wizard.parsed ? t("changeCsvFile") : t("selectCsvFile")}
                icon="file-text"
                variant="outline"
                onPress={handlePickFile}
              />

              <View className="gap-2">
                <Label>{t("currencyToImport")}</Label>
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
                  {t("foundRowsAndPeople", {
                    rows: wizard.parsed.rows.length,
                    people: wizard.parsed.personNames.length,
                    names: wizard.parsed.personNames.join(", "),
                  })}
                </Text>
              )}

              {wizard.parsed?.errors.map((err, i) => (
                <TimedAlert
                  key={i}
                  variant="destructive"
                  title={t("parseErrorTitle")}
                  description={tRoot(err.key, err.values)}
                />
              ))}

              <Button
                title={tCommon("next")}
                disabled={!wizard.parsed || wizard.parsed.rows.length === 0}
                onPress={wizard.goToMapping}
              />
            </View>
          )}

          {wizard.step === "mapping" && (
            <View className="gap-4">
              <Text className="text-muted-foreground text-sm">
                {t("mapPeople")}
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
                        : t("selectMember")
                    }
                    onSelect={(item) =>
                      wizard.setMemberMapping(name, Number(item.id))
                    }
                  />
                </View>
              ))}

              <View className="flex-row gap-2">
                <Button
                  title={tCommon("back")}
                  variant="outline"
                  onPress={wizard.goBack}
                  className="flex-1"
                />
                <Button
                  title={tCommon("next")}
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
                {t("previewSummary", {
                  expenses: wizard.expenses.length,
                  skipped: wizard.skipped.length,
                })}
              </Text>

              {wizard.previewExpenses.map((exp, i) => (
                <View
                  key={i}
                  className="border-border flex-row items-center justify-between border-b py-2"
                >
                  <View className="flex-1">
                    <Text className="text-foreground text-sm" numberOfLines={1}>
                      {exp.description}
                    </Text>
                    <Text className="text-muted-foreground text-xs">
                      {exp.expenseDate.toLocaleDateString(locale)} -{" "}
                      {exp.splitMethod === "settlement"
                        ? t("settlement")
                        : t("expense")}
                    </Text>
                  </View>
                  <Text className="text-foreground text-sm font-medium">
                    {formatCurrencyFromCents({
                      cents: exp.amountInCents,
                      currency: exp.currency,
                      locale,
                    })}
                  </Text>
                </View>
              ))}

              {wizard.hiddenExpenseCount > 0 && (
                <Text className="text-muted-foreground text-center text-sm">
                  {t("moreExpenses", { count: wizard.hiddenExpenseCount })}
                </Text>
              )}

              {wizard.skipped.length > 0 && (
                <View className="bg-muted rounded-lg p-3">
                  <Text className="text-muted-foreground mb-1 text-sm font-medium">
                    {t("skippedRows", { count: wizard.skipped.length })}
                  </Text>
                  {wizard.skipped.slice(0, 10).map((s, i) => (
                    <Text key={i} className="text-muted-foreground text-xs">
                      {t("skippedRow", {
                        row: s.row,
                        reason: tRoot(s.reason.key, s.reason.values),
                      })}
                    </Text>
                  ))}
                </View>
              )}

              {wizard.isTooLarge && (
                <Alert variant="destructive">
                  <AlertTitle variant="destructive">
                    {t("tooLargeTitle")}
                  </AlertTitle>
                  <AlertDescription>{t("tooLarge")}</AlertDescription>
                </Alert>
              )}

              <View className="flex-row gap-2">
                <Button
                  title={tCommon("back")}
                  variant="outline"
                  onPress={wizard.goBack}
                  className="flex-1"
                />
                <Button
                  title={tCommon("next")}
                  disabled={!wizard.canConfirm}
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
                  {t("readyToImport")}
                </Text>
                <Text className="text-muted-foreground mt-1 text-sm">
                  {t("willBeCreated", { count: wizard.expenses.length })}
                </Text>
              </View>

              {importFailure !== undefined && (
                <TimedAlert
                  variant="destructive"
                  title={t("importFailed")}
                  description={importFailure}
                />
              )}

              <View className="flex-row gap-2">
                <Button
                  title={tCommon("back")}
                  variant="outline"
                  onPress={wizard.goBack}
                  disabled={bulkCreateMutation.isPending}
                  className="flex-1"
                />
                <Button
                  title={
                    bulkCreateMutation.isPending
                      ? t("importing")
                      : t("importCountShort", { count: wizard.expenses.length })
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
