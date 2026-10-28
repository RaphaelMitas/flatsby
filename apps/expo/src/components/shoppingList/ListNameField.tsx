import type { Control } from "react-hook-form";

import { shoppingListFormSchema } from "@flatsby/validators/shopping-list";

import { FormControl, FormField, FormMessage } from "~/lib/ui/form";
import { Input } from "~/lib/ui/input";

export function ListNameField({
  control,
  testID,
  placeholder,
  autoFocus,
}: {
  control: Control<{ name: string }>;
  testID: string;
  placeholder: string;
  autoFocus?: boolean;
}) {
  return (
    <FormField
      name="name"
      control={control}
      render={({ field, fieldState }) => (
        <>
          <FormControl>
            <Input
              testID={testID}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder={placeholder}
              error={!!fieldState.error}
              maxLength={
                shoppingListFormSchema.shape.name.maxLength ?? undefined
              }
              autoFocus={autoFocus}
            />
          </FormControl>
          <FormMessage />
        </>
      )}
    />
  );
}
