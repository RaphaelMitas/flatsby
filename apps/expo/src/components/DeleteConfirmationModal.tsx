import type React from "react";
import { useCallback } from "react";
import { Modal, Text, View } from "react-native";
import { useForm, useWatch } from "react-hook-form";

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
}

const DeleteConfirmationModal: React.FC<Props> = ({
  visible,
  onClose,
  onConfirm,
  itemName,
  title = "Delete Item",
  description,
  confirmationLabel,
}) => {
  const form = useForm<DeleteFormValues>({
    defaultValues: {
      confirmationInput: "",
    },
  });

  const confirmationInput = useWatch({
    control: form.control,
    name: "confirmationInput",
  });
  const isConfirmationValid = confirmationInput === itemName;

  const handleConfirm = useCallback(() => {
    onConfirm();
    form.reset();
  }, [onConfirm, form]);

  const handleClose = useCallback(() => {
    onClose();
    form.reset();
  }, [onClose, form]);

  const defaultDescription = `Are you sure you want to delete "${itemName}"? This action cannot be undone and will permanently remove all data associated with this item.`;
  const defaultConfirmationLabel = `To confirm deletion, please type the item name: ${itemName}`;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View className="flex-1 items-center justify-center bg-black/50">
        <View className="mx-4 w-full max-w-sm rounded-lg bg-background p-6 shadow-lg">
          <View className="mb-4 flex-row items-center gap-3">
            <Icon name="triangle-alert" size={24} color="destructive" />
            <Text className="text-lg font-semibold text-foreground">
              {title}
            </Text>
          </View>

          <Text className="mb-6 text-sm text-muted-foreground">
            {description ?? defaultDescription}
          </Text>

          <Form {...form}>
            <View className="mb-6 gap-2">
              <Text className="text-sm font-medium text-foreground">
                Confirmation Required
              </Text>
              <Label className="mb-2 text-sm text-muted-foreground">
                {confirmationLabel ?? defaultConfirmationLabel}
              </Label>
              <FormField
                control={form.control}
                name="confirmationInput"
                render={({ field }) => (
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter item name"
                      className="w-full"
                      value={field.value}
                      onChangeText={field.onChange}
                    />
                  </FormControl>
                )}
              />
            </View>

            <View className="flex-row gap-3">
              <Button
                title="Cancel"
                variant="outline"
                className="flex-1"
                onPress={handleClose}
              />
              <Button
                title="Delete"
                variant="destructive"
                className="flex-1"
                icon="trash-2"
                disabled={!isConfirmationValid}
                onPress={handleConfirm}
              />
            </View>
          </Form>
        </View>
      </View>
    </Modal>
  );
};

export default DeleteConfirmationModal;
