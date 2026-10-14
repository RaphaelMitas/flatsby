import type React from "react";
import { useCallback } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useForm, useWatch } from "react-hook-form";
import { useTranslations } from "use-intl";

import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { Form, FormControl, FormField } from "~/lib/ui/form";
import { Input } from "~/lib/ui/input";
import { Label } from "~/lib/ui/label";

interface DeleteFormValues {
  confirmationInput: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  title?: string;
  description?: string;
  confirmationLabel?: string;
  needsConfirmationInput?: boolean;
}

const DeleteConfirmationModal: React.FC<Props> = ({
  visible,
  onClose,
  onConfirm,
  itemName,
  title,
  description,
  confirmationLabel,
  needsConfirmationInput = false,
}) => {
  const t = useTranslations("common");
  const form = useForm<DeleteFormValues>({
    defaultValues: {
      confirmationInput: "",
    },
  });

  const confirmationInput = useWatch({
    control: form.control,
    name: "confirmationInput",
  });
  const isConfirmationValid = needsConfirmationInput
    ? confirmationInput === itemName
    : true;

  const handleConfirm = useCallback(() => {
    onConfirm();
    form.reset();
  }, [onConfirm, form]);

  const handleClose = useCallback(() => {
    onClose();
    form.reset();
  }, [onClose, form]);

  const defaultDescription = t("deleteConfirmation.description", {
    name: itemName,
  });
  const defaultConfirmationLabel = t("deleteConfirmation.label", {
    name: itemName,
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 items-center justify-center bg-black/50"
      >
        <Pressable
          accessible={false}
          onPress={Keyboard.dismiss}
          className="bg-background mx-4 w-full max-w-sm rounded-lg p-6 shadow-lg"
        >
          <View className="mb-4 flex-row items-center gap-3">
            <Icon name="triangle-alert" size={24} color="destructive" />
            <Text className="text-foreground text-lg font-semibold">
              {title ?? t("deleteConfirmation.title")}
            </Text>
          </View>

          <Text className="text-muted-foreground mb-6 text-sm">
            {description ?? defaultDescription}
          </Text>

          <Form {...form}>
            {needsConfirmationInput && (
              <View className="mb-6 gap-2">
                <Text className="text-foreground text-sm font-medium">
                  {t("deleteConfirmation.required")}
                </Text>
                <Label className="text-muted-foreground mb-2 text-sm">
                  {confirmationLabel ?? defaultConfirmationLabel}
                </Label>
                <FormField
                  control={form.control}
                  name="confirmationInput"
                  render={({ field }) => (
                    <FormControl>
                      <Input
                        {...field}
                        testID="delete-confirmation-input"
                        placeholder={t("deleteConfirmation.placeholder")}
                        className="w-full"
                        autoCapitalize="none"
                        autoCorrect={false}
                        spellCheck={false}
                        returnKeyType="done"
                        value={field.value}
                        onChangeText={field.onChange}
                        onSubmitEditing={() => {
                          if (isConfirmationValid) handleConfirm();
                        }}
                      />
                    </FormControl>
                  )}
                />
              </View>
            )}

            <View className="flex-row gap-3">
              <Button
                testID="delete-confirmation-cancel"
                title={t("cancel")}
                variant="outline"
                className="flex-1"
                onPress={handleClose}
              />
              <Button
                testID="delete-confirmation-confirm"
                title={t("delete")}
                variant="destructive"
                className="flex-1"
                icon="trash-2"
                disabled={!isConfirmationValid}
                onPress={handleConfirm}
              />
            </View>
          </Form>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default DeleteConfirmationModal;
