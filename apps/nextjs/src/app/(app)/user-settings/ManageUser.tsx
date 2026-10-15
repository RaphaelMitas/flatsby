"use client";

import type { UpdateUserNameFormValues } from "@flatsby/validators/user";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  AlertCircle,
  CircleCheckBig,
  LoaderCircle,
  Upload,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

import { translateIfKey } from "@flatsby/i18n/message-key";
import { Alert, AlertDescription, AlertTitle } from "@flatsby/ui/alert";
import { Button } from "@flatsby/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";
import { Form, FormControl, FormField } from "@flatsby/ui/form";
import { Input } from "@flatsby/ui/input";
import { Label } from "@flatsby/ui/label";
import { UserAvatar } from "@flatsby/ui/user-avatar";
import { updateUserNameFormSchema } from "@flatsby/validators/user";

import { useTRPC } from "~/trpc/react";

const UserDetails = () => {
  const t = useTranslations();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: user } = useSuspenseQuery(
    trpc.user.getCurrentUser.queryOptions(),
  );

  const onUpdateUserNameError = (errorMessage: string) => {
    form.setError("name", {
      message: errorMessage,
    });
  };

  const updateUserNameMutation = useMutation(
    trpc.user.updateUserName.mutationOptions({
      onSuccess: (data) => {
        if (!data.success) {
          onUpdateUserNameError(data.error.message);
          return;
        }

        void queryClient.invalidateQueries(
          trpc.user.getCurrentUser.queryOptions(),
        );
        void queryClient.invalidateQueries(
          trpc.user.getCurrentUserWithGroups.queryOptions(),
        );
      },
      onError: (err) => {
        onUpdateUserNameError(err.message);
      },
    }),
  );

  const form = useForm<UpdateUserNameFormValues>({
    resolver: zodResolver(updateUserNameFormSchema),
    defaultValues: {
      name: user.name,
    },
  });

  const handleSubmit = (values: UpdateUserNameFormValues) => {
    const newName = values.name;
    if (!newName) return;
    updateUserNameMutation.mutate({
      name: newName,
    });
  };

  const isSuccess =
    updateUserNameMutation.isSuccess && updateUserNameMutation.data.success;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.profile.userDetails")}</CardTitle>
        <CardDescription>
          {t("settings.profile.userDetailsDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="name">{t("settings.profile.userName")}</Label>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="flex flex-col items-center gap-4 md:flex-row"
              >
                <FormField
                  name="name"
                  control={form.control}
                  render={({ field }) => (
                    <FormControl>
                      <Input
                        {...field}
                        className="w-full"
                        placeholder={t("settings.profile.userNamePlaceholder")}
                      />
                    </FormControl>
                  )}
                />
                <Button
                  disabled={form.formState.isSubmitting}
                  className="w-full min-w-37.5 md:w-fit"
                  type="submit"
                >
                  {form.formState.isSubmitting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    t("common.save")
                  )}
                </Button>
              </form>
            </Form>
            {form.formState.errors.name && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t("common.error")}</AlertTitle>
                <AlertDescription>
                  {translateIfKey(t, form.formState.errors.name.message ?? "")}
                </AlertDescription>
              </Alert>
            )}
            {isSuccess && (
              <Alert variant="success">
                <CircleCheckBig className="h-4 w-4" />
                <AlertTitle>{t("settings.profile.nameChanged")}</AlertTitle>
              </Alert>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-picture">
              {t("settings.profile.profilePicture")}
            </Label>
            <div className="flex items-center gap-4">
              <UserAvatar name={user.name} image={user.image} size="2xl" />
              <Button disabled variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                {t("settings.profile.uploadNew")}
              </Button>
              <div className="text-muted-foreground">
                {t("settings.profile.featureComingSoon")}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserDetails;
