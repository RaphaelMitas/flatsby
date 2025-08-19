import type {
  ControllerProps,
  FieldPath,
  FieldValues,
  UseFormProps,
} from "react-hook-form";
import type { ZodType } from "zod/v4";
import * as React from "react";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import {
  useForm as __useForm,
  Controller,
  FormProvider,
  useFormContext,
} from "react-hook-form";

const Form = FormProvider;

interface FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  name: TName;
}

const FormFieldContext = React.createContext<FormFieldContextValue | null>(
  null,
);

function useForm<TOut extends FieldValues, TIn extends FieldValues>(
  props: Omit<UseFormProps<TIn, unknown, TOut>, "resolver"> & {
    schema: ZodType<TOut, TIn>;
  },
) {
  const form = __useForm<TIn, unknown, TOut>({
    ...props,
    resolver: standardSchemaResolver(props.schema, undefined),
  });

  return form;
}

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const { getFieldState, formState } = useFormContext();

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }

  const fieldState = getFieldState(fieldContext.name, formState);

  return {
    name: fieldContext.name,
    ...fieldState,
  };
};

interface FormControlProps {
  className?: string;
  children: React.ReactElement;
}

const FormControl: React.FC<FormControlProps> = ({ children }) => {
  return children;
};
FormControl.displayName = "FormControl";

export { Form, FormField, FormControl, useFormField, useForm };
